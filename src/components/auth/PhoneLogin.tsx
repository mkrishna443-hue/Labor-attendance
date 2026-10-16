import React, { useState, useEffect } from 'react';
import { Phone, ArrowRight, ShieldCheck, RefreshCw, AlertCircle, HardHat, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SupabaseConfigModal } from './SupabaseConfigModal';

export const PhoneLogin: React.FC = () => {
  const { sendOtp, verifyOtp, isConfigured } = useAuth();

  const [phoneDigits, setPhoneDigits] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const fullPhone = `+91${phoneDigits.replace(/\D/g, '')}`;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const clean = phoneDigits.replace(/\D/g, '');
    if (clean.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    if (!isConfigured) {
      setErrorMsg('Supabase is not connected yet. Please tap "Connect DB" in the top right to enter your Supabase Project URL and Anon Key.');
      setIsConfigOpen(true);
      return;
    }

    setIsLoading(true);
    const result = await sendOtp(fullPhone);
    setIsLoading(false);

    if (result.success) {
      setStep('otp');
      setCooldown(60);
    } else {
      setErrorMsg(result.error || 'Failed to send verification code. Please check Supabase SMS settings.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanOtp = otpCode.trim();
    if (cleanOtp.length < 6) {
      setErrorMsg('Please enter the complete 6-digit OTP');
      return;
    }

    setIsLoading(true);
    const result = await verifyOtp(fullPhone, cleanOtp);
    setIsLoading(false);

    if (!result.success) {
      setErrorMsg(result.error || 'Invalid or expired OTP code. Please try again.');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isLoading) return;
    setErrorMsg(null);
    setIsLoading(true);
    const result = await sendOtp(fullPhone);
    setIsLoading(false);
    if (result.success) {
      setCooldown(60);
    } else {
      setErrorMsg(result.error || 'Failed to resend OTP.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6 selection:bg-amber-500 selection:text-slate-950">
      {/* Top Bar with Config button */}
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
            {step === 'phone' ? <Phone className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7 text-emerald-400" />}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {step === 'phone' ? 'Site Supervisor Login' : 'Enter Verification Code'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {step === 'phone'
              ? 'Enter your mobile number to access site attendance'
              : `6-digit code sent via SMS to ${fullPhone}`}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Mobile Number
              </label>
              <div className="flex rounded-xl overflow-hidden border border-slate-600 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 bg-slate-900 transition-all">
                <span className="px-3.5 py-3.5 text-sm font-semibold text-slate-300 bg-slate-800/80 border-r border-slate-700 flex items-center select-none">
                  🇮🇳 +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={phoneDigits}
                  onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                  autoFocus
                  required
                  className="w-full px-3.5 py-3.5 text-base sm:text-lg font-medium text-white placeholder-slate-500 bg-transparent focus:outline-none tracking-wider"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Standard 10-digit mobile number registered with your site.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || phoneDigits.length !== 10}
              className="w-full h-12 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md mt-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending OTP...</span>
                </>
              ) : (
                <>
                  <span>Send OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                6-Digit Security Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                required
                className="w-full px-4 py-3.5 text-center text-2xl font-bold tracking-[0.5em] text-white bg-slate-900 border border-slate-600 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otpCode.length < 6}
              className="w-full h-12 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md mt-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify &amp; Login</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtpCode('');
                  setErrorMsg(null);
                }}
                className="text-slate-400 hover:text-white underline font-medium"
              >
                Change Number
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || isLoading}
                className="text-amber-400 hover:text-amber-300 font-semibold disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

        {/* Supabase Test Credentials Help Box */}
        <div className="mt-6 pt-5 border-t border-slate-700/80 text-[11px] text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300">💡 Testing Tip (Supabase Phone Auth):</p>
          <p>
            In Supabase Dashboard &gt; Auth &gt; Providers &gt; Phone, you can register test phone numbers (e.g. <span className="font-mono text-amber-300">+919999999999</span> with OTP <span className="font-mono text-amber-300">123456</span>) to test without Twilio/SMS cost.
          </p>
        </div>
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
