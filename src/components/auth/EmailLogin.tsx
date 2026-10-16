import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, ShieldCheck, RefreshCw, AlertCircle, HardHat, Settings, KeyRound } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SupabaseConfigModal } from './SupabaseConfigModal';

type AuthMode = 'signin' | 'signup' | 'otp';

export const EmailLogin: React.FC = () => {
  const {
    signInWithPassword,
    signUpWithPassword,
    sendEmailOtp,
    verifyEmailOtp,
    isConfigured,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isConfigured) {
      setErrorMsg('Supabase is not connected yet. Please tap "Connect DB" to enter your Supabase URL & Anon Key.');
      setIsConfigOpen(true);
      return;
    }

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    if (mode === 'signin') {
      const result = await signInWithPassword(email, password);
      setIsLoading(false);
      if (!result.success) {
        setErrorMsg(result.error || 'Invalid email or password.');
      }
    } else {
      const result = await signUpWithPassword(email, password, fullName);
      setIsLoading(false);
      if (!result.success) {
        setErrorMsg(result.error || 'Registration failed.');
      } else {
        setSuccessMsg('Account created successfully! Signing you in...');
      }
    }
  };

  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isConfigured) {
      setErrorMsg('Supabase is not connected yet. Please tap "Connect DB" to enter your Supabase credentials.');
      setIsConfigOpen(true);
      return;
    }

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    const result = await sendEmailOtp(email);
    setIsLoading(false);

    if (result.success) {
      setOtpSent(true);
      setSuccessMsg(`Verification code sent to ${email}. Please check your inbox.`);
    } else {
      setErrorMsg(result.error || 'Failed to send verification code.');
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (otpCode.trim().length < 6) {
      setErrorMsg('Please enter the 6-digit code sent to your email.');
      return;
    }

    setIsLoading(true);
    const result = await verifyEmailOtp(email, otpCode);
    setIsLoading(false);

    if (!result.success) {
      setErrorMsg(result.error || 'Invalid or expired verification code.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6 selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header Bar */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
            <HardHat className="w-5 h-5" />
          </div>
          <span className="font-bold text-base tracking-tight text-white">LaborTrack</span>
        </div>

        <button
          type="button"
          onClick={() => setIsConfigOpen(true)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>{isConfigured ? 'DB Config' : 'Connect DB'}</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 text-amber-400 mb-3 shadow-inner">
            {mode === 'otp' ? <KeyRound className="w-7 h-7" /> : <Mail className="w-7 h-7 text-emerald-400" />}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {mode === 'signin' ? 'Supervisor Sign In' : mode === 'signup' ? 'Create Supervisor Account' : 'Email Code Sign In'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Access site labor attendance &amp; wage tracking
          </p>
        </div>

        {/* Tab Switcher: Password Sign In vs Register vs Magic Code */}
        <div className="flex items-center p-1 bg-slate-900 rounded-xl mb-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'signin' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'signup' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Register
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('otp');
              setOtpSent(false);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'otp' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Email Code
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <div className="flex-1 leading-relaxed">{successMsg}</div>
          </div>
        )}

        {/* Form: Password Login / Sign Up */}
        {mode !== 'otp' ? (
          <form onSubmit={handlePasswordAuth} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="supervisor@example.com"
                required
                autoFocus
                className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full h-11 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md mt-4"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Form: Email OTP Magic Code */
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendEmailOtp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="supervisor@example.com"
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    We will send a 6-digit verification code to your email.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full h-11 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md mt-4"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyEmailOtp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Enter 6-Digit Email Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    autoFocus
                    required
                    className="w-full px-4 py-3 text-center text-xl font-bold tracking-[0.4em] text-white bg-slate-900 border border-slate-600 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otpCode.length < 6}
                  className="w-full h-11 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md mt-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify &amp; Login</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                    }}
                    className="text-slate-400 hover:text-white underline"
                  >
                    Change Email
                  </button>

                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    disabled={isLoading}
                    className="text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    Resend Code
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="w-full max-w-md mx-auto text-center text-xs text-slate-500 py-2">
        <p>LaborTrack Mobile PWA &bull; Secure Site Attendance System</p>
      </div>

      {/* Database Setup Modal */}
      <SupabaseConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
    </div>
  );
};
