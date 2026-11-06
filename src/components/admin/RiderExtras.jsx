import React, { useMemo, useState } from 'react';
import { Star, Wallet, Bike, IndianRupee, ShieldAlert } from 'lucide-react';
import { inr, dt } from '../../lib/csv';
import { STATUS_LABEL } from '../../lib/orderStatus';
import { docWarnings } from './PartnerProfile';
import { BarChart } from './charts';

// Four numbers a rider checks all day.
export const RiderStrip = ({ s, cash }) => (
  <div className="rd-strip">
    <div><b><IndianRupee size={13} style={{ verticalAlign: '-1px' }} />{s ? Number(s.today).toLocaleString('en-IN') : '…'}</b><span><Bike size={10} /> Today · {s?.deliveries_today ?? 0} drops</span></div>
    <div><b>{s ? inr(Number(s.pending_earnings) + Number(s.pending_tips)) : '…'}</b><span><Wallet size={10} /> To be paid</span></div>
    <div><b>{s?.rating ?? '—'}</b><span><Star size={10} /> {s?.rated ?? 0} ratings</span></div>
    <div><b className={cash > 0 ? 'neg' : ''}>{inr(cash)}</b><span>Cash in hand</span></div>
  </div>
);

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
