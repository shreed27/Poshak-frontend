import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { MOCK_ACTIVE_ORDER } from '../data/mockData';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('poshak_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedPartner, setSelectedPartner] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('Flat 402, Green Glen Layout, Bellandur, Bengaluru');
  const [selectedSlot, setSelectedSlot] = useState('Today, Within 30 Mins (Instant Express)');
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');
  const [isExpressBlitz, setIsExpressBlitz] = useState(false);
  const [laundryNotes, setLaundryNotes] = useState('');
  
  // Active tracking order state
  const [activeOrder, setActiveOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('poshak_active_order');
      return saved ? JSON.parse(saved) : MOCK_ACTIVE_ORDER;
    } catch {
      return MOCK_ACTIVE_ORDER;
    }
  });
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('poshak_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    if (activeOrder) {
      localStorage.setItem('poshak_active_order', JSON.stringify(activeOrder));
    }
  }, [activeOrder]);

  const addItem = (item, partner = null) => {
    if (partner && selectedPartner && selectedPartner.id !== partner.id) {
      // Switching partner prompt or reset
      if (window.confirm(`Your cart has items from ${selectedPartner.name}. Would you like to clear cart and start with ${partner.name}?`)) {
        setCartItems([{ ...item, quantity: 1 }]);
        setSelectedPartner(partner);
        setIsCartOpen(true);
        return;
      } else {
        return;
      }
    }

    if (partner && !selectedPartner) {
      setSelectedPartner(partner);
    }

    setCartItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (itemId, change) => {
    setCartItems(prev => {
      return prev
        .map(item => {
          if (item.id === itemId) {
            const newQty = item.quantity + change;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const removeItem = (itemId) => {
    setCartItems(prev => prev.filter(i => i.id !== itemId));
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedPartner(null);
    setAppliedDiscount(0);
    setPromoCode('');
    setPromoMessage('');
  };

  const applyPromo = (code) => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed === 'FIRSTWASH' || trimmed === 'POSHAK100') {
      setAppliedDiscount(100);
      setPromoMessage('✨ Code applied! ₹100 Flat Savings');
      return true;
    } else if (trimmed === 'SNEAKER40') {
      setAppliedDiscount(120);
      setPromoMessage('👟 Sneaker care discount of ₹120 applied!');
      return true;
    } else {
      setPromoMessage('❌ Invalid coupon code');
      setAppliedDiscount(0);
      return false;
    }
  };

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryFee = subtotal > 199 || cartItems.length === 0 ? 0 : 35;
  const expressFee = isExpressBlitz ? 49 : 0;
  const taxes = Math.round(subtotal * 0.05); // 5% GST
  const finalTotal = Math.max(0, subtotal + deliveryFee + expressFee + taxes - appliedDiscount);

  const placeOrder = () => {
    if (cartItems.length === 0) return;

    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    const newOrder = {
      orderId: `PSK-${Math.floor(10000 + Math.random() * 90000)}`,
      laundromatName: selectedPartner ? selectedPartner.name : 'Poshak Express Central Hub',
      laundromatArea: selectedPartner ? selectedPartner.area : 'Indiranagar',
      serviceType: cartItems.map(i => i.name).slice(0, 2).join(' + ') + (cartItems.length > 2 ? ` + ${cartItems.length - 2} more` : ''),
      totalItems: `${cartItems.reduce((a, b) => a + b.quantity, 0)} items`,
      totalAmount: finalTotal,
      placedTime: 'Just Now',
      estimatedDelivery: isExpressBlitz ? 'In 6 Hours (Blitz)' : 'Tomorrow by 4:00 PM',
      currentStep: 0,
      riderName: 'Vikram Singh (Poshak Captain)',
      riderRating: '4.9 ★',
      riderPhone: '+91 98765 43210',
      riderVehicle: 'Poshak EV Scooter (KA-01-EQ-9812)',
      steps: [
        { label: 'Order Confirmed', time: 'Just Now', desc: 'Partner assigned and digital tamper hamper dispatched', done: true, active: true },
        { label: 'Captain Pickup in Progress', time: 'In 15 mins', desc: 'Rider arriving with digital doorstep scale', done: false },
        { label: 'Fabric Spa & Sterilization', time: 'Pending', desc: 'Gentle RO water & bio-enzyme cycle', done: false },
        { label: 'Italian Steam Press', time: 'Pending', desc: 'Zero wrinkle boiler steam press', done: false },
        { label: 'Out for Delivery', time: 'Pending', desc: 'Express drop at your doorstep', done: false },
        { label: 'Delivered Clean & Fresh', time: 'Pending', desc: 'Enjoy your clean wardrobe', done: false }
      ]
    };

    setActiveOrder(newOrder);
    setIsCartOpen(false);
    clearCart();
    setIsTrackerOpen(true);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        selectedPartner,
        isCartOpen,
        setIsCartOpen,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        selectedAddress,
        setSelectedAddress,
        selectedSlot,
        setSelectedSlot,
        promoCode,
        setPromoCode,
        appliedDiscount,
        promoMessage,
        applyPromo,
        isExpressBlitz,
        setIsExpressBlitz,
        laundryNotes,
        setLaundryNotes,
        subtotal,
        deliveryFee,
        expressFee,
        taxes,
        finalTotal,
        placeOrder,
        activeOrder,
        setActiveOrder,
        isTrackerOpen,
        setIsTrackerOpen
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
