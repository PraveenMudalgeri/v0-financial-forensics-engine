// Stub service worker — unregisters itself so stale browser registrations are cleaned up
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister().then(() => self.clients.matchAll()).then((clients) => {
      clients.forEach((client) => client.navigate && client.navigate(client.url));
    })
  );
});
