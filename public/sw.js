// Nasza Chata Service Worker & Web Push Manager
const CACHE_NAME = 'nasza-chata-cache-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network first, fall back to cache)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return; // let API calls go to network

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/');
        });
      })
  );
});

// Web Push Notification Event Listener
self.addEventListener('push', (event) => {
  let data = {
    title: 'Nasza Chata — Powiadomienie',
    body: 'Sprawdź dzisiejsze obowiązki domowe.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'chata-general',
    data: { url: '/' },
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon.svg',
    badge: data.badge || '/icon.svg',
    tag: data.tag || 'chata-task-alert',
    data: data.data || { url: '/' },
    vibrate: [200, 100, 200],
    actions: data.actions || [
      { action: 'open', title: 'Otwórz Chate' },
      { action: 'dismiss', title: 'Ukryj' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Event Listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if window is already open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // If not open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// PWA Widget lifecycle events (PWA Widgets spec)
self.addEventListener('widgetinstall', (event) => {
  console.log('PWA Widget installed:', event.widget.tag);
  event.waitUntil(updateWidgetData(event.widget));
});

self.addEventListener('widgetresume', (event) => {
  console.log('PWA Widget resumed:', event.widget.tag);
  event.waitUntil(updateWidgetData(event.widget));
});

self.addEventListener('widgetclick', (event) => {
  console.log('PWA Widget clicked:', event.action);
  if (event.action === 'open-app') {
    clients.openWindow('/?tab=today');
  }
});

async function updateWidgetData(widget) {
  // Can push state updates to widget templates when supported
  try {
    const res = await fetch('/api/widget/today');
    const data = await res.json();
    if (self.widgets && self.widgets.updateByTag) {
      await self.widgets.updateByTag(widget.tag, { data: JSON.stringify(data) });
    }
  } catch (err) {
    console.warn('Widget update error:', err);
  }
}
