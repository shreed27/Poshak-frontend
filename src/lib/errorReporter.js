import { supabase } from './supabase';

// Our own lightweight error monitoring: browser errors → Supabase (deduplicated server-side) → Admin → System.
// No third-party account needed. Never throws, never loops, and sends at most a handful per minute per tab.
let sent = [];
const seen = new Set();

export const reportError = (error, context = {}) => {
  try {
    if (!supabase || import.meta.env.DEV && !import.meta.env.VITE_REPORT_ERRORS_IN_DEV) return;
    const message = String(error?.message || error || 'Unknown error').slice(0, 500);
    if (/ResizeObserver loop|Script error\.?$|Non-Error promise rejection|AbortError|NetworkError when attempting|Failed to fetch|Load failed/i.test(message)) return;   // browser noise, not our bugs
    const now = Date.now();
    sent = sent.filter((t) => now - t < 60000);
    const k = message + (error?.stack || '').split('\n')[1];
    if (sent.length >= 6 || seen.has(k)) return;
    seen.add(k); sent.push(now);
    supabase.rpc('log_client_error', {
      p_message: message,
      p_stack: String(error?.stack || '').slice(0, 4000) || null,
      p_url: `${window.location.pathname}${window.location.hash}`,
      p_context: { ...context, lang: navigator.language, screen: `${window.innerWidth}x${window.innerHeight}` },
      p_user_agent: navigator.userAgent
    }).then(() => {}, () => {});
  } catch { /* reporting must never break the app */ }
};

export const installGlobalErrorHandlers = () => {
  window.addEventListener('error', (e) => reportError(e.error || e.message, { source: 'window.onerror', file: e.filename, line: e.lineno }));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, { source: 'unhandledrejection' }));
};
