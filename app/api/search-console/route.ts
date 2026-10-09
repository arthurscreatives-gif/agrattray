import { NextRequest, NextResponse } from 'next/server';

interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'Unauthorized: Missing or invalid Google OAuth access token in Authorization header.',
      }, { status: 401 });
    }

    const accessToken = authHeader.replace(/^Bearer\s+/, '').trim();
    const body = await req.json();
    const { action, siteUrl, startDate, endDate, dimensions = ['query'], inspectUrl } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required.' }, { status: 400 });
    }

    switch (action) {
      case 'list_sites': {
        const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });

        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json({
            error: `Failed to list Search Console sites: ${errText}`,
            status: res.status,
          }, { status: res.status });
        }

        const data = await res.json();
        const siteEntries = (data.siteEntry || []).map((site: any) => ({
          siteUrl: site.siteUrl,
          permissionLevel: site.permissionLevel,
          isDomainProperty: site.siteUrl.startsWith('sc-domain:'),
        }));

        return NextResponse.json({
          success: true,
          provider: 'Google Search Console',
          sites: siteEntries,
          dateRetrieved: new Date().toISOString(),
        });
      }

      case 'search_analytics': {
        if (!siteUrl) {
          return NextResponse.json({ error: 'siteUrl is required for search_analytics.' }, { status: 400 });
        }

        // Default to last 28 days if dates not provided
        const now = new Date();
        const defaultEnd = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // GSC has ~2-day latency
        const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const encodedSite = encodeURIComponent(siteUrl);
        const queryUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`;

        const payload = {
          startDate: startDate || defaultStart,
          endDate: endDate || defaultEnd,
          dimensions: dimensions || ['query'],
          rowLimit: 100,
          dataState: 'final',
        };

        const res = await fetch(queryUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json({
            error: `Search Console API error: ${errText}`,
            status: res.status,
          }, { status: res.status });
        }

        const data = await res.json();
        const rows: SearchAnalyticsRow[] = data.rows || [];

        // Aggregate high-level totals
        let totalClicks = 0;
        let totalImpressions = 0;
        let sumPositionWeighted = 0;

        const normalizedRows = rows.map((r) => {
          totalClicks += r.clicks;
          totalImpressions += r.impressions;
          sumPositionWeighted += r.position * r.impressions;

          return {
            key: r.keys?.[0] || '',
            keys: r.keys || [],
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr !== undefined ? Number((r.ctr * 100).toFixed(2)) : 0,
            ctrDisplay: `${(r.ctr * 100).toFixed(1)}%`,
            position: Number(r.position.toFixed(1)),
          };
        });

        const avgCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
        const avgPosition = totalImpressions > 0 ? Number((sumPositionWeighted / totalImpressions).toFixed(1)) : 0;

        return NextResponse.json({
          success: true,
          provider: 'Google Search Console',
          siteUrl,
          startDate: payload.startDate,
          endDate: payload.endDate,
          dimensions,
          totals: {
            clicks: totalClicks,
            impressions: totalImpressions,
            ctr: avgCtr,
            avgPosition,
          },
          rows: normalizedRows,
          hasData: normalizedRows.length > 0,
          isNewDomainNotice: normalizedRows.length === 0
            ? 'No Google clicks or impressions recorded yet for this date range. As a newly verified domain or updated live site, Search Console may take several days to accumulate search performance.'
            : null,
          dateRetrieved: new Date().toISOString(),
        });
      }

      case 'list_sitemaps': {
        if (!siteUrl) {
          return NextResponse.json({ error: 'siteUrl is required for list_sitemaps.' }, { status: 400 });
        }

        const encodedSite = encodeURIComponent(siteUrl);
        const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });

        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json({
            error: `Failed to list Search Console sitemaps: ${errText}`,
            status: res.status,
          }, { status: res.status });
        }

        const data = await res.json();
        const sitemaps = (data.sitemap || []).map((s: any) => ({
          path: s.path,
          lastSubmitted: s.lastSubmitted,
          isPending: Boolean(s.isPending),
          isSitemapsIndex: Boolean(s.isSitemapsIndex),
          type: s.type,
          lastDownloaded: s.lastDownloaded,
          warnings: s.warnings || 0,
          errors: s.errors || 0,
          contents: s.contents || [],
        }));

        return NextResponse.json({
          success: true,
          provider: 'Google Search Console',
          siteUrl,
          sitemaps,
          dateRetrieved: new Date().toISOString(),
        });
      }

      case 'inspect_url': {
        if (!siteUrl || !inspectUrl) {
          return NextResponse.json({ error: 'siteUrl and inspectUrl are required for inspect_url.' }, { status: 400 });
        }

        const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inspectionUrl: inspectUrl,
            siteUrl,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json({
            error: `URL Inspection error: ${errText}`,
            status: res.status,
          }, { status: res.status });
        }

        const data = await res.json();
        const result = data.inspectionResult || {};
        const indexStatus = result.indexStatusResult || {};

        return NextResponse.json({
          success: true,
          provider: 'Google Search Console (URL Inspection)',
          siteUrl,
          inspectionUrl: inspectUrl,
          verdict: indexStatus.verdict || 'NEUTRAL',
          coverageState: indexStatus.coverageState || 'Crawled - currently not indexed',
          robotsTxtState: indexStatus.robotsTxtState || 'ALLOWED',
          indexingState: indexStatus.indexingState || 'INDEXING_ALLOWED',
          pageFetchState: indexStatus.pageFetchState || 'SUCCESSFUL',
          googleCanonical: indexStatus.googleCanonical || inspectUrl,
          userCanonical: indexStatus.userCanonical || inspectUrl,
          lastCrawlTime: indexStatus.lastCrawlTime || null,
          referringUrls: indexStatus.referringUrls || [],
          crawledAs: indexStatus.crawledAs || 'GOOGLE_BOT_DESKTOP',
          dateRetrieved: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({
      error: err.message || 'Internal Search Console proxy failure.',
    }, { status: 500 });
  }
}
