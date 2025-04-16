// Service Worker for Apprie Medical Assistant PWA
const CACHE_NAME = 'apprie-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/chat.html',
  '/assets/img/triangular-logo.png',
  '/assets/img/fingerprint-icon.svg',
  '/assets/favicon.ico',
  'https://use.fontawesome.com/releases/v6.3.0/js/all.js',
  'https://fonts.googleapis.com/css?family=Montserrat:400,500,600,700',
  'https://fonts.googleapis.com/css?family=Roboto+Slab:400,100,300,700',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(err => console.error('Cache failed:', err))
  );
});

// Activate and clean up old caches
self.addEventListener('activate', (event) => {
  const cacheAllowlist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Network first, falling back to cache strategy
self.addEventListener('fetch', (event) => {
  // Skip Netlify function calls - they should always be fresh
  if (event.request.url.includes('/.netlify/functions/')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
}); 