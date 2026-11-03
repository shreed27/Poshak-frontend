const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const inr = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Self-contained printable invoice (user picks "Save as PDF" in the print dialog).
export const invoiceHtml = (inv) => {
  const tax = inv.kind === 'tax_invoice';
  const s = inv.seller || {};
  const b = inv.buyer || {};
  const rows = (inv.lines || []).map((l, i) => `
    <tr><td>${i + 1}</td><td>${esc(l.description)}</td><td>${esc(l.sac)}</td><td class="r">${esc(l.qty)} ${esc(l.unit)}</td><td class="r">${inr(l.rate)}</td><td class="r">${inr(l.amount)}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(inv.invoice_no)}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px;font-size:13px}
  h1{margin:0;font-size:22px} .row{display:flex;justify-content:space-between;gap:24px;margin-top:18px}
  .muted{color:#666} table{width:100%;border-collapse:collapse;margin-top:20px}
  th,td{border-bottom:1px solid #ddd;padding:8px 6px;text-align:left} th{background:#f6f6f6;font-size:12px}
  .r{text-align:right} .tot td{border:none;padding:4px 6px} .grand td{font-weight:700;font-size:15px;border-top:2px solid #111}
  .tag{display:inline-block;background:#111;color:#fff;border-radius:4px;padding:2px 8px;font-size:11px;margin-left:8px}
  @media print{body{margin:12mm}}
</style></head><body>
  <div class="row"><div>
    <h1>${esc(s.legal_name || s.trade_name || 'Poshak')}</h1>
    <div class="muted">${esc(s.address)}</div>
    ${tax ? `<div>GSTIN: <b>${esc(s.gstin)}</b></div>` : ''}
    ${s.email ? `<div class="muted">${esc(s.email)} ${esc(s.phone)}</div>` : ''}
  </div><div class="r">
    <h1>${tax ? 'Tax Invoice' : 'Receipt'}</h1>
    <div>No: <b>${esc(inv.invoice_no)}</b></div>
    <div>Date: ${new Date(inv.issued_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
    <div>Order: ${esc(b.order_code)}</div>
  </div></div>
  <div class="row"><div><div class="muted">Billed to</div><b>${esc(b.name || b.email)}</b><div>${esc(b.address)}</div>${b.phone ? `<div>${esc(b.phone)}</div>` : ''}</div>
  <div class="r"><div class="muted">Place of supply</div><b>${esc(s.state || 'Karnataka')}</b>${!tax ? '<div class="muted">GST not applicable</div>' : ''}</div></div>
  <table><thead><tr><th>#</th><th>Description</th><th>SAC</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
  <table class="tot" style="width:46%;margin-left:auto">
    ${tax ? `<tr><td>Taxable value</td><td class="r">${inr(inv.taxable_value)}</td></tr>
    <tr><td>CGST @ ${Number(inv.gst_rate) / 2}%</td><td class="r">${inr(inv.cgst)}</td></tr>
    <tr><td>SGST @ ${Number(inv.gst_rate) / 2}%</td><td class="r">${inr(inv.sgst)}</td></tr>` : ''}
    <tr class="grand"><td>Total</td><td class="r">${inr(inv.total)}</td></tr>
  </table>
  <p class="muted" style="margin-top:28px">This is a computer-generated ${tax ? 'invoice' : 'receipt'} and needs no signature. Thank you for choosing ${esc(s.trade_name || 'Poshak')}.</p>
  <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
</body></html>`;
};

export const openInvoice = (inv) => {
  const w = window.open('', '_blank');
  if (!w) { alert('Allow pop-ups to open the invoice.'); return; }
  w.document.write(invoiceHtml(inv));
  w.document.close();
};
