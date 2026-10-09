export type WebsitePlatform = 'duda' | 'wix' | 'shopify' | 'wordpress' | 'custom' | 'unknown';

export interface Website {
  id: string;
  userId: string;
  name: string;
  url: string;
  platform: WebsitePlatform;
  businessName: string;
  businessDescription: string;
  primaryServices: string;
  targetAudience: string;
  primaryCity: string;
  primaryRegion: string;
  country: string;
  primaryLanguage: string;
  sitemapUrl?: string;
  gscProperty?: string;
  status: 'active' | 'paused' | 'archived';
  notes?: string;
  lastAuditDate?: string;
  healthScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CrawledPage {
  id: string;
  websiteId: string;
  userId: string;
  url: string;
  path: string;
  statusCode: number;
  title: string;
  titleLength: number;
  metaDescription: string;
  metaLength: number;
  h1: string;
  h1Count: number;
  headings: { level: string; text: string }[];
  wordCount: number;
  isIndexable: boolean;
  canonicalUrl: string;
  isCanonicalMatch: boolean;
  hasOgTags: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  hasTwitterCards: boolean;
  hasJsonLd: boolean;
  jsonLdTypes: string[];
  missingAltImagesCount: number;
  totalImagesCount: number;
  internalLinksCount: number;
  externalLinksCount: number;
  hasViewport: boolean;
  htmlLang?: string;
  loadTimeMs?: number;
  issuesCount: number;
  lastCrawledAt: string;
}

export interface AuditRun {
  id: string;
  websiteId: string;
  userId: string;
  healthScore: number;
  techScore: number;
  contentScore: number;
  metaScore: number;
  socialScore: number;
  totalPages: number;
  criticalCount: number;
  warningCount: number;
  opportunityCount: number;
  passedCount: number;
  status: 'completed' | 'in_progress' | 'failed';
  createdAt: string;
}

export type IssueSeverity = 'critical' | 'warning' | 'opportunity' | 'passed';
export type IssueCategory = 'technical' | 'content' | 'metadata' | 'links' | 'social_schema' | 'performance';
export type IssueStatus = 'open' | 'in_progress' | 'applied' | 'verified' | 'ignored';

export interface AuditIssue {
  id: string;
  websiteId: string;
  auditRunId: string;
  userId: string;
  type: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  explanation: string;
  whyItMatters: string;
  recommendedAction: string;
  proposedCorrection?: string;
  priority: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  effort: 'quick' | 'moderate' | 'complex';
  status: IssueStatus;
  affectedPages: string[];
  affectedPagesCount: number;
  dataSource: string;
  createdAt: string;
}

export type SearchIntent = 'informational' | 'commercial' | 'transactional' | 'navigational';

export interface Keyword {
  id: string;
  websiteId: string;
  userId: string;
  term: string;
  searchVolume: number;
  competition: number; // 0 to 1
  cpc: number;
  intent: SearchIntent;
  opportunityScore: number;
  currentRank: number | null; // null if > 100 or unranked
  previousRank: number | null;
  bestRank: number | null;
  targetRank: number;
  isPrimary: boolean;
  assignedPageUrl?: string;
  assignedPageTitle?: string;
  location: string;
  language: string;
  device: 'desktop' | 'mobile';
  lastUpdated: string;
  statusLabel?: 'new' | 'improved' | 'declined' | 'lost' | 'steady';
}

export interface Competitor {
  id: string;
  websiteId: string;
  userId: string;
  domain: string;
  name: string;
  notes?: string;
  overlapScore: number; // percentage
  sharedKeywords: number;
  uniqueKeywords: number;
  topPagesCount: number;
  createdAt: string;
}

export interface SeoRecommendation {
  id: string;
  websiteId: string;
  userId: string;
  pageUrl: string;
  category: string;
  issue: string;
  currentValue: string;
  proposedValue: string;
  supportingData?: string;
  reason: string;
  expectedBenefit: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'quick' | 'moderate' | 'complex';
  source: 'Gemini AI Assistant' | 'DataForSEO Analysis' | 'Crawler Audit' | 'Manual Inspection';
  status: 'pending' | 'approved' | 'applied' | 'verified' | 'ignored';
  notes?: string;
  createdAt: string;
}

export type TaskStatus = 'backlog' | 'ready' | 'in_progress' | 'applied' | 'needs_verification' | 'completed' | 'ignored';

export interface SeoTask {
  id: string;
  websiteId: string;
  userId: string;
  pageUrl: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: TaskStatus;
  dueDate?: string;
  notes?: string;
  beforeValue?: string;
  proposedValue?: string;
  finalAppliedValue?: string;
  verificationResult?: string;
  completionDate?: string;
  createdAt: string;
}

export interface IntegrationSetting {
  provider: 'dataforseo' | 'google_search_console' | 'pagespeed_insights' | 'gemini' | 'semrush' | 'duda' | 'wix' | 'shopify' | 'wordpress';
  name: string;
  description: string;
  isConnected: boolean;
  statusMessage: string;
  lastTested?: string;
  lastSynced?: string;
  maskedIdentifier?: string;
  credentialType: string;
  isPublishingConnector?: boolean;
}

export interface UserSettings {
  userId: string;
  email: string;
  displayName: string;
  monthlySpendingLimit: number; // default $10.00
  emergencyKillswitch: boolean;
  allowPublicRegistration: boolean;
  currentMonthUsage: number;
  totalUsage: number;
}
