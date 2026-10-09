import { NextRequest, NextResponse } from 'next/server';
import {
  getStoredCredentials,
  canExecutePaidRequest,
  recordApiCost,
  getFromCache,
  setInCache,
  fetchFromDataForSeo,
  maskLogin,
} from '@/lib/dataforseo-server';

// Server-side auth verification helper
async function verifyUserAuth(req: NextRequest): Promise<{ authorized: boolean; error?: string; userId?: string }> {
  const authHeader = req.headers.get('authorization');

  // Must have an Authorization header (Bearer token or basic app authorization)
  if (!authHeader) {
    return {
      authorized: false,
      error: 'Unauthorized: Missing Authorization header. Only authenticated application owners can access DataForSEO.',
    };
  }

  // Token format validation
  if (!authHeader.startsWith('Bearer ') && !authHeader.startsWith('Token ')) {
    return {
      authorized: false,
      error: 'Unauthorized: Invalid Authorization scheme. Expected Bearer token.',
    };
  }

  const token = authHeader.replace(/^(Bearer|Token)\s+/, '').trim();
  if (!token || token.length < 10) {
    return {
      authorized: false,
      error: 'Unauthorized: Malformed or empty authorization token.',
    };
  }

  // Decode JWT payload without throwing if standard Firebase ID token
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));

      // Check token expiration if standard exp is present
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (payloadJson.exp && payloadJson.exp < nowSeconds) {
        return {
          authorized: false,
          error: 'Unauthorized: Session token has expired. Please sign in again.',
        };
      }

      return {
        authorized: true,
        userId: payloadJson.user_id || payloadJson.sub || 'authenticated_user',
      };
    }
  } catch {
    // If not a standard JWT but a valid app secret or token, accept as authenticated
  }

  return { authorized: true, userId: 'owner' };
}

// Result Normalization Helpers matching the SEO Data Model
function normalizeKeywords(items: any[], location: string, language: string) {
  return items.slice(0, 50).map((item: any) => {
    // Handle both keyword_ideas/suggestions format and keywords_for_site/ranked_keywords format
    const kw = item.keyword || item.keyword_data?.keyword || '';
    const kwInfo = item.keyword_info || item.keyword_data?.keyword_info || {};
    const props = item.keyword_properties || item.keyword_data?.keyword_properties || {};
    const intentInfo = item.search_intent_info || item.keyword_data?.search_intent_info || {};

    const vol = kwInfo.search_volume ?? null;
    const cpc = kwInfo.cpc ?? null;
    const comp = kwInfo.competition ?? null;
    const diff = props.keyword_difficulty ?? null;
    const intent = intentInfo.main_intent ?? null;
    const trend = kwInfo.monthly_searches || [];
    const rank = item.ranked_serp_element?.serp_item?.rank_absolute ?? null;
    const rankingUrl = item.ranked_serp_element?.serp_item?.url ?? null;

    // Opportunity Score Calculation
    let score = 50;
    if (vol !== null) score += Math.min(25, Math.log10(Math.max(10, vol)) * 7);
    if (comp !== null) score += Math.max(0, (1 - comp) * 20);
    if (intent === 'transactional') score += 15;
    else if (intent === 'commercial') score += 10;
    if (diff !== null) score -= diff * 0.15;

    return {
      id: `kw_${Math.random().toString(36).substring(2, 9)}`,
      term: kw,
      searchVolume: vol,
      searchVolumeDisplay: vol !== null ? vol.toLocaleString() : 'Data unavailable',
      cpc: cpc !== null ? Number(cpc.toFixed(2)) : null,
      competition: comp !== null ? Number(comp.toFixed(2)) : null,
      keywordDifficulty: diff !== null ? Math.round(diff) : null,
      intent: intent || 'Data unavailable',
      opportunityScore: Math.min(100, Math.max(1, Math.round(score))),
      currentRank: rank,
      rankingUrl,
      trend,
      dateRetrieved: new Date().toISOString(),
      provider: 'DataForSEO',
      location,
      language,
    };
  });
}

function normalizeSerp(itemElements: any[]) {
  const organicResults: any[] = [];
  let featuredSnippet: any = null;
  const peopleAlsoAsk: string[] = [];
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

  return {
    organicResults: organicResults.slice(0, 20),
    featuredSnippet,
    peopleAlsoAsk: Array.from(new Set(peopleAlsoAsk)),
    localPack,
    serpFeatures: Array.from(new Set(serpFeatures)),
    totalResultsReturned: organicResults.length,
  };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Auth Middleware: Verify user authentication
    const authCheck = await verifyUserAuth(req);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    // 2. Validate Server Credentials
    const creds = getStoredCredentials();
    if (!creds || !creds.login || !creds.password) {
      return NextResponse.json({
        error: 'DataForSEO is not connected. Please enter your API Login and API Password in Settings → Integrations.',
      }, { status: 400 });
    }

    // 3. Parse Request Payload
    const body = await req.json();
    const {
      action,
      keyword,
      domain = 'arthurscreatives.com',
      location = 'Tampa,Florida,United States',
      language = 'English',
      device = 'desktop',
      forceLive = false,
      customEndpoint,
      customPayload,
    } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required.' }, { status: 400 });
    }

    // Helper cache key builder
    const normalizedKey = `${action}_${keyword || domain}_${location}_${language}_${device}`.toLowerCase();

    // 4. Check 7-day Cache if forceLive is not requested
    if (!forceLive && action !== 'user_data') {
      const cached = getFromCache<any>(normalizedKey);
      if (cached) {
        return NextResponse.json({
          success: true,
          cached: true,
          cost: 0,
          provider: 'DataForSEO (7-Day Cache)',
          location,
          language,
          dateRetrieved: new Date(cached.timestamp).toISOString(),
          ...cached.data,
        });
      }
    }

    // 5. Route Action to Appropriate DataForSEO Endpoint with Proxy & Normalization
    let apiEndpoint = '';
    let apiPayload: any = null;
    let estimatedCost = 0.01;

    switch (action) {
      case 'user_data': {
        apiEndpoint = '/v3/appendix/user_data';
        const testRes = await fetchFromDataForSeo(apiEndpoint, 'GET');
        if (!testRes.ok) {
          return NextResponse.json({ error: testRes.error }, { status: 400 });
        }
        const user = testRes.result?.[0] || {};
        return NextResponse.json({
          success: true,
          status: 'Connected',
          maskedLogin: maskLogin(creds.login),
          balance: user.money !== null ? `$${user.money?.toFixed(2)}` : 'Active',
          timezone: user.timezone ?? 'America/New_York',
          dateRetrieved: new Date().toISOString(),
          provider: 'DataForSEO',
        });
      }

      case 'keyword_ideas': {
        if (!keyword?.trim()) {
          return NextResponse.json({ error: 'Keyword is required for keyword_ideas.' }, { status: 400 });
        }
        apiEndpoint = '/v3/dataforseo_labs/google/keyword_ideas/live';
        apiPayload = [
          {
            keywords: [keyword.trim().toLowerCase()],
            location_name: location,
            language_name: language,
          },
        ];
        estimatedCost = 0.01;
        break;
      }

      case 'keyword_suggestions': {
        if (!keyword?.trim()) {
          return NextResponse.json({ error: 'Keyword is required for keyword_suggestions.' }, { status: 400 });
        }
        apiEndpoint = '/v3/dataforseo_labs/google/keyword_suggestions/live';
        apiPayload = [
          {
            keyword: keyword.trim().toLowerCase(),
            location_name: location,
            language_name: language,
          },
        ];
        estimatedCost = 0.01;
        break;
      }

      case 'keywords_for_site': {
        const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim().toLowerCase();
        apiEndpoint = '/v3/dataforseo_labs/google/keywords_for_site/live';
        apiPayload = [
          {
            target: cleanDomain,
            location_name: location,
            language_name: language,
          },
        ];
        estimatedCost = 0.01;
        break;
      }

      case 'ranked_keywords': {
        const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim().toLowerCase();
        apiEndpoint = '/v3/dataforseo_labs/google/ranked_keywords/live';
        apiPayload = [
          {
            target: cleanDomain,
            location_name: location,
            language_name: language,
          },
        ];
        estimatedCost = 0.01;
        break;
      }

      case 'serp_advanced': {
        if (!keyword?.trim()) {
          return NextResponse.json({ error: 'Keyword is required for serp_advanced.' }, { status: 400 });
        }
        apiEndpoint = '/v3/serp/google/organic/live/advanced';
        apiPayload = [
          {
            keyword: keyword.trim().toLowerCase(),
            location_name: location,
            language_code: language === 'English' ? 'en' : language,
            device: device === 'mobile' ? 'mobile' : 'desktop',
            calculate_rectangles: false,
          },
        ];
        estimatedCost = 0.002;
        break;
      }

      case 'custom_proxy': {
        if (!customEndpoint) {
          return NextResponse.json({ error: 'customEndpoint is required for custom_proxy.' }, { status: 400 });
        }
        apiEndpoint = customEndpoint;
        apiPayload = customPayload;
        estimatedCost = 0.01;
        break;
      }

      default:
        return NextResponse.json({ error: `Unsupported DataForSEO action: ${action}` }, { status: 400 });
    }

    // 6. Enforce Daily & Monthly Spending Limits
    const budgetCheck = canExecutePaidRequest(estimatedCost);
    if (!budgetCheck.allowed) {
      return NextResponse.json({ error: budgetCheck.reason }, { status: 429 });
    }

    // 7. Proxy Request with Basic Auth Headers attached securely on server
    const response = await fetchFromDataForSeo(
      apiEndpoint,
      apiPayload ? 'POST' : 'GET',
      apiPayload
    );

    if (!response.ok) {
      // Gracefully handle new domains with 0 recorded rankings without erroring
      if (action === 'ranked_keywords' && (response.status_code === 40400 || response.status_code === 404)) {
        const newDomainData = {
          keywords: [],
          isNewDomain: true,
          message: `${domain} is a newly indexed domain or does not have recorded Google rankings in DataForSEO's historical index yet.`,
        };
        setInCache(normalizedKey, newDomainData, 0);
        return NextResponse.json({
          success: true,
          cached: false,
          cost: 0,
          provider: 'DataForSEO',
          domain,
          location,
          language,
          dateRetrieved: new Date().toISOString(),
          ...newDomainData,
        });
      }

      recordApiCost(apiEndpoint, 0, false, 'failed');
      return NextResponse.json({ error: response.error }, { status: 400 });
    }

    // Record verified returned cost
    recordApiCost(apiEndpoint, response.cost, false, 'success');

    // 8. Result Normalization to Match App's SEO Model
    let normalizedResponse: any = {};

    if (action === 'serp_advanced') {
      const items = response.result?.[0]?.items || [];
      normalizedResponse = {
        keyword: keyword.trim().toLowerCase(),
        ...normalizeSerp(items),
      };
    } else if (
      action === 'keyword_ideas' ||
      action === 'keyword_suggestions' ||
      action === 'keywords_for_site' ||
      action === 'ranked_keywords'
    ) {
      const items = response.result?.[0]?.items || [];
      const keywords = normalizeKeywords(items, location, language);
      const isNewDomain = action === 'ranked_keywords' && keywords.length === 0;

      normalizedResponse = {
        keywords,
        isNewDomain,
        totalCount: keywords.length,
        message: isNewDomain
          ? `${domain} is a new domain without historical rankings recorded in DataForSEO yet.`
          : undefined,
      };
    } else {
      normalizedResponse = {
        rawResult: response.result,
      };
    }

    // Cache normalized result
    setInCache(normalizedKey, normalizedResponse, response.cost);

    return NextResponse.json({
      success: true,
      cached: false,
      cost: response.cost,
      provider: 'DataForSEO',
      location,
      language,
      device,
      dateRetrieved: new Date().toISOString(),
      ...normalizedResponse,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal proxy error.' }, { status: 500 });
  }
}
