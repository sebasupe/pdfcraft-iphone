// PdfCraft para iPhone (app web instalada en la pantalla de inicio): pantalla de carga con
// progreso, instalación sin conexión (service worker), actualización automática, tamaño de
// interfaz para el celular y "Guardar" con la hoja de compartir de iOS.
(function () {
  "use strict";

  var splash = document.getElementById("pc-splash");
  var bar = document.getElementById("pc-bar");
  var status = document.getElementById("pc-status");
  var errorBox = document.getElementById("pc-error");
  var SIN_RED = "Revisa tu conexión a internet y vuelve a abrir la app. " +
    "Después de la primera instalación ya no hace falta conexión.";

  function setStatus(text) { if (status) status.textContent = text; }
  function setProgress(fraction) {
    if (bar) bar.style.width = Math.max(2, Math.min(100, fraction * 100)).toFixed(1) + "%";
  }
  function showError(text) {
    if (!splash || splash.hidden) { console.error(text); return; }
    if (errorBox) { errorBox.hidden = false; errorBox.textContent = text; }
    setStatus("No se pudo abrir PdfCraft");
  }
  function hideSplash() {
    if (!splash) return;
    splash.classList.add("pc-out");
    setTimeout(function () { splash.hidden = true; }, 350);
  }
  function toast(text) {
    var el = document.createElement("div");
    el.setAttribute("role", "status");
    el.textContent = text;
    el.style.cssText = "position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 24px);transform:translateX(-50%);" +
      "z-index:20;max-width:min(360px,90vw);padding:10px 14px;border-radius:12px;background:rgba(30,30,34,.94);color:#fff;" +
      "font:14px/1.35 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;box-shadow:0 6px 24px rgba(0,0,0,.25);" +
      "transition:opacity .4s ease;";
    document.body.appendChild(el);
    setTimeout(function () { el.style.opacity = "0"; }, 7000);
    setTimeout(function () { el.remove(); }, 7600);
  }

  window.addEventListener("error", function (e) {
    var t = e && e.target;
    if (t && t !== window && (t.src || t.href)) {
      if (t.tagName === "IMG" || t.tagName === "LINK") return;
      showError("No se pudo descargar " + (t.src || t.href).split("/").pop() + ".\n" + SIN_RED);
      return;
    }
    showError((e && e.message) || "Error desconocido al cargar.");
  }, true);
  window.addEventListener("unhandledrejection", function (e) {
    var r = e && e.reason;
    showError((r && (r.message || String(r))) || "Error desconocido al cargar.");
  });

  // --- Service worker: instalación sin conexión y actualizaciones -------------------------
  var sw = ("serviceWorker" in navigator && window.isSecureContext) ? navigator.serviceWorker : null;
  var hadController = !!(sw && sw.controller);
  var registration = null;
  var installFailed = null;
  var lastUpdateCheck = Date.now();

  if (sw) {
    sw.addEventListener("message", function (event) {
      var m = event.data || {};
      if (m.type === "progress" && m.total && splash && !splash.hidden) {
        setProgress(m.loaded / m.total);
        setStatus("Instalando PdfCraft en este iPhone… " + Math.min(100, Math.round((m.loaded / m.total) * 100)) + "%");
      } else if (m.type === "install-failed") {
        installFailed = m.message || "error";
      } else if (m.type === "activated" && hadController) {
        toast("PdfCraft " + (m.version || "") + " ya está descargado. Se usará la próxima vez que abras la app.");
      }
    });
    sw.register("./sw.js", { scope: "./" }).then(function (reg) { registration = reg; }).catch(function (e) {
      installFailed = String((e && e.message) || e);
    });
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    // Al volver a la app (iOS la deja en segundo plano), buscar versión nueva cada hora.
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && registration && Date.now() - lastUpdateCheck > 3600 * 1000) {
        lastUpdateCheck = Date.now();
        registration.update().catch(function () {});
      }
    });
  }

  // Primera vez: se espera a que la app quede guardada en el teléfono y se abre desde ahí
  // (así el .wasm de ~70 MB se baja una sola vez).
  function waitForInstall(timeoutMs) {
    return new Promise(function (resolve, reject) {
      if (!sw || sw.controller) return resolve();
      var done = false;
      function finish(ok, why) {
        if (done) return;
        done = true;
        clearInterval(poll);
        ok ? resolve() : reject(new Error(why));
      }
      sw.addEventListener("controllerchange", function () { finish(true); });
      var started = Date.now();
      var poll = setInterval(function () {
        if (sw.controller) finish(true);
        else if (installFailed) finish(false, installFailed);
        else if (Date.now() - started > timeoutMs) finish(false, "timeout");
      }, 250);
    });
  }

  // Lee el .wasm mostrando el progreso y lo entrega a wasm-bindgen como Response.
  window.pdfcraftFetchWasm = async function (url, expectedBytes) {
    if (sw && !sw.controller) {
      setStatus("Instalando PdfCraft en este iPhone…");
      try {
        await waitForInstall(10 * 60 * 1000);
      } catch (e) {
        console.warn("PdfCraft: sin instalación offline (" + e.message + "), se abre directo");
      }
    }
    setStatus("Abriendo PdfCraft…");
    var response;
    try {
      response = await fetch(url);
    } catch (e) {
      throw new Error("No se pudo descargar la app.\n" + SIN_RED);
    }
    if (!response.ok) throw new Error("No se pudo descargar la app (" + response.status + ").\n" + SIN_RED);
    if (!response.body || typeof ReadableStream !== "function") return response;
    var total = expectedBytes || Number(response.headers.get("Content-Length")) || 0;
    var loaded = 0;
    var reader = response.body.getReader();
    setProgress(0);
    var stream = new ReadableStream({
      async pull(controller) {
        var chunk = await reader.read();
        if (chunk.done) {
          setProgress(1);
          setStatus("Preparando…");
          controller.close();
          return;
        }
        loaded += chunk.value.byteLength;
        if (total) setProgress(loaded / total);
        controller.enqueue(chunk.value);
      },
      cancel(reason) { return reader.cancel(reason); }
    });
    return new Response(stream, { headers: { "Content-Type": "application/wasm" } });
  };

  window.addEventListener("TrunkApplicationStarted", function () {
    setStatus("Iniciando…");
    setTimeout(hideSplash, 600);
  });

  // Tamaño de interfaz para el celular la primera vez (se cambia en Preferencias).
  window.pdfcraftSeedSettings && window.pdfcraftSeedSettings();

  // --- iPhone/iPad: "Guardar" y "Exportar" abren la hoja de compartir ----------------------
  // (Guardar en Archivos, AirDrop, Mail…). Si iOS no la permite, se descarga como siempre.
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS && navigator.share && navigator.canShare && typeof File === "function") {
    var blobs = new Map();
    var createURL = URL.createObjectURL.bind(URL);
    var revokeURL = URL.revokeObjectURL.bind(URL);
    var anchorClick = HTMLAnchorElement.prototype.click;
    URL.createObjectURL = function (obj) {
      var url = createURL(obj);
      if (obj instanceof Blob) {
        blobs.set(url, obj);
        if (blobs.size > 16) blobs.delete(blobs.keys().next().value);
      }
      return url;
    };
    URL.revokeObjectURL = function (url) {
      revokeURL(url);
      setTimeout(function () { blobs.delete(url); }, 60000);
    };
    var types = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
      txt: "text/plain", html: "text/html", json: "application/json", svg: "image/svg+xml",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", rtf: "application/rtf" };
    HTMLAnchorElement.prototype.click = function () {
      var blob = this.download ? blobs.get(this.href) : null;
      if (!blob) return anchorClick.call(this);
      var name = this.download;
      var ext = (name.split(".").pop() || "").toLowerCase();
      var file = new File([blob], name, { type: blob.type || types[ext] || "application/octet-stream" });
      var ok = false;
      try { ok = navigator.canShare({ files: [file] }); } catch (e) { ok = false; }
      if (!ok) return anchorClick.call(this);
      navigator.share({ files: [file] }).catch(function (err) {
        if (err && err.name === "AbortError") return; // se cerró la hoja sin elegir
        var a = document.createElement("a");
        a.href = createURL(blob);
        a.download = name;
        document.body.appendChild(a);
        anchorClick.call(a);
        a.remove();
        setTimeout(function () { revokeURL(a.href); }, 60000);
      });
    };
  }
})();
