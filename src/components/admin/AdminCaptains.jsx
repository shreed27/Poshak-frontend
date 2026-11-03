import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export const AdminCaptains = () => {
  const [caps, setCaps] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data: profs } = await supabase.from('profiles').select('id, name, email, phone, vehicle, is_online, last_seen_at').eq('role', 'captain');
    const withBal = await Promise.all((profs || []).map(async (c) => {
      const { data: b } = await supabase.rpc('admin_captain_balance', { p_captain: c.id });
      const { data: r } = await supabase.from('orders').select('captain_rating').eq('captain_id', c.id).not('captain_rating', 'is', null);
      const ratings = (r || []).map((x) => x.captain_rating);
      return { ...c, bal: b || {}, rating: ratings.length ? (ratings.reduce((a, x) => a + x, 0) / ratings.length).toFixed(2) : null, rated: ratings.length };
    }));
    setCaps(withBal);
    const [{ data: inc }, { data: po }] = await Promise.all([
      supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('captain_payouts').select('*').order('created_at', { ascending: false }).limit(10)
    ]);
    setIncidents(inc || []); setPayouts(po || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (fn) => { const { error: err } = await fn(); if (err) setError(err.message); else { setError(''); load(); } };
  const nameOf = (id) => caps.find((c) => c.id === id)?.name || 'Captain';

  return (
    <div className="ops-team" style={{ maxWidth: 900 }}>
      {error && <div className="ops-error" style={{ margin: '0 0 0.8rem' }}>{error}</div>}
      <div className="ops-card">
        <h3>Delivery partners</h3>
        {caps.length === 0 && <p className="ops-muted">No captains yet. Add them under Team.</p>}
        {caps.map((c) => (
          <div key={c.id} className="ops-staffrow">
            <div style={{ flex: 1 }}>
              <b>{c.is_online ? '● ' : '○ '}{c.name || c.email}</b>
              <span>{c.phone || ''}{c.vehicle ? ` · ${c.vehicle}` : ''} · {c.rating ? `★ ${c.rating} (${c.rated})` : 'no ratings yet'}</span>
              <span>Owed to captain: ₹{Number(c.bal.earnings || 0) + Number(c.bal.tips || 0)} · Cash held: ₹{c.bal.cash_held || 0} · <b>Net {Number(c.bal.net || 0) >= 0 ? `we pay ₹${c.bal.net || 0}` : `captain pays ₹${-c.bal.net}`}</b></span>
            </div>
            <button className="ops-btn ops-btn-primary" disabled={!Number(c.bal.earnings) && !Number(c.bal.tips) && !Number(c.bal.cash_held)}
              onClick={() => window.confirm(`Settle with ${c.name || c.email}? Net ₹${c.bal.net}.`) && act(() => supabase.rpc('admin_settle_captain', { p_captain: c.id, p_note: 'Settlement' }))}>Settle</button>
          </div>
        ))}
      </div>

      <div className="ops-card">
        <h3>Safety incidents</h3>
        {incidents.length === 0 && <p className="ops-muted">None reported.</p>}
        {incidents.map((i) => (
          <div key={i.id} className="ops-staffrow">
            <div><b>{i.kind.toUpperCase()} — {nameOf(i.captain_id)}</b><span>{i.message || ''} {i.lat ? <a target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${i.lat},${i.lng}`}>map</a> : null} · {new Date(i.created_at).toLocaleString('en-IN')}</span></div>
            {i.status === 'open' ? <button className="ops-btn" onClick={() => act(() => supabase.rpc('admin_resolve_incident', { p_id: i.id }))}>Resolve</button> : <em>resolved</em>}
          </div>
        ))}
      </div>

      <div className="ops-card">
        <h3>Recent settlements</h3>
        {payouts.length === 0 && <p className="ops-muted">None yet.</p>}
        {payouts.map((p) => <div key={p.id} className="ops-staffrow"><div><b>{nameOf(p.captain_id)}</b><span>{new Date(p.created_at).toLocaleDateString('en-IN')} · fees ₹{p.earnings} + tips ₹{p.tips} − cash ₹{p.cash_netted}</span></div><b>{p.net >= 0 ? `₹${p.net} paid` : `₹${-p.net} received`}</b></div>)}
      </div>
    </div>
  );
};
