import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Service-role client: bypasses RLS. Only ever used after the caller has been authorised.
export const serviceClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Client acting as the calling user (RLS applies).
export const userClient = (req: Request) =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });

export const requireUser = async (req: Request) => {
  const db = userClient(req);
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new HttpError(401, 'Please sign in again');
  return { db, user: data.user };
};

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Amount the customer still owes, in rupees. Mirrors public.order_due() in schema.sql.
export const dueOf = (o: { final_amount: number | null; estimated_amount: number; paid_amount: number }) =>
  Math.max(0, Number(o.final_amount ?? o.estimated_amount) - Number(o.paid_amount));

export const rzp = async (path: string, init: { method?: string; body?: unknown } = {}) => {
  const auth = btoa(`${Deno.env.get('RAZORPAY_KEY_ID')}:${Deno.env.get('RAZORPAY_KEY_SECRET')}`);
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new HttpError(502, data?.error?.description ?? 'Razorpay request failed');
  return data;
};

export const hmacHex = async (secret: string, message: string) => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

// Constant-time string compare.
export const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

// CORS: set ALLOWED_ORIGINS (comma separated, e.g. "https://poshak.com,https://www.poshak.com") so only your site's browsers can call these functions.
// Unset = allow any origin (fine for local development only).
const originHeaders = (req: Request): { headers: Record<string, string>; allowed: boolean } => {
  const list = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  const origin = req.headers.get('Origin') ?? '';
  const { ['Access-Control-Allow-Origin']: _drop, ...rest } = cors;
  if (list.length === 0) return { headers: { ...cors }, allowed: true };
  const allowed = !origin || list.includes(origin);
  return { headers: { ...rest, ...(origin && allowed ? { 'Access-Control-Allow-Origin': origin } : {}), Vary: 'Origin' }, allowed };
};
const withCors = (res: Response, headers: Record<string, string>) => {
  const out = new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
  for (const [k, v] of Object.entries(headers)) out.headers.set(k, v);
  if (!headers['Access-Control-Allow-Origin']) out.headers.delete('Access-Control-Allow-Origin');
  return out;
};

// Best-effort per-user rate limit (in memory, per function instance). Stops accidental loops and casual abuse.
const hits = new Map<string, number[]>();
export const rateLimit = (key: string, max: number, windowMs = 60_000) => {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) throw new HttpError(429, 'Too many requests. Please wait a minute and try again.');
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
};

export const handle = (fn: (req: Request) => Promise<Response>) => async (req: Request) => {
  const { headers, allowed } = originHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (!allowed) return withCors(json({ error: 'Origin not allowed' }, 403), headers);
  try {
    return withCors(await fn(req), headers);
  } catch (e) {
    if (e instanceof HttpError) return withCors(json({ error: e.message }, e.status), headers);
    console.error(e);
    return withCors(json({ error: 'Something went wrong' }, 500), headers);
  }
};
