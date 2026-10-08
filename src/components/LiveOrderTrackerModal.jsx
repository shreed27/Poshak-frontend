import React from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  MessageSquare, 
  ShieldCheck, 
  Sparkles, 
  Zap, 
  Shirt, 
  Flame, 
  Truck, 
  PackageCheck,
  ChevronRight,
  Play
} from 'lucide-react';
import { useCart } from '../context/CartContext';

export const LiveOrderTrackerModal = () => {
  const { activeOrder, setActiveOrder, isTrackerOpen, setIsTrackerOpen } = useCart();

  if (!isTrackerOpen || !activeOrder) return null;

  const currentStepIdx = activeOrder.currentStep || 0;

  const handleSimulateNextStep = () => {
    setActiveOrder(prev => {
      const nextIdx = (prev.currentStep + 1) % prev.steps.length;
      const updatedSteps = prev.steps.map((step, idx) => ({
        ...step,
        done: idx <= nextIdx,
        active: idx === nextIdx
      }));
      return {
        ...prev,
        currentStep: nextIdx,
        steps: updatedSteps
      };
    });
  };

  const getStepIcon = (idx) => {
    switch (idx) {
      case 0: return <PackageCheck size={18} />;
      case 1: return <Shirt size={18} />;
      case 2: return <Sparkles size={18} />;
      case 3: return <Flame size={18} />;
      case 4: return <Truck size={18} />;
      case 5: return <CheckCircle2 size={18} />;
      default: return <Clock size={18} />;
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsTrackerOpen(false)}>
      <div className="tracker-modal-sheet glass-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tracker-header">
          <div className="tracker-title-col">
            <div className="live-pulse-badge">
              <span className="live-dot"></span>
              <span>LIVE TRACKER</span>
            </div>
            <h3 className="tracker-order-id">{activeOrder.orderId}</h3>
            <span className="tracker-partner-tag">{activeOrder.laundromatName} • {activeOrder.laundromatArea}</span>
          </div>
          <button className="modal-close-btn" onClick={() => setIsTrackerOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Live Status Highlight Banner */}
        <div className="tracker-eta-banner">
          <div className="eta-left">
            <span className="eta-label">Estimated Delivery</span>
            <span className="eta-time">{activeOrder.estimatedDelivery}</span>
          </div>
          <div className="eta-right">
            <span className="eta-items-tag">{activeOrder.totalItems}</span>
            <span className="eta-amount">₹{activeOrder.totalAmount}</span>
          </div>
        </div>

        {/* Simulated Map & Rider Details Card */}
        <div className="simulated-map-card">
          <div className="map-graphics">
            <div className="map-route-line"></div>
            <div className="map-point user-point">
              <MapPin size={16} />
              <span>You</span>
            </div>
            <div className="map-point hub-point">
              <Shirt size={16} />
              <span>{activeOrder.laundromatName.split(' ')[0]} Hub</span>
            </div>
            <div className="map-rider-marker move-rider">
              <Truck size={14} />
            </div>
          </div>

          <div className="rider-contact-bar">
            <div className="rider-avatar-wrap">
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" 
                alt="Poshak Rider" 
                className="rider-avatar" 
              />
              <div className="rider-badge-star">⭐ {activeOrder.riderRating}</div>
            </div>
            <div className="rider-info-col">
              <div className="rider-name">{activeOrder.riderName}</div>
              <div className="rider-vehicle">{activeOrder.riderVehicle}</div>
            </div>
            <div className="rider-actions">
              <a href={`tel:${activeOrder.riderPhone}`} className="rider-action-btn call" title="Call Captain">
                <Phone size={16} />
              </a>
              <button 
                className="rider-action-btn chat" 
                onClick={() => alert(`Connecting with Poshak WhatsApp Dispatch Support for Order ${activeOrder.orderId}`)}
                title="WhatsApp Message"
              >
                <MessageSquare size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Step-by-Step Live Timeline */}
        <div className="tracker-timeline-body">
          <h4 className="timeline-heading">Milestone Timeline</h4>
          <div className="timeline-steps-list">
            {activeOrder.steps.map((step, idx) => {
              const isDone = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div key={idx} className={`timeline-step-item ${isDone ? 'done' : ''} ${isCurrent ? 'active-pulse' : ''}`}>
                  <div className="step-icon-col">
                    <div className="step-circle">
                      {getStepIcon(idx)}
                    </div>
                    {idx < activeOrder.steps.length - 1 && <div className="step-connector"></div>}
                  </div>
                  <div className="step-content-col">
                    <div className="step-title-row">
                      <h5 className="step-label">{step.label}</h5>
                      <span className="step-time">{step.time}</span>
                    </div>
                    <p className="step-desc">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Demo Controller Button */}
        <div className="tracker-footer-simulation">
          <button className="simulate-step-btn" onClick={handleSimulateNextStep}>
            <Play size={14} />
            <span>Simulate Next Laundry Phase</span>
          </button>
          <div className="simulation-note">
            Testing Mode: Click to see progress update live
          </div>
        </div>
      </div>
    </div>
  );
};
