import React, { useState } from 'react';
import { Tag, X, Check } from 'lucide-react';

// Applies a coupon; the server decides if it is valid (see usePriceQuote).
export const CouponBox = ({ applied, onApply, quote, enabled }) => {
  const [draft, setDraft] = useState('');
  if (!enabled) return null;
  if (applied) {
    return (
      <div className="psk-coupon applied">
        <Check size={15} />
        <span>
          <b>{applied}</b> {quote.couponError ? `— ${quote.couponError}` : quote.couponDiscount > 0 ? `applied: you save ₹${quote.couponDiscount}` : 'applied'}
        </span>
        <button type="button" onClick={() => onApply('')} aria-label="Remove coupon"><X size={14} /></button>
      </div>
    );
  }
  return (
    <form className="psk-coupon" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { onApply(draft.trim().toUpperCase()); setDraft(''); } }}>
      <Tag size={15} />
      <input value={draft} onChange={(e) => setDraft(e.target.value.toUpperCase())} placeholder="Have a coupon code?" maxLength={20} />
      <button type="submit" disabled={!draft.trim()}>Apply</button>
    </form>
  );
};
