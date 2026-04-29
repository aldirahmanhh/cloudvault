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

// Handle share target POST — intercept and redirect with files cached
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname === '/api/share') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const files = formData.getAll('file');

          // Store shared files in cache for the share page to pick up
          const cache = await caches.open('share-target');
          const fileData = [];
          for (const file of files) {
            const id = Date.now() + '-' + Math.random().toString(36).slice(2);
            await cache.put(`/shared/${id}`, new Response(file, {
              headers: { 'X-File-Name': file.name, 'X-File-Type': file.type, 'Content-Length': file.size }
            }));
            fileData.push({ id, name: file.name, size: file.size, type: file.type });
          }

          // Redirect to share page
          const params = new URLSearchParams({ shared: JSON.stringify(fileData) });
          return Response.redirect(`/share?${params}`, 303);
        } catch (e) {
          // Fallback — just redirect to share page
          return Response.redirect('/share', 303);
        }
      })()
    );
  }
});
