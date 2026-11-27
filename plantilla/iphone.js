// PdfCraft para iPhone: pantalla de carga, service worker sin conexión,
// actualizaciones automáticas, adaptación de teclado iOS y hoja de compartir.
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
    if (!splash || splash.hidden) return;
    splash.classList.add("pc-out");
    setTimeout(function () { splash.hidden = true; }, 340);
  }
  function toast(text, ms) {
    var existing = document.querySelectorAll(".pc-toast");
    existing.forEach(function (n) { n.remove(); });
    var el = document.createElement("div");
    el.className = "pc-toast";
    el.setAttribute("role", "status");
    el.textContent = text;
    document.body.appendChild(el);
    ms = ms || 3200;
    setTimeout(function () { el.style.opacity = "0"; }, ms);
    setTimeout(function () { el.remove(); }, ms + 380);
  }
  window.pdfcraftToast = toast;
  window.pdfcraftHideSplash = hideSplash;

  // ---------- Sincronización dinámica de la barra de estado del iPhone (<meta name="theme-color">) ----------
  window.pdfcraftSyncThemeColor = function (inViewer) {
    try {
      var html = document.documentElement;
      var themeAttr = html.getAttribute("data-theme");
      var isDark = themeAttr === "dark" ||
        (themeAttr !== "light" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
      var color = inViewer ? (isDark ? "#1a1a1c" : "#fafafc") : (isDark ? "#141414" : "#f4f4f6");
      html.style.backgroundColor = color;
      var metas = document.querySelectorAll('meta[name="theme-color"]');
      if (!metas.length) {
        var m = document.createElement("meta");
        m.name = "theme-color";
        m.content = color;
        document.head.appendChild(m);
      } else {
        metas[0].removeAttribute("media");
        metas[0].setAttribute("content", color);
        for (var i = 1; i < metas.length; i++) metas[i].remove();
      }
    } catch (e) {}
  };

  // ---------- Adaptación al teclado virtual del iPhone (visualViewport) ----------
  (function initVisualViewport() {
    var vv = window.visualViewport;
    if (!vv) return;
    var raf = 0;
    var lastH = 0;
    function sync() {
      raf = 0;
      var zoomed = (vv.scale || 1) > 1.02;
      if (zoomed) return;
      var h = Math.round(vv.height);
      var top = Math.max(0, Math.round(vv.offsetTop));
      var active = document.activeElement;
      var editing = !!(active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable));
      var kbOpen = (window.innerHeight - h > 120) || (editing && window.innerHeight - h > 70);
      document.documentElement.style.setProperty("--pc-vh", h + "px");
      document.documentElement.style.setProperty("--pc-vtop", top + "px");
      document.body.classList.toggle("pc-kb-open", kbOpen);
      if (Math.abs(h - lastH) > 4) {
        lastH = h;
        window.dispatchEvent(new CustomEvent("pc:viewport", { detail: { height: h, top: top, keyboard: kbOpen } }));
      }
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(sync); }
    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    window.addEventListener("orientationchange", function () { setTimeout(schedule, 160); });
    sync();
  })();

  window.addEventListener("error", function (e) {
    var t = e && e.target;
    if (t && t !== window && (t.src || t.href)) {
      if (t.tagName === "IMG" || t.tagName === "LINK") return;
      showError("No se pudo descargar " + (t.src || t.href).split("/").pop() + ".\n" + SIN_RED);
      return;
    }
    if (splash && !splash.hidden) showError((e && e.message) || "Error desconocido al cargar.");
  }, true);
  window.addEventListener("unhandledrejection", function (e) {
    var r = e && e.reason;
    if (splash && !splash.hidden) showError((r && (r.message || String(r))) || "Error desconocido al cargar.");
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

  window.pdfcraftWaitFirstInstall = async function () {
    if (!sw || sw.controller) return;
    setStatus("Instalando PdfCraft en este iPhone…");
    try {
      await waitForInstall(10 * 60 * 1000);
    } catch (e) {
      console.warn("PdfCraft: sin instalación offline (" + e.message + "), se abre directo");
    }
  };

  window.pdfcraftFetchWasm = async function (url, expectedBytes) {
    if (sw && !sw.controller) {
      await window.pdfcraftWaitFirstInstall();
    }
    var busyTxt = document.getElementById("pc-busy-text");
    var setMsg = function (t) {
      setStatus(t);
      if (busyTxt && busyTxt.parentElement && !busyTxt.parentElement.hidden) busyTxt.textContent = t;
    };
    setMsg("Cargando editor PdfCraft…");
    var response;
    try {
      response = await fetch(url);
    } catch (e) {
      throw new Error("No se pudo descargar el editor.\n" + SIN_RED);
    }
    if (!response.ok) throw new Error("No se pudo descargar el editor (" + response.status + ").\n" + SIN_RED);
    if (!response.body || typeof ReadableStream !== "function") return response;
    var total = expectedBytes || Number(response.headers.get("Content-Length")) || 0;
    var loaded = 0;
    var lastPct = -1;
    var reader = response.body.getReader();
    setProgress(0);
    var stream = new ReadableStream({
      async pull(controller) {
        var chunk = await reader.read();
        if (chunk.done) {
          setProgress(1);
          setMsg("Iniciando editor…");
          controller.close();
          return;
        }
        loaded += chunk.value.byteLength;
        if (total) {
          var frac = loaded / total;
          setProgress(frac);
          var pct = Math.min(100, Math.round(frac * 100));
          if (pct !== lastPct && pct % 10 === 0) {
            lastPct = pct;
            setMsg("Cargando editor… " + pct + "%");
          }
        }
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
  window.__pcRawCreateObjectURL = createURL;
  window.__pcRawRevokeObjectURL = revokeURL;
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
      if (blobs.size > 8) blobs.delete(blobs.keys().next().value);
    }
    return url;
  };
  URL.revokeObjectURL = function (url) {
    revokeURL(url);
    setTimeout(function () { blobs.delete(url); }, 15000);
  };
  function download(blob, name) {
    var a = document.createElement("a");
    a.href = createURL(blob);
    a.download = name;
    document.body.appendChild(a);
    anchorClick.call(a);
    a.remove();
    setTimeout(function () { revokeURL(a.href); }, 20000);
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
    blobs.delete(this.href);
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
