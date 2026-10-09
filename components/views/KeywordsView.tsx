'use client';

import React, { useState } from 'react';
import { Website, Keyword, SearchIntent, CrawledPage } from '@/types/seo';
import {
  KeyRound,
  Search,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Sparkles,
  ArrowUpDown,
  Layers,
  HelpCircle,
  Loader2,
  Trash2,
} from 'lucide-react';

interface KeywordsViewProps {
  activeWebsite: Website;
  trackedKeywords: Keyword[];
  crawledPages: CrawledPage[];
  onSaveTrackedKeyword: (kw: Keyword) => Promise<void>;
  onDeleteTrackedKeyword: (id: string) => Promise<void>;
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
  monthlySpent,
  monthlyLimit,
  emergencyKillswitch,
}: KeywordsViewProps) {
  const [seedKeyword, setSeedKeyword] = useState('');
  const [location, setLocation] = useState('United States');
  const [language, setLanguage] = useState('en');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(false);
  const [researchedList, setResearchedList] = useState<Keyword[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [providerInfo, setProviderInfo] = useState<string | null>(null);
  const [showFormula, setShowFormula] = useState(false);

  // Assignment Modal
  const [assignModalKeyword, setAssignModalKeyword] = useState<Keyword | null>(null);
  const [assignedPageUrl, setAssignedPageUrl] = useState('');
  const [isPrimaryAssign, setIsPrimaryAssign] = useState(true);
  const [cannibalizationWarning, setCannibalizationWarning] = useState<string | null>(null);

  // Active website tracked keywords
  const websiteTracked = trackedKeywords.filter((k) => k.websiteId === activeWebsite?.id);

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seedKeyword.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/dataforseo/keyword-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedKeyword,
          location,
          language,
          device,
          monthlySpent,
          monthlyLimit,
          emergencyKillswitch,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to research keywords');
      } else {
        setResearchedList(data.keywords || []);
        setProviderInfo(data.provider);
      }
    } catch (err: any) {
      setError(err.message || 'Network error researching keywords');
    } finally {
      setLoading(false);
    }
  };

  // Check for cannibalization when assigning primary keyword
  const checkAssignmentCannibalization = (pageUrl: string, isPrimary: boolean) => {
    setAssignedPageUrl(pageUrl);
    setIsPrimaryAssign(isPrimary);

    if (isPrimary && assignModalKeyword) {
      const existingPrimaryOnPage = websiteTracked.find(
        (k) => k.assignedPageUrl === pageUrl && k.isPrimary && k.id !== assignModalKeyword.id
      );
      const existingSameKeywordElsewhere = websiteTracked.find(
        (k) =>
          k.term.toLowerCase() === assignModalKeyword.term.toLowerCase() &&
          k.isPrimary &&
          k.assignedPageUrl &&
          k.assignedPageUrl !== pageUrl
      );

      if (existingSameKeywordElsewhere) {
        setCannibalizationWarning(
          `Cannibalization Risk: Keyword "${assignModalKeyword.term}" is already designated as the primary target for ${existingSameKeywordElsewhere.assignedPageUrl}. Having multiple pages compete for the exact same primary keyword can dilute rankings.`
        );
      } else if (existingPrimaryOnPage) {
        setCannibalizationWarning(
          `Page Notice: ${pageUrl} already has primary target "${existingPrimaryOnPage.term}". Replacing it will make "${assignModalKeyword.term}" the primary focus.`
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
    const updated: Keyword = {
      ...assignModalKeyword,
      websiteId: activeWebsite.id,
      assignedPageUrl,
      isPrimary: isPrimaryAssign,
      lastUpdated: new Date().toISOString(),
    };
    await onSaveTrackedKeyword(updated);
    setAssignModalKeyword(null);
  };

  const exportCsv = () => {
    const dataToExport = websiteTracked.length > 0 ? websiteTracked : researchedList;
    if (dataToExport.length === 0) return;

    const headers = ['Keyword', 'Search Volume', 'Competition', 'CPC ($)', 'Intent', 'Opportunity Score', 'Current Rank', 'Assigned Page', 'Primary'];
    const rows = dataToExport.map((k) => [
      `"${k.term}"`,
      k.searchVolume,
      k.competition,
      k.cpc,
      k.intent,
      k.opportunityScore,
      k.currentRank ?? 'Unranked',
      `"${k.assignedPageUrl || 'Unassigned'}"`,
      k.isPrimary ? 'Yes' : 'No',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `keywords_${activeWebsite.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Search & Filter Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Keyword Research & Opportunity Workspace</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Target relevance over vanity volume. Discover search volume, commercial intent, and keyword difficulty.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFormula(!showFormula)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Score Formula</span>
            </button>
            <button
              onClick={exportCsv}
              disabled={websiteTracked.length === 0 && researchedList.length === 0}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleResearch} className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <input
              type="text"
              required
              value={seedKeyword}
              onChange={(e) => setSeedKeyword(e.target.value)}
              placeholder="e.g., custom web design los angeles, automated workflow seo..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="md:col-span-2">
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
            </select>
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
              type="submit"
              disabled={loading}
              className="w-full h-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>{loading ? 'Searching...' : 'Analyze'}</span>
            </button>
          </div>
        </form>

        {/* Keyword Opportunity Score Formula Breakdown */}
        {showFormula && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-slate-700 space-y-2">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Visible Keyword Opportunity Score Model (0 – 100)</span>
            </div>
            <p className="leading-relaxed">
              We never rank keywords purely by high volume. The score evaluates realistic ranking potential:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-white p-2 rounded-lg border border-emerald-100">
                <strong className="text-slate-900">Volume (Max 40 pts)</strong>
                <p className="text-slate-500 font-sans mt-0.5">log10 scaled search volume</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-emerald-100">
                <strong className="text-slate-900">Competition (Max 35 pts)</strong>
                <p className="text-slate-500 font-sans mt-0.5">(1 - competitionIndex) × 35</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-emerald-100">
                <strong className="text-slate-900">Intent (Max 25 pts)</strong>
                <p className="text-slate-500 font-sans mt-0.5">Transactional (+25), Commercial (+20)</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-emerald-100">
                <strong className="text-slate-900">Cannibalization</strong>
                <p className="text-slate-500 font-sans mt-0.5">Hard warning on duplicate primary tag</p>
              </div>
            </div>
          </div>
        )}

        {providerInfo && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>Provider: <strong className="text-slate-700">{providerInfo}</strong></span>
            <span>Location: {location} • Device: {device} • Freshness: Just now</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Tracked vs Researched Toggle & Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            {researchedList.length > 0 ? `Researched Keywords (${researchedList.length})` : `Currently Tracked Keywords for ${activeWebsite.name} (${websiteTracked.length})`}
          </h3>
          <span className="text-xs text-slate-500">
            {websiteTracked.length} keywords monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-6">Keyword Term</th>
                <th className="py-3 px-4">Search Volume</th>
                <th className="py-3 px-4">Competition</th>
                <th className="py-3 px-4">Est. CPC</th>
                <th className="py-3 px-4">Intent</th>
                <th className="py-3 px-4">Opportunity Score</th>
                <th className="py-3 px-4">Assigned Page</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(researchedList.length > 0 ? researchedList : websiteTracked).map((kw) => {
                const isTracked = websiteTracked.some((t) => t.term.toLowerCase() === kw.term.toLowerCase());
                return (
                  <tr key={kw.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{kw.term}</span>
                        {kw.isPrimary && (
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Primary
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {kw.searchVolume.toLocaleString()} / mo
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-slate-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${kw.competition > 0.6 ? 'bg-rose-500' : kw.competition > 0.3 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${kw.competition * 100}%` }}
                          />
                        </div>
                        <span className="text-slate-600 font-mono text-[11px]">{kw.competition}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">${kw.cpc.toFixed(2)}</td>
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
                        className={`font-bold px-2 py-0.5 rounded-lg text-xs ${
                          kw.opportunityScore >= 75
                            ? 'bg-emerald-100 text-emerald-800'
                            : kw.opportunityScore >= 50
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {kw.opportunityScore} / 100
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {kw.assignedPageUrl || (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setAssignModalKeyword(kw);
                            setAssignedPageUrl(kw.assignedPageUrl || '');
                            setIsPrimaryAssign(kw.isPrimary ?? true);
                            setCannibalizationWarning(null);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-[11px]"
                        >
                          Map Page
                        </button>
                        {!isTracked ? (
                          <button
                            onClick={() => onSaveTrackedKeyword({ ...kw, websiteId: activeWebsite.id })}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px]"
                          >
                            + Track
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

              {(researchedList.length === 0 && websiteTracked.length === 0) && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    No keywords tracked yet. Enter a seed keyword above to run your first research query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                  <option value="">Select an audited page...</option>
                  <option value={activeWebsite.url}>{activeWebsite.url} (Homepage)</option>
                  {crawledPages.map((p) => (
                    <option key={p.id} value={p.url}>
                      {p.url} ({p.title || 'Untitled'})
                    </option>
                  ))}
                  <option value={`${activeWebsite.url}/services`}>{activeWebsite.url}/services</option>
                  <option value={`${activeWebsite.url}/contact`}>{activeWebsite.url}/contact</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assignment Role
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      checked={isPrimaryAssign}
                      onChange={() => checkAssignmentCannibalization(assignedPageUrl, true)}
                    />
                    <span>Primary Target Keyword (1 per page)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      checked={!isPrimaryAssign}
                      onChange={() => checkAssignmentCannibalization(assignedPageUrl, false)}
                    />
                    <span>Secondary / Semantic Variant</span>
                  </label>
                </div>
              </div>

              {/* Cannibalization Warning Banner */}
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
