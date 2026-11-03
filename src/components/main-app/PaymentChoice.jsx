import React from 'react';
import { Banknote, CreditCard } from 'lucide-react';

// How the customer wants to pay. COD = cash or UPI QR shown by the captain at delivery.
export const PaymentChoice = ({ value, onChange, onlineEnabled }) => (
  <div className="psk-paychoice">
    <div className="psk-paychoice-title">How would you like to pay?</div>
    <button type="button" className={`psk-pay-opt ${value === 'cod' ? 'on' : ''}`} onClick={() => onChange('cod')}>
      <Banknote size={18} />
      <div>
        <strong>Pay on delivery</strong>
        <span>Cash, or scan the UPI QR your captain shows. Final bill is set after weighing.</span>
      </div>
    </button>
    <button
      type="button"
      className={`psk-pay-opt ${value === 'online' ? 'on' : ''}`}
      onClick={() => onlineEnabled && onChange('online')}
      disabled={!onlineEnabled}
    >
      <CreditCard size={18} />
      <div>
        <strong>Pay online now</strong>
        <span>{onlineEnabled ? 'UPI, cards or netbanking via Razorpay. Any difference after weighing is settled at delivery.' : 'Available once payments are connected.'}</span>
      </div>
    </button>
  </div>
);
