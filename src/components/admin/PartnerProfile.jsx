import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, PauseCircle, Hourglass } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { inr } from '../../lib/csv';
import { statusMeta, kycMeta, VEHICLES, PAYOUT_CYCLES, DAYS, dayStr, hhmm, expiry, initials } from '../../lib/partners';
import { useCatalog } from '../../context/CatalogContext';
import { Field } from './ui';

// Banner shown on every screen when the admin has paused / not yet activated this partner.
export const StatusBanner = ({ profile }) => {
  const st = profile?.status;
  if (!profile || st === 'active') return null;
  const Icon = st === 'paused' ? PauseCircle : Hourglass;
  const text = st === 'paused' ? 'Your account is paused — you will not get new jobs until the admin resumes it.'
    : st === 'onboarding' ? 'Your account is still being set up. You can look around; new jobs start once the admin activates you.' : `Your account status is ${st}.`;
  return <div className="pp-banner"><Icon size={16} /><span>{text}</span></div>;
};

// Document-expiry warnings (licence / insurance) as a list of strings.
export const docWarnings = (profile, role) => {
  if (!profile) return [];
  const out = [];
  const lic = expiry(profile.license_expiry);
  if (lic && lic.cls !== 'good') out.push(`${role === 'cleaner' ? 'Trade licence' : 'Driving licence'}: ${lic.label.toLowerCase()}`);
  const ins = role === 'cleaner' ? null : expiry(profile.insurance_expiry);
  if (ins && ins.cls !== 'good') out.push(`Vehicle insurance: ${ins.label.toLowerCase()}`);
  if (profile.kyc_status === 'rejected') out.push('KYC was rejected — contact the admin');
  return out;
};

export const useMyProfile = () => {
  const [p, setP] = useState(undefined);
  const load = useCallback(async () => { const { data } = await supabase.rpc('my_partner_profile'); setP(data || null); }, []);
  useEffect(() => { load(); }, [load]);
  return [p, load];
};

const Row = ({ k, children }) => <div><span>{k}</span><small>{children || '—'}</small></div>;

// "My profile" tab for riders and laundromats: read-only business data, editable contact + emergency details.
export const PartnerProfile = ({ role, profile, reload }) => {
  const { services } = useCatalog();
  const rider = role === 'captain';
  const [f, setF] = useState({ alt_phone: '', address: '', emergency_name: '', emergency_phone: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (profile) setF({ alt_phone: profile.alt_phone || '', address: profile.address || '', emergency_name: profile.emergency_name || '', emergency_phone: profile.emergency_phone || '' }); }, [profile]);

  if (profile === undefined) return <div className="sk" style={{ height: 240, margin: '1rem' }} />;
  if (!profile) return <div className="ops-card ops-empty" style={{ margin: '1rem' }}>No profile found.</div>;

  const sm = statusMeta(profile.status); const kyc = kycMeta(profile.kyc_status);
  const lic = expiry(profile.license_expiry); const ins = expiry(profile.insurance_expiry);
  const dirty = f.alt_phone !== (profile.alt_phone || '') || f.address !== (profile.address || '') || f.emergency_name !== (profile.emergency_name || '') || f.emergency_phone !== (profile.emergency_phone || '');
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('partner_update_profile', { p_alt_phone: f.alt_phone, p_address: f.address, p_emergency_name: f.emergency_name, p_emergency_phone: f.emergency_phone });
    setBusy(false);
    setMsg(error ? { bad: true, t: error.message } : { t: 'Saved' });
    if (!error) reload?.();
  };

  return (
    <div className="pp">
      <div className="panel pp-head">
        <div className="av lg">{initials(profile.name)}</div>
        <div className="grow">
          <h3>{profile.name}</h3>
          <p className="ops-muted">{profile.email}{profile.phone ? ` · +91 ${profile.phone}` : ''}</p>
          <div className="pp-pills"><span className={`pill ${sm[2]}`}>{sm[1]}</span><span className={`pill ${kyc[2]}`}><ShieldCheck size={11} /> {kyc[1]}</span>{profile.business_name && <span className="pill">{profile.business_name}</span>}</div>
        </div>
      </div>

      <div className="panel">
        <header><h3>{rider ? 'Vehicle & documents' : 'Business & documents'}</h3></header>
        <div className="pt-facts">
          {rider ? (<>
            <Row k="Vehicle">{[VEHICLES.find((v) => v[0] === profile.vehicle_type)?.[1], profile.vehicle_model, profile.vehicle_number].filter(Boolean).join(' · ')}</Row>
            <Row k="Driving licence">{profile.license_number}{lic && <span className={`pill ${lic.cls}`} style={{ marginLeft: 6 }}>{lic.label}</span>}</Row>
            <Row k="Vehicle insurance">{ins ? <span className={`pill ${ins.cls}`}>{ins.label}</span> : null}</Row>
            <Row k="Equipment issued">{[profile.uniform_issued && 'uniform', profile.bag_issued && 'bag', profile.helmet_issued && 'helmet'].filter(Boolean).join(', ') || 'nothing yet'}</Row>
          </>) : (<>
            <Row k="Owner">{profile.owner_name}</Row>
            <Row k="GSTIN">{profile.gstin}</Row>
            <Row k="Trade licence">{profile.trade_license}{lic && <span className={`pill ${lic.cls}`} style={{ marginLeft: 6 }}>{lic.label}</span>}</Row>
            <Row k="Services">{profile.services?.length ? profile.services.map((s) => services.find((x) => x.id === s)?.name || s).join(', ') : 'All services'}</Row>
            <Row k="Capacity">{profile.capacity_kg_per_day ? `${profile.capacity_kg_per_day} kg/day` : null}{profile.max_active_jobs ? ` · ${profile.max_active_jobs} orders at once` : ''}</Row>
            <Row k="Promised turnaround">{profile.turnaround_hours ? `${profile.turnaround_hours} hours` : null}</Row>
          </>)}
          <Row k="ID on file">{profile.id_type ? `${profile.id_type.replace('_', ' ')}${profile.id_last4 ? ` ••${profile.id_last4}` : ''}` : null}</Row>
        </div>
      </div>

      <div className="panel">
        <header><h3>{rider ? 'Shift & pay' : 'Hours & pay rates'}</h3></header>
        <div className="pt-facts">
          <Row k={rider ? 'Shift' : 'Opening hours'}>{rider ? (profile.shift_start ? `${hhmm(profile.shift_start)} – ${hhmm(profile.shift_end)}` : 'Flexible') : (profile.open_time ? `${hhmm(profile.open_time)} – ${hhmm(profile.close_time)}` : null)}</Row>
          <Row k="Working days">{(profile.work_days || []).length === 7 ? 'Every day' : (profile.work_days || []).map((d) => DAYS[d]).join(', ')}</Row>
          {rider ? <Row k="Fee per delivery">{profile.fee_override != null ? inr(profile.fee_override) : 'Standard rate'}</Row>
            : <Row k="You earn">{`₹${profile.payout_per_kg || 0}/kg · ₹${profile.payout_per_order || 0}/order · ₹${profile.payout_per_piece || 0}/piece`}</Row>}
          <Row k="Payout cycle">{PAYOUT_CYCLES.find((c) => c[0] === profile.payout_cycle)?.[1]}</Row>
          <Row k="Paid to">{profile.has_bank ? `${profile.upi_id ? `UPI ${profile.upi_id}` : ''}${profile.bank_last4 ? ` · Bank ••••${profile.bank_last4}` : ''}`.replace(/^ · /, '') : 'Not added — ask the admin'}</Row>
          <Row k="Contract">{profile.contract_end ? `Until ${dayStr(profile.contract_end)}` : 'Open-ended'}</Row>
        </div>
        <p className="st-note"><AlertTriangle size={13} /> Bank, ID and pay-rate changes can only be made by the admin.</p>
      </div>

      <div className="panel">
        <header><h3>Contact details</h3><span className="ops-muted">You can edit these</span></header>
        <div className="st-grid2">
          <Field label="Alternate phone"><input value={f.alt_phone} onChange={(e) => setF({ ...f, alt_phone: e.target.value })} /></Field>
          <Field label="Address"><input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
          <Field label="Emergency contact name"><input value={f.emergency_name} onChange={(e) => setF({ ...f, emergency_name: e.target.value })} /></Field>
          <Field label="Emergency contact phone"><input value={f.emergency_phone} onChange={(e) => setF({ ...f, emergency_phone: e.target.value })} /></Field>
        </div>
        <div className="pp-save"><button className="ops-btn ops-btn-primary" disabled={!dirty || busy} onClick={save}>{busy ? 'Saving…' : 'Save contact details'}</button>{msg && <span className={msg.bad ? 'pp-bad' : 'pp-ok'}>{msg.t}</span>}</div>
      </div>
    </div>
  );
};
