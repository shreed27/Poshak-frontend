import React, { useState } from 'react';
import { Search, Star, MapPin, ArrowRight, X } from 'lucide-react';
import { LAUNDROMATS } from '../../data/mockData';

export const MobileSearchView = ({ onSelectStudio }) => {
  const [search, setSearch] = useState('');

  const filtered = LAUNDROMATS.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.area.toLowerCase().includes(search.toLowerCase()) ||
    l.specialties.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <h1 className="mobile-hero-title" style={{ marginBottom: '1rem' }}>
        Explore Studios &<br />Services
      </h1>

      {/* Search Input */}
      <div style={{
        position: 'relative',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Search size={16} style={{ position: 'absolute', left: '1rem', color: '#888' }} />
        <input 
          type="text" 
          placeholder="Search Indiranagar, suits, sneakers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: '#ffffff',
            border: '1.5px solid var(--mobile-border-light)',
            borderRadius: '16px',
            padding: '0.75rem 1rem 0.75rem 2.6rem',
            fontSize: '0.88rem',
            color: '#111',
            outline: 'none'
          }}
        />
        {search && (
          <button 
            onClick={() => setSearch('')}
            style={{ position: 'absolute', right: '12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#888' }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Studios List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filtered.map((studio) => (
          <div 
            key={studio.id}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              border: '1px solid var(--mobile-border-light)',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ height: '140px', position: 'relative' }}>
              <img src={studio.image} alt={studio.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: '#ffffff',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                fontSize: '0.74rem',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <Star size={12} fill="#f59e0b" color="#f59e0b" />
                <span>{studio.rating}</span>
              </div>
            </div>

            <div style={{ padding: '1.15rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#111', marginBottom: '0.2rem' }}>
                {studio.name}
              </h3>
              <div style={{ fontSize: '0.78rem', color: '#686b78', marginBottom: '0.85rem' }}>
                {studio.area} • {studio.pickupTime}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
                {studio.specialties.slice(0, 2).map((s, idx) => (
                  <span key={idx} style={{ background: '#f4f5f7', color: '#333', fontSize: '0.72rem', fontWeight: '600', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                    {s}
                  </span>
                ))}
              </div>

              <button 
                onClick={() => onSelectStudio(studio)}
                className="hero-primary-btn"
                style={{ marginBottom: 0, padding: '0.75rem', fontSize: '0.86rem' }}
              >
                <span>Book with this Studio</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
