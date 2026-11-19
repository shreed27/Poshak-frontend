import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Star, Wallet, Bike, IndianRupee, ShieldAlert, MapPinned, CheckCircle2 } from 'lucide-react';
import { L, createMap, homeIcon, riderIcon } from '../main-app/mapKit';
import { haversineKm } from '../../lib/geo';
import { useT } from '../../i18n';
import { fmtMin, kmText, arrivalClock, remainingRoute } from '../../lib/tracking';
import { inr, dt } from '../../lib/csv';
import { STATUS_LABEL } from '../../lib/orderStatus';
import { docWarnings } from './PartnerProfile';
import { BarChart } from './charts';

// Four numbers a rider checks all day.
export const RiderStrip = ({ s, cash }) => {
  const { t } = useT();
  return (
  <div className="rd-strip">
    <div><b><IndianRupee size={13} style={{ verticalAlign: '-1px' }} />{s ? Number(s.today).toLocaleString('en-IN') : '…'}</b><span><Bike size={10} /> {t('rider.strip.today')} · {s?.deliveries_today ?? 0} {t('rider.strip.drops')}</span></div>
    <div><b>{s ? inr(Number(s.pending_earnings) + Number(s.pending_tips)) : '…'}</b><span><Wallet size={10} /> {t('rider.strip.paid')}</span></div>
    <div><b>{s?.rating ?? '—'}</b><span><Star size={10} /> {s?.rated ?? 0} {t('rider.strip.ratings')}</span></div>
    <div><b className={cash > 0 ? 'neg' : ''}>{inr(cash)}</b><span>{t('rider.strip.cash')}</span></div>
  </div>
  );
};

export const RiderWarnings = ({ profile }) => {
  const w = docWarnings(profile, 'captain');
  if (!w.length) return null;
  return <div className="pp-warn"><b><ShieldAlert size={15} /> Documents need attention</b>{w.map((x) => <span key={x}>{x}</span>)}</div>;
};

// Past jobs with a quick week summary. `orders` are already-mapped orders from CaptainApp.
export const RiderHistory = ({ orders }) => {
  const [range, setRange] = useState(30);
  const rows = useMemo(() => orders.filter((o) => o.status !== 'active' && new Date(o.updatedAtIso) > Date.now() - range * 86400000), [orders, range]);
  const delivered = rows.filter((o) => o.dbStatus === 'delivered');
  const chart = useMemo(() => {
    const ist = new Date(Date.now() + 5.5 * 3600e3);
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(ist.getTime() - i * 86400000).toISOString().slice(0, 10); days.push({ d, label: new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' }), value: 0 }); }
    orders.filter((o) => o.dbStatus === 'delivered').forEach((o) => { const d = new Date(new Date(o.updatedAtIso).getTime() + 5.5 * 3600e3).toISOString().slice(0, 10); const s = days.find((x) => x.d === d); if (s) s.value++; });
    return days;
  }, [orders]);
  const rated = delivered.filter((o) => o.captainRating);
  return (
    <div>
      <div className="rd-card"><h4>Deliveries this week</h4><BarChart data={chart} height={150} valueLabel="Deliveries" /></div>
      <div className="rd-card">
        <div className="seg" style={{ width: '100%', marginBottom: '.7rem' }}>{[[7, '7 days'], [30, '30 days'], [90, '90 days']].map(([d, l]) => <button key={d} style={{ flex: 1 }} className={range === d ? 'on' : ''} onClick={() => setRange(d)}>{l}</button>)}</div>
        <div className="mini-kpis three">
          <div><b>{delivered.length}</b><span>Delivered</span></div>
          <div><b>{rows.length - delivered.length}</b><span>Cancelled / other</span></div>
          <div><b>{rated.length ? `★ ${(rated.reduce((a, o) => a + o.captainRating, 0) / rated.length).toFixed(1)}` : '—'}</b><span>Avg rating</span></div>
        </div>
      </div>
      {rows.length === 0 ? <div className="ops-card ops-empty" style={{ margin: '0 1.25rem' }}>Finished jobs will show up here.</div> : rows.slice(0, 60).map((o) => (
        <div key={o.dbId} className="rd-card" style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', alignItems: 'center' }}>
          <div><b>#{o.orderId}</b><br /><small className="ops-muted">{STATUS_LABEL[o.dbStatus]} · {dt(o.updatedAtIso)}</small></div>
          <div style={{ textAlign: 'right' }}>{o.captainRating ? <b>★ {o.captainRating}</b> : <small className="ops-muted">not rated</small>}</div>
        </div>
      ))}
    </div>
  );
};

// ---- "Next stop" strip on a job card: distance, ETA, optional route map, and an arrival prompt -------------------
const RouteMap = ({ fix, dest, points }) => {
  const el = useRef(null); const map = useRef(null); const me = useRef(null); const line = useRef(null);
  useEffect(() => {
    const m = createMap(el.current, dest, 15, { scrollWheelZoom: false });
    L.marker([dest.lat, dest.lng], { icon: homeIcon() }).addTo(m);
    map.current = m;
    return () => { m.remove(); me.current = null; line.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest.lat, dest.lng]);
  useEffect(() => {
    const m = map.current; if (!m || !fix) return;
    if (!me.current) me.current = L.marker([fix.lat, fix.lng], { icon: riderIcon(), zIndexOffset: 900 }).addTo(m); else me.current.setLatLng([fix.lat, fix.lng]);
    if (line.current) line.current.remove();
    if (points?.length) line.current = L.polyline(remainingRoute(points, fix), { color: '#fa5929', weight: 5, opacity: 0.85 }).addTo(m);
    m.fitBounds([[fix.lat, fix.lng], [dest.lat, dest.lng]], { padding: [30, 30], maxZoom: 17 });
  }, [fix?.lat, fix?.lng, points, dest.lat, dest.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={el} className="rd-map" />;
};

export const RiderNav = ({ o, nav, fix, sharing, onStart }) => {
  const { t } = useT();
  const [map, setMap] = useState(false);
  const leg = o.dbStatus === 'out_for_delivery' ? 'delivery' : 'pickup';
  if (!sharing) {
    return (
      <div className="rd-nav off">
        <MapPinned size={16} />
        <span>{t('rider.nav.off')}</span>
        <button className="ops-btn ops-btn-primary" onClick={onStart}>{t('rider.goOnline')}</button>
      </div>
    );
  }
  const straight = fix && o.customerLocation ? haversineKm(fix, o.customerLocation) : null;
  const km = nav?.km ?? (straight != null ? straight * 1.35 : null);
  const arrived = straight != null && straight < 0.06;
  return (
    <div className={`rd-nav ${arrived ? 'arrived' : ''}`}>
      {arrived ? (
        <div className="rd-arrived"><CheckCircle2 size={18} /><div><b>{t('rider.nav.arrived')}</b><span>{leg === 'pickup' ? t('rider.nav.arrivedPickup') : t('rider.nav.arrivedDrop')}</span></div></div>
      ) : (
        <div className="rd-nav-row">
          <div className="rd-nav-eta"><b>{nav ? fmtMin(nav.minutes) : '…'}</b><span>{leg === 'pickup' ? t('rider.nav.toPickup') : t('rider.nav.toDrop')}</span></div>
          <div className="rd-nav-km"><b>{km != null ? kmText(km) : '—'}</b><span>{nav?.routed ? t('rider.nav.road') : t('rider.nav.approx')}</span></div>
          {nav && <div className="rd-nav-km"><b>{arrivalClock(nav.minutes)}</b><span>{t('rider.nav.arriveBy')}</span></div>}
          <button className="ops-btn" onClick={() => setMap((v) => !v)}>{map ? t('rider.nav.hide') : t('rider.nav.route')}</button>
        </div>
      )}
      {map && fix && o.customerLocation && <RouteMap fix={fix} dest={o.customerLocation} points={nav?.points} />}
    </div>
  );
};
