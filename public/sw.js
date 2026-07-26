// CloudVault Service Worker v2
const CACHE_NAME = 'cloudvault-v2';

// Install — take over immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate — clean old caches + claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== 'share-target')
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Single fetch handler — routes share-target POSTs first, else network-first for GET
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1) Share target POST — intercept and stash files in cache for /share page
  if (event.request.method === 'POST' && url.pathname === '/api/share') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const files = formData.getAll('file');
          const cache = await caches.open('share-target');
          const fileData = [];
          for (const file of files) {
            if (!file || typeof file === 'string') continue;
            const id = Date.now() + '-' + Math.random().toString(36).slice(2);
            await cache.put(`/shared/${id}`, new Response(file, {
              headers: {
                'X-File-Name': file.name || 'shared-file',
                'X-File-Type': file.type || 'application/octet-stream',
                'Content-Length': String(file.size || 0),
              },
            }));
            fileData.push({
              id,
              name: file.name || 'shared-file',
              size: file.size || 0,
              type: file.type || 'application/octet-stream',
            });
          }
          const params = new URLSearchParams({ shared: JSON.stringify(fileData) });
          return Response.redirect(`/share?${params}`, 303);
        } catch (_e) {
          return Response.redirect('/share', 303);
        }
      })()
    );
    return;
  }

  // 2) Skip caching for API + non-GET
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  // 3) Network-first fallback to cache for navigations + static
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Allow page to trigger immediate activation of new SW
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
