import React, { useCallback, useEffect, useState } from 'react';
import { FileQuestion, Clock, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { askConfirm } from '../../lib/confirm';

const DAY = 86400000;
const inr = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const ago = (iso) => { const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 60 ? `${Math.max(1, m)} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

// The customer's quote requests: waiting, quoted (accept / decline), recently accepted.
export const QuotesPanel = ({ userId, onRequest, onAccepted }) => {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [thumbs, setThumbs] = useState({});

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('quote_requests').select('*').order('created_at', { ascending: false }).limit(15);
    if (e) { setRows([]); return; }              // older database without quotes yet: show nothing
    setRows(data || []);
    const paths = (data || []).flatMap((q) => q.photos || []).slice(0, 12);
    if (paths.length) {
      const { data: s } = await supabase.storage.from('quote-photos').createSignedUrls(paths, 3600);
      setThumbs(Object.fromEntries((s || []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl])));
    }
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    load();
    const ch = supabase.channel(`quotes-${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'quote_requests' }, load).subscribe();
    const t = setInterval(load, 45000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [userId, load]);

  const respond = async (q, accept) => {
    if (!accept && !(await askConfirm({ title: 'Decline this quote?', ok: 'Decline', cancel: 'Back', danger: true }))) return;
    setBusy(q.id); setError('');
    const { error: e } = await supabase.rpc('respond_quote', { p_id: q.id, p_accept: accept });
    setBusy('');
    if (e) { setError(e.message); load(); return; }
    await load();
    if (accept) onAccepted?.();
  };
  const cancel = async (q) => {
    if (!(await askConfirm({ title: 'Cancel this quote request?', ok: 'Cancel request', cancel: 'Back', danger: true }))) return;
    const { error: e } = await supabase.rpc('cancel_my_quote', { p_id: q.id });
    if (e) setError(e.message); else load();
  };

  if (!rows) return null;
  const visible = rows.filter((q) => ['requested', 'quoted'].includes(q.status) || (q.status === 'accepted' && Date.now() - new Date(q.responded_at) < 3 * DAY));
  if (visible.length === 0 && rows.length === 0) return null;

  return (
    <section className="qt-panel">
      <div className="qt-head">
        <h3><FileQuestion size={17} /> Your quotes</h3>
        <button type="button" onClick={onRequest}><Plus size={14} /> New request</button>
      </div>
      {error && <p className="qt-err">{error}</p>}
      {visible.length === 0 && <p className="qt-empty">No open quote requests.</p>}
      {visible.map((q) => {
        const left = q.quoted_at ? Math.ceil((new Date(q.quoted_at).getTime() + 7 * DAY - Date.now()) / DAY) : null;
        const expired = q.status === 'quoted' && left != null && left <= 0;
        return (
          <article key={q.id} className={`qt-card ${q.status}`}>
            <div className="qt-top"><b>{q.quote_no}</b>
              <span className={`qt-pill ${q.status}`}>{q.status === 'requested' ? <><Clock size={11} /> Waiting for a price</> : q.status === 'quoted' ? (expired ? 'Expired' : 'Quote ready') : <><CheckCircle2 size={11} /> Booked</>}</span></div>
            <p className="qt-desc">{q.description}</p>
            {(q.photos || []).length > 0 && <div className="qt-thumbs">{q.photos.map((p) => thumbs[p] && <img key={p} src={thumbs[p]} alt="" />)}</div>}
            {q.status === 'requested' && <div className="qt-foot"><small>Sent {ago(q.created_at)} · we usually reply within a few hours</small><button type="button" className="qt-link" onClick={() => cancel(q)}>Cancel</button></div>}
            {q.status === 'quoted' && (
              <div className="qt-quote">
                <div className="qt-price"><span>Our price</span><b>{inr(q.quoted_amount)}</b></div>
                {q.admin_note && <p className="qt-note">“{q.admin_note}”</p>}
                {expired ? <small className="qt-err">This quote has expired. Please send a new request.</small> : (<>
                  <div className="qt-actions">
                    <button type="button" className="qt-accept" disabled={busy === q.id} onClick={() => respond(q, true)}>{busy === q.id ? 'Booking…' : `Accept & book pickup · ${inr(q.quoted_amount)}`}</button>
                    <button type="button" className="qt-decline" disabled={busy === q.id} onClick={() => respond(q, false)}><XCircle size={14} /> Decline</button>
                  </div>
                  <small>Valid for {left} more day{left === 1 ? '' : 's'}. Pay on delivery, or pay online from your order.</small>
                </>)}
              </div>
            )}
            {q.status === 'accepted' && <div className="qt-foot"><small>Your pickup is booked — track it above in <b>Your Orders</b>.</small></div>}
          </article>
        );
      })}
    </section>
  );
};
