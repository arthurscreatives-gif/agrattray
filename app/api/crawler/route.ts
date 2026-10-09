import { NextRequest, NextResponse } from 'next/server';
import {
  validateSafePublicUrlWithDns,
  parseRobotsTxt,
  isDisallowedByRobots,
  parseHtmlPage,
} from '@/lib/crawler';

// Cache robots.txt results in memory to minimize redundant requests
const robotsCache = new Map<string, { rules: { disallowPaths: string[]; sitemaps: string[] }; timestamp: number }>();
const ROBOTS_CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes

async function getCachedRobots(originUrl: string) {
  const origin = new URL(originUrl).origin;
  const cached = robotsCache.get(origin);
  if (cached && Date.now() - cached.timestamp < ROBOTS_CACHE_TTL_MS) {
    return cached.rules;
  }
  const rules = await parseRobotsTxt(originUrl);
  robotsCache.set(origin, { rules, timestamp: Date.now() });
  return rules;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      url,
      method = 'GET',
      ignoreRobots = false,
      parseSeo = true,
      maxRedirects = 5,
      timeoutMs = 8000,
    } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'A valid public URL string is required in the "url" property.' },
        { status: 400 }
      );
    }

    // 1. SSRF & Protocol Validation with DNS resolution check
    const validation = await validateSafePublicUrlWithDns(url);
    if (!validation.safe || !validation.normalizedUrl) {
      return NextResponse.json(
        {
          error: validation.reason || 'URL validation failed. Private IP space, local files, and reserved ranges are blocked.',
          blocked: true,
          type: 'SSRF_RESTRICTION',
        },
        { status: 403 }
      );
    }

    let currentUrl = validation.normalizedUrl;
    const initialOrigin = new URL(currentUrl).origin;

    // 2. Check robots.txt (unless ignoreRobots is true)
    let robotsAllowed = true;
    let robotsDisallowRule: string | null = null;
    let robotsInfo = { checked: false, allowed: true, sitemaps: [] as string[] };

    try {
      const robots = await getCachedRobots(currentUrl);
      robotsInfo = {
        checked: true,
        allowed: true,
        sitemaps: robots.sitemaps,
      };

      const path = new URL(currentUrl).pathname;
      if (isDisallowedByRobots(path, robots.disallowPaths)) {
        robotsAllowed = false;
        robotsDisallowRule = robots.disallowPaths.find((r) => isDisallowedByRobots(path, [r])) || 'disallow rule';
        robotsInfo.allowed = false;
      }
    } catch {
      // Non-fatal if robots.txt check fails
    }

    if (!robotsAllowed && !ignoreRobots) {
      return NextResponse.json(
        {
          error: `Access denied by robots.txt rule ("${robotsDisallowRule}"). Crawling is disallowed for this path.`,
          url: currentUrl,
          robotsTxt: robotsInfo,
          allowed: false,
          type: 'ROBOTS_TXT_BLOCKED',
        },
        { status: 403 }
      );
    }

    // 3. Secure Fetch with manual redirect handling and re-validation
    const redirectChain: string[] = [currentUrl];
    let redirectCount = 0;
    const maxHops = Math.min(5, Math.max(0, Number(maxRedirects) || 5));
    const effectiveTimeout = Math.min(15000, Math.max(1000, Number(timeoutMs) || 8000));
    const startTime = Date.now();

    let finalResponse: Response | null = null;
    let responseBodyText = '';

    while (redirectCount <= maxHops) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

      try {
        const fetchMethod = method.toUpperCase() === 'HEAD' ? 'HEAD' : 'GET';
        const res = await fetch(currentUrl, {
          method: fetchMethod,
          signal: controller.signal,
          redirect: 'manual', // Manual redirects to inspect and validate every hop!
          headers: {
            'User-Agent': 'ArthurSEO-CommandCenter-Crawler/1.0 (+https://arthurscreatives.com; bot@arthurscreatives.com)',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
          },
        });
        clearTimeout(timeoutId);

        // Check for redirect (301, 302, 303, 307, 308)
        if ([301, 302, 303, 307, 308].includes(res.status)) {
          const location = res.headers.get('location');
          if (!location) {
            finalResponse = res;
            break;
          }

          // Resolve relative redirect against current URL
          const resolvedRedirectUrl = new URL(location, currentUrl).toString();

          // CRITICAL: Validate redirect target for SSRF protection!
          const redirectValidation = await validateSafePublicUrlWithDns(resolvedRedirectUrl);
          if (!redirectValidation.safe || !redirectValidation.normalizedUrl) {
            return NextResponse.json(
              {
                error: `Redirect to unsafe or private target blocked: ${redirectValidation.reason || 'Restricted destination'}`,
                redirectTarget: resolvedRedirectUrl,
                type: 'SSRF_REDIRECT_BLOCKED',
              },
              { status: 403 }
            );
          }

          redirectCount++;
          currentUrl = redirectValidation.normalizedUrl;
          redirectChain.push(currentUrl);

          if (redirectCount > maxHops) {
            return NextResponse.json(
              {
                error: `Too many redirects (exceeded limit of ${maxHops}).`,
                redirectChain,
                type: 'REDIRECT_LOOP',
              },
              { status: 310 }
            );
          }

          continue; // Follow validated redirect
        }

        finalResponse = res;
        break;
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          return NextResponse.json(
            { error: `Request timed out after ${effectiveTimeout}ms.` },
            { status: 504 }
          );
        }
        return NextResponse.json(
          { error: `Failed to connect to ${currentUrl}: ${fetchErr.message || 'Network error'}` },
          { status: 502 }
        );
      }
    }

    if (!finalResponse) {
      return NextResponse.json({ error: 'No response received from remote host.' }, { status: 502 });
    }

    const loadTimeMs = Date.now() - startTime;
    const contentType = finalResponse.headers.get('content-type') || '';
    const contentLengthHeader = finalResponse.headers.get('content-length');
    let contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

    // Read body safely with size limit (max 5MB)
    const MAX_BODY_BYTES = 5 * 1024 * 1024;
    if (method.toUpperCase() !== 'HEAD') {
      const text = await finalResponse.text();
      if (text.length > MAX_BODY_BYTES) {
        responseBodyText = text.slice(0, MAX_BODY_BYTES);
      } else {
        responseBodyText = text;
      }
      contentLength = Buffer.byteLength(responseBodyText, 'utf8');
    }

    // Safe response headers extraction
    const safeHeaders: Record<string, string> = {};
    const whitelistedHeaders = [
      'content-type',
      'content-length',
      'last-modified',
      'etag',
      'server',
      'cache-control',
      'x-robots-tag',
      'link',
    ];
    for (const h of whitelistedHeaders) {
      const val = finalResponse.headers.get(h);
      if (val) safeHeaders[h] = val;
    }

    // Optional SEO analysis of the crawled page
    let seoAnalysis = null;
    const isHtml = contentType.toLowerCase().includes('text/html');
    if (parseSeo && isHtml && responseBodyText) {
      seoAnalysis = parseHtmlPage(responseBodyText, currentUrl, finalResponse.status, loadTimeMs);
    }

    return NextResponse.json({
      success: true,
      url,
      finalUrl: currentUrl,
      redirected: redirectCount > 0,
      redirectChain: redirectChain.length > 1 ? redirectChain : undefined,
      status: finalResponse.status,
      statusText: finalResponse.statusText,
      headers: safeHeaders,
      contentType,
      contentLength,
      loadTimeMs,
      robotsTxt: robotsInfo,
      seo: seoAnalysis,
      contentPreview: responseBodyText.slice(0, 5000), // First 5000 chars for preview
      contentLengthTruncated: responseBodyText.length < (contentLengthHeader ? parseInt(contentLengthHeader, 10) : responseBodyText.length),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Crawler proxy error: ${err.message || 'Internal error'}` },
      { status: 500 }
    );
  }
}

// Support GET requests as well for easy URL inspection via query param
export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return NextResponse.json(
      { error: 'Missing required query parameter "url". Example: /api/crawler?url=https://arthurscreatives.com' },
      { status: 400 }
    );
  }

  const ignoreRobots = req.nextUrl.searchParams.get('ignoreRobots') === 'true';
  const parseSeo = req.nextUrl.searchParams.get('parseSeo') !== 'false';

  // Delegate to POST logic using a simulated NextRequest
  const mockReq = new NextRequest(req.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: urlParam,
      ignoreRobots,
      parseSeo,
    }),
  });

  return POST(mockReq);
}
