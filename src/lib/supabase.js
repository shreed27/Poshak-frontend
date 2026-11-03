import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Null when env vars are missing: the app then runs in local demo mode.
export const supabase = url && key ? createClient(url, key, {
  // PKCE returns ?code=… instead of #access_token=…, which would collide with our #/admin hash routes.
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
}) : null;

export const isBackendConfigured = Boolean(supabase);
