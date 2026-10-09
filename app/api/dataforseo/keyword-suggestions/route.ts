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
      keyword,
      location = 'Tampa,Florida,United States',
      language = 'English',
      forceLive = false,
    } = await req.json();

    if (!keyword || !keyword.trim()) {
      return NextResponse.json({ error: 'Seed keyword is required' }, { status: 400 });
    }

    const cleanTerm = keyword.trim().toLowerCase();
    const cacheKey = `keyword_suggestions_${cleanTerm}_${location}_${language}`;

    // 1. Check 7-day Cache
    if (!forceLive) {
      const cached = getFromCache<any>(cacheKey);
      if (cached) {
        return NextResponse.json({
          success: true,
          cached: true,
          cost: 0,
          provider: 'DataForSEO (7-Day Cache)',
          location,
          language,
          dateRetrieved: new Date(cached.timestamp).toISOString(),
          keywords: cached.data,
        });
      }
    }

    // 2. Cost Control Check
    const check = canExecutePaidRequest(0.01);
    if (!check.allowed) {
      return NextResponse.json({ error: check.reason }, { status: 429 });
    }

    // 3. Call DataForSEO Keyword Suggestions
    const payload = [
      {
        keyword: cleanTerm,
        location_name: location,
        language_name: language,
      },
    ];

    const response = await fetchFromDataForSeo(
      '/v3/dataforseo_labs/google/keyword_suggestions/live',
      'POST',
      payload
    );

    if (!response.ok) {
      recordApiCost('/v3/dataforseo_labs/google/keyword_suggestions/live', 0, false, 'failed');
      return NextResponse.json({ error: response.error }, { status: 400 });
    }

    recordApiCost('/v3/dataforseo_labs/google/keyword_suggestions/live', response.cost, false, 'success');

    const items = response.result?.[0]?.items || [];
    const normalized = items.slice(0, 25).map((item: any) => {
      const vol = item.keyword_info?.search_volume ?? null;
      const cpc = item.keyword_info?.cpc ?? null;
      const comp = item.keyword_info?.competition ?? null;
      const diff = item.keyword_properties?.keyword_difficulty ?? null;
      const intent = item.search_intent_info?.main_intent ?? null;
      const trend = item.keyword_info?.monthly_searches || [];

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
        trend,
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
      location,
      language,
      dateRetrieved: new Date().toISOString(),
      keywords: normalized,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
