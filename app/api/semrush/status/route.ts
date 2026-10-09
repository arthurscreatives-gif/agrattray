import { NextRequest, NextResponse } from 'next/server';
import {
  getStoredSemrushKey,
  saveStoredSemrushKey,
  deleteStoredSemrushKey,
  getSemrushSettings,
  saveSemrushSettings,
  maskApiKey,
  testSemrushConnection,
} from '@/lib/semrush-server';

export async function GET() {
  try {
    const key = getStoredSemrushKey();
    const settings = getSemrushSettings();

    return NextResponse.json({
      isConfigured: !!key,
      maskedKey: key ? maskApiKey(key) : '',
      isEnabled: settings.isEnabled,
      defaultProviderPreference: settings.defaultProviderPreference,
      units: settings.cachedUnits,
      lastTested: settings.lastTested,
      lastSynced: settings.lastSynced,
      mostRecentError: settings.mostRecentError,
      statusMessage: settings.statusMessage,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to read Semrush status.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, isEnabled, defaultProviderPreference } = body;

    if (apiKey !== undefined) {
      if (typeof apiKey === 'string' && apiKey.trim().length > 0) {
        saveStoredSemrushKey(apiKey.trim());
        // Run test connection immediately
        const testRes = await testSemrushConnection(apiKey.trim());
        if (testRes.success) {
          saveSemrushSettings({
            lastTested: new Date().toISOString(),
            cachedUnits: testRes.units ?? null,
            mostRecentError: null,
            statusMessage: 'Connected & Verified',
          });
        } else {
          saveSemrushSettings({
            lastTested: new Date().toISOString(),
            mostRecentError: testRes.error || 'Test failed',
            statusMessage: 'Connection Warning',
          });
        }
      }
    }

    if (isEnabled !== undefined || defaultProviderPreference !== undefined) {
      saveSemrushSettings({
        ...(isEnabled !== undefined ? { isEnabled: Boolean(isEnabled) } : {}),
        ...(defaultProviderPreference !== undefined ? { defaultProviderPreference } : {}),
      });
    }

    const currentKey = getStoredSemrushKey();
    const settings = getSemrushSettings();

    return NextResponse.json({
      success: true,
      isConfigured: !!currentKey,
      maskedKey: currentKey ? maskApiKey(currentKey) : '',
      isEnabled: settings.isEnabled,
      defaultProviderPreference: settings.defaultProviderPreference,
      units: settings.cachedUnits,
      lastTested: settings.lastTested,
      mostRecentError: settings.mostRecentError,
      statusMessage: settings.statusMessage,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update Semrush settings.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    deleteStoredSemrushKey();
    saveSemrushSettings({
      cachedUnits: null,
      lastTested: null,
      statusMessage: 'Disconnected',
      mostRecentError: null,
    });

    return NextResponse.json({
      success: true,
      message: 'Semrush API key removed successfully.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to disconnect Semrush.' }, { status: 500 });
  }
}
