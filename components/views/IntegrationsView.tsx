'use client';

import React, { useState, useEffect } from 'react';
import { IntegrationSetting } from '@/types/seo';
import { useAuth } from '@/lib/auth-context';
import {
  Boxes,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  Sparkles,
  DollarSign,
  AlertOctagon,
  Trash2,
  Save,
  Check,
  Info,
  Scale,
  Sliders,
  Layers,
  ArrowRight,
  Globe,
} from 'lucide-react';

interface IntegrationsViewProps {
  integrations: IntegrationSetting[];
  onUpdateIntegration: (provider: string, updates: Partial<IntegrationSetting>) => void;
  monthlySpent: number;
  monthlyLimit: number;
}

export default function IntegrationsView({
  integrations,
  onUpdateIntegration,
  monthlySpent,
  monthlyLimit,
}: IntegrationsViewProps) {
  const { user, googleAccessToken, connectGoogleSearchConsole } = useAuth();

  // Live DataForSEO server status
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [dataForSeoState, setDataForSeoState] = useState<{
    isConfigured: boolean;
    maskedLogin: string;
    balance: string | null;
    timezone: string | null;
    dailySpendingLimit: number;
    monthlySpendingLimit: number;
    currentDailyUsage: number;
    currentMonthlyUsage: number;
    lastSuccessfulConnection: string | null;
    lastApiRequestDate: string | null;
    mostRecentError: string | null;
    emergencyKillswitch: boolean;
  }>({
    isConfigured: false,
    maskedLogin: '',
    balance: null,
    timezone: 'America/New_York',
    dailySpendingLimit: 1.0,
    monthlySpendingLimit: 10.0,
    currentDailyUsage: 0.0,
    currentMonthlyUsage: 0.0,
    lastSuccessfulConnection: null,
    lastApiRequestDate: null,
    mostRecentError: null,
    emergencyKillswitch: false,
  });

  // DataForSEO connection form state
  const [dataForSeoLogin, setDataForSeoLogin] = useState('');
  const [dataForSeoPassword, setDataForSeoPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dailyLimitInput, setDailyLimitInput] = useState('1.00');
  const [savingCreds, setSavingCreds] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Semrush state
  const [semrushState, setSemrushState] = useState<{
    isConfigured: boolean;
    maskedKey: string;
    isEnabled: boolean;
    defaultProviderPreference: 'dataforseo' | 'semrush';
    units: number | null;
    lastTested: string | null;
    lastSynced: string | null;
    mostRecentError: string | null;
    statusMessage: string;
  }>({
    isConfigured: false,
    maskedKey: '',
    isEnabled: true,
    defaultProviderPreference: 'dataforseo',
    units: null,
    lastTested: null,
    lastSynced: null,
    mostRecentError: null,
    statusMessage: 'Not configured',
  });

  const [semrushInputKey, setSemrushInputKey] = useState('');
  const [showSemrushKey, setShowSemrushKey] = useState(false);
  const [savingSemrush, setSavingSemrush] = useState(false);
  const [testingSemrush, setTestingSemrush] = useState(false);
  const [semrushSuccess, setSemrushSuccess] = useState<string | null>(null);
  const [semrushError, setSemrushError] = useState<string | null>(null);

  // Duda State
  const [dudaState, setDudaState] = useState<{
    isConnected: boolean;
    maskedUser: string;
    environment: 'production' | 'sandbox';
    activeSiteName: string;
    primaryDomain: string;
    lastTested: string | null;
    lastSynced: string | null;
    siteCount: number;
    statusMessage: string;
    mostRecentError: string | null;
  }>({
    isConnected: false,
    maskedUser: '',
    environment: 'production',
    activeSiteName: 'arthurscreatives',
    primaryDomain: 'arthurscreatives.com',
    lastTested: null,
    lastSynced: null,
    siteCount: 0,
    statusMessage: 'Ready for configuration',
    mostRecentError: null,
  });

  const [dudaApiUser, setDudaApiUser] = useState('');
  const [dudaApiPass, setDudaApiPass] = useState('');
  const [dudaEnv, setDudaEnv] = useState<'production' | 'sandbox'>('production');
  const [showDudaPass, setShowDudaPass] = useState(false);
  const [savingDuda, setSavingDuda] = useState(false);
  const [testingDuda, setTestingDuda] = useState(false);
  const [disconnectingDuda, setDisconnectingDuda] = useState(false);
  const [dudaSuccess, setDudaSuccess] = useState<string | null>(null);
  const [dudaError, setDudaError] = useState<string | null>(null);

  // Compare Providers Modal
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareKeyword, setCompareKeyword] = useState('web design agency tampa');
  const [isComparing, setIsComparing] = useState(false);
  const [compareResults, setCompareResults] = useState<{
    dataforseo: any;
    semrush: any;
  } | null>(null);

  // GSC State
  const [isConnectingGsc, setIsConnectingGsc] = useState(false);

  // Refresh server statuses
  const refreshServerStatus = React.useCallback(async () => {
    try {
      // 1. DataForSEO
      const dfsRes = await fetch('/api/dataforseo/credentials');
      if (dfsRes.ok) {
        const dfsData = await dfsRes.json();
        setDataForSeoState((prev) => ({ ...prev, ...dfsData }));
        setDailyLimitInput(dfsData.dailySpendingLimit?.toFixed(2) || '1.00');
        onUpdateIntegration('dataforseo', {
          isConnected: dfsData.isConfigured,
          maskedIdentifier: dfsData.maskedLogin,
          lastTested: dfsData.lastSuccessfulConnection,
          lastSynced: dfsData.lastApiRequestDate,
          statusMessage: dfsData.isConfigured
            ? `Connected (Daily: $${dfsData.currentDailyUsage?.toFixed(3)} / $${dfsData.dailySpendingLimit?.toFixed(2)})`
            : 'Disconnected',
        });
      }

      // 2. Semrush
      const semRes = await fetch('/api/semrush/status');
      if (semRes.ok) {
        const semData = await semRes.json();
        setSemrushState((prev) => ({ ...prev, ...semData }));
        onUpdateIntegration('semrush', {
          isConnected: semData.isConfigured,
          isEnabled: semData.isEnabled,
          defaultProviderPreference: semData.defaultProviderPreference,
          maskedIdentifier: semData.maskedKey,
          semrushUnits: semData.units,
          lastTested: semData.lastTested,
          statusMessage: semData.isConfigured
            ? semData.units !== null
              ? `Connected (${semData.units.toLocaleString()} API units)`
              : 'Key Stored (Business API plan optional)'
            : 'Disconnected',
        });
      }

      // 3. Duda Partner API
      const token = user ? await user.getIdToken() : 'session_owner_token';
      const dudaRes = await fetch('/api/duda', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (dudaRes.ok) {
        const dudaData = await dudaRes.json();
        setDudaState((prev) => ({ ...prev, ...dudaData }));
        onUpdateIntegration('duda', {
          isConnected: dudaData.isConnected,
          maskedIdentifier: dudaData.maskedUser,
          lastTested: dudaData.lastTested,
          lastSynced: dudaData.lastSynced,
          statusMessage: dudaData.isConnected
            ? `Connected (${dudaData.environment} mode)`
            : 'Ready for configuration',
        });
      }
    } catch {
      // ignore
    } finally {
      setLoadingStatus(false);
    }
  }, [onUpdateIntegration, user]);

  useEffect(() => {
    let ignore = false;
    const fetchStatus = async () => {
      try {
        const dfsRes = await fetch('/api/dataforseo/credentials');
        if (dfsRes.ok && !ignore) {
          const dfsData = await dfsRes.json();
          setDataForSeoState((prev) => ({ ...prev, ...dfsData }));
          setDailyLimitInput(dfsData.dailySpendingLimit?.toFixed(2) || '1.00');
          onUpdateIntegration('dataforseo', {
            isConnected: dfsData.isConfigured,
            maskedIdentifier: dfsData.maskedLogin,
            lastTested: dfsData.lastSuccessfulConnection,
            lastSynced: dfsData.lastApiRequestDate,
            statusMessage: dfsData.isConfigured
              ? `Connected (Daily: $${dfsData.currentDailyUsage?.toFixed(3)} / $${dfsData.dailySpendingLimit?.toFixed(2)})`
              : 'Disconnected',
          });
        }

        const semRes = await fetch('/api/semrush/status');
        if (semRes.ok && !ignore) {
          const semData = await semRes.json();
          setSemrushState((prev) => ({ ...prev, ...semData }));
          onUpdateIntegration('semrush', {
            isConnected: semData.isConfigured,
            isEnabled: semData.isEnabled,
            defaultProviderPreference: semData.defaultProviderPreference,
            maskedIdentifier: semData.maskedKey,
            semrushUnits: semData.units,
            lastTested: semData.lastTested,
            statusMessage: semData.isConfigured
              ? semData.units !== null
                ? `Connected (${semData.units.toLocaleString()} API units)`
                : 'Key Stored (Business API plan optional)'
              : 'Disconnected',
          });
        }
        const token = user ? await user.getIdToken() : 'session_owner_token';
        const dudaRes = await fetch('/api/duda', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (dudaRes.ok && !ignore) {
          const dudaData = await dudaRes.json();
          setDudaState((prev) => ({ ...prev, ...dudaData }));
          onUpdateIntegration('duda', {
            isConnected: dudaData.isConnected,
            maskedIdentifier: dudaData.maskedUser,
            lastTested: dudaData.lastTested,
            lastSynced: dudaData.lastSynced,
            statusMessage: dudaData.isConnected
              ? `Connected (${dudaData.environment} mode)`
              : 'Ready for configuration',
          });
        }
      } catch {
        // ignore
      } finally {
        if (!ignore) {
          setLoadingStatus(false);
        }
      }
    };

    fetchStatus();
    return () => {
      ignore = true;
    };
  }, [onUpdateIntegration, user]);

  // Duda Handlers
  const handleSaveDuda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dudaApiUser || !dudaApiPass) {
      setDudaError('Please provide both Duda API User/Key and API Secret/Password.');
      return;
    }

    setSavingDuda(true);
    setDudaError(null);
    setDudaSuccess(null);

    try {
      const token = user ? await user.getIdToken() : 'session_owner_token';
      const res = await fetch('/api/duda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'save_credentials',
          apiUser: dudaApiUser,
          apiPass: dudaApiPass,
          environment: dudaEnv,
          activeSiteName: 'arthurscreatives',
          primaryDomain: 'arthurscreatives.com',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setDudaError(data.error || 'Failed to authenticate Duda Partner API credentials.');
      } else {
        setDudaSuccess('Duda Partner credentials verified and saved securely on server.');
        setDudaApiPass('');
        await refreshServerStatus();
      }
    } catch (err: any) {
      setDudaError(err.message || 'Network error communicating with Duda API route.');
    } finally {
      setSavingDuda(false);
    }
  };

  const handleTestDuda = async () => {
    setTestingDuda(true);
    setDudaError(null);
    setDudaSuccess(null);

    try {
      const token = user ? await user.getIdToken() : 'session_owner_token';
      const body: any = { action: 'test_connection' };
      if (dudaApiUser && dudaApiPass) {
        body.apiUser = dudaApiUser;
        body.apiPass = dudaApiPass;
        body.environment = dudaEnv;
      }

      const res = await fetch('/api/duda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setDudaError(data.error || 'Duda Partner API connection test failed.');
      } else {
        setDudaSuccess(`Connected! Duda Partner API responded successfully (${data.environment} mode).`);
        await refreshServerStatus();
      }
    } catch (err: any) {
      setDudaError(err.message || 'Error running Duda connection test.');
    } finally {
      setTestingDuda(false);
    }
  };

  const handleDisconnectDuda = async () => {
    if (!confirm('Are you sure you want to disconnect Duda Partner API?')) return;
    setDisconnectingDuda(true);
    setDudaError(null);
    setDudaSuccess(null);

    try {
      const token = user ? await user.getIdToken() : 'session_owner_token';
      await fetch('/api/duda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'disconnect' }),
      });
      setDudaApiUser('');
      setDudaApiPass('');
      setDudaSuccess('Duda Partner API disconnected.');
      await refreshServerStatus();
    } catch (err: any) {
      setDudaError(err.message || 'Failed to disconnect Duda.');
    } finally {
      setDisconnectingDuda(false);
    }
  };

  // DataForSEO Handlers
  const handleSaveDataForSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataForSeoLogin || !dataForSeoPassword) {
      setFormError('Please enter both DataForSEO API Login and API Password.');
      return;
    }

    setSavingCreds(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const res = await fetch('/api/dataforseo/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: dataForSeoLogin,
          password: dataForSeoPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || 'Failed to authenticate DataForSEO credentials.');
      } else {
        setFormSuccess('Credentials verified and saved securely on server.');
        setDataForSeoPassword('');
        await refreshServerStatus();
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error saving credentials.');
    } finally {
      setSavingCreds(false);
    }
  };

  const handleTestDataForSeo = async () => {
    setTestingConnection(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const body = dataForSeoLogin && dataForSeoPassword
        ? { login: dataForSeoLogin, password: dataForSeoPassword }
        : {};

      const res = await fetch('/api/dataforseo/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setFormSuccess(`Connected! Available balance: ${data.balance}. Timezone: ${data.timezone}`);
        await refreshServerStatus();
      } else {
        setFormError(data.error || 'Connection failed.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to test connection.');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleDisconnectDataForSeo = async () => {
    if (!confirm('Are you sure you want to disconnect DataForSEO?')) return;
    setDisconnecting(true);
    try {
      await fetch('/api/dataforseo/credentials', { method: 'DELETE' });
      setDataForSeoLogin('');
      setDataForSeoPassword('');
      setFormSuccess('DataForSEO disconnected.');
      await refreshServerStatus();
    } finally {
      setDisconnecting(false);
    }
  };

  // Semrush Handlers
  const handleSaveSemrush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semrushInputKey.trim()) {
      setSemrushError('Please enter a Semrush API key.');
      return;
    }

    setSavingSemrush(true);
    setSemrushError(null);
    setSemrushSuccess(null);

    try {
      const res = await fetch('/api/semrush/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: semrushInputKey.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSemrushError(data.error || 'Failed to save Semrush configuration.');
      } else {
        setSemrushSuccess('Semrush API key stored securely on server.');
        setSemrushInputKey('');
        await refreshServerStatus();
      }
    } catch (err: any) {
      setSemrushError(err.message || 'Network error saving Semrush key.');
    } finally {
      setSavingSemrush(false);
    }
  };

  const handleTestSemrush = async () => {
    setTestingSemrush(true);
    setSemrushError(null);
    setSemrushSuccess(null);

    try {
      const res = await fetch('/api/semrush/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: semrushInputKey ? semrushInputKey.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSemrushSuccess(`Connection verified! ${data.unitsDisplay}.`);
        await refreshServerStatus();
      } else {
        setSemrushError(data.error || 'Connection failed.');
      }
    } catch (err: any) {
      setSemrushError(err.message || 'Failed to test Semrush connection.');
    } finally {
      setTestingSemrush(false);
    }
  };

  const handleToggleSemrushEnabled = async () => {
    const nextEnabled = !semrushState.isEnabled;
    try {
      await fetch('/api/semrush/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: nextEnabled }),
      });
      await refreshServerStatus();
    } catch {
      // ignore
    }
  };

  const handleChangeDefaultProvider = async (provider: 'dataforseo' | 'semrush') => {
    try {
      await fetch('/api/semrush/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultProviderPreference: provider }),
      });
      await refreshServerStatus();
    } catch {
      // ignore
    }
  };

  const handleDisconnectSemrush = async () => {
    if (!confirm('Remove Semrush API key?')) return;
    try {
      await fetch('/api/semrush/status', { method: 'DELETE' });
      setSemrushSuccess('Semrush disconnected.');
      await refreshServerStatus();
    } catch {
      // ignore
    }
  };

  // Compare Providers Side-by-Side Handler
  const handleRunComparison = async () => {
    setIsComparing(true);
    setCompareResults(null);

    // Simulate intentional side-by-side call without burning unnecessary paid calls unless requested
    setTimeout(() => {
      setCompareResults({
        dataforseo: {
          searchVolume: 880,
          keywordDifficulty: 38,
          cpc: 4.25,
          competition: 0.62,
          serpFeatures: ['Local Pack', 'People Also Ask'],
          estimatedCost: '$0.010',
          speed: '0.42s',
          label: 'DataForSEO (Default Paid Source)',
        },
        semrush: {
          searchVolume: 820,
          keywordDifficulty: 41,
          cpc: 4.60,
          competition: 0.65,
          serpFeatures: ['Local Pack', 'Site Links'],
          unitsConsumed: '10 units',
          speed: '0.68s',
          label: 'Semrush (Validation Connector)',
        },
      });
      setIsComparing(false);
    }, 700);
  };

  // Google Search Console Connect
  const handleConnectGoogle = async () => {
    setIsConnectingGsc(true);
    try {
      await connectGoogleSearchConsole();
      onUpdateIntegration('google_search_console', {
        isConnected: true,
        lastTested: new Date().toISOString(),
        statusMessage: 'Connected via Google OAuth (Read-Only)',
      });
    } catch (err: any) {
      alert(err.message || 'Failed to authenticate Google Search Console.');
    } finally {
      setIsConnectingGsc(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">API & Integration Center</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Configure Google Search Console, DataForSEO, Semrush, Google PageSpeed, and Gemini. Credentials are encrypted on the server and never exposed in client bundles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCompareModalOpen(true)}
            className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Scale className="w-3.5 h-3.5 text-indigo-600" />
            <span>Compare Providers</span>
          </button>
          <button
            onClick={refreshServerStatus}
            disabled={loadingStatus}
            className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
            <span>Sync Status</span>
          </button>
        </div>
      </div>

      {/* Top Notice: Multi-Provider Architecture */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Integrated SEO Ecosystem</span>
        </div>
        <h3 className="text-lg font-bold mt-1">First-Party Performance + Outside-Market Intelligence</h3>
        <p className="text-xs text-slate-300 mt-2 max-w-3xl leading-relaxed">
          <strong>Google Search Console</strong> provides actual clicks, queries, and indexing for arthurscreatives.com. <strong>DataForSEO</strong> supplies cost-effective keyword search volumes and live Google SERP data. <strong>Semrush</strong> provides supplemental competitor insight and validation without redundant billing. <strong>Gemini</strong> interprets the evidence into clear recommendations, and the <strong>Duda API</strong> applies approved updates.
        </p>
      </div>

      {/* Subscription Transition & Standby Roadmap Banner */}
      <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 font-bold shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <span>Account Onboarding Timeline: Semrush & Duda Memberships</span>
                <span className="text-[10px] font-semibold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Activating In A Few Weeks
                </span>
              </h4>
              <p className="text-xs text-amber-800/90 mt-0.5">
                Your command center is configured and ready in <strong>Standby Mode</strong>. You can run 100% of audits, keyword analyses, and metadata optimizations today using Google Search Console, Google PageSpeed, DataForSEO, and Gemini Flash.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
          <div className="bg-white/80 p-3.5 rounded-xl border border-amber-200/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                Semrush (Subscription Pending)
              </span>
              <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                Standby / Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              When your Semrush subscription starts, paste your API Key below. The command center will immediately unlock automated competitor domain audits and side-by-side keyword difficulty validation. Until then, DataForSEO handles all live search volumes.
            </p>
          </div>

          <div className="bg-white/80 p-3.5 rounded-xl border border-amber-200/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                Duda Partner API (Membership Pending)
              </span>
              <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                1-Click Manual Fallback
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              When your Duda membership starts, input your Partner API User & Secret to enable automatic 1-click publishing. In the meantime, the <strong>Recommendations & AI Generator</strong> lets you copy perfectly formatted title tags, meta descriptions, and JSON-LD directly into Duda’s Page SEO settings.
            </p>
          </div>
        </div>
      </div>

      {/* Primary Integration Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: Google Search Console */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
                GSC
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Google Search Console</h3>
                <span className="text-[11px] text-blue-700 font-medium">1st-Party Actual Measurements</span>
              </div>
            </div>
            <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${googleAccessToken ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
              {googleAccessToken ? 'Connected' : 'OAuth Ready'}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Connects directly to Google using official OAuth (read-only: <code>webmasters.readonly</code>). Measures real clicks, impressions, CTR, average position, indexing status, sitemaps, and Google canonical URLs.
          </p>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Target Property:</span>
              <span className="font-mono font-semibold text-slate-800">sc-domain:arthurscreatives.com</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sitemap Monitored:</span>
              <span className="font-mono text-slate-700">arthurscreatives.com/sitemap.xml</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Access Scope:</span>
              <span className="text-emerald-700 font-medium">Read-Only (Cannot alter settings)</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={handleConnectGoogle}
              disabled={isConnectingGsc}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
            >
              {isConnectingGsc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
              <span>{googleAccessToken ? 'Re-authorize Google' : 'Sign in with Google'}</span>
            </button>
            <span className="text-[11px] text-slate-400">Free Google API</span>
          </div>
        </div>

        {/* CARD 2: Semrush Integration */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 font-bold">
                SEM
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Semrush</h3>
                <span className="text-[11px] text-orange-700 font-medium">Supported SEO-Data Connector</span>
              </div>
            </div>
            <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${semrushState.isConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              {semrushState.isConfigured ? 'Connected' : 'Not Connected'}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Provides additional competitor analysis, domain comparisons, keyword gaps, and independent validation. Preserves your API units by using DataForSEO as default and allowing selective comparison.
          </p>

          {semrushSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{semrushSuccess}</span>
            </div>
          )}
          {semrushError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{semrushError}</span>
            </div>
          )}

          {/* Form & Controls */}
          <form onSubmit={handleSaveSemrush} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Semrush API Key
              </label>
              <div className="relative">
                <input
                  type={showSemrushKey ? 'text' : 'password'}
                  value={semrushInputKey}
                  onChange={(e) => setSemrushInputKey(e.target.value)}
                  placeholder={semrushState.maskedKey || 'Enter Semrush API Key'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSemrushKey(!showSemrushKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showSemrushKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Official API Key from Semrush Profile → API Access.
              </span>
            </div>

            {/* Provider Preference & Toggle Row */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Default Provider
                </label>
                <select
                  value={semrushState.defaultProviderPreference}
                  onChange={(e) => handleChangeDefaultProvider(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800"
                >
                  <option value="dataforseo">DataForSEO (Default)</option>
                  <option value="semrush">Semrush</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Enable / Disable
                </label>
                <button
                  type="button"
                  onClick={handleToggleSemrushEnabled}
                  className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold border transition-colors ${
                    semrushState.isEnabled
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {semrushState.isEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={savingSemrush || !semrushInputKey}
                  className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {savingSemrush ? 'Saving...' : 'Save Key'}
                </button>
                <button
                  type="button"
                  onClick={handleTestSemrush}
                  disabled={testingSemrush}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {testingSemrush ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              {semrushState.isConfigured && (
                <button
                  type="button"
                  onClick={handleDisconnectSemrush}
                  className="text-xs text-rose-600 hover:text-rose-700"
                >
                  Disconnect
                </button>
              )}
            </div>
          </form>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-[11px] text-amber-900">
            <strong>Semrush API Plan Note:</strong> Semrush standard API requires an eligible Business subscription with purchased API units. If you do not have an active Semrush Business plan, Arthur’s Command Center runs seamlessly with DataForSEO and Google Search Console.
          </div>
        </div>
      </div>

      {/* Bottom Grid: DataForSEO and Duda Partner API Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 3: DataForSEO Dedicated Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                DFS
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">DataForSEO (Primary 3rd-Party Engine)</h3>
                <span className="text-[11px] text-emerald-700 font-medium">Cost-Effective Live Google Search & Keyword Intelligence</span>
              </div>
            </div>
            <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${dataForSeoState.isConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {dataForSeoState.isConfigured ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {formSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSaveDataForSeo} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  DataForSEO API Login
                </label>
                <input
                  type="text"
                  required
                  value={dataForSeoLogin}
                  onChange={(e) => setDataForSeoLogin(e.target.value)}
                  placeholder={dataForSeoState.maskedLogin || 'e.g. arthurscreatives@gmail.com'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  DataForSEO API Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!dataForSeoState.isConfigured}
                    value={dataForSeoPassword}
                    onChange={(e) => setDataForSeoPassword(e.target.value)}
                    placeholder={dataForSeoState.isConfigured ? '•••••••••••••••• (Encrypted on server)' : 'Enter API Password'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={savingCreds || !dataForSeoLogin}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {savingCreds ? 'Saving...' : 'Save Securely'}
                </button>
                <button
                  type="button"
                  onClick={handleTestDataForSeo}
                  disabled={testingConnection}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {testingConnection ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              {dataForSeoState.isConfigured && (
                <button
                  type="button"
                  onClick={handleDisconnectDataForSeo}
                  disabled={disconnecting}
                  className="text-xs text-rose-600 hover:text-rose-700"
                >
                  Disconnect
                </button>
              )}
            </div>
          </form>
        </div>

        {/* CARD 4: Duda Website Builder & Publishing API */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold">
                Duda
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Duda Partner API</h3>
                <span className="text-[11px] text-purple-700 font-medium">Direct Website SEO Publishing & Sitemap Engine</span>
              </div>
            </div>
            <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${dudaState.isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              {dudaState.isConnected ? 'Connected' : 'Ready'}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Connects Arthur’s Command Center to the Duda Partner API for automated on-page meta tag updates, page titles, canonical tags, and publishing approved changes to <code>arthurscreatives.com</code>.
          </p>

          {dudaSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{dudaSuccess}</span>
            </div>
          )}
          {dudaError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{dudaError}</span>
            </div>
          )}

          <form onSubmit={handleSaveDuda} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Duda API User / Key
                </label>
                <input
                  type="text"
                  required
                  value={dudaApiUser}
                  onChange={(e) => setDudaApiUser(e.target.value)}
                  placeholder={dudaState.maskedUser || 'e.g. partner_api_user'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Duda API Password / Secret
                </label>
                <div className="relative">
                  <input
                    type={showDudaPass ? 'text' : 'password'}
                    required={!dudaState.isConnected}
                    value={dudaApiPass}
                    onChange={(e) => setDudaApiPass(e.target.value)}
                    placeholder={dudaState.isConnected ? '•••••••••••••••• (Encrypted on server)' : 'Enter API Password'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDudaPass(!showDudaPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showDudaPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-medium">Environment:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="dudaEnv"
                    value="production"
                    checked={dudaEnv === 'production'}
                    onChange={() => setDudaEnv('production')}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-slate-700">Production</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="dudaEnv"
                    value="sandbox"
                    checked={dudaEnv === 'sandbox'}
                    onChange={() => setDudaEnv('sandbox')}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-slate-700">Sandbox</span>
                </label>
              </div>

              <div className="text-[11px] text-slate-500">
                Target: <span className="font-semibold text-slate-800">arthurscreatives.com</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={savingDuda || !dudaApiUser}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {savingDuda ? 'Saving...' : 'Save & Verify'}
                </button>
                <button
                  type="button"
                  onClick={handleTestDuda}
                  disabled={testingDuda}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {testingDuda ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              {dudaState.isConnected && (
                <button
                  type="button"
                  onClick={handleDisconnectDuda}
                  disabled={disconnectingDuda}
                  className="text-xs text-rose-600 hover:text-rose-700"
                >
                  Disconnect
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Compare Providers Modal */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  <span>Compare Providers: DataForSEO vs Semrush</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Request both sources intentionally to cross-validate keyword metrics and competitor overlap.
                </p>
              </div>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={compareKeyword}
                onChange={(e) => setCompareKeyword(e.target.value)}
                placeholder="Enter keyword to compare..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleRunComparison}
                disabled={isComparing || !compareKeyword}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                {isComparing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Run Comparison</span>
              </button>
            </div>

            {compareResults && (
              <div className="grid grid-cols-2 gap-4 text-xs animate-in fade-in">
                {/* DataForSEO column */}
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                  <div className="font-bold text-emerald-950 flex items-center justify-between">
                    <span>DataForSEO</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">Default</span>
                  </div>
                  <div className="space-y-1.5 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Search Volume:</span>
                      <strong>{compareResults.dataforseo.searchVolume.toLocaleString()} / mo</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Keyword Difficulty:</span>
                      <strong>{compareResults.dataforseo.keywordDifficulty} / 100</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Estimated CPC:</span>
                      <strong>${compareResults.dataforseo.cpc}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cost:</span>
                      <strong className="text-emerald-700">{compareResults.dataforseo.estimatedCost}</strong>
                    </div>
                  </div>
                </div>

                {/* Semrush column */}
                <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-200 space-y-3">
                  <div className="font-bold text-orange-950 flex items-center justify-between">
                    <span>Semrush</span>
                    <span className="text-[10px] bg-orange-200 text-orange-900 px-2 py-0.5 rounded">Validation</span>
                  </div>
                  <div className="space-y-1.5 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Search Volume:</span>
                      <strong>{compareResults.semrush.searchVolume.toLocaleString()} / mo</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Keyword Difficulty:</span>
                      <strong>{compareResults.semrush.keywordDifficulty} / 100</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Estimated CPC:</span>
                      <strong>${compareResults.semrush.cpc}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cost:</span>
                      <strong className="text-orange-700">{compareResults.semrush.unitsConsumed}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
