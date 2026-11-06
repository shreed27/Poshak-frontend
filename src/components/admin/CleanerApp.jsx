import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, PackageCheck, Sparkles, AlertTriangle, RefreshCw, LayoutDashboard, ClipboardList, History as HistoryIcon, Wallet, UserRound, Search, Download, Inbox, Shirt, Truck, Clock, IndianRupee, Scale, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { serviceInfo } from '../../lib/pricing';
import { useCatalog } from '../../context/CatalogContext';
import { STATUS_LABEL } from '../../lib/orderStatus';
import { downloadCsv, inr, dt, dOnly } from '../../lib/csv';
import { OpsGate } from './OpsGate';
import { PhotoCapture } from './PhotoCapture';
import { NotificationBell } from '../NotificationBell';
import { BarChart, AreaChart } from './charts';
import { PartnerProfile, StatusBanner, docWarnings, useMyProfile } from './PartnerProfile';
import './ops2.css';

const beep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [740, 988].forEach((f, i) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.value = f; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.14, ctx.currentTime + i * 0.16); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.16 + 0.15); o.start(ctx.currentTime + i * 0.16); o.stop(ctx.currentTime + i * 0.16 + 0.16); });
  } catch { /* audio blocked until first interaction */ }
};

const rel = (iso) => {
  if (!iso) return '';
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
};

const NAV = [['overview', 'Overview', LayoutDashboard], ['orders', 'Orders', ClipboardList], ['history', 'History', HistoryIcon], ['earnings', 'Earnings', Wallet], ['profile', 'My profile', UserRound]];

/* ------------------------------------------------------------------ one order card */
const Job = ({ j, run, hours }) => {
  const { services } = useCatalog();
  const [pieces, setPieces] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const n = Number(pieces) || 0;
  const mismatch = Boolean(j.pieces_picked_up && n && n !== j.pieces_picked_up);
  const items = j.actual_items || j.items || [];
  const base = j.received_at || j.picked_up_at;
  const due = base && hours ? new Date(new Date(base).getTime() + hours * 3600e3) : null;
  const left = due ? (due - Date.now()) / 3600e3 : null;
  const late = left != null && left < 0 && j.status !== 'picked_up';
  const soon = left != null && left >= 0 && left < 6 && j.status === 'cleaning';

  const act = async (fn) => { setBusy(true); await run(fn); setBusy(false); };

  return (
    <div className="ops-card">
      <div className="ops-order-top">
        <h3>#{j.order_code}</h3>
        <span className="lw-row">
          {j.status === 'picked_up' && (j.assigned_to_me ? <span className="lw-tag mine">Assigned to you</span> : <span className="lw-tag pool">Open — first to receive</span>)}
          {late && <span className="lw-tag late"><Clock size={11} /> {Math.abs(Math.round(left))} h late</span>}
          {soon && <span className="lw-tag soon"><Clock size={11} /> due in {Math.max(1, Math.round(left))} h</span>}
        </span>
      </div>
      <p className="ops-line"><b>{j.service_name}</b></p>
      {items.length > 0 && <div className="lw-items">{items.map((it, i) => { const s = serviceInfo(it.service_id, services); return <span key={i}>{s?.name || it.service_id} · {it.qty}{s?.unit || ''}</span>; })}</div>}
      {j.special_instructions && <p className="ops-line">Customer note: {j.special_instructions}</p>}
      <p className="ops-line"><Scale size={14} /> Rider counted <b>{j.pieces_picked_up ?? '—'}</b> pieces{j.pieces_received != null ? ` · you received ${j.pieces_received}` : ''}</p>
      {j.status === 'picked_up' && j.picked_up_at && <p className="ops-muted" style={{ margin: '.2rem 0 0' }}>Picked up {rel(j.picked_up_at)}</p>}
      {due && j.status !== 'picked_up' && <p className="ops-muted" style={{ margin: '.2rem 0 0' }}>Promised by {dt(due.toISOString())}</p>}

      {(j.status === 'picked_up' || j.status === 'cleaning') && (
        <div className="cap-panel">
          <div className="cap-weigh">
            <div><b>{j.status === 'picked_up' ? 'Pieces you received' : 'Pieces ready (after cleaning)'}</b><span>Count every garment</span></div>
            <input inputMode="numeric" value={pieces} onChange={(e) => setPieces(e.target.value.replace(/\D/g, ''))} />
          </div>
          {mismatch && <div className="ops-error" style={{ margin: '0 0 0.5rem' }}><AlertTriangle size={13} /> Count differs from pickup ({j.pieces_picked_up}). Admin will be alerted.</div>}
          <input className="ops-inline" placeholder="Notes (damage, stains, missing items)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {j.status === 'picked_up' && <div style={{ marginTop: '0.6rem' }}><PhotoCapture orderId={j.id} label="received" value={photos} onChange={setPhotos} /></div>}
          <button className="ops-btn ops-btn-primary ops-wide" disabled={!n || busy}
            onClick={() => act(() => j.status === 'picked_up'
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

/* ------------------------------------------------------------------ the app */
const Cleaner = () => {
  const { session, logout } = useAuth();
  const { settings } = useCatalog();
  const [view, setView] = useState('overview');
  const [jobs, setJobs] = useState([]);
  const [sum, setSum] = useState(null);
  const [profile, reloadProfile] = useMyProfile();
  const [hist, setHist] = useState([]);
  const [histDays, setHistDays] = useState(30);
  const [earn, setEarn] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [q, setQ] = useState('');
  const seen = useRef(null);

  const loadQueue = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('cleaner_queue');
    if (err) { setError(err.message); return; }
    setError('');
    const list = data || [];
    const incoming = new Set(list.filter((j) => j.status === 'picked_up').map((j) => j.id));
    if (seen.current) {
      const fresh = [...incoming].filter((id) => !seen.current.has(id));
      if (fresh.length) { beep(); setFlash(`${fresh.length} new order${fresh.length > 1 ? 's' : ''} to receive`); setTimeout(() => setFlash(''), 6000); }
    }
    seen.current = incoming;
    setJobs(list);
  }, []);
  const loadSummary = useCallback(async () => {
    const [{ data: s }, { data: h }, { data: e }, { data: p }] = await Promise.all([
      supabase.rpc('cleaner_summary'),
      supabase.rpc('cleaner_history', { p_days: Math.max(histDays, 14) }),
      supabase.from('cleaner_earnings').select('*, orders(order_code)').order('created_at', { ascending: false }).limit(60),
      supabase.from('cleaner_payouts').select('*').order('created_at', { ascending: false }).limit(20)
    ]);
    setSum(s); setHist(h || []); setEarn(e || []); setPayouts(p || []);
  }, [histDays]);

  useEffect(() => { loadQueue(); const id = setInterval(loadQueue, 15000); return () => clearInterval(id); }, [loadQueue]);
  useEffect(() => { loadSummary(); const id = setInterval(loadSummary, 45000); return () => clearInterval(id); }, [loadSummary]);
  const refresh = () => { loadQueue(); loadSummary(); reloadProfile(); };
  const run = async (fn) => { const { error: err } = await fn(); if (err) setError(err.message); else { setError(''); await loadQueue(); loadSummary(); } };

  const hours = Number(profile?.turnaround_hours) || Number(settings.sla_hours) || 48;
  const incoming = jobs.filter((j) => j.status === 'picked_up');
  const working = jobs.filter((j) => j.status === 'cleaning');
  const ready = jobs.filter((j) => j.status === 'ready');
  const upcoming = jobs.filter((j) => ['placed', 'captain_assigned'].includes(j.status));
  const match = (j) => !q.trim() || `${j.order_code} ${j.service_name}`.toLowerCase().includes(q.trim().toLowerCase());
  const overdue = [...working, ...ready].filter((j) => { const b = j.received_at || j.picked_up_at; return b && new Date(b).getTime() + hours * 3600e3 < Date.now(); });
  const waiting = incoming.filter((j) => j.picked_up_at && Date.now() - new Date(j.picked_up_at) > 2 * 3600e3);
  const warns = docWarnings(profile, 'cleaner');
  const active = jobs.filter((j) => ['picked_up', 'cleaning', 'ready'].includes(j.status) && j.assigned_to_me).length;

  const series = useMemo(() => {
    const ist = new Date(Date.now() + 5.5 * 3600e3);
    const days = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(ist.getTime() - i * 86400000).toISOString().slice(0, 10); days.push({ d, label: new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), orders: 0, kg: 0, amount: 0 }); }
    hist.forEach((h) => {
      if (!h.amount && h.amount !== 0) return;
      const d = new Date(new Date(h.created_at).getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
      const s = days.find((x) => x.d === d); if (s) { s.orders++; s.kg += Number(h.kg || 0); s.amount += Number(h.amount || 0); }
    });
    return days;
  }, [hist]);

  const histRows = hist.filter((h) => new Date(h.created_at) > Date.now() - histDays * 86400000);
  const exportHist = () => downloadCsv('laundry-history', histRows, [['Order', (h) => h.order_code], ['Service', (h) => h.service_name], ['Received', (h) => h.received_at || ''], ['Ready', (h) => h.ready_at || ''], ['Kg', (h) => h.kg ?? ''], ['Pieces', (h) => h.pieces ?? ''], ['Earned (INR)', (h) => h.amount ?? ''], ['Paid', (h) => (h.paid_out ? 'yes' : 'no')]]);

  const capKg = Number(profile?.capacity_kg_per_day) || 0;
  const maxJobs = Number(profile?.max_active_jobs) || 0;
  const meter = (v, max) => Math.min(100, max ? (v / max) * 100 : 0);
  const tone = (pct) => (pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#16a34a');

  return (
    <div className="ops-root">
      <header className="ops-top">
        <div className="ops-brand">Poshak <span>Laundry</span></div>
        <div className="ops-top-right">
          <NotificationBell userId={session.user.id} />
          <span className="ops-user">{profile?.business_name || session.user.email}</span>
          <button className="ops-icon" onClick={refresh} title="Refresh"><RefreshCw size={16} /></button>
          <button className="ops-icon" onClick={() => { logout(); window.location.hash = '#/laundry'; }} title="Sign out"><LogOut size={16} /></button>
        </div>
      </header>

      <div className="ops-shell">
        <nav className="ops-nav">
          {NAV.map(([k, l, Icon]) => <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}><Icon size={17} /><span>{l}</span>{k === 'orders' && incoming.length > 0 ? <span className="ops-dot">{incoming.length}</span> : null}</button>)}
        </nav>
        <main className="ops-main">
          {flash && <div className="ops-flash"><Inbox size={16} /> {flash}</div>}
          <StatusBanner profile={profile} />
          {warns.length > 0 && <div className="pp-warn"><b><ShieldAlert size={15} /> Documents need attention</b>{warns.map((w) => <span key={w}>{w}</span>)}</div>}
          {error && <div className="ops-error">{error}</div>}

          {view === 'overview' && sum && (
            <div className="an">
              <div className="an-head"><div><h2>{profile?.business_name ? `Hello, ${profile.business_name}` : 'Today at a glance'}</h2><p className="ops-muted">Live from your queue · refreshes every 15 seconds</p></div></div>
              <div className="kpi-grid">
                <div className={`kpi ${incoming.length ? 'tone-brand' : ''}`}><div className="kpi-top"><span className="kpi-ic"><Inbox size={16} /></span><span className="kpi-l">To receive</span></div><div className="kpi-v">{incoming.length}</div><div className="kpi-foot"><small>{waiting.length ? `${waiting.length} waiting over 2 h` : 'picked up, on the way / at the door'}</small></div></div>
                <div className="kpi"><div className="kpi-top"><span className="kpi-ic"><Shirt size={16} /></span><span className="kpi-l">Being cleaned</span></div><div className="kpi-v">{working.length}</div><div className="kpi-foot"><small>{overdue.length ? `${overdue.length} past the promised time` : 'all on time'}</small></div></div>
                <div className="kpi tone-good"><div className="kpi-top"><span className="kpi-ic"><Truck size={16} /></span><span className="kpi-l">Ready for rider</span></div><div className="kpi-v">{ready.length}</div><div className="kpi-foot"><small>waiting to be collected</small></div></div>
                <div className="kpi"><div className="kpi-top"><span className="kpi-ic"><Scale size={16} /></span><span className="kpi-l">Washed today</span></div><div className="kpi-v">{Number(sum.kg_today).toFixed(1)} kg</div><div className="kpi-foot"><small>{sum.done_today} orders finished</small></div></div>
                <div className="kpi tone-brand"><div className="kpi-top"><span className="kpi-ic"><IndianRupee size={16} /></span><span className="kpi-l">Earned today</span></div><div className="kpi-v">{inr(sum.earn_today)}</div><div className="kpi-foot"><small>{inr(sum.earn_week)} this week</small></div></div>
                <div className="kpi"><div className="kpi-top"><span className="kpi-ic"><Wallet size={16} /></span><span className="kpi-l">To be paid</span></div><div className="kpi-v">{inr(sum.pending_payout)}</div><div className="kpi-foot"><small>{profile?.payout_cycle ? `${profile.payout_cycle} payouts` : 'settled by admin'}</small></div></div>
                <div className="kpi"><div className="kpi-top"><span className="kpi-ic"><Clock size={16} /></span><span className="kpi-l">Avg turnaround</span></div><div className="kpi-v">{sum.avg_turnaround_hours != null ? `${sum.avg_turnaround_hours} h` : '—'}</div><div className="kpi-foot"><small>promised {hours} h · last 30 days</small></div></div>
                <div className={`kpi ${sum.mismatches_30d > 0 ? 'tone-bad' : ''}`}><div className="kpi-top"><span className="kpi-ic"><AlertTriangle size={16} /></span><span className="kpi-l">Count mismatches</span></div><div className="kpi-v">{sum.mismatches_30d}</div><div className="kpi-foot"><small>last 30 days</small></div></div>
              </div>

              <div className="an-grid">
                <section className="panel span2"><header><h3>Orders finished</h3><span className="ops-muted">last 14 days</span></header><BarChart data={series.map((s) => ({ label: s.label, value: s.orders }))} height={200} /></section>
                <section className="panel">
                  <header><h3>Workload</h3><span className="ops-muted">right now</span></header>
                  <div className="lw-meter"><div><span>Active orders</span><b>{active}{maxJobs ? ` / ${maxJobs}` : ''}</b></div><div className="meter"><i style={{ width: `${meter(active, maxJobs)}%`, background: tone(meter(active, maxJobs)) }} /></div>{!maxJobs && <small className="ops-muted">No order limit set by admin</small>}</div>
                  <div className="lw-meter"><div><span>Kilos today</span><b>{Number(sum.kg_today).toFixed(1)}{capKg ? ` / ${capKg} kg` : ' kg'}</b></div><div className="meter"><i style={{ width: `${meter(sum.kg_today, capKg)}%`, background: tone(meter(sum.kg_today, capKg)) }} /></div>{!capKg && <small className="ops-muted">No daily capacity set by admin</small>}</div>
                  <div className="lw-meter"><div><span>Finished this week</span><b>{sum.done_week} orders · {Number(sum.kg_week).toFixed(0)} kg</b></div></div>
                </section>
              </div>

              {(overdue.length > 0 || waiting.length > 0) && (
                <section className="panel"><header><h3>Needs attention</h3></header>
                  <div className="pt-facts">
                    {waiting.map((j) => <div key={j.id}><span>#{j.order_code}</span><small>waiting to be received since {rel(j.picked_up_at)}</small></div>)}
                    {overdue.map((j) => <div key={j.id}><span>#{j.order_code}</span><small style={{ color: '#b91c1c' }}>past the promised {hours} h — {STATUS_LABEL[j.status].toLowerCase()}</small></div>)}
                  </div>
                </section>
              )}
              {upcoming.length > 0 && (
                <section className="panel" style={{ marginTop: '.9rem' }}><header><h3>Coming your way</h3><span className="ops-muted">assigned, not picked up yet</span></header>
                  <div className="pt-facts">{upcoming.map((j) => <div key={j.id}><span>#{j.order_code} · {j.service_name}</span><small>{j.pickup_date ? `${dOnly(j.pickup_date)} · ` : ''}{j.pickup_slot || ''}</small></div>)}</div>
                </section>
              )}
            </div>
          )}
          {view === 'overview' && !sum && <div className="sk-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="sk" />)}</div>}

          {view === 'orders' && (
            <div className="an">
              <div className="an-head"><div><h2>Orders</h2><p className="ops-muted">Receive, clean, mark ready. Orders marked “open” can be claimed by any laundromat — first to receive gets it.</p></div>
                <div className="an-tools"><div className="search"><Search size={14} /><input placeholder="Search order or service" value={q} onChange={(e) => setQ(e.target.value)} /></div></div></div>
              <div className="lw-cols">
                <div className="lw-col"><h3>To receive <span>{incoming.filter(match).length}</span></h3>
                  {incoming.filter(match).length === 0 ? <div className="lw-empty">Nothing waiting. New pickups appear here.</div> : incoming.filter(match).map((j) => <Job key={j.id} j={j} run={run} hours={hours} />)}</div>
                <div className="lw-col"><h3>Being cleaned <span>{working.filter(match).length}</span></h3>
                  {working.filter(match).length === 0 ? <div className="lw-empty">No orders in the wash.</div> : working.filter(match).map((j) => <Job key={j.id} j={j} run={run} hours={hours} />)}</div>
                <div className="lw-col"><h3>Ready for rider <span>{ready.filter(match).length}</span></h3>
                  {ready.filter(match).length === 0 ? <div className="lw-empty">Finished orders wait here for the delivery partner.</div> : ready.filter(match).map((j) => <Job key={j.id} j={j} run={run} hours={hours} />)}</div>
              </div>
            </div>
          )}

          {view === 'history' && (
            <div className="an">
              <div className="an-head"><div><h2>History</h2><p className="ops-muted">Every order you have finished, with what it earned.</p></div>
                <div className="an-tools"><div className="seg">{[[7, '7 days'], [30, '30 days'], [90, '90 days']].map(([d, l]) => <button key={d} className={histDays === d ? 'on' : ''} onClick={() => setHistDays(d)}>{l}</button>)}</div><button className="ops-btn" onClick={exportHist}><Download size={14} /> Export CSV</button></div></div>
              <section className="panel flush">
                {histRows.length === 0 ? <div className="ch-empty">No finished orders in this period.</div> : (
                  <div className="tbl-wrap tall"><table className="tbl"><thead><tr><th>Order</th><th>Received</th><th>Ready</th><th className="r">Kg</th><th className="r">Pieces</th><th className="r">Earned</th><th /></tr></thead><tbody>
                    {histRows.map((h) => (
                      <tr key={h.order_code}><td><b>#{h.order_code}</b><br /><small>{h.service_name}</small></td><td><small>{dt(h.received_at)}</small></td><td><small>{dt(h.ready_at)}</small></td>
                        <td className="r">{h.kg ?? '—'}</td><td className="r">{h.pieces ?? '—'}</td><td className="r"><b>{h.amount != null ? inr(h.amount) : '—'}</b></td><td>{h.amount != null && (h.paid_out ? <span className="pill good">paid</span> : <span className="pill warn">unpaid</span>)}</td></tr>
                    ))}
                  </tbody></table></div>
                )}
              </section>
            </div>
          )}

          {view === 'earnings' && sum && (
            <div className="an">
              <div className="an-head"><div><h2>Earnings</h2><p className="ops-muted">Credited when you mark an order ready. The admin pays you on your payout cycle.</p></div></div>
              <div className="kpi-grid">
                <div className="kpi tone-brand"><div className="kpi-top"><span className="kpi-ic"><Wallet size={16} /></span><span className="kpi-l">To be paid</span></div><div className="kpi-v">{inr(sum.pending_payout)}</div><div className="kpi-foot"><small>unpaid earnings</small></div></div>
                <div className="kpi"><div className="kpi-top"><span className="kpi-ic"><IndianRupee size={16} /></span><span className="kpi-l">Today</span></div><div className="kpi-v">{inr(sum.earn_today)}</div><div className="kpi-foot"><small>{sum.done_today} orders</small></div></div>
                <div className="kpi"><div className="kpi-top"><span className="kpi-ic"><IndianRupee size={16} /></span><span className="kpi-l">Last 7 days</span></div><div className="kpi-v">{inr(sum.earn_week)}</div><div className="kpi-foot"><small>{sum.done_week} orders</small></div></div>
                <div className="kpi"><div className="kpi-top"><span className="kpi-ic"><IndianRupee size={16} /></span><span className="kpi-l">This month</span></div><div className="kpi-v">{inr(sum.earn_month)}</div><div className="kpi-foot"><small>{sum.done_month} orders</small></div></div>
              </div>
              <div className="an-grid">
                <section className="panel span2"><header><h3>Daily earnings</h3><span className="ops-muted">last 14 days</span></header><AreaChart data={series.map((s) => ({ label: s.label, value: s.amount, extra: `${s.orders} orders · ${s.kg.toFixed(1)} kg` }))} height={220} /></section>
                <section className="panel"><header><h3>Your rates</h3></header>
                  <div className="pt-facts"><div><span>Per kg</span><small>₹{profile?.payout_per_kg ?? 0}</small></div><div><span>Per order</span><small>₹{profile?.payout_per_order ?? 0}</small></div><div><span>Per piece</span><small>₹{profile?.payout_per_piece ?? 0}</small></div></div>
                  <p className="st-note">Set by the admin. Ask them if something looks wrong.</p>
                </section>
              </div>
              <div className="an-grid">
                <section className="panel span2 flush"><header style={{ padding: '1rem 1.15rem 0' }}><h3>Recent earnings</h3></header>
                  {earn.length === 0 ? <div className="ch-empty">Finished orders appear here.</div> : <div className="tbl-wrap tall"><table className="tbl compact"><tbody>{earn.map((e) => (
                    <tr key={e.id}><td>#{e.orders?.order_code}<br /><small>{dt(e.created_at)} · {e.kg} kg · {e.pieces} pcs</small></td><td className="r pos">+{inr(e.amount)}</td><td className="r">{e.paid_out ? <span className="pill good">paid</span> : <span className="pill warn">unpaid</span>}</td></tr>
                  ))}</tbody></table></div>}
                </section>
                <section className="panel"><header><h3>Payments received</h3></header>
                  {payouts.length === 0 ? <p className="ops-muted">None yet.</p> : <div className="pt-facts">{payouts.map((p) => <div key={p.id}><span>{dOnly(p.created_at)}<br /><small>{p.orders} orders</small></span><b>{inr(p.amount)}</b></div>)}</div>}
                </section>
              </div>
            </div>
          )}

          {view === 'profile' && <PartnerProfile role="cleaner" profile={profile} reload={reloadProfile} />}
        </main>
      </div>
    </div>
  );
};

export const CleanerApp = () => (
  <OpsGate title="Poshak Laundry" roles={['cleaner']} kind="laundry">
    <Cleaner />
  </OpsGate>
);
