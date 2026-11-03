import React, { useState } from 'react';
import { X, Wallet, CreditCard, ClipboardCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { inr } from '../../lib/csv';

// One place to refund: instantly to the customer's wallet, back to the original payment via Razorpay,
// or just record a refund you already made elsewhere.
export const RefundDialog = ({ order, onClose, onDone }) => {
  const max = Math.max(0, order.paidAmount - (order.refundedAmount || 0));
  const [method, setMethod] = useState(order.paidOnline ? 'razorpay' : 'wallet');
  const [amount, setAmount] = useState(String(order.refundDue > 0 ? order.refundDue : max));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const n = Number(amount);
    if (!n || n <= 0) return setError('Enter an amount');
    if (n > max) return setError(`Only ${inr(max)} can still be refunded on this order`);
    setBusy(true); setError('');
    let err;
    if (method === 'wallet') ({ error: err } = await supabase.rpc('admin_refund_to_wallet', { p_order: order.dbId, p_amount: n, p_reason: reason || null }));
    else if (method === 'manual') ({ error: err } = await supabase.rpc('admin_mark_refunded', { p_id: order.dbId, p_amount: n }));
    else {
      const { error: e } = await supabase.functions.invoke('refund-payment', { body: { order_id: order.dbId, amount: n, reason: reason || null } });
      if (e) { let m = e.message; try { m = (await e.context.json()).error || m; } catch { /* generic */ } err = { message: m }; }
    }
    setBusy(false);
    if (err) return setError(err.message);
    onDone(`${inr(n)} refunded ${method === 'wallet' ? 'to wallet' : method === 'razorpay' ? 'via Razorpay (5–7 days to reach the customer)' : '(recorded)'}`);
  };

  const opts = [
    ['wallet', Wallet, 'To Poshak wallet', 'Instant · customer can use it on the next order'],
    ['razorpay', CreditCard, 'To original payment', 'Razorpay refund · 5–7 working days'],
    ['manual', ClipboardCheck, 'Already refunded', 'Just record a refund you did outside the app']
  ];

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header><h3>Refund order #{order.orderId}</h3><button className="ops-icon" onClick={onClose}><X size={16} /></button></header>
        <div className="mini-kpis three">
          <div><b>{inr(order.paidAmount)}</b><span>Paid</span></div>
          <div><b>{inr(order.refundedAmount || 0)}</b><span>Already refunded</span></div>
          <div><b>{inr(max)}</b><span>Refundable</span></div>
        </div>
        <div className="opt-list">
          {opts.map(([k, Ic, t, d]) => (
            <label key={k} className={method === k ? 'on' : ''}>
              <input type="radio" name="rm" checked={method === k} onChange={() => setMethod(k)} />
              <Ic size={18} /><span><b>{t}</b><small>{d}</small></span>
            </label>
          ))}
        </div>
        <label className="fld">Amount (₹)<input type="number" min="1" max={max} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label className="fld">Reason <small>(shown in the audit log{method === 'wallet' ? ' and the customer’s wallet' : ''})</small><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Item damaged, goodwill, order cancelled" /></label>
        {error && <div className="ops-error" style={{ margin: '0 0 .75rem' }}>{error}</div>}
        <div className="modal-foot">
          <button className="ops-btn" onClick={onClose}>Cancel</button>
          <button className="ops-btn ops-btn-primary" disabled={busy || max <= 0} onClick={submit}>{busy ? 'Working…' : `Refund ${inr(Number(amount) || 0)}`}</button>
        </div>
      </div>
    </div>
  );
};
