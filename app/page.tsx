'use client';

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import AuthScreen from '@/components/AuthScreen';
import Navbar, { NavTab } from '@/components/Navbar';
import FirstUseChecklist from '@/components/FirstUseChecklist';

// Views
import DashboardView from '@/components/views/DashboardView';
import WebsitesView from '@/components/views/WebsitesView';
import SiteAuditView from '@/components/views/SiteAuditView';
import KeywordsView from '@/components/views/KeywordsView';
import RankingsView from '@/components/views/RankingsView';
import CompetitorsView from '@/components/views/CompetitorsView';
import SearchConsoleView from '@/components/views/SearchConsoleView';
import RecommendationsView from '@/components/views/RecommendationsView';
import SeoTasksView from '@/components/views/SeoTasksView';
import ReportsView from '@/components/views/ReportsView';
import IntegrationsView from '@/components/views/IntegrationsView';
import SettingsView from '@/components/views/SettingsView';

import {
  Website,
  AuditRun,
  AuditIssue,
  Keyword,
  Competitor,
  SeoRecommendation,
  SeoTask,
  IntegrationSetting,
  CrawledPage,
} from '@/types/seo';
import {
  DEFAULT_INTEGRATIONS,
  DEFAULT_WEBSITE,
  getWebsitesFromFirestore,
  saveWebsiteToFirestore,
  deleteWebsiteFromFirestore,
  getIssuesFromFirestore,
  saveIssuesToFirestore,
  updateIssueStatusInFirestore,
  getKeywordsFromFirestore,
  saveKeywordToFirestore,
  deleteKeywordFromFirestore,
  getTasksFromFirestore,
  saveTaskToFirestore,
  deleteTaskFromFirestore,
  getRecommendationsFromFirestore,
  saveRecommendationToFirestore,
} from '@/lib/store';
import { Loader2, Shield } from 'lucide-react';

function CommandCenterApp() {
  const { user, loading } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [websites, setWebsites] = useState<Website[]>([]);
  const [activeWebsiteId, setActiveWebsiteId] = useState<string>('');
  const [auditRuns, setAuditRuns] = useState<AuditRun[]>([]);
  const [auditIssues, setAuditIssues] = useState<AuditIssue[]>([]);
  const [crawledPages, setCrawledPages] = useState<CrawledPage[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [recommendations, setRecommendations] = useState<SeoRecommendation[]>([]);
  const [tasks, setTasks] = useState<SeoTask[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationSetting[]>(DEFAULT_INTEGRATIONS);

  // Cost controls
  const [monthlySpent, setMonthlySpent] = useState<number>(0.04);
  const [monthlyLimit, setMonthlyLimit] = useState<number>(10.0);
  const [emergencyKillswitch, setEmergencyKillswitch] = useState<boolean>(false);

  // Crawler status
  const [crawling, setCrawling] = useState<boolean>(false);
  const [initLoading, setInitLoading] = useState<boolean>(true);

  // Load user data on authentication
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    async function loadData() {
      try {
        const userWebsites = await getWebsitesFromFirestore(user!.uid);
        if (isMounted) {
          setWebsites(userWebsites);
          const initialSiteId = userWebsites[0]?.id || DEFAULT_WEBSITE.id;
          setActiveWebsiteId(initialSiteId);

          // Load website subcollections
          const siteIssues = await getIssuesFromFirestore(user!.uid, initialSiteId);
          const siteKeywords = await getKeywordsFromFirestore(user!.uid, initialSiteId);
          const siteTasks = await getTasksFromFirestore(user!.uid, initialSiteId);
          const siteRecs = await getRecommendationsFromFirestore(user!.uid, initialSiteId);

          setAuditIssues(siteIssues.length > 0 ? siteIssues : getSeedIssues(initialSiteId, user!.uid));
          setKeywords(siteKeywords.length > 0 ? siteKeywords : getSeedKeywords(initialSiteId, user!.uid));
          setTasks(siteTasks.length > 0 ? siteTasks : getSeedTasks(initialSiteId, user!.uid));
          setRecommendations(siteRecs.length > 0 ? siteRecs : getSeedRecs(initialSiteId, user!.uid));
          setCompetitors(getSeedCompetitors(initialSiteId, user!.uid));
        }
      } catch (err) {
        console.warn('Initial data load error:', err);
      } finally {
        if (isMounted) setInitLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Active website record
  const activeWebsite = websites.find((w) => w.id === activeWebsiteId) || websites[0] || {
    ...DEFAULT_WEBSITE,
    userId: user?.uid || '',
  };

  // Switch website subcollections
  const handleSelectWebsite = async (id: string) => {
    setActiveWebsiteId(id);
    if (!user) return;
    try {
      const siteIssues = await getIssuesFromFirestore(user.uid, id);
      const siteKeywords = await getKeywordsFromFirestore(user.uid, id);
      const siteTasks = await getTasksFromFirestore(user.uid, id);
      const siteRecs = await getRecommendationsFromFirestore(user.uid, id);

      if (siteIssues.length > 0) setAuditIssues(siteIssues);
      if (siteKeywords.length > 0) setKeywords(siteKeywords);
      if (siteTasks.length > 0) setTasks(siteTasks);
      if (siteRecs.length > 0) setRecommendations(siteRecs);
    } catch {
      // Ignore
    }
  };

  // Save Website handler
  const handleSaveWebsite = async (website: Website) => {
    if (!user) return;
    await saveWebsiteToFirestore(user.uid, website);
    setWebsites((prev) => {
      const exists = prev.some((w) => w.id === website.id);
      if (exists) return prev.map((w) => (w.id === website.id ? website : w));
      return [...prev, website];
    });
    setActiveWebsiteId(website.id);
  };

  // Delete Website handler
  const handleDeleteWebsite = async (websiteId: string) => {
    if (!user || websites.length <= 1) return;
    await deleteWebsiteFromFirestore(user.uid, websiteId);
    setWebsites((prev) => prev.filter((w) => w.id !== websiteId));
    setActiveWebsiteId(websites[0].id);
  };

  // Live Crawler Execution
  const handleStartCrawl = async (targetSite: Website, maxPages: number) => {
    setCrawling(true);
    try {
      const res = await fetch('/api/crawler/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetSite.url,
          maxPages,
          websiteId: targetSite.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCrawledPages(data.pages || []);
        setAuditRuns((prev) => [data.auditRun, ...prev]);

        // Attach user ID
        const enrichedIssues = (data.issues || []).map((iss: any) => ({
          ...iss,
          userId: user?.uid || '',
          websiteId: targetSite.id,
        }));
        setAuditIssues(enrichedIssues);

        // Update website health score
        const updatedSite = { ...targetSite, healthScore: data.auditRun.healthScore };
        await handleSaveWebsite(updatedSite);

        // Persist issues
        if (user) {
          await saveIssuesToFirestore(user.uid, targetSite.id, enrichedIssues);
        }
      } else {
        alert(data.error || 'Crawl failed to complete');
      }
    } catch (err: any) {
      alert(`Error running crawler: ${err.message}`);
    } finally {
      setCrawling(false);
    }
  };

  // Issue Status update
  const handleUpdateIssueStatus = async (issueId: string, status: AuditIssue['status']) => {
    setAuditIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, status } : i)));
    if (user) {
      await updateIssueStatusInFirestore(user.uid, activeWebsite.id, issueId, status);
    }
  };

  // Create Task From Issue
  const handleCreateTaskFromIssue = async (issue: AuditIssue) => {
    const newTask: SeoTask = {
      id: `task_${Date.now()}`,
      websiteId: activeWebsite.id,
      userId: user?.uid || '',
      title: `Fix: ${issue.title}`,
      description: issue.recommendedAction,
      pageUrl: issue.affectedPages?.[0] || activeWebsite.url,
      category: issue.category,
      priority: issue.priority,
      status: 'ready',
      proposedValue: issue.proposedCorrection,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
    if (user) {
      await saveTaskToFirestore(user.uid, activeWebsite.id, newTask);
    }
    setCurrentTab('tasks');
  };

  // Create Task From Recommendation
  const handleCreateTaskFromRec = async (rec: SeoRecommendation) => {
    const newTask: SeoTask = {
      id: `task_${Date.now()}`,
      websiteId: activeWebsite.id,
      userId: user?.uid || '',
      title: `Apply: ${rec.category} on ${new URL(rec.pageUrl).pathname}`,
      description: rec.reason,
      pageUrl: rec.pageUrl,
      category: rec.category,
      priority: rec.priority,
      status: 'ready',
      proposedValue: rec.proposedValue,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
    if (user) {
      await saveTaskToFirestore(user.uid, activeWebsite.id, newTask);
    }
    setCurrentTab('tasks');
  };

  // Keyword operations
  const handleSaveTrackedKeyword = async (kw: Keyword) => {
    setKeywords((prev) => {
      const exists = prev.some((k) => k.id === kw.id || k.term.toLowerCase() === kw.term.toLowerCase());
      if (exists) return prev.map((k) => (k.id === kw.id || k.term.toLowerCase() === kw.term.toLowerCase() ? kw : k));
      return [...prev, kw];
    });
    if (user) {
      await saveKeywordToFirestore(user.uid, activeWebsite.id, kw);
    }
  };

  const handleDeleteTrackedKeyword = async (id: string) => {
    setKeywords((prev) => prev.filter((k) => k.id !== id));
    if (user) {
      await deleteKeywordFromFirestore(user.uid, activeWebsite.id, id);
    }
  };

  const handleUpdateKeywords = async (updated: Keyword[]) => {
    setKeywords((prev) => {
      const map = new Map(updated.map((u) => [u.id, u]));
      return prev.map((k) => (map.has(k.id) ? map.get(k.id)! : k));
    });
    if (user) {
      for (const kw of updated) {
        await saveKeywordToFirestore(user.uid, activeWebsite.id, kw);
      }
    }
  };

  // Task operations
  const handleSaveTask = async (task: SeoTask) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === task.id);
      if (exists) return prev.map((t) => (t.id === task.id ? task : t));
      return [task, ...prev];
    });
    if (user) {
      await saveTaskToFirestore(user.uid, activeWebsite.id, task);
    }
  };

  const handleDeleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (user) {
      await deleteTaskFromFirestore(user.uid, activeWebsite.id, id);
    }
  };

  // Competitor operations
  const handleAddCompetitor = async (comp: Competitor) => {
    setCompetitors((prev) => [...prev, comp]);
  };

  const handleDeleteCompetitor = async (id: string) => {
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
  };

  // Recommendation operations
  const handleSaveRecommendation = async (rec: SeoRecommendation) => {
    setRecommendations((prev) => {
      const exists = prev.some((r) => r.id === rec.id);
      if (exists) return prev.map((r) => (r.id === rec.id ? rec : r));
      return [rec, ...prev];
    });
    if (user) {
      await saveRecommendationToFirestore(user.uid, activeWebsite.id, rec);
    }
  };

  // Integration updates
  const handleUpdateIntegration = (provider: string, updates: Partial<IntegrationSetting>) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.provider === provider ? { ...i, ...updates } : i))
    );
  };

  if (loading || (user && initLoading)) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4 animate-pulse">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Verifying private command center credentials...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const dataForSeoConn = integrations.find((i) => i.provider === 'dataforseo')?.isConnected || false;
  const gscConn = integrations.find((i) => i.provider === 'google_search_console')?.isConnected || true;

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col">
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        websites={websites}
        activeWebsiteId={activeWebsite.id}
        onSelectWebsite={handleSelectWebsite}
        onOpenAddWebsite={() => setCurrentTab('websites')}
        monthlySpent={monthlySpent}
        monthlyLimit={monthlyLimit}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* First Use 10-Step Checklist */}
        <FirstUseChecklist
          onNavigate={setCurrentTab}
          websitesCount={websites.length}
          auditsCount={auditRuns.length}
          keywordsCount={keywords.length}
          recommendationsCount={recommendations.length}
          tasksCount={tasks.length}
          dataForSeoConnected={dataForSeoConn}
          gscConnected={gscConn}
        />

        {/* View Router */}
        {currentTab === 'dashboard' && (
          <DashboardView
            websites={websites}
            activeWebsite={activeWebsite}
            auditRuns={auditRuns}
            auditIssues={auditIssues}
            keywords={keywords}
            tasks={tasks}
            integrations={integrations}
            onNavigate={setCurrentTab}
            monthlySpent={monthlySpent}
            monthlyLimit={monthlyLimit}
          />
        )}

        {currentTab === 'websites' && (
          <WebsitesView
            websites={websites}
            activeWebsiteId={activeWebsite.id}
            onSelectWebsite={handleSelectWebsite}
            onSaveWebsite={handleSaveWebsite}
            onDeleteWebsite={handleDeleteWebsite}
            onRunAudit={(site) => {
              handleSelectWebsite(site.id);
              setCurrentTab('audit');
            }}
          />
        )}

        {currentTab === 'audit' && (
          <SiteAuditView
            activeWebsite={activeWebsite}
            auditRuns={auditRuns}
            auditIssues={auditIssues}
            crawledPages={crawledPages}
            onStartCrawl={handleStartCrawl}
            onUpdateIssueStatus={handleUpdateIssueStatus}
            onCreateTaskFromIssue={handleCreateTaskFromIssue}
            onAskGemini={(issue) => {
              setCurrentTab('recommendations');
            }}
            crawling={crawling}
          />
        )}

        {currentTab === 'keywords' && (
          <KeywordsView
            activeWebsite={activeWebsite}
            trackedKeywords={keywords}
            crawledPages={crawledPages}
            onSaveTrackedKeyword={handleSaveTrackedKeyword}
            onDeleteTrackedKeyword={handleDeleteTrackedKeyword}
            monthlySpent={monthlySpent}
            monthlyLimit={monthlyLimit}
            emergencyKillswitch={emergencyKillswitch}
          />
        )}

        {currentTab === 'rankings' && (
          <RankingsView
            activeWebsite={activeWebsite}
            trackedKeywords={keywords}
            onUpdateKeywords={handleUpdateKeywords}
            monthlySpent={monthlySpent}
            monthlyLimit={monthlyLimit}
            emergencyKillswitch={emergencyKillswitch}
          />
        )}

        {currentTab === 'competitors' && (
          <CompetitorsView
            activeWebsite={activeWebsite}
            competitors={competitors}
            onAddCompetitor={handleAddCompetitor}
            onDeleteCompetitor={handleDeleteCompetitor}
          />
        )}

        {currentTab === 'gsc' && (
          <SearchConsoleView
            activeWebsite={activeWebsite}
            gscConnected={gscConn}
            onConnectGsc={() => {}}
          />
        )}

        {currentTab === 'recommendations' && (
          <RecommendationsView
            activeWebsite={activeWebsite}
            recommendations={recommendations}
            crawledPages={crawledPages}
            onSaveRecommendation={handleSaveRecommendation}
            onCreateTaskFromRecommendation={handleCreateTaskFromRec}
          />
        )}

        {currentTab === 'tasks' && (
          <SeoTasksView
            activeWebsite={activeWebsite}
            tasks={tasks}
            onSaveTask={handleSaveTask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView
            activeWebsite={activeWebsite}
            auditRuns={auditRuns}
            auditIssues={auditIssues}
            keywords={keywords}
            tasks={tasks}
            monthlySpent={monthlySpent}
            monthlyLimit={monthlyLimit}
          />
        )}

        {currentTab === 'integrations' && (
          <IntegrationsView
            integrations={integrations}
            onUpdateIntegration={handleUpdateIntegration}
            monthlySpent={monthlySpent}
            monthlyLimit={monthlyLimit}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            monthlyLimit={monthlyLimit}
            onUpdateMonthlyLimit={setMonthlyLimit}
            emergencyKillswitch={emergencyKillswitch}
            onToggleKillswitch={setEmergencyKillswitch}
            monthlySpent={monthlySpent}
          />
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <CommandCenterApp />
    </AuthProvider>
  );
}

// Helper Seed Generators for Initial Experience
function getSeedIssues(websiteId: string, userId: string): AuditIssue[] {
  return [
    {
      id: 'iss_seed_1',
      websiteId,
      auditRunId: 'run_init',
      userId,
      type: 'missing_json_ld',
      category: 'social_schema',
      severity: 'opportunity',
      title: 'Missing Schema.org JSON-LD Structured Data',
      explanation: 'Homepage and key service pages lack structured LocalBusiness or Service schema markup.',
      whyItMatters: 'Schema markup enables rich search results (stars, business hours, FAQ accordion snippets) and establishes semantic entity clarity in Google Knowledge Graph.',
      recommendedAction: 'Embed valid LocalBusiness and Service JSON-LD script tags inside your site header.',
      proposedCorrection: '<script type="application/ld+json">{\n  "@context": "https://schema.org",\n  "@type": "LocalBusiness",\n  "name": "Arthur’s Creatives",\n  "url": "https://arthurscreatives.com",\n  "description": "Premium web design and SEO automation"\n}</script>',
      priority: 'medium',
      impact: 'medium',
      effort: 'quick',
      status: 'open',
      affectedPages: ['https://arthurscreatives.com'],
      affectedPagesCount: 1,
      dataSource: 'Arthur Public Crawler',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'iss_seed_2',
      websiteId,
      auditRunId: 'run_init',
      userId,
      type: 'missing_image_alts',
      category: 'content',
      severity: 'warning',
      title: 'Images Missing Alt Text (3 images)',
      explanation: 'Three high-visibility portfolio images do not include descriptive alt attributes.',
      whyItMatters: 'Alt text improves accessibility compliance (WCAG 2.1) and allows images to index in Google Image Search.',
      recommendedAction: 'Add clear, context-specific alt attributes to portfolio images.',
      proposedCorrection: '<img src="/portfolio-1.webp" alt="Arthur\'s Creatives custom web application interface mockup" />',
      priority: 'medium',
      impact: 'medium',
      effort: 'quick',
      status: 'open',
      affectedPages: ['https://arthurscreatives.com/work'],
      affectedPagesCount: 1,
      dataSource: 'Arthur Public Crawler',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'iss_seed_3',
      websiteId,
      auditRunId: 'run_init',
      userId,
      type: 'title_length_optimization',
      category: 'metadata',
      severity: 'opportunity',
      title: 'Page Title Length Needs Refinement',
      explanation: 'Title on /services is currently 24 characters, missing primary keyword and regional targeting.',
      whyItMatters: 'Titles under 30 characters leave valuable search visibility on the table. Optimal length is 50 to 60 characters.',
      recommendedAction: 'Expand title to 55 characters combining primary service and brand authority.',
      proposedCorrection: '<title>Web Design & SEO Services | Arthur’s Creatives</title>',
      priority: 'high',
      impact: 'high',
      effort: 'quick',
      status: 'open',
      affectedPages: ['https://arthurscreatives.com/services'],
      affectedPagesCount: 1,
      dataSource: 'Arthur Public Crawler',
      createdAt: new Date().toISOString(),
    },
  ];
}

function getSeedKeywords(websiteId: string, userId: string): Keyword[] {
  return [
    {
      id: 'kw_seed_1',
      websiteId,
      userId,
      term: 'web design agency los angeles',
      searchVolume: 5400,
      competition: 0.48,
      cpc: 8.50,
      intent: 'commercial',
      opportunityScore: 88,
      currentRank: 3,
      previousRank: 5,
      bestRank: 3,
      targetRank: 1,
      isPrimary: true,
      assignedPageUrl: 'https://arthurscreatives.com',
      location: 'United States',
      language: 'English',
      device: 'desktop',
      statusLabel: 'improved',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'kw_seed_2',
      websiteId,
      userId,
      term: 'custom business automation web',
      searchVolume: 2400,
      competition: 0.32,
      cpc: 6.20,
      intent: 'commercial',
      opportunityScore: 92,
      currentRank: 2,
      previousRank: 2,
      bestRank: 2,
      targetRank: 1,
      isPrimary: true,
      assignedPageUrl: 'https://arthurscreatives.com/services',
      location: 'United States',
      language: 'English',
      device: 'desktop',
      statusLabel: 'steady',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'kw_seed_3',
      websiteId,
      userId,
      term: 'seo management services ca',
      searchVolume: 1800,
      competition: 0.55,
      cpc: 11.20,
      intent: 'transactional',
      opportunityScore: 79,
      currentRank: 7,
      previousRank: 9,
      bestRank: 6,
      targetRank: 3,
      isPrimary: false,
      assignedPageUrl: 'https://arthurscreatives.com/services',
      location: 'United States',
      language: 'English',
      device: 'desktop',
      statusLabel: 'improved',
      lastUpdated: new Date().toISOString(),
    },
  ];
}

function getSeedTasks(websiteId: string, userId: string): SeoTask[] {
  return [
    {
      id: 'task_seed_1',
      websiteId,
      userId,
      title: 'Deploy LocalBusiness JSON-LD on Homepage',
      description: 'Implement valid Schema.org script tag inside <head> with Arthur’s Creatives address and service definitions.',
      pageUrl: 'https://arthurscreatives.com',
      category: 'Structured Data',
      priority: 'high',
      status: 'ready',
      proposedValue: '<script type="application/ld+json">{\n  "@context": "https://schema.org",\n  "@type": "LocalBusiness",\n  "name": "Arthur’s Creatives"\n}</script>',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task_seed_2',
      websiteId,
      userId,
      title: 'Optimize /services Page Title to 55 Characters',
      description: 'Replace short 24-character title with "Web Design & SEO Services | Arthur’s Creatives".',
      pageUrl: 'https://arthurscreatives.com/services',
      category: 'Metadata Optimization',
      priority: 'high',
      status: 'in_progress',
      beforeValue: '<title>Our Services</title>',
      proposedValue: '<title>Web Design & SEO Services | Arthur’s Creatives</title>',
      createdAt: new Date().toISOString(),
    },
  ];
}

function getSeedRecs(websiteId: string, userId: string): SeoRecommendation[] {
  return [
    {
      id: 'rec_seed_1',
      websiteId,
      userId,
      pageUrl: 'https://arthurscreatives.com/services',
      category: 'Metadata Refinement',
      issue: 'Services page meta description is missing commercial call-to-action',
      currentValue: 'We build websites and digital solutions.',
      proposedValue: '<meta name="description" content="Scale your business with high-conversion web design, SEO management, and custom digital automation by Arthur’s Creatives. Request a consultation." />',
      reason: 'Increases organic click-through rate by presenting a clear client benefit and action trigger.',
      expectedBenefit: '+18% CTR improvement in Google SERP snippets',
      priority: 'high',
      effort: 'quick',
      source: 'Gemini AI Assistant',
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  ];
}

function getSeedCompetitors(websiteId: string, userId: string): Competitor[] {
  return [
    {
      id: 'comp_seed_1',
      websiteId,
      userId,
      domain: 'vanguarddigital.com',
      name: 'Vanguard Digital Agency',
      notes: 'Competes for Los Angeles web design & enterprise development.',
      overlapScore: 38,
      sharedKeywords: 42,
      uniqueKeywords: 110,
      topPagesCount: 18,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'comp_seed_2',
      websiteId,
      userId,
      domain: 'peakcreative.co',
      name: 'Peak Creative Studio',
      notes: 'Ranks on Page 1 for local brand identity and Webflow development.',
      overlapScore: 29,
      sharedKeywords: 26,
      uniqueKeywords: 84,
      topPagesCount: 12,
      createdAt: new Date().toISOString(),
    },
  ];
}
