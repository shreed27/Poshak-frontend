/* Poshak service worker: push notifications (and, later, offline shell). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: 'Poshak', text: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(d.title || 'Poshak', {
    body: d.text || '',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: { url: d.url || '/' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
