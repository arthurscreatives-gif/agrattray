import fs from 'fs';
import path from 'path';

// Secure server-only file paths
const DUDA_SECRETS_FILE = path.join(process.cwd(), '.duda-secrets.json');
const DUDA_SETTINGS_FILE = path.join(process.cwd(), '.duda-settings.json');

export type DudaEnvironment = 'production' | 'sandbox';
export type DudaPublishMode = 'assisted_manual' | 'partner_api';

export interface DudaCredentials {
  apiUser: string;
  apiPass: string;
  environment: DudaEnvironment;
  updatedAt?: string;
}

export interface DudaSettings {
  publishMode: DudaPublishMode;
  isConnected: boolean;
  environment: DudaEnvironment;
  activeSiteName?: string;
  primaryDomain?: string;
  sitemapUrl?: string;
  siteVerified?: boolean;
  siteResponseCode?: number;
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
    publishMode: 'assisted_manual',
    isConnected: true, // Always ready in assisted mode without requiring API keys!
    environment: 'production',
    activeSiteName: 'arthurscreatives',
    primaryDomain: 'arthurscreatives.com',
    sitemapUrl: 'https://arthurscreatives.com/sitemap.xml',
    siteVerified: true,
    lastTested: null,
    lastSynced: null,
    siteCount: 1,
    mostRecentError: null,
    statusMessage: 'Assisted Publishing Active (No API Key Required)',
  };

  try {
    if (fs.existsSync(DUDA_SETTINGS_FILE)) {
      const raw = fs.readFileSync(DUDA_SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        ...parsed,
        publishMode: parsed.publishMode || 'assisted_manual',
        isConnected: parsed.publishMode === 'partner_api' ? Boolean(parsed.isConnected) : true,
        statusMessage:
          parsed.statusMessage ||
          (parsed.publishMode === 'partner_api'
            ? 'Partner API Mode'
            : 'Assisted Publishing Active (No API Key Required)'),
      };
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

/**
 * Verifies live site status and sitemap for Duda websites in Assisted Mode (No API key required)
 */
export async function verifyDudaLiveSite(domainInput: string): Promise<{
  success: boolean;
  domain: string;
  url: string;
  status: number;
  isReachable: boolean;
  sitemapUrl: string;
  sitemapFound: boolean;
  isDudaDetected: boolean;
  responseTimeMs: number;
  error?: string;
}> {
  const cleanDomain = domainInput
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .trim()
    .toLowerCase();

  const siteUrl = `https://${cleanDomain}`;
  const sitemapUrl = `https://${cleanDomain}/sitemap.xml`;
  const startTime = Date.now();

  try {
    // 1. Fetch homepage
    const siteController = new AbortController();
    const siteTimeout = setTimeout(() => siteController.abort(), 12000);

    const siteRes = await fetch(siteUrl, {
      method: 'GET',
      headers: {
        'User-Agent': "Arthur's SEO Command Center / Duda Live Checker 1.0",
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: siteController.signal,
    }).finally(() => clearTimeout(siteTimeout));

    const responseTimeMs = Date.now() - startTime;
    const htmlText = await siteRes.text().catch(() => '');

    // Check for Duda signatures
    const isDudaDetected =
      htmlText.includes('irp.cdn-website.com') ||
      htmlText.includes('duda') ||
      htmlText.includes('dm-header') ||
      htmlText.includes('dm-layout') ||
      htmlText.includes('d-body') ||
      siteRes.headers.get('server')?.toLowerCase().includes('duda') === true;

    // 2. Fetch sitemap
    let sitemapFound = false;
    try {
      const sitemapController = new AbortController();
      const sitemapTimeout = setTimeout(() => sitemapController.abort(), 8000);
      const smRes = await fetch(sitemapUrl, {
        method: 'GET',
        headers: {
          'User-Agent': "Arthur's SEO Command Center / Sitemap Checker 1.0",
        },
        signal: sitemapController.signal,
      }).finally(() => clearTimeout(sitemapTimeout));

      sitemapFound = smRes.ok;
    } catch {
      sitemapFound = false;
    }

    return {
      success: siteRes.ok,
      domain: cleanDomain,
      url: siteUrl,
      status: siteRes.status,
      isReachable: siteRes.ok,
      sitemapUrl,
      sitemapFound,
      isDudaDetected,
      responseTimeMs,
    };
  } catch (err: any) {
    return {
      success: false,
      domain: cleanDomain,
      url: siteUrl,
      status: 0,
      isReachable: false,
      sitemapUrl,
      sitemapFound: false,
      isDudaDetected: false,
      responseTimeMs: Date.now() - startTime,
      error: err.name === 'AbortError' ? 'Site connection timed out.' : err.message || 'Unable to reach site.',
    };
  }
}

/**
 * Formats metadata and code for easy 1-click pasting into Duda's Page Settings & Header HTML
 */
export function generateDudaSeoBlock(data: {
  title: string;
  description: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  schemaJson?: string;
}) {
  const headerHtmlParts: string[] = [];

  if (data.canonicalUrl) {
    headerHtmlParts.push(`<link rel="canonical" href="${data.canonicalUrl}" />`);
  }

  if (data.schemaJson) {
    headerHtmlParts.push(`<!-- Schema.org JSON-LD Structured Data -->\n<script type="application/ld+json">\n${data.schemaJson}\n</script>`);
  }

  return {
    dudaPageSettings: {
      pageTitle: data.title,
      pageTitleLength: data.title.length,
      pageDescription: data.description,
      pageDescriptionLength: data.description.length,
      canonicalUrl: data.canonicalUrl || '',
      noIndex: Boolean(data.noIndex),
    },
    headerHtmlSnippet: headerHtmlParts.join('\n\n'),
    instructions: [
      'In Duda Editor, click "Pages" in the left navigation sidebar.',
      'Click the gear icon next to the page name to open "Page Settings".',
      'Select the "SEO" tab.',
      'Paste the Page Title and Meta Description into their respective inputs.',
      'For Schema JSON-LD, navigate to "Settings" → "Header HTML" and paste the code snippet.',
    ],
  };
}
