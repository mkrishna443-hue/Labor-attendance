import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwaPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosInstructions, setShowIosInstructions] = useState<boolean>(false);

  useEffect(() => {
    // Check if dismissed previously
    const isDismissed = localStorage.getItem('labortrack_pwa_dismissed');
    if (isDismissed) return;

    // Detect standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone);

    if (isStandalone) return;

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isApple);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // If on iOS and not standalone, show a gentle prompt after a slight delay
    if (isApple && !isStandalone) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('labortrack_pwa_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="bg-slate-900 text-white px-4 py-3 border-b border-slate-800 shadow-md flex items-center justify-between gap-3 text-sm z-30">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-900 flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-xs text-amber-400 uppercase tracking-wider">Fast Site Access</p>
          <p className="text-xs text-slate-200 truncate font-medium">Add LaborTrack to your Home Screen</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
        >
          {isIos ? <Share className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
          <span>{isIos ? 'Instructions' : 'Install App'}</span>
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-slate-400 hover:text-white rounded-md"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* iOS Instructions Modal */}
      {showIosInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white text-slate-900 p-5 rounded-xl max-w-xs w-full shadow-2xl">
            <h4 className="font-bold text-base mb-2">Install on iPhone / iPad</h4>
            <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside mb-4">
              <li>Tap the <strong className="text-slate-900">Share</strong> button at bottom of Safari.</li>
              <li>Scroll down and select <strong className="text-slate-900">Add to Home Screen</strong>.</li>
              <li>Tap <strong className="text-slate-900">Add</strong> in top right corner.</li>
            </ol>
            <button
              onClick={() => setShowIosInstructions(false)}
              className="w-full bg-slate-900 text-white font-semibold py-2 rounded-lg text-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
