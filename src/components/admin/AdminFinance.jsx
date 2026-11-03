import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, IndianRupee, RotateCcw, Banknote, TrendingUp, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fromRow } from '../../lib/ordersApi';
import { downloadCsv, inr, inr2, dt } from '../../lib/csv';
import { Donut } from './charts';
import { RefundDialog } from './RefundDialog';

const RANGES = [[7, '7 days'], [30, '30 days'], [90, '90 days'], [365, '1 year']];
const METHOD = { online: 'Online', upi_qr: 'UPI QR', cash: 'Cash' };
const COLOR = { online: '#fa5929', upi_qr: '#2563eb', cash: '#16a34a' };
const RSTAT = { processed: 'good', pending: 'warn', failed: 'bad' };

export const AdminFinance = () => {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('payments');
  const [pays, setPays] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [owed, setOwed] = useState([]);
  const [cash, setCash] = useState([]);
  const [captains, setCaptains] = useState([]);
  const [method, setMethod] = useState('all');
  const [refundFor, setRefundFor] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const from = new Date(Date.now() - days * 86400000).toISOString();
    const [p, r, o, c, cp] = await Promise.all([
      supabase.from('payments').select('*, orders(order_code, customer_name)').gte('created_at', from).order('created_at', { ascending: false }).limit(2000),
      supabase.from('refunds').select('*, orders(order_code, customer_name)').gte('created_at', from).order('created_at', { ascending: false }).limit(1000),
      supabase.from('orders').select('*, order_events(status, created_at)').gt('paid_amount', 0).order('updated_at', { ascending: false }).limit(300),
      supabase.from('payments').select('id, amount, collected_by, created_at').eq('method', 'cash').eq('deposited', false),
      supabase.from('profiles').select('id, name, email').eq('role', 'captain')
    ]);
    const err = p.error || r.error || o.error;
    if (err) setError(err.message); else setError('');
    setPays(p.data || []); setRefunds(r.data || []); setCash(c.data || []); setCaptains(cp.data || []);
    setOwed((o.data || []).map((row) => ({ ...fromRow(row), refundedAmount: Number(row.refunded_amount), paidOnline: !!row.razorpay_order_id || row.payment_mode === 'online' })).filter((x) => x.refundDue > 0));
  }, [days]);
  useEffect(() => { load(); }, [load]);

  const k = useMemo(() => {
    const collected = pays.reduce((a, x) => a + Number(x.amount), 0);
    const refunded = refunds.filter((x) => x.status !== 'failed').reduce((a, x) => a + Number(x.amount), 0);
    const by = {};
    pays.forEach((x) => { by[x.method] = (by[x.method] || 0) + Number(x.amount); });
    return {
      collected, refunded, net: collected - refunded, by,
      pending: refunds.filter((x) => x.status === 'pending').length,
      failed: refunds.filter((x) => x.status === 'failed').length,
      cashHeld: cash.reduce((a, x) => a + Number(x.amount), 0),
      owedTotal: owed.reduce((a, x) => a + x.refundDue, 0)
    };
  }, [pays, refunds, cash, owed]);

  const cashByCaptain = useMemo(() => {
    const m = new Map();
    cash.forEach((x) => m.set(x.collected_by, (m.get(x.collected_by) || 0) + Number(x.amount)));
    return [...m.entries()].map(([id, amount]) => ({ id, amount, name: captains.find((c) => c.id === id)?.name || captains.find((c) => c.id === id)?.email || 'Captain' }));
  }, [cash, captains]);

  const shownPays = pays.filter((x) => method === 'all' || x.method === method);

  const exportPays = () => downloadCsv('poshak-payments', shownPays, [
    ['Date', (x) => x.created_at], ['Order', (x) => x.orders?.order_code], ['Customer', (x) => x.orders?.customer_name], ['Method', (x) => METHOD[x.method]],
    ['Amount (INR)', (x) => x.amount], ['Razorpay payment id', (x) => x.razorpay_payment_id || ''], ['Cash deposited', (x) => (x.method === 'cash' ? (x.deposited ? 'yes' : 'no') : '')]
  ]);
  const exportRefunds = () => downloadCsv('poshak-refunds', refunds, [
    ['Date', (x) => x.created_at], ['Order', (x) => x.orders?.order_code], ['Customer', (x) => x.orders?.customer_name], ['Method', (x) => x.method],
    ['Amount (INR)', (x) => x.amount], ['Status', (x) => x.status], ['Razorpay refund id', (x) => x.razorpay_refund_id || ''], ['Reason', (x) => x.reason || '']
  ]);

  const deposit = async (c) => {
    if (!window.confirm(`Received ${inr(c.amount)} cash from ${c.name}?`)) return;
    const { error: e } = await supabase.rpc('admin_mark_cash_deposited', { p_captain: c.id });
    if (e) setError(e.message); else { setMsg(`${inr(c.amount)} from ${c.name} marked deposited`); load(); }
  };

  const mixItems = Object.entries(k.by).map(([m, v]) => ({ label: METHOD[m] || m, value: v, text: inr(v), color: COLOR[m] || '#999' }));

  return (
    <div className="an">
      <div className="an-head">
        <div><h2>Finance</h2><p className="ops-muted">Money in, refunds, and cash still with captains · last {days} days</p></div>
        <div className="an-tools"><div className="seg">{RANGES.map(([d, l]) => <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{l}</button>)}</div></div>
      </div>
      {error && <div className="ops-error" style={{ margin: '0 0 1rem' }}>{error}</div>}
      {msg && <div className="ops-ok-bar">{msg}</div>}

      <div className="kpi-grid">
        <div className="kpi tone-brand"><div className="kpi-top"><span className="kpi-ic"><IndianRupee size={16} /></span><span className="kpi-l">Collected</span></div><div className="kpi-v">{inr(k.collected)}</div><div className="kpi-foot"><small>{pays.length} {pays.length === 1 ? 'payment' : 'payments'}</small></div></div>
        <div className="kpi"><div className="kpi-top"><span className="kpi-ic"><RotateCcw size={16} /></span><span className="kpi-l">Refunded</span></div><div className="kpi-v">{inr(k.refunded)}</div><div className="kpi-foot"><small>{refunds.length} {refunds.length === 1 ? 'refund' : 'refunds'}{k.pending ? ` · ${k.pending} pending` : ''}</small></div></div>
        <div className="kpi tone-good"><div className="kpi-top"><span className="kpi-ic"><TrendingUp size={16} /></span><span className="kpi-l">Net received</span></div><div className="kpi-v">{inr(k.net)}</div><div className="kpi-foot"><small>collected − refunded</small></div></div>
        <div className={`kpi ${k.cashHeld ? 'tone-warn' : ''}`}><div className="kpi-top"><span className="kpi-ic"><Banknote size={16} /></span><span className="kpi-l">Cash with captains</span></div><div className="kpi-v">{inr(k.cashHeld)}</div><div className="kpi-foot"><small>not yet deposited</small></div></div>
        <div className={`kpi ${k.owedTotal ? 'tone-bad' : ''}`}><div className="kpi-top"><span className="kpi-ic"><AlertTriangle size={16} /></span><span className="kpi-l">Refunds owed</span></div><div className="kpi-v">{inr(k.owedTotal)}</div><div className="kpi-foot"><small>{owed.length} {owed.length === 1 ? 'order' : 'orders'} overpaid / cancelled</small></div></div>
      </div>

      <div className="an-grid">
        <section className="panel">
          <header><h3>Collected by method</h3></header>
          {mixItems.length ? <Donut items={mixItems} centre={[inr(k.collected), 'total']} /> : <div className="ch-empty">No payments in this period</div>}
        </section>
        <section className="panel span2">
          <header><h3>Refunds owed to customers</h3><span className="ops-muted">cancelled or overpaid orders</span></header>
          {owed.length === 0 ? <div className="ch-empty">All settled. Nothing owed.</div> : (
            <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Order</th><th>Customer</th><th className="r">Paid</th><th className="r">Owed</th><th /></tr></thead><tbody>
              {owed.map((o) => (
                <tr key={o.dbId}><td><b>#{o.orderId}</b><br /><small>{o.statusLabel}</small></td><td>{o.customerName}</td><td className="r">{inr(o.paidAmount)}</td><td className="r neg"><b>{inr(o.refundDue)}</b></td>
                  <td className="r"><button className="ops-btn ops-btn-primary" onClick={() => setRefundFor(o)}>Refund</button></td></tr>
              ))}
            </tbody></table></div>
          )}
        </section>
      </div>

      <div className="chips" style={{ marginTop: '.5rem' }}>
        {[['payments', 'Payments'], ['refunds', `Refunds${k.failed ? ` · ${k.failed} failed` : ''}`], ['cash', `Cash to collect${cashByCaptain.length ? ` · ${cashByCaptain.length}` : ''}`]].map(([id, l]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{l}</button>)}
        <span className="grow" />
        {tab === 'payments' && <><select className="sel" value={method} onChange={(e) => setMethod(e.target.value)}><option value="all">All methods</option><option value="online">Online</option><option value="upi_qr">UPI QR</option><option value="cash">Cash</option></select><button className="ops-btn" onClick={exportPays}><Download size={14} /> Export CSV</button></>}
        {tab === 'refunds' && <button className="ops-btn" onClick={exportRefunds}><Download size={14} /> Export CSV</button>}
      </div>

      <section className="panel flush">
        {tab === 'payments' && (shownPays.length === 0 ? <div className="ch-empty">No payments.</div> : (
          <div className="tbl-wrap tall"><table className="tbl"><thead><tr><th>When</th><th>Order</th><th>Method</th><th className="r">Amount</th><th>Reference</th></tr></thead><tbody>
            {shownPays.map((x) => (
              <tr key={x.id}><td><small>{dt(x.created_at)}</small></td><td><b>#{x.orders?.order_code}</b><br /><small>{x.orders?.customer_name}</small></td>
                <td><span className="pill" style={{ background: `${COLOR[x.method]}1a`, color: COLOR[x.method] }}>{METHOD[x.method]}</span>{x.method === 'cash' && <small> {x.deposited ? '· deposited' : '· with captain'}</small>}</td>
                <td className="r"><b>{inr2(x.amount)}</b></td><td><small className="mono">{x.razorpay_payment_id || '—'}</small></td></tr>
            ))}
          </tbody></table></div>
        ))}
        {tab === 'refunds' && (refunds.length === 0 ? <div className="ch-empty">No refunds in this period.</div> : (
          <div className="tbl-wrap tall"><table className="tbl"><thead><tr><th>When</th><th>Order</th><th>Method</th><th className="r">Amount</th><th>Status</th><th>Reason</th></tr></thead><tbody>
            {refunds.map((x) => (
              <tr key={x.id}><td><small>{dt(x.created_at)}</small></td><td><b>#{x.orders?.order_code}</b><br /><small>{x.orders?.customer_name}</small></td>
                <td>{x.method === 'razorpay' ? 'Razorpay' : x.method === 'wallet' ? 'Wallet' : 'Manual'}</td><td className="r"><b>{inr2(x.amount)}</b></td>
                <td><span className={`pill ${RSTAT[x.status]}`}>{x.status}</span></td><td><small>{x.reason || '—'}</small></td></tr>
            ))}
          </tbody></table></div>
        ))}
        {tab === 'cash' && (cashByCaptain.length === 0 ? <div className="ch-empty">No undeposited cash. 🎉</div> : (
          <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Captain</th><th className="r">Holding</th><th /></tr></thead><tbody>
            {cashByCaptain.map((c) => <tr key={c.id}><td><b>{c.name}</b></td><td className="r"><b>{inr(c.amount)}</b></td><td className="r"><button className="ops-btn ops-btn-primary" onClick={() => deposit(c)}>Mark deposited</button></td></tr>)}
          </tbody></table></div>
        ))}
      </section>

      {refundFor && <RefundDialog order={refundFor} onClose={() => setRefundFor(null)} onDone={(m) => { setRefundFor(null); setMsg(m); load(); }} />}
    </div>
  );
};
