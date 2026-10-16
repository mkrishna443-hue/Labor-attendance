import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useSite } from '../../contexts/SiteContext';

export const OfflineBanner: React.FC = () => {
  const { isOnline, pendingQueue, isSyncing, syncNow } = useSite();

  if (isOnline && pendingQueue.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 text-xs px-4 py-2 z-30 shadow-xs">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {!isOnline ? (
            <>
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-200 truncate">
                <strong>Offline Mode</strong> &bull; Records saved to local queue
              </span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-200 truncate">
                <strong>{pendingQueue.length}</strong> record(s) queued for sync
              </span>
            </>
          )}
        </div>

        {isOnline && pendingQueue.length > 0 && (
          <button
            type="button"
            onClick={() => syncNow()}
            disabled={isSyncing}
            className="shrink-0 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold px-2.5 py-1 rounded text-[11px] flex items-center gap-1 transition-colors"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span>Sync Now</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
