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
    description: 'Read-only verified clicks, impressions, CTR, average position, and indexing status.',
    isConnected: false,
    credentialType: 'OAuth 2.0 or Service Account',
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
    description: 'Secondary optional provider for keyword volume comparison and backlink overview.',
    isConnected: false,
    credentialType: 'API Key (Enterprise/Business account)',
    statusMessage: 'Optional provider. DataForSEO is default.',
  },
  {
    provider: 'duda',
    name: 'Duda Website Builder',
    description: 'Publishing connector for reading and updating page SEO fields directly.',
    isConnected: false,
    credentialType: 'Partner API Keys',
    isPublishingConnector: true,
    statusMessage: 'Publishing connector planned (Phase 5). Direct manual copy-apply supported.',
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
  url: 'https://arthurscreatives.com',
  platform: 'custom',
  businessName: 'Arthur’s Creatives',
  businessDescription: 'High-end web design, digital automation, and SEO agency founded by Arthur Rattray.',
  primaryServices: 'Web Design, Custom Web Applications, SEO Management, Digital Automation',
  targetAudience: 'Growing businesses, professional service firms, and creative agencies',
  primaryCity: 'Los Angeles',
  primaryRegion: 'California',
  country: 'United States',
  primaryLanguage: 'English',
  sitemapUrl: 'https://arthurscreatives.com/sitemap.xml',
  status: 'active',
  notes: 'Primary agency flagship property.',
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
