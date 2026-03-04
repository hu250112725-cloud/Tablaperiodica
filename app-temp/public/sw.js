const CACHE_NAME = 'tabla-periodica-v5';
const BASE_PATH = new URL('./', self.registration.scope).pathname;
const SHELL = [BASE_PATH, `${BASE_PATH}index.html`, `${BASE_PATH}manifest.json`];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only handle GET requests for same-origin or static assets
  if (request.method !== 'GET') return;
  // Skip Groq API calls – never cache AI responses
  if (request.url.includes('groq.com')) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match(`${BASE_PATH}index.html`));
    })
  );
});
