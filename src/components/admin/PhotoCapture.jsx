import React, { useRef, useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { uploadOrderPhoto } from '../../lib/photos';

// Camera/gallery picker that uploads straight to the order's private folder.
// value = [{ path, preview }]
export const PhotoCapture = ({ orderId, label, value, onChange, max = 4 }) => {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const add = async (files) => {
    setBusy(true); setError('');
    try {
      const added = [];
      for (const f of Array.from(files).slice(0, max - value.length)) {
        const path = await uploadOrderPhoto(orderId, f, label);
        added.push({ path, preview: URL.createObjectURL(f) });
      }
      onChange([...value, ...added]);
    } catch (e) { setError(e.message || 'Upload failed'); }
    setBusy(false);
    if (ref.current) ref.current.value = '';
  };

  return (
    <div className="cap-photos">
      {value.map((p, i) => (
        <div key={p.path} className="cap-photo">
          <img src={p.preview} alt={`${label} ${i + 1}`} />
          <button type="button" onClick={() => onChange(value.filter((x) => x.path !== p.path))} aria-label="Remove photo"><X size={12} /></button>
        </div>
      ))}
      {value.length < max && (
        <button type="button" className="cap-photo-add" onClick={() => ref.current?.click()} disabled={busy}>
          {busy ? <Loader2 size={18} className="psk-spin" /> : <Camera size={18} />}
          <span>{busy ? 'Uploading…' : 'Add photo'}</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => e.target.files && add(e.target.files)} />
      {error && <div className="ops-error" style={{ margin: '0.4rem 0 0', flexBasis: '100%' }}>{error}</div>}
    </div>
  );
};

export const GARMENTS = ['Shirts', 'T-shirts', 'Trousers', 'Jeans', 'Kurtas', 'Sarees', 'Bedsheets', 'Towels', 'Others'];

// Counters per garment type → checklist + total piece count.
export const GarmentChecklist = ({ counts, onChange }) => (
  <div className="cap-garments">
    {GARMENTS.map((g) => (
      <div key={g} className={`cap-garment ${counts[g] ? 'on' : ''}`}>
        <span>{g}</span>
        <div>
          <button type="button" onClick={() => onChange({ ...counts, [g]: Math.max(0, (counts[g] || 0) - 1) })}>−</button>
          <b>{counts[g] || 0}</b>
          <button type="button" onClick={() => onChange({ ...counts, [g]: (counts[g] || 0) + 1 })}>+</button>
        </div>
      </div>
    ))}
  </div>
);

export const checklistFrom = (counts) => Object.entries(counts).filter(([, n]) => n > 0).map(([type, count]) => ({ type, count }));
export const totalPieces = (counts) => Object.values(counts).reduce((a, n) => a + n, 0);
