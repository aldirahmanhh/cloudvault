// CloudVault Service Worker
const CACHE_NAME = 'cloudvault-v1';

// Install — cache essential assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Don't cache API calls
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Handle share target POST
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'POST' && event.request.url.includes('/share')) {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const files = formData.getAll('file');

        // Store shared files temporarily
        const cache = await caches.open('share-target');
        const fileData = [];
        for (const file of files) {
          const id = Date.now() + '-' + Math.random().toString(36).slice(2);
          await cache.put(`/shared/${id}`, new Response(file));
          fileData.push({ id, name: file.name, size: file.size, type: file.type });
        }

        // Redirect to share page with file info
        const params = new URLSearchParams({ shared: JSON.stringify(fileData) });
        return Response.redirect(`/share?${params}`, 303);
      })()
    );
  }
});
