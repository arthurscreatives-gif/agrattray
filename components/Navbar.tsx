'use client';

import React from 'react';
import { Website } from '@/types/seo';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Globe,
  SearchCode,
  KeyRound,
  TrendingUp,
  Users2,
  LineChart,
  Lightbulb,
  CheckSquare,
  FileText,
  Boxes,
  Settings,
  LogOut,
  Plus,
  ShieldCheck,
  DollarSign,
  ChevronDown,
  Gauge,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'websites'
  | 'audit'
  | 'pagespeed'
  | 'keywords'
  | 'rankings'
  | 'competitors'
  | 'gsc'
  | 'recommendations'
  | 'tasks'
  | 'reports'
  | 'integrations'
  | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  websites: Website[];
  activeWebsiteId: string;
  onSelectWebsite: (id: string) => void;
  onOpenAddWebsite: () => void;
  monthlySpent?: number;
  monthlyLimit?: number;
}

export default function Navbar({
  currentTab,
  onSelectTab,
  websites,
  activeWebsiteId,
  onSelectWebsite,
  onOpenAddWebsite,
  monthlySpent = 0.04,
  monthlyLimit = 10.0,
}: NavbarProps) {
  const { user, signOut } = useAuth();
  const activeWebsite = websites.find((w) => w.id === activeWebsiteId) || websites[0];

  const navItems: { id: NavTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'websites', label: 'Websites', icon: Globe, badge: `${websites.length}` },
    { id: 'audit', label: 'Site Audit', icon: SearchCode },
    { id: 'pagespeed', label: 'PageSpeed', icon: Gauge },
    { id: 'keywords', label: 'Keywords', icon: KeyRound },
    { id: 'rankings', label: 'Rankings', icon: TrendingUp },
    { id: 'competitors', label: 'Competitors', icon: Users2 },
    { id: 'gsc', label: 'Search Console', icon: LineChart },
    { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
    { id: 'tasks', label: 'SEO Tasks', icon: CheckSquare },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'integrations', label: 'Integrations', icon: Boxes },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-sm">
      {/* Top utility row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 ring-1 ring-white/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">
                  Arthur’s SEO Command Center
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Private Pro
                </span>
              </div>
              <p className="text-xs text-slate-400">Arthur’s Creatives Intelligence Platform</p>
            </div>
          </div>

          {/* Center: Website Context Switcher */}
          <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
            <Globe className="w-4 h-4 text-emerald-400 ml-2 shrink-0" />
            <select
              value={activeWebsite?.id || ''}
              onChange={(e) => onSelectWebsite(e.target.value)}
              className="bg-transparent text-sm font-medium text-white pr-8 py-1 pl-1 focus:outline-none cursor-pointer"
            >
              {websites.map((site) => (
                <option key={site.id} value={site.id} className="bg-slate-900 text-white">
                  {site.name} ({new URL(site.url).hostname})
                </option>
              ))}
            </select>
            <button
              onClick={onOpenAddWebsite}
              title="Add New Website"
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-xs px-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Right: Cost Protection meter + User profile + Sign Out */}
          <div className="flex items-center gap-4">
            {/* Cost Protection Badge */}
            <div
              onClick={() => onSelectTab('settings')}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs cursor-pointer hover:border-slate-600 transition-colors"
              title="Monthly API spending vs limit (Click to configure)"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Monthly:</span>
              <span className="font-semibold text-emerald-400">
                ${monthlySpent.toFixed(2)}
              </span>
              <span className="text-slate-500">/ ${monthlyLimit.toFixed(2)}</span>
            </div>

            {/* Profile & Sign Out */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-white leading-tight">
                  {user?.displayName || 'Arthur Rattray'}
                </div>
                <div className="text-[11px] text-slate-400 leading-tight">
                  {user?.email || 'arthurscreatives@gmail.com'}
                </div>
              </div>
              <button
                onClick={() => signOut()}
                title="Sign out securely"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="bg-slate-950/60 border-t border-slate-800/80 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 py-1.5" aria-label="Tabs">
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
