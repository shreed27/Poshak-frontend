import React, { useCallback, useEffect, useState } from 'react';
import { LogOut, PackageCheck, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { serviceInfo } from '../../lib/pricing';
import { useCatalog } from '../../context/CatalogContext';
import { STATUS_LABEL } from '../../lib/orderStatus';
import { OpsGate } from './OpsGate';
import { PhotoCapture } from './PhotoCapture';

const Job = ({ j, run }) => {
  const { services } = useCatalog();
  const [pieces, setPieces] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const n = Number(pieces) || 0;
  const mismatch = j.pieces_picked_up && n && n !== j.pieces_picked_up;

  return (
    <div className="ops-card">
      <div className="ops-order-top">
        <h3>#{j.order_code}</h3>
        <span className={`ops-badge b-${j.status}`}>{STATUS_LABEL[j.status]}</span>
      </div>
      <p className="ops-line"><b>{j.service_name}</b></p>
      {(j.actual_items || []).map((it, i) => (
        <p key={i} className="ops-line">{serviceInfo(it.service_id, services)?.name || it.service_id}: <b>{it.qty} {serviceInfo(it.service_id, services)?.unit}</b></p>
      ))}
      {j.special_instructions && <p className="ops-line">Customer note: {j.special_instructions}</p>}
      <p className="ops-line">Captain counted <b>{j.pieces_picked_up ?? '—'}</b> pieces at pickup{j.pieces_received != null ? ` · you received ${j.pieces_received}` : ''}</p>

      {(j.status === 'picked_up' || j.status === 'cleaning') && (
        <div className="cap-panel">
          <div className="cap-weigh">
            <div><b>{j.status === 'picked_up' ? 'Pieces you received' : 'Pieces ready (after cleaning)'}</b><span>Count every garment</span></div>
            <input inputMode="numeric" value={pieces} onChange={(e) => setPieces(e.target.value.replace(/\D/g, ''))} />
          </div>
          {mismatch && <div className="ops-error" style={{ margin: '0 0 0.5rem' }}><AlertTriangle size={13} /> Count differs from pickup ({j.pieces_picked_up}). Admin will be alerted.</div>}
          <input className="ops-inline" placeholder="Notes (damage, stains, missing items)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {j.status === 'picked_up' && <div style={{ marginTop: '0.6rem' }}><PhotoCapture orderId={j.id} label="received" value={photos} onChange={setPhotos} /></div>}
          <button className="ops-btn ops-btn-primary ops-wide" disabled={!n}
            onClick={() => run(() => j.status === 'picked_up'
              ? supabase.rpc('cleaner_receive', { p_id: j.id, p_pieces: n, p_notes: notes || null, p_photos: photos.map((p) => p.path) })
              : supabase.rpc('cleaner_ready', { p_id: j.id, p_pieces: n, p_notes: notes || null }))}>
            {j.status === 'picked_up' ? <><PackageCheck size={15} /> Received — start cleaning</> : <><Sparkles size={15} /> Cleaned — mark ready for delivery</>}
          </button>
        </div>
      )}
      {j.status === 'ready' && <p className="ops-muted">Ready. Waiting for the delivery partner to collect.</p>}
    </div>
  );
};

const Cleaner = () => {
  const { session, logout } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('cleaner_queue');
    if (err) setError(err.message); else { setError(''); setJobs(data || []); }
  }, []);
  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, [load]);
  const run = async (fn) => { const { error: err } = await fn(); if (err) setError(err.message); else { setError(''); load(); } };

  const incoming = jobs.filter((j) => j.status === 'picked_up');
  const working = jobs.filter((j) => j.status === 'cleaning');
  const ready = jobs.filter((j) => j.status === 'ready');
  return (
    <div className="ops-root ops-captain">
      <header className="ops-top">
        <div className="ops-brand">Poshak <span>Laundry</span></div>
        <div className="ops-top-right">
          <span className="ops-user">{session.user.email}</span>
          <button className="ops-icon" onClick={load} title="Refresh"><RefreshCw size={16} /></button>
          <button className="ops-icon" onClick={() => { logout(); window.location.hash = '#/staff'; }}><LogOut size={16} /></button>
        </div>
      </header>
      {error && <div className="ops-error">{error}</div>}
      <h3 className="ops-h">To receive ({incoming.length})</h3>
      {incoming.length === 0 && <div className="ops-card ops-empty">Nothing waiting. New pickups appear here.</div>}
      {incoming.map((j) => <Job key={j.id} j={j} run={run} />)}
      <h3 className="ops-h">Being cleaned ({working.length})</h3>
      {working.map((j) => <Job key={j.id} j={j} run={run} />)}
      {ready.length > 0 && <><h3 className="ops-h">Ready for delivery ({ready.length})</h3>{ready.map((j) => <Job key={j.id} j={j} run={run} />)}</>}
    </div>
  );
};

export const CleanerApp = () => (
  <OpsGate title="Poshak Laundry" roles={['cleaner']}>
    <Cleaner />
  </OpsGate>
);
