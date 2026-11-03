// Tiny CSV exporter: rows (array of objects) + columns [[header, row => value]].
const esc = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (rows, cols) =>
  [cols.map(([h]) => esc(h)).join(','), ...rows.map((r) => cols.map(([, f]) => esc(f(r))).join(','))].join('\r\n');

export const downloadCsv = (filename, rows, cols) => {
  const blob = new Blob(['﻿' + toCsv(rows, cols)], { type: 'text/csv;charset=utf-8' });   // BOM so Excel reads ₹ / Hindi names
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
export const inr2 = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const dt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
export const dOnly = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
