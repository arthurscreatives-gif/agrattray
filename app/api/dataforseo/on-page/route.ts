import { NextRequest, NextResponse } from 'next/server';
import {
  canExecutePaidRequest,
  recordApiCost,
  fetchFromDataForSeo,
} from '@/lib/dataforseo-server';

export async function POST(req: NextRequest) {
  try {
    const {
      targetUrl = 'https://www.arthurscreatives.com',
      maxCrawlPages = 50,
      userConfirmed = false,
    } = await req.json();

    const cleanUrl = targetUrl.trim();

    // 1. Extension point safeguard: Require explicit user confirmation & scope display
    if (!userConfirmed) {
      const estimatedCost = Number((maxCrawlPages * 0.0005).toFixed(4));
      return NextResponse.json({
        confirmedRequired: true,
        endpoint: '/v3/on_page/task_post',
        targetUrl: cleanUrl,
        maxCrawlPages,
        estimatedCost,
        message: `DataForSEO On-Page Deep Audit will crawl up to ${maxCrawlPages} pages. Estimated cost: $${estimatedCost.toFixed(4)}. Explicit user confirmation required before submission.`,
      });
    }

    // 2. Budget verification
    const estCost = Number((maxCrawlPages * 0.0005).toFixed(4));
    const budgetCheck = canExecutePaidRequest(estCost);
    if (!budgetCheck.allowed) {
      return NextResponse.json({ error: budgetCheck.reason }, { status: 429 });
    }

    // 3. Submit On-Page Task to DataForSEO
    const payload = [
      {
        target: cleanUrl,
        max_crawl_pages: Math.min(100, Math.max(10, maxCrawlPages)),
        load_resources: false,
        enable_javascript: false,
      },
    ];

    const response = await fetchFromDataForSeo('/v3/on_page/task_post', 'POST', payload);

    if (!response.ok) {
      recordApiCost('/v3/on_page/task_post', 0, false, 'failed');
      return NextResponse.json({ error: response.error }, { status: 400 });
    }

    recordApiCost('/v3/on_page/task_post', response.cost, false, 'success');

    const taskId = response.result?.[0]?.id || `onpage_${Date.now()}`;

    return NextResponse.json({
      success: true,
      taskId,
      targetUrl: cleanUrl,
      cost: response.cost,
      status: 'queued',
      message: 'On-Page deep audit task posted to DataForSEO. Results will be ready once crawling finishes.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
