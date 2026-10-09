import { NextRequest, NextResponse } from 'next/server';
import {
  getStoredCredentials,
  fetchFromDataForSeo,
  maskLogin,
  getUsageStats,
  saveUsageStats,
} from '@/lib/dataforseo-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const creds = (body.login && body.password)
      ? { login: body.login, password: body.password }
      : getStoredCredentials();

    if (!creds || !creds.login || !creds.password) {
      return NextResponse.json({
        success: false,
        error: 'No DataForSEO credentials configured. Please enter your API Login and API Password.',
      }, { status: 400 });
    }

    const testRes = await fetchFromDataForSeo(
      '/v3/appendix/user_data',
      'GET',
      undefined,
      creds
    );

    if (!testRes.ok || testRes.status_code !== 20000) {
      saveUsageStats({ mostRecentError: testRes.error || 'Connection test failed' });
      return NextResponse.json({
        success: false,
        error: testRes.error || 'DataForSEO account unavailable or authentication failed.',
      }, { status: 400 });
    }

    const userData = testRes.result?.[0] || {};
    const moneyBalance = userData.money ?? null;
    const timezone = userData.timezone ?? 'America/New_York';
    const rates = userData.rates || {};

    const stats = getUsageStats();
    saveUsageStats({
      lastSuccessfulConnection: new Date().toISOString(),
      mostRecentError: null,
    });

    return NextResponse.json({
      success: true,
      status: 'Connected',
      maskedLogin: maskLogin(creds.login),
      balance: moneyBalance !== null ? `$${moneyBalance.toFixed(2)}` : 'Active',
      timezone,
      lastSuccessfulTest: new Date().toISOString(),
      dailySpendingLimit: stats.dailySpendingLimit,
      currentDailyUsage: stats.currentDailyUsage,
      currentMonthlyUsage: stats.currentMonthlyUsage,
      message: 'Connection verified successfully. Ready for live research.',
    });
  } catch (err: any) {
    saveUsageStats({ mostRecentError: err.message });
    return NextResponse.json({
      success: false,
      error: 'Network connection failed while contacting DataForSEO.',
    }, { status: 500 });
  }
}
