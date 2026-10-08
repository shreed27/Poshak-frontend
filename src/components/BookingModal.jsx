import React, { useState } from 'react';
import { X, Check, Clock, MapPin, Calendar, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { LAUNDY_SERVICES } from '../data/laundyData';
import { useAuth } from '../context/AuthContext';

export const BookingModal = ({ isOpen, onClose, defaultService = null }) => {
  const { user, isAuthenticated, openLoginModal } = useAuth();
  const [selectedServiceId, setSelectedServiceId] = useState(defaultService ? defaultService.id : 'wash-service');
  const [address, setAddress] = useState('12th Main Rd, HAL 2nd Stage, Indiranagar, Bengaluru - 560038');
  const [slot, setSlot] = useState('Today, 2:00 PM - 4:00 PM');
  const [specialNotes, setSpecialNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    const refNumber = `PSK-${Math.floor(10000 + Math.random() * 90000)}`;
    setBookingRef(refNumber);
    setIsSuccess(true);
  };

  const handleReset = () => {
    setIsSuccess(false);
    onClose();
  };

  const currentService = LAUNDY_SERVICES.find(s => s.id === selectedServiceId) || LAUNDY_SERVICES[0];

  return (
    <div className="laundy-modal-backdrop" onClick={onClose}>
      <div className="laundy-booking-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="laundy-modal-close-btn" onClick={onClose} aria-label="Close booking modal">
          <X size={20} />
        </button>

        {!isSuccess ? (
          <>
            <div className="booking-modal-header">
              <div className="booking-badge">
                <Sparkles size={14} />
                <span>ONLINE BOOKING</span>
              </div>
              <h3 className="booking-title">Schedule Laundry Pickup</h3>
              <p className="booking-subtitle">
                Select your service, choose a convenient doorstep slot, and our courier will handle the rest.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="booking-form">
              {/* Service Selection */}
              <div className="booking-form-group">
                <label>Select Service</label>
                <select 
                  value={selectedServiceId} 
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="booking-select"
                >
                  {LAUNDY_SERVICES.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.price} • {s.turnaround})
                    </option>
                  ))}
                </select>
              </div>

              {/* Address */}
              <div className="booking-form-group">
                <label>Bengaluru Pickup & Delivery Address</label>
                <div className="booking-input-wrap">
                  <MapPin size={16} className="input-icon" />
                  <input 
                    type="text" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House/Flat No, Tech Park/Street, Locality (e.g. HSR, Indiranagar, Whitefield)"
                    required
                  />
                </div>
              </div>

              {/* Slot */}
              <div className="booking-form-group">
                <label>Preferred Pickup Window</label>
                <div className="booking-input-wrap">
                  <Clock size={16} className="input-icon" />
                  <select 
                    value={slot} 
                    onChange={(e) => setSlot(e.target.value)}
                    className="booking-select-embedded"
                  >
                    <option value="Today, In 30 Mins (Express Bengaluru Rider)">Today, In 30 Mins (Express Bengaluru Rider)</option>
                    <option value="Today, 2:00 PM - 4:00 PM">Today, 2:00 PM - 4:00 PM</option>
                    <option value="Today, 6:00 PM - 8:00 PM">Today, 6:00 PM - 8:00 PM</option>
                    <option value="Tomorrow, 8:00 AM - 10:00 AM">Tomorrow, 8:00 AM - 10:00 AM</option>
                    <option value="Tomorrow, 3:00 PM - 5:00 PM">Tomorrow, 3:00 PM - 5:00 PM</option>
                  </select>
                </div>
              </div>

              {/* Special Instructions */}
              <div className="booking-form-group">
                <label>Special Fabric Notes (Optional)</label>
                <input 
                  type="text" 
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="e.g. Silk saree dry clean, organic starch on cotton shirts, separate colored towels..."
                  className="booking-notes-input"
                />
              </div>

              {/* User Sign In Notice */}
              {!isAuthenticated && (
                <div className="booking-auth-notice" onClick={openLoginModal}>
                  <div className="auth-notice-text">
                    <strong>Sign in with Google</strong> to save Bengaluru addresses & track rider live.
                  </div>
                  <span className="auth-notice-link">Sign In →</span>
                </div>
              )}

              {/* Submit CTA */}
              <button type="submit" className="laundy-pill-btn-orange full-width submit-btn">
                <span>{isAuthenticated ? 'Confirm Bengaluru Pickup' : 'Continue with Google Sign-In'}</span>
                <ArrowRight size={16} />
              </button>

              <div className="booking-guarantee-row">
                <ShieldCheck size={14} className="text-green" />
                <span>Zero pre-payment required. Pay via UPI (GPay/PhonePe) or Cash on delivery.</span>
              </div>
            </form>
          </>
        ) : (
          <div className="booking-success-view">
            <div className="success-icon-wrap">
              <Check size={36} />
            </div>
            <h3 className="success-title">Pickup Scheduled!</h3>
            <div className="success-ref-pill">Ref #{bookingRef}</div>
            <p className="success-desc">
              Your pickup for <strong>{currentService.name}</strong> has been confirmed for <strong>{slot}</strong>.
            </p>
            <div className="success-address-card">
              <MapPin size={16} />
              <span>{address}</span>
            </div>
            <button className="laundy-pill-btn-orange" onClick={handleReset}>
              <span>Back to Poshak</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
