import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Download, X, Phone, Mail, Wallet, Crown, Moon, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { downloadCsv, inr, dt, dOnly } from '../../lib/csv';
import { STATUS_LABEL } from '../../lib/orderStatus';

const DAY = 86400000;
const initials = (n) => (n || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const segmentOf = (c) => {
  const orders = Number(c.orders);
  const last = c.last_order ? Date.now() - new Date(c.last_order) : Infinity;
  if (orders === 0) return 'never';
  if (Number(c.spent) >= 3000 || orders >= 8) return 'vip';
  if (last > 45 * DAY) return 'dormant';
  if (orders === 1) return 'new';
  return 'regular';
};
const SEG = {
  vip: ['VIP', 'seg-vip'], dormant: ['Dormant', 'seg-dormant'], new: ['New', 'seg-new'], regular: ['Regular', 'seg-reg'], never: ['No orders', 'seg-never']
};

const Detail = ({ c, onClose, onChanged }) => {
  const [orders, setOrders] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [o, l, t] = await Promise.all([
      supabase.from('orders').select('id, order_code, status, service_name, final_amount, estimated_amount, created_at').eq('customer_id', c.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('wallet_ledger').select('*').eq('user_id', c.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('tickets').select('ticket_no, category, status, created_at').eq('customer_id', c.id).order('created_at', { ascending: false }).limit(20)
    ]);
    setOrders(o.data || []); setLedger(l.data || []); setTickets(t.data || []);
  }, [c.id]);
  useEffect(() => { load(); }, [load]);

  const adjust = async (sign) => {
    const n = Number(amt);
    if (!n || n <= 0) return setMsg('Enter an amount');
    if (!note.trim()) return setMsg('Add a reason — it is saved in the audit log');
    const { error } = await supabase.rpc('admin_wallet_adjust', { p_user: c.id, p_amount: sign * n, p_note: note.trim() });
    if (error) return setMsg(error.message);
    setMsg(`${sign > 0 ? 'Credited' : 'Debited'} ${inr(n)}`); setAmt(''); setNote(''); load(); onChanged();
  };

  const [segLabel, segCls] = SEG[segmentOf(c)];
  const aov = Number(c.orders) ? Number(c.spent) / Math.max(1, (orders || []).filter((o) => o.status === 'delivered').length || 1) : 0;

  return (
    <div className="drawer-back" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header>
          <div className="av lg">{initials(c.name)}</div>
          <div className="grow">
            <h3>{c.name || 'Customer'} <span className={`pill ${segCls}`}>{segLabel}</span></h3>
            <p className="ops-muted">Last order {dOnly(c.last_order)}</p>
          </div>
          <button className="ops-icon" onClick={onClose}><X size={16} /></button>
        </header>

        <div className="drawer-contact">
          {c.phone && <a className="ops-btn" href={`tel:${c.phone}`}><Phone size={14} /> {c.phone}</a>}
          {c.phone && <a className="ops-btn" target="_blank" rel="noreferrer" href={`https://wa.me/91${String(c.phone).replace(/\D/g, '').slice(-10)}`}>WhatsApp</a>}
          {c.email && <a className="ops-btn" href={`mailto:${c.email}`}><Mail size={14} /> {c.email}</a>}
        </div>

        <div className="mini-kpis">
          <div><b>{c.orders}</b><span>Orders</span></div>
          <div><b>{inr(c.spent)}</b><span>Lifetime spend</span></div>
          <div><b>{inr(aov)}</b><span>Avg order</span></div>
          <div><b>{inr(c.wallet)}</b><span>Wallet</span></div>
        </div>

        <h4>Orders</h4>
        {!orders ? <p className="ops-muted">Loading…</p> : orders.length === 0 ? <p className="ops-muted">No orders yet.</p> : (
          <div className="tbl-wrap"><table className="tbl compact"><tbody>
            {orders.map((o) => (
              <tr key={o.id}><td><b>#{o.order_code}</b><br /><small>{o.service_name}</small></td>
                <td><span className={`ops-badge b-${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span></td>
                <td className="r">{inr(o.final_amount ?? o.estimated_amount)}<br /><small>{dOnly(o.created_at)}</small></td></tr>
            ))}
          </tbody></table></div>
        )}

        <h4><Wallet size={14} /> Wallet</h4>
        <div className="wallet-adj">
          <input type="number" min="1" placeholder="Amount ₹" value={amt} onChange={(e) => setAmt(e.target.value)} />
          <input placeholder="Reason (required)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="ops-btn" onClick={() => adjust(1)}>Credit</button>
          <button className="ops-btn ops-btn-danger" onClick={() => adjust(-1)}>Debit</button>
        </div>
        {msg && <p className="ops-ok">{msg}</p>}
        {ledger.length > 0 && (
          <div className="tbl-wrap"><table className="tbl compact"><tbody>
            {ledger.map((l) => (
              <tr key={l.id}><td>{l.kind.replace(/_/g, ' ')}<br /><small>{l.note || ''}</small></td>
                <td className={`r ${Number(l.amount) > 0 ? 'pos' : 'neg'}`}>{Number(l.amount) > 0 ? '+' : ''}{inr(l.amount)}<br /><small>{dt(l.created_at)}</small></td></tr>
            ))}
          </tbody></table></div>
        )}

        {tickets.length > 0 && (<>
          <h4>Complaints</h4>
          <div className="tbl-wrap"><table className="tbl compact"><tbody>
            {tickets.map((t) => <tr key={t.ticket_no}><td>{t.ticket_no}<br /><small>{t.category.replace(/_/g, ' ')}</small></td><td><span className="pill">{t.status.replace('_', ' ')}</span></td><td className="r"><small>{dOnly(t.created_at)}</small></td></tr>)}
          </tbody></table></div>
        </>)}
      </aside>
    </div>
  );
};

export const AdminCustomers = () => {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [seg, setSeg] = useState('all');
  const [sort, setSort] = useState('recent');
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async (search = '') => {
    const { data, error: err } = await supabase.rpc('admin_customers', { p_search: search || null, p_limit: 500 });
    if (err) setError(err.message); else { setError(''); setRows(data || []); }
  }, []);
  useEffect(() => { const t = setTimeout(() => load(q.trim()), 250); return () => clearTimeout(t); }, [q, load]);

  const counts = useMemo(() => {
    const c = { all: 0, vip: 0, dormant: 0, new: 0, regular: 0, never: 0 };
    (rows || []).forEach((r) => { c.all++; c[segmentOf(r)]++; });
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    let r = (rows || []).filter((x) => seg === 'all' || segmentOf(x) === seg);
    if (sort === 'spend') r = [...r].sort((a, b) => Number(b.spent) - Number(a.spent));
    if (sort === 'orders') r = [...r].sort((a, b) => Number(b.orders) - Number(a.orders));
    if (sort === 'wallet') r = [...r].sort((a, b) => Number(b.wallet) - Number(a.wallet));
    return r;
  }, [rows, seg, sort]);

  const totals = useMemo(() => ({
    spend: (rows || []).reduce((a, r) => a + Number(r.spent), 0),
    wallet: (rows || []).reduce((a, r) => a + Number(r.wallet), 0)
  }), [rows]);

  const exportCsv = () => downloadCsv('poshak-customers', shown, [
    ['Name', (r) => r.name], ['Email', (r) => r.email], ['Phone', (r) => r.phone], ['Orders', (r) => r.orders],
    ['Lifetime spend (INR)', (r) => r.spent], ['Wallet (INR)', (r) => r.wallet], ['Last order', (r) => r.last_order || ''], ['Segment', (r) => SEG[segmentOf(r)][0]]
  ]);

  return (
    <div className="an">
      <div className="an-head">
        <div><h2>Customers</h2><p className="ops-muted">{counts.all} customers · {inr(totals.spend)} lifetime spend · {inr(totals.wallet)} held in wallets</p></div>
        <div className="an-tools">
          <div className="search"><Search size={14} /><input placeholder="Search name, email, phone" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className="sel" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Most recent</option><option value="spend">Highest spend</option><option value="orders">Most orders</option><option value="wallet">Wallet balance</option>
          </select>
          <button className="ops-btn" onClick={exportCsv}><Download size={14} /> Export CSV</button>
        </div>
      </div>

      <div className="chips">
        {[['all', 'All', null], ['vip', 'VIP', Crown], ['new', 'New', UserPlus], ['regular', 'Regular', null], ['dormant', 'Dormant 45d+', Moon], ['never', 'No orders', null]].map(([k, l, Ic]) => (
          <button key={k} className={seg === k ? 'on' : ''} onClick={() => setSeg(k)}>{Ic && <Ic size={13} />}{l}<em>{counts[k]}</em></button>
        ))}
      </div>

      {error && <div className="ops-error" style={{ margin: '0 0 1rem' }}>{error}</div>}
      <section className="panel flush">
        {!rows ? <div className="sk" style={{ height: 240 }} /> : shown.length === 0 ? <div className="ch-empty">No customers match.</div> : (
          <div className="tbl-wrap tall">
            <table className="tbl hover">
              <thead><tr><th>Customer</th><th>Contact</th><th className="r">Orders</th><th className="r">Spend</th><th className="r">Wallet</th><th>Last order</th><th>Segment</th></tr></thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id} onClick={() => setOpen(c)}>
                    <td><span className="av">{initials(c.name)}</span><b>{c.name || '—'}</b></td>
                    <td><small>{c.phone || '—'}<br />{c.email}</small></td>
                    <td className="r">{c.orders}</td><td className="r"><b>{inr(c.spent)}</b></td><td className="r">{inr(c.wallet)}</td>
                    <td><small>{dOnly(c.last_order)}</small></td>
                    <td><span className={`pill ${SEG[segmentOf(c)][1]}`}>{SEG[segmentOf(c)][0]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {open && <Detail c={open} onClose={() => setOpen(null)} onChanged={() => load(q.trim())} />}
    </div>
  );
};
