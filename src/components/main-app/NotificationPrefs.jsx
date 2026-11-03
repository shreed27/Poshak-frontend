import React, { useEffect, useState } from 'react';
import { Bell, MessageCircle, Smartphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { enablePush, pushSupported } from '../../lib/push';

// Explicit opt-in (WhatsApp / SMS need consent). Push asks the browser for permission.
export const NotificationPrefs = ({ userId, defaultPhone }) => {
  const [p, setP] = useState({ whatsapp: false, sms: false, push: true, phone: defaultPhone || '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase || !userId) return;
    supabase.from('profiles').select('notify_whatsapp, notify_sms, notify_push, phone').eq('id', userId).maybeSingle().then(({ data }) => {
      if (data) setP({ whatsapp: data.notify_whatsapp, sms: data.notify_sms, push: data.notify_push, phone: data.phone || defaultPhone || '' });
    });
  }, [userId, defaultPhone]);

  if (!supabase || !userId) return null;

  const save = async (next) => {
    setError(''); setMsg('');
    const { error: err } = await supabase.rpc('set_notification_prefs', { p_whatsapp: next.whatsapp, p_sms: next.sms, p_push: next.push, p_phone: next.phone || null });
    if (err) { setError(err.message); return false; }
    setP(next); setMsg('Saved'); return true;
  };
  const toggle = (k) => save({ ...p, [k]: !p[k] });
  const turnOnPush = async () => {
    setError('');
    try { await enablePush(); setMsg('Notifications enabled on this device'); } catch (e) { setError(e.message); }
  };

  return (
    <div className="psk-prefs">
      <h3><Bell size={16} /> Order updates</h3>
      <p>Get pickup, bill, delivery and payment updates where you are. WhatsApp and SMS only start after you turn them on.</p>
      <label className="psk-pref-phone">Mobile number<input inputMode="numeric" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value.replace(/[^\d+ ]/g, '') })} onBlur={() => save(p)} placeholder="10-digit mobile number" /></label>
      <label className="psk-pref"><input type="checkbox" checked={p.whatsapp} onChange={() => toggle('whatsapp')} /><MessageCircle size={15} /><span><b>WhatsApp updates</b> — I agree to receive order messages on WhatsApp</span></label>
      <label className="psk-pref"><input type="checkbox" checked={p.sms} onChange={() => toggle('sms')} /><Smartphone size={15} /><span><b>SMS updates</b> — I agree to receive order SMS</span></label>
      <label className="psk-pref"><input type="checkbox" checked={p.push} onChange={() => toggle('push')} /><Bell size={15} /><span><b>App notifications</b> on this device</span></label>
      {pushSupported() && <button type="button" className="psk-btn-ghost" onClick={turnOnPush}>Allow notifications in this browser</button>}
      {msg && <p className="psk-pref-ok">{msg}</p>}
      {error && <p className="psk-pref-err">{error}</p>}
    </div>
  );
};
