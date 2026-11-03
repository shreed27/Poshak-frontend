import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { SlotPicker } from './SlotPicker';

// kind: 'pickup' (before the captain collects) or 'delivery' (after pickup)
export const RescheduleModal = ({ order, kind, onClose, onDone }) => {
  const [slot, setSlot] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true); setError('');
    const { error: err } = await supabase.rpc(kind === 'pickup' ? 'reschedule_pickup' : 'reschedule_delivery', { p_id: order.dbId, p_date: slot.date, p_window: slot.win });
    setBusy(false);
    if (err) { setError(err.message); return; }
    onDone?.(); onClose();
  };
  return (
    <div className="swiggy-cart-modal-backdrop" onClick={onClose} style={{ justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
      <motion.div className="psk-loc-modal" onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        <div className="psk-loc-head"><h3>{kind === 'pickup' ? 'Change pickup time' : 'Choose delivery time'}</h3><button className="psk-icon-btn" onClick={onClose}><X size={16} /></button></div>
        <div className="psk-loc-body">
          <p className="psk-small">Order #{order.orderId}{kind === 'pickup' ? ` · ${Math.max(0, 2 - order.rescheduleCount)} change(s) left` : ''}</p>
          <SlotPicker value={slot} onChange={setSlot} />
          {error && <p className="psk-pref-err">{error}</p>}
          <button className="psk-btn-primary" disabled={!slot || busy} onClick={save}>{busy ? 'Saving…' : 'Confirm'}</button>
        </div>
      </motion.div>
    </div>
  );
};
