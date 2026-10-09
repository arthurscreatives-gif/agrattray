import { NextRequest, NextResponse } from 'next/server';
import { validateSafePublicUrlWithDns } from '@/lib/crawler';

export async function POST(req: NextRequest) {
  try {
    const { url, strategy = 'mobile' } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const safety = await validateSafePublicUrlWithDns(url);
    if (!safety.safe || !safety.normalizedUrl) {
      return NextResponse.json({ error: safety.reason || 'Prohibited URL or SSRF restriction' }, { status: 400 });
    }

    const targetUrl = safety.normalizedUrl;
    const strat = strategy === 'desktop' ? 'desktop' : 'mobile';

    // Google PageSpeed Insights endpoint
    const apiKey = process.env.PAGESPEED_API_KEY || process.env.GOOGLE_API_KEY || '';
    const keyParam = apiKey ? `&key=${encodeURIComponent(apiKey)}` : '';
    const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      targetUrl
    )}&strategy=${strat}&category=performance&category=accessibility&category=best-practices&category=seo${keyParam}`;

    try {
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(25000),
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

      // Core Web Vitals display values and numeric values
      const lcp = audits['largest-contentful-paint']?.displayValue || 'N/A';
      const lcpNumeric = audits['largest-contentful-paint']?.numericValue || 0;

      const fcp = audits['first-contentful-paint']?.displayValue || 'N/A';
      const fcpNumeric = audits['first-contentful-paint']?.numericValue || 0;

      const cls = audits['cumulative-layout-shift']?.displayValue || '0';
      const clsNumeric = audits['cumulative-layout-shift']?.numericValue || 0;

      const tbt = audits['total-blocking-time']?.displayValue || '0 ms';
      const tbtNumeric = audits['total-blocking-time']?.numericValue || 0;

      const speedIndex = audits['speed-index']?.displayValue || 'N/A';
      const inp = audits['interaction-to-next-paint']?.displayValue || audits['max-potential-fid']?.displayValue || 'N/A';

      // Evaluate Core Web Vitals Status:
      // Good LCP <= 2500ms, Good CLS <= 0.1, Good TBT <= 200ms
      let coreWebVitalsStatus: 'passed' | 'needs_improvement' | 'failed' = 'passed';
      if (lcpNumeric > 4000 || clsNumeric > 0.25 || tbtNumeric > 600) {
        coreWebVitalsStatus = 'failed';
      } else if (lcpNumeric > 2500 || clsNumeric > 0.1 || tbtNumeric > 200) {
        coreWebVitalsStatus = 'needs_improvement';
      }

      // Performance Opportunities (audits with potential savings)
      const opportunityAuditKeys = [
        'render-blocking-resources',
        'unused-css-rules',
        'unused-javascript',
        'modern-image-formats',
        'uses-optimized-images',
        'offscreen-images',
        'unminified-css',
        'unminified-javascript',
        'server-response-time',
        'uses-text-compression',
        'efficient-animated-content',
        'total-byte-weight',
      ];

      const opportunities: {
        id: string;
        title: string;
        description: string;
        savingsMs?: number;
        savingsBytes?: number;
        displayValue?: string;
        score?: number;
      }[] = [];

      for (const key of opportunityAuditKeys) {
        const audit = audits[key];
        if (audit && typeof audit.score === 'number' && audit.score < 0.9) {
          const savingsMs = audit.details?.overallSavingsMs || 0;
          const savingsBytes = audit.details?.overallSavingsBytes || 0;
          opportunities.push({
            id: key,
            title: audit.title,
            description: (audit.description || '').replace(/\[Learn more\].*$/i, '').trim(),
            savingsMs: savingsMs > 0 ? savingsMs : undefined,
            savingsBytes: savingsBytes > 0 ? savingsBytes : undefined,
            displayValue: audit.displayValue,
            score: Math.round(audit.score * 100),
          });
        }
      }

      // Key diagnostics
      const diagnostics: { id: string; title: string; displayValue?: string; description?: string; score?: number | null }[] = [];
      const diagnosticKeys = [
        'dom-size',
        'critical-request-chains',
        'mainthread-work-breakdown',
        'bootup-time',
        'font-display',
        'uses-passive-event-listeners',
        'viewport',
        'csp-xss',
      ];

      diagnosticKeys.forEach((key) => {
        if (audits[key]) {
          diagnostics.push({
            id: key,
            title: audits[key].title,
            displayValue: audits[key].displayValue,
            description: (audits[key].description || '').replace(/\[Learn more\].*$/i, '').trim(),
            score: audits[key].score,
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
          lcpNumeric,
          fcpNumeric,
          clsNumeric,
          tbtNumeric,
        },
        coreWebVitalsStatus,
        opportunities,
        diagnostics,
        fetchedAt: new Date().toISOString(),
        provider: 'Google PageSpeed Insights API (v5)',
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
