/*
 * Pilotask service worker: makes the web app installable and quick to reopen.
 *
 * - Pages: network first, so a new deploy is picked up on the next visit; the
 *   last app shell is used when the network is down.
 * - Build files (/assets/*-hash.js|css…): cache first, they never change.
 * - The API, uploads and anything cross-origin are never cached: data always
 *   comes from the server.
 *
 * Push notifications are handled by /firebase-messaging-sw.js (its own scope).
 */
const SHELL = "pilotask-shell-v1";
const ASSETS = "pilotask-assets-v1";
const KEEP = [SHELL, ASSETS];
const MAX_ASSETS = 150;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(["/", "/manifest.webmanifest", "/icons/pilotask-192.png"]))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("pilotask-") && !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isAsset = (url) => url.pathname.startsWith("/assets/") || url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/brand/");
const bypass = (url) => url.pathname.startsWith("/api") || url.pathname === "/up" || url.pathname.startsWith("/firebase-");

const OFFLINE = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pilotask · Hors ligne</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#F3F2EE;font-family:system-ui,sans-serif;color:#171E23;text-align:center;padding:24px">
<div><img src="/icons/pilotask-192.png" width="72" height="72" alt=""><h1 style="font-size:20px;margin:16px 0 6px">Vous êtes hors ligne</h1>
<p style="margin:0 0 18px;color:#64748B">Pilotask a besoin d'une connexion pour charger vos projets.</p>
<button onclick="location.reload()" style="border:0;border-radius:12px;background:#326899;color:#fff;font-weight:700;padding:12px 22px;font-size:15px">Réessayer</button></div></body></html>`;

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || bypass(url)) return;

  // App pages (client-side routes): always try the network for the newest build.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL).then((cache) => cache.put("/", copy));
          }
          return response;
        })
        .catch(async () => (await caches.match("/")) || new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })),
    );
    return;
  }

  if (isAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok && response.type === "basic") {
              const copy = response.clone();
              caches.open(ASSETS).then((cache) => cache.put(request, copy).then(() => trim(ASSETS, MAX_ASSETS)));
            }
            return response;
          }),
      ),
    );
  }
});
