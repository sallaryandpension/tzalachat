// Offline support for the installed gym log (scope ./gym/). build-site.ps1 stamps the version, so every rebuild replaces the cache.
const VERSION = '20261125024634';
const CACHE = 'gym-' + VERSION;
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', '../firebase-config.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('gym-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const put = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // The page: network first (revalidated, so a new version shows at once), the saved copy when offline.
    if (req.mode === 'navigate') {
      e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => put('./index.html', res)).catch(() => caches.match('./index.html')));
      return;
    }
    // Config and icons: saved copy first.
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => put(req, res))));
    return;
  }
  // Google Fonts and the pinned Firebase SDK files: saved copy first, so the installed app opens offline.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'
      || (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'))) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => put(req, res))));
  }
});
