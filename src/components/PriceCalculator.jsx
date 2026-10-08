import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Plus, 
  Minus, 
  Sparkles, 
  RotateCcw, 
  ArrowRight, 
  Check, 
  Zap, 
  Shirt, 
  Flame, 
  Crown, 
  Footprints, 
  Layers 
} from 'lucide-react';
import { CALCULATOR_GARMENTS } from '../data/mockData';
import { useCart } from '../context/CartContext';

const iconMap = {
  Shirt,
  Sparkles,
  Flame,
  Crown,
  Footprints,
  Layers
};

export const PriceCalculator = () => {
  const { addItem, setIsCartOpen } = useCart();
  const [selectedServiceMode, setSelectedServiceMode] = useState('wash-iron'); // 'wash-fold', 'wash-iron', 'blitz-6h', 'dry-clean'
  const [garmentCounts, setGarmentCounts] = useState({
    c1: 4, // 4 T-shirts
    c2: 3, // 3 Formal shirts
    c3: 2, // 2 Trousers
    c4: 1  // 1 Jeans
  });

  const serviceMultipliers = {
    'wash-fold': { name: 'Everyday Wash & Fold', ratePerKg: 49, time: '24 hrs', icon: 'Shirt' },
    'wash-iron': { name: 'Wash & Steam Iron', ratePerKg: 69, time: '24 hrs', icon: 'Sparkles' },
    'blitz-6h': { name: 'Express 6-Hr Blitz', ratePerKg: 99, time: '6 hrs', icon: 'Zap' },
    'dry-clean': { name: 'Piece-by-Piece Dry Clean', ratePerKg: null, time: '48 hrs', icon: 'Crown' }
  };

  const updateCount = (id, delta) => {
    setGarmentCounts(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const resetAll = () => {
    setGarmentCounts({});
  };

  const totals = useMemo(() => {
    let totalWeightKg = 0;
    let totalPieces = 0;
    let estimatedCost = 0;

    CALCULATOR_GARMENTS.forEach(item => {
      const count = garmentCounts[item.id] || 0;
      if (count > 0) {
        totalPieces += count;
        totalWeightKg += count * item.avgWeight;

        if (selectedServiceMode === 'dry-clean' || item.category === 'Dry Clean' || item.category === 'Footwear') {
          estimatedCost += count * item.defaultPrice;
        } else {
          // Weight based calculation with per-item minimum
          const serviceRate = serviceMultipliers[selectedServiceMode].ratePerKg || 69;
          estimatedCost += count * item.avgWeight * serviceRate;
        }
      }
    });

    const roundedWeight = Math.round(totalWeightKg * 10) / 10;
    const finalEstimatedPrice = Math.max(0, Math.round(estimatedCost));

    return {
      totalPieces,
      totalWeightKg: roundedWeight,
      finalEstimatedPrice: finalEstimatedPrice === 0 ? 0 : Math.max(149, finalEstimatedPrice)
    };
  }, [garmentCounts, selectedServiceMode]);

  const handleTransferToCart = () => {
    if (totals.totalPieces === 0) return;

    CALCULATOR_GARMENTS.forEach(item => {
      const count = garmentCounts[item.id] || 0;
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          addItem({
            id: `calc-${item.id}-${selectedServiceMode}`,
            name: `${item.name} (${serviceMultipliers[selectedServiceMode].name})`,
            price: Math.round(item.defaultPrice * (selectedServiceMode === 'wash-fold' ? 0.8 : selectedServiceMode === 'blitz-6h' ? 1.4 : 1)),
            unit: 'per piece',
            type: 'piece',
            icon: item.icon
          }, null);
        }
      }
    });

    setIsCartOpen(true);
  };

  return (
    <section id="calculator" className="calculator-section">
      <div className="section-container">
        <div className="section-header-center">
          <div className="section-sub-badge">
            <Calculator size={13} />
            <span>Interactive Estimator</span>
          </div>
          <h2 className="section-title">Instant Wardrobe Price Calculator</h2>
          <p className="section-desc">
            Pick your clothes to estimate laundry weight, duration, and exact cost before booking. Zero hidden charges.
          </p>
        </div>

        <div className="calculator-card glass-card">
          {/* Service Mode Selector Tabs */}
          <div className="calculator-service-tabs">
            {Object.entries(serviceMultipliers).map(([key, data]) => (
              <button
                key={key}
                className={`calc-service-tab ${selectedServiceMode === key ? 'active' : ''}`}
                onClick={() => setSelectedServiceMode(key)}
              >
                <div className="tab-title-row">
                  <span className="tab-name">{data.name}</span>
                  <span className="tab-time">{data.time}</span>
                </div>
                {data.ratePerKg && (
                  <span className="tab-rate">₹{data.ratePerKg}/kg</span>
                )}
              </button>
            ))}
          </div>

          <div className="calculator-grid">
            {/* Left Garments Selector */}
            <div className="garments-selector-col">
              <div className="garments-col-header">
                <span>Select Your Wardrobe Items</span>
                {totals.totalPieces > 0 && (
                  <button className="calc-reset-btn" onClick={resetAll}>
                    <RotateCcw size={13} />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              <div className="garments-items-grid">
                {CALCULATOR_GARMENTS.map(garment => {
                  const Icon = iconMap[garment.icon] || Shirt;
                  const count = garmentCounts[garment.id] || 0;

                  return (
                    <div key={garment.id} className={`garment-card ${count > 0 ? 'selected' : ''}`}>
                      <div className="garment-info-row">
                        <div className="garment-icon-box">
                          <Icon size={18} />
                        </div>
                        <div className="garment-text">
                          <span className="garment-name">{garment.name}</span>
                          <span className="garment-avg-wt">~{garment.avgWeight} kg/pc</span>
                        </div>
                      </div>

                      <div className="garment-counter-ctrl">
                        <button 
                          className="counter-btn" 
                          onClick={() => updateCount(garment.id, -1)}
                          disabled={count === 0}
                        >
                          <Minus size={13} />
                        </button>
                        <span className="counter-val">{count}</span>
                        <button 
                          className="counter-btn add" 
                          onClick={() => updateCount(garment.id, 1)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Summary Basket & Pricing Breakdown */}
            <div className="calculator-summary-col">
              <div className="summary-sticky-card glass-card">
                <div className="summary-header">
                  <Sparkles size={18} className="summary-sparkle" />
                  <h4>Estimated Basket Summary</h4>
                </div>

                <div className="summary-metrics-row">
                  <div className="summary-metric-box">
                    <span className="metric-label">Total Clothes</span>
                    <span className="metric-val">{totals.totalPieces} <small>pcs</small></span>
                  </div>
                  <div className="summary-metric-box">
                    <span className="metric-label">Estimated Weight</span>
                    <span className="metric-val">{totals.totalWeightKg} <small>kg</small></span>
                  </div>
                </div>

                <div className="summary-breakdown-list">
                  <div className="breakdown-item">
                    <span>Selected Service</span>
                    <strong>{serviceMultipliers[selectedServiceMode].name}</strong>
                  </div>
                  <div className="breakdown-item">
                    <span>Estimated Turnaround</span>
                    <strong>{serviceMultipliers[selectedServiceMode].time}</strong>
                  </div>
                  <div className="breakdown-item">
                    <span>Doorstep Pickup & Drop</span>
                    <strong className="text-green">FREE (Orders &gt; ₹149)</strong>
                  </div>
                  <div className="breakdown-item">
                    <span>Hygiene Sterilization</span>
                    <strong className="text-green">Included</strong>
                  </div>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-price-total-row">
                  <div>
                    <span className="total-label">Estimated Total</span>
                    <div className="total-subtext">Inclusive of GST & Doorstep Scale Sync</div>
                  </div>
                  <div className="total-price-tag">
                    ₹{totals.finalEstimatedPrice}
                  </div>
                </div>

                <button 
                  className="btn-primary-hero calc-submit-btn"
                  disabled={totals.totalPieces === 0}
                  onClick={handleTransferToCart}
                >
                  <span>Schedule Pickup with this Basket</span>
                  <ArrowRight size={16} />
                </button>

                <p className="summary-guarantee-note">
                  🔒 Zero-risk: Final bill will be verified on the digital scale at your doorstep.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
