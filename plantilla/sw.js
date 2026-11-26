// PdfCraft para iPhone: guarda la app completa en el teléfono para que abra sin conexión.
// Generado por scripts/preparar.py. Cuando se publica una versión nueva, este archivo cambia,
// el iPhone la baja en segundo plano y la usa la próxima vez que se abre la app.
const VERSION = "__VERSION__";
const PDFCRAFT = "__PDFCRAFT__";
const CACHE = "pdfcraft-" + VERSION;
const PRECACHE = __PRECACHE__;
const WASM = "./__WASM__";
const WASM_BYTES = __WASM_BYTES__;

async function broadcast(message) {
  const windows = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  windows.forEach((client) => client.postMessage(message));
}

// El .wasm (~70 MB) se baja avisando el progreso a la página.
async function fetchWasm() {
  const response = await fetch(new Request(WASM, { cache: "reload" }));
  if (!response.ok) throw new Error("No se pudo bajar la app (" + response.status + ")");
  if (!response.body) return response;
  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  let reported = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    if (loaded - reported > 512 * 1024) {
      reported = loaded;
      broadcast({ type: "progress", loaded, total: WASM_BYTES });
    }
  }
  broadcast({ type: "progress", loaded, total: WASM_BYTES });
  return new Response(new Blob(chunks, { type: "application/wasm" }), { headers: { "Content-Type": "application/wasm" } });
}

// Los archivos de PdfCraft llevan su huella en el nombre (pdfcraft-web-<hash>_bg.wasm…): si una
// versión anterior ya los guardó, no cambiaron y no se vuelven a bajar.
const HASHED = /-[0-9a-f]{16}(_bg|_loader)?\.(wasm|js)$/;
async function reuse(cache, url) {
  if (!HASHED.test(url)) return false;
  const old = await caches.match(url);
  if (!old) return false;
  await cache.put(url, old);
  return true;
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const rest = [];
    for (const url of PRECACHE) {
      if (url !== WASM && !(await reuse(cache, url))) rest.push(url);
    }
    await cache.addAll(rest.map((url) => new Request(url, { cache: "reload" })));
    if (!(await reuse(cache, WASM))) await cache.put(WASM, await fetchWasm());
    await self.skipWaiting();
  })().catch((error) => {
    broadcast({ type: "install-failed", message: String((error && error.message) || error) });
    throw error;
  }));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Se guarda también la versión anterior, por si una pantalla abierta todavía la usa.
    const older = (await caches.keys()).filter((key) => key.startsWith("pdfcraft-") && key !== CACHE);
    await Promise.all(older.slice(0, -1).map((key) => caches.delete(key)));
    await self.clients.claim();
    broadcast({ type: "activated", version: PDFCRAFT });
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match("./index.html")) || fetch(request);
    })());
    return;
  }

  // Primero lo guardado (versión actual, luego la anterior); lo que falte (p. ej. los modelos
  // de reconocimiento de texto) se baja y se guarda.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = (await cache.match(request, { ignoreSearch: true })) ||
      (await caches.match(request, { ignoreSearch: true }));
    if (hit) return hit;
    const response = await fetch(request);
    if (response.ok && response.type === "basic") cache.put(request, response.clone()).catch(() => {});
    return response;
  })());
});
