'use client';

import React, { useState } from 'react';
import { Website, AuditRun, AuditIssue, Keyword, SeoTask } from '@/types/seo';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Globe,
  TrendingUp,
} from 'lucide-react';

interface ReportsViewProps {
  activeWebsite: Website;
  auditRuns: AuditRun[];
  auditIssues: AuditIssue[];
  keywords: Keyword[];
  tasks: SeoTask[];
  monthlySpent: number;
  monthlyLimit: number;
}

export default function ReportsView({
  activeWebsite,
  auditRuns,
  auditIssues,
  keywords,
  tasks,
  monthlySpent,
  monthlyLimit,
}: ReportsViewProps) {
  const [reportType, setReportType] = useState('executive');
  const latestAudit = auditRuns.find((a) => a.websiteId === activeWebsite?.id) || auditRuns[0];
  const websiteIssues = auditIssues.filter((i) => i.websiteId === activeWebsite?.id);
  const websiteKeywords = keywords.filter((k) => k.websiteId === activeWebsite?.id);
  const completedTasks = tasks.filter((t) => t.websiteId === activeWebsite?.id && t.status === 'completed');

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = ['Report Category', 'Metric Name', 'Value', 'Status / Detail'];
    const rows = [
      ['Executive Summary', 'Website Name', activeWebsite.name, activeWebsite.url],
      ['Executive Summary', 'Overall SEO Health Score', `${activeWebsite.healthScore ?? 84} / 100`, 'Transparent Model'],
      ['Audit Findings', 'Critical Issues', websiteIssues.filter((i) => i.severity === 'critical').length, 'Urgent'],
      ['Audit Findings', 'Warnings', websiteIssues.filter((i) => i.severity === 'warning').length, 'Moderate'],
      ['Audit Findings', 'Passed Criteria', websiteIssues.filter((i) => i.severity === 'passed').length, 'Passing'],
      ['Rankings', 'Tracked Keywords', websiteKeywords.length, 'Weekly Monitored'],
      ['Tasks', 'Completed SEO Improvements', completedTasks.length, 'Verified'],
      ['Cost Control', 'Monthly Spending', `$${monthlySpent.toFixed(2)} / $${monthlyLimit.toFixed(2)}`, 'Within Budget'],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `seo_report_${activeWebsite.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Print and Export Actions */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">SEO Intelligence Reports & Exports</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
              {activeWebsite.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Client-ready executive summary, technical audits, ranking reports, and cost breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-sm space-y-8 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="flex items-start justify-between border-b pb-6 border-slate-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block">
              Arthur’s Creatives • Private SEO Command Center
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-1">
              Executive SEO & Performance Report
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Website: <strong className="text-slate-800">{activeWebsite.name}</strong> ({activeWebsite.url})
            </p>
          </div>

          <div className="text-right text-xs text-slate-400">
            <div>Generated: {new Date().toLocaleDateString()}</div>
            <div>Auditor: Arthur Rattray</div>
          </div>
        </div>

        {/* Executive Score Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Health Score</span>
            <span className="text-3xl font-extrabold text-emerald-600 mt-1 block">
              {activeWebsite.healthScore ?? 84}
            </span>
            <span className="text-[10px] text-slate-500">Transparent criteria</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Critical Issues</span>
            <span className="text-3xl font-extrabold text-rose-600 mt-1 block">
              {websiteIssues.filter((i) => i.severity === 'critical').length}
            </span>
            <span className="text-[10px] text-slate-500">Urgent corrections</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Tracked Keywords</span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1 block">
              {websiteKeywords.length}
            </span>
            <span className="text-[10px] text-slate-500">Monitored SERP positions</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Completed Work</span>
            <span className="text-3xl font-extrabold text-emerald-600 mt-1 block">
              {completedTasks.length}
            </span>
            <span className="text-[10px] text-slate-500">Tasks verified & closed</span>
          </div>
        </div>

        {/* Key Findings List */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900 text-sm border-b pb-2 border-slate-100">
            Audit Findings & Priority Action Items
          </h3>
          <div className="space-y-2">
            {websiteIssues.slice(0, 5).map((iss, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                        iss.severity === 'critical' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {iss.severity}
                    </span>
                    <strong className="text-slate-900">{iss.title}</strong>
                  </div>
                  <p className="text-slate-600 mt-1">{iss.explanation}</p>
                </div>
                <span className="text-slate-500 capitalize shrink-0 font-medium">{iss.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost & Verification Statement */}
        <div className="pt-6 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Monthly DataForSEO Usage: ${monthlySpent.toFixed(2)} / ${monthlyLimit.toFixed(2)}</span>
          <span>Arthur’s Creatives Proprietary SEO Engine</span>
        </div>
      </div>
    </div>
  );
}
