import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Star, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Filter, 
  Tag 
} from 'lucide-react';
import { LAUNDROMATS } from '../../data/mockData';

export const StudiosTab = ({ onSelectStudioToBook }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');

  const filterTags = [
    'All',
    'Fastest in Town',
    'Luxury Care',
    'Sneaker Specialists',
    'Hostel / Bulk Deals',
    'Wedding Wear'
  ];

  const filteredStudios = LAUNDROMATS.filter(studio => {
    const matchesSearch = 
      studio.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studio.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studio.specialties.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = 
      selectedTag === 'All' || 
      studio.tags.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  return (
    <div className="studios-tab-content">
      {/* Header & Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 className="section-main-heading">Neighborhood Fabric Studios</h2>
          <p style={{ fontSize: '0.88rem', color: '#666', marginTop: '0.2rem' }}>
            Browse verified commercial laundromats & boutique dry clean ateliers across Bengaluru
          </p>
        </div>

        {/* Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#ffffff',
          border: '1.5px solid #e5e7eb',
          borderRadius: '9999px',
          padding: '0.55rem 1.15rem',
          width: '320px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <Search size={16} color="#888" />
          <input 
            type="text" 
            placeholder="Search by area or studio name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '0.86rem',
              width: '100%',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Filter Chips Row */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
        marginBottom: '2rem',
        scrollbarWidth: 'none'
      }}>
        {filterTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: '700',
              border: '1.5px solid',
              borderColor: selectedTag === tag ? '#0a0a0a' : '#e5e7eb',
              background: selectedTag === tag ? '#0a0a0a' : '#ffffff',
              color: selectedTag === tag ? '#ffffff' : '#444',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Studios Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '1.75rem'
      }}>
        {filteredStudios.map((studio) => (
          <div 
            key={studio.id}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              border: '1px solid rgba(10,10,10,0.08)',
              overflow: 'hidden',
              boxShadow: '0 6px 24px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.2s ease'
            }}
          >
            <div>
              {/* Studio Banner Image */}
              <div style={{ height: '180px', position: 'relative' }}>
                <img 
                  src={studio.image} 
                  alt={studio.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: '#ffffff',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  <span>{studio.rating}</span>
                  <span style={{ color: '#777', fontWeight: 'normal' }}>({studio.reviewsCount})</span>
                </div>

                {studio.offers && studio.offers.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    background: 'rgba(10, 10, 10, 0.85)',
                    backdropFilter: 'blur(8px)',
                    color: '#ffffff',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '8px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <Tag size={12} color="#fa5929" />
                    <span>{studio.offers[0]}</span>
                  </div>
                )}
              </div>

              {/* Studio Details Body */}
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0a0a0a' }}>
                    {studio.name}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem', color: '#666', marginBottom: '1rem' }}>
                  <MapPin size={14} color="#fa5929" />
                  <span>{studio.area} • {studio.distance}</span>
                </div>

                {/* Specialties Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
                  {studio.specialties.map((spec, i) => (
                    <span 
                      key={i}
                      style={{
                        background: '#f4f5f7',
                        color: '#333',
                        fontSize: '0.74rem',
                        fontWeight: '600',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '8px'
                      }}
                    >
                      {spec}
                    </span>
                  ))}
                </div>

                {/* Featured Menu items */}
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#888', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Popular Services
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {studio.menu.slice(0, 3).map((item) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                        <span style={{ color: '#444' }}>{item.name}</span>
                        <strong style={{ color: '#0a0a0a' }}>₹{item.price} {item.unit}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Booking Button */}
            <div style={{ padding: '0 1.5rem 1.5rem' }}>
              <button 
                onClick={() => onSelectStudioToBook(studio)}
                style={{
                  width: '100%',
                  background: '#0a0a0a',
                  color: '#ffffff',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>Book Pickup with {studio.name.split(' ')[0]}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
