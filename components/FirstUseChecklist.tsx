'use client';

import React, { useState } from 'react';
import { NavTab } from './Navbar';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles, ArrowRight } from 'lucide-react';

interface FirstUseChecklistProps {
  onNavigate: (tab: NavTab) => void;
  websitesCount: number;
  auditsCount: number;
  keywordsCount: number;
  recommendationsCount: number;
  tasksCount: number;
  dataForSeoConnected: boolean;
  gscConnected: boolean;
}

export default function FirstUseChecklist({
  onNavigate,
  websitesCount,
  auditsCount,
  keywordsCount,
  recommendationsCount,
  tasksCount,
  dataForSeoConnected,
  gscConnected,
}: FirstUseChecklistProps) {
  const [isOpen, setIsOpen] = useState(true);

  const steps = [
    {
      id: 1,
      title: 'Add a website',
      desc: 'Register Arthur’s Creatives or another client domain.',
      completed: websitesCount > 0,
      tab: 'websites' as NavTab,
    },
    {
      id: 2,
      title: 'Verify public URL & sitemap',
      desc: 'Check robots.txt, SSL certificate, and discover public pages.',
      completed: websitesCount > 0,
      tab: 'websites' as NavTab,
    },
    {
      id: 3,
      title: 'Connect DataForSEO',
      desc: 'Configure API Login & Password with cost spending safeguards.',
      completed: dataForSeoConnected,
      tab: 'integrations' as NavTab,
    },
    {
      id: 4,
      title: 'Connect Google Search Console',
      desc: 'Link verified property for real clicks, impressions, and index status.',
      completed: gscConnected,
      tab: 'gsc' as NavTab,
    },
    {
      id: 5,
      title: 'Select a Search Console property',
      desc: 'Attach the exact Search Console property to your active website.',
      completed: gscConnected,
      tab: 'gsc' as NavTab,
    },
    {
      id: 6,
      title: 'Run the first public crawl',
      desc: 'Execute safe server-side crawl to discover on-page issues and health score.',
      completed: auditsCount > 0,
      tab: 'audit' as NavTab,
    },
    {
      id: 7,
      title: 'Audit core pages with PageSpeed',
      desc: 'Inspect mobile & desktop Core Web Vitals (LCP, INP, CLS).',
      completed: auditsCount > 0,
      tab: 'audit' as NavTab,
    },
    {
      id: 8,
      title: 'Research the first keywords',
      desc: 'Analyze search volume, intent, and calculate Opportunity Score.',
      completed: keywordsCount > 0,
      tab: 'keywords' as NavTab,
    },
    {
      id: 9,
      title: 'Review Gemini SEO recommendations',
      desc: 'Generate human-first metadata, headings, and schema recommendations.',
      completed: recommendationsCount > 0,
      tab: 'recommendations' as NavTab,
    },
    {
      id: 10,
      title: 'Create the first two SEO tasks',
      desc: 'Focus effort on two high-leverage fixes on your task board.',
      completed: tasksCount >= 2,
      tab: 'tasks' as NavTab,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-4 flex items-center justify-between cursor-pointer bg-gradient-to-r from-slate-50 via-emerald-50/20 to-white hover:bg-slate-50/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 text-sm">
                First-Use Launch Checklist
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                {completedCount} / {steps.length} Complete ({progressPercent}%)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Complete these 10 steps to establish continuous SEO monitoring and execution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="w-32 bg-slate-200 rounded-full h-2 overflow-hidden hidden sm:block">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <button className="text-slate-400 hover:text-slate-600 p-1">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 bg-white">
          {steps.map((step) => (
            <div
              key={step.id}
              onClick={() => onNavigate(step.tab)}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                step.completed
                  ? 'bg-emerald-50/40 border-emerald-200/60 text-slate-700'
                  : 'bg-slate-50/70 border-slate-200/80 hover:border-emerald-300 hover:bg-white text-slate-800'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold ${
                      step.completed ? 'line-through text-slate-500' : 'text-slate-900'
                    }`}
                  >
                    {step.id}. {step.title}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0 ml-1 opacity-0 group-hover:opacity-100" />
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
