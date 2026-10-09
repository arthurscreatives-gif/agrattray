import { NextRequest, NextResponse } from 'next/server';
import {
  isSafePublicUrl,
  validateSafePublicUrlWithDns,
  parseRobotsTxt,
  extractUrlsFromSitemap,
  isDisallowedByRobots,
  parseHtmlPage,
  analyzeAuditRun,
} from '@/lib/crawler';
import { CrawledPage } from '@/types/seo';

// Patterns to skip (accounts, carts, search filters, logout, etc.)
const SKIP_PATTERNS = [
  /\/cart/i,
  /\/checkout/i,
  /\/my-account/i,
  /\/account/i,
  /\/login/i,
  /\/signin/i,
  /\/logout/i,
  /\?add-to-cart=/i,
  /\?filter=/i,
  /\?sort=/i,
  /\.pdf$/i,
  /\.zip$/i,
  /\.jpg$/i,
  /\.png$/i,
  /\.webp$/i,
  /\.svg$/i,
];

export async function POST(req: NextRequest) {
  try {
    const { url, maxPages = 20, websiteId = '' } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const safety = await validateSafePublicUrlWithDns(url);
    if (!safety.safe || !safety.normalizedUrl) {
      return NextResponse.json({ error: safety.reason || 'Prohibited URL' }, { status: 400 });
    }

    const baseUrl = safety.normalizedUrl;
    const baseOrigin = new URL(baseUrl).origin;
    const limit = Math.min(100, Math.max(1, Number(maxPages) || 20));

    // 1. Fetch robots.txt
    const robots = await parseRobotsTxt(baseUrl);

    // 2. Discover URLs via Sitemap + Home Page Links
    const queue: string[] = [baseUrl];
    const visited = new Set<string>();
    const crawledPages: CrawledPage[] = [];

    // Try sitemap first
    const sitemapTarget = robots.sitemaps.length > 0 ? robots.sitemaps[0] : `${baseOrigin}/sitemap.xml`;
    const sitemapUrls = await extractUrlsFromSitemap(sitemapTarget, limit * 2);
    for (const sUrl of sitemapUrls) {
      const sSafety = isSafePublicUrl(sUrl);
      if (sSafety.safe && sSafety.normalizedUrl && sSafety.normalizedUrl.startsWith(baseOrigin)) {
        if (!queue.includes(sSafety.normalizedUrl)) {
          queue.push(sSafety.normalizedUrl);
        }
      }
    }

    // 3. Process crawl queue safely
    while (queue.length > 0 && crawledPages.length < limit) {
      const currentUrl = queue.shift()!;
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      // Check ignore patterns
      if (SKIP_PATTERNS.some((pattern) => pattern.test(currentUrl))) continue;

      // Check robots.txt disallow rules
      const currentPath = new URL(currentUrl).pathname;
      if (isDisallowedByRobots(currentPath, robots.disallowPaths)) {
        continue;
      }

      // Fetch page
      const startTime = Date.now();
      try {
        const res = await fetch(currentUrl, {
          signal: AbortSignal.timeout(8000),
          headers: {
            'User-Agent': 'ArthurSEO-CommandCenter-Bot/1.0 (+https://arthurscreatives.com; Arthur Rattray)',
            Accept: 'text/html,application/xhtml+xml',
          },
          redirect: 'follow',
        });

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          continue;
        }

        const html = await res.text();
        const loadTime = Date.now() - startTime;
        const parsedPage = parseHtmlPage(html, currentUrl, res.status, loadTime);
        parsedPage.websiteId = websiteId;

        crawledPages.push(parsedPage);

        // Discover more links on this page if queue is still small
        if (queue.length < limit * 2) {
          const hrefRegex = /href=["'](https?:\/\/[^"'#\s]+|\/[^"'#\s]*)["']/gi;
          let linkMatch;
          while ((linkMatch = hrefRegex.exec(html)) !== null) {
            let found = linkMatch[1];
            if (found.startsWith('/')) {
              found = baseOrigin + found;
            }
            if (found.startsWith(baseOrigin) && !visited.has(found) && !queue.includes(found)) {
              if (!SKIP_PATTERNS.some((pattern) => pattern.test(found))) {
                queue.push(found);
              }
            }
          }
        }
      } catch (err: any) {
        // Log individual fetch failure and proceed
        console.warn(`Failed to crawl ${currentUrl}:`, err.message);
      }
    }

    // If no pages were crawled (e.g. site was down), return error
    if (crawledPages.length === 0) {
      return NextResponse.json({
        error: `Could not crawl pages from ${baseUrl}. Please check that the website is online and allows public access.`,
      }, { status: 422 });
    }

    // 4. Analyze all pages and compute health scores & structured audit issues
    const analysis = analyzeAuditRun(crawledPages, baseUrl);

    // Tally issue severity counts
    let criticalCount = 0;
    let warningCount = 0;
    let opportunityCount = 0;
    let passedCount = 0;

    for (const issue of analysis.issues) {
      if (issue.severity === 'critical') criticalCount++;
      else if (issue.severity === 'warning') warningCount++;
      else if (issue.severity === 'opportunity') opportunityCount++;
      else if (issue.severity === 'passed') passedCount++;
    }

    const auditRun = {
      id: `audit_${Date.now()}`,
      websiteId,
      healthScore: analysis.healthScore,
      techScore: analysis.techScore,
      contentScore: analysis.contentScore,
      metaScore: analysis.metaScore,
      socialScore: analysis.socialScore,
      totalPages: crawledPages.length,
      criticalCount,
      warningCount,
      opportunityCount,
      passedCount,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    const issues = analysis.issues.map((iss, index) => ({
      ...iss,
      id: `issue_${Date.now()}_${index}`,
      websiteId,
      auditRunId: auditRun.id,
      createdAt: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      totalPages: crawledPages.length,
      auditRun,
      pages: crawledPages,
      issues,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Crawler execution failed' }, { status: 500 });
  }
}
