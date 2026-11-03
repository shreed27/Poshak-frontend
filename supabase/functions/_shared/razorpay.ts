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

export const handle = (fn: (req: Request) => Promise<Response>) => async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    return await fn(req);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: 'Something went wrong' }, 500);
  }
};
