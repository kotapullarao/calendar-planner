// IMPORTANT: bump all three cache versions on EVERY deploy that changes
// any precached file — returning PWA users keep the old cache until the
// service worker byte-changes.

const CACHE_NAME = 'calendar-planner-v12';
const STATIC_CACHE = 'calendar-planner-static-v12';
const DYNAMIC_CACHE = 'calendar-planner-dynamic-v12';

// Files to cache for offline usage
const STATIC_FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css',
  './css/base.css',
  './css/layout.css', 
  './css/components.css',
  './css/modals.css',
  './css/themes.css',
  './css/responsive.css',
  './js/modules/app.js',
  './js/config/constants.js',
  './js/core/state.js',
  './js/utils/dom.js',
  './js/modules/store.js',
  './js/modules/ui.js',
  './js/modules/events.js',
  './js/modules/logic.js',
  './js/modules/utils.js',
  './js/modules/ics.js',
  './js/modules/sync.js',
  './assets/fonts/onest.css',
  './assets/fonts/onest-latin.woff2',
  './assets/icons/favicon.svg',
  './assets/js/vendor/Sortable.min.js'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated successfully');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - serve cached files offline
self.addEventListener('fetch', (event) => {
  // Only handle HTTP/HTTPS requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Skip service worker for development tools
  if (event.request.url.includes('_ijt=') || 
      event.request.url.includes('jb-server-page') ||
      event.request.url.includes('socket.io')) {
    return;
  }

  // For navigation requests (HTML pages), use network-first with cache fallback.
  // This handles query-string URLs like ?action=today from PWA shortcuts.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((cached) => cached || caches.match('./index.html'));
        })
    );
    return;
  }

  // For all other requests (JS, CSS, fonts, images): cache-first
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200) {
              return response;
            }

            // Cache same-origin resources
            if (event.request.url.includes(self.location.origin)) {
              const clone = response.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, clone));
            }

            return response;
          });
      })
  );
});

// Background sync for data persistence
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered');
  if (event.tag === 'background-sync-calendar-data') {
    event.waitUntil(syncCalendarData());
  }
});

// Sync calendar data when back online
async function syncCalendarData() {
  try {
    // Get stored data that needs syncing
    const pendingData = await getStoredPendingData();
    if (pendingData && pendingData.length > 0) {
      console.log('Service Worker: Syncing calendar data');
      // Process pending data when back online
      await processPendingData(pendingData);
    }
  } catch (error) {
    console.error('Service Worker: Failed to sync data:', error);
  }
}

function getStoredPendingData() {
  // This would integrate with your localStorage system
  return new Promise((resolve) => {
    resolve([]); // Placeholder for actual implementation
  });
}

function processPendingData(data) {
  // This would handle syncing data to external services if needed
  return Promise.resolve();
}

// Push notification handling (for future features)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Calendar reminder',
      icon: 'assets/icons/favicon.svg',
      tag: 'calendar-notification',
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View Calendar'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Calendar Planner', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});