import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'labortrack_supabase_url';
const STORAGE_ANON_KEY = 'labortrack_supabase_anon_key';

// Check environment variables first, then localStorage
export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const localUrl = localStorage.getItem(STORAGE_URL_KEY);
  const localKey = localStorage.getItem(STORAGE_ANON_KEY);

  const url = (localUrl || envUrl || '').trim();
  const anonKey = (localKey || envKey || '').trim();

  const isConfigured = Boolean(
    url &&
    anonKey &&
    url.startsWith('https://') &&
    anonKey.length > 20
  );

  return { url, anonKey, isConfigured };
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_URL_KEY, url.trim());
  localStorage.setItem(STORAGE_ANON_KEY, anonKey.trim());
  // Refresh client
  initSupabaseClient();
}

export function clearSupabaseCredentials(): void {
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_ANON_KEY);
  initSupabaseClient();
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    initSupabaseClient();
  }
  return supabaseInstance!;
}

function initSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseCredentials();

  // If credentials are not yet supplied, initialize with dummy credentials so the app doesn't crash on boot
  const safeUrl = url || 'https://placeholder-project.supabase.co';
  const safeKey = anonKey || 'placeholder-anon-key-placeholder-anon-key';

  supabaseInstance = createClient(safeUrl, safeKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'labortrack-auth-token',
    },
  });

  return supabaseInstance;
}

// Initial initialization
export const supabase = initSupabaseClient();
