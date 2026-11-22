/* Service worker : permet d'utiliser l'application hors ligne.
   Change VERSION après chaque mise à jour du site pour forcer le rafraîchissement. */
const VERSION = 'alg2-v3';
const FICHIERS = ['./', './assets/icon-192.png','./assets/icon-512.png','./assets/icon.svg','./css/style.css','./data/enonces.js','./enseignant.html','./index.html','./js/app.js','./js/badges.js','./js/config.js','./js/gen/figures.js','./js/gen/index.js','./js/gen/m1-anatomie.js','./js/gen/m2-reduction.js','./js/gen/m3-valeur.js','./js/gen/m4-modelisation.js','./js/gen/m5-equations.js','./js/gen/util.js','./js/math/check.js','./js/math/expr.js','./js/math/frac.js','./js/math/steps.js','./js/storage.js','./js/teacher.js','./js/ui/keyboard.js','./js/ui/render.js','./lib/katex/katex.min.css','./lib/katex/katex.min.js','./manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Réseau d'abord (pour avoir la dernière version), cache si hors ligne.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Google Apps Script : jamais en cache
  e.respondWith(
    fetch(e.request)
      .then((rep) => { const copie = rep.clone(); caches.open(VERSION).then((c) => c.put(e.request, copie)); return rep; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
