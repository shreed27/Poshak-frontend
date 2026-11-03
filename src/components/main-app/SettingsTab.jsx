import React, { useState } from 'react';
import { 
  MapPin, 
  Plus, 
  Trash2, 
  Check, 
  ShieldCheck, 
  SlidersHorizontal, 
  Bell, 
  User, 
  X,
  Phone
} from 'lucide-react';

export const SettingsTab = ({ 
  user, 
  addresses, 
  onAddAddress, 
  onDeleteAddress, 
  onSetDefaultAddress 
}) => {
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('Home');
  const [newFlat, setNewFlat] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newLandmark, setNewLandmark] = useState('');
  const [newPincode, setNewPincode] = useState('560038');

  // Preferences
  const [defaultStarch, setDefaultStarch] = useState('Mild Starch');
  const [defaultDetergent, setDefaultDetergent] = useState('Gentle Bio-Enzymes (RO Water)');
  const [defaultPackaging, setDefaultPackaging] = useState('Wooden Hangers (Steam Press)');
  const [whatsappUpdates, setWhatsappUpdates] = useState(true);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleCreateAddress = (e) => {
    e.preventDefault();
    if (!newFlat || !newStreet) return;

    const newAddr = {
      id: `addr-${Date.now()}`,
      label: newLabel,
      isDefault: addresses.length === 0,
      flatBuilding: newFlat,
      streetArea: newStreet,
      landmark: newLandmark,
      city: 'Bengaluru',
      pincode: newPincode || '560038',
      tag: newLabel
    };

    onAddAddress(newAddr);
    setIsAddAddressOpen(false);
    setNewFlat('');
    setNewStreet('');
    setNewLandmark('');
  };

  const handleSavePreferences = (e) => {
    e.preventDefault();
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  return (
    <div className="settings-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* 1. Saved Addresses Section */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '2rem',
        border: '1px solid rgba(10,10,10,0.08)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0a0a0a' }}>
              Saved Doorstep Addresses
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#666', marginTop: '0.2rem' }}>
              Manage your residential, office, and family addresses in Bengaluru
            </p>
          </div>

          <button 
            onClick={() => setIsAddAddressOpen(true)}
            style={{
              background: '#0a0a0a',
              color: '#ffffff',
              padding: '0.6rem 1.25rem',
              borderRadius: '9999px',
              fontSize: '0.84rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
          >
            <Plus size={15} />
            <span>Add New Address</span>
          </button>
        </div>

        {/* Addresses Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}>
          {addresses.map((addr) => (
            <div 
              key={addr.id}
              style={{
                border: '1.5px solid',
                borderColor: addr.isDefault ? '#fa5929' : '#e5e7eb',
                background: addr.isDefault ? 'rgba(250, 89, 41, 0.02)' : '#f9fafb',
                borderRadius: '16px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={16} color="#fa5929" />
                    <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#111' }}>
                      {addr.label}
                    </span>
                  </div>
                  {addr.isDefault && (
                    <span style={{
                      background: '#fa5929',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      textTransform: 'uppercase'
                    }}>
                      Default
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.85rem', color: '#333', lineHeight: 1.4, marginBottom: '0.35rem' }}>
                  {addr.flatBuilding}, {addr.streetArea}
                </div>
                {addr.landmark && (
                  <div style={{ fontSize: '0.78rem', color: '#666', fontStyle: 'italic' }}>
                    Landmark: {addr.landmark}
                  </div>
                )}
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#111', marginTop: '0.35rem' }}>
                  {addr.city} - {addr.pincode}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '1.25rem',
                paddingTop: '0.85rem',
                borderTop: '1px solid rgba(10,10,10,0.06)'
              }}>
                {!addr.isDefault ? (
                  <button 
                    onClick={() => onSetDefaultAddress(addr.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#fa5929',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Set as Default
                  </button>
                ) : (
                  <span style={{ fontSize: '0.76rem', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Check size={14} />
                    <span>Primary Pickup Location</span>
                  </span>
                )}

                {addresses.length > 1 && (
                  <button 
                    onClick={() => onDeleteAddress(addr.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '0.2rem'
                    }}
                    title="Delete address"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Default Fabric Care Preferences */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '2rem',
        border: '1px solid rgba(10,10,10,0.08)'
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0a0a0a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SlidersHorizontal size={20} color="#fa5929" />
            <span>Default Fabric Care Preferences</span>
          </h3>
          <p style={{ fontSize: '0.84rem', color: '#666', marginTop: '0.2rem' }}>
            These settings will be pre-filled automatically on every new pickup you schedule
          </p>
        </div>

        <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="prefs-row-grid">
            <div className="pref-input-group">
              <label>Default Starch Level</label>
              <select 
                className="pref-select-field"
                value={defaultStarch}
                onChange={(e) => setDefaultStarch(e.target.value)}
              >
                <option>No Starch (Soft Feel)</option>
                <option>Mild Starch (Natural Crisp)</option>
                <option>Medium Starch (Crisp Workwear)</option>
                <option>Stiff Hotel Starch (Heavy Cotton)</option>
              </select>
            </div>

            <div className="pref-input-group">
              <label>Default Washing Formula</label>
              <select 
                className="pref-select-field"
                value={defaultDetergent}
                onChange={(e) => setDefaultDetergent(e.target.value)}
              >
                <option>Gentle Bio-Enzymes (RO Water)</option>
                <option>Hypoallergenic & Baby Safe</option>
                <option>Fragrance-Free Sensitive</option>
                <option>Alpine Lavender Infusion</option>
              </select>
            </div>

            <div className="pref-input-group">
              <label>Default Packing</label>
              <select 
                className="pref-select-field"
                value={defaultPackaging}
                onChange={(e) => setDefaultPackaging(e.target.value)}
              >
                <option>Wooden Hangers (Steam Press)</option>
                <option>Vacuum Compact Fold</option>
                <option>Eco Cotton Fabric Hamper</option>
              </select>
            </div>
          </div>

          {/* WhatsApp toggle */}
          <div style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            padding: '1.15rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginTop: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Phone size={18} color="#10b981" />
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>WhatsApp Live Delivery Alerts</div>
                <div style={{ fontSize: '0.78rem', color: '#666' }}>Receive real-time rider tracking links and OTP verification on WhatsApp.</div>
              </div>
            </div>
            <input 
              type="checkbox"
              checked={whatsappUpdates}
              onChange={(e) => setWhatsappUpdates(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#fa5929', cursor: 'pointer' }}
            />
          </div>

          <div>
            <button 
              type="submit"
              style={{
                background: '#0a0a0a',
                color: '#ffffff',
                padding: '0.75rem 1.85rem',
                borderRadius: '9999px',
                fontSize: '0.88rem',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {savedFeedback ? 'Preferences Saved!' : 'Save Fabric Defaults'}
            </button>
          </div>
        </form>
      </div>

      {/* ADD ADDRESS MODAL */}
      {isAddAddressOpen && (
        <div 
          className="laundy-modal-backdrop"
          onClick={() => setIsAddAddressOpen(false)}
        >
          <div 
            className="laundy-booking-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', padding: '2rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '800' }}>Add New Doorstep Address</h3>
              <button 
                onClick={() => setIsAddAddressOpen(false)}
                style={{ background: '#f0f0f0', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAddress} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#555', display: 'block', marginBottom: '0.35rem' }}>
                  Address Label
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['Home', 'Work / Studio', 'Other'].map(lbl => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setNewLabel(lbl)}
                      style={{
                        padding: '0.45rem 1rem',
                        borderRadius: '9999px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        border: '1.5px solid',
                        borderColor: newLabel === lbl ? '#0a0a0a' : '#e5e7eb',
                        background: newLabel === lbl ? '#0a0a0a' : '#f9fafb',
                        color: newLabel === lbl ? '#ffffff' : '#444',
                        cursor: 'pointer'
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#555', display: 'block', marginBottom: '0.35rem' }}>
                  Flat / House / Floor / Building Name *
                </label>
                <input 
                  type="text" 
                  className="pref-select-field"
                  placeholder="e.g. Flat 304, Palm Grove Apts"
                  value={newFlat}
                  onChange={(e) => setNewFlat(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#555', display: 'block', marginBottom: '0.35rem' }}>
                  Street / Area / Layout *
                </label>
                <input 
                  type="text" 
                  className="pref-select-field"
                  placeholder="e.g. 12th Main Rd, HAL 2nd Stage, Indiranagar"
                  value={newStreet}
                  onChange={(e) => setNewStreet(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#555', display: 'block', marginBottom: '0.35rem' }}>
                    Nearby Landmark
                  </label>
                  <input 
                    type="text" 
                    className="pref-select-field"
                    placeholder="e.g. Near 100ft Road"
                    value={newLandmark}
                    onChange={(e) => setNewLandmark(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#555', display: 'block', marginBottom: '0.35rem' }}>
                    Pincode
                  </label>
                  <input 
                    type="text" 
                    className="pref-select-field"
                    placeholder="560038"
                    value={newPincode}
                    onChange={(e) => setNewPincode(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit"
                style={{
                  background: 'var(--laundy-orange, #fa5929)',
                  color: '#ffffff',
                  padding: '0.85rem',
                  borderRadius: '9999px',
                  fontWeight: '700',
                  fontSize: '0.92rem',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '0.5rem'
                }}
              >
                Save Delivery Address
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
