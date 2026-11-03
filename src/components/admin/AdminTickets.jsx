import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CATEGORIES } from '../main-app/HelpCenter';

const left = (iso) => { const h = Math.round((new Date(iso) - Date.now()) / 3600000); return h < 0 ? `overdue by ${-h}h` : h < 48 ? `${h}h left` : `${Math.round(h / 24)}d left`; };

const Detail = ({ t, onChange }) => {
  const [msgs, setMsgs] = useState([]);
  const [reply, setReply] = useState('');
  const [res, setRes] = useState({ kind: 'credit', amount: '', note: '' });
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', t.id).order('id');
    setMsgs(data || []);
  }, [t.id]);
  useEffect(() => { load(); }, [load]);
  const act = async (fn) => { const { error: err } = await fn(); if (err) setError(err.message); else { setError(''); await load(); onChange(); } };
  const closed = t.status === 'resolved' || t.status === 'rejected';
  return (
    <div className="ops-card">
      <div className="ops-order-top"><h3>{t.ticket_no}</h3><span className={`ops-badge b-${t.status === 'resolved' ? 'delivered' : t.status === 'rejected' ? 'cancelled' : 'placed'}`}>{t.status.replace('_', ' ')}</span></div>
      <p className="ops-line"><b>{CATEGORIES.find((c) => c[0] === t.category)?.[1]}</b> · order {t.order_code} · {t.customer_name || t.customer_email}</p>
      <p className="ops-line">{!t.ack_at && !closed ? `Acknowledge: ${left(t.due_ack_at)}` : ''} {!closed ? ` · Resolve: ${left(t.due_resolve_at)}` : ''}</p>
      <div className="ops-thread">{msgs.map((m) => <div key={m.id} className={`ops-msg ${m.sender_role}`}><b>{m.sender_role === 'admin' ? 'Poshak' : 'Customer'}</b> {m.body}</div>)}</div>
      {!closed && (
        <>
          <form className="ops-addform" onSubmit={(e) => { e.preventDefault(); act(() => supabase.rpc('ticket_reply', { p_ticket: t.id, p_body: reply })).then(() => setReply('')); }}>
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to the customer (also acknowledges the complaint)" />
            <button className="ops-btn ops-btn-primary" disabled={!reply.trim()}>Reply</button>
          </form>
          <div className="ops-addform" style={{ marginTop: '0.6rem' }}>
            <select value={res.kind} onChange={(e) => setRes({ ...res, kind: e.target.value })}>
              <option value="credit">Credit to wallet</option><option value="refund">Refund to payment method</option><option value="redo">Redo the service</option><option value="none">No compensation</option>
            </select>
            {(res.kind === 'credit' || res.kind === 'refund') && <input type="number" placeholder="₹ amount" value={res.amount} onChange={(e) => setRes({ ...res, amount: e.target.value })} />}
            <input placeholder="Message shown to customer" value={res.note} onChange={(e) => setRes({ ...res, note: e.target.value })} />
            <button className="ops-btn ops-btn-primary" onClick={() => act(() => supabase.rpc('admin_resolve_ticket', { p_ticket: t.id, p_status: 'resolved', p_resolution: res.kind, p_amount: res.amount ? Number(res.amount) : null, p_note: res.note || null }))}>Resolve</button>
            <button className="ops-btn" onClick={() => act(() => supabase.rpc('admin_resolve_ticket', { p_ticket: t.id, p_status: 'rejected', p_resolution: 'none', p_amount: null, p_note: res.note || 'We reviewed your complaint and could not find an issue.' }))}>Reject</button>
          </div>
          {res.kind === 'refund' && <p className="ops-muted">Refund: send the money from the Razorpay dashboard (or the Refund button on the order), then it is recorded there.</p>}
        </>
      )}
      {error && <div className="ops-error" style={{ margin: '0.6rem 0 0' }}>{error}</div>}
    </div>
  );
};

export const AdminTickets = ({ onCount }) => {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('open');
  const [sel, setSel] = useState(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from('tickets').select('*, orders(order_code, customer_name, customer_email)').order('created_at', { ascending: false }).limit(200);
    const list = (data || []).map((t) => ({ ...t, order_code: t.orders?.order_code, customer_name: t.orders?.customer_name, customer_email: t.orders?.customer_email }));
    setRows(list);
    onCount?.(list.filter((t) => t.status === 'open' || t.status === 'in_review').length);
  }, [onCount]);
  useEffect(() => {
    load();
    const ch = supabase.channel('admin-tickets').on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, load).subscribe();
    return () => supabase.removeChannel(ch);
  }, [load]);

  const shown = rows.filter((t) => filter === 'all' || (filter === 'open' ? t.status === 'open' || t.status === 'in_review' : t.status === filter));
  const cur = rows.find((t) => t.id === sel);
  const overdue = (t) => (t.status === 'open' && !t.ack_at && new Date(t.due_ack_at) < Date.now()) || (['open', 'in_review'].includes(t.status) && new Date(t.due_resolve_at) < Date.now());
  return (
    <div className="ops-grid" style={{ gridTemplateColumns: '380px 1fr' }}>
      <section className="ops-col">
        <div className="ops-tabs">{[['open', 'Open'], ['resolved', 'Resolved'], ['rejected', 'Closed'], ['all', 'All']].map(([k, l]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>)}</div>
        <div className="ops-list">
          {shown.length === 0 && <div className="ops-empty">No complaints here.</div>}
          {shown.map((t) => (
            <button key={t.id} className={`ops-order ${sel === t.id ? 'sel' : ''}`} onClick={() => setSel(t.id)}>
              <div className="ops-order-top"><b>{t.ticket_no}</b>{overdue(t) ? <span className="ops-badge b-cancelled">SLA overdue</span> : <span className="ops-badge">{t.status.replace('_', ' ')}</span>}</div>
              <div className="ops-order-name">{CATEGORIES.find((c) => c[0] === t.category)?.[1]}</div>
              <div className="ops-order-meta">{t.order_code} · {t.customer_name || t.customer_email}</div>
              <div className="ops-order-meta">{!t.ack_at && t.status === 'open' ? `Reply due: ${left(t.due_ack_at)}` : new Date(t.created_at).toLocaleDateString('en-IN')}</div>
            </button>
          ))}
        </div>
      </section>
      <section className="ops-col">{cur ? <Detail t={cur} onChange={load} /> : <div className="ops-card ops-empty">Select a complaint. Policy: acknowledge within 48 hours, resolve within 30 days.</div>}</section>
    </div>
  );
};
