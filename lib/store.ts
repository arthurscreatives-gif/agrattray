import {
  Website,
  CrawledPage,
  AuditRun,
  AuditIssue,
  Keyword,
  Competitor,
  SeoRecommendation,
  SeoTask,
  IntegrationSetting,
  UserSettings,
  PageSpeedTestRun,
} from '@/types/seo';
import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';

// Initial default integrations state
export const DEFAULT_INTEGRATIONS: IntegrationSetting[] = [
  {
    provider: 'dataforseo',
    name: 'DataForSEO v3',
    description: 'Primary paid provider for live keyword volumes, SERP rankings, competition, and search intent.',
    isConnected: false,
    credentialType: 'API Login & API Password',
    statusMessage: 'Not connected. Free sandbox/demo fallback active.',
  },
  {
    provider: 'google_search_console',
    name: 'Google Search Console',
    description: 'Actual clicks, impressions, search queries, positions, landing pages, and indexing status directly from Google. 1st-party telemetry.',
    isConnected: false,
    credentialType: 'OAuth 2.0 (webmasters.readonly)',
    statusMessage: 'Ready to connect properties.',
  },
  {
    provider: 'pagespeed_insights',
    name: 'Google PageSpeed Insights',
    description: 'Mobile and desktop performance scores, Core Web Vitals (LCP, INP, CLS), and diagnostics.',
    isConnected: true,
    credentialType: 'Public Google API Service',
    statusMessage: 'Connected and ready for ad-hoc audits.',
  },
  {
    provider: 'gemini',
    name: 'Gemini SEO Intelligence',
    description: 'Generates optimized titles, meta descriptions, valid Schema JSON-LD, content briefs, and 30-day sprints.',
    isConnected: true,
    credentialType: 'Server-side Gemini Flash API',
    statusMessage: 'Connected and active via server proxy.',
  },
  {
    provider: 'semrush',
    name: 'Semrush',
    description: 'Supported SEO-data connector for competitor intelligence, keyword gaps, domain comparisons, and independent validation.',
    isConnected: true,
    isEnabled: true,
    defaultProviderPreference: 'dataforseo',
    credentialType: 'Personal Access Token / API Key',
    statusMessage: 'Token active in environment secrets (Staged for subscription start).',
  },
  {
    provider: 'duda',
    name: 'Duda Website Builder',
    description: 'Assisted SEO Publishing & Page Settings Hub for Arthur’s Creatives and Duda websites.',
    isConnected: true,
    credentialType: 'Assisted Publishing Mode (No API Key Required)',
    isPublishingConnector: true,
    statusMessage: 'Assisted Publishing Active: 1-Click Page SEO packs, validated Schema JSON-LD & live sitemaps.',
  },
  {
    provider: 'wix',
    name: 'Wix Platform',
    description: 'Publishing connector for automated on-page meta tags sync.',
    isConnected: false,
    credentialType: 'OAuth App',
    isPublishingConnector: true,
    statusMessage: 'Publishing connector planned (Phase 5).',
  },
  {
    provider: 'shopify',
    name: 'Shopify Storefront',
    description: 'Publishing connector for product, collection, and blog SEO tags.',
    isConnected: false,
    credentialType: 'Admin Access Token',
    isPublishingConnector: true,
    statusMessage: 'Publishing connector planned (Phase 5).',
  },
  {
    provider: 'wordpress',
    name: 'WordPress REST API',
    description: 'Publishing connector for Yoast/RankMath and core WordPress posts.',
    isConnected: false,
    credentialType: 'Application Passwords',
    isPublishingConnector: true,
    statusMessage: 'Publishing connector planned (Phase 5).',
  },
];

// Initial seeded website for Arthur Rattray
export const DEFAULT_WEBSITE: Website = {
  id: 'site_arthurs_creatives',
  userId: '',
  name: 'Arthur’s Creatives',
  url: 'https://www.arthurscreatives.com',
  platform: 'custom',
  businessName: 'Arthur’s Creatives',
  businessDescription: 'High-end web design, digital automation, and SEO agency founded by Arthur Rattray.',
  primaryServices: 'Web Design, Custom Web Applications, SEO Management, Digital Automation',
  targetAudience: 'Growing businesses, local Florida firms, and professional service companies',
  primaryCity: 'Tampa',
  primaryRegion: 'Florida',
  country: 'United States',
  primaryLanguage: 'English',
  sitemapUrl: 'https://www.arthurscreatives.com/sitemap.xml',
  status: 'active',
  notes: 'Primary agency flagship property. Target market: Tampa, Florida, United States.',
  healthScore: 84,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Firestore repository functions
export async function getWebsitesFromFirestore(userId: string): Promise<Website[]> {
  try {
    const colRef = collection(db, 'users', userId, 'websites');
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      // Seed default website
      const defaultSite = { ...DEFAULT_WEBSITE, userId };
      await setDoc(doc(db, 'users', userId, 'websites', defaultSite.id), defaultSite);
      return [defaultSite];
    }
    return snapshot.docs.map((d) => d.data() as Website);
  } catch (err) {
    console.warn('Firestore fetch websites fallback:', err);
    return [{ ...DEFAULT_WEBSITE, userId }];
  }
}

export async function saveWebsiteToFirestore(userId: string, website: Website): Promise<void> {
  const docRef = doc(db, 'users', userId, 'websites', website.id);
  await setDoc(docRef, { ...website, userId, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteWebsiteFromFirestore(userId: string, websiteId: string): Promise<void> {
  const docRef = doc(db, 'users', userId, 'websites', websiteId);
  await deleteDoc(docRef);
}

export async function getIssuesFromFirestore(userId: string, websiteId: string): Promise<AuditIssue[]> {
  try {
    const colRef = collection(db, 'users', userId, 'websites', websiteId, 'audit_issues');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => d.data() as AuditIssue);
  } catch {
    return [];
  }
}

export async function saveIssuesToFirestore(userId: string, websiteId: string, issues: AuditIssue[]): Promise<void> {
  for (const issue of issues) {
    const docRef = doc(db, 'users', userId, 'websites', websiteId, 'audit_issues', issue.id);
    await setDoc(docRef, { ...issue, userId, websiteId }, { merge: true });
  }
}

export async function updateIssueStatusInFirestore(
  userId: string,
  websiteId: string,
  issueId: string,
  status: AuditIssue['status']
): Promise<void> {
  const docRef = doc(db, 'users', userId, 'websites', websiteId, 'audit_issues', issueId);
  await updateDoc(docRef, { status });
}

export async function getKeywordsFromFirestore(userId: string, websiteId: string): Promise<Keyword[]> {
  try {
    const colRef = collection(db, 'users', userId, 'websites', websiteId, 'keywords');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => d.data() as Keyword);
  } catch {
    return [];
  }
}

export async function saveKeywordToFirestore(userId: string, websiteId: string, keyword: Keyword): Promise<void> {
  const docRef = doc(db, 'users', userId, 'websites', websiteId, 'keywords', keyword.id);
  await setDoc(docRef, { ...keyword, userId, websiteId }, { merge: true });
}

export async function deleteKeywordFromFirestore(userId: string, websiteId: string, keywordId: string): Promise<void> {
  const docRef = doc(db, 'users', userId, 'websites', websiteId, 'keywords', keywordId);
  await deleteDoc(docRef);
}

export async function getTasksFromFirestore(userId: string, websiteId: string): Promise<SeoTask[]> {
  try {
    const colRef = collection(db, 'users', userId, 'websites', websiteId, 'seo_tasks');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => d.data() as SeoTask);
  } catch {
    return [];
  }
}

export async function saveTaskToFirestore(userId: string, websiteId: string, task: SeoTask): Promise<void> {
  const docRef = doc(db, 'users', userId, 'websites', websiteId, 'seo_tasks', task.id);
  await setDoc(docRef, { ...task, userId, websiteId }, { merge: true });
}

export async function deleteTaskFromFirestore(userId: string, websiteId: string, taskId: string): Promise<void> {
  const docRef = doc(db, 'users', userId, 'websites', websiteId, 'seo_tasks', taskId);
  await deleteDoc(docRef);
}

export async function getRecommendationsFromFirestore(userId: string, websiteId: string): Promise<SeoRecommendation[]> {
  try {
    const colRef = collection(db, 'users', userId, 'websites', websiteId, 'recommendations');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => d.data() as SeoRecommendation);
  } catch {
    return [];
  }
}

export async function saveRecommendationToFirestore(
  userId: string,
  websiteId: string,
  rec: SeoRecommendation
): Promise<void> {
  const docRef = doc(db, 'users', userId, 'websites', websiteId, 'recommendations', rec.id);
  await setDoc(docRef, { ...rec, userId, websiteId }, { merge: true });
}

export async function getPageSpeedTestsFromFirestore(
  userId: string,
  websiteId: string
): Promise<PageSpeedTestRun[]> {
  try {
    const colRef = collection(db, 'users', userId, 'websites', websiteId, 'pagespeed_tests');
    const snapshot = await getDocs(colRef);
    const tests = snapshot.docs.map((d) => d.data() as PageSpeedTestRun);
    return tests.sort((a, b) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime());
  } catch (err) {
    console.warn('Firestore fetch pagespeed tests fallback:', err);
    return [];
  }
}

export async function savePageSpeedTestToFirestore(
  userId: string,
  websiteId: string,
  test: PageSpeedTestRun
): Promise<void> {
  const docRef = doc(db, 'users', userId, 'websites', websiteId, 'pagespeed_tests', test.id);
  await setDoc(docRef, { ...test, userId, websiteId }, { merge: true });
}

export async function deletePageSpeedTestFromFirestore(
  userId: string,
  websiteId: string,
  testId: string
): Promise<void> {
  const docRef = doc(db, 'users', userId, 'websites', websiteId, 'pagespeed_tests', testId);
  await deleteDoc(docRef);
}

