import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Null when env vars are missing: the app then runs in local demo mode.
export const supabase = url && key ? createClient(url, key, {
  // PKCE returns ?code=… instead of #access_token=…, which would collide with our #/admin hash routes.
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
}) : null;

export const isBackendConfigured = Boolean(supabase);

// Which sign-in methods are switched on in Supabase Auth (so the sign-in page never offers one that can only fail).
let providersPromise = null;
export const getAuthProviders = () => {
  if (!url || !key) return Promise.resolve({ google: false, phone: false, email: false });
  if (!providersPromise) {
    providersPromise = fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((s) => ({ google: !!s.external?.google, phone: !!s.external?.phone, email: !!s.external?.email }))
      .catch(() => { providersPromise = null; return { google: true, phone: true, email: true }; });
  }
  return providersPromise;
};
