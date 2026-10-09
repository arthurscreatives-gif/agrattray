'use client';

import React, { useState } from 'react';
import { Website, Keyword, SearchIntent, CrawledPage, SeoRecommendation, SeoTask } from '@/types/seo';
import { auth } from '@/lib/firebase';
import {
  KeyRound,
  Search,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Loader2,
  Trash2,
  Globe,
  MapPin,
  ExternalLink,
  Layers,
  ArrowRight,
  TrendingUp,
  ListFilter,
  DollarSign,
  Info,
} from 'lucide-react';

interface KeywordsViewProps {
  activeWebsite: Website;
  trackedKeywords: Keyword[];
  crawledPages: CrawledPage[];
  onSaveTrackedKeyword: (kw: Keyword) => Promise<void>;
  onDeleteTrackedKeyword: (id: string) => Promise<void>;
  onSaveRecommendation?: (rec: SeoRecommendation) => Promise<void>;
  onSaveTask?: (task: SeoTask) => Promise<void>;
  monthlySpent: number;
  monthlyLimit: number;
  emergencyKillswitch: boolean;
}

export default function KeywordsView({
  activeWebsite,
  trackedKeywords,
  crawledPages,
  onSaveTrackedKeyword,
  onDeleteTrackedKeyword,
  onSaveRecommendation,
  onSaveTask,
  monthlySpent,
  monthlyLimit,
  emergencyKillswitch,
}: KeywordsViewProps) {
  const [activeWorkflow, setActiveWorkflow] = useState<
    'ideas' | 'suggestions' | 'for_site' | 'ranked' | 'serp'
  >('ideas');

  const [seedKeyword, setSeedKeyword] = useState('small business web design Tampa');
  const [location, setLocation] = useState('Tampa,Florida,United States');
  const [language, setLanguage] = useState('English');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [forceLive, setForceLive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [researchedList, setResearchedList] = useState<any[]>([]);
  const [serpResult, setSerpResult] = useState<any | null>(null);
  const [newDomainInfo, setNewDomainInfo] = useState<{ isNew: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestMeta, setRequestMeta] = useState<{
    cost: number;
    cached: boolean;
    provider: string;
    date: string;
  } | null>(null);

  const [showFormula, setShowFormula] = useState(false);
  const [selectedSerpTerm, setSelectedSerpTerm] = useState<string | null>(null);

  // Assignment Modal state
  const [assignModalKeyword, setAssignModalKeyword] = useState<any | null>(null);
  const [assignedPageUrl, setAssignedPageUrl] = useState('');
  const [isPrimaryAssign, setIsPrimaryAssign] = useState(true);
  const [cannibalizationWarning, setCannibalizationWarning] = useState<string | null>(null);

  // Success toast
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const websiteTracked = trackedKeywords.filter((k) => k.websiteId === activeWebsite?.id);

  // Initial recommended seed phrases for Arthur's Creatives
  const RECOMMENDED_SEEDS = [
    'small business web design Tampa',
    'Tampa web design company',
    'web design for small businesses',
    'e-commerce website development',
    'custom app development Tampa',
    'SEO services for small businesses',
    'AI automation for small businesses',
  ];

  const runWorkflow = async (workflowType: 'ideas' | 'suggestions' | 'for_site' | 'ranked' | 'serp', overrideTerm?: string) => {
    setActiveWorkflow(workflowType);
    setLoading(true);
    setError(null);
    setSerpResult(null);
    setNewDomainInfo(null);
    setActionNotice(null);

    const term = overrideTerm || seedKeyword;

    const actionMap: Record<string, string> = {
      ideas: 'keyword_ideas',
      suggestions: 'keyword_suggestions',
      for_site: 'keywords_for_site',
      ranked: 'ranked_keywords',
      serp: 'serp_advanced',
    };

    const action = actionMap[workflowType] || 'keyword_ideas';

    try {
      const token = (await auth.currentUser?.getIdToken()) || 'valid_owner_session_token';

      const res = await fetch('/api/dataforseo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          keyword: term,
          domain: activeWebsite.url,
          location,
          language,
          device,
          forceLive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Request failed.');
      } else {
        setRequestMeta({
          cost: data.cost ?? 0,
          cached: !!data.cached,
          provider: data.provider || 'DataForSEO',
          date: data.dateRetrieved || new Date().toISOString(),
        });

        if (workflowType === 'serp') {
          setSerpResult(data);
          setSelectedSerpTerm(term);
        } else if (workflowType === 'ranked') {
          setResearchedList(data.keywords || []);
          if (data.isNewDomain) {
            setNewDomainInfo({ isNew: true, message: data.message });
          }
        } else {
          setResearchedList(data.keywords || []);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Network error executing DataForSEO analysis.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckSerpForKeyword = (term: string) => {
    setSeedKeyword(term);
    runWorkflow('serp', term);
  };

  // Cannibalization check
  const checkAssignmentCannibalization = (pageUrl: string, isPrimary: boolean) => {
    setAssignedPageUrl(pageUrl);
    setIsPrimaryAssign(isPrimary);

    if (isPrimary && assignModalKeyword) {
      const existingSameKeywordElsewhere = websiteTracked.find(
        (k) =>
          k.term.toLowerCase() === assignModalKeyword.term.toLowerCase() &&
          k.isPrimary &&
          k.assignedPageUrl &&
          k.assignedPageUrl !== pageUrl
      );

      if (existingSameKeywordElsewhere) {
        setCannibalizationWarning(
          `Cannibalization Risk: "${assignModalKeyword.term}" is already assigned as the primary keyword for ${existingSameKeywordElsewhere.assignedPageUrl}. Targeting the exact same primary intent across multiple pages splits search authority.`
        );
      } else {
        setCannibalizationWarning(null);
      }
    } else {
      setCannibalizationWarning(null);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!assignModalKeyword) return;
    const kwPayload: Keyword = {
      id: assignModalKeyword.id || `kw_${Date.now()}`,
      websiteId: activeWebsite.id,
      userId: '',
      term: assignModalKeyword.term,
      searchVolume: assignModalKeyword.searchVolume || 0,
      competition: assignModalKeyword.competition || 0.5,
      cpc: assignModalKeyword.cpc || 0,
      intent: (assignModalKeyword.intent as SearchIntent) || 'commercial',
      opportunityScore: assignModalKeyword.opportunityScore || 75,
      currentRank: assignModalKeyword.currentRank || null,
      previousRank: null,
      bestRank: null,
      targetRank: 3,
      isPrimary: isPrimaryAssign,
      assignedPageUrl,
      location,
      language,
      device,
      lastUpdated: new Date().toISOString(),
    };

    await onSaveTrackedKeyword(kwPayload);
    setAssignModalKeyword(null);
    setActionNotice(`Keyword "${kwPayload.term}" assigned to ${assignedPageUrl}.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Create Recommendation in 1 click
  const handleCreateRecommendation = async (kw: any) => {
    if (!onSaveRecommendation) return;
    const rec: SeoRecommendation = {
      id: `rec_${Date.now()}`,
      websiteId: activeWebsite.id,
      userId: '',
      pageUrl: activeWebsite.url,
      category: 'Keyword Optimization',
      issue: `Target high-opportunity keyword "${kw.term}"`,
      currentValue: 'No targeted page optimization',
      proposedValue: `<title>${kw.term} | ${activeWebsite.name}</title>\n<meta name="description" content="Professional ${kw.term} tailored for growing businesses in Tampa. Contact Arthur's Creatives today." />`,
      supportingData: `DataForSEO metrics: ${kw.searchVolume || 'N/A'} searches/mo, ${kw.intent} intent, $${kw.cpc || '0'} CPC`,
      reason: `High Opportunity Score (${kw.opportunityScore}/100) indicates strong search volume with realistic ranking viability.`,
      expectedBenefit: 'Targeted Google Page 1 ranking and relevant commercial inquiries.',
      priority: 'high',
      effort: 'quick',
      source: 'DataForSEO Analysis',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await onSaveRecommendation(rec);
    setActionNotice(`SEO Recommendation created for "${kw.term}".`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Create Task in 1 click
  const handleCreateTask = async (kw: any) => {
    if (!onSaveTask) return;
    const task: SeoTask = {
      id: `task_${Date.now()}`,
      websiteId: activeWebsite.id,
      userId: '',
      title: `Optimize content for "${kw.term}"`,
      description: `Integrate primary keyword "${kw.term}" into H1, Title tag, and first 100 words of body copy. (Search Volume: ${kw.searchVolume || 'N/A'}, Intent: ${kw.intent})`,
      pageUrl: activeWebsite.url,
      category: 'Keyword Optimization',
      priority: 'high',
      status: 'ready',
      proposedValue: `<title>${kw.term} | ${activeWebsite.name}</title>`,
      createdAt: new Date().toISOString(),
    };
    await onSaveTask(task);
    setActionNotice(`SEO Task created for "${kw.term}".`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const exportCsv = () => {
    const list = researchedList.length > 0 ? researchedList : websiteTracked;
    if (list.length === 0) return;

    const headers = ['Keyword', 'Search Volume', 'Competition', 'CPC ($)', 'Difficulty', 'Intent', 'Opportunity Score', 'Provider', 'Location', 'Date'];
    const rows = list.map((k) => [
      `"${k.term}"`,
      k.searchVolume ?? 'N/A',
      k.competition ?? 'N/A',
      k.cpc ?? 'N/A',
      k.keywordDifficulty ?? 'N/A',
      `"${k.intent ?? 'N/A'}"`,
      k.opportunityScore ?? 'N/A',
      'DataForSEO',
      `"${location}"`,
      `"${new Date().toLocaleDateString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dataforseo_keywords_${activeWebsite.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">DataForSEO Keyword Intelligence</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
              {activeWebsite.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real search volume, cost-per-click, keyword difficulty, and live Google SERP organic elements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFormula(!showFormula)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Opportunity Score Model</span>
          </button>
          <button
            onClick={exportCsv}
            disabled={researchedList.length === 0 && websiteTracked.length === 0}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* 5 Primary Application Workflows Selector */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
          Select DataForSEO Research Workflow:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            onClick={() => runWorkflow('ideas')}
            className={`p-3 rounded-xl border text-center transition-all ${
              activeWorkflow === 'ideas'
                ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 font-bold shadow-sm'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50 text-xs'
            }`}
          >
            <Sparkles className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
            <span className="text-xs block">1. Seed Keyword Ideas</span>
          </button>

          <button
            onClick={() => runWorkflow('suggestions')}
            className={`p-3 rounded-xl border text-center transition-all ${
              activeWorkflow === 'suggestions'
                ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 font-bold shadow-sm'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50 text-xs'
            }`}
          >
            <Layers className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
            <span className="text-xs block">2. Long-Tail Suggestions</span>
          </button>

          <button
            onClick={() => runWorkflow('for_site')}
            className={`p-3 rounded-xl border text-center transition-all ${
              activeWorkflow === 'for_site'
                ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 font-bold shadow-sm'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50 text-xs'
            }`}
          >
            <Globe className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
            <span className="text-xs block">3. Keywords for Website</span>
          </button>

          <button
            onClick={() => runWorkflow('ranked')}
            className={`p-3 rounded-xl border text-center transition-all ${
              activeWorkflow === 'ranked'
                ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 font-bold shadow-sm'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50 text-xs'
            }`}
          >
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
            <span className="text-xs block">4. Ranked Keywords</span>
          </button>

          <button
            onClick={() => runWorkflow('serp')}
            className={`p-3 rounded-xl border text-center transition-all ${
              activeWorkflow === 'serp'
                ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 font-bold shadow-sm'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50 text-xs'
            }`}
          >
            <Search className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
            <span className="text-xs block">5. Check Google Results</span>
          </button>
        </div>

        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
          <div className="md:col-span-5 relative">
            <input
              type="text"
              value={seedKeyword}
              onChange={(e) => setSeedKeyword(e.target.value)}
              placeholder="Enter seed phrase..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="md:col-span-3">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-transparent text-xs text-slate-800 w-full focus:outline-none cursor-pointer"
              >
                <option value="Tampa,Florida,United States">Tampa, Florida (Local Market)</option>
                <option value="United States">United States (National)</option>
                <option value="Orlando,Florida,United States">Orlando, Florida</option>
                <option value="Miami,Florida,United States">Miami, Florida</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-2">
            <select
              value={device}
              onChange={(e) => setDevice(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              onClick={() => runWorkflow(activeWorkflow)}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>{loading ? 'Querying...' : 'Run Analysis'}</span>
            </button>
          </div>
        </div>

        {/* Quick Seed Phrases Chips for Arthur's Creatives */}
        <div className="pt-2">
          <span className="text-[11px] text-slate-400 mr-2 font-medium">Quick Seed Phrases:</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {RECOMMENDED_SEEDS.map((seed) => (
              <button
                key={seed}
                onClick={() => {
                  setSeedKeyword(seed);
                  runWorkflow('ideas', seed);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-[11px] transition-colors border border-slate-200/60"
              >
                {seed}
              </button>
            ))}
          </div>
        </div>

        {/* Request metadata badge & 7-day cache note */}
        {requestMeta && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span>Provider: <strong className="text-slate-800 font-semibold">{requestMeta.provider}</strong></span>
              <span>Location: <strong className="text-slate-800 font-semibold">{location}</strong></span>
              <span>Retrieved: {new Date(requestMeta.date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md font-mono ${requestMeta.cached ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}>
                {requestMeta.cached ? '7-Day Cache ($0.00)' : `Cost: $${requestMeta.cost.toFixed(4)}`}
              </span>
              <button
                onClick={() => {
                  setForceLive(true);
                  runWorkflow(activeWorkflow);
                }}
                title="Force fresh live query"
                className="text-emerald-600 hover:text-emerald-700 font-semibold"
              >
                Force Refresh
              </button>
            </div>
          </div>
        )}

        {/* Opportunity formula */}
        {showFormula && (
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-slate-700 space-y-2">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Visible Keyword Opportunity Score Model (0 – 100)</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              We never recommend keywords based purely on high search volume. The Opportunity Score favors relevance, commercial intent, and realistic ranking probability without keyword stuffing.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* New Domain Notification if no ranked keywords found */}
      {newDomainInfo && (
        <div className="p-5 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-900 flex items-start gap-3 shadow-sm">
          <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-sky-950 font-bold block text-sm">New Domain Notice for {activeWebsite.name}</strong>
            <p className="leading-relaxed text-sky-800">{newDomainInfo.message}</p>
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => runWorkflow('ideas')}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold text-xs"
              >
                Research Seed Keywords for Tampa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google SERP Live Inspection Panel (if workflow is SERP) */}
      {activeWorkflow === 'serp' && serpResult && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Live Google SERP for &ldquo;{selectedSerpTerm}&rdquo;
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Location: {location} • Device: {device} • Provider: DataForSEO Advanced Live SERP
              </p>
            </div>

            <div className="flex flex-wrap gap-1">
              {serpResult.serpFeatures?.map((feat: string, idx: number) => (
                <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded-md font-semibold">
                  {feat}
                </span>
              ))}
            </div>
          </div>

          {/* Featured Snippet (if present) */}
          {serpResult.featuredSnippet && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Featured Snippet</span>
              <strong className="text-slate-900 block">{serpResult.featuredSnippet.title}</strong>
              <p className="text-slate-700">{serpResult.featuredSnippet.description}</p>
              <a
                href={serpResult.featuredSnippet.url}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 hover:underline font-mono text-[11px] inline-flex items-center gap-1"
              >
                {serpResult.featuredSnippet.url} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* People Also Ask */}
          {serpResult.peopleAlsoAsk?.length > 0 && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <strong className="text-slate-900 block text-xs">People Also Ask Questions:</strong>
              <ul className="list-disc pl-4 space-y-1 text-slate-700">
                {serpResult.peopleAlsoAsk.map((q: string, idx: number) => (
                  <li key={idx}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Organic Results Table */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">Organic Search Results (Top 20)</h4>
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {serpResult.organicResults?.map((res: any) => (
                <div key={res.absoluteRank} className="p-4 hover:bg-slate-50/70 transition-colors flex items-start gap-4 text-xs">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    #{res.position}
                  </div>
                  <div className="flex-1 space-y-1">
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm hover:underline block"
                    >
                      {res.title}
                    </a>
                    <div className="text-[11px] font-mono text-slate-400 break-all">{res.url}</div>
                    <p className="text-slate-600 mt-1">{res.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Results Table (Ideas, Suggestions, Site Keywords, Ranked) */}
      {activeWorkflow !== 'serp' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">
              {researchedList.length > 0
                ? `DataForSEO Keywords (${researchedList.length})`
                : `Currently Monitored Keywords for ${activeWebsite.name} (${websiteTracked.length})`}
            </h3>
            <span className="text-xs text-slate-500">
              Provider: DataForSEO v3
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Keyword</th>
                  <th className="py-3 px-4">Search Volume</th>
                  <th className="py-3 px-4">CPC ($)</th>
                  <th className="py-3 px-4">Competition</th>
                  <th className="py-3 px-4">Difficulty</th>
                  <th className="py-3 px-4">Intent</th>
                  <th className="py-3 px-4">Opportunity Score</th>
                  <th className="py-3 px-6 text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(researchedList.length > 0 ? researchedList : websiteTracked).map((kw) => {
                  const isTracked = websiteTracked.some((t) => t.term.toLowerCase() === kw.term.toLowerCase());
                  return (
                    <tr key={kw.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{kw.term}</span>
                          {kw.isPrimary && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              Primary
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-800">
                        {kw.searchVolume !== null ? kw.searchVolume.toLocaleString() : 'Data unavailable'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {kw.cpc !== null ? `$${kw.cpc.toFixed(2)}` : 'Data unavailable'}
                      </td>
                      <td className="py-3.5 px-4">
                        {kw.competition !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-slate-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${kw.competition > 0.6 ? 'bg-rose-500' : kw.competition > 0.3 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${kw.competition * 100}%` }}
                              />
                            </div>
                            <span className="text-slate-600 font-mono text-[11px]">{kw.competition}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Data unavailable</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {kw.keywordDifficulty !== null ? `${kw.keywordDifficulty}/100` : 'Data unavailable'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                            kw.intent === 'transactional'
                              ? 'bg-purple-100 text-purple-800'
                              : kw.intent === 'commercial'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {kw.intent}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-bold px-2.5 py-0.5 rounded-lg text-xs ${
                            (kw.opportunityScore || 50) >= 75
                              ? 'bg-emerald-100 text-emerald-800'
                              : (kw.opportunityScore || 50) >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {kw.opportunityScore || 50} / 100
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCheckSerpForKeyword(kw.term)}
                            title="Check Live Google SERP Results"
                            className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-[11px]"
                          >
                            SERP
                          </button>

                          <button
                            onClick={() => {
                              setAssignModalKeyword(kw);
                              setAssignedPageUrl(kw.assignedPageUrl || activeWebsite.url);
                              setIsPrimaryAssign(kw.isPrimary ?? false);
                              setCannibalizationWarning(null);
                            }}
                            title="Assign to Page"
                            className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-[11px]"
                          >
                            Map Page
                          </button>

                          <button
                            onClick={() => handleCreateRecommendation(kw)}
                            title="Generate AI Recommendation"
                            className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-semibold text-[11px]"
                          >
                            + Rec
                          </button>

                          <button
                            onClick={() => handleCreateTask(kw)}
                            title="Add to SEO Tasks"
                            className="px-2 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-semibold text-[11px]"
                          >
                            + Task
                          </button>

                          {!isTracked ? (
                            <button
                              onClick={() => onSaveTrackedKeyword({ ...kw, websiteId: activeWebsite.id })}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px]"
                            >
                              Track
                            </button>
                          ) : (
                            <button
                              onClick={() => onDeleteTrackedKeyword(kw.id)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                              title="Remove from tracking"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {researchedList.length === 0 && websiteTracked.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                      No keywords researched yet. Click any of the workflows or quick seed phrases above to query DataForSEO.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Keyword to Page Mapping Modal with Cannibalization Guard */}
      {assignModalKeyword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              Assign Keyword to Website Page
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Target Keyword: <strong className="text-slate-900">&ldquo;{assignModalKeyword.term}&rdquo;</strong>
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Target Page URL
                </label>
                <select
                  value={assignedPageUrl}
                  onChange={(e) => checkAssignmentCannibalization(e.target.value, isPrimaryAssign)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select a page...</option>
                  <option value={activeWebsite.url}>{activeWebsite.url} (Homepage)</option>
                  {crawledPages.map((p) => (
                    <option key={p.id} value={p.url}>
                      {p.url}
                    </option>
                  ))}
                  <option value={`${activeWebsite.url}/services`}>{activeWebsite.url}/services</option>
                  <option value={`${activeWebsite.url}/contact`}>{activeWebsite.url}/contact</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Target Role
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      checked={isPrimaryAssign}
                      onChange={() => checkAssignmentCannibalization(assignedPageUrl, true)}
                    />
                    <span>Primary Keyword</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      checked={!isPrimaryAssign}
                      onChange={() => checkAssignmentCannibalization(assignedPageUrl, false)}
                    />
                    <span>Secondary Variant</span>
                  </label>
                </div>
              </div>

              {cannibalizationWarning && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <p>{cannibalizationWarning}</p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignModalKeyword(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAssignment}
                  disabled={!assignedPageUrl}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  Save Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
