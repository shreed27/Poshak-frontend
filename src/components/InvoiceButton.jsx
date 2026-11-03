import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { openInvoice } from '../lib/invoiceHtml';

export const InvoiceButton = ({ orderId, className = 'psk-report-btn' }) => {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const open = async () => {
    setBusy(true); setMsg('');
    const { data } = await supabase.from('invoices').select('*').eq('order_id', orderId).maybeSingle();
    setBusy(false);
    if (!data) { setMsg('Invoice not ready yet'); return; }
    openInvoice(data);
  };
  return <><button type="button" className={className} onClick={open} disabled={busy}><FileText size={12} style={{ verticalAlign: '-2px' }} /> {busy ? 'Opening…' : 'Invoice'}</button>{msg && <small style={{ color: '#b91c1c', marginLeft: 6 }}>{msg}</small>}</>;
};
