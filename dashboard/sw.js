/**
 * Service Worker for Claude Code Pipeline Dashboard
 * Provides offline capability and caching
 */

const CACHE_NAME = 'claude-pipeline-v3';
const urlsToCache = [
  '/dashboard/',
  '/dashboard/index.html',
  '/dashboard/app.js',
  '/dashboard/styles.css',
  '/dashboard/manifest.json',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip cross-origin requests (except for specific allowed origins)
  if (url.origin !== self.location.origin) {
    return;
  }

  // For API requests, use network only
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/interactive/')) {
    return;
  }

  // For other requests, try network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fall back to cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // Return offline page for HTML requests
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/dashboard/index.html');
          }
        });
      })
  );
});
