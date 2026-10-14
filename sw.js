/* Apaga — service worker: guarda a app para funcionar sem rede.
   Ao publicar uma nova versão, muda o número em VERSAO. */
const VERSAO = "apaga-v1";
const FICHEIROS = ["./", "index.html", "styles.css", "config.js", "content.js", "app.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(FICHEIROS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  /* Páginas: rede primeiro (para receber atualizações), cache se estiver sem rede */
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("index.html")));
    return;
  }
  /* Restantes ficheiros: cache primeiro, atualiza em segundo plano */
  e.respondWith(caches.match(e.request).then(hit => {
    const rede = fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSAO).then(x => x.put(e.request, c)); } return r; }).catch(() => hit);
    return hit || rede;
  }));
});
