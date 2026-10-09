'use client';

import React, { useState } from 'react';
import { Website, Keyword } from '@/types/seo';
import {
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  Clock,
  ShieldAlert,
  Loader2,
  Calendar,
  Sparkles,
  ExternalLink,
  DollarSign,
} from 'lucide-react';

interface RankingsViewProps {
  activeWebsite: Website;
  trackedKeywords: Keyword[];
  onUpdateKeywords: (updated: Keyword[]) => Promise<void>;
  monthlySpent: number;
  monthlyLimit: number;
  emergencyKillswitch: boolean;
}

export default function RankingsView({
  activeWebsite,
  trackedKeywords,
  onUpdateKeywords,
  monthlySpent,
  monthlyLimit,
  emergencyKillswitch,
}: RankingsViewProps) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const websiteKeywords = trackedKeywords.filter((k) => k.websiteId === activeWebsite?.id);

  // Rankings distribution
  const top3 = websiteKeywords.filter((k) => k.currentRank && k.currentRank <= 3).length;
  const top10 = websiteKeywords.filter((k) => k.currentRank && k.currentRank <= 10).length;
  const top20 = websiteKeywords.filter((k) => k.currentRank && k.currentRank <= 20).length;
  const top100 = websiteKeywords.filter((k) => k.currentRank && k.currentRank <= 100).length;

  const handleManualCheck = async () => {
    if (websiteKeywords.length === 0) return;

    setChecking(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/dataforseo/rank-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: websiteKeywords,
          websiteUrl: activeWebsite.url,
          monthlySpent,
          monthlyLimit,
          emergencyKillswitch,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to execute rank check');
      } else {
        const resultsMap = new Map(data.results.map((r: any) => [r.id, r]));
        const updated = websiteKeywords.map((kw) => {
          const fresh = resultsMap.get(kw.id) as any;
          if (fresh) {
            return {
              ...kw,
              previousRank: fresh.previousRank,
              currentRank: fresh.currentRank,
              bestRank: fresh.bestRank,
              statusLabel: fresh.statusLabel,
              lastUpdated: fresh.checkedAt,
            };
          }
          return kw;
        });

        await onUpdateKeywords(updated);
        setSuccessMsg(`Successfully verified ${data.totalChecked} rankings. Estimated API cost: $${(data.estimatedCost || 0).toFixed(3)}`);
      }
    } catch (err: any) {
      setError(err.message || 'Rank check network error');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Safeguards Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Rank Tracking Dashboard</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
              {activeWebsite.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manual and weekly scheduled tracking. Continuous daily paid sweeps disabled by default for budget protection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <div className="text-[11px] text-slate-400">Est. check cost:</div>
            <div className="text-xs font-semibold text-slate-800">
              ${(websiteKeywords.length * 0.002).toFixed(3)} ({websiteKeywords.length} terms)
            </div>
          </div>
          <button
            onClick={handleManualCheck}
            disabled={checking || websiteKeywords.length === 0 || emergencyKillswitch}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
          >
            {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>{checking ? 'Checking...' : 'Check Current Rankings'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Ranks Ladder Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Top 3 Positions</span>
          <span className="text-3xl font-extrabold text-emerald-600 mt-2 block">{top3}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Maximum CTR visibility</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Top 10 (Page 1)</span>
          <span className="text-3xl font-extrabold text-slate-900 mt-2 block">{top10}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Primary organic traffic</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Top 20 (Page 2)</span>
          <span className="text-3xl font-extrabold text-slate-900 mt-2 block">{top20}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Striking distance opportunities</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Top 100</span>
          <span className="text-3xl font-extrabold text-slate-900 mt-2 block">{top100}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Indexed & tracked</span>
        </div>
      </div>

      {/* Rankings Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            Keyword Position History ({websiteKeywords.length})
          </h3>
          <span className="text-xs text-slate-500">
            Weekly refresh schedule active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-6">Tracked Term</th>
                <th className="py-3 px-4">Current Rank</th>
                <th className="py-3 px-4">Prev Rank</th>
                <th className="py-3 px-4">Best Rank</th>
                <th className="py-3 px-4">Rank Shift</th>
                <th className="py-3 px-4">Status Label</th>
                <th className="py-3 px-4">Assigned Landing Page</th>
                <th className="py-3 px-6 text-right">Last Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {websiteKeywords.map((kw) => {
                const shift = (kw.previousRank && kw.currentRank) ? kw.previousRank - kw.currentRank : 0;
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
                    <td className="py-3.5 px-4 font-bold text-sm">
                      {kw.currentRank ? (
                        <span className={kw.currentRank <= 3 ? 'text-emerald-600' : kw.currentRank <= 10 ? 'text-slate-900' : 'text-slate-600'}>
                          #{kw.currentRank}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">100+</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">
                      {kw.previousRank ? `#${kw.previousRank}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">
                      {kw.bestRank ? `#${kw.bestRank}` : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {shift > 0 ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                          <ArrowUp className="w-3.5 h-3.5" /> +{shift}
                        </span>
                      ) : shift < 0 ? (
                        <span className="text-rose-600 font-bold flex items-center gap-0.5">
                          <ArrowDown className="w-3.5 h-3.5" /> {shift}
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-0.5">
                          <Minus className="w-3.5 h-3.5" /> 0
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          kw.statusLabel === 'improved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : kw.statusLabel === 'declined'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {kw.statusLabel || 'steady'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {kw.assignedPageUrl || (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right text-slate-400 font-mono text-[11px]">
                      {kw.lastUpdated ? new Date(kw.lastUpdated).toLocaleDateString() : 'Pending'}
                    </td>
                  </tr>
                );
              })}

              {websiteKeywords.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    No keywords tracked for this website yet. Add keywords from the Keywords workspace.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
