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

    // Strip protocols, www, and paths
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .trim()
      .toLowerCase();

    if (!cleanDomain) {
      return NextResponse.json({ error: 'Valid website domain is required' }, { status: 400 });
    }

    const cacheKey = `keywords_for_site_${cleanDomain}_${location}_${language}`;

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
          keywords: cached.data,
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
      '/v3/dataforseo_labs/google/keywords_for_site/live',
      'POST',
      payload
    );

    if (!response.ok) {
      recordApiCost('/v3/dataforseo_labs/google/keywords_for_site/live', 0, false, 'failed');
      return NextResponse.json({ error: response.error }, { status: 400 });
    }

    recordApiCost('/v3/dataforseo_labs/google/keywords_for_site/live', response.cost, false, 'success');

    const items = response.result?.[0]?.items || [];
    const normalized = items.slice(0, 30).map((item: any) => {
      const vol = item.keyword_info?.search_volume ?? null;
      const cpc = item.keyword_info?.cpc ?? null;
      const comp = item.keyword_info?.competition ?? null;
      const diff = item.keyword_properties?.keyword_difficulty ?? null;
      const intent = item.search_intent_info?.main_intent ?? null;
      const rank = item.ranked_serp_element?.serp_item?.rank_absolute ?? null;

      let score = 50;
      if (vol !== null) score += Math.min(25, Math.log10(Math.max(10, vol)) * 7);
      if (comp !== null) score += Math.max(0, (1 - comp) * 20);
      if (intent === 'transactional') score += 15;
      else if (intent === 'commercial') score += 10;
      if (diff !== null) score -= diff * 0.15;

      return {
        id: `kw_${Math.random().toString(36).substring(2, 9)}`,
        term: item.keyword,
        searchVolume: vol,
        searchVolumeDisplay: vol !== null ? vol.toLocaleString() : 'Data unavailable',
        cpc: cpc !== null ? Number(cpc.toFixed(2)) : null,
        competition: comp !== null ? Number(comp.toFixed(2)) : null,
        keywordDifficulty: diff !== null ? Math.round(diff) : null,
        intent: intent || 'Data unavailable',
        opportunityScore: Math.min(100, Math.max(1, Math.round(score))),
        currentRank: rank,
        dateRetrieved: new Date().toISOString(),
        provider: 'DataForSEO',
        location,
        language,
      };
    });

    setInCache(cacheKey, normalized, response.cost);

    return NextResponse.json({
      success: true,
      cached: false,
      cost: response.cost,
      provider: 'DataForSEO',
      domain: cleanDomain,
      location,
      language,
      dateRetrieved: new Date().toISOString(),
      keywords: normalized,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
