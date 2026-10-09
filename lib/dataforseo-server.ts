import fs from 'fs';
import path from 'path';

// Secure server-only file paths
const SECRETS_FILE = path.join(process.cwd(), '.dataforseo-secrets.json');
const USAGE_FILE = path.join(process.cwd(), '.dataforseo-usage.json');
const CACHE_FILE = path.join(process.cwd(), '.dataforseo-cache.json');

export interface ServerUsageStats {
  dailySpendingLimit: number; // default $1.00
  monthlySpendingLimit: number; // default $10.00
  currentDailyUsage: number;
  currentMonthlyUsage: number;
  lastResetDay: string; // YYYY-MM-DD
  lastResetMonth: string; // YYYY-MM
  lastSuccessfulConnection: string | null;
  lastApiRequestDate: string | null;
  mostRecentError: string | null;
  emergencyKillswitch: boolean;
  requestLogs: {
    id: string;
    endpoint: string;
    cost: number;
    timestamp: string;
    cached: boolean;
    status: 'success' | 'failed';
  }[];
}

interface CacheItem {
  data: any;
  cost: number;
  timestamp: number;
}

// In-memory cache & fallback storage
const memoryCache = new Map<string, CacheItem>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (as requested)

// Helper: mask login
export function maskLogin(login: string): string {
  if (!login) return '';
  const clean = login.trim();
  if (clean.includes('@')) {
    const [user, domain] = clean.split('@');
    const maskedUser = user.length > 2 ? `${user.slice(0, 2)}***${user.slice(-1)}` : `${user.slice(0, 1)}***`;
    return `${maskedUser}@${domain}`;
  }
  return clean.length > 4 ? `${clean.slice(0, 2)}***${clean.slice(-2)}` : '***';
}

// Read / Write Server Secrets
export function getStoredCredentials(): { login: string; password: string } | null {
  try {
    if (fs.existsSync(SECRETS_FILE)) {
      const raw = fs.readFileSync(SECRETS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data.login && data.password) {
        return { login: data.login, password: data.password };
      }
    }
  } catch (err) {
    // ignore
  }

  // Fallback to environment variables if provided
  if (process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD) {
    return {
      login: process.env.DATAFORSEO_LOGIN,
      password: process.env.DATAFORSEO_PASSWORD,
    };
  }

  return null;
}

export function saveStoredCredentials(login: string, pass: string): void {
  try {
    fs.writeFileSync(
      SECRETS_FILE,
      JSON.stringify({
        login: login.trim(),
        password: pass.trim(),
        updatedAt: new Date().toISOString(),
      }),
      { mode: 0o600 }
    );
  } catch (err) {
    console.error('Failed to write credentials file:', err);
  }
}

export function clearStoredCredentials(): void {
  try {
    if (fs.existsSync(SECRETS_FILE)) {
      fs.unlinkSync(SECRETS_FILE);
    }
  } catch {
    // ignore
  }
}

// Usage & Cost tracking
export function getUsageStats(): ServerUsageStats {
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.slice(0, 7);

  let stats: ServerUsageStats = {
    dailySpendingLimit: 1.0, // default $1 per day
    monthlySpendingLimit: 10.0,
    currentDailyUsage: 0.0,
    currentMonthlyUsage: 0.0,
    lastResetDay: today,
    lastResetMonth: currentMonth,
    lastSuccessfulConnection: null,
    lastApiRequestDate: null,
    mostRecentError: null,
    emergencyKillswitch: false,
    requestLogs: [],
  };

  try {
    if (fs.existsSync(USAGE_FILE)) {
      const raw = fs.readFileSync(USAGE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      stats = { ...stats, ...parsed };
    }
  } catch {
    // ignore
  }

  // Auto-reset daily if new day
  if (stats.lastResetDay !== today) {
    stats.currentDailyUsage = 0.0;
    stats.lastResetDay = today;
  }

  // Auto-reset monthly if new month
  if (stats.lastResetMonth !== currentMonth) {
    stats.currentMonthlyUsage = 0.0;
    stats.lastResetMonth = currentMonth;
  }

  return stats;
}

export function saveUsageStats(updates: Partial<ServerUsageStats>): ServerUsageStats {
  const current = getUsageStats();
  const updated: ServerUsageStats = { ...current, ...updates };

  try {
    fs.writeFileSync(USAGE_FILE, JSON.stringify(updated, null, 2), { mode: 0o600 });
  } catch (err) {
    console.error('Failed to save usage stats:', err);
  }
  return updated;
}

export function recordApiCost(endpoint: string, cost: number, cached = false, status: 'success' | 'failed' = 'success'): void {
  const current = getUsageStats();
  const updatedDaily = cached ? current.currentDailyUsage : Number((current.currentDailyUsage + cost).toFixed(4));
  const updatedMonthly = cached ? current.currentMonthlyUsage : Number((current.currentMonthlyUsage + cost).toFixed(4));

  const logEntry = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    endpoint,
    cost: cached ? 0 : cost,
    timestamp: new Date().toISOString(),
    cached,
    status,
  };

  const updatedLogs = [logEntry, ...(current.requestLogs || [])].slice(0, 50);

  saveUsageStats({
    currentDailyUsage: updatedDaily,
    currentMonthlyUsage: updatedMonthly,
    lastApiRequestDate: new Date().toISOString(),
    requestLogs: updatedLogs,
  });
}

// Check budget permission
export function canExecutePaidRequest(estimatedCost = 0.01): { allowed: boolean; reason?: string } {
  const stats = getUsageStats();

  if (stats.emergencyKillswitch) {
    return {
      allowed: false,
      reason: 'Paid requests are paused by the Emergency Killswitch.',
    };
  }

  if (stats.currentDailyUsage + estimatedCost > stats.dailySpendingLimit) {
    return {
      allowed: false,
      reason: `Daily spending limit ($${stats.dailySpendingLimit.toFixed(2)}) would be exceeded. Current: $${stats.currentDailyUsage.toFixed(3)}. Increase daily limit in Settings → Integrations.`,
    };
  }

  if (stats.currentMonthlyUsage + estimatedCost > stats.monthlySpendingLimit) {
    return {
      allowed: false,
      reason: `Monthly spending limit ($${stats.monthlySpendingLimit.toFixed(2)}) would be exceeded. Current: $${stats.currentMonthlyUsage.toFixed(3)}.`,
    };
  }

  return { allowed: true };
}

// 7-day Cache handlers
export function getFromCache<T>(key: string): { data: T; timestamp: number } | null {
  const item = memoryCache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL_MS) {
    return { data: item.data as T, timestamp: item.timestamp };
  }
  return null;
}

export function setInCache(key: string, data: any, cost: number): void {
  memoryCache.set(key, { data, cost, timestamp: Date.now() });
}

// Core DataForSEO Fetcher
export async function fetchFromDataForSeo(
  endpointPath: string,
  method: 'GET' | 'POST' = 'POST',
  body?: any,
  overrideCreds?: { login: string; password: string }
): Promise<{ ok: boolean; status_code: number; status_message?: string; cost: number; result: any; error?: string }> {
  const creds = overrideCreds || getStoredCredentials();

  if (!creds || !creds.login || !creds.password) {
    return {
      ok: false,
      status_code: 401,
      cost: 0,
      result: null,
      error: 'DataForSEO is not connected. Please enter your API Login and API Password in Settings → Integrations.',
    };
  }

  const authHeader = 'Basic ' + Buffer.from(`${creds.login.trim()}:${creds.password.trim()}`).toString('base64');
  const fullUrl = endpointPath.startsWith('http') ? endpointPath : `https://api.dataforseo.com${endpointPath}`;

  try {
    const res = await fetch(fullUrl, {
      method,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    });

    const json = await res.json().catch(() => null);

    if (!json) {
      return {
        ok: false,
        status_code: res.status,
        cost: 0,
        result: null,
        error: 'DataForSEO service returned an unparseable response.',
      };
    }

    if (json.status_code === 40100 || json.status_code === 40101 || res.status === 401) {
      saveUsageStats({ mostRecentError: 'Invalid API login or password' });
      return {
        ok: false,
        status_code: 401,
        cost: 0,
        result: null,
        error: 'Invalid API login or password. Note: The API password differs from your dashboard login password.',
      };
    }

    if (json.status_code === 40200 || json.status_code === 40201) {
      saveUsageStats({ mostRecentError: 'Insufficient account balance' });
      return {
        ok: false,
        status_code: 402,
        cost: 0,
        result: null,
        error: 'Insufficient account balance in DataForSEO. Please add funds to your DataForSEO account.',
      };
    }

    if (json.status_code === 42900 || res.status === 429) {
      saveUsageStats({ mostRecentError: 'DataForSEO rate limit reached' });
      return {
        ok: false,
        status_code: 429,
        cost: 0,
        result: null,
        error: 'DataForSEO rate limit reached. Please wait a moment before trying again.',
      };
    }

    if (json.status_code !== 20000) {
      const errMsg = json.status_message || `DataForSEO returned error code ${json.status_code}`;
      saveUsageStats({ mostRecentError: errMsg });
      return {
        ok: false,
        status_code: json.status_code,
        cost: 0,
        result: null,
        error: errMsg,
      };
    }

    const taskCost = json.cost ?? json.tasks?.[0]?.cost ?? 0.0;
    const taskResult = json.tasks?.[0]?.result ?? [];

    return {
      ok: true,
      status_code: 20000,
      cost: taskCost,
      result: taskResult,
    };
  } catch (err: any) {
    const isTimeout = err.name === 'TimeoutError' || err.message?.includes('timeout');
    const msg = isTimeout
      ? 'Network connection timed out while reaching DataForSEO.'
      : 'Network connection failed. Unable to reach DataForSEO.';

    saveUsageStats({ mostRecentError: msg });
    return {
      ok: false,
      status_code: 504,
      cost: 0,
      result: null,
      error: msg,
    };
  }
}
