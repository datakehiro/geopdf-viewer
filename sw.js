const CACHE = 'geopdf-v22';
const SHARE_CACHE = 'geopdf-share';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['./', './manifest.json', './icon.svg']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== SHARE_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method === 'POST') {
    e.respondWith(handleShareTarget(e.request));
    return;
  }
  // HTMLページはネットワーク優先（オフライン時のみキャッシュ）
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./')))
    );
    return;
  }
  // その他（アイコン等）はキャッシュ優先
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./')))
  );
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf');
    if (file && file.size > 0) {
      const cache = await caches.open(SHARE_CACHE);
      await cache.put('pending', new Response(await file.arrayBuffer(), {
        headers: {
          'Content-Type': 'application/pdf',
          'X-Filename': encodeURIComponent(file.name),
        }
      }));
    }
  } catch (_) {}
  return Response.redirect('./?share=1', 303);
}
