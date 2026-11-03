import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IndianRupee, ShoppingBag, Receipt, CheckCircle2, XCircle, Users, UserPlus, Repeat, Clock, AlertTriangle, Percent, LifeBuoy, ArrowUpRight, ArrowDownRight, Download, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { downloadCsv, inr } from '../../lib/csv';
import { AreaChart, BarChart, Donut, HBars, Spark } from './charts';

const RANGES = [[7, '7 days'], [30, '30 days'], [90, '90 days'], [365, '1 year']];
const PALETTE = ['#fa5929', '#111827', '#2563eb', '#16a34a', '#a855f7', '#f59e0b'];
const METHOD = { online: 'Online (Razorpay)', upi_qr: 'UPI QR', cash: 'Cash', wallet: 'Wallet' };
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const dayLabel = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// Every day in the window, including quiet days the SQL leaves out.
const fillDays = (daily, days) => {
  const map = new Map((daily || []).map((d) => [d.day, d]));
  const out = [];
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(ist.getTime() - i * 86400000).toISOString().slice(0, 10);
    const r = map.get(d);
    out.push({ day: d, label: dayLabel(d), orders: Number(r?.orders || 0), delivered: Number(r?.delivered || 0), revenue: Number(r?.revenue || 0) });
  }
  return out;
};

const Delta = ({ cur, prev, invert }) => {
  if (prev == null) return null;
  if (!prev && !cur) return <span className="dl flat">—</span>;
  if (!prev) return <span className="dl up"><ArrowUpRight size={12} />new</span>;
  const pct = ((cur - prev) / prev) * 100;
  if (Math.abs(pct) < 0.5) return <span className="dl flat">flat</span>;
  const good = invert ? pct < 0 : pct > 0;
  return <span className={`dl ${good ? 'up' : 'down'}`}>{pct > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(pct).toFixed(0)}%</span>;
};

const Kpi = ({ icon: Icon, label, value, sub, tone = 'ink', delta, spark }) => (
  <div className={`kpi tone-${tone}`}>
    <div className="kpi-top"><span className="kpi-ic"><Icon size={16} /></span><span className="kpi-l">{label}</span>{delta}</div>
    <div className="kpi-v">{value}</div>
    <div className="kpi-foot"><small>{sub}</small>{spark}</div>
  </div>
);

export const AdminAnalytics = () => {
  const [days, setDays] = useState(30);
  const [cur, setCur] = useState(null);
  const [prev, setPrev] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const from = new Date(Date.now() - days * 86400000).toISOString();
    const [a, b, o] = await Promise.all([
      supabase.rpc('admin_analytics', { p_days: days }),
      days * 2 <= 365 ? supabase.rpc('admin_analytics', { p_days: days * 2 }) : Promise.resolve({ data: null }),
      supabase.from('orders').select('created_at, pickup_slot, status').gte('created_at', from).limit(5000)
    ]);
    if (a.error) setError(a.error.message); else setError('');
    setCur(a.data || null);
    // The 2× window minus this window = the window before it (works for sums; not for distinct counts).
    setPrev(a.data && b.data ? {
      revenue: Number(b.data.revenue) - Number(a.data.revenue),
      orders: Number(b.data.orders) - Number(a.data.orders),
      delivered: Number(b.data.delivered) - Number(a.data.delivered),
      cancelled: Number(b.data.cancelled) - Number(a.data.cancelled),
      discounts: Number(b.data.discounts) - Number(a.data.discounts)
    } : null);
    setOrders(o.data || []);
    setLoading(false);
  }, [days]);
  useEffect(() => { load(); }, [load]);

  const daily = useMemo(() => fillDays(cur?.daily, days), [cur, days]);
  const bucket = days > 90 ? 7 : 1;                                                            // weekly buckets on long ranges keep charts readable
  const series = useMemo(() => {
    if (bucket === 1) return daily;
    const out = [];
    for (let i = 0; i < daily.length; i += bucket) {
      const g = daily.slice(i, i + bucket);
      out.push({ label: g[0].label, orders: g.reduce((a, d) => a + d.orders, 0), delivered: g.reduce((a, d) => a + d.delivered, 0), revenue: g.reduce((a, d) => a + d.revenue, 0) });
    }
    return out;
  }, [daily, bucket]);

  const byDow = useMemo(() => {
    const c = Array(7).fill(0);
    orders.filter((o) => o.status !== 'cancelled').forEach((o) => { c[new Date(new Date(o.created_at).getTime() + 5.5 * 3600 * 1000).getUTCDay()]++; });
    return DOW.map((l, i) => ({ label: l, value: c[i] }));
  }, [orders]);
  const bySlot = useMemo(() => {
    const m = new Map();
    orders.filter((o) => o.status !== 'cancelled' && o.pickup_slot).forEach((o) => m.set(o.pickup_slot, (m.get(o.pickup_slot) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }));
  }, [orders]);
  const bestDow = byDow.reduce((b, d, i) => (d.value > (byDow[b]?.value ?? -1) ? i : b), 0);

  const exportDaily = () => downloadCsv('poshak-daily-report', daily, [
    ['Date', (d) => d.day], ['Orders', (d) => d.orders], ['Delivered', (d) => d.delivered], ['Revenue (INR)', (d) => d.revenue]
  ]);

  if (error) return <div className="ops-error" style={{ margin: '1rem 0' }}>{error}</div>;
  if (!cur) return <div className="sk-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="sk" />)}</div>;

  const sparkRev = daily.slice(-14).map((d) => d.revenue);
  const sparkOrd = daily.slice(-14).map((d) => d.orders);
  const pay = (cur.payment_mix || []).map((m, i) => ({ label: METHOD[m.method] || m.method, value: Number(m.amount), text: inr(m.amount), color: PALETTE[i % PALETTE.length] }));
  const payTotal = pay.reduce((a, p) => a + p.value, 0);
  const mix = [
    { label: 'Delivered', value: cur.delivered, color: '#16a34a' },
    { label: 'In pipeline', value: Math.max(0, cur.orders - cur.delivered - cur.cancelled), color: '#2563eb' },
    { label: 'Cancelled', value: cur.cancelled, color: '#ef4444' }
  ];
  const slaOk = cur.orders ? Math.max(0, 100 - (cur.late / Math.max(1, cur.delivered || cur.orders)) * 100) : 100;

  return (
    <div className="an">
      <div className="an-head">
        <div>
          <h2>Business overview</h2>
          <p className="ops-muted">Last {days} days · all amounts include GST as billed · IST</p>
        </div>
        <div className="an-tools">
          <div className="seg">{RANGES.map(([d, l]) => <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{l}</button>)}</div>
          <button className="ops-btn" onClick={load} disabled={loading}><RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh</button>
          <button className="ops-btn" onClick={exportDaily}><Download size={14} /> Export CSV</button>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi icon={IndianRupee} tone="brand" label="Revenue" value={inr(cur.revenue)} sub={`${cur.delivered} delivered orders`} delta={<Delta cur={cur.revenue} prev={prev?.revenue} />} spark={<Spark values={sparkRev} />} />
        <Kpi icon={ShoppingBag} label="Orders" value={cur.orders} sub={`${cur.cancelled} cancelled`} delta={<Delta cur={cur.orders} prev={prev?.orders} />} spark={<Spark values={sparkOrd} color="#111827" />} />
        <Kpi icon={Receipt} label="Avg order value" value={inr(cur.aov)} sub="delivered orders only" />
        <Kpi icon={Percent} tone="warn" label="Discounts given" value={inr(cur.discounts)} sub="member + coupon" delta={<Delta cur={cur.discounts} prev={prev?.discounts} invert />} />
        <Kpi icon={XCircle} tone={cur.cancel_rate > 15 ? 'bad' : 'ink'} label="Cancellation rate" value={`${cur.cancel_rate}%`} sub={`${cur.cancelled} of ${cur.orders} orders`} />
        <Kpi icon={Users} label="Active customers" value={cur.customers} sub={`${cur.new_customers} new this period`} />
        <Kpi icon={Repeat} tone="good" label="Repeat rate" value={`${cur.repeat_rate}%`} sub={`${cur.repeat_customers} customers ordered 2+ times`} />
        <Kpi icon={Clock} tone={cur.late > 0 ? 'bad' : 'good'} label="Avg turnaround" value={cur.avg_turnaround_hours != null ? `${cur.avg_turnaround_hours} h` : '—'} sub={`SLA ${cur.sla_hours} h · ${cur.late} late`} />
      </div>

      <div className="an-grid">
        <section className="panel span2">
          <header><h3>Revenue</h3><span className="ops-muted">{bucket === 7 ? 'per week' : 'per day'} · delivered orders</span></header>
          <AreaChart data={series.map((d) => ({ label: d.label, value: d.revenue, extra: `${d.delivered} delivered` }))} />
        </section>
        <section className="panel">
          <header><h3>Order outcome</h3><span className="ops-muted">{cur.orders} orders</span></header>
          <Donut items={mix.filter((m) => m.value > 0)} centre={[cur.orders, 'orders']} />
        </section>

        <section className="panel span2">
          <header><h3>Orders placed</h3><span className="ops-muted">{bucket === 7 ? 'per week' : 'per day'}</span></header>
          <BarChart data={series.map((d) => ({ label: d.label, value: d.orders }))} />
        </section>
        <section className="panel">
          <header><h3>Payment mix</h3><span className="ops-muted">money in</span></header>
          {pay.length ? <Donut items={pay} centre={[inr(payTotal), 'collected']} /> : <div className="ch-empty">No payments yet</div>}
        </section>

        <section className="panel">
          <header><h3>Top services</h3><span className="ops-muted">by orders</span></header>
          <HBars items={(cur.top_services || []).map((s) => ({ label: s.name, value: Number(s.orders) }))} />
        </section>
        <section className="panel">
          <header><h3>Busiest days</h3><span className="ops-muted">{byDow[bestDow]?.value ? `${DOW[bestDow]} leads` : 'no data'}</span></header>
          <BarChart data={byDow} height={190} highlight={byDow[bestDow]?.value ? bestDow : null} />
        </section>
        <section className="panel">
          <header><h3>Popular pickup slots</h3><span className="ops-muted">capacity planning</span></header>
          <HBars items={bySlot} color="#111827" />
        </section>

        <section className="panel span2">
          <header><h3>Captain leaderboard</h3><span className="ops-muted">deliveries in period</span></header>
          {(cur.captains || []).length === 0 ? <div className="ch-empty">No captains yet — add them under Team</div> : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Captain</th><th className="r">Deliveries</th><th className="r">Rating</th><th className="r">Failed attempts</th></tr></thead>
                <tbody>
                  {cur.captains.map((c, i) => (
                    <tr key={c.name + i}>
                      <td><span className="rank">{i + 1}</span>{c.name || 'Captain'}</td>
                      <td className="r"><b>{c.deliveries}</b></td>
                      <td className="r">{c.rating ? `★ ${c.rating}` : '—'}</td>
                      <td className="r">{Number(c.failed_attempts) > 0 ? <span className="pill warn">{c.failed_attempts}</span> : '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="panel">
          <header><h3>Service health</h3><span className="ops-muted">support & SLA</span></header>
          <div className="health">
            <div><LifeBuoy size={15} /> Open complaints<b>{cur.tickets?.open ?? 0}</b></div>
            <div className={cur.tickets?.overdue ? 'bad' : ''}><AlertTriangle size={15} /> Overdue complaints<b>{cur.tickets?.overdue ?? 0}</b></div>
            <div><Clock size={15} /> Avg resolution<b>{cur.tickets?.avg_resolve_hours != null ? `${cur.tickets.avg_resolve_hours} h` : '—'}</b></div>
            <div><CheckCircle2 size={15} /> Delivered within SLA<b>{slaOk.toFixed(0)}%</b></div>
            <div className="meter"><i style={{ width: `${slaOk}%`, background: slaOk >= 90 ? '#16a34a' : slaOk >= 70 ? '#f59e0b' : '#ef4444' }} /></div>
          </div>
        </section>
      </div>
    </div>
  );
};
