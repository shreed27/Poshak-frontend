import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Phone, MessageCircle, MapPin, Send, XCircle, FileQuestion, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { subscribeOrders } from '../../lib/ordersApi';
import { inr, dt } from '../../lib/csv';

const FILTERS = [['requested', 'Needs a price'], ['quoted', 'Quoted'], ['accepted', 'Accepted'], ['closed', 'Closed'], ['all', 'All']];
const NOTES = ['Ready in 3 days', 'Includes pickup & delivery', 'Price is for all items listed', 'Final fitting may need a second visit'];
const STATUS = { requested: ['Needs a price', 'warn'], quoted: ['Quoted', 'info'], accepted: ['Accepted', 'good'], declined: ['Declined', ''], cancelled: ['Cancelled', ''] };

export const AdminQuotes = ({ onCount }) => {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('requested');
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState(null);
  const [thumbs, setThumbs] = useState({});
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('quote_requests').select('*, orders(order_code)').order('created_at', { ascending: false }).limit(300);
    if (e) { setError(e.message); setRows([]); return; }
    setError(''); setRows(data || []);
    onCount?.((data || []).filter((x) => x.status === 'requested').length);
    const paths = (data || []).filter((x) => ['requested', 'quoted'].includes(x.status)).flatMap((x) => x.photos || []);
    if (paths.length) {
      const { data: s } = await supabase.storage.from('quote-photos').createSignedUrls(paths, 3600);
      setThumbs((t) => ({ ...t, ...Object.fromEntries((s || []).filter((y) => y.signedUrl).map((y) => [y.path, y.signedUrl])) }));
    }
  }, [onCount]);
  useEffect(() => { load(); const t = setInterval(load, 30000); const un = subscribeOrders('admin-quotes', load); return () => { clearInterval(t); un(); }; }, [load]);

  const shown = useMemo(() => (rows || []).filter((x) => {
    if (filter === 'closed' ? !['declined', 'cancelled'].includes(x.status) : filter !== 'all' && x.status !== filter) return false;
    if (!q.trim()) return true;
    return `${x.quote_no} ${x.customer_name} ${x.customer_phone} ${x.description}`.toLowerCase().includes(q.trim().toLowerCase());
  }), [rows, filter, q]);
  const counts = useMemo(() => { const c = { all: 0, requested: 0, quoted: 0, accepted: 0, closed: 0 }; (rows || []).forEach((x) => { c.all++; if (['declined', 'cancelled'].includes(x.status)) c.closed++; else c[x.status]++; }); return c; }, [rows]);
  const sel = rows?.find((x) => x.id === selId) || null;
  useEffect(() => { if (sel) { setAmount(sel.quoted_amount ? String(sel.quoted_amount) : ''); setNote(sel.admin_note || ''); setMsg(''); } }, [selId]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn, ok) => { setBusy(true); const { error: e } = await fn(); setBusy(false); if (e) setError(e.message); else { setError(''); setMsg(ok); load(); } };
  const send = () => run(() => supabase.rpc('admin_send_quote', { p_id: sel.id, p_amount: Number(amount), p_note: note || null }), `Quote of ${inr(amount)} sent to ${sel.customer_name || 'the customer'}`);
  const decline = () => { const why = window.prompt('Why can’t we take this? (the customer will see it)', ''); if (why === null) return; run(() => supabase.rpc('admin_decline_quote', { p_id: sel.id, p_note: why || null }), 'Request declined'); };

  if (rows == null) return <div className="sk-grid">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="sk" />)}</div>;
  const open = sel && ['requested', 'quoted'].includes(sel.status);

  return (
    <div className="an">
      <div className="an-head"><div><h2>Quotes</h2><p className="ops-muted">Alteration &amp; Dry Cleaning requests. Look at what the customer wants, send a price, and they can accept it from their app — it becomes a normal order at exactly that price.</p></div></div>
      {error && <div className="ops-error" style={{ margin: '0 0 1rem' }}>{error}{/relation|schema cache|does not exist/i.test(error) ? ' — run the latest database update (migration 0014).' : ''}</div>}

      <div className="chips">
        {FILTERS.map(([k, l]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}<em>{counts[k]}</em></button>)}
        <span className="grow" />
        <div className="search"><Search size={14} /><input placeholder="Search quote, name, phone…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      <div className="aq-grid">
        <div className="aq-list">
          {shown.length === 0 ? <div className="ch-empty"><FileQuestion size={22} /><br />{filter === 'requested' ? 'No requests waiting for a price. 🎉' : 'Nothing here.'}</div> : shown.map((x) => {
            const [sl, sc] = STATUS[x.status];
            return (
              <button key={x.id} className={`aq-row ${selId === x.id ? 'sel' : ''}`} onClick={() => setSelId(x.id)}>
                <div className="aq-top"><b>{x.quote_no}</b><span className={`pill ${sc}`}>{sl}</span></div>
                <span className="aq-who">{x.customer_name || 'Customer'} · {x.customer_phone}</span>
                <span className="aq-desc">{x.description}</span>
                <small>{dt(x.created_at)}{x.quoted_amount ? ` · quoted ${inr(x.quoted_amount)}` : ''}</small>
              </button>
            );
          })}
        </div>

        <section className="panel aq-detail">
          {!sel ? <div className="ch-empty">Select a request to see the details and send a price.</div> : (<>
            <header><div><h3>{sel.quote_no}</h3><span className="ops-muted">{dt(sel.created_at)}</span></div><span className={`pill ${STATUS[sel.status][1]}`}>{STATUS[sel.status][0]}</span></header>
            <p className="aq-text">{sel.description}</p>
            {(sel.photos || []).length > 0 && <div className="aq-photos">{sel.photos.map((p) => thumbs[p] ? <a key={p} href={thumbs[p]} target="_blank" rel="noreferrer"><img src={thumbs[p]} alt="" /></a> : <span key={p} className="aq-ph-load" />)}</div>}
            <div className="pt-facts">
              <div><span>Customer</span><small>{sel.customer_name || '—'}</small></div>
              <div><span>Phone</span><small><a href={`tel:${sel.customer_phone}`}>{sel.customer_phone}</a></small></div>
              <div><span>Pickup address</span><small>{sel.pickup_address}{sel.landmark ? ` · near ${sel.landmark}` : ''}</small></div>
            </div>
            <div className="aq-contact">
              <a className="ops-btn" href={`tel:${sel.customer_phone}`}><Phone size={14} /> Call</a>
              <a className="ops-btn" target="_blank" rel="noreferrer" href={`https://wa.me/91${sel.customer_phone}?text=${encodeURIComponent(`Hi ${sel.customer_name || ''}, this is Poshak about your quote request ${sel.quote_no}.`)}`}><MessageCircle size={14} /> WhatsApp</a>
              <a className="ops-btn" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${sel.pickup_lat},${sel.pickup_lng}`}><MapPin size={14} /> Map</a>
            </div>

            {open && (
              <div className="aq-reply">
                <h4>{sel.status === 'quoted' ? 'Revise the price' : 'Send a price'}</h4>
                <label className="aq-amt"><span>₹</span><input type="number" min="1" inputMode="numeric" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
                <textarea rows={2} placeholder="Note to the customer (optional) — what’s included, when it’ll be ready" value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="aq-notes">{NOTES.map((n) => <button type="button" key={n} onClick={() => setNote((t) => (t ? `${t}. ${n}` : n))}>{n}</button>)}</div>
                <div className="aq-actions">
                  <button className="ops-btn ops-btn-primary" disabled={busy || !(Number(amount) > 0)} onClick={send}><Send size={14} /> {sel.status === 'quoted' ? 'Update quote' : 'Send quote'}</button>
                  <button className="ops-btn ops-btn-danger" disabled={busy} onClick={decline}><XCircle size={14} /> Decline</button>
                </div>
                {sel.status === 'quoted' && <small className="ops-muted"><Clock size={11} /> Sent {dt(sel.quoted_at)} · valid for 7 days</small>}
              </div>
            )}
            {sel.status === 'accepted' && <div className="ops-ok-bar" style={{ margin: '1rem 0 0' }}><CheckCircle2 size={14} style={{ verticalAlign: '-2px' }} /> Accepted at {inr(sel.quoted_amount)} — order <b>{sel.orders?.order_code}</b> is in the Orders tab.</div>}
            {['declined', 'cancelled'].includes(sel.status) && <p className="ops-muted" style={{ marginTop: '1rem' }}>{sel.status === 'cancelled' ? 'Cancelled by the customer.' : `Closed${sel.admin_note ? `: ${sel.admin_note}` : '.'}`}</p>}
            {msg && <div className="ops-ok-bar" style={{ margin: '1rem 0 0' }}>{msg}</div>}
          </>)}
        </section>
      </div>
    </div>
  );
};
