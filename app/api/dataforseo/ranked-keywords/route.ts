import { NextRequest, NextResponse } from 'next/server';
import {
  canExecutePaidRequest,
  recordApiCost,
  getFromCache,
  setInCache,
  fetchFromDataForSeo,
} from '@/lib/dataforseo-server';

export async function POST(req: NextRequest) {
  try {
    const {
      domain = 'arthurscreatives.com',
      location = 'Tampa,Florida,United States',
      language = 'English',
      forceLive = false,
    } = await req.json();

    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .trim()
      .toLowerCase();

    const cacheKey = `ranked_keywords_${cleanDomain}_${location}_${language}`;

    if (!forceLive) {
      const cached = getFromCache<any>(cacheKey);
      if (cached) {
        return NextResponse.json({
          success: true,
          cached: true,
          cost: 0,
          provider: 'DataForSEO (7-Day Cache)',
          domain: cleanDomain,
          location,
          language,
          dateRetrieved: new Date(cached.timestamp).toISOString(),
          keywords: cached.data.keywords,
          isNewDomain: cached.data.isNewDomain,
          message: cached.data.message,
        });
      }
    }

    const check = canExecutePaidRequest(0.01);
    if (!check.allowed) {
      return NextResponse.json({ error: check.reason }, { status: 429 });
    }

    const payload = [
      {
        target: cleanDomain,
        location_name: location,
        language_name: language,
      },
    ];

    const response = await fetchFromDataForSeo(
      '/v3/dataforseo_labs/google/ranked_keywords/live',
      'POST',
      payload
    );

    if (!response.ok) {
      // If 404 or no data found, don't crash with an error! Treat as new domain
      if (response.status_code === 40400 || response.status_code === 404) {
        const resultPayload = {
          keywords: [],
          isNewDomain: true,
          message: `${cleanDomain} is a newly indexed domain or does not have recorded Google rankings in DataForSEO's historical index yet. Continue with seed keyword research or Google Search Console URL inspection.`,
        };
        setInCache(cacheKey, resultPayload, 0);
        return NextResponse.json({
          success: true,
          cached: false,
          cost: 0,
          provider: 'DataForSEO',
          domain: cleanDomain,
          location,
          language,
          dateRetrieved: new Date().toISOString(),
          ...resultPayload,
        });
      }

      recordApiCost('/v3/dataforseo_labs/google/ranked_keywords/live', 0, false, 'failed');
      return NextResponse.json({ error: response.error }, { status: 400 });
    }

    recordApiCost('/v3/dataforseo_labs/google/ranked_keywords/live', response.cost, false, 'success');

    const items = response.result?.[0]?.items || [];
    const isNewDomain = items.length === 0;

    const normalized = items.map((item: any) => {
      const rank = item.ranked_serp_element?.serp_item?.rank_absolute ?? null;
      const vol = item.keyword_data?.keyword_info?.search_volume ?? null;
      const cpc = item.keyword_data?.keyword_info?.cpc ?? null;
      const url = item.ranked_serp_element?.serp_item?.url ?? null;

      return {
        id: `kw_ranked_${Math.random().toString(36).substring(2, 9)}`,
        term: item.keyword_data?.keyword || '',
        currentRank: rank,
        searchVolume: vol,
        searchVolumeDisplay: vol !== null ? vol.toLocaleString() : 'Data unavailable',
        cpc: cpc !== null ? Number(cpc.toFixed(2)) : null,
        rankingUrl: url,
        dateRetrieved: new Date().toISOString(),
        provider: 'DataForSEO',
        location,
        language,
      };
    });

    const resultPayload = {
      keywords: normalized,
      isNewDomain,
      message: isNewDomain
        ? `${cleanDomain} is a newly monitored domain with no historical rankings detected yet in DataForSEO's global index. Research seed keywords below to start tracking.`
        : `Found ${normalized.length} ranked keywords for ${cleanDomain}.`,
    };

    setInCache(cacheKey, resultPayload, response.cost);

    return NextResponse.json({
      success: true,
      cached: false,
      cost: response.cost,
      provider: 'DataForSEO',
      domain: cleanDomain,
      location,
      language,
      dateRetrieved: new Date().toISOString(),
      ...resultPayload,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
