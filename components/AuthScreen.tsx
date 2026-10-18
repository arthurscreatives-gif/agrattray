'use client';

import React, { useState } from 'react';
import { useAuth, ARTHUR_DEFAULT_EMAIL, ARTHUR_DEFAULT_PASS } from '@/lib/auth-context';
import { Shield, Lock, Mail, ArrowRight, Sparkles, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function AuthScreen() {
  const { signIn, signUp, signInWithGoogle, quickAccessAsArthur, resetPassword, authError, clearError } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState(ARTHUR_DEFAULT_EMAIL);
  const [password, setPassword] = useState(ARTHUR_DEFAULT_PASS);
  const [name, setName] = useState('Arthur Rattray');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    clearError();
    setMessage(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      // Handled in context with formatted messages
    } finally {
      setLoading(false);
    }
  };

  const handleInstantArthur = async () => {
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
      // Handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-emerald-500/20 ring-1 ring-white/20">
            <Shield className="w-9 h-9 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
          Arthur’s SEO Command Center
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Private multi-site intelligence, audit automation, and digital workforce for Arthur’s Creatives
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/80 backdrop-blur-xl py-8 px-6 shadow-2xl ring-1 ring-slate-700/60 sm:rounded-2xl sm:px-10">
          
          {authError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-2">
                  <div className="font-medium text-rose-200">{authError}</div>
                  <button
                    onClick={handleInstantArthur}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-rose-300" />
                    Enter Dashboard as Arthur (Instant Access)
                  </button>
                </div>
              </div>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-300 text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
              <div>{message}</div>
            </div>
          )}

          <div className="space-y-3 mb-6">
            {/* Primary Google Sign-In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 p-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-semibold text-sm shadow-md shadow-black/10 transition-all border border-slate-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>

            {/* Instant Owner Access: Arthur Rattray */}
            <button
              onClick={handleInstantArthur}
              disabled={loading}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm shadow-lg shadow-emerald-900/30 transition-all border border-emerald-400/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-200 animate-pulse" />
                <div className="text-left">
                  <div className="font-semibold text-white">Instant Owner Access: Arthur Rattray</div>
                  <div className="text-xs text-emerald-100/80">arthurscreatives@gmail.com</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-200" />
            </button>
          </div>

          {/* Toggle Email / Password form */}
          <div className="pt-2 border-t border-slate-700/60">
            <button
              type="button"
              onClick={() => setShowEmailForm(!showEmailForm)}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span>{showEmailForm ? 'Hide manual credentials form' : 'Or enter password manually'}</span>
              {showEmailForm ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showEmailForm && (
              <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
                {isSignUp && !isReset && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Arthur Rattray"
                    />
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
                      className="w-full bg-slate-900/70 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                        className="w-full bg-slate-900/70 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="••••••••••••"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Authenticating...' : isReset ? 'Send Reset Link' : isSignUp ? 'Create Private Account' : 'Sign In with Password'}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsReset(!isReset);
                      clearError();
                    }}
                    className="hover:text-emerald-400 transition-colors"
                  >
                    {isReset ? 'Back to sign in' : 'Forgot password?'}
                  </button>
                  <button
                    type="button"
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
              </form>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-700/60 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Protected by Firebase Firestore cloud security</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
