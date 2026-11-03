import React, { useState } from 'react';
import { 
  Wallet, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Copy, 
  Check, 
  ShieldCheck, 
  Gift, 
  CreditCard,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const WalletTab = ({ 
  user, 
  walletBalance, 
  transactions, 
  onAddMoney 
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(1000);
  const [rechargeSuccess, setRechargeSuccess] = useState(false);

  const referralCode = 'POSHAK-GOLD26';

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleTopUp = (amount) => {
    const topUpVal = Number(amount) || selectedPreset;
    if (topUpVal <= 0) return;

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    onAddMoney(topUpVal);
    setRechargeSuccess(true);
    setCustomAmount('');
    setTimeout(() => setRechargeSuccess(false), 2500);
  };

  return (
    <div className="wallet-view-container">
      {/* Top Grid: Holographic Pass Card + Recharge Card */}
      <div className="wallet-top-grid">
        {/* Holographic Poshak Gold Card */}
        <div className="poshak-gold-digital-card">
          <div className="gold-card-header">
            <div>
              <span className="card-brand-serif">Poshak</span>
              <span style={{ fontSize: '0.8rem', color: '#fa5929', fontWeight: '800', marginLeft: '0.4rem' }}>
                GOLD PASS
              </span>
            </div>
            <div className="gold-tier-badge">
              Active Member
            </div>
          </div>

          <div className="card-balance-section">
            <div className="card-balance-label">Available Wallet Credits</div>
            <div className="card-balance-amount">₹{walletBalance}</div>
          </div>

          <div className="card-footer-meta">
            <div>
              <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Cardholder</div>
              <div style={{ fontWeight: '700', fontSize: '0.88rem' }}>{user?.name || 'Shreed Shrivastava'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Valid Thru</div>
              <div style={{ fontWeight: '700', fontSize: '0.88rem' }}>12 / 2026</div>
            </div>
          </div>
        </div>

        {/* Quick Recharge Card */}
        <div className="wallet-recharge-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0a0a0a' }}>
              Top-Up Poshak Credits
            </h3>
            <span style={{ fontSize: '0.74rem', background: '#ecfdf5', color: '#059669', fontWeight: '800', padding: '0.2rem 0.55rem', borderRadius: '9999px' }}>
              Instant 10% Extra
            </span>
          </div>
          <p style={{ fontSize: '0.84rem', color: '#666', lineHeight: 1.4 }}>
            Credits never expire and are automatically applied to all doorstep laundry pickups.
          </p>

          {/* Amount Presets */}
          <div className="recharge-amounts-row">
            {[
              { val: 500, bonus: '+₹50 Extra' },
              { val: 1000, bonus: '+₹150 Extra' },
              { val: 2000, bonus: '+₹350 Extra' }
            ].map((preset) => (
              <div 
                key={preset.val}
                className="recharge-amount-pill"
                onClick={() => setSelectedPreset(preset.val)}
                style={{
                  borderColor: selectedPreset === preset.val ? '#fa5929' : '#e5e7eb',
                  background: selectedPreset === preset.val ? 'rgba(250, 89, 41, 0.05)' : '#f9fafb'
                }}
              >
                <div className="recharge-val">₹{preset.val}</div>
                <div className="recharge-bonus">{preset.bonus}</div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => handleTopUp(selectedPreset)}
            style={{
              width: '100%',
              background: '#0a0a0a',
              color: '#ffffff',
              padding: '0.85rem',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Plus size={16} />
            <span>
              {rechargeSuccess ? '₹' + selectedPreset + ' Credited!' : 'Add ₹' + selectedPreset + ' via UPI / Netbanking'}
            </span>
          </button>
        </div>
      </div>

      {/* Gold Pass Privileges Grid */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '1.75rem',
        border: '1px solid rgba(10,10,10,0.08)'
      }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} color="#fa5929" />
          <span>Your Poshak Gold Pass Privileges</span>
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem'
        }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(250,89,41,0.1)', color: '#fa5929', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={16} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Flat 20% Member Discount</div>
              <div style={{ fontSize: '0.78rem', color: '#666' }}>Automatically applies to every dry clean and steam press order with code POSHAKGOLD.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={16} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Zero Doorstep Delivery Fees</div>
              <div style={{ fontSize: '0.78rem', color: '#666' }}>Free scheduled doorstep pickup & return across all major Bengaluru pin codes.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>₹5,000 Fabric Insurance</div>
              <div style={{ fontSize: '0.78rem', color: '#666' }}>Guaranteed replacement coverage against fabric damage, color fading, or missing items.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Program Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #fa5929 0%, #e04a1d 100%)',
        color: '#ffffff',
        borderRadius: '24px',
        padding: '1.75rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem',
        boxShadow: '0 8px 24px rgba(250, 89, 41, 0.25)'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.74rem', fontWeight: '800', marginBottom: '0.5rem' }}>
            <Gift size={13} />
            <span>REFER & EARN</span>
          </div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.25rem' }}>
            Give ₹150, Get ₹150 in Poshak Credits
          </h3>
          <p style={{ fontSize: '0.86rem', opacity: 0.9 }}>
            Share your unique invite code with friends in Bengaluru. When they complete their first pickup, both of you earn ₹150.
          </p>
        </div>

        <button 
          onClick={handleCopyReferral}
          style={{
            background: '#ffffff',
            color: '#fa5929',
            padding: '0.75rem 1.5rem',
            borderRadius: '9999px',
            fontSize: '0.9rem',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          {copiedCode ? <Check size={16} /> : <Copy size={16} />}
          <span>{copiedCode ? 'Code Copied!' : referralCode}</span>
        </button>
      </div>

      {/* Transaction History Passbook */}
      <div className="wallet-transactions-card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0a0a0a', marginBottom: '1.25rem' }}>
          Credit Passbook & Transaction Ledger
        </h3>

        <div className="transactions-list">
          {transactions.map((tx) => (
            <div key={tx.id} className="transaction-item-row">
              <div className="tx-icon-desc-group">
                <div className={`tx-icon-box ${tx.type}`}>
                  {tx.type === 'credit' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div>
                  <div className="tx-title">{tx.title}</div>
                  <div className="tx-date-sub">{tx.date} • {tx.desc}</div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className={`tx-amount ${tx.type}`}>
                  {tx.type === 'credit' ? `+₹${tx.amount}` : `-₹${tx.amount}`}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#888' }}>{tx.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
