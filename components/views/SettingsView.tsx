'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Settings,
  Shield,
  DollarSign,
  AlertOctagon,
  Lock,
  User,
  CheckCircle2,
  Save,
  Clock,
  ShieldAlert,
} from 'lucide-react';

interface SettingsViewProps {
  monthlyLimit: number;
  onUpdateMonthlyLimit: (limit: number) => void;
  emergencyKillswitch: boolean;
  onToggleKillswitch: (enabled: boolean) => void;
  monthlySpent: number;
  onNavigateToIntegrations?: () => void;
}

export default function SettingsView({
  monthlyLimit,
  onUpdateMonthlyLimit,
  emergencyKillswitch,
  onToggleKillswitch,
  monthlySpent,
  onNavigateToIntegrations,
}: SettingsViewProps) {
  const { user } = useAuth();
  const [limitInput, setLimitInput] = useState(monthlyLimit.toString());
  const [dailyLimitInput, setDailyLimitInput] = useState('1.00');
  const [allowRegistration, setAllowRegistration] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(limitInput);
    const dailyVal = parseFloat(dailyLimitInput);
    if (!isNaN(val) && val > 0) {
      onUpdateMonthlyLimit(val);
    }
    if (!isNaN(dailyVal) && dailyVal > 0) {
      try {
        await fetch('/api/dataforseo/credentials', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dailySpendingLimit: dailyVal, monthlySpendingLimit: val }),
        });
      } catch {
        // ignore
      }
    }
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Application Settings & Security Controls</h2>
          <p className="text-xs text-slate-500 mt-1">
            Private single-user workspace configuration for Arthur Rattray & Arthur’s Creatives.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-emerald-800 font-semibold">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Private Single-User Mode: Enforced</span>
        </div>
      </div>

      {/* Cost Protection & Budget Safeguards */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base">DataForSEO Cost Protection Safeguards</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict limit controls to prevent unexpected recurring charges.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
            ${monthlySpent.toFixed(2)} / ${monthlyLimit.toFixed(2)} Spent
          </span>
        </div>

        {/* Limit form */}
        <form onSubmit={handleSaveBudget} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Daily Limit ($ USD)
            </label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              max="50"
              value={dailyLimitInput}
              onChange={(e) => setDailyLimitInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Default: $1.00 / day</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Monthly Limit ($ USD)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              max="200"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Default: $10.00 / mo</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Rank Refresh Schedule
            </label>
            <select
              defaultValue="weekly"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="weekly">Weekly (Lowest Cost)</option>
              <option value="biweekly">Bi-Weekly</option>
              <option value="manual">Manual Checks Only</option>
            </select>
          </div>

          <button
            type="submit"
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Save Limits</span>
          </button>
        </form>

        {onNavigateToIntegrations && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">Need to update DataForSEO API Login or Password?</span>
            <button
              type="button"
              onClick={onNavigateToIntegrations}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold"
            >
              Open DataForSEO Integration Card →
            </button>
          </div>
        )}

        {savedMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Monthly limit updated successfully!</span>
          </div>
        )}

        {/* Emergency Killswitch Toggle */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 text-xs block">Emergency Paid API Killswitch</strong>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Immediately block all paid DataForSEO calls across all websites. The public crawler, Google Search Console, and PageSpeed will remain fully operational.
              </p>
            </div>
          </div>

          <button
            onClick={() => onToggleKillswitch(!emergencyKillswitch)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              emergencyKillswitch
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {emergencyKillswitch ? 'KILLSWITCH ACTIVE (Calls Blocked)' : 'Arm Emergency Killswitch'}
          </button>
        </div>
      </div>

      {/* Security & Access Policies */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base">Access & Registration Policy</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Guarantees strict privacy for Arthur Rattray and Arthur’s Creatives.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <strong className="text-slate-900 block">Allow Public User Registration</strong>
              <span className="text-slate-500 text-[11px]">
                Disabled by default. Prevents external users from creating accounts in this command center.
              </span>
            </div>
            <button
              onClick={() => setAllowRegistration(!allowRegistration)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                allowRegistration ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {allowRegistration ? 'Allowed' : 'Prohibited (Default)'}
            </button>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <strong className="text-slate-900 block">Active Owner Profile:</strong>
            <div className="text-[11px] text-slate-600 space-y-1">
              <div>Name: <strong>{user?.displayName || 'Arthur Rattray'}</strong></div>
              <div>Email: <strong>{user?.email || 'arthurscreatives@gmail.com'}</strong></div>
              <div>Organization: <strong>Arthur’s Creatives</strong></div>
              <div>Database Access Rules: <strong>Firebase Attribute-Based Access Control (Zero-Trust)</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
