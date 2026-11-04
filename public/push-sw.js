// Push notifications (hearts and reminders), loaded into the generated service worker with `importScripts`
// (vite.config.ts). The server sends `{ title, body, tag, url }` (api/_lib/reminders.ts).

self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(message.title || 'ChoreQuest', {
      body: message.body || '',
      // One of each kind at a time: a newer reminder replaces an older one.
      tag: message.tag || 'chorequest',
      icon: '/pwa-192x192.png',
      data: { url: message.url || '/' },
    }),
  );
});

// Tapping a notification brings the app forward, or opens it.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.location.origin));
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});
