const CACHE = 'geopdf-v1';
const SHARE_CACHE = 'geopdf-share';

// インストール時にアプリシェルをキャッシュ
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['./', './manifest.json', './icon.svg']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  // Share Target: iOSの共有シートからPDFを受け取る
  if (e.request.method === 'POST') {
    e.respondWith(handleShareTarget(e.request));
    return;
  }

  // キャッシュ優先（オフライン対応）
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./')))
  );
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf');

    if (file && file.size > 0) {
      // 受け取ったPDFファイルを一時キャッシュに保存
      const cache = await caches.open(SHARE_CACHE);
      await cache.put('pending', new Response(await file.arrayBuffer(), {
        headers: {
          'Content-Type': 'application/pdf',
          'X-Filename': encodeURIComponent(file.name),
        }
      }));
    }
  } catch (_) {}

  // メインページへリダイレクト（?share=1 でファイル受け取りを通知）
  return Response.redirect('./?share=1', 303);
}
