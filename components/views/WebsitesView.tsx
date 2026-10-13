'use client';

import React, { useState } from 'react';
import { Website, WebsitePlatform } from '@/types/seo';
import {
  Globe,
  Plus,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  FileCode,
  Calendar,
  Sparkles,
  Trash2,
  Edit2,
  Layers,
} from 'lucide-react';

interface WebsitesViewProps {
  websites: Website[];
  activeWebsiteId: string;
  onSelectWebsite: (id: string) => void;
  onSaveWebsite: (website: Website) => Promise<void>;
  onDeleteWebsite: (id: string) => Promise<void>;
  onRunAudit: (website: Website) => void;
}

export default function WebsitesView({
  websites,
  activeWebsiteId,
  onSelectWebsite,
  onSaveWebsite,
  onDeleteWebsite,
  onRunAudit,
}: WebsitesViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Website | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState<WebsitePlatform>('custom');
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [primaryServices, setPrimaryServices] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [primaryCity, setPrimaryCity] = useState('');
  const [primaryRegion, setPrimaryRegion] = useState('');
  const [country, setCountry] = useState('United States');
  const [primaryLanguage, setPrimaryLanguage] = useState('English');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [gscProperty, setGscProperty] = useState('');
  const [notes, setNotes] = useState('');

  // Pre-flight check state
  const [checkingUrl, setCheckingUrl] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName('');
    setUrl('');
    setPlatform('custom');
    setBusinessName('');
    setBusinessDescription('');
    setPrimaryServices('');
    setTargetAudience('');
    setPrimaryCity('');
    setPrimaryRegion('');
    setCountry('United States');
    setPrimaryLanguage('English');
    setSitemapUrl('');
    setGscProperty('');
    setNotes('');
    setCheckResult(null);
    setCheckError(null);
    setEditingSite(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (site: Website) => {
    setEditingSite(site);
    setName(site.name);
    setUrl(site.url);
    setPlatform(site.platform);
    setBusinessName(site.businessName || '');
    setBusinessDescription(site.businessDescription || '');
    setPrimaryServices(site.primaryServices || '');
    setTargetAudience(site.targetAudience || '');
    setPrimaryCity(site.primaryCity || '');
    setPrimaryRegion(site.primaryRegion || '');
    setCountry(site.country || 'United States');
    setPrimaryLanguage(site.primaryLanguage || 'English');
    setSitemapUrl(site.sitemapUrl || '');
    setGscProperty(site.gscProperty || '');
    setNotes(site.notes || '');
    setCheckResult(null);
    setCheckError(null);
    setIsModalOpen(true);
  };

  // Step 1 to 6: Pre-flight public verification
  const handleVerifyUrl = async () => {
    if (!url) {
      setCheckError('Please enter a website URL');
      return;
    }

    setCheckingUrl(true);
    setCheckError(null);
    setCheckResult(null);

    try {
      const res = await fetch('/api/crawler/check-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCheckError(data.error || 'Failed to verify URL');
      } else {
        setCheckResult(data);
        if (data.sitemapUrl && !sitemapUrl) {
          setSitemapUrl(data.sitemapUrl);
        }
        if (!name) {
          try {
            const host = new URL(data.normalizedUrl).hostname.replace('www.', '');
            setName(host.charAt(0).toUpperCase() + host.slice(1));
          } catch {
            // ignore
          }
        }
      }
    } catch (err: any) {
      setCheckError(err.message || 'Network error during URL verification');
    } finally {
      setCheckingUrl(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;

    setSaving(true);
    try {
      const sitePayload: Website = {
        id: editingSite ? editingSite.id : `site_${Date.now()}`,
        userId: '',
        name,
        url: checkResult?.normalizedUrl || url,
        platform,
        businessName: businessName || name,
        businessDescription,
        primaryServices,
        targetAudience,
        primaryCity,
        primaryRegion,
        country,
        primaryLanguage,
        sitemapUrl: sitemapUrl || checkResult?.sitemapUrl,
        gscProperty,
        notes,
        status: 'active',
        healthScore: editingSite?.healthScore ?? 80,
        createdAt: editingSite ? editingSite.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSaveWebsite(sitePayload);
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      setCheckError(err.message || 'Failed to save website');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Website Management</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage tracked client and agency websites with URL verification, sitemap discovery, and automated audits.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-2 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Website</span>
        </button>
      </div>

      {/* Website Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {websites.map((site) => {
          const isActive = site.id === activeWebsiteId;
          return (
            <div
              key={site.id}
              className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                isActive
                  ? 'border-emerald-500 ring-2 ring-emerald-500/10 shadow-md'
                  : 'border-slate-200/80 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                      <Globe className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{site.name}</h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {site.platform}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      (site.healthScore ?? 80) >= 80
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {site.healthScore ?? 80} Score
                  </span>
                </div>

                <div className="mt-4">
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-500 hover:text-emerald-600 font-medium inline-flex items-center gap-1 break-all"
                  >
                    {site.url}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>

                <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                  {site.businessDescription || site.primaryServices || 'Digital agency & creative services'}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                  <div>
                    <span className="text-slate-400 block">Location:</span>
                    <span className="font-medium text-slate-700">
                      {site.primaryCity ? `${site.primaryCity}, ${site.country}` : 'Global / US'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Sitemap:</span>
                    <span className="font-medium text-slate-700 truncate block">
                      {site.sitemapUrl ? 'Detected' : 'Standard'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-6 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectWebsite(site.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {isActive ? 'Active Context' : 'Set as Active'}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onRunAudit(site)}
                    title="Audit website"
                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-white rounded-lg transition-colors"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(site)}
                    title="Edit site properties"
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {websites.length > 1 && (
                    <button
                      onClick={() => onDeleteWebsite(site.id)}
                      title="Delete website"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Website Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingSite ? 'Edit Website Properties' : 'Add New Website to Command Center'}
                </h3>
                <p className="text-xs text-slate-500">
                  Performs pre-flight URL verification, robots.txt check, and sitemap page discovery.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {/* URL & Pre-Flight Verification */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Public Website URL *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyUrl}
                    disabled={checkingUrl || !url}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {checkingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>{checkingUrl ? 'Verifying...' : 'Verify URL'}</span>
                  </button>
                </div>
              </div>

              {/* Pre-flight findings banner */}
              {checkError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{checkError}</span>
                </div>
              )}

              {checkResult && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-900">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Pre-Flight URL Check Passed!</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-emerald-700 block">HTTPS Resolved:</span>
                      <strong>{checkResult.httpsWorking ? 'Yes' : 'No'}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 block">Robots.txt:</span>
                      <strong>{checkResult.robotsFound ? 'Detected' : 'Standard'}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 block">Sitemap:</span>
                      <strong>{checkResult.sitemapFound ? 'Found' : 'Not located'}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 block">Estimated Pages:</span>
                      <strong>~{checkResult.estimatedScope.pageCount} pages</strong>
                    </div>
                  </div>
                  <div className="text-[11px] text-emerald-700 italic pt-1">
                    ✓ Paid API calls halted. You can launch crawl analysis whenever you choose.
                  </div>
                </div>
              )}

              {/* Name & Platform */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Website Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Arthur’s Creatives"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Platform
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as WebsitePlatform)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="custom">Custom Web Stack</option>
                    <option value="duda">Duda (Assisted Mode - No API Key Needed)</option>
                    <option value="wix">Wix</option>
                    <option value="shopify">Shopify</option>
                    <option value="wordpress">WordPress</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>

              {/* Business details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Arthur’s Creatives LLC"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Target City & State
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={primaryCity}
                      onChange={(e) => setPrimaryCity(e.target.value)}
                      placeholder="Los Angeles"
                      className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="text"
                      value={primaryRegion}
                      onChange={(e) => setPrimaryRegion(e.target.value)}
                      placeholder="CA"
                      className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Services & Categories
                </label>
                <input
                  type="text"
                  value={primaryServices}
                  onChange={(e) => setPrimaryServices(e.target.value)}
                  placeholder="Web Design, SEO Management, Digital Automation"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Business Description & Target Audience
                </label>
                <textarea
                  rows={2}
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  placeholder="Creative and engineering agency helping modern brands scale through high-conversion web development and search visibility."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Sitemap URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={sitemapUrl}
                    onChange={(e) => setSitemapUrl(e.target.value)}
                    placeholder="https://example.com/sitemap.xml"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Search Console Property (Optional)
                  </label>
                  <input
                    type="text"
                    value={gscProperty}
                    onChange={(e) => setGscProperty(e.target.value)}
                    placeholder="sc-domain:example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingSite ? 'Update Website' : 'Add Website & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
