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
      const statusMsg = result.statusMessage || (result.isStaged ? 'Token Staged (Subscription Starting Soon)' : 'Connected & Verified');
      saveSemrushSettings({
        lastTested: new Date().toISOString(),
        cachedUnits: result.units ?? null,
        mostRecentError: null,
        statusMessage: statusMsg,
      });

      return NextResponse.json({
        success: true,
        status: result.isStaged ? 'Staged' : 'Connected',
        isStaged: result.isStaged ?? false,
        statusMessage: statusMsg,
        maskedKey: maskApiKey(keyToTest),
        units: result.units ?? null,
        unitsDisplay: result.units !== null && result.units !== undefined
          ? `${result.units.toLocaleString()} API units`
          : 'Staged for subscription start',
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
