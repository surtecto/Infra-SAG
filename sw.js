// Service worker: hace que la app abra sin señal y se actualice sola.
// - Archivos de la app: se sirven desde el equipo y, en segundo plano, se compara con la web.
//   Si algo cambió, se guarda la versión nueva y se avisa para recargar. No hace falta tocar números de versión.
// - Fondos de mapa: lo que se vio con señal queda guardado para usar sin señal.
const APP = 'infra-app-v1';
const TESELAS = 'infra-teselas-v1';
const MAX_TESELAS = 8000;
const BASE = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/catalogo.js', 'js/config.js', 'js/datos.js', 'js/db.js',
  'vendor/leaflet.js', 'vendor/leaflet.css', 'vendor/leaflet-geoman.js', 'vendor/leaflet-geoman.css', 'vendor/supabase.js',
  'vendor/images/layers.png', 'vendor/images/layers-2x.png', 'vendor/images/marker-icon.png', 'vendor/images/marker-icon-2x.png', 'vendor/images/marker-shadow.png',
  'vendor/fuentes/barlow-latin-400-normal.woff2', 'vendor/fuentes/barlow-latin-500-normal.woff2', 'vendor/fuentes/barlow-latin-600-normal.woff2',
  'vendor/fuentes/barlow-latin-700-normal.woff2', 'vendor/fuentes/barlow-semi-condensed-latin-600-normal.woff2', 'vendor/fuentes/barlow-semi-condensed-latin-700-normal.woff2',
  'iconos/marca.svg', 'iconos/icono-192.png', 'iconos/icono-512.png',
  'datos/referencia.json',
];
const HOSTS_TESELAS = ['tile.openstreetmap.org', 'server.arcgisonline.com', 'wms.ign.gob.ar'];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(APP).then((c) => c.addAll(BASE.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== APP && k !== TESELAS).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const huella = (r) => r ? (r.headers.get('etag') || r.headers.get('last-modified') || r.headers.get('content-length')) : null;

async function deLaApp(req) {
  const cache = await caches.open(APP);
  const guardada = await cache.match(req, { ignoreSearch: true });
  const deRed = fetch(req, { cache: 'no-cache' }).then(async (r) => {
    if (r.ok) {
      if (guardada && huella(guardada) && huella(r) && huella(guardada) !== huella(r)) {
        (await self.clients.matchAll()).forEach((c) => c.postMessage({ tipo: 'actualizada' }));
      }
      await cache.put(req, r.clone());
    }
    return r;
  }).catch(() => null);
  if (guardada) return guardada;
  return (await deRed) || new Response('Sin conexión', { status: 503, statusText: 'Sin conexión' });
}

let puestas = 0;
async function tesela(req) {
  const cache = await caches.open(TESELAS);
  const guardada = await cache.match(req);
  if (guardada) return guardada;
  const r = await fetch(req);
  if (r.ok && r.type !== 'opaque') {
    cache.put(req, r.clone());
    if (++puestas % 200 === 0) cache.keys().then((ks) => { if (ks.length > MAX_TESELAS) ks.slice(0, ks.length - MAX_TESELAS + 1000).forEach((k) => cache.delete(k)); });
  }
  return r;
}

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) ev.respondWith(deLaApp(req));
  else if (HOSTS_TESELAS.includes(url.hostname)) ev.respondWith(tesela(req).catch(() => new Response('', { status: 504 })));
});
