import React, { useState } from 'react';
import { 
  User, 
  MapPin, 
  Wallet, 
  Sparkles, 
  Plus, 
  LogOut, 
  ExternalLink, 
  Check, 
  Trash2,
  X,
  ShieldCheck,
  Download,
  FileText,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { NotificationPrefs } from './NotificationPrefs';
import { WalletCard } from './WalletCard';
import { ReferralAndPlans } from './ReferralAndPlans';
import { LegalModal } from '../LegalModals';

export const SwiggyAccountView = ({ 
  user, 
  walletBalance, 
  onAddMoney, 
  addresses, 
  onAddAddress, 
  onDeleteAddress, 
  onOpenLocationPicker,
  onOpenHelp,
  onSetDefaultAddress, 
  onBackToLanding, 
  logout 
}) => {
  const [activeLegalTab, setActiveLegalTab] = useState(null);

  const handleExportData = () => {
    try {
      const orders = JSON.parse(localStorage.getItem('poshak_orders') || '[]');
      const cart = JSON.parse(localStorage.getItem('poshak_cart') || '[]');
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        statutoryNotice: "Digital Personal Data Protection (DPDP) Act, 2023 - Section 11 Data Principal Access Record",
        dataFiduciary: {
          name: "Poshak Technologies Private Limited",
          entityType: "Private Limited Company",
          jurisdiction: "Bengaluru, Karnataka, India",
          supportContact: "privacy@poshak.in",
          grievanceOfficer: "grievance@poshak.in"
        },
        dataPrincipal: {
          name: user?.name || "Poshak Member",
          email: user?.email || "user@poshak.in",
          picture: user?.picture || null
        },
        financials: {
          walletBalance: walletBalance,
          currency: "INR"
        },
        savedAddresses: addresses,
        recentOrders: orders,
        activeCart: cart
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `poshak_data_export_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error("Failed to export data:", err);
      alert("Could not complete export. Please try again or contact privacy@poshak.in.");
    }
  };

  const handleErasureRequest = () => {
    const confirmed = window.confirm(
      "DPDP ACT 2023 (Section 12) - DATA ERASURE REQUEST:\n\n" +
      "This action will permanently erase your personal profile, addresses, order history, and wallet records stored on this device.\n\n" +
      "Do you confirm that you want your personal data erased?"
    );
    if (confirmed) {
      try {
        localStorage.removeItem('poshak_orders');
        localStorage.removeItem('poshak_cart');
        localStorage.removeItem('poshak_addresses');
        localStorage.removeItem('poshak_wallet');
        localStorage.removeItem('poshak_user');
        alert("Your personal data has been erased from this device in accordance with DPDP Act, 2023. You will now be signed out.");
        logout();
      } catch (err) {
        console.error("Erasure failed:", err);
      }
    }
  };

  return (
    <div className="swiggy-feed-container" style={{ maxWidth: '780px', paddingBottom: '90px' }}>
      <h2 className="swiggy-section-heading">My Account</h2>

      {/* 1. Profile Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #ebebeb',
        borderRadius: '20px',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1.5rem'
      }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img 
            src={user?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
            alt={user?.name} 
            style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }}
          />
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111' }}>
              {user?.name || 'Poshak Member'}
            </h3>
            <div style={{ fontSize: '0.82rem', color: '#686b78' }}>
              {user?.email || 'user@poshak.in'}
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: '#fff7ed',
              color: '#ea580c',
              fontSize: '0.72rem',
              fontWeight: '800',
              padding: '0.15rem 0.55rem',
              borderRadius: '9999px',
              marginTop: '0.35rem'
            }}>
              <Sparkles size={11} />
              <span>Poshak Gold Member</span>
            </div>
          </div>
        </div>

        <button 
          onClick={logout}
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            border: 'none',
            padding: '0.55rem 1rem',
            borderRadius: '9999px',
            fontSize: '0.82rem',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>

      <WalletCard user={user} demoBalance={walletBalance} onAddMoney={onAddMoney}>
        <ReferralAndPlans onWalletChanged={() => window.dispatchEvent(new Event('focus'))} />
      </WalletCard>

      {user?.isSupabase && (
        <div className="psk-wallet" style={{ cursor: 'pointer' }} onClick={onOpenHelp}>
          <div className="psk-wallet-head"><span><b>Help & complaints</b></span><strong style={{ fontSize: '0.9rem', color: '#fa5929' }}>Open →</strong></div>
          <p className="psk-wallet-note" style={{ marginBottom: 0 }}>Report a missing or damaged garment, ask about a bill, and track replies.</p>
        </div>
      )}

      <NotificationPrefs userId={user?.isSupabase ? user.id : null} defaultPhone={(addresses.find((a) => a.phone) || {}).phone} />

      {/* 3. Delivery Addresses */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #ebebeb',
        borderRadius: '20px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '800' }}>Saved Addresses</h3>
          <button 
            onClick={onOpenLocationPicker}
            style={{
              background: '#fa5929',
              color: '#ffffff',
              border: 'none',
              padding: '0.45rem 0.95rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer'
            }}
          >
            <Plus size={14} />
            <span>Add New</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {addresses.map((addr) => (
            <div 
              key={addr.id}
              style={{
                border: '1.5px solid',
                borderColor: addr.isDefault ? '#fa5929' : '#ebebeb',
                borderRadius: '14px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <MapPin size={15} color="#fa5929" />
                  <strong style={{ fontSize: '0.9rem' }}>{addr.label}</strong>
                  {addr.isDefault && (
                    <span style={{ background: '#fa5929', color: '#fff', fontSize: '0.65rem', fontWeight: '800', padding: '0.1rem 0.4rem', borderRadius: '9999px' }}>
                      DEFAULT
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#686b78', marginTop: '0.2rem' }}>
                  {addr.flatBuilding}, {addr.streetArea}, {addr.city} - {addr.pincode}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {!addr.isDefault && (
                  <button 
                    onClick={() => onSetDefaultAddress(addr.id)}
                    style={{ background: 'transparent', border: 'none', color: '#fa5929', fontSize: '0.76rem', fontWeight: '800', cursor: 'pointer' }}
                  >
                    Set Default
                  </button>
                )}
                {addresses.length > 1 && (
                  <button 
                    onClick={() => onDeleteAddress(addr.id)}
                    style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '0.76rem', fontWeight: '800', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Switch to Marketing Website */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #ebebeb',
        borderRadius: '20px',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem'
      }}>
        <div>
          <div style={{ fontWeight: '800', fontSize: '0.92rem' }}>Public Marketing Site</div>
          <div style={{ fontSize: '0.78rem', color: '#686b78' }}>View the full Framer-style landing page</div>
        </div>

        <button 
          onClick={onBackToLanding}
          style={{
            background: '#0a0a0a',
            color: '#ffffff',
            border: 'none',
            padding: '0.55rem 1.15rem',
            borderRadius: '9999px',
            fontSize: '0.82rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>View Site</span>
          <ExternalLink size={14} />
        </button>
      </div>

      {/* 5. DPDP Act, 2023 - Data Privacy & Statutory Rights Card */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #d1fae5',
        borderRadius: '20px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 16px rgba(16, 185, 129, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={18} color="#059669" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#065f46', margin: 0 }}>
                Data Privacy & Your Rights
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: '600' }}>
                Digital Personal Data Protection (DPDP) Act, 2023 Compliant
              </span>
            </div>
          </div>
          <span style={{
            background: '#ecfdf5',
            color: '#047857',
            fontSize: '0.68rem',
            fontWeight: '800',
            padding: '0.2rem 0.6rem',
            borderRadius: '9999px',
            border: '1px solid #a7f3d0'
          }}>
            DATA PRINCIPAL SAFEGUARD
          </span>
        </div>

        <p style={{ fontSize: '0.8rem', color: '#4b5563', lineHeight: '1.45', margin: '0 0 1.1rem 0' }}>
          Under India's DPDP Act, 2023, you have full control over your personal data processed by <strong>Poshak Technologies Private Limited</strong>. You can export a copy of your records, review our privacy notice, or erase your account data at any time.
        </p>

        {/* Action Row 1: Export & Notices */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem', marginBottom: '0.75rem' }}>
          <button 
            type="button"
            onClick={handleExportData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '0.75rem 0.95rem',
              borderRadius: '12px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Download size={16} color="#059669" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b' }}>
                Download My Data
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Export profile, orders & addresses (Sec 11)
              </div>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => setActiveLegalTab('dpdp')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '0.75rem 0.95rem',
              borderRadius: '12px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <FileText size={16} color="#2563eb" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b' }}>
                DPDP Privacy Notice
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                View data fiduciary details & retention (Sec 5)
              </div>
            </div>
          </button>
        </div>

        {/* Action Row 2: Terms & Grievance Officer */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem', marginBottom: '1rem' }}>
          <button 
            type="button"
            onClick={() => setActiveLegalTab('terms')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '0.75rem 0.95rem',
              borderRadius: '12px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <FileText size={16} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b' }}>
                Terms & Conditions
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Doorstep weighing, care & zero-advance policy
              </div>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => setActiveLegalTab('grievance')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '0.75rem 0.95rem',
              borderRadius: '12px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <ShieldCheck size={16} color="#7c3aed" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b' }}>
                Grievance Officer
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Email grievance@poshak.in (Sec 13)
              </div>
            </div>
          </button>
        </div>

        {/* Erasure Action (DPDP Section 12) */}
        <div style={{
          borderTop: '1px dashed #e2e8f0',
          paddingTop: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#991b1b', display: 'block' }}>
              Right to Erasure (DPDP Act Sec 12)
            </span>
            <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
              Permanently erase saved addresses, cart items, and profile from this device.
            </span>
          </div>

          <button 
            type="button"
            onClick={handleErasureRequest}
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Trash2 size={13} />
            <span>Erase My Data</span>
          </button>
        </div>
      </div>

      {/* DPDP Act 2023 & Legal Rights Modal */}
      <LegalModal 
        isOpen={Boolean(activeLegalTab)}
        initialTab={activeLegalTab || 'dpdp'}
        onClose={() => setActiveLegalTab(null)}
      />
    </div>
  );
};
