import React, { useState } from 'react';
import { 
  User, 
  Wallet, 
  MapPin, 
  Sparkles, 
  Plus, 
  ExternalLink, 
  LogOut, 
  Check, 
  X 
} from 'lucide-react';

export const MobileAccountView = ({ 
  user, 
  walletBalance, 
  onAddMoney, 
  addresses, 
  onAddAddress, 
  onSetDefaultAddress, 
  onBackToLanding, 
  logout 
}) => {
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('Home');
  const [newFlat, setNewFlat] = useState('');
  const [newStreet, setNewStreet] = useState('');

  const handleCreateAddress = (e) => {
    e.preventDefault();
    if (!newFlat || !newStreet) return;
    onAddAddress({
      id: `addr-${Date.now()}`,
      label: newLabel,
      isDefault: addresses.length === 0,
      flatBuilding: newFlat,
      streetArea: newStreet,
      city: 'Bengaluru',
      pincode: '560038'
    });
    setIsAddAddressOpen(false);
    setNewFlat('');
    setNewStreet('');
  };

  return (
    <div>
      <h1 className="mobile-hero-title" style={{ marginBottom: '1.25rem' }}>
        Profile &<br />Account
      </h1>

      {/* 1. Profile Summary Card */}
      <div style={{
        background: 'var(--pastel-blue-hero)',
        borderRadius: '26px',
        padding: '1.35rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <img 
          src={user?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
          alt={user?.name} 
          style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover' }}
        />
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111' }}>
            {user?.name || 'Poshak Member'}
          </h3>
          <div style={{ fontSize: '0.78rem', color: '#555' }}>
            {user?.email || 'user@poshak.in'}
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            background: '#ffffff',
            color: '#fa5929',
            fontSize: '0.7rem',
            fontWeight: '800',
            padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
            marginTop: '0.35rem'
          }}>
            <Sparkles size={11} />
            <span>Poshak Gold Member</span>
          </div>
        </div>
      </div>

      {/* 2. Wallet Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--mobile-border-light)',
        borderRadius: '24px',
        padding: '1.25rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '800', fontSize: '0.9rem' }}>
            <Wallet size={17} color="#fa5929" />
            <span>Poshak Wallet</span>
          </div>
          <span style={{ fontSize: '1.3rem', fontWeight: '900', color: '#111' }}>
            ₹{walletBalance}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => onAddMoney(500)}
            style={{ flex: 1, background: '#f8f9fa', border: '1px solid #e5e7eb', padding: '0.55rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
          >
            + ₹500 (+₹50)
          </button>
          <button 
            onClick={() => onAddMoney(1000)}
            style={{ flex: 1, background: '#f8f9fa', border: '1px solid #e5e7eb', padding: '0.55rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
          >
            + ₹1000 (+₹150)
          </button>
        </div>
      </div>

      {/* 3. Delivery Addresses Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--mobile-border-light)',
        borderRadius: '24px',
        padding: '1.25rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <strong style={{ fontSize: '0.92rem' }}>Saved Addresses</strong>
          <button 
            onClick={() => setIsAddAddressOpen(true)}
            style={{ background: 'transparent', border: 'none', color: '#fa5929', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
          >
            <Plus size={13} />
            <span>Add</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {addresses.map((addr) => (
            <div 
              key={addr.id}
              style={{
                border: '1.5px solid',
                borderColor: addr.isDefault ? '#fa5929' : '#f0f0f0',
                borderRadius: '12px',
                padding: '0.65rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontWeight: '800', fontSize: '0.84rem' }}>{addr.label}</div>
                <div style={{ fontSize: '0.74rem', color: '#686b78' }}>{addr.flatBuilding}, {addr.streetArea}</div>
              </div>
              {!addr.isDefault && (
                <button 
                  onClick={() => onSetDefaultAddress(addr.id)}
                  style={{ background: 'transparent', border: 'none', color: '#fa5929', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
                >
                  Set Default
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Switch to Marketing Landing Page */}
      <button 
        onClick={onBackToLanding}
        className="hero-secondary-btn"
        style={{ marginBottom: '0.65rem', padding: '0.8rem' }}
      >
        <ExternalLink size={15} />
        <span>View Public Marketing Website</span>
      </button>

      {/* 5. Sign Out Button */}
      <button 
        onClick={logout}
        style={{
          width: '100%',
          background: '#fee2e2',
          color: '#dc2626',
          border: 'none',
          padding: '0.8rem',
          borderRadius: '9999px',
          fontWeight: '800',
          fontSize: '0.86rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          cursor: 'pointer'
        }}
      >
        <LogOut size={15} />
        <span>Sign Out</span>
      </button>

      {/* Add Address Sheet */}
      {isAddAddressOpen && (
        <div className="mobile-bottom-sheet-backdrop" onClick={() => setIsAddAddressOpen(false)}>
          <div className="mobile-bottom-sheet-card" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle-pill"></div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '1rem' }}>Add Address</h3>
            <form onSubmit={handleCreateAddress} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <input 
                type="text" 
                placeholder="Flat / Building name" 
                value={newFlat} 
                onChange={(e) => setNewFlat(e.target.value)} 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e5e7eb', outline: 'none' }} 
                required 
              />
              <input 
                type="text" 
                placeholder="Street / Area" 
                value={newStreet} 
                onChange={(e) => setNewStreet(e.target.value)} 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e5e7eb', outline: 'none' }} 
                required 
              />
              <button className="hero-primary-btn" type="submit" style={{ marginTop: '0.5rem' }}>Save Address</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
