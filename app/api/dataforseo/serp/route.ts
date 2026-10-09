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
      language = 'en',
      device = 'desktop',
      forceLive = false,
    } = await req.json();

    if (!keyword || !keyword.trim()) {
      return NextResponse.json({ error: 'Keyword is required for SERP analysis' }, { status: 400 });
    }

    const cleanTerm = keyword.trim().toLowerCase();
    const cacheKey = `serp_advanced_${cleanTerm}_${location}_${language}_${device}`;

    if (!forceLive) {
      const cached = getFromCache<any>(cacheKey);
      if (cached) {
        return NextResponse.json({
          success: true,
          cached: true,
          cost: 0,
          provider: 'DataForSEO (7-Day Cache)',
          keyword: cleanTerm,
          location,
          language,
          device,
          dateRetrieved: new Date(cached.timestamp).toISOString(),
          ...cached.data,
        });
      }
    }

    const check = canExecutePaidRequest(0.002);
    if (!check.allowed) {
      return NextResponse.json({ error: check.reason }, { status: 429 });
    }

    const payload = [
      {
        keyword: cleanTerm,
        location_name: location,
        language_code: language === 'English' ? 'en' : language,
        device: device === 'mobile' ? 'mobile' : 'desktop',
        calculate_rectangles: false,
      },
    ];

    const response = await fetchFromDataForSeo(
      '/v3/serp/google/organic/live/advanced',
      'POST',
      payload
    );

    if (!response.ok) {
      recordApiCost('/v3/serp/google/organic/live/advanced', 0, false, 'failed');
      return NextResponse.json({ error: response.error }, { status: 400 });
    }

    recordApiCost('/v3/serp/google/organic/live/advanced', response.cost, false, 'success');

    const itemElements = response.result?.[0]?.items || [];

    const organicResults: any[] = [];
    let featuredSnippet: any = null;
    const peopleAlsoAsk: any[] = [];
    const localPack: any[] = [];
    const serpFeatures: string[] = [];

    for (const item of itemElements) {
      if (item.type === 'organic') {
        organicResults.push({
          position: item.rank_group ?? item.rank_absolute,
          absoluteRank: item.rank_absolute,
          domain: item.domain || '',
          url: item.url || '',
          title: item.title || '',
          description: item.description || '',
          breadcrumb: item.breadcrumb || '',
          highlightedPhrases: item.highlighted || [],
        });
      } else if (item.type === 'featured_snippet') {
        featuredSnippet = {
          title: item.title,
          description: item.description,
          url: item.url,
          domain: item.domain,
        };
        serpFeatures.push('Featured Snippet');
      } else if (item.type === 'people_also_ask') {
        const questions = item.items?.map((q: any) => q.title || q.question) || [];
        peopleAlsoAsk.push(...questions);
        serpFeatures.push('People Also Ask');
      } else if (item.type === 'local_pack') {
        const places = item.items?.map((p: any) => ({
          title: p.title,
          rating: p.rating?.value,
          reviewsCount: p.rating?.votes_count,
          address: p.address,
          phone: p.phone,
        })) || [];
        localPack.push(...places);
        serpFeatures.push('Local Pack');
      } else if (item.type) {
        if (!serpFeatures.includes(item.type)) {
          serpFeatures.push(item.type);
        }
      }
    }

    const resultData = {
      organicResults: organicResults.slice(0, 20),
      featuredSnippet,
      peopleAlsoAsk: Array.from(new Set(peopleAlsoAsk)),
      localPack,
      serpFeatures: Array.from(new Set(serpFeatures)),
      totalResultsReturned: organicResults.length,
    };

    setInCache(cacheKey, resultData, response.cost);

    return NextResponse.json({
      success: true,
      cached: false,
      cost: response.cost,
      provider: 'DataForSEO',
      keyword: cleanTerm,
      location,
      language,
      device,
      dateRetrieved: new Date().toISOString(),
      ...resultData,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
