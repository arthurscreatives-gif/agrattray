import { NextRequest, NextResponse } from 'next/server';
import { isSafePublicUrl } from '@/lib/crawler';

export async function POST(req: NextRequest) {
  try {
    const { url, strategy = 'mobile' } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const safety = isSafePublicUrl(url);
    if (!safety.safe || !safety.normalizedUrl) {
      return NextResponse.json({ error: safety.reason || 'Prohibited URL' }, { status: 400 });
    }

    const targetUrl = safety.normalizedUrl;
    const strat = strategy === 'desktop' ? 'desktop' : 'mobile';

    // Google PageSpeed Insights public endpoint
    const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      targetUrl
    )}&strategy=${strat}&category=performance&category=accessibility&category=best-practices&category=seo`;

    try {
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({
          error: `Google PageSpeed returned status ${res.status}: ${errText.slice(0, 200)}`,
        }, { status: 502 });
      }

      const data = await res.json();
      const lighthouse = data.lighthouseResult;
      const categories = lighthouse?.categories || {};
      const audits = lighthouse?.audits || {};

      const perfScore = Math.round((categories.performance?.score || 0) * 100);
      const a11yScore = Math.round((categories.accessibility?.score || 0) * 100);
      const bpScore = Math.round((categories['best-practices']?.score || 0) * 100);
      const seoScore = Math.round((categories.seo?.score || 0) * 100);

      // Core Web Vitals
      const lcp = audits['largest-contentful-paint']?.displayValue || 'N/A';
      const fcp = audits['first-contentful-paint']?.displayValue || 'N/A';
      const cls = audits['cumulative-layout-shift']?.displayValue || '0';
      const tbt = audits['total-blocking-time']?.displayValue || '0 ms';
      const speedIndex = audits['speed-index']?.displayValue || 'N/A';
      const inp = audits['interaction-to-next-paint']?.displayValue || 'N/A';

      // Key diagnostics
      const diagnostics: { title: string; displayValue?: string; description?: string }[] = [];
      ['render-blocking-resources', 'uses-optimized-images', 'unminified-css', 'unminified-javascript'].forEach((key) => {
        if (audits[key] && audits[key].score !== 1) {
          diagnostics.push({
            title: audits[key].title,
            displayValue: audits[key].displayValue,
            description: audits[key].description,
          });
        }
      });

      return NextResponse.json({
        success: true,
        url: targetUrl,
        strategy: strat,
        scores: {
          performance: perfScore,
          accessibility: a11yScore,
          bestPractices: bpScore,
          seo: seoScore,
        },
        metrics: {
          lcp,
          fcp,
          cls,
          tbt,
          speedIndex,
          inp,
        },
        diagnostics,
        fetchedAt: new Date().toISOString(),
        provider: 'Google PageSpeed Insights API',
      });
    } catch (fetchErr: any) {
      return NextResponse.json({
        error: `Failed to query PageSpeed: ${fetchErr.message || 'Timeout connecting to PageSpeed service'}`,
      }, { status: 504 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'PageSpeed request failed' }, { status: 500 });
  }
}
