import React, { useCallback, useEffect, useState } from 'react';
import { Siren, X, Phone, TrendingUp, Star, Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCatalog } from '../../context/CatalogContext';

const KINDS = [['sos', 'Emergency / SOS'], ['accident', 'Accident'], ['vehicle', 'Vehicle breakdown'], ['harassment', 'Harassed or threatened'], ['other', 'Other problem']];

// Red SOS button: sends an alert to every admin with the captain's live location.
export const SosButton = ({ activeOrderId }) => {
  const { settings } = useCatalog();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('sos');
  const [msg, setMsg] = useState('');
  const [state, setState] = useState('form');          // form | sending | sent | error
  const [error, setError] = useState('');
  const phone = typeof settings.ops_phone === 'string' ? settings.ops_phone : '';

  const send = async () => {
    setState('sending'); setError('');
    const pos = await new Promise((res) => {
      if (!('geolocation' in navigator)) return res(null);
      navigator.geolocation.getCurrentPosition((p) => res(p.coords), () => res(null), { enableHighAccuracy: true, timeout: 6000 });
    });
    const { error: err } = await supabase.rpc('captain_report_incident', { p_kind: kind, p_message: msg || null, p_lat: pos?.latitude ?? null, p_lng: pos?.longitude ?? null, p_order: activeOrderId || null });
    if (err) { setError(err.message); setState('error'); } else setState('sent');
  };

  return (
    <>
      <button className="cap-sos" onClick={() => { setOpen(true); setState('form'); }} aria-label="SOS"><Siren size={16} /> SOS</button>
      {open && (
        <div className="swiggy-cart-modal-backdrop" onClick={() => setOpen(false)} style={{ justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div className="psk-loc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="psk-loc-head"><h3>Report a problem</h3><button className="psk-icon-btn" onClick={() => setOpen(false)}><X size={16} /></button></div>
            <div className="psk-loc-body">
              {state === 'sent' ? (
                <>
                  <div className="psk-credit">Ops has been alerted with your location. Stay safe.</div>
                  {phone && <a className="ops-btn ops-btn-primary ops-wide" href={`tel:${phone}`}><Phone size={15} /> Call ops</a>}
                  <button className="psk-btn-ghost" onClick={() => setOpen(false)}>Close</button>
                </>
              ) : (
                <>
                  <div className="psk-field"><label>What happened?</label><select value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                  <div className="psk-field"><label>Details (optional)</label><input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Where are you? What do you need?" maxLength={300} /></div>
                  {error && <p className="psk-pref-err">{error}</p>}
                  <button className="psk-btn-primary" style={{ background: '#dc2626' }} onClick={send} disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send alert to ops'}</button>
                  {phone && <a className="ops-btn ops-wide" href={`tel:${phone}`}><Phone size={15} /> Or call ops now</a>}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const EarningsTab = () => {
  const [s, setS] = useState(null);
  const [rows, setRows] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const load = useCallback(async () => {
    const [{ data: sum }, { data: er }, { data: po }] = await Promise.all([
      supabase.rpc('captain_summary'),
      supabase.from('captain_earnings').select('*, orders(order_code)').order('created_at', { ascending: false }).limit(20),
      supabase.from('captain_payouts').select('*').order('created_at', { ascending: false }).limit(5)
    ]);
    setS(sum); setRows(er || []); setPayouts(po || []);
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!s) return <div className="ops-card ops-empty" style={{ margin: '1rem 1.25rem' }}>Loading…</div>;
  const pending = Number(s.pending_earnings) + Number(s.pending_tips);
  return (
    <div style={{ padding: '0 1.25rem' }}>
      <div className="cap-earn-grid">
        <div><span>Today</span><b>₹{s.today}</b><small>{s.deliveries_today} deliveries</small></div>
        <div><span>Last 7 days</span><b>₹{s.week}</b></div>
        <div><span>This month</span><b>₹{s.month}</b></div>
        <div><span><Star size={12} /> Rating</span><b>{s.rating ?? '—'}</b><small>{s.rated} rated</small></div>
      </div>
      <div className="ops-card">
        <div className="ops-line"><TrendingUp size={14} /> <span>To be paid out: <b>₹{pending}</b> (₹{s.pending_earnings} fees + ₹{s.pending_tips} tips)</span></div>
        <div className="ops-line"><Wallet size={14} /> <span>Cash in hand to deposit: <b>₹{s.cash_held}</b></span></div>
        <p className="ops-muted">Settlements net your cash in hand against your earnings.</p>
      </div>
      <h3 className="ops-h" style={{ margin: '1rem 0 0.5rem' }}>Recent deliveries</h3>
      {rows.length === 0 && <div className="ops-card ops-empty">Completed deliveries appear here.</div>}
      {rows.map((r) => <div key={r.id} className="ops-card cap-earn-row"><span>#{r.orders?.order_code} · {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span><b>+₹{r.amount}</b>{r.paid_out && <em>paid</em>}</div>)}
      {payouts.length > 0 && (<><h3 className="ops-h" style={{ margin: '1rem 0 0.5rem' }}>Settlements</h3>{payouts.map((p) => <div key={p.id} className="ops-card cap-earn-row"><span>{new Date(p.created_at).toLocaleDateString('en-IN')} · earnings ₹{p.earnings} + tips ₹{p.tips} − cash ₹{p.cash_netted}</span><b>{p.net >= 0 ? `₹${p.net} paid` : `₹${-p.net} owed`}</b></div>)}</>)}
    </div>
  );
};
