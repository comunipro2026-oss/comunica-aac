/* ══════════════════════════════════════════════════════════════════
   ComuniCAP — Service Worker (App Shell offline)
   ──────────────────────────────────────────────────────────────────
   BLOQUEANTE 6 — CAUSA RAÍZ REAL:
   app.html nunca tenía un sw.js real desplegado (el propio código lo
   admitía en un comentario: "Para activar SW offline completo, crear
   archivo sw.js separado en el repo" — nunca se hizo), y además tenía
   meta tags Cache-Control/Pragma/Expires en "no-cache, no-store" que
   le prohibían al navegador guardar cualquier copia de la página.
   Resultado: sin internet, la app ni siquiera podía CARGAR — no es que
   perdiera datos, es que no arrancaba. Para un dispositivo de
   comunicación de una persona no verbal, eso es el peor escenario
   posible.

   IMPORTANTE — ESTO REQUIERE UN PASO DE DESPLIEGUE:
   Este archivo debe subirse a la MISMA carpeta/origen donde vive
   app.html (ComuniCAP ya lo busca automáticamente en esa ruta — ver
   el bloque "Service Worker: modo offline para CAA" al final de
   app.html). Un archivo HTML solo no puede registrarse a sí mismo
   como Service Worker; necesita este archivo separado, servido por
   HTTPS, en el mismo path. Si se sube tal cual con el nombre "sw.js"
   junto a app.html, el registro ya existente en app.html lo detecta
   solo (hace un HEAD request a sw.js antes de registrar).
   ══════════════════════════════════════════════════════════════════ */

// Subir este número cada vez que se publique una nueva versión de
// app.html — fuerza a los dispositivos ya instalados a bajar la nueva
// versión en vez de quedarse pegados en una copia vieja en caché.
const CACHE_VERSION = 'comunicap-v1';
const APP_SHELL = [
  './',
  './app.html',
  './index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // No falla la instalación entera si alguna de las rutas no existe
      // (por ejemplo si el archivo real no se llama index.html) —
      // cachea las que sí resuelven.
      return Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch(() => {})
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo cachear GET — nunca interceptar POST/PATCH (login, guardado en
  // Supabase, etc.) para no interferir con la sincronización real.
  if (req.method !== 'GET') return;

  // Llamadas a Supabase / APIs externas: siempre red, nunca caché —
  // los datos clínicos y de licencia deben ser lo más frescos posible
  // cuando hay conexión, y si no hay conexión el código de la app ya
  // maneja el error de red de forma segura (ver verificarSesionActiva).
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // App shell (HTML/CSS/JS/imágenes propias): cache-first con
  // actualización en segundo plano (stale-while-revalidate). Así la
  // app abre INSTANTÁNEAMENTE incluso sin red, y se actualiza sola en
  // cuanto vuelve la conexión.
  event.respondWith(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached); // sin red y sin caché: no hay nada más que ofrecer
        return cached || networkFetch;
      })
    )
  );
});
