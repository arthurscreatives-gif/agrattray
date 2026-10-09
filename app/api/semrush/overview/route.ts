import { NextRequest, NextResponse } from 'next/server';
import {
  getStoredSemrushKey,
  getSemrushSettings,
  fetchSemrushDomainOverview,
} from '@/lib/semrush-server';

export async function POST(req: NextRequest) {
  try {
    const { domain } = await req.json();
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required.' }, { status: 400 });
    }

    const key = getStoredSemrushKey();
    const settings = getSemrushSettings();

    if (!key) {
      return NextResponse.json({
        error: 'Semrush is not configured. Add your API key in Settings → Integrations.',
      }, { status: 400 });
    }

    if (!settings.isEnabled) {
      return NextResponse.json({
        error: 'Semrush integration is currently disabled in Settings → Integrations.',
      }, { status: 403 });
    }

    const data = await fetchSemrushDomainOverview(domain, key);
    return NextResponse.json({
      success: true,
      provider: 'Semrush',
      data,
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message || 'Semrush request failed.',
    }, { status: 500 });
  }
}
