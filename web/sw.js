// Guarda la app completa para abrirla al instante y sin conexión. Los datos van por IndexedDB/Supabase, no por aquí.
// VERSION y SHELL los actualiza Scripts/release-web.py antes de cada publicación: si cambian, el navegador
// instala la versión nueva en segundo plano y la app muestra «Hay una versión nueva».
const VERSION = '2026-11-06.71ce031';
const SHELL = ["./", "config.js", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "index.html", "manifest.webmanifest", "src/backup.js", "src/catalog.js", "src/data.js", "src/domain.js", "src/exercise-illustrations.js", "src/exercise-images.js", "src/guides.js", "src/main.js", "src/media.js", "src/screens/body.js", "src/screens/exercises.js", "src/screens/history.js", "src/screens/home.js", "src/screens/more.js", "src/screens/progress.js", "src/screens/routines.js", "src/screens/start.js", "src/screens/tools.js", "src/screens/workout.js", "src/session.js", "src/store.js", "src/theme.js", "src/ui.js", "styles.css", "vendor/preact-htm.js", "vendor/supabase.js"];

const CACHE = `gymef-${VERSION}`;
// Fotos de ejercicios (media/): se guardan la primera vez que se ven y se conservan entre versiones.
const MEDIA = 'gymef-media-v1';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('gymef-') && k !== CACHE && k !== MEDIA).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Primero la copia guardada (rápido aunque la señal sea mala); la red solo para lo que no está guardado.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.includes('/media/')) {
    e.respondWith(caches.open(MEDIA).then((c) => c.match(e.request).then((hit) => hit ?? fetch(e.request).then((res) => {
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }))));
    return;
  }
  const request = e.request.mode === 'navigate' ? 'index.html' : e.request;
  e.respondWith(caches.open(CACHE)
    .then((c) => c.match(request, { ignoreSearch: true }))
    .then((hit) => hit ?? fetch(e.request)));
});
