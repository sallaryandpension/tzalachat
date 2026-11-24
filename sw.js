// Offline support for the installed app. build-site.ps1 stamps the version, so every rebuild replaces the cache.
const VERSION = '20261124142641';
const CACHE = 'tzalachat-' + VERSION;
const CORE = ['./', './index.html', './foods.json', './tzameret.json', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('tzalachat-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const put = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // The page: network first so updates arrive, the saved copy when offline.
    if (req.mode === 'navigate') {
      e.respondWith(fetch(req).then(res => put('./index.html', res)).catch(() => caches.match('./index.html')));
      return;
    }
    // Data files and icons: saved copy first.
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => put(req, res))));
    return;
  }
  // Google Fonts: saved copy first; without it the app falls back to the system font.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => put(req, res))));
  }
});
