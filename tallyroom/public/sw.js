// Minimal service worker: makes the site installable on Android. It caches nothing.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => new Response('You are offline. Please reconnect and try again.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } })));
  }
});
