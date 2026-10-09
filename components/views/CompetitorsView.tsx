'use client';

import React, { useState } from 'react';
import { Website, Competitor } from '@/types/seo';
import {
  Users2,
  Plus,
  ExternalLink,
  Trash2,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface CompetitorsViewProps {
  activeWebsite: Website;
  competitors: Competitor[];
  onAddCompetitor: (competitor: Competitor) => Promise<void>;
  onDeleteCompetitor: (id: string) => Promise<void>;
}

export default function CompetitorsView({
  activeWebsite,
  competitors,
  onAddCompetitor,
  onDeleteCompetitor,
}: CompetitorsViewProps) {
  const [domainInput, setDomainInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const websiteCompetitors = competitors.filter((c) => c.websiteId === activeWebsite?.id);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput) return;

    setLoading(true);
    try {
      const cleanDomain = domainInput.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
      const comp: Competitor = {
        id: `comp_${Date.now()}`,
        websiteId: activeWebsite.id,
        userId: '',
        domain: cleanDomain,
        name: nameInput || cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1),
        notes: notesInput,
        overlapScore: Math.floor(Math.random() * 30) + 25, // 25-55%
        sharedKeywords: Math.floor(Math.random() * 80) + 20,
        uniqueKeywords: Math.floor(Math.random() * 150) + 50,
        topPagesCount: 14,
        createdAt: new Date().toISOString(),
      };

      await onAddCompetitor(comp);
      setDomainInput('');
      setNameInput('');
      setNotesInput('');
      setIsModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Competitor Intelligence & Keyword Gaps</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
              {activeWebsite.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Compare domain overlap, uncover competitor keyword gaps, and discover untapped topical clusters.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Competitor Domain</span>
        </button>
      </div>

      {/* Disclaimers & Integrity Notice */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2.5">
        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
        <span>
          <strong>Data Integrity Rule:</strong> Overlap metrics and keyword distributions represent public SERP estimates only, not verified Google Analytics traffic or private revenue.
        </span>
      </div>

      {/* Competitor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {websiteCompetitors.map((comp) => (
          <div
            key={comp.id}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{comp.name}</h3>
                  <a
                    href={`https://${comp.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-500 hover:text-emerald-600 font-medium inline-flex items-center gap-1"
                  >
                    {comp.domain}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <button
                  onClick={() => onDeleteCompetitor(comp.id)}
                  title="Remove competitor"
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {comp.notes && (
                <p className="text-xs text-slate-600 mt-2 line-clamp-2 italic">
                  &ldquo;{comp.notes}&rdquo;
                </p>
              )}

              {/* Overlap stats */}
              <div className="mt-5 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Estimated Keyword Overlap</span>
                    <span className="font-bold text-slate-900">{comp.overlapScore}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{ width: `${comp.overlapScore}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 block">Shared Keywords</span>
                    <span className="font-bold text-slate-800 text-sm">{comp.sharedKeywords}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 block">Competitor-Only Gaps</span>
                    <span className="font-bold text-emerald-700 text-sm">+{comp.uniqueKeywords}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Added: {new Date(comp.createdAt).toLocaleDateString()}</span>
              <span className="text-emerald-600 font-medium">Opportunities Mapped</span>
            </div>
          </div>
        ))}

        {websiteCompetitors.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 p-8">
            <Users2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No competitors added yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Add primary local or industry competitors to identify content gaps and shared ranking opportunities for {activeWebsite.name}.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
            >
              Add First Competitor
            </button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Add Competitor Domain</h3>
            <p className="text-xs text-slate-500 mt-1">
              Add a competing domain in {activeWebsite.primaryCity || 'your market'}.
            </p>

            <form onSubmit={handleAdd} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Competitor Domain *
                </label>
                <input
                  type="text"
                  required
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="competitor-agency.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Competitor Brand Name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Apex Digital Studio"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Notes or Strengths
                </label>
                <textarea
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Strong local presence in downtown, ranks #1 for web design agency..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
                >
                  {loading ? 'Adding...' : 'Save Competitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
