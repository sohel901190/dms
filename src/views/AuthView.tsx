import React, { useState } from 'react';
import {
  Shield,
  CheckCircle2,
  Lock,
  Mail,
  User,
  ArrowRight,
  MessageCircle,
  Phone,
  BarChart2,
  Package,
  ShoppingCart,
  Landmark,
  Building2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthView: React.FC<{ onOpenSupport: () => void }> = ({ onOpenSupport }) => {
  const {
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    resetPassword,
    authError,
    clearAuthError,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Password reset modal
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearAuthError();

    if (mode === 'register') {
      if (password.length < 6) {
        setFormError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Passwords do not match. Please re-enter.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, displayName);
      }
    } catch (err: any) {
      setFormError(err?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    clearAuthError();
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setFormError(err?.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to send reset link');
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-sky-100 selection:text-sky-900">
      {/* Top Navigation */}
      <nav className="border-b border-sky-100 bg-white/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://imgur.com/XjO7IJK.jpg"
              alt="DMS Solution Logo"
              className="h-10 w-10 object-contain rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs"
            />
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                DMS <span className="text-sky-600">Solution</span>
              </span>
              <p className="text-[10px] text-slate-500 hidden sm:block">Owner: DIL Mohammad Sohel</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://wa.me/01789637029"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp: 01789637029</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section with Supplied Background Image */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-sky-100">
        <div
          className="absolute inset-0 opacity-15 pointer-events-none bg-cover bg-center"
          style={{ backgroundImage: `url('https://imgur.com/15btbvY.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-sky-50/60 via-white/80 to-white pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left 7 cols: Copy & Value Proposition */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Production Multi-Tenant Business SaaS</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-950 tracking-tight leading-tight">
                Enterprise Business Management <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-emerald-600">
                  Built for Growth & Accuracy
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Seamlessly control inventory, execute fast POS sales invoices, manage supplier supply chains, monitor double-entry accounting ledgers, and track net profits with live Firestore synchronization.
              </p>

              {/* Feature pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 max-w-lg mx-auto lg:mx-0 text-left">
                <div className="p-3 bg-white/80 rounded-xl border border-sky-100 shadow-xs flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <ShoppingCart className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>POS & Invoicing</span>
                </div>
                <div className="p-3 bg-white/80 rounded-xl border border-sky-100 shadow-xs flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Stock Movements</span>
                </div>
                <div className="p-3 bg-white/80 rounded-xl border border-sky-100 shadow-xs flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <Landmark className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Bank & Cashbook</span>
                </div>
                <div className="p-3 bg-white/80 rounded-xl border border-sky-100 shadow-xs flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <BarChart2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>P&L & Reports</span>
                </div>
                <div className="p-3 bg-white/80 rounded-xl border border-sky-100 shadow-xs flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Multi-Tenant</span>
                </div>
                <div className="p-3 bg-white/80 rounded-xl border border-sky-100 shadow-xs flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Role Security</span>
                </div>
              </div>

              {/* Owner card */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900">Owner:</span>
                  <span>DIL Mohammad Sohel</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900">Support:</span>
                  <span>01789637029</span>
                </div>
              </div>
            </div>

            {/* Right 5 cols: Authentication Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 relative">
                {/* Mode Selector */}
                <div className="flex p-1 bg-slate-100 rounded-2xl mb-6">
                  <button
                    onClick={() => {
                      setMode('login');
                      setFormError(null);
                      clearAuthError();
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                      mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => {
                      setMode('register');
                      setFormError(null);
                      clearAuthError();
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                      mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                {/* Error Banner */}
                {(formError || authError) && (
                  <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError || authError}</span>
                  </div>
                )}

                {/* Google Sign In Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-3 shadow-xs mb-4"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  <span>Continue with Google</span>
                </button>

                <div className="relative my-4 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <span className="relative bg-white px-3 text-[11px] text-slate-400 font-semibold uppercase">
                    Or with email
                  </span>
                </div>

                {/* Email / Password Form */}
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {mode === 'register' && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          placeholder="Your Name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-700">Password</label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => setIsResetOpen(true)}
                          className="text-[11px] text-sky-600 hover:text-sky-700 font-medium"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {mode === 'register' && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{loading ? 'Please wait...' : mode === 'login' ? 'Sign In to DMS Solution' : 'Create Free Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <p className="text-center text-[11px] text-slate-500 mt-4">
                  By continuing, you agree to our multi-tenant SaaS terms and role security policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PASSWORD RESET MODAL */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter your registered email address to receive password reset instructions.
            </p>

            {resetSuccess ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Password reset link sent to your email!</span>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetOpen(false);
                      setResetSuccess(false);
                    }}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}

            {resetSuccess && (
              <button
                onClick={() => {
                  setIsResetOpen(false);
                  setResetSuccess(false);
                }}
                className="w-full py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold mt-2"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
