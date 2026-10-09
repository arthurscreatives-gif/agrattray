'use client';

import React, { useState } from 'react';
import {
  Website,
  AuditRun,
  AuditIssue,
  CrawledPage,
  IssueSeverity,
  IssueStatus,
  SeoTask,
} from '@/types/seo';
import {
  SearchCode,
  ShieldCheck,
  Play,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  Gauge,
  Smartphone,
  Monitor,
  Info,
} from 'lucide-react';

interface SiteAuditViewProps {
  activeWebsite: Website;
  auditRuns: AuditRun[];
  auditIssues: AuditIssue[];
  crawledPages: CrawledPage[];
  onStartCrawl: (website: Website, maxPages: number) => Promise<void>;
  onUpdateIssueStatus: (issueId: string, status: IssueStatus) => Promise<void>;
  onCreateTaskFromIssue: (issue: AuditIssue) => void;
  onAskGemini: (issue: AuditIssue) => void;
  crawling: boolean;
}

export default function SiteAuditView({
  activeWebsite,
  auditRuns,
  auditIssues,
  crawledPages,
  onStartCrawl,
  onUpdateIssueStatus,
  onCreateTaskFromIssue,
  onAskGemini,
  crawling,
}: SiteAuditViewProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedIssue, setSelectedIssue] = useState<AuditIssue | null>(null);
  const [isCrawlModalOpen, setIsCrawlModalOpen] = useState(false);
  const [crawlLimit, setCrawlLimit] = useState(25);
  const [copiedCode, setCopiedCode] = useState(false);

  // PageSpeed inspection state
  const [pageSpeedUrl, setPageSpeedUrl] = useState(activeWebsite?.url || '');
  const [pageSpeedStrategy, setPageSpeedStrategy] = useState<'mobile' | 'desktop'>('mobile');
  const [pageSpeedLoading, setPageSpeedLoading] = useState(false);
  const [pageSpeedData, setPageSpeedData] = useState<any>(null);
  const [pageSpeedError, setPageSpeedError] = useState<string | null>(null);

  const latestAudit = auditRuns.find((a) => a.websiteId === activeWebsite?.id) || auditRuns[0];
  const issues = auditIssues.filter((i) => i.websiteId === activeWebsite?.id);

  const filteredIssues = issues.filter((iss) => {
    if (selectedSeverity === 'all') return true;
    return iss.severity === selectedSeverity;
  });

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const opportunityCount = issues.filter((i) => i.severity === 'opportunity').length;
  const passedCount = issues.filter((i) => i.severity === 'passed').length;

  const healthScore = latestAudit?.healthScore ?? 84;
  const techScore = latestAudit?.techScore ?? 88;
  const contentScore = latestAudit?.contentScore ?? 80;
  const metaScore = latestAudit?.metaScore ?? 78;
  const socialScore = latestAudit?.socialScore ?? 90;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRunPageSpeed = async () => {
    if (!pageSpeedUrl) return;
    setPageSpeedLoading(true);
    setPageSpeedError(null);
    try {
      const res = await fetch('/api/pagespeed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: pageSpeedUrl, strategy: pageSpeedStrategy }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPageSpeedError(data.error || 'Failed to retrieve PageSpeed');
      } else {
        setPageSpeedData(data);
      }
    } catch (err: any) {
      setPageSpeedError(err.message || 'PageSpeed request failed');
    } finally {
      setPageSpeedLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Crawl Action & Last Run Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Site Audit & Crawler Workspace</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
              {activeWebsite?.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Safe server-side scanner with SSRF protection, robots.txt compliance, and zero auto-paid calls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCrawlModalOpen(true)}
            disabled={crawling}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
          >
            {crawling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>{crawling ? 'Crawling Site...' : 'Run Public Crawl'}</span>
          </button>
        </div>
      </div>

      {/* Transparent Health Score & Four Pillar Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Main Score Box */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Transparent Health Score
              </span>
              <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                Not a Google Score
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-3">
              <span className={`text-5xl font-black ${healthScore >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {healthScore}
              </span>
              <span className="text-base font-semibold text-slate-400">/ 100</span>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Calculated using transparent architectural criteria: Technical/Crawling (25%), Content & Headings (25%), Metadata (25%), and Social & Schema (25%).
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block text-[11px]">Pages Crawled:</span>
              <span className="font-bold text-slate-900">{latestAudit?.totalPages || crawledPages.length || 18}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Last Crawl Run:</span>
              <span className="font-medium text-slate-700">
                {latestAudit?.createdAt ? new Date(latestAudit.createdAt).toLocaleDateString() : 'Ready to run'}
              </span>
            </div>
          </div>
        </div>

        {/* Pillar Sub-Scores */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Scoring Pillars Breakdown
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tech */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">1. Technical & Indexing</span>
                <span className="text-xs font-bold text-emerald-600">{techScore}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${techScore}%` }} />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">HTTP status, canonical tags, viewport</p>
            </div>

            {/* Content */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">2. Content & Headings</span>
                <span className="text-xs font-bold text-emerald-600">{contentScore}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${contentScore}%` }} />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">H1 presence, word count, image alt text</p>
            </div>

            {/* Meta */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">3. Meta & Snippets</span>
                <span className="text-xs font-bold text-amber-600">{metaScore}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${metaScore}%` }} />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">Page title length, meta description</p>
            </div>

            {/* Social & Schema */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">4. Social & Schema</span>
                <span className="text-xs font-bold text-emerald-600">{socialScore}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${socialScore}%` }} />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">Open Graph tags, Schema JSON-LD</p>
            </div>
          </div>
        </div>
      </div>

      {/* Severity Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button
          onClick={() => setSelectedSeverity('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            selectedSeverity === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Issues ({issues.length})
        </button>
        <button
          onClick={() => setSelectedSeverity('critical')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            selectedSeverity === 'critical'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50'
          }`}
        >
          Critical ({criticalCount})
        </button>
        <button
          onClick={() => setSelectedSeverity('warning')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            selectedSeverity === 'warning'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'
          }`}
        >
          Warnings ({warningCount})
        </button>
        <button
          onClick={() => setSelectedSeverity('opportunity')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            selectedSeverity === 'opportunity'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-white border border-sky-200 text-sky-700 hover:bg-sky-50'
          }`}
        >
          Opportunities ({opportunityCount})
        </button>
        <button
          onClick={() => setSelectedSeverity('passed')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            selectedSeverity === 'passed'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          Passed ({passedCount})
        </button>
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5 shrink-0">
                  {issue.severity === 'critical' && <AlertCircle className="w-5 h-5 text-rose-600" />}
                  {issue.severity === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                  {issue.severity === 'opportunity' && <Lightbulb className="w-5 h-5 text-sky-500" />}
                  {issue.severity === 'passed' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{issue.title}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        issue.severity === 'critical'
                          ? 'bg-rose-100 text-rose-800'
                          : issue.severity === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : issue.severity === 'opportunity'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {issue.severity}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize">{issue.category}</span>
                  </div>

                  <p className="text-xs text-slate-600">{issue.explanation}</p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span>
                      Affected Pages:{' '}
                      <strong className="text-slate-800">{issue.affectedPagesCount || issue.affectedPages?.length || 0}</strong>
                    </span>
                    <span>
                      Priority: <strong className="text-slate-800 uppercase">{issue.priority}</strong>
                    </span>
                    <span>
                      Effort: <strong className="text-slate-800 uppercase">{issue.effort}</strong>
                    </span>
                    <span>
                      Status: <strong className="text-emerald-700 capitalize">{issue.status}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  onClick={() => setSelectedIssue(issue)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                >
                  View Details & Fix
                </button>
                <button
                  onClick={() => onCreateTaskFromIssue(issue)}
                  title="Add to SEO Task Board"
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
              </div>
            </div>
          ))}

          {filteredIssues.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs">
              No issues found in this category.
            </div>
          )}
        </div>
      </div>

      {/* Google PageSpeed Insights Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base">Google PageSpeed & Core Web Vitals</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Selective URL inspection: Test homepage or important landing pages without running automatic mass checks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex border border-slate-200 rounded-xl overflow-hidden text-xs">
              <button
                onClick={() => setPageSpeedStrategy('mobile')}
                className={`px-3 py-1.5 flex items-center gap-1 font-medium ${
                  pageSpeedStrategy === 'mobile' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </button>
              <button
                onClick={() => setPageSpeedStrategy('desktop')}
                className={`px-3 py-1.5 flex items-center gap-1 font-medium ${
                  pageSpeedStrategy === 'desktop' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </button>
            </div>

            <button
              onClick={handleRunPageSpeed}
              disabled={pageSpeedLoading || !pageSpeedUrl}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {pageSpeedLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>{pageSpeedLoading ? 'Testing...' : 'Test Page'}</span>
            </button>
          </div>
        </div>

        <div className="mt-4">
          <input
            type="url"
            value={pageSpeedUrl}
            onChange={(e) => setPageSpeedUrl(e.target.value)}
            placeholder="https://arthurscreatives.com"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {pageSpeedError && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
            {pageSpeedError}
          </div>
        )}

        {pageSpeedData && (
          <div className="mt-6 space-y-4">
            {/* Score Quad */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Performance</span>
                <span
                  className={`text-3xl font-extrabold ${
                    pageSpeedData.scores.performance >= 90
                      ? 'text-emerald-600'
                      : pageSpeedData.scores.performance >= 50
                      ? 'text-amber-500'
                      : 'text-rose-600'
                  }`}
                >
                  {pageSpeedData.scores.performance}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Accessibility</span>
                <span className="text-3xl font-extrabold text-emerald-600">
                  {pageSpeedData.scores.accessibility}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Best Practices</span>
                <span className="text-3xl font-extrabold text-emerald-600">
                  {pageSpeedData.scores.bestPractices}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">SEO Score</span>
                <span className="text-3xl font-extrabold text-emerald-600">
                  {pageSpeedData.scores.seo}
                </span>
              </div>
            </div>

            {/* Core Web Vitals */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 block mb-2">Core Web Vitals Real-World Metrics</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">LCP</span>
                  <span className="font-bold text-slate-800">{pageSpeedData.metrics.lcp}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">CLS</span>
                  <span className="font-bold text-slate-800">{pageSpeedData.metrics.cls}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">FCP</span>
                  <span className="font-bold text-slate-800">{pageSpeedData.metrics.fcp}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">TBT</span>
                  <span className="font-bold text-slate-800">{pageSpeedData.metrics.tbt}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Speed Index</span>
                  <span className="font-bold text-slate-800">{pageSpeedData.metrics.speedIndex}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">INP</span>
                  <span className="font-bold text-slate-800">{pageSpeedData.metrics.inp}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Crawl Scope Confirmation Modal */}
      {isCrawlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Configure Public Website Crawl</h3>
            <p className="text-xs text-slate-500 mt-1">
              Target: <strong className="text-slate-900">{activeWebsite?.url}</strong>
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Maximum Pages Limit
                </label>
                <select
                  value={crawlLimit}
                  onChange={(e) => setCrawlLimit(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={10}>10 pages (Fast preview)</option>
                  <option value={25}>25 pages (Standard audit)</option>
                  <option value={50}>50 pages (Deep audit)</option>
                  <option value={100}>100 pages (Maximum safe limit)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 text-slate-600">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>SSRF & Robots.txt Protected</span>
                </div>
                <p className="text-[11px]">
                  • Crawls only approved public subdomains.<br />
                  • Ignores cart, checkout, login, and duplicate URL parameters.<br />
                  • Free server-side scan: $0.00 cost.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsCrawlModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setIsCrawlModalOpen(false);
                    await onStartCrawl(activeWebsite, crawlLimit);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
                >
                  Start Crawl Run
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue Detail & Quick-Fix Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                      selectedIssue.severity === 'critical'
                        ? 'bg-rose-100 text-rose-800'
                        : selectedIssue.severity === 'warning'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {selectedIssue.severity}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{selectedIssue.title}</h3>
                </div>
                <p className="text-xs text-slate-500">Category: {selectedIssue.category}</p>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Why it matters */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-1">Why This Issue Matters:</h4>
                <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  {selectedIssue.whyItMatters}
                </p>
              </div>

              {/* Recommended Action */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-1">Recommended Action:</h4>
                <p className="text-slate-600 leading-relaxed">{selectedIssue.recommendedAction}</p>
              </div>

              {/* Copy-Ready Correction Snippet */}
              {selectedIssue.proposedCorrection && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-slate-900 text-xs">Copy-Ready Proposed Correction:</h4>
                    <button
                      onClick={() => handleCopy(selectedIssue.proposedCorrection || '')}
                      className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 text-[11px]"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                    {selectedIssue.proposedCorrection}
                  </pre>
                </div>
              )}

              {/* Affected Pages */}
              {selectedIssue.affectedPages && selectedIssue.affectedPages.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">
                    Affected Pages ({selectedIssue.affectedPages.length}):
                  </h4>
                  <div className="max-h-32 overflow-y-auto bg-slate-50 rounded-xl border border-slate-100 p-2 space-y-1 font-mono text-[11px] text-slate-700">
                    {selectedIssue.affectedPages.map((pageUrl, idx) => (
                      <div key={idx} className="truncate">
                        • {pageUrl}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Selector */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Update Status:</span>
                  <select
                    value={selectedIssue.status}
                    onChange={(e) => onUpdateIssueStatus(selectedIssue.id, e.target.value as IssueStatus)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="applied">Applied</option>
                    <option value="verified">Verified</option>
                    <option value="ignored">Ignored</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onAskGemini(selectedIssue);
                      setSelectedIssue(null);
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Gemini AI Deep Fix</span>
                  </button>
                  <button
                    onClick={() => {
                      onCreateTaskFromIssue(selectedIssue);
                      setSelectedIssue(null);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                  >
                    Create SEO Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
