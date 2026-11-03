import React, { useCallback, useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const KIND = { claim: 'Complaint credit', referral: 'Referral bonus', plan: 'Plan credit', refund: 'Refund', order_payment: 'Used on order', adjustment: 'Credit from Poshak', tip_refund: 'Tip refund' };

// Real wallet (server ledger) when signed in; the old on-device demo wallet otherwise.
// Wallet money is credit only (claims, referrals, plans) — it cannot be topped up directly.
export const WalletCard = ({ user, demoBalance, onAddMoney, children }) => {
  const live = Boolean(supabase && user?.isSupabase);
  const [balance, setBalance] = useState(null);
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    if (!live) return;
    const [{ data: b }, { data: l }] = await Promise.all([
      supabase.rpc('my_wallet_balance'),
      supabase.from('wallet_ledger').select('*').order('created_at', { ascending: false }).limit(15)
    ]);
    setBalance(Number(b || 0));
    setRows(l || []);
  }, [live]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!live) return undefined;
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [live, load]);

  const shown = live ? balance : demoBalance;
  return (
    <div className="psk-wallet">
      <div className="psk-wallet-head">
        <span><Wallet size={20} color="#fa5929" /> <b>Poshak Wallet</b></span>
        <strong>₹{shown ?? '…'}</strong>
      </div>
      {live ? (
        <>
          <p className="psk-wallet-note">Wallet credit is used automatically to pay your bill at pickup. It comes from complaint resolutions, referrals and plans.</p>
          {rows.length > 0 && (
            <div className="psk-ledger">
              {rows.map((r) => (
                <div key={r.id} className="psk-ledger-row">
                  <span>{KIND[r.kind] || r.kind}{r.note ? <small> · {r.note}</small> : null}</span>
                  <b className={r.amount > 0 ? 'plus' : 'minus'}>{r.amount > 0 ? '+' : '−'}₹{Math.abs(r.amount)}</b>
                </div>
              ))}
            </div>
          )}
          {children}
        </>
      ) : (
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button className="psk-btn-ghost" onClick={() => onAddMoney(500)}>+ Add ₹500 (demo)</button>
          <button className="psk-btn-ghost" onClick={() => onAddMoney(1000)}>+ Add ₹1000 (demo)</button>
        </div>
      )}
    </div>
  );
};
