'use client';

import React, { useState, useEffect } from 'react';
import { Website, PageSpeedTestRun, PageSpeedScores, PageSpeedMetrics, SeoTask } from '@/types/seo';
import { useAuth } from '@/lib/auth-context';
import {
  getPageSpeedTestsFromFirestore,
  savePageSpeedTestToFirestore,
  deletePageSpeedTestFromFirestore,
  saveTaskToFirestore,
} from '@/lib/store';
import {
  Gauge,
  Smartphone,
  Monitor,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowUpRight,
  Zap,
  ShieldCheck,
  History,
  Sparkles,
  Trash2,
  ExternalLink,
  ChevronRight,
  Activity,
  Layers,
  Sliders,
  Copy,
  Check,
  Globe,
} from 'lucide-react';

interface PageSpeedInsightsViewProps {
  website: Website;
  onNavigateToTasks?: () => void;
}

function generateTestId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${new Date().getTime()}`;
}

export default function PageSpeedInsightsView({
  website,
  onNavigateToTasks,
}: PageSpeedInsightsViewProps) {
  const { user } = useAuth();

  // Test target state
  const [selectedUrl, setSelectedUrl] = useState<string>(website.url);
  const [selectedLabel, setSelectedLabel] = useState<string>('Home Page');
  const [strategy, setStrategy] = useState<'mobile' | 'desktop'>('mobile');
  const [runBoth, setRunBoth] = useState<boolean>(false);

  // Execution state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Active results
  const [activeTest, setActiveTest] = useState<PageSpeedTestRun | null>(null);
  const [comparisonTest, setComparisonTest] = useState<PageSpeedTestRun | null>(null);

  // Historical test runs
  const [historyRuns, setHistoryRuns] = useState<PageSpeedTestRun[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'opportunities' | 'diagnostics' | 'history'>('overview');

  // Task creation feedback
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Pre-configured key landing pages for the website
  const baseOrigin = (() => {
    try {
      return new URL(website.url).origin;
    } catch {
      return 'https://www.arthurscreatives.com';
    }
  })();

  const keyLandingPages = [
    { label: 'Home Page', url: `${baseOrigin}/`, isPrimary: true },
    { label: 'Services & Web Design', url: `${baseOrigin}/services`, isPrimary: false },
    { label: 'Portfolio & Work', url: `${baseOrigin}/portfolio`, isPrimary: false },
    { label: 'About Agency', url: `${baseOrigin}/about`, isPrimary: false },
    { label: 'Contact & Intake', url: `${baseOrigin}/contact`, isPrimary: false },
  ];

  // Load historical tests from Firestore
  useEffect(() => {
    async function loadHistory() {
      if (!user || !website.id) return;
      try {
        const tests = await getPageSpeedTestsFromFirestore(user.uid, website.id);
        setHistoryRuns(tests);
        if (tests.length > 0) {
          setActiveTest((prev) => prev ?? tests[0]);
        }
      } catch (err) {
        console.error('Failed to load PageSpeed history:', err);
      }
    }
    loadHistory();
  }, [user, website.id]);

  // Execute PageSpeed Test
  const handleRunTest = async (overrideStrategy?: 'mobile' | 'desktop') => {
    const targetStrategy = overrideStrategy || strategy;
    setIsLoading(true);
    setError(null);
    setLoadingStep(`Connecting to Google PageSpeed Insights for ${targetStrategy}...`);

    try {
      if (runBoth && !overrideStrategy) {
        // Run mobile first, then desktop
        setLoadingStep('Testing Mobile device performance with Google Lighthouse...');
        const mobileRes = await executePageSpeedApi(selectedUrl, 'mobile');

        setLoadingStep('Testing Desktop device performance with Google Lighthouse...');
        const desktopRes = await executePageSpeedApi(selectedUrl, 'desktop');

        if (mobileRes && desktopRes) {
          await persistTest(mobileRes, `${selectedLabel} (Mobile)`);
          await persistTest(desktopRes, `${selectedLabel} (Desktop)`);
          setActiveTest(mobileRes);
          setComparisonTest(desktopRes);
        }
      } else {
        setLoadingStep(`Running Google Lighthouse audit (${targetStrategy})...`);
        const result = await executePageSpeedApi(selectedUrl, targetStrategy);
        if (result) {
          await persistTest(result, selectedLabel);
          setActiveTest(result);
          setComparisonTest(null);
        }
      }
    } catch (err: any) {
      setError(err.message || 'PageSpeed test encountered an unexpected issue.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const executePageSpeedApi = async (url: string, strat: 'mobile' | 'desktop'): Promise<PageSpeedTestRun | null> => {
    const res = await fetch('/api/pagespeed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, strategy: strat }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Failed to test ${strat} performance`);
    }

    const testRun: PageSpeedTestRun = {
      id: generateTestId('ps'),
      websiteId: website.id,
      userId: user?.uid || 'guest',
      url: data.url,
      pageLabel: selectedLabel,
      strategy: strat,
      scores: data.scores,
      metrics: data.metrics,
      opportunities: data.opportunities || [],
      diagnostics: data.diagnostics || [],
      coreWebVitalsStatus: data.coreWebVitalsStatus || 'passed',
      fetchedAt: data.fetchedAt || new Date().toISOString(),
      provider: data.provider || 'Google PageSpeed Insights API',
    };

    return testRun;
  };

  const persistTest = async (testRun: PageSpeedTestRun, label: string) => {
    testRun.pageLabel = label;
    setHistoryRuns((prev) => [testRun, ...prev]);

    if (user && website.id) {
      try {
        await savePageSpeedTestToFirestore(user.uid, website.id, testRun);
      } catch (err) {
        console.warn('Failed to save PageSpeed test to Firestore:', err);
      }
    }
  };

  const handleDeleteHistory = async (testId: string) => {
    if (!user || !website.id) return;
    setHistoryRuns((prev) => prev.filter((t) => t.id !== testId));
    if (activeTest?.id === testId) {
      setActiveTest(historyRuns.find((t) => t.id !== testId) || null);
    }
    try {
      await deletePageSpeedTestFromFirestore(user.uid, website.id, testId);
    } catch (err) {
      console.warn('Failed to delete PageSpeed test:', err);
    }
  };

  // Convert an Opportunity into an actionable SEO Task
  const handleCreateTaskFromOpportunity = async (opp: { title: string; description: string; displayValue?: string }) => {
    if (!user || !website.id) return;

    const newTask: SeoTask = {
      id: generateTestId('task_perf'),
      websiteId: website.id,
      userId: user.uid,
      title: `Optimize: ${opp.title}`,
      description: `${opp.description} (Target: ${selectedUrl}). ${opp.displayValue ? `Estimated impact: ${opp.displayValue}` : ''}`,
      category: 'technical',
      priority: 'high',
      status: 'ready',
      pageUrl: selectedUrl,
      notes: `Generated from Google PageSpeed Insights audit. ${opp.displayValue ? `Impact: ${opp.displayValue}` : ''}`,
      createdAt: new Date().toISOString(),
    };

    try {
      await saveTaskToFirestore(user.uid, website.id, newTask);
      setCreatedTaskId(opp.title);
      setTimeout(() => setCreatedTaskId(null), 3000);
    } catch (err) {
      console.error('Failed to create SEO task:', err);
    }
  };

  // Copy shareable summary
  const handleCopySummary = () => {
    if (!activeTest) return;
    const summary = `
=== Google PageSpeed Insights Report ===
URL: ${activeTest.url}
Device: ${activeTest.strategy.toUpperCase()}
Audit Date: ${new Date(activeTest.fetchedAt).toLocaleString()}
Core Web Vitals Status: ${activeTest.coreWebVitalsStatus?.toUpperCase()}

Lighthouse Scores:
- Performance: ${activeTest.scores.performance}/100
- Accessibility: ${activeTest.scores.accessibility}/100
- Best Practices: ${activeTest.scores.bestPractices}/100
- SEO: ${activeTest.scores.seo}/100

Core Web Vitals:
- LCP (Largest Contentful Paint): ${activeTest.metrics.lcp}
- FID/INP: ${activeTest.metrics.inp}
- CLS (Cumulative Layout Shift): ${activeTest.metrics.cls}
- FCP (First Contentful Paint): ${activeTest.metrics.fcp}
- TBT (Total Blocking Time): ${activeTest.metrics.tbt}
- Speed Index: ${activeTest.metrics.speedIndex}

Top Opportunities:
${activeTest.opportunities?.map((o) => `• ${o.title}: ${o.displayValue || ''}`).slice(0, 5).join('\n') || 'None'}
    `.trim();

    navigator.clipboard.writeText(summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 90) return { ring: 'text-emerald-400 stroke-emerald-400', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', text: 'text-emerald-400' };
    if (score >= 50) return { ring: 'text-amber-400 stroke-amber-400', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20', text: 'text-amber-400' };
    return { ring: 'text-rose-400 stroke-rose-400', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20', text: 'text-rose-400' };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Headline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Google PageSpeed Insights
                  <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    Live API
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Measure mobile & desktop Core Web Vitals, Lighthouse performance, and optimization diagnostics.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-3">
              <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Target:</span>
                <strong className="text-slate-200">{website.name}</strong>
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>SSRF-Protected Server Proxy</span>
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                <History className="w-3.5 h-3.5 text-purple-400" />
                <span>{historyRuns.length} Tests Stored in Firestore</span>
              </span>
            </div>
          </div>

          {/* Quick CTA Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {activeTest && (
              <button
                onClick={handleCopySummary}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors text-xs font-medium flex items-center gap-1.5"
                title="Copy report summary to clipboard"
              >
                {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSummary ? 'Copied' : 'Copy Report'}</span>
              </button>
            )}
            <a
              href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(selectedUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors text-xs font-medium flex items-center gap-1.5"
            >
              <span>Google Viewer</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Test Configuration Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Select Landing Page to Test
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Presets dropdown */}
              <select
                value={selectedUrl}
                onChange={(e) => {
                  const found = keyLandingPages.find((p) => p.url === e.target.value);
                  setSelectedUrl(e.target.value);
                  if (found) setSelectedLabel(found.label);
                  else setSelectedLabel('Custom Page');
                }}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                {keyLandingPages.map((page) => (
                  <option key={page.url} value={page.url}>
                    {page.label} ({page.url.replace(/^https?:\/\/[^/]+/, '') || '/'})
                  </option>
                ))}
              </select>

              {/* Direct URL input */}
              <input
                type="url"
                value={selectedUrl}
                onChange={(e) => {
                  setSelectedUrl(e.target.value);
                  setSelectedLabel('Custom Page');
                }}
                placeholder="https://www.arthurscreatives.com/page"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>

          {/* Strategy Switcher & Execution Button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Device Strategy buttons */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setStrategy('mobile');
                  setRunBoth(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  strategy === 'mobile' && !runBoth
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStrategy('desktop');
                  setRunBoth(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  strategy === 'desktop' && !runBoth
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setRunBoth(!runBoth)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  runBoth ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Run tests on both Mobile and Desktop devices simultaneously"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Both</span>
              </button>
            </div>

            {/* Run Button */}
            <button
              onClick={() => handleRunTest()}
              disabled={isLoading}
              className={`px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg transition-all ${
                isLoading
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Running Audit...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white text-white" />
                  <span>Run PageSpeed Test</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Loading Step indicator */}
        {isLoading && (
          <div className="bg-cyan-950/40 border border-cyan-800/50 rounded-xl p-3 flex items-center gap-3 text-xs text-cyan-300 animate-pulse">
            <Activity className="w-4 h-4 text-cyan-400 animate-spin" />
            <span className="font-medium">{loadingStep}</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3.5 flex items-start gap-3 text-xs text-rose-300">
            <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">Test Error</strong>
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Results View */}
      {activeTest ? (
        <div className="space-y-6">
          {/* Active Test Header & Subnavigation */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${activeTest.strategy === 'mobile' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                  {activeTest.strategy === 'mobile' ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{activeTest.pageLabel || 'Landing Page Audit'}</h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {activeTest.strategy}
                    </span>
                    {comparisonTest && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Dual Mode
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono truncate max-w-xl">{activeTest.url}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tested {new Date(activeTest.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
                <button
                  onClick={() => handleRunTest(activeTest.strategy)}
                  disabled={isLoading}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Re-test</span>
                </button>
              </div>
            </div>

            {/* Score Gauges Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5">
              {[
                { label: 'Performance', score: activeTest.scores.performance, desc: 'Speed, responsiveness & stability' },
                { label: 'Accessibility', score: activeTest.scores.accessibility, desc: 'Contrast, screen-reader & ARIA' },
                { label: 'Best Practices', score: activeTest.scores.bestPractices, desc: 'Modern web & security standards' },
                { label: 'SEO', score: activeTest.scores.seo, desc: 'Crawlability, metadata & indexability' },
              ].map((item) => {
                const color = getScoreColor(item.score);
                return (
                  <div key={item.label} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 flex flex-col items-center text-center">
                    {/* Circle Score Meter */}
                    <div className="relative w-20 h-20 mb-3 flex items-center justify-center">
                      <svg className="w-20 h-20 transform -rotate-90">
                        <circle
                          cx="40"
                          cy="40"
                          r="34"
                          stroke="currentColor"
                          strokeWidth="6"
                          fill="transparent"
                          className="text-slate-700/60"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="34"
                          stroke="currentColor"
                          strokeWidth="6"
                          fill="transparent"
                          strokeDasharray={213}
                          strokeDashoffset={213 - (213 * item.score) / 100}
                          className={`${color.ring} transition-all duration-1000 ease-out`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className={`absolute text-2xl font-black ${color.text}`}>
                        {item.score}
                      </span>
                    </div>

                    <span className="text-sm font-bold text-white">{item.label}</span>
                    <span className="text-[11px] text-slate-400 mt-0.5 leading-tight">{item.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Core Web Vitals Status Banner */}
          <div className={`rounded-2xl p-5 border ${
            activeTest.coreWebVitalsStatus === 'passed'
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : activeTest.coreWebVitalsStatus === 'needs_improvement'
              ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
              : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/50">
              <div className="flex items-center gap-2.5">
                {activeTest.coreWebVitalsStatus === 'passed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : activeTest.coreWebVitalsStatus === 'needs_improvement' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Core Web Vitals Assessment: {
                      activeTest.coreWebVitalsStatus === 'passed'
                        ? 'Passed'
                        : activeTest.coreWebVitalsStatus === 'needs_improvement'
                        ? 'Needs Improvement'
                        : 'Failed'
                    }
                  </h4>
                  <p className="text-xs text-slate-400">
                    Google ranking signals for real-world user page experience.
                  </p>
                </div>
              </div>

              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                activeTest.coreWebVitalsStatus === 'passed'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : activeTest.coreWebVitalsStatus === 'needs_improvement'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {activeTest.coreWebVitalsStatus === 'passed' ? 'Google Ranking Advantage' : 'Experience Improvement Needed'}
              </span>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'LCP (Largest Contentful)', value: activeTest.metrics.lcp, target: '< 2.5s', good: (activeTest.metrics.lcpNumeric || 0) <= 2500 },
                { label: 'INP / FID', value: activeTest.metrics.inp, target: '< 200ms', good: true },
                { label: 'CLS (Layout Shift)', value: activeTest.metrics.cls, target: '< 0.1', good: (activeTest.metrics.clsNumeric || 0) <= 0.1 },
                { label: 'FCP (First Contentful)', value: activeTest.metrics.fcp, target: '< 1.8s', good: (activeTest.metrics.fcpNumeric || 0) <= 1800 },
                { label: 'TBT (Blocking Time)', value: activeTest.metrics.tbt, target: '< 200ms', good: (activeTest.metrics.tbtNumeric || 0) <= 200 },
                { label: 'Speed Index', value: activeTest.metrics.speedIndex, target: '< 3.4s', good: true },
              ].map((m) => (
                <div key={m.label} className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex flex-col">
                  <span className="text-[11px] text-slate-400 font-medium mb-1 truncate">{m.label}</span>
                  <span className={`text-base font-extrabold ${m.good ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {m.value}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">Goal: {m.target}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dual Mode Comparison Box (when comparing Mobile and Desktop) */}
          {comparisonTest && (
            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <h4 className="text-sm font-bold text-white">Device Comparison (Mobile vs Desktop)</h4>
                </div>
                <span className="text-xs text-purple-300">Dual Test Execution</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mobile Card */}
                <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" /> Mobile
                    </span>
                    <span className="text-xs font-bold text-white">Score: {activeTest.strategy === 'mobile' ? activeTest.scores.performance : comparisonTest.scores.performance}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">LCP</span>
                      <strong className="text-white">{activeTest.strategy === 'mobile' ? activeTest.metrics.lcp : comparisonTest.metrics.lcp}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">CLS</span>
                      <strong className="text-white">{activeTest.strategy === 'mobile' ? activeTest.metrics.cls : comparisonTest.metrics.cls}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">TBT</span>
                      <strong className="text-white">{activeTest.strategy === 'mobile' ? activeTest.metrics.tbt : comparisonTest.metrics.tbt}</strong>
                    </div>
                  </div>
                </div>

                {/* Desktop Card */}
                <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5" /> Desktop
                    </span>
                    <span className="text-xs font-bold text-white">Score: {activeTest.strategy === 'desktop' ? activeTest.scores.performance : comparisonTest.scores.performance}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">LCP</span>
                      <strong className="text-white">{activeTest.strategy === 'desktop' ? activeTest.metrics.lcp : comparisonTest.metrics.lcp}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">CLS</span>
                      <strong className="text-white">{activeTest.strategy === 'desktop' ? activeTest.metrics.cls : comparisonTest.metrics.cls}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">TBT</span>
                      <strong className="text-white">{activeTest.strategy === 'desktop' ? activeTest.metrics.tbt : comparisonTest.metrics.tbt}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs for Deep Diagnostics */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            {[
              { id: 'overview', label: `Opportunities (${activeTest.opportunities?.length || 0})` },
              { id: 'diagnostics', label: `Diagnostics (${activeTest.diagnostics?.length || 0})` },
              { id: 'history', label: `Test History (${historyRuns.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Opportunities */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              {activeTest.opportunities && activeTest.opportunities.length > 0 ? (
                activeTest.opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                        <h5 className="text-sm font-bold text-white">{opp.title}</h5>
                        {opp.displayValue && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {opp.displayValue}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{opp.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleCreateTaskFromOpportunity(opp)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="Create actionable item in SEO Tasks view"
                      >
                        {createdTaskId === opp.title ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Task Added</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Add SEO Task</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white">No Critical Performance Bottlenecks Detected</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    This landing page follows high-speed asset compression, minimal render-blocking scripts, and optimal response times.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Diagnostics */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-3">
              {activeTest.diagnostics && activeTest.diagnostics.length > 0 ? (
                activeTest.diagnostics.map((diag) => (
                  <div key={diag.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sliders className="w-3.5 h-3.5 text-slate-400" />
                        {diag.title}
                      </h5>
                      {diag.displayValue && (
                        <span className="text-xs font-mono text-slate-300">{diag.displayValue}</span>
                      )}
                    </div>
                    {diag.description && (
                      <p className="text-xs text-slate-400 mt-1">{diag.description}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400">
                  No additional diagnostic messages returned.
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Historical Runs */}
          {activeTab === 'history' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Stored PageSpeed Tests</h4>
                  <p className="text-xs text-slate-400">Track performance changes across audits for {website.name}</p>
                </div>
              </div>

              {historyRuns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Date / Time</th>
                        <th className="py-3 px-4">Landing Page</th>
                        <th className="py-3 px-4">Device</th>
                        <th className="py-3 px-4">Perf Score</th>
                        <th className="py-3 px-4">LCP</th>
                        <th className="py-3 px-4">CLS</th>
                        <th className="py-3 px-4">CWV Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {historyRuns.map((run) => (
                        <tr key={run.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                            {new Date(run.fetchedAt).toLocaleDateString()} {new Date(run.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 font-medium text-white max-w-xs truncate">
                            <span className="block truncate">{run.pageLabel || 'Landing Page'}</span>
                            <span className="text-[10px] text-slate-400 font-mono block truncate">{run.url}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              run.strategy === 'mobile'
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            }`}>
                              {run.strategy === 'mobile' ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                              <span className="capitalize">{run.strategy}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`font-black text-sm ${getScoreColor(run.scores.performance).text}`}>
                              {run.scores.performance}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">{run.metrics.lcp}</td>
                          <td className="py-3 px-4 font-mono text-slate-300">{run.metrics.cls}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              run.coreWebVitalsStatus === 'passed'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : run.coreWebVitalsStatus === 'needs_improvement'
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {run.coreWebVitalsStatus?.replace('_', ' ') || 'passed'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setActiveTest(run)}
                                className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                                title="View this test"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteHistory(run.id)}
                                className="p-1.5 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                                title="Delete record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  No previous tests recorded. Run a test above to save its scores.
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-4">
            <Gauge className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Ready to Run Live PageSpeed Insights Test</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
            Audit {website.name} ({website.url}) for mobile and desktop Core Web Vitals, speed index, layout stability, and SEO opportunities.
          </p>
          <button
            onClick={() => handleRunTest()}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Audit Home Page Now</span>
          </button>
        </div>
      )}
    </div>
  );
}
