import { CrawledPage, AuditIssue, IssueCategory, IssueSeverity } from '@/types/seo';
import dns from 'dns';

// SSRF Protection: Check if an IP address belongs to private, loopback, link-local, multicast, or reserved ranges
export function isPrivateOrReservedIp(ip: string): boolean {
  if (!ip) return true;
  const cleanIp = ip.trim().toLowerCase();

  // IPv6 checks
  if (cleanIp.includes(':')) {
    if (cleanIp === '::1' || cleanIp === '::') return true;
    if (cleanIp.startsWith('fe80:')) return true; // Link-local
    if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true; // Unique local fc00::/7
    if (cleanIp.startsWith('ff')) return true; // Multicast
    // IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
    if (cleanIp.startsWith('::ffff:')) {
      const mappedIpv4 = cleanIp.replace('::ffff:', '');
      return isPrivateOrReservedIp(mappedIpv4);
    }
    return false;
  }

  // IPv4 checks
  const ipv4Parts = cleanIp.split('.');
  if (ipv4Parts.length === 4) {
    const octets = ipv4Parts.map((p) => parseInt(p, 10));
    if (octets.some((o) => isNaN(o) || o < 0 || o > 255)) return true;

    const [o1, o2, o3, o4] = octets;

    // 0.0.0.0/8 (Current network)
    if (o1 === 0) return true;
    // 10.0.0.0/8 (Private)
    if (o1 === 10) return true;
    // 100.64.0.0/10 (Shared Address Space / CGNAT)
    if (o1 === 100 && o2 >= 64 && o2 <= 127) return true;
    // 127.0.0.0/8 (Loopback)
    if (o1 === 127) return true;
    // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Cloud Metadata 169.254.169.254)
    if (o1 === 169 && o2 === 254) return true;
    // 172.16.0.0/12 (Private)
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (o1 === 192 && o2 === 0 && o3 === 0) return true;
    // 192.0.2.0/24 (TEST-NET-1)
    if (o1 === 192 && o2 === 0 && o3 === 2) return true;
    // 192.168.0.0/16 (Private)
    if (o1 === 192 && o2 === 168) return true;
    // 198.18.0.0/15 (Network benchmark tests)
    if (o1 === 198 && (o2 === 18 || o2 === 19)) return true;
    // 198.51.100.0/24 (TEST-NET-2)
    if (o1 === 198 && o2 === 51 && o3 === 100) return true;
    // 203.0.113.0/24 (TEST-NET-3)
    if (o1 === 203 && o2 === 0 && o3 === 113) return true;
    // 224.0.0.0/4 (Multicast 224-239)
    if (o1 >= 224 && o1 <= 239) return true;
    // 240.0.0.0/4 (Reserved / Future use)
    if (o1 >= 240) return true;
    // 255.255.255.255 (Broadcast)
    if (o1 === 255 && o2 === 255 && o3 === 255 && o4 === 255) return true;
  }

  return false;
}

// Blocked suspicious and local hostnames
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'broadcasthost',
  'local',
  'internal',
  'metadata',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
  'kubernetes.default',
  'kubernetes.default.svc',
]);

// SSRF Protection: Synchronous URL format and range validation
export function isSafePublicUrl(inputUrl: string): { safe: boolean; reason?: string; normalizedUrl?: string } {
  try {
    if (!inputUrl || typeof inputUrl !== 'string') {
      return { safe: false, reason: 'URL must be a non-empty string.' };
    }

    const trimmed = inputUrl.trim();

    // Prevent local file scheme explicitly
    if (
      trimmed.startsWith('file:') ||
      trimmed.startsWith('filesystem:') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('\\') ||
      trimmed.startsWith('.')
    ) {
      return { safe: false, reason: 'Local file access and filesystem schemes are strictly prohibited.' };
    }

    const parsed = new URL(trimmed);

    // Only allow HTTP and HTTPS protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Only HTTP and HTTPS protocols are allowed. Schemes like file:, ftp:, gopher:, or data: are blocked.' };
    }

    const host = parsed.hostname.toLowerCase();

    // Check blocked hostnames
    if (
      BLOCKED_HOSTNAMES.has(host) ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return { safe: false, reason: 'Localhost and internal hostnames are restricted.' };
    }

    // Check port (allow standard HTTP/HTTPS and common public dev web ports)
    const allowedPorts = new Set(['', '80', '443', '8080', '8443', '3000', '8000']);
    if (parsed.port && !allowedPorts.has(parsed.port)) {
      return { safe: false, reason: `Port ${parsed.port} is not permitted. Only standard web ports (80, 443, 8080, 8443) are allowed.` };
    }

    // Check direct IP address literal
    if (isPrivateOrReservedIp(host)) {
      return { safe: false, reason: 'Private, loopback, link-local, or cloud metadata IP ranges are blocked for SSRF security.' };
    }

    // Check integer/hex encoded IPs (e.g., http://2130706433 or http://0x7f000001)
    if (/^\d+$/.test(host) || /^0x[0-9a-fA-F]+$/.test(host)) {
      return { safe: false, reason: 'Numeric or hex-encoded IP addresses are prohibited.' };
    }

    // Normalization: Ensure valid origin, strip hash and trailing slash unless root
    let normalized = parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, ''));
    if (parsed.search) normalized += parsed.search;

    return { safe: true, normalizedUrl: normalized };
  } catch (err: any) {
    return { safe: false, reason: 'Invalid URL format.' };
  }
}

// SSRF Protection: Asynchronous URL + DNS resolution validation
export async function validateSafePublicUrlWithDns(
  inputUrl: string
): Promise<{ safe: boolean; reason?: string; normalizedUrl?: string; resolvedIps?: string[] }> {
  const syncCheck = isSafePublicUrl(inputUrl);
  if (!syncCheck.safe || !syncCheck.normalizedUrl) {
    return syncCheck;
  }

  const parsed = new URL(syncCheck.normalizedUrl);
  const host = parsed.hostname.toLowerCase();

  // If host is already an IP, it passed sync check, but double check
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(':')) {
    if (isPrivateOrReservedIp(host)) {
      return { safe: false, reason: 'Target IP is within a restricted private or reserved network range.' };
    }
    return { safe: true, normalizedUrl: syncCheck.normalizedUrl, resolvedIps: [host] };
  }

  // Resolve DNS to verify all returned IPs are public
  try {
    const lookupResults = await dns.promises.lookup(host, { all: true });
    if (!lookupResults || lookupResults.length === 0) {
      return { safe: false, reason: `Unable to resolve hostname "${host}".` };
    }

    const resolvedIps = lookupResults.map((r) => r.address);
    for (const resIp of resolvedIps) {
      if (isPrivateOrReservedIp(resIp)) {
        return {
          safe: false,
          reason: `DNS resolution for "${host}" resolves to a restricted private or cloud metadata IP (${resIp}). Request blocked for SSRF security.`,
        };
      }
    }

    return { safe: true, normalizedUrl: syncCheck.normalizedUrl, resolvedIps };
  } catch (dnsErr: any) {
    return { safe: false, reason: `DNS resolution failed for "${host}": ${dnsErr.message || 'Host not found'}` };
  }
}

// Simple robots.txt parser
export async function parseRobotsTxt(baseUrl: string): Promise<{ disallowPaths: string[]; sitemaps: string[] }> {
  const disallowPaths: string[] = [];
  const sitemaps: string[] = [];
  try {
    const origin = new URL(baseUrl).origin;
    const robotsUrl = `${origin}/robots.txt`;
    const res = await fetch(robotsUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': "ArthurSEO-CommandCenter-Bot/1.0 (+https://arthurscreatives.com)" },
    });

    if (res.ok) {
      const text = await res.text();
      const lines = text.split('\n');
      let isTargetAgent = true;

      for (const line of lines) {
        const clean = line.trim();
        if (clean.toLowerCase().startsWith('user-agent:')) {
          const agent = clean.slice(11).trim();
          isTargetAgent = agent === '*' || agent.toLowerCase().includes('arthur');
        } else if (clean.toLowerCase().startsWith('disallow:') && isTargetAgent) {
          const path = clean.slice(9).trim();
          if (path) disallowPaths.push(path);
        } else if (clean.toLowerCase().startsWith('sitemap:')) {
          const sitemap = clean.slice(8).trim();
          if (sitemap) sitemaps.push(sitemap);
        }
      }
    }
  } catch (err) {
    // Robots.txt might not exist, which is non-fatal
  }
  return { disallowPaths, sitemaps };
}

// Sitemap XML locator & URL extractor
export async function extractUrlsFromSitemap(sitemapUrl: string, maxUrls = 50): Promise<string[]> {
  const urls: string[] = [];
  try {
    const res = await fetch(sitemapUrl, {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': "ArthurSEO-CommandCenter-Bot/1.0" },
    });
    if (!res.ok) return urls;

    const xml = await res.text();
    const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/gi;
    let match;
    while ((match = locRegex.exec(xml)) !== null && urls.length < maxUrls) {
      const foundUrl = match[1].trim();
      if (!urls.includes(foundUrl) && !foundUrl.endsWith('.xml')) {
        urls.push(foundUrl);
      }
    }
  } catch (err) {
    console.warn('Sitemap extraction error:', err);
  }
  return urls;
}

export function isDisallowedByRobots(urlPath: string, disallowRules: string[]): boolean {
  for (const rule of disallowRules) {
    if (rule === '/') return true;
    if (rule.endsWith('*') && urlPath.startsWith(rule.slice(0, -1))) return true;
    if (urlPath.startsWith(rule)) return true;
  }
  return false;
}

// Fast lightweight HTML regex-based parser
export function parseHtmlPage(html: string, pageUrl: string, statusCode: number, loadTimeMs: number): CrawledPage {
  const parsedUrl = new URL(pageUrl);
  const path = parsedUrl.pathname || '/';

  // 1. Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '';
  const titleLength = title.length;

  // 2. Meta description
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
                        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';
  const metaLength = metaDescription.length;

  // 3. Headings: H1, H2, H3
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  const h1 = h1Matches.length > 0 ? h1Matches[0][1].replace(/<[^>]+>/g, '').trim() : '';
  const h1Count = h1Matches.length;

  const headings: { level: string; text: string }[] = [];
  const headingRegex = /<(h[1-3])[^>]*>([\s\S]*?)<\/\1>/gi;
  let hMatch;
  let count = 0;
  while ((hMatch = headingRegex.exec(html)) !== null && count < 20) {
    headings.push({
      level: hMatch[1].toUpperCase(),
      text: hMatch[2].replace(/<[^>]+>/g, '').trim(),
    });
    count++;
  }

  // 4. Canonical
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i);
  const canonicalUrl = canonicalMatch ? canonicalMatch[1].trim() : '';
  const isCanonicalMatch = !canonicalUrl || canonicalUrl === pageUrl || canonicalUrl.replace(/\/$/, '') === pageUrl.replace(/\/$/, '');

  // 5. Indexability
  const robotsMetaMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const robotsMetaContent = robotsMetaMatch ? robotsMetaMatch[1].toLowerCase() : '';
  const isIndexable = statusCode >= 200 && statusCode < 300 && !robotsMetaContent.includes('noindex');

  // 6. Open Graph
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const ogImgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const hasOgTags = !!(ogTitleMatch || ogDescMatch || ogImgMatch);

  // 7. Twitter cards
  const twitterCardMatch = html.match(/<meta[^>]*name=["']twitter:card["'][^>]*>/i);
  const hasTwitterCards = !!twitterCardMatch;

  // 8. JSON-LD Structured Data
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const jsonLdTypes: string[] = [];
  let jMatch;
  let hasJsonLd = false;
  while ((jMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsedLd = JSON.parse(jMatch[1].trim());
      hasJsonLd = true;
      if (Array.isArray(parsedLd)) {
        parsedLd.forEach((item) => item['@type'] && jsonLdTypes.push(item['@type']));
      } else if (parsedLd['@type']) {
        jsonLdTypes.push(parsedLd['@type']);
      } else if (parsedLd['@graph'] && Array.isArray(parsedLd['@graph'])) {
        parsedLd['@graph'].forEach((item: any) => item['@type'] && jsonLdTypes.push(item['@type']));
      }
    } catch {
      // invalid json-ld
    }
  }

  // 9. Images and Alt text
  const imgMatches = [...html.matchAll(/<img([^>]*)>/gi)];
  const totalImagesCount = imgMatches.length;
  let missingAltImagesCount = 0;
  for (const img of imgMatches) {
    const attr = img[1];
    if (!attr.includes('alt=') || /alt=["']\s*["']/.test(attr)) {
      missingAltImagesCount++;
    }
  }

  // 10. Links
  const internalLinkRegex = new RegExp(`href=["'](https?://${parsedUrl.hostname}[^"']*|/[^"']*)["']`, 'gi');
  const internalLinks = [...html.matchAll(internalLinkRegex)];
  const allLinkRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
  const allLinks = [...html.matchAll(allLinkRegex)];
  const externalLinksCount = Math.max(0, allLinks.length - internalLinks.length);

  // 11. Word count (strip scripts, styles, tags)
  const cleanBody = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = cleanBody ? cleanBody.split(' ').length : 0;

  // 12. Viewport & HTML Lang
  const hasViewport = /<meta[^>]*name=["']viewport["'][^>]*>/i.test(html);
  const langMatch = html.match(/<html[^>]*lang=["']([^"']*)["'][^>]*>/i);
  const htmlLang = langMatch ? langMatch[1] : undefined;

  // Calculate quick issues on this page
  let issuesCount = 0;
  if (!title) issuesCount++;
  if (!metaDescription) issuesCount++;
  if (h1Count === 0 || h1Count > 1) issuesCount++;
  if (wordCount < 250) issuesCount++;
  if (missingAltImagesCount > 0) issuesCount++;
  if (!hasOgTags) issuesCount++;
  if (!hasJsonLd) issuesCount++;
  if (!isIndexable) issuesCount++;

  return {
    id: `page_${Math.random().toString(36).substring(2, 9)}`,
    websiteId: '',
    userId: '',
    url: pageUrl,
    path,
    statusCode,
    title,
    titleLength,
    metaDescription,
    metaLength,
    h1,
    h1Count,
    headings,
    wordCount,
    isIndexable,
    canonicalUrl,
    isCanonicalMatch,
    hasOgTags,
    ogTitle: ogTitleMatch ? ogTitleMatch[1] : undefined,
    ogDescription: ogDescMatch ? ogDescMatch[1] : undefined,
    ogImage: ogImgMatch ? ogImgMatch[1] : undefined,
    hasTwitterCards,
    hasJsonLd,
    jsonLdTypes,
    totalImagesCount,
    missingAltImagesCount,
    internalLinksCount: internalLinks.length,
    externalLinksCount,
    hasViewport,
    htmlLang,
    loadTimeMs,
    issuesCount,
    lastCrawledAt: new Date().toISOString(),
  };
}

// Generate comprehensive audit issues from crawled pages
export function analyzeAuditRun(pages: CrawledPage[], websiteUrl: string): {
  healthScore: number;
  techScore: number;
  contentScore: number;
  metaScore: number;
  socialScore: number;
  issues: Omit<AuditIssue, 'id' | 'websiteId' | 'auditRunId' | 'userId' | 'createdAt'>[];
} {
  const total = pages.length || 1;
  const issues: Omit<AuditIssue, 'id' | 'websiteId' | 'auditRunId' | 'userId' | 'createdAt'>[] = [];

  // Group pages by issues
  const missingTitlePages = pages.filter((p) => !p.title).map((p) => p.url);
  const longTitlePages = pages.filter((p) => p.titleLength > 60).map((p) => p.url);
  const shortTitlePages = pages.filter((p) => p.title && p.titleLength < 30).map((p) => p.url);

  const missingDescPages = pages.filter((p) => !p.metaDescription).map((p) => p.url);
  const shortDescPages = pages.filter((p) => p.metaDescription && p.metaLength < 70).map((p) => p.url);
  const longDescPages = pages.filter((p) => p.metaLength > 160).map((p) => p.url);

  const missingH1Pages = pages.filter((p) => p.h1Count === 0).map((p) => p.url);
  const multipleH1Pages = pages.filter((p) => p.h1Count > 1).map((p) => p.url);

  const thinContentPages = pages.filter((p) => p.wordCount < 300).map((p) => p.url);
  const missingAltPages = pages.filter((p) => p.missingAltImagesCount > 0).map((p) => p.url);

  const missingOgPages = pages.filter((p) => !p.hasOgTags).map((p) => p.url);
  const missingJsonLdPages = pages.filter((p) => !p.hasJsonLd).map((p) => p.url);

  const non200Pages = pages.filter((p) => p.statusCode >= 400).map((p) => p.url);
  const canonicalMismatchPages = pages.filter((p) => !p.isCanonicalMatch).map((p) => p.url);
  const missingViewportPages = pages.filter((p) => !p.hasViewport).map((p) => p.url);

  // 1. Missing Title (Critical)
  if (missingTitlePages.length > 0) {
    issues.push({
      type: 'missing_title',
      category: 'metadata',
      severity: 'critical',
      title: 'Missing <title> Tag',
      explanation: `${missingTitlePages.length} page(s) have no HTML title element.`,
      whyItMatters: 'Page title is the primary anchor used by Google for rankings and search snippet display. Pages without titles rarely rank for targeted search terms.',
      recommendedAction: 'Add a distinct, descriptive title of 50-60 characters containing the primary target keyword.',
      proposedCorrection: '<title>Primary Keyword | Business Name</title>',
      priority: 'high',
      impact: 'high',
      effort: 'quick',
      status: 'open',
      affectedPages: missingTitlePages,
      affectedPagesCount: missingTitlePages.length,
      dataSource: 'Arthur Public Crawler',
    });
  }

  // 2. Missing H1 (Critical)
  if (missingH1Pages.length > 0) {
    issues.push({
      type: 'missing_h1',
      category: 'content',
      severity: 'critical',
      title: 'Missing Primary H1 Heading',
      explanation: `${missingH1Pages.length} page(s) do not contain a top-level <h1> heading.`,
      whyItMatters: 'H1 tags signal the overarching topical theme of the page to search crawlers and improve accessibility for screen readers.',
      recommendedAction: 'Place exactly one clear H1 heading near the top of the body content.',
      proposedCorrection: '<h1>Comprehensive [Service Name] in [City]</h1>',
      priority: 'high',
      impact: 'high',
      effort: 'quick',
      status: 'open',
      affectedPages: missingH1Pages,
      affectedPagesCount: missingH1Pages.length,
      dataSource: 'Arthur Public Crawler',
    });
  }

  // 3. Multiple H1s (Warning)
  if (multipleH1Pages.length > 0) {
    issues.push({
      type: 'multiple_h1',
      category: 'content',
      severity: 'warning',
      title: 'Multiple H1 Headings Detected',
      explanation: `${multipleH1Pages.length} page(s) have two or more <h1> tags.`,
      whyItMatters: 'Multiple H1 tags dilute semantic focus and create confusion for search engines attempting to identify the primary subject.',
      recommendedAction: 'Consolidate to a single primary H1 and demote secondary headers to H2 or H3 tags.',
      proposedCorrection: 'Convert extra <h1> sections to <h2>Subheading</h2>',
      priority: 'medium',
      impact: 'medium',
      effort: 'quick',
      status: 'open',
      affectedPages: multipleH1Pages,
      affectedPagesCount: multipleH1Pages.length,
      dataSource: 'Arthur Public Crawler',
    });
  }

  // 4. Missing Meta Description (Warning)
  if (missingDescPages.length > 0) {
    issues.push({
      type: 'missing_meta_description',
      category: 'metadata',
      severity: 'warning',
      title: 'Missing Meta Description',
      explanation: `${missingDescPages.length} page(s) lack a meta description tag.`,
      whyItMatters: 'Google will auto-generate random body snippets if missing, leading to reduced click-through rate (CTR) in search results.',
      recommendedAction: 'Write an enticing 120-155 character meta description highlighting benefits and a clear call to action.',
      proposedCorrection: '<meta name="description" content="Discover professional [service] tailored for your needs. Contact Arthur\'s Creatives today for a consultation." />',
      priority: 'high',
      impact: 'medium',
      effort: 'quick',
      status: 'open',
      affectedPages: missingDescPages,
      affectedPagesCount: missingDescPages.length,
      dataSource: 'Arthur Public Crawler',
    });
  }

  // 5. Short or Long Title (Opportunity)
  if (longTitlePages.length > 0 || shortTitlePages.length > 0) {
    const combined = [...longTitlePages, ...shortTitlePages];
    issues.push({
      type: 'title_length_optimization',
      category: 'metadata',
      severity: 'opportunity',
      title: 'Page Title Length Needs Refinement',
      explanation: `${combined.length} page(s) have titles that are either truncated (>60 chars) or under-optimized (<30 chars).`,
      whyItMatters: 'Titles longer than 60 characters are truncated with ellipses in Google SERPs, while very short titles miss keyword opportunities.',
      recommendedAction: 'Adjust title lengths to between 50 and 60 characters for optimal desktop and mobile visibility.',
      proposedCorrection: 'Aim for 55 characters with primary keyword + brand name.',
      priority: 'medium',
      impact: 'medium',
      effort: 'quick',
      status: 'open',
      affectedPages: combined,
      affectedPagesCount: combined.length,
      dataSource: 'Arthur Public Crawler',
    });
  }

  // 6. Missing Image Alt Text (Warning)
  if (missingAltPages.length > 0) {
    issues.push({
      type: 'missing_image_alts',
      category: 'content',
      severity: 'warning',
      title: 'Images Missing Alt Text',
      explanation: `${missingAltPages.length} page(s) have images without descriptive alt attributes.`,
      whyItMatters: 'Alt text improves accessibility compliance (WCAG) and allows images to index in Google Image Search.',
      recommendedAction: 'Add clear, context-specific alt attributes to every substantive image. Use empty alt="" for purely decorative icons.',
      proposedCorrection: '<img src="/path.jpg" alt="Descriptive overview of photo or graphic" />',
      priority: 'medium',
      impact: 'medium',
      effort: 'moderate',
      status: 'open',
      affectedPages: missingAltPages,
      affectedPagesCount: missingAltPages.length,
      dataSource: 'Arthur Public Crawler',
    });
  }

  // 7. Thin Content (Warning)
  if (thinContentPages.length > 0) {
    issues.push({
      type: 'thin_content',
      category: 'content',
      severity: 'warning',
      title: 'Thin Content (< 300 words)',
      explanation: `${thinContentPages.length} page(s) have fewer than 300 words of substantive text.`,
      whyItMatters: 'Search engines struggle to assess topic depth on thin pages, which often leads to poor keyword rankings.',
      recommendedAction: 'Expand page depth with service details, FAQs, testimonials, and structured body content.',
      priority: 'medium',
      impact: 'high',
      effort: 'moderate',
      status: 'open',
      affectedPages: thinContentPages,
      affectedPagesCount: thinContentPages.length,
      dataSource: 'Arthur Public Crawler',
    });
  }

  // 8. Missing Structured Data / JSON-LD (Opportunity)
  if (missingJsonLdPages.length > 0) {
    issues.push({
      type: 'missing_json_ld',
      category: 'social_schema',
      severity: 'opportunity',
      title: 'Missing Schema.org JSON-LD Structured Data',
      explanation: `${missingJsonLdPages.length} page(s) lack Schema markup.`,
      whyItMatters: 'Schema markup enables rich snippets (reviews, FAQs, breadcrumbs, local business details) that dramatically increase click-through rates.',
      recommendedAction: 'Generate and embed valid JSON-LD schema (e.g., LocalBusiness, Service, or Article).',
      proposedCorrection: '<script type="application/ld+json">{\n  "@context": "https://schema.org",\n  "@type": "LocalBusiness",\n  "name": "Arthur\'s Creatives",\n  "url": "' + websiteUrl + '"\n}</script>',
      priority: 'medium',
      impact: 'medium',
      effort: 'quick',
      status: 'open',
      affectedPages: missingJsonLdPages,
      affectedPagesCount: missingJsonLdPages.length,
      dataSource: 'Arthur Public Crawler',
    });
  }

  // 9. Missing Open Graph Tags (Opportunity)
  if (missingOgPages.length > 0) {
    issues.push({
      type: 'missing_open_graph',
      category: 'social_schema',
      severity: 'opportunity',
      title: 'Missing Open Graph Social Tags',
      explanation: `${missingOgPages.length} page(s) lack complete Open Graph meta tags (og:title, og:image).`,
      whyItMatters: 'Without Open Graph tags, links shared on LinkedIn, Facebook, Slack, and X display broken cards without previews.',
      recommendedAction: 'Add og:title, og:description, and a high-resolution og:image (1200x630).',
      proposedCorrection: '<meta property="og:title" content="Page Title" />\n<meta property="og:description" content="Brief summary" />\n<meta property="og:image" content="https://.../og-share.jpg" />',
      priority: 'low',
      impact: 'medium',
      effort: 'quick',
      status: 'open',
      affectedPages: missingOgPages,
      affectedPagesCount: missingOgPages.length,
      dataSource: 'Arthur Public Crawler',
    });
  }

  // 10. Canonical Mismatch (Warning)
  if (canonicalMismatchPages.length > 0) {
    issues.push({
      type: 'canonical_mismatch',
      category: 'technical',
      severity: 'warning',
      title: 'Self-Referencing Canonical Discrepancy',
      explanation: `${canonicalMismatchPages.length} page(s) point to a different canonical URL or have no canonical declaration.`,
      whyItMatters: 'Canonical tags prevent duplicate content penalties from protocol or trailing slash variations.',
      recommendedAction: 'Ensure canonical URLs accurately reference the preferred HTTPS canonical version.',
      priority: 'medium',
      impact: 'medium',
      effort: 'quick',
      status: 'open',
      affectedPages: canonicalMismatchPages,
      affectedPagesCount: canonicalMismatchPages.length,
      dataSource: 'Arthur Public Crawler',
    });
  }

  // 11. Passed checks
  if (missingViewportPages.length === 0) {
    issues.push({
      type: 'viewport_passed',
      category: 'technical',
      severity: 'passed',
      title: 'Mobile Viewport Meta Tag Configured',
      explanation: 'All audited pages include a responsive viewport configuration.',
      whyItMatters: 'Ensures Google mobile-first indexing evaluates page layout favorably.',
      recommendedAction: 'Maintain current responsive viewport configuration.',
      priority: 'low',
      impact: 'medium',
      effort: 'quick',
      status: 'verified',
      affectedPages: [],
      affectedPagesCount: 0,
      dataSource: 'Arthur Public Crawler',
    });
  }

  // Compute Transparent Category Scores (0-100)
  // Technical (25): 25 - (non200 * 15 + canonical * 5 + viewport * 5)
  const techPenalty = (non200Pages.length * 15 + canonicalMismatchPages.length * 5 + missingViewportPages.length * 5) / total;
  const techScore = Math.max(0, Math.min(100, Math.round(100 - techPenalty * 20)));

  // Content (25): H1 missing (10), multi H1 (4), thin content (6), missing alts (5)
  const contentPenalty = (missingH1Pages.length * 10 + multipleH1Pages.length * 4 + thinContentPages.length * 6 + missingAltPages.length * 5) / total;
  const contentScore = Math.max(0, Math.min(100, Math.round(100 - contentPenalty * 15)));

  // Metadata (25): Missing title (15), missing desc (8), length issues (4)
  const metaPenalty = (missingTitlePages.length * 15 + missingDescPages.length * 8 + (longTitlePages.length + shortTitlePages.length) * 4) / total;
  const metaScore = Math.max(0, Math.min(100, Math.round(100 - metaPenalty * 15)));

  // Social & Schema (25): Missing JSON-LD (12), Missing OG (8)
  const socialPenalty = (missingJsonLdPages.length * 12 + missingOgPages.length * 8) / total;
  const socialScore = Math.max(0, Math.min(100, Math.round(100 - socialPenalty * 15)));

  // Overall Transparent Health Score = average of four category scores
  const healthScore = Math.round((techScore + contentScore + metaScore + socialScore) / 4);

  return {
    healthScore,
    techScore,
    contentScore,
    metaScore,
    socialScore,
    issues,
  };
}
