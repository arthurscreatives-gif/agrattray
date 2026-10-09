import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json();

    if (!login || !password) {
      return NextResponse.json({
        success: false,
        error: 'Both DataForSEO API Login and API Password are required.',
      }, { status: 400 });
    }

    const authHeader = 'Basic ' + Buffer.from(`${login.trim()}:${password.trim()}`).toString('base64');

    try {
      const res = await fetch('https://api.dataforseo.com/v3/appendix/user_data', {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      const data = await res.json();

      if (!res.ok || data.status_code !== 20000) {
        return NextResponse.json({
          success: false,
          error: data.status_message || `DataForSEO returned error code: ${data.status_code || res.status}`,
          status_code: data.status_code || res.status,
        }, { status: 401 });
      }

      const tasks = data.tasks?.[0]?.result?.[0];
      const moneyBalance = tasks?.money ?? null;

      // Mask login for safe display (e.g. "art***@gmail.com")
      const masked = login.length > 5 ? `${login.slice(0, 3)}***${login.slice(-3)}` : '***';

      return NextResponse.json({
        success: true,
        message: 'Successfully authenticated with DataForSEO v3 API',
        balance: moneyBalance !== null ? `$${moneyBalance.toFixed(2)}` : 'Active',
        maskedLogin: masked,
        verifiedAt: new Date().toISOString(),
      });
    } catch (apiErr: any) {
      return NextResponse.json({
        success: false,
        error: `Network error connecting to DataForSEO: ${apiErr.message}`,
      }, { status: 502 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
