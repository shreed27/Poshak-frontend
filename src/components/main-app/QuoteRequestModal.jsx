import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Camera, Loader2, CheckCircle2, AlertCircle, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../lib/photos';
import { useEscape } from '../../lib/useEscape';
import './Quotes.css';

const IDEAS = ['Shorten trouser hems', 'Dry clean a saree', 'Suit / blazer dry clean', 'Blouse or kurta fitting', 'Lehenga / sherwani care', 'Replace a zip'];

// "Alteration & Dry Cleaning" has no fixed price: the customer describes the job, we reply with a price they can accept.
export const QuoteRequestModal = ({ address, onClose }) => {
  useEscape(true, onClose);
  const [text, setText] = useState('');
  const [phone, setPhone] = useState(address?.phone || '');
  const [photos, setPhotos] = useState([]);                    // { path, preview }
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null);
  const file = useRef(null);

  const phoneOk = /^[6-9]\d{9}$/.test(phone);
  const textOk = text.trim().length >= 10;

  const addPhotos = async (e) => {
    const files = [...(e.target.files || [])].slice(0, 4 - photos.length);
    if (!files.length) return;
    setUploading(true); setError('');
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      const added = [];
      for (const f of files) {
        const blob = await compressImage(f, 1400, 0.78);
        const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
        const { error: up } = await supabase.storage.from('quote-photos').upload(path, blob, { contentType: 'image/jpeg' });
        if (up) throw up;
        added.push({ path, preview: URL.createObjectURL(blob) });
      }
      setPhotos((p) => [...p, ...added]);
    } catch (err) { setError(err.message || 'Could not upload the photo'); }
    setUploading(false);
    if (file.current) file.current.value = '';
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!textOk || !phoneOk || !address || busy) return;
    setBusy(true); setError('');
    const full = [address.flatBuilding, address.streetArea, address.city].filter(Boolean).join(', ') + (address.pincode ? ` - ${address.pincode}` : '');
    const { data, error: err } = await supabase.rpc('request_quote', {
      p_description: text.trim(), p_phone: phone, p_address: full, p_lat: address.lat, p_lng: address.lng,
      p_landmark: address.landmark || null, p_photos: photos.map((p) => p.path)
    });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setSent(data);
  };

  return (
    <div className="lp-backdrop" onClick={onClose}>
      <motion.div className="lp-sheet" onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} transition={{ type: 'spring', damping: 30, stiffness: 320 }} role="dialog" aria-modal="true" aria-label="Request a quote">
        <div className="lp-grab" />
        <header className="lp-head">
          <div className="lp-title"><h3>{sent ? 'Request sent' : 'Request a quote'}</h3><p>Alteration &amp; Dry Cleaning</p></div>
          <button type="button" className="lp-round" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        {sent ? (
          <div className="qt-done">
            <CheckCircle2 size={52} color="#16a34a" />
            <h4>We’ve got your request</h4>
            <p>We’ll look at what you need and reply with a price — usually within a few hours. You’ll get a notification, and the quote will appear under <b>Orders</b>. Nothing is booked until you accept it.</p>
            <button type="button" className="lp-save" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form className="lp-form" onSubmit={submit} noValidate>
            <div className="lp-scroll">
              <label className="lp-field full">
                <span>What do you need? <i>*</i></span>
                <textarea className="qt-text" rows={5} value={text} maxLength={1500} onChange={(e) => setText(e.target.value)} placeholder="e.g. Shorten 2 trousers by 1 inch, and dry clean a silk saree with zari border." />
                <small className="qt-count">{text.trim().length < 10 ? `${10 - text.trim().length} more characters` : `${text.length}/1500`}</small>
              </label>
              <div className="qt-ideas">{IDEAS.map((i) => <button type="button" key={i} onClick={() => setText((t) => (t.trim() ? `${t.trim()}. ${i}` : i))}>+ {i}</button>)}</div>

              <div>
                <span className="qt-lab">Photos <small>optional · up to 4 — helps us quote accurately</small></span>
                <div className="qt-photos">
                  {photos.map((p) => (
                    <div key={p.path} className="qt-ph"><img src={p.preview} alt="" /><button type="button" onClick={() => setPhotos((x) => x.filter((y) => y.path !== p.path))} aria-label="Remove"><X size={12} /></button></div>
                  ))}
                  {photos.length < 4 && (
                    <label className="qt-add">{uploading ? <Loader2 size={20} className="psk-spin" /> : <Camera size={20} />}<span>{uploading ? 'Uploading' : 'Add photo'}</span>
                      <input ref={file} type="file" accept="image/*" multiple hidden onChange={addPhotos} disabled={uploading} />
                    </label>
                  )}
                </div>
              </div>

              <label className={`lp-field full ${phone && !phoneOk ? 'err' : ''}`}>
                <span>Mobile number <i>*</i> <small>we may call to confirm details</small></span>
                <div className="lp-phone"><b>+91</b><input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="98765 43210" /></div>
                {phone && !phoneOk && <em>{phone.length < 10 ? `${10 - phone.length} more digit${10 - phone.length === 1 ? '' : 's'} needed` : 'Indian mobile numbers start with 6, 7, 8 or 9'}</em>}
              </label>

              <div className="lp-place"><span className="lp-ic sm"><MapPin size={16} /></span>
                <div className="lp-txt"><strong>Pickup from {address?.label}</strong><small>{address?.flatBuilding}, {address?.streetArea}</small></div></div>
            </div>
            <footer className="lp-foot">
              {error && <p className="lp-issue" style={{ color: '#b91c1c' }}><AlertCircle size={13} /> {error}</p>}
              <button type="submit" className="lp-save" disabled={!textOk || !phoneOk || busy || uploading}>{busy ? 'Sending…' : 'Send request'}</button>
              <p className="qt-fine">Free to ask. We’ll reply with a price — you decide whether to book.</p>
            </footer>
          </form>
        )}
      </motion.div>
    </div>
  );
};
