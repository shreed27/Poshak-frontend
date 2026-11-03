import React, { useCallback, useEffect, useState } from 'react';
import { X, MessageSquare, Clock, ShieldCheck, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useCatalog } from '../../context/CatalogContext';
import { PhotoCapture } from '../admin/PhotoCapture';

export const CATEGORIES = [
  ['missing_item', 'A garment is missing'], ['damaged', 'A garment is damaged'], ['quality', 'Cleaning / ironing quality'],
  ['late', 'Pickup or delivery was late'], ['billing', 'Billing or payment'], ['captain_behaviour', 'Captain behaviour'], ['other', 'Something else']
];
const STATUS = { open: ['Open', '#c2410c', '#fff7ed'], in_review: ['In review', '#1d4ed8', '#eff6ff'], resolved: ['Resolved', '#15803d', '#f0fdf4'], rejected: ['Closed', '#6b7280', '#f3f4f6'] };

const Chip = ({ s }) => <span className="psk-chipstat" style={{ color: STATUS[s][1], background: STATUS[s][2] }}>{STATUS[s][0]}</span>;
const left = (iso) => { const h = Math.round((new Date(iso) - Date.now()) / 3600000); return h < 0 ? 'overdue' : h < 48 ? `${h}h left` : `${Math.round(h / 24)}d left`; };

const Thread = ({ t, onBack }) => {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', t.id).order('id');
    setMsgs(data || []);
  }, [t.id]);
  useEffect(() => { load(); }, [load]);
  const send = async (e) => {
    e.preventDefault();
    const { error: err } = await supabase.rpc('ticket_reply', { p_ticket: t.id, p_body: text });
    if (err) { setError(err.message); return; }
    setText(''); setError(''); load();
  };
  const closed = t.status === 'resolved' || t.status === 'rejected';
  return (
    <div>
      <button className="psk-link" onClick={onBack}>← All complaints</button>
      <h4 style={{ margin: '0.5rem 0 0.2rem' }}>{t.ticket_no} <Chip s={t.status} /></h4>
      <p className="psk-small">{CATEGORIES.find((c) => c[0] === t.category)?.[1]}{!closed && !t.ack_at ? ` · reply due ${left(t.due_ack_at)}` : ''}</p>
      {t.resolution === 'credit' && <p className="psk-credit">₹{t.resolution_amount} credited to your wallet</p>}
      <div className="psk-thread">
        {msgs.map((m) => <div key={m.id} className={`psk-msg ${m.sender_role}`}><b>{m.sender_role === 'admin' ? 'Poshak' : 'You'}</b><span>{m.body}</span></div>)}
      </div>
      {!closed && (
        <form className="psk-reply" onSubmit={send}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply…" maxLength={2000} />
          <button disabled={!text.trim()}><Send size={15} /></button>
        </form>
      )}
      {error && <p className="psk-pref-err">{error}</p>}
    </div>
  );
};

export const HelpCenter = ({ orders, startOrderId, onClose }) => {
  const { settings } = useCatalog();
  const remote = orders.filter((o) => o.remote);
  const [tab, setTab] = useState(startOrderId ? 'new' : 'list');
  const [tickets, setTickets] = useState([]);
  const [open, setOpen] = useState(null);
  const [orderId, setOrderId] = useState(startOrderId || remote[0]?.dbId || '');
  const [category, setCategory] = useState('missing_item');
  const [desc, setDesc] = useState('');
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
    setTickets(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const { error: err } = await supabase.rpc('open_ticket', { p_order: orderId, p_category: category, p_description: desc, p_photos: photos.map((p) => p.path) });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setDesc(''); setPhotos([]); setTab('list'); load();
  };

  const support = settings.support || {};
  return (
    <div className="swiggy-cart-modal-backdrop" onClick={onClose} style={{ justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
      <motion.div className="psk-loc-modal" onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        <div className="psk-loc-head"><h3><MessageSquare size={17} style={{ verticalAlign: '-3px' }} /> Help & complaints</h3><button className="psk-icon-btn" onClick={onClose}><X size={16} /></button></div>
        <div className="psk-loc-body">
          {open ? <Thread t={open} onBack={() => { setOpen(null); load(); }} /> : (
            <>
              <div className="psk-day-tabs">
                <button className={tab === 'list' ? 'on' : ''} onClick={() => setTab('list')}>My complaints ({tickets.length})</button>
                <button className={tab === 'new' ? 'on' : ''} onClick={() => setTab('new')}>Report a problem</button>
              </div>
              {tab === 'list' && (
                <>
                  {tickets.length === 0 && <div className="psk-empty">No complaints. If something went wrong with an order, report it and we will fix it.</div>}
                  {tickets.map((t) => (
                    <button key={t.id} className="psk-row" onClick={() => setOpen(t)}>
                      <MessageSquare size={16} />
                      <div><strong>{t.ticket_no} <Chip s={t.status} /></strong><span>{CATEGORIES.find((c) => c[0] === t.category)?.[1]} · {t.status === 'open' && !t.ack_at ? <><Clock size={11} /> reply due {left(t.due_ack_at)}</> : new Date(t.created_at).toLocaleDateString('en-IN')}</span></div>
                    </button>
                  ))}
                  <div className="psk-policy">
                    <b><ShieldCheck size={14} /> Our promise</b>
                    <p>{settings.claims_policy || 'We acknowledge every complaint within 48 hours and resolve it within 30 days.'}</p>
                    <p>Grievance officer: {support.grievance_officer || 'Poshak Support'}{support.grievance_email ? ` · ${support.grievance_email}` : ''}{support.phone ? ` · ${support.phone}` : ''}</p>
                  </div>
                </>
              )}
              {tab === 'new' && (
                <form onSubmit={submit} className="psk-newticket">
                  {remote.length === 0 ? <div className="psk-empty">You need an order to report a problem.</div> : (
                    <>
                      <div className="psk-field"><label>Which order?</label>
                        <select value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                          {remote.map((o) => <option key={o.dbId} value={o.dbId}>#{o.orderId} · {o.serviceName} · {o.placedAt}</option>)}
                        </select></div>
                      <div className="psk-field"><label>What went wrong?</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                      <div className="psk-field"><label>Tell us more</label>
                        <textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What happened? Which garment?" maxLength={2000} required minLength={5} /></div>
                      <div className="psk-field"><label>Photos (optional)</label>
                        {orderId && <PhotoCapture orderId={orderId} label="complaint" value={photos} onChange={setPhotos} />}</div>
                      <button className="psk-btn-primary" disabled={busy || desc.trim().length < 5}>{busy ? 'Sending…' : 'Submit complaint'}</button>
                      {error && <p className="psk-pref-err">{error}</p>}
                    </>
                  )}
                </form>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
