import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tag, Percent, CalendarClock, MapPin, SlidersHorizontal, Gift, Building2, Plus, Trash2, Save, Undo2, Eye, EyeOff, Calculator, Ticket, Info, Pencil, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCatalog } from '../../context/CatalogContext';
import { L, createMap, pickerIcon } from '../main-app/mapKit';
import { inr } from '../../lib/csv';

/* ------------------------------------------------------------------ shared bits */
const TABS = [
  ['services', 'Services & prices', Tag], ['offers', 'Discounts & coupons', Percent], ['slots', 'Pickup slots', CalendarClock], ['area', 'Service area', MapPin],
  ['ops', 'Operations', SlidersHorizontal], ['wallet', 'Wallet, referrals & claims', Gift], ['business', 'Business, GST & support', Building2]
];

const useToast = () => {
  const [t, setT] = useState(null);
  const timer = useRef();
  const show = useCallback((text, bad = false) => {
    if (text == null) { setT(null); return; }
    setT({ text, bad });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setT(null), bad ? 7000 : 3000);
  }, []);
  return [t, show];
};

// Calls an RPC and reports success/failure. Returns true on success.
const makeRun = (toast, reload) => async (fn, ok) => {
  const { error } = await fn();
  if (error) { toast(error.message, true); return false; }
  if (ok) toast(ok);
  await reload?.();
  return true;
};

const Card = ({ title, hint, actions, children, className = '' }) => (
  <section className={`panel st-card ${className}`}>
    <header><div><h3>{title}</h3>{hint && <p className="ops-muted">{hint}</p>}</div>{actions && <div className="st-actions">{actions}</div>}</header>
    {children}
  </section>
);

const Field = ({ label, hint, prefix, suffix, children, className = '' }) => (
  <label className={`st-field ${className}`}>
    <span className="st-lab">{label}</span>
    <span className="st-input">{prefix && <i>{prefix}</i>}{children}{suffix && <i>{suffix}</i>}</span>
    {hint && <small>{hint}</small>}
  </label>
);

const Toggle = ({ checked, onChange, label, hint, disabled }) => (
  <label className={`st-toggle ${disabled ? 'dis' : ''}`}>
    <span className="st-tg-text"><b>{label}</b>{hint && <small>{hint}</small>}</span>
    <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    <span className="st-sw" />
  </label>
);

// Edits a local copy; shows Save/Discard only when something actually changed.
const useDraft = (source) => {
  const [draft, setDraft] = useState(source);
  const key = JSON.stringify(source);
  useEffect(() => { setDraft(source); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key]);
  const dirty = JSON.stringify(draft) !== key;
  return [draft, setDraft, dirty, () => setDraft(source)];
};

const SaveBar = ({ dirty, busy, onSave, onDiscard, label = 'Save changes' }) => (
  <div className={`st-savebar ${dirty ? 'show' : ''}`}>
    <span><i /> Unsaved changes</span>
    <button className="ops-btn" onClick={onDiscard} disabled={busy}><Undo2 size={14} /> Discard</button>
    <button className="ops-btn ops-btn-primary" onClick={onSave} disabled={busy}><Save size={14} /> {busy ? 'Saving…' : label}</button>
  </div>
);

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const num = (v) => (v === '' || v == null ? NaN : Number(v));

/* ------------------------------------------------------------------ 1. services & prices */
const Services = ({ run, settings, toast }) => {
  const [rates, setRates] = useState(null);
  const [edits, setEdits] = useState({});
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nw, setNw] = useState({ name: '', id: '', unit: 'kg', rate: '', sac: '999711' });
  const biz = settings.business || {};
  const gst = Number(biz.gst_rate ?? 18);
  const inclusive = biz.prices_include_gst !== false;

  const load = useCallback(async () => { const { data } = await supabase.from('service_rates').select('*').order('sort').order('id'); setRates(data || []); }, []);
  useEffect(() => { load(); }, [load]);

  const val = (r, f) => edits[r.id]?.[f] ?? (f === 'rate' ? String(r.rate) : r[f] ?? '');
  const setEdit = (r, f, v) => setEdits((e) => ({ ...e, [r.id]: { ...e[r.id], [f]: v } }));
  const dirtyIds = Object.keys(edits).filter((id) => {
    const r = rates?.find((x) => x.id === id); if (!r) return false;
    const e = edits[id];
    return Object.entries(e).some(([f, v]) => String(v) !== String(f === 'rate' ? r.rate : r[f] ?? ''));
  });

  const saveRow = async (r, patch = {}) => {
    const e = { ...edits[r.id], ...patch };
    const rate = num(e.rate ?? r.rate);
    if (!(rate > 0)) { toast('Price must be above ₹0', true); return false; }
    const ok = await run(() => supabase.rpc('admin_upsert_rate', { p_id: r.id, p_name: (e.name ?? r.name).trim(), p_unit: e.unit ?? r.unit, p_rate: rate, p_active: e.active ?? r.active }));
    if (!ok) return false;
    if (e.sac != null && e.sac !== (r.sac || '')) { if (!(await run(() => supabase.rpc('admin_set_service_sac', { p_id: r.id, p_sac: e.sac })))) return false; }
    setEdits((x) => { const n = { ...x }; delete n[r.id]; return n; });
    return true;
  };
  const saveAll = async () => {
    setBusy(true);
    let n = 0;
    for (const id of dirtyIds) { if (await saveRow(rates.find((r) => r.id === id))) n++; else break; }
    setBusy(false); await load();
    if (n) toast(`${n} ${n === 1 ? 'service' : 'services'} saved — live for new orders now`);
  };
  const create = async (e) => {
    e.preventDefault();
    const id = nw.id || slug(nw.name);
    const ok = await run(() => supabase.rpc('admin_upsert_rate', { p_id: id, p_name: nw.name.trim(), p_unit: nw.unit, p_rate: num(nw.rate), p_active: true }));
    if (!ok) return;
    if (nw.sac && nw.sac !== '999711') await run(() => supabase.rpc('admin_set_service_sac', { p_id: id, p_sac: nw.sac }));
    toast(`${nw.name} added`); setNw({ name: '', id: '', unit: 'kg', rate: '', sac: '999711' }); setAdding(false); load();
  };

  // Live bill calculator using the SAVED settings, so you can sanity-check before customers see a price.
  const [qty, setQty] = useState({});
  const calc = useMemo(() => {
    const lines = (rates || []).filter((r) => r.active && Number(qty[r.id]) > 0).map((r) => ({ r, q: Number(qty[r.id]), amt: Number(r.rate) * Number(qty[r.id]) }));
    const sub = lines.reduce((a, l) => a + l.amt, 0);
    const pct = Number(settings.member_discount_pct ?? 0), min = Number(settings.min_charge ?? 99);
    const disc = Math.round((sub * pct) / 100);
    const afterDisc = Math.round(sub - disc);
    const total = lines.length ? Math.max(min, afterDisc) : 0;
    const gstAmt = inclusive ? total - total / (1 + gst / 100) : (total * gst) / 100;
    return { lines, sub, pct, min, disc, total, minApplied: lines.length && afterDisc < min, gstAmt, payable: inclusive ? total : total + gstAmt };
  }, [rates, qty, settings, gst, inclusive]);

  if (!rates) return <div className="sk" style={{ height: 260 }} />;
  const live = rates.filter((r) => r.active).length;

  return (
    <div className="st-stack">
      <div className="st-col">
        <Card title="Services & prices" hint={`${live} live · ${rates.length - live} hidden. Price changes apply to new orders immediately; existing orders keep their price.`}
          actions={<><button className="ops-btn" onClick={() => setAdding(!adding)}><Plus size={14} /> Add service</button>{dirtyIds.length > 0 && <button className="ops-btn ops-btn-primary" disabled={busy} onClick={saveAll}><Save size={14} /> Save {dirtyIds.length} {dirtyIds.length === 1 ? 'change' : 'changes'}</button>}</>}>
          {adding && (
            <form className="st-add" onSubmit={create}>
              <Field label="Service name"><input required value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value, id: slug(e.target.value) })} placeholder="e.g. Curtain wash" /></Field>
              <Field label="ID" hint="Permanent. Letters, numbers, dashes."><input required pattern="[a-z0-9\-]{2,40}" value={nw.id} onChange={(e) => setNw({ ...nw, id: e.target.value })} /></Field>
              <Field label="Charged per"><select value={nw.unit} onChange={(e) => setNw({ ...nw, unit: e.target.value })}><option value="kg">kg</option><option value="pc">piece</option><option value="pair">pair</option></select></Field>
              <Field label="Price" prefix="₹"><input required type="number" min="1" value={nw.rate} onChange={(e) => setNw({ ...nw, rate: e.target.value })} /></Field>
              <Field label="SAC code" hint="GST service code"><input value={nw.sac} onChange={(e) => setNw({ ...nw, sac: e.target.value })} /></Field>
              <div className="st-add-go"><button type="button" className="ops-btn" onClick={() => setAdding(false)}>Cancel</button><button className="ops-btn ops-btn-primary">Add service</button></div>
            </form>
          )}
          <div className="tbl-wrap">
            <table className="tbl st-tbl">
              <thead><tr><th>Service</th><th>Per</th><th>SAC</th><th className="r">Price</th><th className="r">{inclusive ? `GST in price (${gst}%)` : `Customer pays (+${gst}% GST)`}</th><th>Visible</th><th /></tr></thead>
              <tbody>
                {rates.map((r) => {
                  const rate = num(val(r, 'rate')) || 0;
                  const dirty = dirtyIds.includes(r.id);
                  const active = edits[r.id]?.active ?? r.active;
                  return (
                    <tr key={r.id} className={`${dirty ? 'dirty' : ''} ${active ? '' : 'off'}`}>
                      <td><input className="ops-inline" value={val(r, 'name')} onChange={(e) => setEdit(r, 'name', e.target.value)} /><small className="mono">{r.id}</small></td>
                      <td><select className="ops-inline" style={{ width: 78 }} value={val(r, 'unit')} onChange={(e) => setEdit(r, 'unit', e.target.value)}><option value="kg">kg</option><option value="pc">pc</option><option value="pair">pair</option></select></td>
                      <td><input className="ops-inline" style={{ width: 82 }} value={val(r, 'sac')} onChange={(e) => setEdit(r, 'sac', e.target.value)} /></td>
                      <td className="r"><span className="st-price">₹<input type="number" min="1" value={val(r, 'rate')} onChange={(e) => setEdit(r, 'rate', e.target.value)} /></span></td>
                      <td className="r"><small>{inclusive ? inr(rate - rate / (1 + gst / 100)) : inr(rate * (1 + gst / 100))}</small></td>
                      <td><label className="st-mini"><input type="checkbox" checked={active} onChange={(e) => setEdit(r, 'active', e.target.checked)} /><span className="st-sw" /></label></td>
                      <td className="r">{dirty && <button className="ops-btn ops-btn-primary" disabled={busy} onClick={async () => { setBusy(true); if (await saveRow(r, { active })) toast(`${r.name} saved`); setBusy(false); load(); }}>Save</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="st-note"><Info size={13} /> Hiding a service removes it from the customer app but keeps old orders and invoices intact. Services can’t be deleted, so history stays correct.</p>
        </Card>
      </div>

      <Card title="Bill calculator" hint="Try an order with today’s saved prices, discount and minimum charge." className="st-calc">
        <div className="st-calc-grid">
        <div className="st-calc-in">
          {rates.filter((r) => r.active).map((r) => (
            <label key={r.id}><span>{r.name}<small>₹{r.rate}/{r.unit}</small></span><input type="number" min="0" step={r.unit === 'kg' ? '0.5' : '1'} placeholder="0" value={qty[r.id] ?? ''} onChange={(e) => setQty({ ...qty, [r.id]: e.target.value })} /><em>{r.unit}</em></label>
          ))}
        </div>
        <div className="st-bill">
          {calc.lines.length === 0 ? <p className="ops-muted">Enter a quantity above.</p> : (<>
            {calc.lines.map((l) => <div key={l.r.id}><span>{l.r.name} × {l.q}{l.r.unit}</span><b>{inr(l.amt)}</b></div>)}
            <div><span>Subtotal</span><b>{inr(calc.sub)}</b></div>
            {calc.disc > 0 && <div className="good"><span>Member discount ({calc.pct}%)</span><b>−{inr(calc.disc)}</b></div>}
            {calc.minApplied && <div className="warn"><span>Minimum charge applied</span><b>{inr(calc.min)}</b></div>}
            <div className="tot"><span>Total{inclusive ? ' (incl. GST)' : ''}</span><b>{inr(calc.total)}</b></div>
            <div><span>{inclusive ? `of which GST @${gst}%` : `+ GST @${gst}%`}</span><b>{inr(calc.gstAmt)}</b></div>
            {!inclusive && <div className="tot"><span>Customer pays</span><b>{inr(calc.payable)}</b></div>}
          </>)}
        </div>
        </div>
      </Card>
    </div>
  );
};

/* ------------------------------------------------------------------ 2. discounts & coupons */
const emptyCoupon = { code: '', description: '', kind: 'flat', value: '', min_order: '', max_discount: '', first_order_only: false, per_user_limit: '1', usage_limit: '', expires: '', active: true };

const CouponModal = ({ initial, onClose, onSave }) => {
  const [c, setC] = useState(initial);
  const [busy, setBusy] = useState(false);
  const editing = !!initial.created;
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    const ok = await onSave(c);
    setBusy(false); if (ok) onClose();
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <form className="modal st-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <header><h3>{editing ? `Edit ${c.code}` : 'New coupon'}</h3><button type="button" className="ops-icon" onClick={onClose}><X size={16} /></button></header>
        <div className="st-grid2">
          <Field label="Code"><input required disabled={editing} pattern="[A-Za-z0-9]{3,20}" value={c.code} onChange={(e) => setC({ ...c, code: e.target.value.toUpperCase() })} placeholder="FIRST50" /></Field>
          <Field label="Type"><select value={c.kind} onChange={(e) => setC({ ...c, kind: e.target.value })}><option value="flat">Flat ₹ off</option><option value="percent">Percent off</option></select></Field>
          <Field label="Description" className="full" hint="Shown to customers"><input required value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} placeholder="₹50 off your first order" /></Field>
          <Field label={c.kind === 'flat' ? 'Discount' : 'Percent'} prefix={c.kind === 'flat' ? '₹' : null} suffix={c.kind === 'percent' ? '%' : null}><input required type="number" min="1" max={c.kind === 'percent' ? 100 : undefined} value={c.value} onChange={(e) => setC({ ...c, value: e.target.value })} /></Field>
          <Field label="Minimum order" prefix="₹"><input type="number" min="0" value={c.min_order} onChange={(e) => setC({ ...c, min_order: e.target.value })} placeholder="0" /></Field>
          {c.kind === 'percent' && <Field label="Max discount" prefix="₹" hint="Cap for percent coupons"><input type="number" min="1" value={c.max_discount} onChange={(e) => setC({ ...c, max_discount: e.target.value })} placeholder="No cap" /></Field>}
          <Field label="Uses per customer"><input type="number" min="1" value={c.per_user_limit} onChange={(e) => setC({ ...c, per_user_limit: e.target.value })} /></Field>
          <Field label="Total uses" hint="Blank = unlimited"><input type="number" min="1" value={c.usage_limit} onChange={(e) => setC({ ...c, usage_limit: e.target.value })} placeholder="Unlimited" /></Field>
          <Field label="Expires on" hint="Blank = never"><input type="date" value={c.expires} onChange={(e) => setC({ ...c, expires: e.target.value })} /></Field>
        </div>
        <Toggle checked={c.first_order_only} onChange={(v) => setC({ ...c, first_order_only: v })} label="First order only" hint="Only customers with no earlier orders can use it" />
        <Toggle checked={c.active} onChange={(v) => setC({ ...c, active: v })} label="Active" />
        <div className="modal-foot"><button type="button" className="ops-btn" onClick={onClose}>Cancel</button><button className="ops-btn ops-btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save coupon'}</button></div>
      </form>
    </div>
  );
};

const Offers = ({ run, settings, toast }) => {
  const [rules, setRules, dirty, reset] = useDraft({ pct: String(settings.member_discount_pct ?? 0), min: String(settings.min_charge ?? 99) });
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState(null);
  const [uses, setUses] = useState({});
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    const [{ data: c }, { data: o }] = await Promise.all([
      supabase.from('coupons').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('coupon_code, discount_amount, status').not('coupon_code', 'is', null).neq('status', 'cancelled').limit(5000)
    ]);
    setList(c || []);
    const m = {};
    (o || []).forEach((x) => { m[x.coupon_code] = m[x.coupon_code] || { n: 0, amt: 0 }; m[x.coupon_code].n++; m[x.coupon_code].amt += Number(x.discount_amount || 0); });
    setUses(m);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveRules = async () => {
    const pct = num(rules.pct), min = num(rules.min);
    if (!(pct >= 0 && pct <= 90)) return toast('Discount must be between 0 and 90%', true);
    if (!(min >= 0)) return toast('Minimum charge cannot be negative', true);
    setBusy(true);
    const a = await run(() => supabase.rpc('admin_set_setting', { p_key: 'member_discount_pct', p_value: pct }));
    const b = a && await run(() => supabase.rpc('admin_set_setting', { p_key: 'min_charge', p_value: min }), 'Pricing rules saved');
    setBusy(false); return b;
  };
  const saveCoupon = async (c) => {
    const ok = await run(() => supabase.rpc('admin_upsert_coupon', {
      p_code: c.code, p_description: c.description, p_kind: c.kind, p_value: num(c.value), p_min_order: num(c.min_order) || 0,
      p_max_discount: c.kind === 'percent' && num(c.max_discount) > 0 ? num(c.max_discount) : null, p_first_order_only: c.first_order_only,
      p_per_user_limit: num(c.per_user_limit) || 1, p_usage_limit: num(c.usage_limit) > 0 ? num(c.usage_limit) : null,
      p_active: c.active, p_expires_at: c.expires ? new Date(`${c.expires}T23:59:59+05:30`).toISOString() : null
    }), `${c.code} saved`);
    if (ok) load();
    return ok;
  };
  const edit = (c) => setModal({ ...emptyCoupon, ...c, value: String(c.value), min_order: c.min_order ? String(c.min_order) : '', max_discount: c.max_discount ? String(c.max_discount) : '', per_user_limit: String(c.per_user_limit), usage_limit: c.usage_limit ? String(c.usage_limit) : '', expires: c.expires_at ? c.expires_at.slice(0, 10) : '' });
  const status = (c) => (!c.active ? ['Off', ''] : c.expires_at && new Date(c.expires_at) < new Date() ? ['Expired', 'bad'] : c.usage_limit && (uses[c.code]?.n || 0) >= c.usage_limit ? ['Used up', 'warn'] : ['Live', 'good']);

  return (
    <div className="st-stack">
      <Card title="Automatic pricing rules" hint="Apply to every order without a code. For targeted offers use coupons and keep the discount at 0%.">
        <div className="st-grid2">
          <Field label="Automatic discount" suffix="%" hint="0 = none. Maximum 90."><input type="number" min="0" max="90" value={rules.pct} onChange={(e) => setRules({ ...rules, pct: e.target.value })} /></Field>
          <Field label="Minimum charge per order" prefix="₹" hint="Small orders are billed at least this much."><input type="number" min="0" value={rules.min} onChange={(e) => setRules({ ...rules, min: e.target.value })} /></Field>
        </div>
        <SaveBar dirty={dirty} busy={busy} onSave={saveRules} onDiscard={reset} />
      </Card>

      <Card title="Coupons" hint="Customers enter a code at checkout. The server re-checks every rule, so these can’t be bypassed."
        actions={<button className="ops-btn ops-btn-primary" onClick={() => setModal(emptyCoupon)}><Plus size={14} /> New coupon</button>}>
        {!list ? <div className="sk" style={{ height: 120 }} /> : list.length === 0 ? <div className="ch-empty"><Ticket size={22} /><br />No coupons yet. Create one to run an offer.</div> : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Code</th><th>Offer</th><th>Rules</th><th className="r">Used</th><th>Status</th><th /></tr></thead>
            <tbody>{list.map((c) => {
              const [sl, sc] = status(c); const u = uses[c.code];
              return (
                <tr key={c.code} className={c.active ? '' : 'off'}>
                  <td><b className="st-code">{c.code}</b><br /><small>{c.description}</small></td>
                  <td><b>{c.kind === 'flat' ? `₹${c.value} off` : `${c.value}% off`}</b>{c.kind === 'percent' && c.max_discount ? <small><br />up to ₹{c.max_discount}</small> : null}</td>
                  <td><small>{c.min_order > 0 ? `Min ₹${c.min_order}` : 'No minimum'} · {c.per_user_limit}× per customer{c.first_order_only ? ' · first order' : ''}{c.expires_at ? <><br />Expires {new Date(c.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</> : null}</small></td>
                  <td className="r"><b>{u?.n || 0}</b>{c.usage_limit ? <small> / {c.usage_limit}</small> : null}{u?.amt ? <small><br />{inr(u.amt)} given</small> : null}</td>
                  <td><span className={`pill ${sc}`}>{sl}</span></td>
                  <td className="r"><div className="st-rowbtns">
                    <button className="ops-icon" title="Edit" onClick={() => edit(c)}><Pencil size={14} /></button>
                    <button className="ops-icon" title={c.active ? 'Turn off' : 'Turn on'} onClick={() => run(() => supabase.rpc('admin_upsert_coupon', { p_code: c.code, p_description: c.description, p_kind: c.kind, p_value: c.value, p_min_order: c.min_order, p_max_discount: c.max_discount, p_first_order_only: c.first_order_only, p_per_user_limit: c.per_user_limit, p_usage_limit: c.usage_limit, p_active: !c.active, p_expires_at: c.expires_at }), c.active ? `${c.code} turned off` : `${c.code} is live`).then(load)}>{c.active ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                  </div></td>
                </tr>
              );
            })}</tbody></table></div>
        )}
      </Card>
      {modal && <CouponModal initial={modal} onClose={() => setModal(null)} onSave={saveCoupon} />}
    </div>
  );
};

/* ------------------------------------------------------------------ 3. pickup slots */
const winKey = (w) => `${w[0]}-${w[1]}`;
const hr = (h) => `${h % 12 || 12}${h < 12 || h === 24 ? ' AM' : ' PM'}`;

const Slots = ({ run, settings, toast }) => {
  const src = useMemo(() => ({
    windows: (settings.slot_windows || [[7, 9], [9, 11], [11, 13], [13, 15], [15, 17], [17, 19], [19, 21]]).map((w) => [Number(w[0]), Number(w[1])]),
    cap: String(settings.max_orders_per_slot ?? 6),
    over: Object.fromEntries(Object.entries(settings.slot_capacity_overrides || {}).map(([k, v]) => [k, String(v)])),
    resched: String(settings.max_reschedules ?? 2)
  }), [settings]);
  const [d, setD, dirty, reset] = useDraft(src);
  const [busy, setBusy] = useState(false);

  const setWin = (i, idx, v) => setD({ ...d, windows: d.windows.map((w, j) => (j === i ? (idx === 0 ? [Number(v), w[1]] : [w[0], Number(v)]) : w)) });
  const addWin = () => { const last = d.windows[d.windows.length - 1]; const s = last ? Math.min(last[1], 22) : 8; setD({ ...d, windows: [...d.windows, [s, Math.min(s + 2, 24)]] }); };
  const delWin = (i) => { const k = winKey(d.windows[i]); const over = { ...d.over }; delete over[k]; setD({ ...d, windows: d.windows.filter((_, j) => j !== i), over }); };
  const capOf = (w) => d.over[winKey(w)] ?? '';

  const save = async () => {
    const bad = d.windows.find((w) => !(w[0] >= 0 && w[1] <= 24 && w[0] < w[1]));
    if (bad) return toast(`Window ${winKey(bad)} is invalid — start must be before end`, true);
    const sorted = [...d.windows].sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < sorted.length; i++) if (sorted[i][0] < sorted[i - 1][1]) return toast(`Windows ${winKey(sorted[i - 1])} and ${winKey(sorted[i])} overlap`, true);
    if (!(num(d.cap) >= 1)) return toast('Default capacity must be at least 1', true);
    const keys = new Set(sorted.map(winKey));
    const over = Object.fromEntries(Object.entries(d.over).filter(([k, v]) => keys.has(k) && v !== '' && num(v) >= 0).map(([k, v]) => [k, Number(v)]));
    setBusy(true);
    const ok = (await run(() => supabase.rpc('admin_set_setting', { p_key: 'slot_windows', p_value: sorted }))) &&
      (await run(() => supabase.rpc('admin_set_setting', { p_key: 'max_orders_per_slot', p_value: Number(d.cap) }))) &&
      (await run(() => supabase.rpc('admin_set_setting', { p_key: 'slot_capacity_overrides', p_value: over }))) &&
      (await run(() => supabase.rpc('admin_set_setting', { p_key: 'max_reschedules', p_value: Number(d.resched) || 0 }), 'Slots saved — customers see them now'));
    setBusy(false); return ok;
  };

  const total = d.windows.reduce((a, w) => a + (num(capOf(w)) >= 0 && capOf(w) !== '' ? Number(capOf(w)) : Number(d.cap) || 0), 0);

  return (
    <div className="st-stack">
      <Card title="Pickup windows & capacity" hint="Each window can take a limited number of orders per day. When a window is full, customers see it as unavailable.">
        <div className="st-grid2" style={{ marginBottom: '1rem' }}>
          <Field label="Default capacity per window" hint="Orders per window per day"><input type="number" min="1" value={d.cap} onChange={(e) => setD({ ...d, cap: e.target.value })} /></Field>
          <Field label="Customer reschedules allowed" hint="Per order. 0 = none"><input type="number" min="0" value={d.resched} onChange={(e) => setD({ ...d, resched: e.target.value })} /></Field>
        </div>
        <div className="st-wins">
          {d.windows.map((w, i) => (
            <div key={i} className="st-win">
              <div className="st-win-t"><b>{hr(w[0])} – {hr(w[1])}</b><button className="ops-icon" title="Remove window" onClick={() => delWin(i)}><Trash2 size={14} /></button></div>
              <div className="st-win-r">
                <select value={w[0]} onChange={(e) => setWin(i, 0, e.target.value)}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hr(h)}</option>)}</select>
                <span>to</span>
                <select value={w[1]} onChange={(e) => setWin(i, 1, e.target.value)}>{Array.from({ length: 24 }, (_, h) => h + 1).map((h) => <option key={h} value={h}>{hr(h)}</option>)}</select>
              </div>
              <label className="st-win-c"><span>Capacity</span><input type="number" min="0" placeholder={`${d.cap} (default)`} value={capOf(w)} onChange={(e) => setD({ ...d, over: { ...d.over, [winKey(w)]: e.target.value } })} /></label>
            </div>
          ))}
          <button className="st-win st-win-add" onClick={addWin}><Plus size={18} /> Add window</button>
        </div>
        <p className="st-note"><Info size={13} /> {d.windows.length} windows · up to <b>{total}</b> pickups a day. Leave a window’s capacity blank to use the default; enter 0 to close it.</p>
        <SaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={reset} label="Save slots" />
      </Card>
    </div>
  );
};

/* ------------------------------------------------------------------ 4. service area */
const Area = ({ run, settings, toast }) => {
  const a = settings.service_area || {};
  const [d, setD, dirty, reset] = useDraft({ name: a.name || '', short: a.short || '', lat: String(a.lat ?? 12.9346), lng: String(a.lng ?? 77.606), radius_km: String(a.radius_km ?? 3) });
  const [busy, setBusy] = useState(false);
  const el = useRef(null); const map = useRef(null); const circle = useRef(null); const pin = useRef(null);
  const dRef = useRef(d); dRef.current = d;

  useEffect(() => {
    const m = createMap(el.current, { lat: num(d.lat) || 12.93, lng: num(d.lng) || 77.6 }, 13);
    pin.current = L.marker([num(d.lat) || 12.93, num(d.lng) || 77.6], { icon: pickerIcon(), draggable: true }).addTo(m);
    circle.current = L.circle([num(d.lat) || 12.93, num(d.lng) || 77.6], { radius: (num(d.radius_km) || 1) * 1000, color: '#fa5929', weight: 2, fillColor: '#fa5929', fillOpacity: 0.1 }).addTo(m);
    const move = (ll) => setD({ ...dRef.current, lat: ll.lat.toFixed(5), lng: ll.lng.toFixed(5) });
    pin.current.on('dragend', () => move(pin.current.getLatLng()));
    m.on('click', (e) => move(e.latlng));
    map.current = m;
    return () => m.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const lat = num(d.lat), lng = num(d.lng), r = num(d.radius_km);
    if (!map.current || Number.isNaN(lat) || Number.isNaN(lng)) return;
    pin.current.setLatLng([lat, lng]); circle.current.setLatLng([lat, lng]);
    if (r > 0) { circle.current.setRadius(r * 1000); map.current.fitBounds(circle.current.getBounds(), { padding: [30, 30], animate: false }); }
  }, [d.lat, d.lng, d.radius_km]);

  const save = async () => {
    const lat = num(d.lat), lng = num(d.lng), r = num(d.radius_km);
    if (!d.name.trim()) return toast('Give the area a name', true);
    if (!(lat >= -90 && lat <= 90) || !(lng >= -180 && lng <= 180)) return toast('Coordinates look wrong', true);
    if (!(r > 0)) return toast('Radius must be above 0 km', true);
    setBusy(true);
    const ok = await run(() => supabase.rpc('admin_set_setting', { p_key: 'service_area', p_value: { name: d.name.trim(), short: (d.short || d.name).trim(), lat, lng, radius_km: r } }), 'Service area saved');
    setBusy(false); return ok;
  };
  const locate = () => navigator.geolocation?.getCurrentPosition((p) => setD({ ...d, lat: p.coords.latitude.toFixed(5), lng: p.coords.longitude.toFixed(5) }), () => toast('Could not get your location', true));
  const kmArea = Math.PI * (num(d.radius_km) || 0) ** 2;

  return (
    <Card title="Service area" hint="Customers outside this circle can’t place orders — the server enforces it. Click the map or drag the pin to move the centre.">
      <div className="st-area">
        <div ref={el} className="st-map" />
        <div className="st-area-f">
          <Field label="Area name" hint="Shown to customers"><input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
          <Field label="Short name" hint="Used in tight spaces"><input value={d.short} onChange={(e) => setD({ ...d, short: e.target.value })} /></Field>
          <div className="st-grid2">
            <Field label="Latitude"><input value={d.lat} onChange={(e) => setD({ ...d, lat: e.target.value })} /></Field>
            <Field label="Longitude"><input value={d.lng} onChange={(e) => setD({ ...d, lng: e.target.value })} /></Field>
          </div>
          <Field label={`Radius — ${num(d.radius_km) || 0} km (≈ ${kmArea.toFixed(0)} km² covered)`}>
            <input type="range" min="0.5" max="25" step="0.5" value={num(d.radius_km) || 1} onChange={(e) => setD({ ...d, radius_km: e.target.value })} />
          </Field>
          <button className="ops-btn" onClick={locate}><MapPin size={14} /> Use my current location</button>
        </div>
      </div>
      <SaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={reset} />
    </Card>
  );
};

/* ------------------------------------------------------------------ 5. operations */
const Ops = ({ run, settings, toast }) => {
  const src = useMemo(() => ({
    require_photos: settings.require_photos ?? true, require_job_accept: settings.require_job_accept ?? true, auto_assign: settings.auto_assign ?? false, require_cleaner_step: settings.require_cleaner_step ?? false,
    captain_fee_per_order: String(settings.captain_fee_per_order ?? 0), offer_timeout_min: String(settings.offer_timeout_min ?? 5), sla_hours: String(settings.sla_hours ?? 48),
    ops_phone: typeof settings.ops_phone === 'string' ? settings.ops_phone : ''
  }), [settings]);
  const [d, setD, dirty, reset] = useDraft(src);
  const [busy, setBusy] = useState(false);
  const NUMS = { captain_fee_per_order: 'Captain fee', offer_timeout_min: 'Offer timeout', sla_hours: 'SLA hours' };
  const save = async () => {
    for (const [k, l] of Object.entries(NUMS)) if (!(num(d[k]) >= 0)) return toast(`${l} must be a number`, true);
    setBusy(true);
    let ok = true;
    for (const [k, v] of Object.entries(d)) {
      if (String(v) === String(src[k])) continue;                                       // only send what changed
      ok = await run(() => supabase.rpc('admin_set_setting', { p_key: k, p_value: k in NUMS ? Number(v) : v })); if (!ok) break;
    }
    if (ok) toast('Operations settings saved');
    setBusy(false); return ok;
  };
  return (
    <div className="st-stack">
      <Card title="Dispatch & quality" hint="How orders move from the customer to a captain and the laundry.">
        <Toggle checked={d.auto_assign} onChange={(v) => setD({ ...d, auto_assign: v })} label="Auto-assign new orders" hint="Offers each order to the online captain with the fewest jobs, then the nearest." />
        <Toggle checked={d.require_job_accept} onChange={(v) => setD({ ...d, require_job_accept: v })} label="Captain must accept assignments" hint="Unanswered offers go back to the queue after the timeout." />
        <Toggle checked={d.require_photos} onChange={(v) => setD({ ...d, require_photos: v })} label="Photos + piece count at pickup and delivery" hint="Protects you in claims and catches count mismatches." />
        <Toggle checked={d.require_cleaner_step} onChange={(v) => setD({ ...d, require_cleaner_step: v })} label="Wait for the laundry before delivery" hint="Delivery can only start once the laundry partner marks the order ready." />
        <div className="st-grid2" style={{ marginTop: '.9rem' }}>
          <Field label="Offer timeout" suffix="min" hint="How long a captain has to accept"><input type="number" min="1" value={d.offer_timeout_min} onChange={(e) => setD({ ...d, offer_timeout_min: e.target.value })} /></Field>
          <Field label="Promised turnaround (SLA)" suffix="hours" hint="Orders later than this count as late in Overview"><input type="number" min="1" value={d.sla_hours} onChange={(e) => setD({ ...d, sla_hours: e.target.value })} /></Field>
        </div>
      </Card>
      <Card title="Captain pay & contact">
        <div className="st-grid2">
          <Field label="Fee per delivery" prefix="₹" hint="Credited to the captain for each delivered order"><input type="number" min="0" value={d.captain_fee_per_order} onChange={(e) => setD({ ...d, captain_fee_per_order: e.target.value })} /></Field>
          <Field label="Ops phone" hint="Captains’ “Call ops” button"><input value={d.ops_phone} onChange={(e) => setD({ ...d, ops_phone: e.target.value.replace(/[^\d+ ]/g, '') })} /></Field>
        </div>
        <SaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={reset} />
      </Card>
    </div>
  );
};

/* ------------------------------------------------------------------ 6. wallet, referrals & claims */
const Wallet = ({ run, settings, toast }) => {
  const [plans, setPlans] = useState(null);
  const [pm, setPm] = useState(null);
  const [d, setD, dirty, reset] = useDraft({
    referral_bonus: String(settings.referral_bonus ?? 0), referral_min_order: String(settings.referral_min_order ?? 0),
    claim_credit_multiple: String(settings.claim_credit_multiple ?? 3), claims_policy: typeof settings.claims_policy === 'string' ? settings.claims_policy : ''
  });
  const [busy, setBusy] = useState(false);
  const loadPlans = useCallback(async () => { const { data } = await supabase.from('plans').select('*').order('sort'); setPlans(data || []); }, []);
  useEffect(() => { loadPlans(); }, [loadPlans]);

  const savePlan = async (p) => {
    if (!/^[a-z0-9-]{2,30}$/.test(p.id)) { toast('Pack id: lowercase letters, numbers, dashes', true); return false; }
    if (!(num(p.price) > 0) || !(num(p.credit) > 0)) { toast('Price and credit must be above ₹0', true); return false; }
    const ok = await run(() => supabase.rpc('admin_upsert_plan', { p_id: p.id, p_name: p.name, p_price: Number(p.price), p_credit: Number(p.credit), p_description: p.description || null, p_active: p.active ?? true }), `${p.name} saved`);
    if (ok) loadPlans(); return ok;
  };
  const save = async () => {
    for (const k of ['referral_bonus', 'referral_min_order', 'claim_credit_multiple']) if (!(num(d[k]) >= 0)) return toast('Amounts must be numbers', true);
    setBusy(true);
    let ok = true;
    for (const [k, v] of Object.entries(d)) { ok = await run(() => supabase.rpc('admin_set_setting', { p_key: k, p_value: k === 'claims_policy' ? v : Number(v) })); if (!ok) break; }
    if (ok) toast('Saved'); setBusy(false); return ok;
  };
  const bonus = (p) => (Number(p.price) > 0 ? Math.round(((Number(p.credit) - Number(p.price)) / Number(p.price)) * 100) : 0);

  return (
    <div className="st-stack">
      <Card title="Prepaid wallet packs" hint="Customers pay the price once and receive the larger wallet credit — good for cash flow and repeat orders."
        actions={<button className="ops-btn ops-btn-primary" onClick={() => setPm({ id: '', name: '', price: '', credit: '', description: '', active: true, isNew: true })}><Plus size={14} /> New pack</button>}>
        {!plans ? <div className="sk" style={{ height: 100 }} /> : plans.length === 0 ? <div className="ch-empty">No packs yet.</div> : (
          <div className="st-plans">
            {plans.map((p) => (
              <div key={p.id} className={`st-plan ${p.active ? '' : 'off'}`}>
                <div className="st-plan-top"><b>{p.name}</b>{bonus(p) > 0 && <span className="pill good">+{bonus(p)}% extra</span>}</div>
                <div className="st-plan-v">Pay {inr(p.price)} <em>→</em> get {inr(p.credit)}</div>
                {p.description && <small>{p.description}</small>}
                <div className="st-rowbtns">
                  <button className="ops-btn" onClick={() => setPm({ ...p, price: String(p.price), credit: String(p.credit) })}><Pencil size={13} /> Edit</button>
                  <button className="ops-btn" onClick={() => savePlan({ ...p, active: !p.active })}>{p.active ? <><EyeOff size={13} /> Hide</> : <><Eye size={13} /> Show</>}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Referrals" hint="Both the referrer and the friend get the bonus in their wallet after the friend’s first delivered order.">
        <div className="st-grid2">
          <Field label="Referral bonus (each)" prefix="₹"><input type="number" min="0" value={d.referral_bonus} onChange={(e) => setD({ ...d, referral_bonus: e.target.value })} /></Field>
          <Field label="Friend’s first order must be at least" prefix="₹"><input type="number" min="0" value={d.referral_min_order} onChange={(e) => setD({ ...d, referral_min_order: e.target.value })} /></Field>
        </div>
      </Card>

      <Card title="Claims & lost-item policy" hint="Applies to complaints. Customers see the policy text before filing a claim.">
        <Field label="Maximum credit" suffix="× the order’s cleaning charge" hint="A lost or damaged garment is credited up to this multiple of that order’s bill"><input type="number" min="0" step="0.5" value={d.claim_credit_multiple} onChange={(e) => setD({ ...d, claim_credit_multiple: e.target.value })} /></Field>
        <Field label="Policy text shown to customers" className="full"><textarea rows={5} value={d.claims_policy} onChange={(e) => setD({ ...d, claims_policy: e.target.value })} /></Field>
        <SaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={reset} />
      </Card>

      {pm && (
        <div className="modal-back" onClick={() => setPm(null)}>
          <form className="modal st-modal" onClick={(e) => e.stopPropagation()} onSubmit={async (e) => { e.preventDefault(); if (await savePlan(pm)) setPm(null); }}>
            <header><h3>{pm.isNew ? 'New wallet pack' : `Edit ${pm.name}`}</h3><button type="button" className="ops-icon" onClick={() => setPm(null)}><X size={16} /></button></header>
            <div className="st-grid2">
              <Field label="Name"><input required value={pm.name} onChange={(e) => setPm({ ...pm, name: e.target.value, id: pm.isNew ? slug(e.target.value) : pm.id })} placeholder="Diwali pack" /></Field>
              <Field label="ID" hint="Permanent"><input required disabled={!pm.isNew} value={pm.id} onChange={(e) => setPm({ ...pm, id: e.target.value })} /></Field>
              <Field label="Customer pays" prefix="₹"><input required type="number" min="1" value={pm.price} onChange={(e) => setPm({ ...pm, price: e.target.value })} /></Field>
              <Field label="Wallet credit" prefix="₹" hint={num(pm.price) > 0 && num(pm.credit) > 0 ? `${bonus(pm)}% extra value` : ''}><input required type="number" min="1" value={pm.credit} onChange={(e) => setPm({ ...pm, credit: e.target.value })} /></Field>
              <Field label="Description" className="full"><input value={pm.description || ''} onChange={(e) => setPm({ ...pm, description: e.target.value })} placeholder="Shown on the pack card" /></Field>
            </div>
            <div className="modal-foot"><button type="button" className="ops-btn" onClick={() => setPm(null)}>Cancel</button><button className="ops-btn ops-btn-primary">Save pack</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ 7. business, GST & support */
const Business = ({ run, settings, toast }) => {
  const [d, setD, dirty, reset] = useDraft({
    biz: { gst_registered: false, prices_include_gst: true, gst_rate: 18, invoice_prefix: 'PSK', legal_name: '', address: '', state: '', gstin: '', ...(settings.business || {}) },
    sup: { phone: '', email: '', grievance_officer: '', grievance_email: '', ...(settings.support || {}) }
  });
  const [busy, setBusy] = useState(false);
  const b = d.biz; const sb = (k, v) => setD({ ...d, biz: { ...d.biz, [k]: v } }); const ss = (k, v) => setD({ ...d, sup: { ...d.sup, [k]: v } });
  const gstinOk = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test((b.gstin || '').toUpperCase());

  const save = async () => {
    if (b.gst_registered) {
      if (!gstinOk) return toast('Enter a valid 15-character GSTIN (e.g. 29ABCDE1234F1Z5)', true);
      if (!b.legal_name?.trim() || !b.address?.trim()) return toast('Legal name and address are required for tax invoices', true);
    }
    setBusy(true);
    const ok = (await run(() => supabase.rpc('admin_set_setting', { p_key: 'business', p_value: { ...b, gst_rate: Number(b.gst_rate) } }))) &&
      (await run(() => supabase.rpc('admin_set_setting', { p_key: 'support', p_value: d.sup }), 'Business & support details saved'));
    setBusy(false); return ok;
  };

  return (
    <div className="st-stack">
      <Card title="Business & GST" hint="Printed on every invoice. Confirm the rate and SAC codes with your CA.">
        <Toggle checked={b.gst_registered} onChange={(v) => sb('gst_registered', v)} label="GST registered" hint="On: invoices become GST tax invoices with your GSTIN. Off: invoices are simple receipts." />
        <Toggle checked={b.prices_include_gst !== false} onChange={(v) => sb('prices_include_gst', v)} label="Listed prices already include GST" hint="Off: GST is added on top of the listed price at checkout." />
        <div className="st-grid2" style={{ marginTop: '.9rem' }}>
          <Field label="Legal / trade name" className="full"><input value={b.legal_name} onChange={(e) => sb('legal_name', e.target.value)} /></Field>
          <Field label="Registered address" className="full"><input value={b.address} onChange={(e) => sb('address', e.target.value)} /></Field>
          <Field label="State" hint="Decides CGST+SGST vs IGST"><input value={b.state} onChange={(e) => sb('state', e.target.value)} /></Field>
          <Field label="GSTIN" hint={b.gstin ? (gstinOk ? '✓ Format is valid' : 'Not a valid GSTIN yet') : '15 characters'}><input maxLength={15} value={b.gstin} onChange={(e) => sb('gstin', e.target.value.toUpperCase())} /></Field>
          <Field label="GST rate" suffix="%"><input type="number" min="0" max="28" step="0.5" value={b.gst_rate} onChange={(e) => sb('gst_rate', e.target.value)} /></Field>
          <Field label="Invoice number prefix" hint="Starts every invoice number"><input maxLength={6} value={b.invoice_prefix} onChange={(e) => sb('invoice_prefix', e.target.value.toUpperCase())} /></Field>
        </div>
      </Card>
      <Card title="Support & grievance contacts" hint="Shown in the customer app’s Help centre and on invoices. Indian e-commerce rules expect a named grievance officer.">
        <div className="st-grid2">
          <Field label="Support phone"><input value={d.sup.phone} onChange={(e) => ss('phone', e.target.value)} /></Field>
          <Field label="Support email"><input type="email" value={d.sup.email} onChange={(e) => ss('email', e.target.value)} /></Field>
          <Field label="Grievance officer"><input value={d.sup.grievance_officer} onChange={(e) => ss('grievance_officer', e.target.value)} /></Field>
          <Field label="Grievance email"><input type="email" value={d.sup.grievance_email} onChange={(e) => ss('grievance_email', e.target.value)} /></Field>
        </div>
        <SaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={reset} />
      </Card>
    </div>
  );
};

/* ------------------------------------------------------------------ page */
export const AdminSettings = () => {
  const { reload, settings } = useCatalog();
  const [tab, setTab] = useState(() => { try { return sessionStorage.getItem('poshak_settings_tab') || 'services'; } catch { return 'services'; } });
  const [toastData, toast] = useToast();
  const run = useMemo(() => makeRun(toast, reload), [toast, reload]);
  const go = (k) => { setTab(k); try { sessionStorage.setItem('poshak_settings_tab', k); } catch { /* ignore */ } };
  const props = { run, settings, toast };
  const View = { services: Services, offers: Offers, slots: Slots, area: Area, ops: Ops, wallet: Wallet, business: Business }[tab];

  return (
    <div className="an st">
      <div className="an-head"><div><h2>Prices & settings</h2><p className="ops-muted">Everything customers, captains and invoices depend on. Changes go live immediately and are recorded in the audit log.</p></div></div>
      <div className="st-layout">
        <nav className="st-nav">
          {TABS.map(([k, l, Icon]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)}><Icon size={16} /><span>{l}</span></button>)}
        </nav>
        <div className="st-body"><View key={tab} {...props} /></div>
      </div>
      {toastData && <div className={`st-toast ${toastData.bad ? 'bad' : ''}`} onClick={() => toast(null)}>{toastData.bad ? <X size={15} /> : <Check size={15} />}{toastData.text}</div>}
    </div>
  );
};
