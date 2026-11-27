// PdfCraft para iPhone: pantalla de carga, service worker sin conexión,
// actualizaciones automáticas y hoja de compartir de iOS.
(function () {
  "use strict";

  if (!/[?&]control(=|&|$)/.test(location.search)) {
    try {
      history.replaceState(history.state, "", location.pathname + (location.search ? location.search + "&control" : "?control") + location.hash);
    } catch (e) {}
  }

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
  function toast(text, ms) {
    var existing = document.querySelectorAll(".pc-toast");
    existing.forEach(function (n) { n.remove(); });
    var el = document.createElement("div");
    el.className = "pc-toast";
    el.setAttribute("role", "status");
    el.textContent = text;
    document.body.appendChild(el);
    ms = ms || 3400;
    setTimeout(function () { el.style.opacity = "0"; }, ms);
    setTimeout(function () { el.remove(); }, ms + 400);
  }
  window.pdfcraftToast = toast;
  window.pdfcraftHideSplash = hideSplash;

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

  // --- Service worker ---
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
        window.pdfcraftUpdateReady = true;
        if (window.pdfcraftOnUpdate) window.pdfcraftOnUpdate();
        else toast("Se descargó una actualización de PdfCraft. Se aplicará al volver a Inicio.", 6000);
      }
    });
    sw.register("./sw.js", { scope: "./", updateViaCache: "none" }).then(function (reg) {
      registration = reg;
      reg.update().catch(function () {});
    }).catch(function (e) {
      installFailed = String((e && e.message) || e);
    });
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && registration && Date.now() - lastUpdateCheck > 5 * 60 * 1000) {
        lastUpdateCheck = Date.now();
        registration.update().catch(function () {});
      }
    });
  }

  window.pdfcraftCheckUpdate = async function () {
    if (!registration) { toast("Actualizaciones disponibles al abrir desde la web instalada."); return; }
    try {
      await registration.update();
      if (window.pdfcraftUpdateReady) {
        if (window.pdfcraftOnUpdate) window.pdfcraftOnUpdate();
      } else if (registration.installing || registration.waiting) {
        toast("Descargando actualización en segundo plano…");
      } else {
        toast("PdfCraft ya está en su última versión");
      }
    } catch (e) {
      toast("No se pudo comprobar actualizaciones (sin conexión)");
    }
  };

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
    if (!window.pdfcraftHoldSplash) setTimeout(hideSplash, 600);
  });

  window.pdfcraftSeedSettings && window.pdfcraftSeedSettings();

  // --- Archivos que PdfCraft guarda o exporta ---
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var blobs = new Map();
  var createURL = URL.createObjectURL.bind(URL);
  var revokeURL = URL.revokeObjectURL.bind(URL);
  var anchorClick = HTMLAnchorElement.prototype.click;
  var types = {
    pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    txt: "text/plain", html: "text/html", json: "application/json", svg: "image/svg+xml",
    zip: "application/zip", csv: "text/csv",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    rtf: "application/rtf",
  };
  URL.createObjectURL = function (obj) {
    var url = createURL(obj);
    if (obj instanceof Blob) {
      blobs.set(url, obj);
      if (blobs.size > 24) blobs.delete(blobs.keys().next().value);
    }
    return url;
  };
  URL.revokeObjectURL = function (url) {
    revokeURL(url);
    setTimeout(function () { blobs.delete(url); }, 60000);
  };
  function download(blob, name) {
    var a = document.createElement("a");
    a.href = createURL(blob);
    a.download = name;
    document.body.appendChild(a);
    anchorClick.call(a);
    a.remove();
    setTimeout(function () { revokeURL(a.href); }, 60000);
  }
  window.pdfcraftShareFile = async function (file) {
    if (!(isIOS && navigator.share && navigator.canShare)) { download(file, file.name); return true; }
    var ok = false;
    try { ok = navigator.canShare({ files: [file] }); } catch (e) { ok = false; }
    if (!ok) { download(file, file.name); return true; }
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (err) {
      if (err && err.name === "AbortError") return true;
      if (err && err.name === "NotAllowedError") return false;
      download(file, file.name);
      return true;
    }
  };
  HTMLAnchorElement.prototype.click = function () {
    var blob = this.download ? blobs.get(this.href) : null;
    if (!blob) return anchorClick.call(this);
    var name = this.download;
    var ext = (name.split(".").pop() || "").toLowerCase();
    var file = new File([blob], name, { type: blob.type || types[ext] || "application/octet-stream" });
    try {
      if (window.pdfcraftOnFile && window.pdfcraftOnFile(file)) return;
    } catch (e) { console.warn("PdfCraft: pdfcraftOnFile", e); }
    window.pdfcraftShareFile(file).then(function (done) {
      if (!done && window.pdfcraftOfferShare) window.pdfcraftOfferShare(file);
      else if (!done) download(file, name);
    });
  };
})();
