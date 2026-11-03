// Runs the real migrations in an in-memory Postgres (PGlite) with Supabase's auth pieces stubbed,
// so security rules and money logic are tested for real, with no Supabase project needed.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = path.join(here, '../../supabase/migrations');

export const ID = {
  cust: '00000000-0000-0000-0000-00000000000a',
  cust2: '00000000-0000-0000-0000-0000000000b2',
  cap: '00000000-0000-0000-0000-00000000000c',
  cap2: '00000000-0000-0000-0000-0000000000ee',
  admin: '00000000-0000-0000-0000-0000000000ad',
  cleaner: '00000000-0000-0000-0000-0000000000c1',
};

let failures = 0;
export const t = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  → ' + String(extra).slice(0, 110) : ''));
};
export const finish = () => { console.log(failures ? `\n${failures} FAILED` : '\nall passed'); process.exit(failures ? 1 : 0); };

export async function makeDb({ upTo } = {}) {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text, phone text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
    create publication supabase_realtime;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)] $$;
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated, anon, service_role;
    grant select, insert on storage.objects to authenticated;
    grant select on storage.buckets to authenticated;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant all on all tables in schema auth to anon, authenticated, service_role;
  `);
  const files = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    if (upTo && f > upTo) break;
    try { await db.exec(fs.readFileSync(path.join(MIGRATIONS, f), 'utf8')); }
    catch (e) { console.log(`MIGRATION ${f} FAILED:`, e.message, e.detail || '', e.hint || ''); process.exit(2); }
  }
  await db.exec('grant execute on all functions in schema public to service_role');
  return db;
}

// Seed: staff list first so sign-up auto-assigns roles (same path as production).
export async function seedUsers(db, { staff = true } = {}) {
  if (staff) {
    await db.exec(`insert into staff_emails(email,role,name,phone,vehicle) values
      ('admin@x.in','admin','Owner One','9811111111',null),
      ('cap@x.in','captain','Ravi Kumar','9822222222','Splendor KA01AB1234'),
      ('cap2@x.in','captain','Other Cap','9833333333',null),
      ('clean@x.in','cleaner','Laundry One','9844444444',null)`);
  }
  for (const [id, email] of [[ID.cust, 'cust@x.in'], [ID.cust2, 'cust2@x.in'], [ID.cap, 'cap@x.in'], [ID.cap2, 'cap2@x.in'], [ID.admin, 'admin@x.in'], [ID.cleaner, 'clean@x.in']]) {
    await db.exec(`insert into auth.users(id,email) values ('${id}','${email}')`);
  }
}

// Run SQL as a given user/role, the way PostgREST does.
export const asUser = (db) => async (uid, role, sql, params) => {
  await db.exec(`set role ${role}; select set_config('request.uid','${uid || ''}',false)`);
  try { return { ok: true, rows: (await db.query(sql, params)).rows }; }
  catch (e) { return { ok: false, err: e.message, rows: [] }; }
  finally { await db.exec('reset role'); }
};

export const ITEMS = (qty = 4, id = 'wash-iron') => JSON.stringify([{ service_id: id, qty }]);
