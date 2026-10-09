import { NextRequest, NextResponse } from 'next/server';
import {
  getStoredSemrushKey,
  saveSemrushSettings,
  testSemrushConnection,
  maskApiKey,
} from '@/lib/semrush-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const keyToTest = body.apiKey?.trim() || getStoredSemrushKey();

    if (!keyToTest) {
      return NextResponse.json({
        success: false,
        error: 'No Semrush API key provided or found on the server.',
      }, { status: 400 });
    }

    const result = await testSemrushConnection(keyToTest);

    if (result.success) {
      saveSemrushSettings({
        lastTested: new Date().toISOString(),
        cachedUnits: result.units ?? null,
        mostRecentError: null,
        statusMessage: 'Connected & Verified',
      });

      return NextResponse.json({
        success: true,
        status: 'Connected',
        maskedKey: maskApiKey(keyToTest),
        units: result.units ?? 0,
        unitsDisplay: `${(result.units ?? 0).toLocaleString()} API units`,
        dateRetrieved: new Date().toISOString(),
        provider: 'Semrush',
      });
    } else {
      saveSemrushSettings({
        lastTested: new Date().toISOString(),
        mostRecentError: result.error || 'Connection failed',
        statusMessage: 'Connection Error',
      });

      return NextResponse.json({
        success: false,
        error: result.error || 'Connection failed.',
      }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Semrush test failed.',
    }, { status: 500 });
  }
}
