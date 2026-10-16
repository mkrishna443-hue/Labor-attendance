import React, { useState } from 'react';
import { Database, Check, AlertCircle, Copy, Key, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { Modal } from '../common/Modal';
import { getSupabaseCredentials, saveSupabaseCredentials, clearSupabaseCredentials } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const { checkConfiguration } = useAuth();
  const current = getSupabaseCredentials();

  const [url, setUrl] = useState(current.url);
  const [anonKey, setAnonKey] = useState(current.anonKey);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim().startsWith('https://')) {
      setStatusMsg({ type: 'error', text: 'Supabase URL must start with https://' });
      return;
    }
    if (anonKey.trim().length < 20) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid Anon Public Key.' });
      return;
    }

    saveSupabaseCredentials(url, anonKey);
    checkConfiguration();
    setStatusMsg({ type: 'success', text: 'Credentials updated! Reloading...' });
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  const handleReset = () => {
    if (confirm('Clear custom credentials and revert to environment defaults?')) {
      clearSupabaseCredentials();
      checkConfiguration();
      window.location.reload();
    }
  };

  const sqlSample = `-- Open Supabase Dashboard -> SQL Editor and run the migration in:
-- supabase/migrations/20261016_init_construction_attendance.sql`;

  const copySqlPath = () => {
    navigator.clipboard.writeText('supabase/migrations/20261016_init_construction_attendance.sql');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supabase Database Configuration"
      subtitle="Connect your Supabase project or update credentials"
      maxWidth="md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {statusMsg && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
            Project URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-project.supabase.co"
            required
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
          />
          <p className="text-[11px] text-slate-500 mt-1">Found in Project Settings &gt; API &gt; Project URL</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-slate-400" />
            Anon / Public Key
          </label>
          <textarea
            value={anonKey}
            onChange={(e) => setAnonKey(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
            required
            rows={3}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white resize-none"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Safe for frontend. <strong className="text-rose-600">Never use service-role key</strong>.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-600" />
              SQL Migration File
            </span>
            <button
              type="button"
              onClick={copySqlPath}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Path'}</span>
            </button>
          </div>
          <p className="text-slate-600 font-mono text-[11px] break-all bg-white p-2 rounded border border-slate-200">
            supabase/migrations/20261016_init_construction_attendance.sql
          </p>
          <p className="text-slate-500 text-[11px]">
            Run this migration file inside your Supabase SQL Editor to initialize all tables, triggers, and Row Level Security policies.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-rose-600 hover:text-rose-700 font-medium underline"
          >
            Clear Stored Credentials
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Save &amp; Connect
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
