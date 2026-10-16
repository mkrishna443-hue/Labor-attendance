import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-50 pointer-events-none flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-lg border text-sm transition-all duration-300 animate-in slide-in-from-top-4 ${
            t.type === 'success'
              ? 'bg-slate-900 text-white border-slate-800'
              : t.type === 'error'
              ? 'bg-rose-900 text-white border-rose-800'
              : t.type === 'warning'
              ? 'bg-amber-900 text-white border-amber-800'
              : 'bg-slate-800 text-white border-slate-700'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
          {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
          {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
          {t.type === 'info' && <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />}

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">{t.title}</p>
            {t.description && <p className="text-xs text-slate-300 mt-0.5">{t.description}</p>}
          </div>

          <button
            onClick={() => onDismiss(t.id)}
            className="text-slate-400 hover:text-white p-1 rounded-md"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
