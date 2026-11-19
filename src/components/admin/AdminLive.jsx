import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Radio, Bike, PackageOpen, Timer, AlertTriangle, Phone, MapPin, Wand2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { subscribeOrders } from '../../lib/ordersApi';
import { STATUS_LABEL } from '../../lib/orderStatus';
import { freshness, agoText, fmtMin, kmText } from '../../lib/tracking';
import { L, createMap } from '../main-app/mapKit';
import { dt } from '../../lib/csv';

const ACTIVE = ['placed', 'captain_assigned', 'picked_up', 'cleaning', 'ready', 'out_for_delivery'];
const SELECT = 'id, order_code, status, assignment, captain_id, captain_name, customer_name, pickup_lat, pickup_lng, pickup_address, pickup_slot, delivery_slot, eta_minutes, eta_km, eta_leg, eta_updated_at, captain_lat, captain_lng, captain_updated_at, created_at, offered_at';

const riderIcon = (name, state) => L.divIcon({
  className: 'al-marker', iconSize: [38, 38], iconAnchor: [19, 19],
  html: `<div class="al-rider ${state}"><span>${(name || '?').trim()[0]?.toUpperCase() || '?'}</span></div>`
});
const pinIcon = (cls) => L.divIcon({ className: 'al-marker', iconSize: [30, 30], iconAnchor: [15, 28], html: `<div class="al-pin ${cls}"></div>` });

const riderState = (r) => {
  const f = freshness(r.last_seen_at);
  if (!r.is_online || f.state === 'none' || (f.secs ?? 0) > 900) return 'off';
  return f.state;                                   // live | delayed | stale
};
const STATE_LABEL = { live: 'Live', delayed: 'Delayed', stale: 'No signal', off: 'Offline' };

export const AdminLive = () => {
  const [riders, setRiders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [tab, setTab] = useState('riders');
  const [sel, setSel] = useState(null);                // { type: 'rider'|'order', id }
  const [error, setError] = useState('');
  const [showOffline, setShowOffline] = useState(false);
  const [now, setNow] = useState(Date.now());
  const el = useRef(null); const map = useRef(null); const layer = useRef(null); const fitted = useRef(false);
  const lastLoad = useRef(0);

  const load = useCallback(async () => {
    if (Date.now() - lastLoad.current < 2500) return;          // GPS pings fire realtime events constantly; don't refetch on every one
    lastLoad.current = Date.now();
    const [r, o, a] = await Promise.all([
      supabase.from('profiles').select('id, name, phone, vehicle, is_online, last_seen_at, last_lat, last_lng').eq('role', 'captain'),
      supabase.from('orders').select(SELECT).in('status', ACTIVE).order('created_at', { ascending: false }).limit(300),
      supabase.from('ops_alerts').select('id, kind, message, severity, order_id, created_at').is('resolved_at', null).in('kind', ['late_rider', 'no_captain', 'incident']).order('created_at', { ascending: false }).limit(30)
    ]);
    const err = r.error || o.error;
    if (err) { setError(err.message); return; }
    setError(''); setRiders(r.data || []); setOrders(o.data || []); setAlerts(a.data || []);
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, 6000);
    const tick = setInterval(() => setNow(Date.now()), 5000);
    const unsub = subscribeOrders('admin-live', load);
    return () => { clearInterval(poll); clearInterval(tick); unsub(); };
  }, [load]);

  const jobsOf = useCallback((id) => orders.filter((o) => o.captain_id === id), [orders]);
  const enriched = useMemo(() => riders.map((r) => {
    const jobs = jobsOf(r.id);
    const live = jobs.filter((o) => o.eta_minutes != null);
    const state = riderState(r);
    const onJob = jobs.some((o) => o.status === 'out_for_delivery' || (o.status === 'captain_assigned' && o.assignment === 'accepted'));
    return { ...r, jobs, state, onJob, nextEta: live.length ? Math.min(...live.map((o) => o.eta_minutes)) : null, noSignal: onJob && (state === 'stale' || state === 'off') };
  }), [riders, jobsOf, now]);  // eslint-disable-line react-hooks/exhaustive-deps

  const unassigned = orders.filter((o) => o.status === 'placed' || (o.status === 'captain_assigned' && !o.captain_id));
  const unassignedOld = unassigned.filter((o) => Date.now() - new Date(o.created_at) > 10 * 60000);
  const onJobCount = enriched.filter((r) => r.onJob).length;
  const etas = orders.filter((o) => o.eta_minutes != null).map((o) => o.eta_minutes);
  const avgEta = etas.length ? Math.round(etas.reduce((a, b) => a + b, 0) / etas.length) : null;
  const attention = [
    ...enriched.filter((r) => r.noSignal).map((r) => ({ key: `n${r.id}`, tone: 'bad', title: `${r.name || 'Rider'} has no GPS signal`, text: `On a job but last seen ${agoText(freshness(r.last_seen_at).secs)}. Call them.`, phone: r.phone, focus: { type: 'rider', id: r.id } })),
    ...unassignedOld.map((o) => ({ key: `u${o.id}`, tone: 'warn', title: `#${o.order_code} unassigned for ${Math.round((Date.now() - new Date(o.created_at)) / 60000)} min`, text: 'No captain has taken it yet.', focus: { type: 'order', id: o.id } })),
    ...alerts.filter((a) => a.kind === 'late_rider').map((a) => ({ key: `a${a.id}`, tone: 'warn', title: 'Running late', text: a.message, focus: a.order_id ? { type: 'order', id: a.order_id } : null }))
  ];

  // ---- map ----------------------------------------------------------------------------------------------------
  useEffect(() => {
    const m = createMap(el.current, { lat: 12.9346, lng: 77.606 }, 12);
    layer.current = L.layerGroup().addTo(m); map.current = m;
    return () => m.remove();
  }, []);
  useEffect(() => {
    const m = map.current; if (!m) return;
    layer.current.clearLayers();
    const pts = [];
    orders.forEach((o) => {
      if (o.pickup_lat == null) return;
      const un = !o.captain_id; const cls = un ? 'un' : o.status === 'out_for_delivery' ? 'out' : o.status === 'captain_assigned' ? 'pick' : 'wash';
      pts.push([o.pickup_lat, o.pickup_lng]);
      const mk = L.marker([o.pickup_lat, o.pickup_lng], { icon: pinIcon(cls) }).addTo(layer.current)
        .bindTooltip(`#${o.order_code} · ${STATUS_LABEL[o.status] || o.status}${o.eta_minutes != null ? ` · ETA ${o.eta_minutes} min` : ''}`, { direction: 'top', offset: [0, -26] });
      mk.on('click', () => { setSel({ type: 'order', id: o.id }); setTab('orders'); });
      if (o.captain_lat != null && o.eta_minutes != null) L.polyline([[o.captain_lat, o.captain_lng], [o.pickup_lat, o.pickup_lng]], { color: '#fa5929', weight: 2, opacity: 0.55, dashArray: '5 7' }).addTo(layer.current);
    });
    enriched.forEach((r) => {
      if (r.last_lat == null || (r.state === 'off' && !showOffline && !r.onJob)) return;
      pts.push([r.last_lat, r.last_lng]);
      const mk = L.marker([r.last_lat, r.last_lng], { icon: riderIcon(r.name, r.state), zIndexOffset: 800 }).addTo(layer.current)
        .bindTooltip(`${r.name || 'Rider'} · ${STATE_LABEL[r.state]}${r.nextEta != null ? ` · next ETA ${r.nextEta} min` : r.jobs.length ? '' : ' · free'}`, { direction: 'top', offset: [0, -18] });
      mk.on('click', () => { setSel({ type: 'rider', id: r.id }); setTab('riders'); });
    });
    if (!fitted.current && pts.length) { m.fitBounds(pts, { padding: [50, 50], maxZoom: 15 }); fitted.current = true; }
  }, [orders, enriched, showOffline]);

  const focus = (s) => {
    setSel(s);
    const m = map.current; if (!m || !s) return;
    const p = s.type === 'rider' ? enriched.find((r) => r.id === s.id) : orders.find((o) => o.id === s.id);
    const lat = s.type === 'rider' ? p?.last_lat : p?.pickup_lat; const lng = s.type === 'rider' ? p?.last_lng : p?.pickup_lng;
    if (lat != null) m.flyTo([lat, lng], 15, { duration: 0.6 });
  };

  const act = async (fn) => { const { error: e } = await fn(); if (e) setError(e.message); else { setError(''); lastLoad.current = 0; load(); } };
  const assignable = enriched.filter((r) => r.state !== 'off').sort((a, b) => a.jobs.length - b.jobs.length);

  const shownRiders = enriched.filter((r) => showOffline || r.state !== 'off' || r.onJob);
  const OrderRow = ({ o }) => {
    const f = freshness(o.captain_updated_at, now);
    const un = !o.captain_id;
    return (
      <div className={`al-row ${sel?.type === 'order' && sel.id === o.id ? 'sel' : ''}`} onClick={() => focus({ type: 'order', id: o.id })}>
        <div className="al-row-top"><b>#{o.order_code}</b><span className={`ops-badge b-${o.status}`}>{un ? 'Unassigned' : (o.assignment === 'offered' && o.status === 'captain_assigned' ? 'Offered…' : STATUS_LABEL[o.status])}</span></div>
        <small>{o.customer_name} · {o.pickup_slot || 'ASAP'}</small>
        {!un && <small>{o.captain_name}{o.eta_minutes != null ? ` · ETA ${fmtMin(o.eta_minutes)}${o.eta_km ? ` · ${kmText(Number(o.eta_km))}` : ''} (${o.eta_leg === 'delivery' ? 'drop' : 'pickup'})` : ''}{o.captain_updated_at && o.eta_minutes != null && f.state !== 'live' ? ` · GPS ${agoText(f.secs)}` : ''}</small>}
        {un && (
          <div className="al-assign" onClick={(e) => e.stopPropagation()}>
            <select defaultValue="" onChange={(e) => e.target.value && act(() => supabase.rpc('admin_assign_captain', { p_id: o.id, p_captain: e.target.value }))}>
              <option value="">{assignable.length ? 'Assign rider…' : 'No riders online'}</option>
              {assignable.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.jobs.length} job{r.jobs.length === 1 ? '' : 's'} · {STATE_LABEL[r.state]}</option>)}
            </select>
            <button className="ops-btn" title="Pick the best online rider" onClick={() => act(async () => { const r = await supabase.rpc('admin_auto_assign', { p_id: o.id }); if (!r.error && !r.data) return { error: { message: 'No online rider available right now' } }; return r; })}><Wand2 size={13} /> Auto</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="an al">
      <div className="an-head"><div><h2>Live map</h2><p className="ops-muted">Where every rider is, who is heading where, and when they will arrive. Updates every few seconds.</p></div>
        <div className="an-tools"><label className="al-check"><input type="checkbox" checked={showOffline} onChange={(e) => setShowOffline(e.target.checked)} /> Show offline riders</label></div></div>
      {error && <div className="ops-error" style={{ margin: '0 0 .8rem' }}>{error}</div>}

      <div className="kpi-grid al-kpis">
        <div className="kpi tone-good"><div className="kpi-top"><span className="kpi-ic"><Radio size={16} /></span><span className="kpi-l">Riders online</span></div><div className="kpi-v">{enriched.filter((r) => r.state !== 'off').length}</div><div className="kpi-foot"><small>of {riders.length} · {onJobCount} on a job</small></div></div>
        <div className={`kpi ${unassigned.length ? 'tone-brand' : ''}`}><div className="kpi-top"><span className="kpi-ic"><PackageOpen size={16} /></span><span className="kpi-l">Waiting for a rider</span></div><div className="kpi-v">{unassigned.length}</div><div className="kpi-foot"><small>{unassignedOld.length ? `${unassignedOld.length} waiting over 10 min` : 'none stuck'}</small></div></div>
        <div className="kpi"><div className="kpi-top"><span className="kpi-ic"><Timer size={16} /></span><span className="kpi-l">Average ETA</span></div><div className="kpi-v">{avgEta != null ? fmtMin(avgEta) : '—'}</div><div className="kpi-foot"><small>{etas.length} live {etas.length === 1 ? 'trip' : 'trips'}</small></div></div>
        <div className={`kpi ${attention.length ? 'tone-bad' : ''}`}><div className="kpi-top"><span className="kpi-ic"><AlertTriangle size={16} /></span><span className="kpi-l">Needs attention</span></div><div className="kpi-v">{attention.length}</div><div className="kpi-foot"><small>late, no signal or stuck</small></div></div>
      </div>

      <div className="al-grid">
        <div className="al-mapbox">
          <div ref={el} className="al-map" />
          <div className="al-legend"><span><i className="al-pin un" /> Unassigned</span><span><i className="al-pin pick" /> Pickup</span><span><i className="al-pin out" /> Delivering</span><span><i className="al-pin wash" /> At laundry</span></div>
        </div>
        <aside className="al-side">
          <div className="chips" style={{ marginBottom: '.6rem' }}>
            {[['riders', `Riders · ${shownRiders.length}`], ['orders', `Orders · ${orders.length}`], ['alerts', `Attention · ${attention.length}`]].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
          </div>
          <div className="al-list">
            {tab === 'riders' && (shownRiders.length === 0 ? <div className="ch-empty">No riders online. Turn on “Show offline riders” to see everyone.</div> : shownRiders.map((r) => (
              <div key={r.id} className={`al-row ${sel?.type === 'rider' && sel.id === r.id ? 'sel' : ''}`} onClick={() => focus({ type: 'rider', id: r.id })}>
                <div className="al-row-top"><b><Bike size={13} /> {r.name || 'Rider'}</b><span className={`al-state ${r.state}`}>{STATE_LABEL[r.state]}</span></div>
                <small>{r.jobs.length ? `${r.jobs.length} active job${r.jobs.length === 1 ? '' : 's'}${r.nextEta != null ? ` · next ETA ${fmtMin(r.nextEta)}` : ''}` : 'Free'}{r.last_seen_at ? ` · seen ${agoText(freshness(r.last_seen_at, now).secs)}` : ''}</small>
                {r.noSignal && <small className="al-bad"><AlertTriangle size={11} /> On a job but no GPS signal</small>}
                {sel?.type === 'rider' && sel.id === r.id && (<>
                  {r.jobs.map((o) => <small key={o.id}>#{o.order_code} · {STATUS_LABEL[o.status]}{o.eta_minutes != null ? ` · ETA ${fmtMin(o.eta_minutes)}` : ''}</small>)}
                  {r.phone && <a className="ops-btn" href={`tel:${r.phone}`} onClick={(e) => e.stopPropagation()}><Phone size={13} /> Call {r.phone}</a>}
                </>)}
              </div>
            )))}
            {tab === 'orders' && (orders.length === 0 ? <div className="ch-empty">No active orders.</div> : [...unassigned, ...orders.filter((o) => !unassigned.includes(o))].map((o) => <OrderRow key={o.id} o={o} />))}
            {tab === 'alerts' && (attention.length === 0 ? <div className="ch-empty">Nothing needs attention. 🎉</div> : attention.map((a) => (
              <div key={a.key} className={`al-row alert ${a.tone}`} onClick={() => a.focus && focus(a.focus)}>
                <div className="al-row-top"><b>{a.title}</b></div><small>{a.text}</small>
                {a.phone && <a className="ops-btn" href={`tel:${a.phone}`} onClick={(e) => e.stopPropagation()}><Phone size={13} /> Call</a>}
              </div>
            )))}
          </div>
        </aside>
      </div>
    </div>
  );
};
