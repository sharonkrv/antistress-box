// Anti Stress Box · service worker: notificaciones y arranque sin conexión
const NUBE = "https://anti-stress-box-default-rtdb.firebaseio.com";
const PERSONA = new URL(self.location).searchParams.get("p") || "";
const CACHE = "asb-v1";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(["./", "./index.html", "./icon-192.png", "./badge-96.png"]).catch(() => {})));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for(const k of await caches.keys()) if(k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
// la página siempre se pide a internet primero; si no hay conexión, se usa la copia guardada
self.addEventListener("fetch", e => {
  const r = e.request;
  if(r.method !== "GET" || new URL(r.url).origin !== self.location.origin) return;
  if(r.mode === "navigate"){
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(k => k.put("./index.html", c)); return res; })
      .catch(() => caches.match("./index.html")));
  }
});

self.addEventListener("push", e => {
  e.waitUntil((async () => {
    let aviso = null;
    try{ if(e.data) aviso = e.data.json(); }catch(err){}
    if(!aviso && PERSONA){
      try{ const r = await fetch(`${NUBE}/refugio/avisos/${PERSONA}.json`, { cache:"no-store" }); aviso = await r.json(); }catch(err){}
    }
    aviso = aviso || { title:"Anti Stress Box", body:"Hay novedades en el Refugio." };
    await self.registration.showNotification(aviso.title || "Anti Stress Box", {
      body: aviso.body || "",
      icon: "icon-192.png",
      badge: "badge-96.png",
      tag: aviso.tag || "asb",
      renotify: true,
      data: { url: aviso.url || "./" }
    });
  })());
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const destino = new URL(e.notification.data && e.notification.data.url || "./", self.registration.scope).href;
  e.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type:"window", includeUncontrolled:true });
    for(const v of ventanas){ if("focus" in v){ await v.navigate(destino).catch(() => {}); return v.focus(); } }
    return self.clients.openWindow(destino);
  })());
});
