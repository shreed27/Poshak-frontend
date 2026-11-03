import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, MapPin, Phone, Navigation, RefreshCw, LogOut, UserCheck, ChevronRight, XCircle, LayoutDashboard, ShoppingBag, Users, Wallet, LifeBuoy, Bike, Settings, ScrollText, UserCog, Search, Download, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { withSecrets, subscribeOrders } from '../../lib/ordersApi';
import { STATUS_LABEL, FLOW, nextStatus, ACTIVE_STATUSES } from '../../lib/orderStatus';
import { L, createMap, homeIcon, riderIcon } from '../main-app/mapKit';
import { OpsGate } from './OpsGate';
import { AdminSettings } from './AdminSettings';
import { AdminTickets } from './AdminTickets';
import { AdminCaptains } from './AdminCaptains';
import { NotificationBell } from '../NotificationBell';
import { InvoiceButton } from '../InvoiceButton';
import { useSignedUrls } from '../../lib/photos';
import { downloadCsv } from '../../lib/csv';
import { AdminAnalytics } from './AdminAnalytics';
import { AdminCustomers } from './AdminCustomers';
import { AdminFinance } from './AdminFinance';
import { AdminAudit } from './AdminAudit';
import { RefundDialog } from './RefundDialog';
import './ops2.css';

const SELECT = '*, order_events(status, created_at)';

const beep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1175].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.16);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.17);
    });
  } catch { /* audio blocked until first interaction */ }
};

const ago = (iso) => {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
};

// Pins for every selected/active order + the selected order's route.
const OpsMap = ({ orders, selected, onSelect }) => {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layer = useRef(null);
  const fitted = useRef(false);

  useEffect(() => {
    const first = orders[0]?.customerLocation || { lat: 20.59, lng: 78.96 };
    const map = createMap(elRef.current, first, orders.length ? 12 : 5);
    layer.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layer.current.clearLayers();
    const pts = [];
    orders.forEach((o) => {
      const p = o.customerLocation;
      pts.push([p.lat, p.lng]);
      L.marker([p.lat, p.lng], { icon: homeIcon() })
        .on('click', () => onSelect(o.dbId))
        .bindTooltip(`#${o.orderId} · ${o.statusLabel}`, { direction: 'top', offset: [0, -34] })
        .addTo(layer.current);
      if (o.captainLocation && o.status === 'active') {
        L.marker([o.captainLocation.lat, o.captainLocation.lng], { icon: riderIcon() }).addTo(layer.current);
      }
    });
    if (!fitted.current && pts.length) {
      map.fitBounds(pts, { padding: [40, 40], maxZoom: 14 });
      fitted.current = true;
    }
  }, [orders, selected, onSelect]);

  useEffect(() => {
    if (selected && mapRef.current) mapRef.current.flyTo([selected.customerLocation.lat, selected.customerLocation.lng], 14, { duration: 0.5 });
  }, [selected?.dbId]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={elRef} className="ops-map" />;
};


// Add / remove the people who can sign in as admin ("makers") or delivery partner. No SQL needed.
const Team = ({ myEmail }) => {
  const [staff, setStaff] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('captain');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [{ data: st }, { data: pr }] = await Promise.all([
      supabase.from('staff_emails').select('*').order('added_at', { ascending: false }),
      supabase.from('profiles').select('email, name, role')
    ]);
    setStaff(st || []);
    setProfiles(pr || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, ok) => {
    const { error: err } = await fn();
    if (err) { setError(err.message); setMsg(''); } else { setError(''); setMsg(ok); load(); }
  };
  const add = (e) => {
    e.preventDefault();
    run(() => supabase.rpc('admin_add_staff', { p_email: email, p_role: role, p_name: name, p_phone: phone, p_vehicle: vehicle }), `${name || email} added as ${role === 'admin' ? 'admin' : role === 'cleaner' ? 'laundry partner' : 'delivery partner'}`)
      .then(() => { setEmail(''); setName(''); setPhone(''); setVehicle(''); });
  };
  const signedIn = (em) => profiles.some((p) => p.email?.toLowerCase() === em.toLowerCase());
  const link = `${window.location.origin}/#/staff`;

  return (
    <div className="ops-team">
      <div className="ops-card">
        <h3>Team sign-in link</h3>
        <p className="ops-muted">Send this to everyone on the team. They sign in with their Google account and land on the right screen automatically.</p>
        <div className="ops-linkbox">
          <code>{link}</code>
          <button className="ops-btn" onClick={() => { navigator.clipboard?.writeText(link); setMsg('Link copied'); }}>Copy</button>
        </div>
      </div>

      <div className="ops-card">
        <h3>Add a team member</h3>
        <form className="ops-addform" onSubmit={add}>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="captain">Delivery partner (captain app)</option>
            <option value="cleaner">Laundry partner (cleaning app)</option>
            <option value="admin">Maker / admin (full dashboard)</option>
          </select>
          <input type="email" required placeholder="Their Google email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input required={role !== 'admin'} placeholder="Full name (customers see this)" value={name} onChange={(e) => setName(e.target.value)} />
          <input required={role !== 'admin'} inputMode="numeric" placeholder="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {role === 'captain' && <input placeholder="Vehicle (optional) e.g. Splendor KA01AB1234" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />}
          <button className="ops-btn ops-btn-primary">Add</button>
        </form>
        {msg && <p className="ops-ok">{msg}</p>}
        {error && <div className="ops-error" style={{ margin: '0.5rem 0 0' }}>{error}</div>}
      </div>

      <div className="ops-card">
        <h3>Who has access ({staff.length})</h3>
        {staff.length === 0 && <p className="ops-muted">Nobody yet.</p>}
        {staff.map((m) => (
          <div key={m.email} className="ops-staffrow">
            <div>
              <b>{m.name || m.email}</b>
              <span>{m.email} · {m.phone || 'no phone'}{m.vehicle ? ` · ${m.vehicle}` : ''}</span>
              <span>{m.role === 'admin' ? 'Maker / admin' : m.role === 'cleaner' ? 'Laundry partner' : 'Delivery partner'} · {signedIn(m.email) ? 'has signed in' : 'not signed in yet'}</span>
            </div>
            {m.email.toLowerCase() === (myEmail || '').toLowerCase()
              ? <em>you</em>
              : <button className="ops-btn ops-btn-danger" onClick={() => window.confirm(`Remove ${m.email}?`) && run(() => supabase.rpc('admin_remove_staff', { p_email: m.email }), `${m.email} removed`)}>Remove</button>}
          </div>
        ))}
      </div>
    </div>
  );
};

const STAGE_LABEL = { pickup: 'Picked up', cleaner_in: 'Received at laundry', cleaner_out: 'Cleaned', delivery: 'Delivered' };
const OrderChecks = ({ order }) => {
  const stages = Object.values(order.checks || {});
  const paths = stages.flatMap((c) => c.photos || []);
  const urls = useSignedUrls(paths);
  if (stages.length === 0) return null;
  return (
    <div className="ops-checks">
      {stages.map((c) => (
        <div key={c.stage} className="ops-check-row">
          <b>{STAGE_LABEL[c.stage]}</b> · {c.piece_count ?? '–'} pieces{c.notes ? ` · ${c.notes}` : ''}
          {c.checklist?.length > 0 && <span> · {c.checklist.map((x) => `${x.count} ${x.type}`).join(', ')}</span>}
          <div className="ops-photos">{(c.photos || []).map((p) => urls[p] && <a key={p} href={urls[p]} target="_blank" rel="noreferrer"><img src={urls[p]} alt="" /></a>)}</div>
        </div>
      ))}
    </div>
  );
};

const NAV = [
  ['overview', 'Overview', LayoutDashboard], ['orders', 'Orders', ShoppingBag], ['customers', 'Customers', Users], ['finance', 'Finance', Wallet],
  ['tickets', 'Complaints', LifeBuoy], ['captains', 'Captains', Bike], ['settings', 'Prices & settings', Settings], ['audit', 'Audit log', ScrollText], ['team', 'Team', UserCog]
];

const Dashboard = () => {
  const { session, logout } = useAuth();
  const [rows, setRows] = useState([]);
  const [captains, setCaptains] = useState([]);
  const [cashRows, setCashRows] = useState([]);
  const [view, setView] = useState('overview');
  const [search, setSearch] = useState('');
  const [refundFor, setRefundFor] = useState(null);
  const [okMsg, setOkMsg] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [ticketCount, setTicketCount] = useState(0);
  const [filter, setFilter] = useState('active');
  const [selectedId, setSelectedId] = useState(null);
  const [flash, setFlash] = useState(null);
  const [error, setError] = useState('');
  const known = useRef(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('orders').select(SELECT).order('created_at', { ascending: false }).limit(300);
    if (err) { setError(err.message); return; }
    setError('');
    const list = await withSecrets(data);
    if (known.current) {
      const fresh = list.filter((o) => !known.current.has(o.dbId));
      if (fresh.length) {
        beep();
        setFlash(`New order #${fresh[0].orderId} · ₹${fresh[0].totalAmount}`);
        setTimeout(() => setFlash(null), 6000);
      }
    }
    known.current = new Set(list.map((o) => o.dbId));
    setRows(list);
    const { data: al } = await supabase.from('ops_alerts').select('*').is('resolved_at', null).order('created_at', { ascending: false });
    setAlerts((prev) => {
      if (known.current && (al || []).some((a) => !prev.some((p) => p.id === a.id))) beep();
      return al || [];
    });
    const { count: tc } = await supabase.from('tickets').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_review']);
    setTicketCount(tc || 0);
    const { data: cash } = await supabase.from('payments').select('amount, collected_by').eq('method', 'cash').eq('deposited', false);
    setCashRows(cash || []);
  }, []);

  // Unanswered captain offers go back to the queue; this keeps them moving while the dashboard is open.
  useEffect(() => {
    const id = setInterval(() => supabase.rpc('expire_stale_offers').then(() => load()), 60000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    load();
    supabase.from('profiles').select('id,name,email,phone,is_online,last_seen_at').eq('role', 'captain').then(({ data }) => setCaptains(data || []));
    return subscribeOrders('admin', load);
  }, [load]);

  const counts = useMemo(() => {
    const today = new Date().toDateString();
    const delivered = rows.filter((o) => o.dbStatus === 'delivered' && new Date(o.updatedAtIso).toDateString() === today);
    return {
      fresh: rows.filter((o) => o.dbStatus === 'placed').length,
      progress: rows.filter((o) => ACTIVE_STATUSES.includes(o.dbStatus) && o.dbStatus !== 'placed').length,
      delivered: delivered.length,
      revenue: delivered.reduce((a, o) => a + o.totalAmount, 0)
    };
  }, [rows]);

  const shown = useMemo(() => rows.filter((o) => {
    if (filter === 'active') return ACTIVE_STATUSES.includes(o.dbStatus);
    if (filter === 'new') return o.dbStatus === 'placed';
    if (filter === 'done') return o.dbStatus === 'delivered';
    if (filter === 'cancelled') return o.dbStatus === 'cancelled';
    return true;
  }).filter((o) => {
    if (!search.trim()) return true;
    return `${o.orderId} ${o.customerName} ${o.customerPhone || ''} ${o.customerEmail || ''} ${o.serviceName} ${o.rider?.name || ''}`.toLowerCase().includes(search.trim().toLowerCase());
  }), [rows, filter, search]);

  const selected = rows.find((o) => o.dbId === selectedId) || null;
  const select = useCallback((id) => setSelectedId(id), []);

  // Every change goes through a server function that re-checks you are an admin.
  const act = async (fn) => {
    const { error: err } = await fn();
    if (err) setError(err.message); else { setError(''); load(); }
  };
  const setStatus = (o, status) => act(() => supabase.rpc('admin_set_status', { p_id: o.dbId, p_status: status }));
  const assign = (o, captainId) => captainId && act(() => supabase.rpc('admin_assign_captain', { p_id: o.dbId, p_captain: captainId }));
  const refund = (o) => setRefundFor(o);
  const exportOrders = () => downloadCsv('poshak-orders', shown, [
    ['Order', (o) => o.orderId], ['Placed', (o) => o.createdAtIso], ['Status', (o) => o.statusLabel], ['Customer', (o) => o.customerName], ['Phone', (o) => o.customerPhone || ''],
    ['Service', (o) => o.serviceName], ['Pickup slot', (o) => o.pickupSlot], ['Captain', (o) => o.rider?.name || ''], ['Total (INR)', (o) => o.totalAmount],
    ['Paid (INR)', (o) => o.paidAmount], ['Refunded (INR)', (o) => o.refundedAmount], ['Payment', (o) => o.paymentMode]
  ]);

  const cashByCaptain = useMemo(() => {
    const m = new Map();
    cashRows.forEach((r) => m.set(r.collected_by, (m.get(r.collected_by) || 0) + Number(r.amount)));
    return [...m.entries()].map(([id, amount]) => ({ id, amount, name: captains.find((c) => c.id === id)?.name || captains.find((c) => c.id === id)?.email || 'Captain' }));
  }, [cashRows, captains]);

  return (
    <div className="ops-root">
      <header className="ops-top">
        <div className="ops-brand">Poshak <span>Ops</span></div>
        <div className="ops-top-right">
          <NotificationBell userId={session.user.id} />
          <span className="ops-user">{session.user.email}</span>
          <button className="ops-icon" onClick={load} title="Refresh"><RefreshCw size={16} /></button>
          <button className="ops-icon" onClick={() => { logout(); window.location.hash = '#/staff'; }} title="Sign out"><LogOut size={16} /></button>
        </div>
      </header>

      <div className="ops-shell">
      <nav className="ops-nav">
        {NAV.map(([k, l, Icon]) => <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}><Icon size={17} /><span>{l}</span>{k === 'orders' && alerts.length > 0 ? <span className="ops-dot">{alerts.length}</span> : null}{k === 'tickets' && ticketCount > 0 ? <span className="ops-dot">{ticketCount}</span> : null}</button>)}
      </nav>
      <main className="ops-main">

      {flash && <div className="ops-flash"><Bell size={16} /> {flash}</div>}
      {error && <div className="ops-error">{error}</div>}

      {okMsg && <div className="ops-ok-bar" onClick={() => setOkMsg('')}>{okMsg}</div>}
      {view === 'overview' ? <AdminAnalytics /> : view === 'customers' ? <AdminCustomers /> : view === 'finance' ? <AdminFinance /> : view === 'audit' ? <AdminAudit /> : view === 'team' ? <Team myEmail={session.user.email} /> : view === 'settings' ? <AdminSettings /> : view === 'tickets' ? <AdminTickets onCount={setTicketCount} /> : view === 'captains' ? <AdminCaptains /> : (<>
      {alerts.length > 0 && (
        <div className="ops-alerts">
          {alerts.map((a) => (
            <div key={a.id} className={`ops-alert ${a.severity}`}>
              <b>{a.kind.replace(/_/g, ' ')}</b>
              <span>{a.message}</span>
              <button className="ops-btn" onClick={() => act(() => supabase.rpc('admin_resolve_alert', { p_id: a.id }))}>Resolve</button>
            </div>
          ))}
        </div>
      )}

      <div className="ops-stats">
        <div className="ops-stat ops-stat-hot"><b>{counts.fresh}</b><span>New (unassigned)</span></div>
        <div className="ops-stat"><b>{counts.progress}</b><span>In progress</span></div>
        <div className="ops-stat"><b>{counts.delivered}</b><span>Delivered today</span></div>
        <div className="ops-stat"><b>₹{counts.revenue}</b><span>Revenue today</span></div>
      </div>

      {cashByCaptain.length > 0 && (
        <div className="ops-cash">
          <b>Cash with captains (not yet deposited)</b>
          {cashByCaptain.map((c) => (
            <div key={c.id} className="ops-cash-row">
              <span>{c.name}</span><b>₹{c.amount}</b>
              <button className="ops-btn" onClick={() => window.confirm(`Received ₹${c.amount} from ${c.name}?`) && act(() => supabase.rpc('admin_mark_cash_deposited', { p_captain: c.id }))}>
                Mark deposited
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="ops-grid">
        <section className="ops-col">
          <div className="ord-tools">
            <div className="search"><Search size={14} /><input placeholder="Search order, name, phone, captain" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <button className="ops-icon" title="Export these orders to CSV" onClick={exportOrders}><Download size={15} /></button>
          </div>
          <div className="ops-tabs">
            {[['active', 'Active'], ['new', 'New'], ['done', 'Delivered'], ['cancelled', 'Cancelled'], ['all', 'All']].map(([k, l]) => (
              <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          <div className="ops-list">
            {shown.length === 0 && <div className="ops-empty">No orders here yet. New orders appear instantly.</div>}
            {shown.map((o) => (
              <button key={o.dbId} className={`ops-order ${selectedId === o.dbId ? 'sel' : ''} s-${o.dbStatus}`} onClick={() => select(o.dbId)}>
                <div className="ops-order-top">
                  <b>#{o.orderId}</b>
                  <span className={`ops-badge b-${o.dbStatus}`}>{o.assignment === 'offered' && o.dbStatus === 'captain_assigned' ? 'Offered…' : STATUS_LABEL[o.dbStatus]}</span>
                </div>
                <div className="ops-order-name">{o.serviceName}</div>
                <div className="ops-order-meta">₹{o.totalAmount} · {o.paymentStatus === 'paid' ? 'Paid' : o.paymentMode === 'online' ? 'Online · due' : 'COD'} · {o.pickupSlot}</div>
                <div className="ops-order-meta">{ago(o.createdAtIso)}{o.rider ? ` · ${o.rider.name}` : ' · unassigned'}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="ops-col ops-detail">
          <OpsMap orders={shown} selected={selected} onSelect={select} />
          {selected ? (
            <div className="ops-card">
              <div className="ops-order-top">
                <h3>#{selected.orderId}</h3>
                <span className={`ops-badge b-${selected.dbStatus}`}>{STATUS_LABEL[selected.dbStatus]}</span>
              </div>
              <p className="ops-line"><MapPin size={14} /> {selected.pickupAddress}</p>
              <p className="ops-line"><Navigation size={14} />
                <a target="_blank" rel="noreferrer"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selected.customerLocation.lat},${selected.customerLocation.lng}`}>
                  Open in Google Maps
                </a>
              </p>
              <p className="ops-line"><b>{selected.serviceName}</b></p>
              <p className="ops-line">
                {selected.finalAmount != null ? `Final ₹${selected.finalAmount} (estimate was ₹${selected.estimatedAmount})` : `Estimate ₹${selected.estimatedAmount} — not weighed yet`}
                {' · '}Paid ₹{selected.paidAmount} · Due ₹{selected.dueAmount}
              </p>
              <p className="ops-line">Slot: {selected.pickupSlot} · {selected.paymentMode === 'online' ? 'Prepaid (online)' : 'Pay on delivery'} · {selected.customerName}{selected.customerPhone ? ` · ${selected.customerPhone}` : ''}</p>
              {selected.refundDue > 0 && (
                <p className="ops-line" style={{ color: '#b45309' }}>
                  Refund owed: <b>₹{selected.refundDue}</b> <button className="ops-btn" onClick={() => refund(selected)}>Record refund</button>
                </p>
              )}
              {selected.paidAmount - selected.refundedAmount > 0 && (
                <p className="ops-line"><RotateCcw size={14} /> {selected.refundedAmount > 0 ? `Refunded ₹${selected.refundedAmount} so far · ` : ''}<button className="ops-btn" onClick={() => refund(selected)}>Refund…</button></p>
              )}
              {selected.specialInstructions && <p className="ops-line">Note: {selected.specialInstructions}</p>}
              <p className="ops-line">Pickup OTP <b>{selected.pickupOtp}</b> · Delivery OTP <b>{selected.deliveryOtp}</b></p>
              <OrderChecks order={selected} />
              {selected.dbStatus === 'delivered' && <p className="ops-line"><InvoiceButton orderId={selected.dbId} className="ops-btn" /></p>}
              {selected.attachedPhotos.length > 0 && (
                <div className="ops-photos">{selected.attachedPhotos.map((u, i) => <img key={i} src={u} alt="" />)}</div>
              )}

              {selected.status === 'active' && (
                <>
                  <div className="ops-assign">
                    <UserCheck size={15} />
                    <select value={selected.rider ? (captains.find((c) => (c.name || c.email) === selected.rider.name)?.id || '') : ''}
                      onChange={(e) => assign(selected, e.target.value)}>
                      <option value="">{captains.length ? 'Assign captain…' : 'No captains yet (set role in Supabase)'}</option>
                      {captains.map((c) => <option key={c.id} value={c.id}>{c.is_online ? '● ' : '○ '}{c.name || c.email}{c.is_online ? ' (online)' : ' (offline)'}</option>)}
                    </select>
                    {selected.assignment === 'unassigned' || selected.dbStatus === 'placed' ? <button className="ops-btn" onClick={() => act(async () => { const r = await supabase.rpc('admin_auto_assign', { p_id: selected.dbId }); if (!r.error && !r.data) return { error: { message: 'No online captain available right now' } }; return r; })}>Auto-assign</button> : null}
                    {selected.rider?.phone && <a className="ops-icon" href={`tel:${selected.rider.phone}`}><Phone size={15} /></a>}
                  </div>

                  <div className="ops-actions">
                    {nextStatus(selected.dbStatus) && (
                      <button className="ops-btn ops-btn-primary" onClick={() => setStatus(selected, nextStatus(selected.dbStatus))}>
                        Mark {STATUS_LABEL[nextStatus(selected.dbStatus)]} <ChevronRight size={14} />
                      </button>
                    )}
                    <select value={selected.dbStatus} onChange={(e) => setStatus(selected, e.target.value)}>
                      {FLOW.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                    <button className="ops-btn ops-btn-danger" onClick={() => window.confirm('Cancel this order?') && setStatus(selected, 'cancelled')}>
                      <XCircle size={14} /> Cancel
                    </button>
                  </div>
                </>
              )}
              {selected.rating && <p className="ops-line">Customer rating: {'★'.repeat(selected.rating)}</p>}
            </div>
          ) : (
            <div className="ops-card ops-empty">Select an order to see details and take action.</div>
          )}
        </section>
      </div>
      </>)}
      </main>
      </div>
      {refundFor && <RefundDialog order={refundFor} onClose={() => setRefundFor(null)} onDone={(m) => { setRefundFor(null); setOkMsg(m); load(); }} />}
    </div>
  );
};

export const AdminDashboard = () => (
  <OpsGate title="Poshak Admin" roles={['admin']}>
    <Dashboard />
  </OpsGate>
);
