const CACHE_NAME = 'calendar-planner-v1';
const STATIC_CACHE = 'calendar-planner-static-v1';
const DYNAMIC_CACHE = 'calendar-planner-dynamic-v1';

// Files to cache for offline usage
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/variables.css',
  '/css/base.css',
  '/css/layout.css', 
  '/css/components.css',
  '/css/modals.css',
  '/css/themes.css',
  '/css/responsive.css',
  '/js/modules/app.js',
  '/js/modules/constants.js',
  '/js/modules/store.js',
  '/js/modules/ui.js',
  '/js/modules/events.js',
  '/js/modules/logic.js',
  '/js/modules/utils.js',
  '/assets/js/vendor/Sortable.min.js',
  '/assets/fonts/onest.css',
  '/assets/fonts/onest-latin.woff2',
  '/assets/icons/favicon.svg'
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
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }
        
        // Otherwise, fetch from network
        return fetch(event.request)
          .then((fetchResponse) => {
            // Check if valid response
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }
            
            // Clone response for caching
            const responseToCache = fetchResponse.clone();
            
            // Cache dynamic content
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return fetchResponse;
          })
          .catch(() => {
            // Fallback for offline scenarios
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
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