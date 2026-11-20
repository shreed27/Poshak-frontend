// Get a staff member's attention for something new (job offer, new order): a short chime, a vibration, and a
// system notification when the tab is in the background.
export const chime = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1175, 1568].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.16);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.17);
    });
  } catch { /* audio blocked until the first tap */ }
};

export const askNotifyPermission = () => {
  try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch { /* ignore */ }
};

export const alertStaff = (title, body) => {
  chime();
  try { navigator.vibrate?.([200, 100, 200]); } catch { /* ignore */ }
  if (!document.hidden) return;
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, tag: title, icon: '/icon-192.png' });
  } catch { /* some mobile browsers only allow notifications from a service worker */ }
};
