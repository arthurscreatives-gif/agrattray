import fs from 'fs';
import path from 'path';

// Secure server-only file paths
const DUDA_SECRETS_FILE = path.join(process.cwd(), '.duda-secrets.json');
const DUDA_SETTINGS_FILE = path.join(process.cwd(), '.duda-settings.json');

export type DudaEnvironment = 'production' | 'sandbox';

export interface DudaCredentials {
  apiUser: string;
  apiPass: string;
  environment: DudaEnvironment;
  updatedAt?: string;
}

export interface DudaSettings {
  isConnected: boolean;
  environment: DudaEnvironment;
  activeSiteName?: string;
  primaryDomain?: string;
  lastTested: string | null;
  lastSynced: string | null;
  siteCount?: number;
  mostRecentError: string | null;
  statusMessage: string;
}

export interface DudaPageSeoPayload {
  title?: string;
  description?: string;
  keywords?: string[];
  noIndex?: boolean;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

// In-memory cache for Duda API responses (15 minutes)
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

// Masking helpers
export function maskDudaUser(user: string): string {
  if (!user) return '';
  const clean = user.trim();
  if (clean.includes('@')) {
    const [name, domain] = clean.split('@');
    const maskedName = name.length > 2 ? `${name.slice(0, 2)}***${name.slice(-1)}` : `${name.slice(0, 1)}***`;
    return `${maskedName}@${domain}`;
  }
  return clean.length > 4 ? `${clean.slice(0, 2)}••••${clean.slice(-2)}` : '••••••••';
}

export function maskDudaPass(pass: string): string {
  if (!pass) return '';
  return '••••••••••••••••';
}

// Get stored Duda credentials
export function getStoredDudaCredentials(): DudaCredentials | null {
  try {
    if (fs.existsSync(DUDA_SECRETS_FILE)) {
      const raw = fs.readFileSync(DUDA_SECRETS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data.apiUser && data.apiPass) {
        return {
          apiUser: data.apiUser,
          apiPass: data.apiPass,
          environment: (data.environment as DudaEnvironment) || 'production',
          updatedAt: data.updatedAt,
        };
      }
    }
  } catch (err) {
    // Ignore read errors
  }

  // Fallback to environment variables
  if (process.env.DUDA_API_USER && process.env.DUDA_API_PASS) {
    return {
      apiUser: process.env.DUDA_API_USER,
      apiPass: process.env.DUDA_API_PASS,
      environment: (process.env.DUDA_ENV as DudaEnvironment) || 'production',
    };
  }

  return null;
}

// Save stored credentials
export function saveStoredDudaCredentials(
  apiUser: string,
  apiPass: string,
  environment: DudaEnvironment = 'production'
): void {
  try {
    fs.writeFileSync(
      DUDA_SECRETS_FILE,
      JSON.stringify(
        {
          apiUser: apiUser.trim(),
          apiPass: apiPass.trim(),
          environment,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf-8'
    );
  } catch (err) {
    console.error('Failed to save Duda secrets file:', err);
  }
}

// Delete stored credentials
export function deleteStoredDudaCredentials(): void {
  try {
    if (fs.existsSync(DUDA_SECRETS_FILE)) {
      fs.unlinkSync(DUDA_SECRETS_FILE);
    }
  } catch (err) {
    console.error('Failed to remove Duda secrets file:', err);
  }
}

// Get settings
export function getDudaSettings(): DudaSettings {
  const defaults: DudaSettings = {
    isConnected: false,
    environment: 'production',
    activeSiteName: 'arthurscreatives',
    primaryDomain: 'arthurscreatives.com',
    lastTested: null,
    lastSynced: null,
    siteCount: 0,
    mostRecentError: null,
    statusMessage: 'Duda publishing connector ready for configuration',
  };

  try {
    if (fs.existsSync(DUDA_SETTINGS_FILE)) {
      const raw = fs.readFileSync(DUDA_SETTINGS_FILE, 'utf-8');
      return { ...defaults, ...JSON.parse(raw) };
    }
  } catch {
    // Return defaults on error
  }

  return defaults;
}

// Save settings
export function saveDudaSettings(settings: Partial<DudaSettings>): void {
  try {
    const current = getDudaSettings();
    const updated = { ...current, ...settings };
    fs.writeFileSync(DUDA_SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save Duda settings:', err);
  }
}

// Determine base API URL strictly pinned to official Duda API domains
export function getDudaApiBaseUrl(env: DudaEnvironment): string {
  return env === 'sandbox' ? 'https://api-sandbox.duda.co/api' : 'https://api.duda.co/api';
}

// Execute authenticated HTTP request to official Duda API
export async function executeDudaRequest<T = any>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    credentials?: { apiUser: string; apiPass: string; environment: DudaEnvironment };
    useCache?: boolean;
    timeoutMs?: number;
  } = {}
): Promise<{ success: boolean; data?: T; status: number; error?: string }> {
  const creds = options.credentials || getStoredDudaCredentials();

  if (!creds || !creds.apiUser || !creds.apiPass) {
    return {
      success: false,
      status: 400,
      error: 'Duda Partner API credentials are not configured.',
    };
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const baseUrl = getDudaApiBaseUrl(creds.environment || 'production');
  const targetUrl = `${baseUrl}${cleanEndpoint}`;

  // Strict host verification to prevent SSRF
  try {
    const parsed = new URL(targetUrl);
    if (!['api.duda.co', 'api-sandbox.duda.co'].includes(parsed.hostname)) {
      return {
        success: false,
        status: 403,
        error: 'Forbidden: Outbound request prohibited for non-Duda hostname.',
      };
    }
  } catch {
    return { success: false, status: 400, error: 'Invalid API URL.' };
  }

  // Cache check for GET requests
  const method = options.method || 'GET';
  const cacheKey = `${creds.environment}:${method}:${cleanEndpoint}`;
  if (method === 'GET' && options.useCache) {
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { success: true, data: cached.data, status: 200 };
    }
  }

  const authHeader = `Basic ${Buffer.from(`${creds.apiUser}:${creds.apiPass}`).toString('base64')}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 25000);

  try {
    const res = await fetch(targetUrl, {
      method,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Arthurs-AI-Workforce-SEO-Commander/1.0',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    let responseData: any = null;
    const text = await res.text();
    if (text) {
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = { rawText: text };
      }
    }

    if (!res.ok) {
      const errMsg =
        responseData?.message ||
        responseData?.error_description ||
        responseData?.error ||
        `Duda API returned status ${res.status}`;
      return {
        success: false,
        status: res.status,
        error: errMsg,
        data: responseData,
      };
    }

    if (method === 'GET' && options.useCache && responseData) {
      memoryCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
    }

    return {
      success: true,
      data: responseData,
      status: res.status,
    };
  } catch (err: any) {
    clearTimeout(timeout);
    const isAbort = err.name === 'AbortError';
    return {
      success: false,
      status: isAbort ? 504 : 500,
      error: isAbort ? 'Duda API request timed out after 25s.' : err.message || 'Network communication error with Duda API.',
    };
  }
}

// Test Duda Partner API connection
export async function testDudaConnection(
  apiUser: string,
  apiPass: string,
  environment: DudaEnvironment = 'production'
): Promise<{ success: boolean; error?: string; siteCount?: number; status: number }> {
  // Query sites list with limit 1 to test auth without fetching big payload
  const res = await executeDudaRequest('/sites/multiscreen?limit=1', {
    method: 'GET',
    credentials: { apiUser, apiPass, environment },
    useCache: false,
  });

  if (res.success) {
    const sites = Array.isArray(res.data) ? res.data : [];
    return {
      success: true,
      status: res.status,
      siteCount: sites.length,
    };
  }

  // Duda returns 401 on bad credentials, 403 on missing permissions
  return {
    success: false,
    status: res.status,
    error: res.error || 'Authentication with Duda Partner API failed.',
  };
}
