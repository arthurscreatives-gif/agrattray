import { NextRequest, NextResponse } from 'next/server';
import {
  getStoredCredentials,
  saveStoredCredentials,
  clearStoredCredentials,
  getUsageStats,
  saveUsageStats,
  maskLogin,
  fetchFromDataForSeo,
} from '@/lib/dataforseo-server';

// GET: Return public connection status (NEVER secret credentials)
export async function GET() {
  try {
    const creds = getStoredCredentials();
    const stats = getUsageStats();

    return NextResponse.json({
      isConfigured: !!creds,
      maskedLogin: creds ? maskLogin(creds.login) : '',
      dailySpendingLimit: stats.dailySpendingLimit,
      monthlySpendingLimit: stats.monthlySpendingLimit,
      currentDailyUsage: stats.currentDailyUsage,
      currentMonthlyUsage: stats.currentMonthlyUsage,
      lastSuccessfulConnection: stats.lastSuccessfulConnection,
      lastApiRequestDate: stats.lastApiRequestDate,
      mostRecentError: stats.mostRecentError,
      emergencyKillswitch: stats.emergencyKillswitch,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Save credentials securely and test connection
export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json();

    if (!login || !password) {
      return NextResponse.json(
        { error: 'Both DataForSEO API Login and API Password are required.' },
        { status: 400 }
      );
    }

    // Test connection with provided credentials before storing
    const testResult = await fetchFromDataForSeo(
      '/v3/appendix/user_data',
      'GET',
      undefined,
      { login, password }
    );

    if (!testResult.ok) {
      return NextResponse.json(
        {
          success: false,
          error: testResult.error || 'Failed to authenticate with DataForSEO.',
        },
        { status: 400 }
      );
    }

    // Save server-side
    saveStoredCredentials(login, password);

    const userData = testResult.result?.[0] || {};
    const moneyBalance = userData.money ?? null;
    const timezone = userData.timezone ?? 'UTC';

    const updatedStats = saveUsageStats({
      lastSuccessfulConnection: new Date().toISOString(),
      mostRecentError: null,
    });

    return NextResponse.json({
      success: true,
      message: 'DataForSEO connected successfully.',
      maskedLogin: maskLogin(login),
      balance: moneyBalance !== null ? `$${moneyBalance.toFixed(2)}` : 'Active',
      timezone,
      lastSuccessfulConnection: updatedStats.lastSuccessfulConnection,
      dailySpendingLimit: updatedStats.dailySpendingLimit,
      currentDailyUsage: updatedStats.currentDailyUsage,
      currentMonthlyUsage: updatedStats.currentMonthlyUsage,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Disconnect
export async function DELETE() {
  try {
    clearStoredCredentials();
    saveUsageStats({
      lastSuccessfulConnection: null,
      mostRecentError: null,
    });
    return NextResponse.json({ success: true, message: 'DataForSEO disconnected.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Update budget controls or killswitch
export async function PATCH(req: NextRequest) {
  try {
    const { dailySpendingLimit, emergencyKillswitch, monthlySpendingLimit } = await req.json();
    const updates: any = {};

    if (typeof dailySpendingLimit === 'number' && dailySpendingLimit > 0) {
      updates.dailySpendingLimit = dailySpendingLimit;
    }
    if (typeof monthlySpendingLimit === 'number' && monthlySpendingLimit > 0) {
      updates.monthlySpendingLimit = monthlySpendingLimit;
    }
    if (typeof emergencyKillswitch === 'boolean') {
      updates.emergencyKillswitch = emergencyKillswitch;
    }

    const saved = saveUsageStats(updates);
    return NextResponse.json({ success: true, stats: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
