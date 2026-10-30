// Service worker di Keepway: riceve le notifiche push e le mostra. Non salva nulla in cache.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Keepway', {
    body: d.body || '',
    icon: '/icons/192.png',
    badge: '/icons/192.png',
    tag: d.tag || 'keepway',        // una notifica nuova con lo stesso tag sostituisce la precedente
    renotify: true,                 // ...ma suona di nuovo
    data: { url: d.url || '/oggi/' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  let target = new URL((e.notification.data && e.notification.data.url) || '/oggi/', self.location.origin);
  if (target.origin !== self.location.origin) target = new URL('/oggi/', self.location.origin); // si aprono solo pagine nostre
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if (c.url.startsWith(self.location.origin) && 'focus' in c) {
        if ('navigate' in c) c.navigate(target.href);
        return c.focus();
      }
    }
    return self.clients.openWindow(target.href);
  }));
});
