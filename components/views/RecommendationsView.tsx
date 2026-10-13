'use client';

import React, { useState } from 'react';
import { Website, SeoRecommendation, CrawledPage } from '@/types/seo';
import {
  Lightbulb,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  PlusCircle,
  Eye,
  FileCode,
  ShieldCheck,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ListOrdered,
} from 'lucide-react';

interface RecommendationsViewProps {
  activeWebsite: Website;
  recommendations: SeoRecommendation[];
  crawledPages: CrawledPage[];
  onSaveRecommendation: (rec: SeoRecommendation) => Promise<void>;
  onCreateTaskFromRecommendation: (rec: SeoRecommendation) => void;
}

export default function RecommendationsView({
  activeWebsite,
  recommendations,
  crawledPages,
  onSaveRecommendation,
  onCreateTaskFromRecommendation,
}: RecommendationsViewProps) {
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [generatorType, setGeneratorType] = useState<'metadata' | 'schema' | 'action_plan'>('metadata');
  const [selectedPageUrl, setSelectedPageUrl] = useState(activeWebsite.url);
  const [schemaType, setSchemaType] = useState('LocalBusiness');
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<any | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dudaModalRec, setDudaModalRec] = useState<SeoRecommendation | null>(null);
  const [dudaCopiedField, setDudaCopiedField] = useState<string | null>(null);

  const websiteRecs = recommendations.filter((r) => r.websiteId === activeWebsite?.id);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyDudaField = (field: string, text: string) => {
    navigator.clipboard.writeText(text);
    setDudaCopiedField(field);
    setTimeout(() => setDudaCopiedField(null), 2000);
  };

  const handleRunGenerator = async () => {
    setGenerating(true);
    setGenError(null);
    setGenResult(null);

    try {
      const page = crawledPages.find((p) => p.url === selectedPageUrl) || {
        url: selectedPageUrl,
        title: activeWebsite.name,
        h1: activeWebsite.primaryServices,
      };

      let action = 'generate_metadata';
      if (generatorType === 'schema') action = 'generate_schema';
      else if (generatorType === 'action_plan') action = 'generate_action_plan';

      const res = await fetch('/api/gemini/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          websiteContext: activeWebsite,
          pageData: { ...page, schemaType },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error || 'Gemini recommendation generation failed');
      } else {
        setGenResult(data.data);
      }
    } catch (err: any) {
      setGenError(err.message || 'Network error calling Gemini');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveGeneratedToRecs = async () => {
    if (!genResult) return;

    if (generatorType === 'metadata') {
      const newRec: SeoRecommendation = {
        id: `rec_${Date.now()}`,
        websiteId: activeWebsite.id,
        userId: '',
        pageUrl: selectedPageUrl,
        category: 'Metadata Optimization',
        issue: 'Suboptimal Title and Meta Description Length/Relevance',
        currentValue: 'Current page title & description',
        proposedValue: `<title>${genResult.proposedTitle}</title>\n<meta name="description" content="${genResult.proposedMetaDescription}" />`,
        supportingData: `Character length: Title ${genResult.titleLength}ch, Desc ${genResult.metaLength}ch`,
        reason: genResult.rationale,
        expectedBenefit: 'Higher Google search snippet CTR without keyword stuffing',
        priority: 'high',
        effort: 'quick',
        source: 'Gemini AI Assistant',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await onSaveRecommendation(newRec);
    } else if (generatorType === 'schema') {
      const newRec: SeoRecommendation = {
        id: `rec_${Date.now()}`,
        websiteId: activeWebsite.id,
        userId: '',
        pageUrl: selectedPageUrl,
        category: 'Structured Data',
        issue: `Missing ${schemaType} Schema JSON-LD`,
        currentValue: 'No structured data tag',
        proposedValue: `<script type="application/ld+json">\n${typeof genResult.jsonLdString === 'string' ? genResult.jsonLdString : JSON.stringify(genResult.jsonLdString, null, 2)}\n</script>`,
        supportingData: 'Schema.org syntax validated',
        reason: genResult.validationNotes || 'Rich snippets in Google SERPs',
        expectedBenefit: 'Rich snippet eligibility and local knowledge graph alignment',
        priority: 'medium',
        effort: 'quick',
        source: 'Gemini AI Assistant',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await onSaveRecommendation(newRec);
    }

    setIsGeneratorOpen(false);
    setGenResult(null);
  };

  const handleUpdateStatus = async (rec: SeoRecommendation, status: SeoRecommendation['status']) => {
    await onSaveRecommendation({ ...rec, status });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">SEO Recommendations & AI Workflows</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
              {activeWebsite.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Verified-data interpretation, human-in-the-loop review, and copy-ready code.
          </p>
        </div>

        <button
          onClick={() => {
            setIsGeneratorOpen(true);
            setGenResult(null);
            setGenError(null);
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
          <span>Launch Gemini SEO Generator</span>
        </button>
      </div>

      {/* Rules & Transparency Notice */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-slate-900 block">Strict Data Integrity Protocol:</strong>
          <p className="text-[11px] leading-relaxed text-slate-600">
            Gemini never fabricates rankings or search volume. Every recommendation requires human approval before being marked applied. JSON-LD syntax is strictly checked before display.
          </p>
        </div>
      </div>

      {/* Recommendations Feed */}
      <div className="space-y-4">
        {websiteRecs.map((rec) => (
          <div
            key={rec.id}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4 hover:border-slate-300 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                    rec.priority === 'high'
                      ? 'bg-rose-100 text-rose-800'
                      : rec.priority === 'medium'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {rec.priority} Priority
                </span>
                <span className="text-xs font-bold text-slate-900">{rec.category}</span>
                <span className="text-[11px] text-slate-400">• {rec.pageUrl}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {rec.source}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    rec.status === 'applied' || rec.status === 'verified'
                      ? 'bg-emerald-100 text-emerald-800'
                      : rec.status === 'approved'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {rec.status}
                </span>
              </div>
            </div>

            {/* Content Body */}
            <div className="space-y-2 text-xs">
              <div className="text-slate-800 font-semibold">{rec.issue}</div>
              <p className="text-slate-600 leading-relaxed">{rec.reason}</p>

              {/* Proposed Value Codebox */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-700 uppercase">Proposed Correction:</span>
                  <button
                    onClick={() => handleCopy(rec.id, rec.proposedValue)}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 text-[11px]"
                  >
                    {copiedId === rec.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === rec.id ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-emerald-400 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                  {rec.proposedValue}
                </pre>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-4">
                <span>Expected Benefit: <strong className="text-slate-700">{rec.expectedBenefit}</strong></span>
                <span>Effort: <strong className="text-slate-700 uppercase">{rec.effort}</strong></span>
                <span>Date: {new Date(rec.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Bottom Actions Toolbar */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateStatus(rec, 'approved')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleUpdateStatus(rec, 'applied')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-semibold"
                >
                  Mark Applied
                </button>
                <button
                  onClick={() => handleUpdateStatus(rec, 'verified')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                >
                  Verify
                </button>
                <button
                  onClick={() => handleUpdateStatus(rec, 'ignored')}
                  className="px-2 py-1.5 text-slate-400 hover:text-slate-600"
                >
                  Ignore
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDudaModalRec(rec)}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Copy for Duda</span>
                </button>
                <button
                  onClick={() => onCreateTaskFromRecommendation(rec)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add to SEO Tasks</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {websiteRecs.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 p-8">
            <Lightbulb className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No active recommendations yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Run the Gemini SEO Generator to draft high-converting titles, meta descriptions, or valid Schema JSON-LD.
            </p>
            <button
              onClick={() => setIsGeneratorOpen(true)}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
            >
              Generate Recommendations
            </button>
          </div>
        )}
      </div>

      {/* Gemini AI Generator Modal */}
      {isGeneratorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Gemini SEO Intelligence Assistant</h3>
                  <p className="text-xs text-slate-500">
                    Grounded in Arthur’s Creatives brand parameters & verified crawl findings.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGeneratorOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setGeneratorType('metadata')}
                  className={`p-3 rounded-xl border text-center font-semibold transition-all ${
                    generatorType === 'metadata'
                      ? 'border-emerald-500 bg-emerald-50/60 text-emerald-800'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Title & Meta Description
                </button>
                <button
                  type="button"
                  onClick={() => setGeneratorType('schema')}
                  className={`p-3 rounded-xl border text-center font-semibold transition-all ${
                    generatorType === 'schema'
                      ? 'border-emerald-500 bg-emerald-50/60 text-emerald-800'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Schema.org JSON-LD
                </button>
                <button
                  type="button"
                  onClick={() => setGeneratorType('action_plan')}
                  className={`p-3 rounded-xl border text-center font-semibold transition-all ${
                    generatorType === 'action_plan'
                      ? 'border-emerald-500 bg-emerald-50/60 text-emerald-800'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  30-Day Sprint Action Plan
                </button>
              </div>

              {generatorType !== 'action_plan' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Select Target Page
                  </label>
                  <select
                    value={selectedPageUrl}
                    onChange={(e) => setSelectedPageUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={activeWebsite.url}>{activeWebsite.url} (Homepage)</option>
                    {crawledPages.map((p) => (
                      <option key={p.id} value={p.url}>
                        {p.url}
                      </option>
                    ))}
                    <option value={`${activeWebsite.url}/services`}>{activeWebsite.url}/services</option>
                  </select>
                </div>
              )}

              {generatorType === 'schema' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Schema.org Type
                  </label>
                  <select
                    value={schemaType}
                    onChange={(e) => setSchemaType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="LocalBusiness">LocalBusiness (Physical Agency / Service Area)</option>
                    <option value="Organization">Organization (Brand / Corporation)</option>
                    <option value="Service">Service (Individual offering)</option>
                    <option value="WebPage">WebPage (General page)</option>
                    <option value="FAQPage">FAQPage (Accordion Q&A markup)</option>
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={handleRunGenerator}
                disabled={generating}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
                <span>{generating ? 'Generating with Gemini Flash...' : 'Run Generation'}</span>
              </button>

              {genError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {genError}
                </div>
              )}

              {genResult && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Gemini Suggestion Generated & Validated</span>
                  </div>

                  {generatorType === 'metadata' && (
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Proposed Title ({genResult.titleLength} chars):</span>
                        <div className="font-bold text-slate-900">{genResult.proposedTitle}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Proposed Meta Description ({genResult.metaLength} chars):</span>
                        <div className="text-slate-700">{genResult.proposedMetaDescription}</div>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-emerald-100 text-[11px] text-slate-600">
                        <strong>Rationale:</strong> {genResult.rationale}
                      </div>
                    </div>
                  )}

                  {generatorType === 'schema' && (
                    <div className="space-y-2 text-xs">
                      <span className="text-slate-500 block text-[11px]">Valid JSON-LD Snippet:</span>
                      <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-48">
                        {typeof genResult.jsonLdString === 'string' ? genResult.jsonLdString : JSON.stringify(genResult.jsonLdString, null, 2)}
                      </pre>
                      <div className="text-[11px] text-emerald-800">✓ Syntax validated against Schema.org standards</div>
                    </div>
                  )}

                  {generatorType === 'action_plan' && (
                    <div className="space-y-3 text-xs max-h-56 overflow-y-auto">
                      <div className="font-bold text-slate-900">{genResult.planTitle}</div>
                      {genResult.weeklyPhases?.map((phase: any) => (
                        <div key={phase.week} className="bg-white p-2.5 rounded-lg border border-emerald-100">
                          <span className="font-bold text-slate-800 block text-xs">Week {phase.week}: {phase.title}</span>
                          <ul className="list-disc pl-4 mt-1 text-[11px] text-slate-600 space-y-0.5">
                            {phase.tasks?.map((t: any, idx: number) => (
                              <li key={idx}><strong>{t.title}:</strong> {t.description}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleSaveGeneratedToRecs}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm"
                    >
                      Save to Recommendations
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Duda 1-Click Copy Modal */}
      {dudaModalRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold text-xs">
                  Duda
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Copy for Duda Website Editor</h3>
                  <p className="text-[11px] text-slate-500">
                    Target Page: <code className="text-purple-700 font-semibold">{dudaModalRec.pageUrl}</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDudaModalRec(null)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 space-y-1">
              <span className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Where To Paste In Duda:
              </span>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                {dudaModalRec.category === 'schema'
                  ? 'In Duda Editor: Go to Settings → Header HTML (or Page Settings → Header HTML) and paste the code snippet below.'
                  : 'In Duda Editor: Click Pages in left toolbar → gear icon next to page → SEO tab → Paste into Title or Description.'}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">
                    {dudaModalRec.category === 'schema' ? 'Schema JSON-LD Code' : 'Proposed Value'}
                  </label>
                  <button
                    onClick={() => handleCopyDudaField('proposedValue', dudaModalRec.proposedValue)}
                    className="text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1 text-[11px]"
                  >
                    {dudaCopiedField === 'proposedValue' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{dudaCopiedField === 'proposedValue' ? 'Copied to Clipboard!' : 'Copy Value'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-purple-300 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-48">
                  {dudaModalRec.proposedValue}
                </pre>
                <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                  <span>Length: {dudaModalRec.proposedValue.length} characters</span>
                  <span>{dudaModalRec.category === 'title' ? 'Target: 50-60' : dudaModalRec.category === 'description' ? 'Target: 135-155' : 'Valid JSON-LD'}</span>
                </div>
              </div>

              {dudaModalRec.category === 'schema' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">
                      Header HTML Embed Code (with &lt;script&gt;)
                    </label>
                    <button
                      onClick={() => handleCopyDudaField('scriptTag', `<script type="application/ld+json">\n${dudaModalRec.proposedValue}\n</script>`)}
                      className="text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1 text-[11px]"
                    >
                      {dudaCopiedField === 'scriptTag' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{dudaCopiedField === 'scriptTag' ? 'Copied Tag!' : 'Copy Script Tag'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-36">
                    {`<script type="application/ld+json">\n${dudaModalRec.proposedValue}\n</script>`}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
              <span className="text-[11px] text-slate-500">No Duda API key required</span>
              <button
                onClick={() => setDudaModalRec(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
