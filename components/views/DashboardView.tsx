'use client';

import React, { useState } from 'react';
import {
  Website,
  AuditRun,
  AuditIssue,
  Keyword,
  SeoTask,
  IntegrationSetting,
} from '@/types/seo';
import { NavTab } from '../Navbar';
import {
  Globe,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  TrendingUp,
  MousePointerClick,
  Eye,
  Percent,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
  SearchCode,
  DollarSign,
  ChevronRight,
  FileQuestion,
  Calendar,
  Gauge,
} from 'lucide-react';

interface DashboardViewProps {
  websites: Website[];
  activeWebsite: Website;
  auditRuns: AuditRun[];
  auditIssues: AuditIssue[];
  keywords: Keyword[];
  tasks: SeoTask[];
  integrations: IntegrationSetting[];
  onNavigate: (tab: NavTab) => void;
  monthlySpent: number;
  monthlyLimit: number;
}

export default function DashboardView({
  websites,
  activeWebsite,
  auditRuns,
  auditIssues,
  keywords,
  tasks,
  integrations,
  onNavigate,
  monthlySpent,
  monthlyLimit,
}: DashboardViewProps) {
  const [dateRange, setDateRange] = useState('Last 30 Days');

  const latestAudit = auditRuns.find((a) => a.websiteId === activeWebsite?.id) || auditRuns[0];
  const activeIssues = auditIssues.filter((i) => i.websiteId === activeWebsite?.id && i.status === 'open');

  const criticalIssuesCount = activeIssues.filter((i) => i.severity === 'critical').length;
  const warningIssuesCount = activeIssues.filter((i) => i.severity === 'warning').length;
  const opportunityIssuesCount = activeIssues.filter((i) => i.severity === 'opportunity').length;

  const activeKeywords = keywords.filter((k) => k.websiteId === activeWebsite?.id);
  const top3Keywords = activeKeywords.filter((k) => k.currentRank && k.currentRank <= 3).length;
  const top10Keywords = activeKeywords.filter((k) => k.currentRank && k.currentRank <= 10).length;
  const top20Keywords = activeKeywords.filter((k) => k.currentRank && k.currentRank <= 20).length;
  const top100Keywords = activeKeywords.filter((k) => k.currentRank && k.currentRank <= 100).length;

  const openTasks = tasks.filter((t) => t.websiteId === activeWebsite?.id && t.status !== 'completed' && t.status !== 'ignored');
  const focusedTasks = openTasks.slice(0, 2); // Max 2 active tasks focus

  const healthScore = activeWebsite?.healthScore ?? (latestAudit?.healthScore || 82);

  // Score badge color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Active Website Summary & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <Globe className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{activeWebsite?.name}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                {activeWebsite?.platform || 'Custom'}
              </span>
            </div>
            <a
              href={activeWebsite?.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-500 hover:text-emerald-600 font-medium inline-flex items-center gap-1"
            >
              {activeWebsite?.url}
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Date filter & Audit trigger */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent font-medium focus:outline-none cursor-pointer"
            >
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
              <option>All Time</option>
            </select>
          </div>

          <button
            onClick={() => onNavigate('pagespeed')}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>PageSpeed Audit</span>
          </button>

          <button
            onClick={() => onNavigate('audit')}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <SearchCode className="w-3.5 h-3.5" />
            <span>Run Public Audit</span>
          </button>
        </div>
      </div>

      {/* Row 1: Core Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Transparent Health Score */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              SEO Health Score
            </span>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
              Transparent Model
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className={`text-4xl font-extrabold ${healthScore >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {healthScore}
            </span>
            <span className="text-sm font-medium text-slate-400">/ 100</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Weighted across Technical (25%), Content (25%), Meta (25%), & Social/Schema (25%).
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Passes {latestAudit?.passedCount || 12} criteria</span>
            <button
              onClick={() => onNavigate('audit')}
              className="text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-0.5"
            >
              View breakdown <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Metric 2: Open Issues Triad */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Audit Findings
            </span>
            <span className="text-[10px] text-slate-400">Crawl Snapshot</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="bg-rose-50/70 border border-rose-100 p-2 rounded-xl">
              <div className="text-xl font-bold text-rose-600">{criticalIssuesCount}</div>
              <div className="text-[11px] font-medium text-rose-700 mt-0.5">Critical</div>
            </div>
            <div className="bg-amber-50/70 border border-amber-100 p-2 rounded-xl">
              <div className="text-xl font-bold text-amber-600">{warningIssuesCount}</div>
              <div className="text-[11px] font-medium text-amber-700 mt-0.5">Warnings</div>
            </div>
            <div className="bg-sky-50/70 border border-sky-100 p-2 rounded-xl">
              <div className="text-xl font-bold text-sky-600">{opportunityIssuesCount}</div>
              <div className="text-[11px] font-medium text-sky-700 mt-0.5">Opps</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2 line-clamp-1">
            {criticalIssuesCount > 0 ? 'Critical tags require urgent attention' : 'No critical crawl blockers'}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">{activeIssues.length} total open</span>
            <button
              onClick={() => onNavigate('audit')}
              className="text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-0.5"
            >
              Inspect issues <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Metric 3: Search Console Overview */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Google Performance
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Search Console</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-500">Google Clicks</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">1,482</div>
              <div className="text-[11px] text-emerald-600 flex items-center font-medium mt-0.5">
                <ArrowUpRight className="w-3 h-3 mr-0.5" /> +14.2%
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Impressions</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">48.6K</div>
              <div className="text-[11px] text-emerald-600 flex items-center font-medium mt-0.5">
                <ArrowUpRight className="w-3 h-3 mr-0.5" /> +8.7%
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Avg Position: <strong className="text-slate-900 font-semibold">12.4</strong></span>
            <span>Avg CTR: <strong className="text-slate-900 font-semibold">3.05%</strong></span>
          </div>
        </div>

        {/* Metric 4: Keyword Rankings Ladder */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Rank Distribution
            </span>
            <span className="text-[10px] text-slate-400">{activeKeywords.length} tracked</span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
              <div className="text-xs font-bold text-emerald-600">{top3Keywords}</div>
              <div className="text-[10px] text-slate-500">Top 3</div>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
              <div className="text-xs font-bold text-slate-800">{top10Keywords}</div>
              <div className="text-[10px] text-slate-500">Top 10</div>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
              <div className="text-xs font-bold text-slate-800">{top20Keywords}</div>
              <div className="text-[10px] text-slate-500">Top 20</div>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
              <div className="text-xs font-bold text-slate-800">{top100Keywords}</div>
              <div className="text-[10px] text-slate-500">Top 100</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Gains/Losses: <strong className="text-emerald-600">+3</strong> / <strong className="text-rose-500">-1</strong></span>
            <button
              onClick={() => onNavigate('rankings')}
              className="text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-0.5"
            >
              Track rankings <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Focused 2-Task Workload & Cost Protection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Focused Active Tasks */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Active Execution Priorities (Max 2 Tasks Focus)
                </h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                  Focused Mode
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Keeps Arthur’s workload structured by executing two high-leverage pages/fixes at a time.
              </p>
            </div>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1"
            >
              View Board ({openTasks.length}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {focusedTasks.length > 0 ? (
              focusedTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors bg-slate-50/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                            t.priority === 'high'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {t.priority}
                        </span>
                        <span className="text-xs font-semibold text-slate-900">{t.title}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{t.description}</p>
                      {t.proposedValue && (
                        <div className="mt-2 text-xs bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-slate-700">
                          <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold mb-0.5">
                            Proposed Correction:
                          </span>
                          {t.proposedValue}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">All prioritized tasks completed!</p>
                <p className="text-xs text-slate-500 mt-1">
                  Run an audit or review recommendations to select your next 2 priorities.
                </p>
                <button
                  onClick={() => onNavigate('recommendations')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium"
                >
                  Browse Recommendations
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Cost Controls & Sync Status */}
        <div className="space-y-6">
          {/* Monthly Budget Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                DataForSEO Cost Safeguard
              </span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>

            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900">${monthlySpent.toFixed(2)}</span>
                <span className="text-xs text-slate-500">Limit: ${monthlyLimit.toFixed(2)} / mo</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (monthlySpent / monthlyLimit) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Calls cached for 24h. No automatic daily rank checks; weekly tracking recommended.
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Emergency switch: <strong className="text-emerald-600">Active</strong></span>
              <button
                onClick={() => onNavigate('settings')}
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Configure
              </button>
            </div>
          </div>

          {/* Sync Health & Integrations overview */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Connected Services
              </span>
              <button
                onClick={() => onNavigate('integrations')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Manage
              </button>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              {integrations.slice(0, 4).map((integ) => (
                <div key={integ.provider} className="flex items-center justify-between py-1">
                  <span className="text-slate-700 font-medium">{integ.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      integ.isConnected
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {integ.isConnected ? 'Connected' : 'Planned / Standby'}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last synchronized: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
