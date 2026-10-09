'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Shield, Lock, Mail, ArrowRight, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AuthScreen() {
  const { signIn, signUp, quickAccessAsArthur, resetPassword, authError, clearError } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [email, setEmail] = useState('arthurscreatives@gmail.com');
  const [password, setPassword] = useState('ArthurSEO#2026');
  const [name, setName] = useState('Arthur Rattray');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setMessage(null);
    setLoading(true);

    try {
      if (isReset) {
        await resetPassword(email);
        setMessage('Password reset email sent. Please check your inbox.');
      } else if (isSignUp) {
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
    } catch {
      // Error handled by AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleQuickArthur = async () => {
    clearError();
    setMessage(null);
    setLoading(true);
    try {
      await quickAccessAsArthur();
    } catch {
      // Handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-emerald-500/20 ring-1 ring-white/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
          Arthur’s SEO Command Center
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Private multi-site intelligence, audit automation, and task execution for Arthur’s Creatives
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/80 backdrop-blur-xl py-8 px-6 shadow-2xl ring-1 ring-slate-700/60 sm:rounded-2xl sm:px-10">
          {authError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div>{authError}</div>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-300 text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
              <div>{message}</div>
            </div>
          )}

          {/* Quick Access Button for Arthur */}
          <div className="mb-6">
            <button
              onClick={handleQuickArthur}
              disabled={loading}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm shadow-lg shadow-emerald-900/30 transition-all border border-emerald-400/20 hover:scale-[1.01] active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-200 animate-pulse" />
                <div className="text-left">
                  <div className="font-semibold text-white">Owner Access: Arthur Rattray</div>
                  <div className="text-xs text-emerald-100/80">arthurscreatives@gmail.com</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-200" />
            </button>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-800 px-3 text-slate-400 font-medium">Or enter credentials</span>
              </div>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSignUp && !isReset && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Arthur Rattray"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/70 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="arthurscreatives@gmail.com"
                />
              </div>
            </div>

            {!isReset && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900/70 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-md disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : isReset ? 'Send Reset Link' : isSignUp ? 'Create Private Account' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
            <button
              onClick={() => {
                setIsReset(!isReset);
                clearError();
              }}
              className="hover:text-emerald-400 transition-colors"
            >
              {isReset ? 'Back to sign in' : 'Forgot password?'}
            </button>
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setIsReset(false);
                clearError();
              }}
              className="hover:text-emerald-400 transition-colors"
            >
              {isSignUp ? 'Existing user? Sign in' : 'New registration'}
            </button>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-700/60 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero-trust isolated security: Your data is protected by Firebase ABAC rules</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
