import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Download, Plus, X, Phone, Mail, MessageCircle, Copy, Link2, Send, Wallet, ShieldCheck, AlertTriangle, MapPin, Users, Radio, Clock, Siren, Save, Trash2, ArrowUpRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { downloadCsv, inr, dt, dOnly } from '../../lib/csv';
import { STATUSES, statusMeta, kycMeta, KYC, ID_TYPES, VEHICLES, PAYOUT_CYCLES, DAYS, BLOOD, initials, dayStr, hhmm, expiry, emptyPartner, toForm, toPayload } from '../../lib/partners';
import { L, createMap, pickerIcon } from '../main-app/mapKit';
import { STATUS_LABEL } from '../../lib/orderStatus';
import { BarChart } from './charts';
import { Field, Toggle } from './ui';

const siteLink = () => window.location.origin;
const inviteText = (rider, p) => `Hi ${p.staff.name || ''}, you have been added to Poshak as ${rider ? 'a delivery rider' : 'a laundry partner'}.

Open ${siteLink()}, tap Login and choose "Continue with Google" using ${p.staff.email}. You will land on your own ${rider ? 'rider' : 'laundry'} dashboard automatically.`;
const RIDER_ACTIVE = ['captain_assigned', 'picked_up', 'cleaning', 'ready', 'out_for_delivery'];
const LAUNDRY_ACTIVE = ['picked_up', 'cleaning', 'ready'];
const DAY = 86400000;

/* ------------------------------------------------------------------ small map picker */
const MapPick = ({ lat, lng, onChange }) => {
  const el = useRef(null); const map = useRef(null); const pin = useRef(null); const cb = useRef(onChange); cb.current = onChange;
  useEffect(() => {
    const c = { lat: Number(lat) || 12.9346, lng: Number(lng) || 77.606 };
    const m = createMap(el.current, c, 14);
    pin.current = L.marker([c.lat, c.lng], { icon: pickerIcon(), draggable: true }).addTo(m);
    const set = (ll) => cb.current(ll.lat.toFixed(5), ll.lng.toFixed(5));
    pin.current.on('dragend', () => set(pin.current.getLatLng()));
    m.on('click', (e) => { pin.current.setLatLng(e.latlng); set(e.latlng); });
    map.current = m;
    return () => m.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const a = Number(lat), b = Number(lng);
    if (map.current && lat !== '' && lng !== '' && !Number.isNaN(a) && !Number.isNaN(b)) { pin.current.setLatLng([a, b]); map.current.panTo([a, b]); }
  }, [lat, lng]);
  return <div ref={el} className="pt-map" />;
};

/* ------------------------------------------------------------------ add / edit form */
const Sec = ({ title, hint, children }) => <fieldset className="pt-sec"><legend>{title}</legend>{hint && <p className="ops-muted">{hint}</p>}<div className="st-grid2">{children}</div></fieldset>;

const PartnerForm = ({ role, form, setForm, isNew, rates, busy, onSave, onCancel }) => {
  const rider = role === 'captain';
  const set = (k, v) => setForm({ ...form, [k]: v });
  const text = (k, extra = {}) => <input value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} {...extra} />;
  const toggleDay = (d) => set('work_days', form.work_days.includes(d) ? form.work_days.filter((x) => x !== d) : [...form.work_days, d].sort());
  const toggleSvc = (id) => set('services', form.services.includes(id) ? form.services.filter((x) => x !== id) : [...form.services, id]);

  return (
    <form className="pt-form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <Sec title="Account" hint={isNew ? 'They sign in with this Google account at /#/staff and land on their own dashboard.' : null}>
        <Field label="Google email *" className="full" hint="The exact Gmail they will sign in with"><input required type="email" disabled={!isNew} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@gmail.com" /></Field>
        <Field label={rider ? 'Full name *' : 'Contact person *'} hint={rider ? 'Customers see this name' : null}>{text('name', { required: true })}</Field>
        <Field label="Mobile number *" prefix="+91" hint={rider ? 'Customers call this number' : null}><input required inputMode="numeric" value={form.phone} onChange={(e) => set('phone', e.target.value.replace(/[^\d+ ]/g, ''))} placeholder="9876543210" /></Field>
        <Field label="Status"><select value={form.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Joined on"><input type="date" value={form.joined_on || ''} onChange={(e) => set('joined_on', e.target.value)} /></Field>
      </Sec>

      {rider ? (
        <Sec title="Vehicle & licence">
          <Field label="Vehicle type"><select value={form.vehicle_type} onChange={(e) => set('vehicle_type', e.target.value)}><option value="">—</option>{VEHICLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Make & model" hint="Customers see this">{text('vehicle_model', { placeholder: 'Hero Splendor' })}</Field>
          <Field label="Registration number" hint="Customers see this">{text('vehicle_number', { placeholder: 'KA01AB1234', style: { textTransform: 'uppercase' } })}</Field>
          <Field label="Driving licence no.">{text('license_number')}</Field>
          <Field label="Licence valid till"><input type="date" value={form.license_expiry || ''} onChange={(e) => set('license_expiry', e.target.value)} /></Field>
          <Field label="Insurance valid till"><input type="date" value={form.insurance_expiry || ''} onChange={(e) => set('insurance_expiry', e.target.value)} /></Field>
          <div className="full pt-checks">
            <Toggle checked={form.uniform_issued} onChange={(v) => set('uniform_issued', v)} label="Uniform issued" />
            <Toggle checked={form.bag_issued} onChange={(v) => set('bag_issued', v)} label="Delivery bag issued" />
            <Toggle checked={form.helmet_issued} onChange={(v) => set('helmet_issued', v)} label="Helmet issued" />
          </div>
        </Sec>
      ) : (
        <>
          <Sec title="Business">
            <Field label="Business name" className="full">{text('business_name', { placeholder: 'e.g. Sparkle Laundry' })}</Field>
            <Field label="Owner name">{text('owner_name')}</Field>
            <Field label="GSTIN" hint="15 characters, if registered">{text('gstin', { maxLength: 15, style: { textTransform: 'uppercase' } })}</Field>
            <Field label="PAN">{text('pan', { maxLength: 10, style: { textTransform: 'uppercase' } })}</Field>
            <Field label="Trade / shop licence no.">{text('trade_license')}</Field>
            <Field label="Licence valid till"><input type="date" value={form.license_expiry || ''} onChange={(e) => set('license_expiry', e.target.value)} /></Field>
          </Sec>
          <Sec title="Capacity & services" hint="Used to pick laundromats automatically and to stop them being overloaded. Leave services empty if they can do everything.">
            <Field label="Capacity" suffix="kg / day"><input type="number" min="1" value={form.capacity_kg_per_day} onChange={(e) => set('capacity_kg_per_day', e.target.value)} /></Field>
            <Field label="Max orders at once" hint="Active orders they may hold"><input type="number" min="1" value={form.max_active_jobs} onChange={(e) => set('max_active_jobs', e.target.value)} /></Field>
            <Field label="Machines" hint="Washers + dryers"><input type="number" min="0" value={form.machines} onChange={(e) => set('machines', e.target.value)} /></Field>
            <Field label="Promised turnaround" suffix="hours"><input type="number" min="1" value={form.turnaround_hours} onChange={(e) => set('turnaround_hours', e.target.value)} /></Field>
            <Field label="Opens at"><input type="time" value={form.open_time || ''} onChange={(e) => set('open_time', e.target.value)} /></Field>
            <Field label="Closes at"><input type="time" value={form.close_time || ''} onChange={(e) => set('close_time', e.target.value)} /></Field>
            <div className="full">
              <span className="st-lab">Services they handle {form.services.length === 0 && <em className="pt-all">· all services</em>}</span>
              <div className="pt-chips">{rates.map((r) => <button type="button" key={r.id} className={form.services.includes(r.id) ? 'on' : ''} onClick={() => toggleSvc(r.id)}>{r.name}</button>)}</div>
            </div>
          </Sec>
          <Sec title="What we pay them" hint="Earned when an order is marked ready: per kg + per order + per piece. Any can be 0.">
            <Field label="Per kg" prefix="₹"><input type="number" min="0" step="0.5" value={form.payout_per_kg} onChange={(e) => set('payout_per_kg', e.target.value)} /></Field>
            <Field label="Per order" prefix="₹"><input type="number" min="0" value={form.payout_per_order} onChange={(e) => set('payout_per_order', e.target.value)} /></Field>
            <Field label="Per piece" prefix="₹"><input type="number" min="0" step="0.5" value={form.payout_per_piece} onChange={(e) => set('payout_per_piece', e.target.value)} /></Field>
          </Sec>
        </>
      )}

      <Sec title={rider ? 'Contact & address' : 'Shop address & location'}>
        <Field label="Address" className="full">{text('address')}</Field>
        <Field label="City">{text('city')}</Field>
        <Field label="Pincode"><input inputMode="numeric" maxLength={6} value={form.pincode} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))} /></Field>
        <Field label="Zone / area" hint={rider ? 'Where they usually work' : 'Locality they serve'}>{text('zone')}</Field>
        <Field label="Alternate phone">{text('alt_phone')}</Field>
        {!rider && <div className="full"><span className="st-lab">Shop location <small className="ops-muted">— click the map or drag the pin</small></span>
          <MapPick lat={form.lat} lng={form.lng} onChange={(a, b) => setForm({ ...form, lat: a, lng: b })} />
          <div className="st-grid2" style={{ marginTop: '.5rem' }}><Field label="Latitude">{text('lat')}</Field><Field label="Longitude">{text('lng')}</Field></div></div>}
        {rider && <Field label="Date of birth"><input type="date" value={form.dob || ''} onChange={(e) => set('dob', e.target.value)} /></Field>}
        {rider && <Field label="Blood group"><select value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)}><option value="">—</option>{BLOOD.map((b) => <option key={b}>{b}</option>)}</select></Field>}
        <Field label="Emergency contact name">{text('emergency_name')}</Field>
        <Field label="Emergency contact phone">{text('emergency_phone')}</Field>
      </Sec>

      <Sec title="Identity & KYC" hint="For Aadhaar, enter only the last 4 digits — do not store the full number.">
        <Field label="ID type"><select value={form.id_type} onChange={(e) => set('id_type', e.target.value)}><option value="">—</option>{ID_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label={form.id_type === 'aadhaar' ? 'Last 4 digits' : 'ID number'}>{text('id_number', { maxLength: form.id_type === 'aadhaar' ? 4 : 30 })}</Field>
        <Field label="KYC status"><select value={form.kyc_status} onChange={(e) => set('kyc_status', e.target.value)}>{KYC.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="KYC remarks" hint="Only admins see this">{text('kyc_notes')}</Field>
      </Sec>

      <Sec title="Work schedule">
        {rider && <Field label="Shift starts"><input type="time" value={form.shift_start || ''} onChange={(e) => set('shift_start', e.target.value)} /></Field>}
        {rider && <Field label="Shift ends"><input type="time" value={form.shift_end || ''} onChange={(e) => set('shift_end', e.target.value)} /></Field>}
        <div className="full"><span className="st-lab">Working days</span>
          <div className="pt-chips">{DAYS.map((d, i) => <button type="button" key={d} className={form.work_days.includes(i) ? 'on' : ''} onClick={() => toggleDay(i)}>{d}</button>)}</div></div>
        {rider && <Field label="Max active jobs" hint="Auto-assign stops at this number. Blank = no limit"><input type="number" min="1" value={form.max_active_jobs} onChange={(e) => set('max_active_jobs', e.target.value)} /></Field>}
        {rider && <Field label="Fee per delivery" prefix="₹" hint="Blank = the default from Prices & settings"><input type="number" min="0" value={form.fee_override} onChange={(e) => set('fee_override', e.target.value)} /></Field>}
        <Field label="Contract ends"><input type="date" value={form.contract_end || ''} onChange={(e) => set('contract_end', e.target.value)} /></Field>
      </Sec>

      <Sec title="Payout details" hint="Shown only to admins (and masked to the partner).">
        <Field label="Payout cycle"><select value={form.payout_cycle} onChange={(e) => set('payout_cycle', e.target.value)}>{PAYOUT_CYCLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="UPI ID">{text('upi_id', { placeholder: 'name@okhdfc' })}</Field>
        <Field label="Account holder">{text('bank_holder')}</Field>
        <Field label="Bank account number"><input inputMode="numeric" value={form.bank_account} onChange={(e) => set('bank_account', e.target.value.replace(/\D/g, ''))} /></Field>
        <Field label="IFSC">{text('bank_ifsc', { maxLength: 11, style: { textTransform: 'uppercase' } })}</Field>
      </Sec>

      <Sec title="Admin notes">
        <Field label="Private notes" className="full" hint="Never shown to the partner"><textarea rows={3} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></Field>
        <Field label="Tags" className="full" hint="Comma separated, e.g. night shift, trainer">{text('tags')}</Field>
      </Sec>

      <div className="pt-formbar">
        <button type="button" className="ops-btn" onClick={onCancel}>Cancel</button>
        <button className="ops-btn ops-btn-primary" disabled={busy}><Save size={14} /> {busy ? 'Saving…' : isNew ? `Add ${rider ? 'rider' : 'laundromat'}` : 'Save changes'}</button>
      </div>
    </form>
  );
};

/* ------------------------------------------------------------------ one partner's panel */
const Chip = ({ cls = '', children }) => <span className={`pill ${cls}`}>{children}</span>;

const Panel = ({ p, role, orders, rates, onClose, reload, toast }) => {
  const rider = role === 'captain';
  const [tab, setTab] = useState('overview');
  const [form, setForm] = useState(() => toForm(p.staff, p.prof));
  const [busy, setBusy] = useState(false);
  const [money, setMoney] = useState(null);
  const sm = statusMeta(p.prof?.status);

  const loadMoney = useCallback(async () => {
    if (!p.id) { setMoney({ earnings: [], payouts: [] }); return; }
    const [e, po] = await Promise.all([
      supabase.from(rider ? 'captain_earnings' : 'cleaner_earnings').select(rider ? '*, orders(order_code)' : '*, orders(order_code)').eq(rider ? 'captain_id' : 'cleaner_id', p.id).order('created_at', { ascending: false }).limit(40),
      supabase.from(rider ? 'captain_payouts' : 'cleaner_payouts').select('*').eq(rider ? 'captain_id' : 'cleaner_id', p.id).order('created_at', { ascending: false }).limit(20)
    ]);
    setMoney({ earnings: e.data || [], payouts: po.data || [] });
  }, [p.id, rider]);
  useEffect(() => { loadMoney(); }, [loadMoney]);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('admin_save_partner', { p_email: form.email, p_role: role, p: toPayload(form) });
    setBusy(false);
    if (error) return toast(error.message, true);
    toast(`${form.name} saved`); await reload(); setTab('overview');
  };
  const setStatus = async (status, ask) => {
    const note = ask ? window.prompt(`Reason for ${status}? (saved in their notes and the audit log)`, '') : null;
    if (ask && note === null) return;
    const { error } = await supabase.rpc('admin_set_partner_status', { p_email: p.staff.email, p_status: status, p_note: note || null });
    if (error) return toast(error.message, true);
    toast(`${p.staff.name} is now ${statusMeta(status)[1].toLowerCase()}`); reload();
  };
  const remove = async () => {
    if (!window.confirm(`Remove ${p.staff.name} from the team? They lose access immediately. Their past jobs and earnings stay on record.`)) return;
    const { error } = await supabase.rpc('admin_remove_staff', { p_email: p.staff.email });
    if (error) return toast(error.message, true);
    toast('Removed'); await reload(); onClose();
  };
  const settle = async () => {
    const owed = rider ? Number(p.bal.earnings || 0) + Number(p.bal.tips || 0) : Number(p.bal.owed || 0);
    const net = rider ? Number(p.bal.net || 0) : owed;
    if (!window.confirm(`Record a settlement for ${p.staff.name}? ${net >= 0 ? `You pay them ${inr(net)}` : `They pay you ${inr(-net)}`}. Pay them first (UPI / bank), then confirm.`)) return;
    const { error } = await supabase.rpc(rider ? 'admin_settle_captain' : 'admin_settle_cleaner', rider ? { p_captain: p.id, p_note: 'Settlement' } : { p_cleaner: p.id, p_note: 'Settlement' });
    if (error) return toast(error.message, true);
    toast('Settlement recorded'); await reload(); loadMoney();
  };

  const a = p.m;
  const days14 = useMemo(() => {
    const out = [];
    const ist = new Date(Date.now() + 5.5 * 3600e3);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(ist.getTime() - i * DAY).toISOString().slice(0, 10);
      out.push({ d, label: new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), value: 0 });
    }
    orders.forEach((o) => {
      const t = rider ? (o.captain_id === p.id && o.status === 'delivered' ? o.delivered_at : null) : (o.cleaner_id === p.id ? o.laundry_ready_at : null);
      if (!t) return;
      const d = new Date(new Date(t).getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
      const slot = out.find((x) => x.d === d); if (slot) slot.value++;
    });
    return out;
  }, [orders, p.id, rider]);

  const mine = orders.filter((o) => (rider ? o.captain_id === p.id : o.cleaner_id === p.id)).slice(0, 40);
  const owed = rider ? Number(p.bal.earnings || 0) + Number(p.bal.tips || 0) : Number(p.bal.owed || 0);
  const pr = p.prof || {};
  const lic = expiry(pr.license_expiry), ins = rider ? expiry(pr.insurance_expiry) : null;
  const upiLink = pr.upi_id && owed > 0 ? `upi://pay?pa=${encodeURIComponent(pr.upi_id)}&pn=${encodeURIComponent(pr.bank_holder || p.staff.name)}&am=${rider ? Number(p.bal.net || 0) : owed}&cu=INR&tn=${encodeURIComponent('Poshak settlement')}` : null;

  return (
    <div className="drawer-back" onClick={onClose}>
      <aside className="drawer drawer-xl" onClick={(e) => e.stopPropagation()}>
        <header>
          <div className="av lg">{initials(p.staff.name)}</div>
          <div className="grow">
            <h3>{p.staff.name || p.staff.email} <Chip cls={sm[2]}>{sm[1]}</Chip>{role === 'cleaner' && pr.business_name ? <Chip>{pr.business_name}</Chip> : null}</h3>
            <p className="ops-muted">{p.staff.email}{p.id ? '' : ' · hasn’t signed in yet'}{pr.joined_on ? ` · joined ${dayStr(pr.joined_on)}` : ''}</p>
          </div>
          <button className="ops-icon" onClick={onClose}><X size={16} /></button>
        </header>

        <div className="drawer-contact">
          {p.staff.phone && <a className="ops-btn" href={`tel:${p.staff.phone}`}><Phone size={14} /> {p.staff.phone}</a>}
          {p.staff.phone && <a className="ops-btn" target="_blank" rel="noreferrer" href={`https://wa.me/91${p.staff.phone}`}><MessageCircle size={14} /> WhatsApp</a>}
          <a className="ops-btn" href={`mailto:${p.staff.email}`}><Mail size={14} /> Email</a>
          {p.staff.phone && <a className="ops-btn" target="_blank" rel="noreferrer" title="Send them their sign-in link on WhatsApp" href={`https://wa.me/91${p.staff.phone}?text=${encodeURIComponent(inviteText(rider, p))}`}><Send size={14} /> Send invite</a>}
          <span className="grow" />
          {(pr.status || 'active') === 'active' && <button className="ops-btn" onClick={() => setStatus('paused', true)}>Pause</button>}
          {pr.status === 'onboarding' && <button className="ops-btn ops-btn-primary" onClick={() => setStatus('active')}>Activate</button>}
          {pr.status === 'paused' && <button className="ops-btn ops-btn-primary" onClick={() => setStatus('active')}>Resume</button>}
          {['active', 'paused', 'onboarding'].includes(pr.status || 'active') && <button className="ops-btn ops-btn-danger" onClick={() => setStatus('suspended', true)}>Suspend</button>}
          {['suspended', 'offboarded'].includes(pr.status) && <button className="ops-btn ops-btn-primary" onClick={() => setStatus('active')}>Reinstate</button>}
        </div>

        <div className="seg pt-tabs">
          {[['overview', 'Overview'], ['jobs', `Jobs (${mine.length})`], ['money', 'Money'], ['details', 'Details']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
        </div>

        {tab === 'overview' && (<>
          <div className="mini-kpis">
            {rider ? (<>
              <div><b>{a.jobs30}</b><span>Deliveries · 30d</span></div>
              <div><b>{a.rating ? `★ ${a.rating}` : '—'}</b><span>{a.rated} ratings</span></div>
              <div><b>{a.failed}</b><span>Failed attempts</span></div>
              <div><b>{a.declines}</b><span>Declined offers</span></div>
            </>) : (<>
              <div><b>{a.jobs30}</b><span>Orders done · 30d</span></div>
              <div><b>{a.kg30} kg</b><span>Washed · 30d</span></div>
              <div><b>{a.turn != null ? `${a.turn} h` : '—'}</b><span>Avg turnaround</span></div>
              <div><b>{a.mismatch}</b><span>Count mismatches</span></div>
            </>)}
          </div>
          <div className="mini-kpis" style={{ marginTop: '.5rem' }}>
            <div><b>{a.active}{pr.max_active_jobs ? ` / ${pr.max_active_jobs}` : ''}</b><span>Active jobs now</span></div>
            <div><b>{inr(owed)}</b><span>Owed to them</span></div>
            <div><b>{inr(a.earned30)}</b><span>Earned · 30d</span></div>
            <div><b>{rider ? (p.online ? 'Online' : 'Offline') : (pr.capacity_kg_per_day ? `${Math.min(100, Math.round((a.kgToday / pr.capacity_kg_per_day) * 100))}%` : '—')}</b><span>{rider ? (p.lastSeen ? `seen ${dt(p.lastSeen)}` : 'never seen') : 'Capacity used today'}</span></div>
          </div>

          <h4>{rider ? 'Deliveries' : 'Orders completed'} · last 14 days</h4>
          <BarChart data={days14} height={150} valueLabel={rider ? 'Deliveries' : 'Orders'} />

          <h4><ShieldCheck size={14} /> Compliance</h4>
          <div className="pt-facts">
            <div><span>KYC</span><Chip cls={kycMeta(pr.kyc_status)[2]}>{kycMeta(pr.kyc_status)[1]}</Chip></div>
            <div><span>{rider ? 'Driving licence' : 'Trade licence'}</span>{lic ? <Chip cls={lic.cls}>{lic.label}</Chip> : <small>not recorded</small>}</div>
            {rider && <div><span>Vehicle insurance</span>{ins ? <Chip cls={ins.cls}>{ins.label}</Chip> : <small>not recorded</small>}</div>}
            {rider && <div><span>Equipment</span><small>{[pr.uniform_issued && 'uniform', pr.bag_issued && 'bag', pr.helmet_issued && 'helmet'].filter(Boolean).join(', ') || 'nothing issued'}</small></div>}
            <div><span>Contract</span><small>{pr.contract_end ? `ends ${dayStr(pr.contract_end)}` : 'open-ended'}</small></div>
          </div>

          <h4>Profile</h4>
          <div className="pt-facts">
            {rider ? <div><span>Vehicle</span><small>{[pr.vehicle_type && VEHICLES.find((v) => v[0] === pr.vehicle_type)?.[1], pr.vehicle_model, pr.vehicle_number].filter(Boolean).join(' · ') || '—'}</small></div>
              : <div><span>Services</span><small>{pr.services?.length ? pr.services.map((s) => rates.find((r) => r.id === s)?.name || s).join(', ') : 'All services'}</small></div>}
            <div><span>Address</span><small>{[pr.address, pr.city, pr.pincode].filter(Boolean).join(', ') || '—'}</small></div>
            <div><span>Zone</span><small>{pr.zone || '—'}</small></div>
            <div><span>{rider ? 'Shift' : 'Hours'}</span><small>{rider ? (pr.shift_start ? `${hhmm(pr.shift_start)} – ${hhmm(pr.shift_end)}` : 'flexible') : (pr.open_time ? `${hhmm(pr.open_time)} – ${hhmm(pr.close_time)}` : '—')} · {(pr.work_days || []).length === 7 ? 'every day' : (pr.work_days || []).map((d) => DAYS[d]).join(', ') || '—'}</small></div>
            <div><span>Emergency</span><small>{pr.emergency_name ? `${pr.emergency_name} · ${pr.emergency_phone || ''}` : '—'}</small></div>
            {!rider && <div><span>Pay rates</span><small>₹{pr.payout_per_kg || 0}/kg · ₹{pr.payout_per_order || 0}/order · ₹{pr.payout_per_piece || 0}/piece</small></div>}
            {rider && <div><span>Delivery fee</span><small>{pr.fee_override != null ? `${inr(pr.fee_override)} (personal)` : 'default'}</small></div>}
          </div>
          {pr.notes && <><h4>Admin notes</h4><pre className="pt-notes">{pr.notes}</pre></>}
          <div className="pt-danger"><button className="ops-btn ops-btn-danger" onClick={remove}><Trash2 size={14} /> Remove from team</button></div>
        </>)}

        {tab === 'jobs' && (mine.length === 0 ? <div className="ch-empty">No jobs yet.</div> : (
          <div className="tbl-wrap"><table className="tbl compact"><thead><tr><th>Order</th><th>Status</th><th className="r">{rider ? 'Rating' : 'Turnaround'}</th><th className="r">When</th></tr></thead><tbody>
            {mine.map((o) => (
              <tr key={o.id}><td><b>#{o.order_code}</b><br /><small>{o.service_name}</small></td><td><span className={`ops-badge b-${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span></td>
                <td className="r">{rider ? (o.captain_rating ? `★ ${o.captain_rating}` : '—') : (o.laundry_ready_at && o.laundry_received_at ? `${((new Date(o.laundry_ready_at) - new Date(o.laundry_received_at)) / 3600e3).toFixed(1)} h` : '—')}</td>
                <td className="r"><small>{dt(o.created_at)}</small></td></tr>
            ))}
          </tbody></table></div>
        ))}

        {tab === 'money' && (<>
          <div className="mini-kpis three">
            {rider ? (<><div><b>{inr(p.bal.earnings)}</b><span>Delivery fees</span></div><div><b>{inr(p.bal.tips)}</b><span>Tips</span></div><div><b className={Number(p.bal.cash_held) > 0 ? 'neg' : ''}>{inr(p.bal.cash_held)}</b><span>Cash held</span></div></>)
              : (<><div><b>{inr(p.bal.owed)}</b><span>Owed now</span></div><div><b>{p.bal.orders || 0}</b><span>Orders unpaid</span></div><div><b>{inr(a.earned30)}</b><span>Earned · 30d</span></div></>)}
          </div>
          <div className="pt-settle">
            <div>{rider ? <>Net: <b>{Number(p.bal.net || 0) >= 0 ? `you pay ${inr(p.bal.net)}` : `rider pays ${inr(-p.bal.net)}`}</b> (fees + tips − cash held)</> : <>Settle <b>{inr(owed)}</b> for {p.bal.orders || 0} orders</>}<small>{pr.payout_cycle ? ` · ${PAYOUT_CYCLES.find((c) => c[0] === pr.payout_cycle)?.[1].toLowerCase()} payouts` : ''}</small></div>
            <div className="pt-settle-b">
              {upiLink && <a className="ops-btn" href={upiLink}><ArrowUpRight size={14} /> Pay via UPI app</a>}
              <button className="ops-btn ops-btn-primary" disabled={rider ? !owed && !Number(p.bal.cash_held) : !owed} onClick={settle}><Wallet size={14} /> Record settlement</button>
            </div>
          </div>
          <h4>Where to pay</h4>
          <div className="pt-facts">
            <div><span>UPI</span>{pr.upi_id ? <small className="mono">{pr.upi_id} <button className="ops-icon pt-copy" onClick={() => { navigator.clipboard?.writeText(pr.upi_id); toast('UPI ID copied'); }}><Copy size={12} /></button></small> : <small>not added</small>}</div>
            <div><span>Bank</span><small>{pr.bank_account ? `${pr.bank_holder || ''} · ${pr.bank_account} · ${pr.bank_ifsc || ''}` : 'not added'}</small></div>
          </div>
          <h4>Recent earnings</h4>
          {!money ? <div className="sk" style={{ height: 80 }} /> : money.earnings.length === 0 ? <p className="ops-muted">Nothing yet.</p> : (
            <div className="tbl-wrap"><table className="tbl compact"><tbody>{money.earnings.map((e) => (
              <tr key={e.id}><td>#{e.orders?.order_code}<br /><small>{dt(e.created_at)}{!rider && e.kg ? ` · ${e.kg} kg` : ''}</small></td><td className="r pos">+{inr(e.amount)}</td><td className="r">{e.paid_out ? <Chip cls="good">paid</Chip> : <Chip cls="warn">unpaid</Chip>}</td></tr>
            ))}</tbody></table></div>
          )}
          <h4>Settlements</h4>
          {!money ? null : money.payouts.length === 0 ? <p className="ops-muted">None yet.</p> : (
            <div className="tbl-wrap"><table className="tbl compact"><tbody>{money.payouts.map((x) => (
              <tr key={x.id}><td>{dOnly(x.created_at)}<br /><small>{rider ? `fees ${inr(x.earnings)} + tips ${inr(x.tips)} − cash ${inr(x.cash_netted)}` : `${x.orders} orders`}</small></td><td className="r"><b>{inr(rider ? x.net : x.amount)}</b></td></tr>
            ))}</tbody></table></div>
          )}
        </>)}

        {tab === 'details' && <PartnerForm role={role} form={form} setForm={setForm} isNew={false} rates={rates} busy={busy} onSave={save} onCancel={() => { setForm(toForm(p.staff, p.prof)); setTab('overview'); }} />}
      </aside>
    </div>
  );
};

/* ------------------------------------------------------------------ the page */
export const AdminPartners = ({ role }) => {
  const rider = role === 'captain';
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('name');
  const [sel, setSel] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(() => emptyPartner(role));
  const [busy, setBusy] = useState(false);
  const [toastData, setToastData] = useState(null);
  const [tab, setTab] = useState('partners');
  const [incidents, setIncidents] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const timer = useRef();
  const toast = useCallback((text, bad = false) => { setToastData({ text, bad }); clearTimeout(timer.current); timer.current = setTimeout(() => setToastData(null), bad ? 7000 : 3000); }, []);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 90 * DAY).toISOString();
    const [se, sp, od, al, rt, er] = await Promise.all([
      supabase.from('staff_emails').select('*').eq('role', role).order('added_at', { ascending: false }),
      supabase.from('staff_profiles').select('*'),
      supabase.from('orders').select('id, order_code, status, service_name, created_at, delivered_at, captain_id, cleaner_id, captain_rating, failed_attempts, declined_by, laundry_received_at, laundry_ready_at').gte('created_at', since).order('created_at', { ascending: false }).limit(4000),
      supabase.from('ops_alerts').select('order_id, kind, created_at').eq('kind', 'count_mismatch').gte('created_at', since),
      supabase.from('service_rates').select('id, name').order('sort').order('id'),
      supabase.from(rider ? 'captain_earnings' : 'cleaner_earnings').select(rider ? 'captain_id, amount, created_at' : 'cleaner_id, amount, kg, created_at').gte('created_at', since)
    ]);
    const err = se.error || od.error;
    if (err) { toast(err.message, true); return; }
    const emails = (se.data || []).map((s) => s.email);
    const { data: prs } = emails.length ? await supabase.from('profiles').select('id, email, is_online, last_seen_at').in('email', emails) : { data: [] };
    const orders = od.data || [];
    const profBy = Object.fromEntries((sp.data || []).map((x) => [x.email.toLowerCase(), x]));
    const idBy = Object.fromEntries((prs || []).map((x) => [x.email.toLowerCase(), x]));
    const now = Date.now(), d30 = now - 30 * DAY, ist = new Date(now + 5.5 * 3600e3).toISOString().slice(0, 10);
    const mismatchOrders = new Set((al.data || []).map((x) => x.order_id));

    const partners = await Promise.all((se.data || []).map(async (staff) => {
      const prof = profBy[staff.email.toLowerCase()] || null;
      const acct = idBy[staff.email.toLowerCase()];
      const id = acct?.id || null;
      let bal = {};
      if (id) { const { data: b } = await supabase.rpc(rider ? 'admin_captain_balance' : 'admin_cleaner_balance', rider ? { p_captain: id } : { p_cleaner: id }); bal = b || {}; }
      const mine = orders.filter((o) => (rider ? o.captain_id === id : o.cleaner_id === id));
      const ratings = mine.filter((o) => o.captain_rating).map((o) => o.captain_rating);
      const earnRows = (er.data || []).filter((e) => (rider ? e.captain_id : e.cleaner_id) === id);
      const turns = mine.filter((o) => o.laundry_ready_at && o.laundry_received_at && new Date(o.laundry_ready_at) > d30).map((o) => (new Date(o.laundry_ready_at) - new Date(o.laundry_received_at)) / 3600e3);
      const m = {
        jobs30: rider ? mine.filter((o) => o.status === 'delivered' && o.delivered_at && new Date(o.delivered_at) > d30).length : mine.filter((o) => o.laundry_ready_at && new Date(o.laundry_ready_at) > d30).length,
        rating: ratings.length ? (ratings.reduce((x, y) => x + y, 0) / ratings.length).toFixed(2) : null, rated: ratings.length,
        failed: mine.filter((o) => new Date(o.created_at) > d30).reduce((a, o) => a + (o.failed_attempts || 0), 0),
        declines: orders.filter((o) => id && (o.declined_by || []).includes(id) && new Date(o.created_at) > d30).length,
        active: mine.filter((o) => (rider ? RIDER_ACTIVE : LAUNDRY_ACTIVE).includes(o.status)).length,
        turn: turns.length ? (turns.reduce((x, y) => x + y, 0) / turns.length).toFixed(1) : null,
        mismatch: mine.filter((o) => mismatchOrders.has(o.id)).length,
        earned30: earnRows.filter((e) => new Date(e.created_at) > d30).reduce((a, e) => a + Number(e.amount), 0),
        kg30: Math.round(earnRows.filter((e) => new Date(e.created_at) > d30).reduce((a, e) => a + Number(e.kg || 0), 0)),
        kgToday: earnRows.filter((e) => new Date(new Date(e.created_at).getTime() + 5.5 * 3600e3).toISOString().slice(0, 10) === ist).reduce((a, e) => a + Number(e.kg || 0), 0)
      };
      return { key: staff.email, id, staff, prof, bal, m, online: !!acct?.is_online, lastSeen: acct?.last_seen_at };
    }));
    setData({ partners, orders, rates: rt.data || [] });
    if (rider) {
      const [{ data: inc }, { data: po }] = await Promise.all([
        supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(40),
        supabase.from('captain_payouts').select('*').order('created_at', { ascending: false }).limit(60)
      ]);
      setIncidents(inc || []); setPayouts(po || []);
    } else {
      const { data: po } = await supabase.from('cleaner_payouts').select('*').order('created_at', { ascending: false }).limit(60);
      setPayouts(po || []);
    }
  }, [role, rider, toast]);
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const owedOf = (p) => (rider ? Number(p.bal.earnings || 0) + Number(p.bal.tips || 0) : Number(p.bal.owed || 0));
  const warnsOf = (p) => {
    const w = [];
    const pr = p.prof || {};
    [['license_expiry', rider ? 'Licence' : 'Trade licence'], ['insurance_expiry', 'Insurance']].forEach(([k, l]) => { const e = rider || k === 'license_expiry' ? expiry(pr[k]) : null; if (e && e.cls !== 'good') w.push(`${l}: ${e.label.toLowerCase()}`); });
    if (!pr.kyc_status || pr.kyc_status !== 'verified') w.push(`KYC ${pr.kyc_status || 'pending'}`);
    if (!pr.upi_id && !pr.bank_account) w.push('No payout details');
    return w;
  };

  const shown = useMemo(() => {
    let r = (data?.partners || []).filter((p) => (status === 'all' || (p.prof?.status || 'active') === status));
    if (q.trim()) { const s = q.trim().toLowerCase(); r = r.filter((p) => `${p.staff.name} ${p.staff.email} ${p.staff.phone} ${p.prof?.business_name || ''} ${p.prof?.zone || ''} ${p.prof?.city || ''} ${p.prof?.vehicle_number || ''}`.toLowerCase().includes(s)); }
    const by = { name: (a, b) => (a.staff.name || '').localeCompare(b.staff.name || ''), jobs: (a, b) => b.m.jobs30 - a.m.jobs30, owed: (a, b) => owedOf(b) - owedOf(a), rating: (a, b) => Number(b.m.rating || 0) - Number(a.m.rating || 0) };
    return [...r].sort(by[sort]);
  }, [data, q, status, sort]);

  const counts = useMemo(() => {
    const c = { all: 0 }; STATUSES.forEach(([k]) => { c[k] = 0; });
    (data?.partners || []).forEach((p) => { c.all++; c[p.prof?.status || 'active']++; });
    return c;
  }, [data]);
  const net = useMemo(() => {
    const ps = data?.partners || [];
    return { online: ps.filter((p) => p.online).length, active: ps.reduce((a, p) => a + p.m.active, 0), owed: ps.reduce((a, p) => a + owedOf(p), 0), warns: ps.filter((p) => warnsOf(p).some((w) => !w.startsWith('KYC') && !w.startsWith('No payout'))).length, kyc: ps.filter((p) => (p.prof?.kyc_status || 'pending') !== 'verified').length, jobs: ps.reduce((a, p) => a + p.m.jobs30, 0) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const create = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('admin_save_partner', { p_email: form.email, p_role: role, p: toPayload(form) });
    setBusy(false);
    if (error) return toast(error.message, true);
    toast(`${form.name} added. They just sign in with ${form.email} and land on their own dashboard.`);
    setAdding(false); setForm(emptyPartner(role)); load();
  };
  const exportCsv = () => downloadCsv(rider ? 'poshak-riders' : 'poshak-laundromats', shown, [
    ['Name', (p) => p.staff.name], ['Email', (p) => p.staff.email], ['Phone', (p) => p.staff.phone], ['Status', (p) => statusMeta(p.prof?.status)[1]], ['KYC', (p) => kycMeta(p.prof?.kyc_status)[1]],
    ...(rider ? [['Vehicle', (p) => p.staff.vehicle], ['Licence expiry', (p) => p.prof?.license_expiry || '']] : [['Business', (p) => p.prof?.business_name || ''], ['GSTIN', (p) => p.prof?.gstin || ''], ['Capacity kg/day', (p) => p.prof?.capacity_kg_per_day || '']]),
    ['City', (p) => p.prof?.city || ''], ['Zone', (p) => p.prof?.zone || ''], ['Jobs (30d)', (p) => p.m.jobs30], ['Earned (30d)', (p) => p.m.earned30], ['Owed now', (p) => owedOf(p)], ['UPI', (p) => p.prof?.upi_id || '']
  ]);

  const nameOf = (id) => data?.partners.find((p) => p.id === id)?.staff.name || 'Partner';
  const selected = sel ? data?.partners.find((p) => p.key === sel) : null;
  const noun = rider ? 'rider' : 'laundromat';

  if (!data) return <div className="sk-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="sk" />)}</div>;

  return (
    <div className="an">
      <div className="an-head">
        <div><h2>{rider ? 'Riders' : 'Laundromats'}</h2><p className="ops-muted">{rider ? 'Delivery partners who pick up and deliver. Add their Google email and full details here; they sign in at /#/staff.' : 'Laundry partners who wash, dry and press. Add their Google email, business details, capacity and pay rates here.'}</p></div>
        <div className="an-tools">
          <button className="ops-btn" onClick={exportCsv}><Download size={14} /> Export CSV</button>
          <button className="ops-btn ops-btn-primary" onClick={() => { setForm(emptyPartner(role)); setAdding(true); }}><Plus size={14} /> Add {noun}</button>
        </div>
      </div>

      <div className="pt-link">
        <Link2 size={15} />
        <div><b>One sign-in for everyone</b><span>{rider ? 'Riders' : 'Laundromats'} log in the normal Poshak way with Google. Add their Gmail here and the system sends them to their own {rider ? 'rider' : 'laundry'} dashboard automatically — no separate link needed.</span></div>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-top"><span className="kpi-ic"><Users size={16} /></span><span className="kpi-l">{rider ? 'Riders' : 'Laundromats'}</span></div><div className="kpi-v">{counts.all}</div><div className="kpi-foot"><small>{counts.active} active · {counts.onboarding} onboarding · {counts.paused} paused</small></div></div>
        {rider ? <div className="kpi tone-good"><div className="kpi-top"><span className="kpi-ic"><Radio size={16} /></span><span className="kpi-l">Online now</span></div><div className="kpi-v">{net.online}</div><div className="kpi-foot"><small>{net.active} jobs in progress</small></div></div>
          : <div className="kpi tone-good"><div className="kpi-top"><span className="kpi-ic"><Clock size={16} /></span><span className="kpi-l">Orders in progress</span></div><div className="kpi-v">{net.active}</div><div className="kpi-foot"><small>across all laundromats</small></div></div>}
        <div className="kpi tone-brand"><div className="kpi-top"><span className="kpi-ic"><Wallet size={16} /></span><span className="kpi-l">To pay out</span></div><div className="kpi-v">{inr(net.owed)}</div><div className="kpi-foot"><small>{net.jobs} jobs in the last 30 days</small></div></div>
        <div className={`kpi ${net.warns ? 'tone-bad' : ''}`}><div className="kpi-top"><span className="kpi-ic"><AlertTriangle size={16} /></span><span className="kpi-l">Documents to renew</span></div><div className="kpi-v">{net.warns}</div><div className="kpi-foot"><small>{net.kyc} with KYC not verified</small></div></div>
      </div>

      <div className="chips">
        {[['partners', noun === 'rider' ? 'All riders' : 'All laundromats'], ...(rider ? [['safety', `Safety incidents${incidents.filter((i) => i.status === 'open').length ? ` · ${incidents.filter((i) => i.status === 'open').length} open` : ''}`]] : []), ['settlements', 'Settlements']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === 'partners' && (<>
        <div className="chips">
          {[['all', 'All'], ...STATUSES.map(([k, l]) => [k, l])].map(([k, l]) => <button key={k} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{l}<em>{counts[k]}</em></button>)}
          <span className="grow" />
          <div className="search"><Search size={14} /><input placeholder="Search name, email, phone, area…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className="sel" value={sort} onChange={(e) => setSort(e.target.value)}><option value="name">Name</option><option value="jobs">Most jobs</option><option value="rating">{rider ? 'Best rated' : 'Fastest'}</option><option value="owed">Most owed</option></select>
        </div>

        <section className="panel flush">
          {shown.length === 0 ? <div className="ch-empty">{counts.all === 0 ? <>No {noun}s yet. Click <b>Add {noun}</b> and enter their Google email and details.</> : 'Nobody matches.'}</div> : (
            <div className="tbl-wrap tall"><table className="tbl hover">
              <thead><tr><th>{rider ? 'Rider' : 'Laundromat'}</th><th>Status</th><th>{rider ? 'Vehicle & area' : 'Capacity & area'}</th><th className="r">30-day</th><th className="r">Owed</th><th>Heads-up</th></tr></thead>
              <tbody>{shown.map((p) => {
                const sm = statusMeta(p.prof?.status); const w = warnsOf(p); const pr = p.prof || {};
                return (
                  <tr key={p.key} onClick={() => setSel(p.key)}>
                    <td><span className="av">{initials(p.staff.name)}</span><b>{rider ? p.staff.name : (pr.business_name || p.staff.name)}</b>{rider && p.online && <i className="pt-dot" title="Online" />}<br /><small style={{ marginLeft: 38 }}>{rider ? p.staff.email : `${p.staff.name} · ${p.staff.email}`}</small></td>
                    <td><Chip cls={sm[2]}>{sm[1]}</Chip>{!p.id && <small><br />not signed in yet</small>}</td>
                    <td><small>{rider ? (p.staff.vehicle || '—') : (pr.capacity_kg_per_day ? `${pr.capacity_kg_per_day} kg/day · ${p.m.active}${pr.max_active_jobs ? `/${pr.max_active_jobs}` : ''} active` : `${p.m.active} active`)}<br />{[pr.zone, pr.city].filter(Boolean).join(', ') || '—'}</small></td>
                    <td className="r"><b>{p.m.jobs30}</b> <small>{rider ? 'deliveries' : 'orders'}</small><br /><small>{rider ? (p.m.rating ? `★ ${p.m.rating} (${p.m.rated})` : 'no ratings') : (p.m.turn != null ? `${p.m.turn} h avg` : '—')}</small></td>
                    <td className="r"><b>{inr(owedOf(p))}</b></td>
                    <td>{w.length === 0 ? <small className="pos">All good</small> : w.slice(0, 2).map((x) => <Chip key={x} cls="warn">{x}</Chip>)}{w.length > 2 && <small> +{w.length - 2}</small>}</td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          )}
        </section>
      </>)}

      {tab === 'safety' && (
        <section className="panel flush">
          {incidents.length === 0 ? <div className="ch-empty"><Siren size={22} /><br />No safety incidents reported.</div> : (
            <div className="tbl-wrap"><table className="tbl"><thead><tr><th>When</th><th>Rider</th><th>What</th><th>Status</th><th /></tr></thead><tbody>
              {incidents.map((i) => (
                <tr key={i.id}><td><small>{dt(i.created_at)}</small></td><td><b>{nameOf(i.captain_id)}</b></td>
                  <td><b>{i.kind.toUpperCase()}</b><br /><small>{i.message || ''} {i.lat ? <a target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${i.lat},${i.lng}`}><MapPin size={11} /> map</a> : null}</small></td>
                  <td><Chip cls={i.status === 'open' ? 'bad' : 'good'}>{i.status}</Chip></td>
                  <td className="r">{i.status === 'open' && <button className="ops-btn" onClick={async () => { const { error } = await supabase.rpc('admin_resolve_incident', { p_id: i.id }); if (error) toast(error.message, true); else { toast('Resolved'); load(); } }}>Resolve</button>}</td></tr>
              ))}
            </tbody></table></div>
          )}
        </section>
      )}

      {tab === 'settlements' && (
        <section className="panel flush">
          {payouts.length === 0 ? <div className="ch-empty">No settlements recorded yet.</div> : (
            <div className="tbl-wrap tall"><table className="tbl"><thead><tr><th>Date</th><th>{rider ? 'Rider' : 'Laundromat'}</th><th>Breakdown</th><th className="r">Amount</th></tr></thead><tbody>
              {payouts.map((x) => {
                const who = rider ? x.captain_id : x.cleaner_id;
                return <tr key={x.id}><td><small>{dt(x.created_at)}</small></td><td><b>{nameOf(who)}</b></td>
                  <td><small>{rider ? `fees ${inr(x.earnings)} + tips ${inr(x.tips)} − cash ${inr(x.cash_netted)}` : `${x.orders} orders${x.note ? ` · ${x.note}` : ''}`}</small></td>
                  <td className="r"><b>{inr(rider ? x.net : x.amount)}</b></td></tr>;
              })}
            </tbody></table></div>
          )}
        </section>
      )}

      {selected && <Panel key={selected.key} p={selected} role={role} orders={data.orders} rates={data.rates} onClose={() => setSel(null)} reload={load} toast={toast} />}

      {adding && (
        <div className="drawer-back" onClick={() => setAdding(false)}>
          <aside className="drawer drawer-xl" onClick={(e) => e.stopPropagation()}>
            <header><div className="grow"><h3>Add {noun}</h3><p className="ops-muted">Fill in what you have — you can complete the rest later.</p></div><button className="ops-icon" onClick={() => setAdding(false)}><X size={16} /></button></header>
            <PartnerForm role={role} form={form} setForm={setForm} isNew rates={data.rates} busy={busy} onSave={create} onCancel={() => setAdding(false)} />
          </aside>
        </div>
      )}
      {toastData && <div className={`st-toast ${toastData.bad ? 'bad' : ''}`} onClick={() => setToastData(null)}>{toastData.text}</div>}
    </div>
  );
};
