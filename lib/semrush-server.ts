import fs from 'fs';
import path from 'path';

// Server-side persistent storage for Semrush credentials and settings
const SEMRUSH_SECRETS_FILE = path.join(process.cwd(), '.semrush-secrets.json');
const SEMRUSH_SETTINGS_FILE = path.join(process.cwd(), '.semrush-settings.json');
const SEMRUSH_CACHE_FILE = path.join(process.cwd(), '.semrush-cache.json');

export interface SemrushConfig {
  apiKey: string;
}

export interface SemrushSettings {
  isEnabled: boolean;
  defaultProviderPreference: 'dataforseo' | 'semrush';
  lastTested: string | null;
  lastSynced: string | null;
  cachedUnits: number | null;
  mostRecentError: string | null;
  statusMessage: string;
}

// In-memory cache for API responses (7 days)
const semrushCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function maskApiKey(key: string): string {
  if (!key) return '';
  const clean = key.trim();
  if (clean.length <= 8) return '********';
  return `${clean.slice(0, 4)}••••••••${clean.slice(-4)}`;
}

export function getStoredSemrushKey(): string | null {
  try {
    if (fs.existsSync(SEMRUSH_SECRETS_FILE)) {
      const raw = fs.readFileSync(SEMRUSH_SECRETS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data.apiKey) {
        return data.apiKey;
      }
    }
  } catch {
    // Ignore read errors
  }

  if (process.env.SEMRUSH_API_KEY) {
    return process.env.SEMRUSH_API_KEY;
  }

  return null;
}

export function saveStoredSemrushKey(apiKey: string): void {
  try {
    fs.writeFileSync(
      SEMRUSH_SECRETS_FILE,
      JSON.stringify({ apiKey: apiKey.trim(), updatedAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.error('Failed to write Semrush secret file:', err);
  }
}

export function deleteStoredSemrushKey(): void {
  try {
    if (fs.existsSync(SEMRUSH_SECRETS_FILE)) {
      fs.unlinkSync(SEMRUSH_SECRETS_FILE);
    }
  } catch (err) {
    console.error('Failed to remove Semrush secret file:', err);
  }
}

export function getSemrushSettings(): SemrushSettings {
  const defaults: SemrushSettings = {
    isEnabled: true,
    defaultProviderPreference: 'dataforseo',
    lastTested: null,
    lastSynced: null,
    cachedUnits: null,
    mostRecentError: null,
    statusMessage: 'Not configured',
  };

  try {
    if (fs.existsSync(SEMRUSH_SETTINGS_FILE)) {
      const raw = fs.readFileSync(SEMRUSH_SETTINGS_FILE, 'utf-8');
      return { ...defaults, ...JSON.parse(raw) };
    }
  } catch {
    // Use defaults
  }
  return defaults;
}

export function saveSemrushSettings(updates: Partial<SemrushSettings>): SemrushSettings {
  const current = getSemrushSettings();
  const next = { ...current, ...updates };
  try {
    fs.writeFileSync(SEMRUSH_SETTINGS_FILE, JSON.stringify(next, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write Semrush settings file:', err);
  }
  return next;
}

/**
 * Tests Semrush API connection using the official balance check:
 * GET https://api.semrush.com/?type=balance&key={KEY}
 */
export async function testSemrushConnection(apiKey: string): Promise<{
  success: boolean;
  units?: number;
  error?: string;
  isEligibleForApi?: boolean;
}> {
  try {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      return { success: false, error: 'API key is required.' };
    }

    const res = await fetch(`https://api.semrush.com/?type=balance&key=${encodeURIComponent(cleanKey)}`, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain, application/json',
      },
    });

    const text = await res.text();

    // Semrush returns numeric string (e.g. "10000") on success, or "ERROR 120: WRONG KEY"
    if (!res.ok || text.startsWith('ERROR')) {
      if (text.includes('120') || text.toLowerCase().includes('wrong key')) {
        return {
          success: false,
          error: 'Invalid Semrush API key (ERROR 120: WRONG KEY). Please verify your key in Semrush Profile → API.',
        };
      }
      if (text.includes('121') || text.toLowerCase().includes('nothing found')) {
        return {
          success: false,
          error: 'No active Semrush API subscription or balance found. Semrush standard API requires a Business subscription with API units.',
        };
      }
      if (text.toLowerCase().includes('limit') || text.toLowerCase().includes('units')) {
        return {
          success: false,
          error: 'Semrush API unit limit reached or insufficient balance.',
        };
      }
      return {
        success: false,
        error: `Semrush API returned: ${text.slice(0, 150)}`,
      };
    }

    const units = parseFloat(text.trim());
    const validUnits = isNaN(units) ? 0 : units;

    return {
      success: true,
      units: validUnits,
      isEligibleForApi: true,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Network error connecting to Semrush: ${err.message || 'Unknown network failure'}`,
    };
  }
}

/**
 * Fetch domain overview or organic keywords from Semrush with caching
 */
export async function fetchSemrushDomainOverview(domain: string, apiKey: string) {
  const cacheKey = `semrush_domain_${domain.toLowerCase()}`;
  const now = Date.now();
  const cached = semrushCache.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return { ...cached.data, cached: true };
  }

  try {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    const url = `https://api.semrush.com/?type=domain_ranks&key=${encodeURIComponent(apiKey)}&export_columns=Db,Dn,Rk,Or,Ot,Oc,Ad,At,Ac&domain=${encodeURIComponent(cleanDomain)}&database=us`;
    
    const res = await fetch(url);
    const text = await res.text();

    if (!res.ok || text.startsWith('ERROR')) {
      throw new Error(text);
    }

    // Parse Semrush CSV response
    const lines = text.trim().split('\n');
    let rank = null;
    let organicKeywords = 0;
    let organicTraffic = 0;
    let organicCost = 0;

    if (lines.length > 1) {
      const parts = lines[1].split(';');
      // Db;Dn;Rk;Or;Ot;Oc;Ad;At;Ac
      rank = parts[2] ? parseInt(parts[2], 10) : null;
      organicKeywords = parts[3] ? parseInt(parts[3], 10) : 0;
      organicTraffic = parts[4] ? parseInt(parts[4], 10) : 0;
      organicCost = parts[5] ? parseFloat(parts[5]) : 0;
    }

    const result = {
      domain: cleanDomain,
      rank,
      organicKeywords,
      organicTraffic,
      organicCost,
      provider: 'Semrush',
      dateRetrieved: new Date().toISOString(),
    };

    semrushCache.set(cacheKey, { data: result, timestamp: now });
    return result;
  } catch (err: any) {
    throw err;
  }
}
