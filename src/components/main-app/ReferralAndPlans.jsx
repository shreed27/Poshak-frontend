import React, { useCallback, useEffect, useState } from 'react';
import { Gift, Copy, Share2, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { buyPlan } from '../../lib/payments';

// Shown inside the wallet card: invite friends (both get a bonus) and buy a prepaid pack.
export const ReferralAndPlans = ({ onWalletChanged }) => {
  const [ref, setRef] = useState(null);
  const [plans, setPlans] = useState([]);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.rpc('my_referral'),
      supabase.from('plans').select('*').eq('active', true).order('sort')
    ]);
    setRef(r); setPlans(p || []);
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!ref) return null;

  const link = `${window.location.origin}/?ref=${ref.code}`;
  const share = async () => {
    const text = `Get your laundry picked up & delivered with Poshak. Use my code ${ref.code} and we both get ₹${ref.bonus} after your first order: ${link}`;
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); setMsg('Invite copied'); } } catch { /* cancelled */ }
  };
  const apply = async (e) => {
    e.preventDefault(); setError(''); setMsg('');
    const { error: err } = await supabase.rpc('apply_referral', { p_code: code });
    if (err) setError(err.message); else { setMsg('Code applied! Your bonus arrives after your first order.'); setCode(''); load(); }
  };
  const buy = async (plan) => {
    setBusy(plan.id); setError(''); setMsg('');
    try { await buyPlan(plan.id); setMsg(`₹${plan.credit} added to your wallet`); onWalletChanged?.(); }
    catch (e) { if (e.message !== 'Payment cancelled') setError(e.message); }
    setBusy('');
  };

  return (
    <div className="psk-refplans">
      {plans.length > 0 && (
        <>
          <h4><Sparkles size={15} /> Prepaid packs — pay once, get extra credit</h4>
          <div className="psk-plans">
            {plans.map((p) => (
              <button key={p.id} className="psk-plan" disabled={busy === p.id} onClick={() => buy(p)}>
                <b>₹{p.price}</b><span>get ₹{p.credit}</span><small>+₹{p.credit - p.price} extra</small>
              </button>
            ))}
          </div>
        </>
      )}
      <h4><Gift size={15} /> Invite friends, earn ₹{ref.bonus}</h4>
      <div className="psk-refbox">
        <code>{ref.code}</code>
        <button onClick={() => { navigator.clipboard?.writeText(ref.code); setMsg('Code copied'); }}><Copy size={14} /></button>
        <button onClick={share}><Share2 size={14} /> Share</button>
      </div>
      <p className="psk-wallet-note">{ref.friends} friend(s) joined · {ref.rewarded} rewarded. You both get ₹{ref.bonus} after their first order.</p>
      {!ref.referred_by && (
        <form className="psk-coupon" onSubmit={apply}>
          <Gift size={15} />
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Have a friend's code?" maxLength={10} />
          <button disabled={!code.trim()}>Apply</button>
        </form>
      )}
      {msg && <p className="psk-pref-ok">{msg}</p>}
      {error && <p className="psk-pref-err">{error}</p>}
    </div>
  );
};
