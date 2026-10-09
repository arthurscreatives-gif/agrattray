import { NextRequest, NextResponse } from 'next/server';
import { isSafePublicUrl, validateSafePublicUrlWithDns, parseRobotsTxt, extractUrlsFromSitemap } from '@/lib/crawler';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
    }

    const safety = await validateSafePublicUrlWithDns(url);
    if (!safety.safe || !safety.normalizedUrl) {
      return NextResponse.json({ error: safety.reason || 'Invalid or prohibited URL' }, { status: 400 });
    }

    const targetUrl = safety.normalizedUrl;
    const origin = new URL(targetUrl).origin;

    // 1. Test HTTPS resolution
    let resolves = false;
    let httpsWorking = false;
    let initialStatus = 0;
    try {
      const pingRes = await fetch(targetUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(6000),
        headers: { 'User-Agent': 'ArthurSEO-CommandCenter-Bot/1.0' },
      });
      resolves = pingRes.ok || pingRes.status < 400;
      initialStatus = pingRes.status;
      httpsWorking = targetUrl.startsWith('https://');
    } catch {
      // Try GET if HEAD is rejected
      try {
        const getRes = await fetch(targetUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(6000),
          headers: { 'User-Agent': 'ArthurSEO-CommandCenter-Bot/1.0' },
        });
        resolves = getRes.ok || getRes.status < 400;
        initialStatus = getRes.status;
        httpsWorking = targetUrl.startsWith('https://');
      } catch (err: any) {
        return NextResponse.json({
          error: `Unable to connect to ${targetUrl}: ${err.message || 'Host unreachable'}`,
        }, { status: 422 });
      }
    }

    // 2. Check robots.txt
    const robots = await parseRobotsTxt(targetUrl);

    // 3. Locate sitemap.xml
    let sitemapFound = false;
    let sitemapUrl = robots.sitemaps.length > 0 ? robots.sitemaps[0] : `${origin}/sitemap.xml`;
    let discoveredUrls: string[] = [];

    try {
      discoveredUrls = await extractUrlsFromSitemap(sitemapUrl, 30);
      sitemapFound = discoveredUrls.length > 0;
    } catch {
      sitemapFound = false;
    }

    // If sitemap not found at standard path, test sitemap_index.xml
    if (!sitemapFound && robots.sitemaps.length === 0) {
      try {
        const altSitemap = `${origin}/sitemap_index.xml`;
        const altUrls = await extractUrlsFromSitemap(altSitemap, 30);
        if (altUrls.length > 0) {
          sitemapFound = true;
          sitemapUrl = altSitemap;
          discoveredUrls = altUrls;
        }
      } catch {
        // no alt sitemap
      }
    }

    const estimatedPagesCount = sitemapFound ? Math.max(discoveredUrls.length, 10) : 5;

    return NextResponse.json({
      success: true,
      normalizedUrl: targetUrl,
      resolves,
      httpsWorking,
      initialStatus,
      robotsFound: robots.disallowPaths.length > 0 || robots.sitemaps.length > 0,
      disallowRulesCount: robots.disallowPaths.length,
      sitemapFound,
      sitemapUrl: sitemapFound ? sitemapUrl : undefined,
      sampleDiscoveredPages: discoveredUrls.slice(0, 10),
      estimatedScope: {
        pageCount: estimatedPagesCount,
        recommendedLimit: Math.min(100, Math.max(10, estimatedPagesCount)),
        estimatedCrawlSeconds: Math.ceil(estimatedPagesCount * 0.4),
        paidApiCallsRequired: 0, // No paid calls during crawl!
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to check site' }, { status: 500 });
  }
}
