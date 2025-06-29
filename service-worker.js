const CACHE_NAME = 'student-productivity-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/logo.jpg',
  '/css/styles.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/calendar.js',
  '/js/chat.js',
  '/js/firebase-config.js',
  '/js/marks.js',
  '/js/profile.js',
  '/js/todo.js',
  '/images/'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
}); 