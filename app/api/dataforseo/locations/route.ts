import { NextRequest, NextResponse } from 'next/server';
import { fetchFromDataForSeo } from '@/lib/dataforseo-server';

// Common verified DataForSEO Google locations
const CANONICAL_LOCATIONS = [
  { name: 'Tampa,Florida,United States', code: 1015153, country: 'United States' },
  { name: 'United States', code: 2840, country: 'United States' },
  { name: 'Orlando,Florida,United States', code: 1015093, country: 'United States' },
  { name: 'Miami,Florida,United States', code: 1015077, country: 'United States' },
  { name: 'Jacksonville,Florida,United States', code: 1015034, country: 'United States' },
  { name: 'Atlanta,Georgia,United States', code: 1015254, country: 'United States' },
  { name: 'New York,New York,United States', code: 1023191, country: 'United States' },
  { name: 'Los Angeles,California,United States', code: 1014044, country: 'United States' },
  { name: 'United Kingdom', code: 2826, country: 'United Kingdom' },
  { name: 'Canada', code: 2124, country: 'Canada' },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.toLowerCase() || '';

  if (q) {
    const matches = CANONICAL_LOCATIONS.filter((l) => l.name.toLowerCase().includes(q));
    if (matches.length > 0) {
      return NextResponse.json({ success: true, locations: matches });
    }
  }

  return NextResponse.json({ success: true, locations: CANONICAL_LOCATIONS });
}

export async function POST(req: NextRequest) {
  try {
    const { locationQuery } = await req.json();
    if (!locationQuery) {
      return NextResponse.json({ valid: false, error: 'Location query required' }, { status: 400 });
    }

    const clean = locationQuery.trim();
    const localMatch = CANONICAL_LOCATIONS.find(
      (l) => l.name.toLowerCase() === clean.toLowerCase() || l.name.toLowerCase().includes(clean.toLowerCase())
    );

    if (localMatch) {
      return NextResponse.json({
        valid: true,
        canonicalName: localMatch.name,
        locationCode: localMatch.code,
      });
    }

    // Try live verification if stored credentials exist
    const liveRes = await fetchFromDataForSeo(
      `/v3/serp/google/locations/${encodeURIComponent(clean)}`,
      'GET'
    );

    if (liveRes.ok && liveRes.result?.length > 0) {
      const top = liveRes.result[0];
      return NextResponse.json({
        valid: true,
        canonicalName: top.location_name,
        locationCode: top.location_code,
      });
    }

    return NextResponse.json({
      valid: false,
      error: `"${clean}" is not recognized by DataForSEO. Recommended: "Tampa,Florida,United States" or "United States".`,
    });
  } catch (err: any) {
    return NextResponse.json({ valid: false, error: err.message }, { status: 500 });
  }
}
