// PdfCraft para iPhone: interfaz de celular (inicio, visor y herramientas) sobre el motor de
// PdfCraft. PdfCraft corre en modo anfitrión de página (data-host="page" en el lienzo): los PDF le
// llegan con el evento pdfcraft:open y lo que guarda vuelve con pdfcraft:save. Lo demás se maneja
// con su API de página (window.pdfcraft, por ?control): ui.state, ui.set, ui.command y ui.key.
// Sus barras de escritorio se ocultan (view.toggle_interface) para dejar solo el documento, y los
// dedos se traducen en gestos.js.
(function () {
  "use strict";

  // ---------- Utilidades ----------
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const toast = (text, ms) => (window.pdfcraftToast ? window.pdfcraftToast(text, ms) : console.log(text));
  const canvas = $("pdfcraft");
  const body = document.body;

  const ICONS = {
    open: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M12 11v7 M8.5 14.5h7",
    file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M8.5 13h7 M8.5 16.5h5",
    settings: "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M12 2.8v2.6 M12 18.6v2.6 M4 7.4l2.3 1.3 M17.7 15.3l2.3 1.3 M4 16.6l2.3-1.3 M17.7 8.7L20 7.4",
    back: "M15 5l-7 7 7 7",
    search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M20 20l-4.8-4.8",
    share: "M12 3v12 M8 7l4-4 4 4 M7 10H5.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H17",
    more: "M5.5 12h.01 M12 12h.01 M18.5 12h.01",
    pencil: "M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z M13.5 6.5l4 4",
    comment: "M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4z M8 9h8 M8 12h5",
    sign: "M3 17c3-1 4-9 6-9s-1 9 1 9 3-4 4-4 1 3 3 3 M3 21h18",
    organize: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
    lock: "M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3 M12 15v2",
    word: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M8 12l1.6 6 2.4-4.5 2.4 4.5L16 12",
    image: "M4 5h16v14H4z M4 16l5-5 4 4 2-2 5 5 M15.5 9.5h.01",
    desktop: "M3 5h18v12H3z M8 21h8 M12 17v4",
    highlight: "M9 15l-2 5h5l1-2 M14 4l6 6-7 7-6-6z",
    underline: "M7 4v6a5 5 0 0 0 10 0V4 M5 20h14",
    strike: "M5 12h14 M16 7.5A4 3 0 0 0 12 5c-2.5 0-4 1.2-4 2.8 0 1.4 1.2 2.2 3 2.8 M8 16.5c.6 1.6 2.1 2.5 4 2.5 2.5 0 4.2-1.3 4.2-3.1",
    note: "M5 4h14v10l-6 6H5z M13 20v-6h6",
    draw: "M3 18c3 0 4-3 6-6s4-6 6-6 3 2 2 4-5 5-3 8 5 1 7-1",
    text: "M5 7V5h14v2 M12 5v14 M9 19h6",
    eraser: "M8 20h12 M5 15l9-9 5 5-9 9H9z",
    undo: "M9 14L4 9l5-5 M4 9h11a5 5 0 0 1 0 10h-3",
    redo: "M15 14l5-5-5-5 M20 9H9a5 5 0 0 0 0 10h3",
    check: "M5 12l5 5 9-10",
    cross: "M6 6l12 12 M18 6L6 18",
    dot: "M12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z",
    date: "M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5",
    initials: "M6 18V6h4.5a3 3 0 0 1 0 6H6 M6 12h5.5a3 3 0 0 1 0 6H6 M15 18l2.5-7 2.5 7",
    editText: "M4 7V5h11v2 M9.5 5v14 M7 19h5 M18 9v10 M16 9h4 M16 19h4",
    addText: "M4 6V4h12v2 M10 4v16 M7 20h6 M18 14v6 M15 17h6",
    link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
    rotate: "M20 11a8 8 0 1 0-2.3 5.7 M20 4v7h-7",
    trash: "M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3",
    plus: "M12 5v14 M5 12h14",
    copy: "M8 8h12v12H8z M16 8V4H4v12h4",
    extract: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M12 18v-7 M9 14l3-3 3 3",
    page: "M6 3h9l4 4v14H6z M9 12h6 M9 16h4",
    fit: "M3 12h18 M7 8l-4 4 4 4 M17 8l4 4-4 4",
    layout: "M7 3h10v8H7z M7 13h10v8H7z",
    single: "M7 4h10v16H7z",
    info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5 M12 8h.01",
    close: "M6 6l12 12 M18 6L6 18",
    up: "M6 15l6-6 6 6",
    down: "M6 9l6 6 6-6",
  };
  const BOLD_ICONS = { more: 3.2, dot: 3 };
  function icon(name) {
    const w = BOLD_ICONS[name] ? ` style="stroke-width:${BOLD_ICONS[name]}"` : "";
    return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"${w}><path d="${ICONS[name] || ""}"/></svg>`;
  }
  // Crea un elemento. El texto siempre va con textContent (los nombres de archivo no son HTML).
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "icon") el.insertAdjacentHTML("beforeend", icon(v));
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  for (const el of document.querySelectorAll("[data-icon]")) el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon));

  // ---------- Preferencias de esta interfaz ----------
  const PREFS_KEY = "pdfcraft-movil";
  // Tamaño de lo que se ve de PdfCraft (diálogos, notas, búsqueda), en px de pantalla por punto.
  // En un iPhone el máximo de PdfCraft (300 %) da 1,0.
  const SIZES = { pequeno: 0.85, mediano: 0.92, grande: 1.0 };
  const COMPACT_SIZE = 0.8; // organizar páginas: su barra es ancha
  const DESKTOP_SIZE = 0.8; // interfaz completa
  const MIN_DIALOG_SIZE = 0.6; // un diálogo más ancho que la pantalla se achica hasta caber, no más
  const prefs = Object.assign({ tamano: "grande", nombre: "", tema: "auto" }, readPrefs());
  if (!SIZES[prefs.tamano]) prefs.tamano = "grande";
  function readPrefs() { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); } catch (e) { return {}; } }
  function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* sin almacenamiento */ } }
  function applyThemeAttr() {
    if (prefs.tema === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", prefs.tema === "oscuro" ? "dark" : "light");
  }
  applyThemeAttr();

  // ---------- Archivos guardados en la app (IndexedDB) ----------
  // "meta": nombre, tamaño, fechas y miniatura; "datos": el PDF. Separados para listar sin leer los PDF.
  const MAX_RECIENTES = 40;
  let dbPromise = null;
  function db() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const r = indexedDB.open("pdfcraft-movil", 1);
        r.onupgradeneeded = () => {
          r.result.createObjectStore("meta", { keyPath: "id" });
          r.result.createObjectStore("datos");
        };
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    }
    return dbPromise;
  }
  function done(req) { return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
  async function storeOf(name, mode) { return (await db()).transaction(name, mode).objectStore(name); }
  const files = {
    async list() { return (await done((await storeOf("meta", "readonly")).getAll())).sort((a, b) => b.abierto - a.abierto); },
    async blob(id) { return done((await storeOf("datos", "readonly")).get(id)); },
    async putMeta(meta) { return done((await storeOf("meta", "readwrite")).put(meta)); },
    async save(meta, blob) {
      const t = (await db()).transaction(["meta", "datos"], "readwrite");
      t.objectStore("meta").put(meta);
      t.objectStore("datos").put(blob, meta.id);
      await new Promise((resolve, reject) => { t.oncomplete = resolve; t.onerror = () => reject(t.error); t.onabort = () => reject(t.error); });
      await files.trim();
    },
    async remove(id) {
      const t = (await db()).transaction(["meta", "datos"], "readwrite");
      t.objectStore("meta").delete(id);
      t.objectStore("datos").delete(id);
      await new Promise((resolve, reject) => { t.oncomplete = resolve; t.onerror = () => reject(t.error); });
    },
    async trim() {
      const all = await files.list();
      for (const old of all.slice(MAX_RECIENTES)) await files.remove(old.id);
    },
  };
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ---------- PdfCraft ----------
  const pc = {
    ok: () => !!(window.pdfcraft && typeof window.pdfcraft.request === "function"),
    state: () => window.pdfcraft.docInspect(),
    run: (id) => window.pdfcraft.execute(id),
    set: (key, value) => window.pdfcraft.request("ui.set", { key, value: String(value) }),
    key: (key, modifiers) => window.pdfcraft.request("ui.key", modifiers ? { key, modifiers } : { key }),
  };
  const allHidden = (hi) => !!(hi && hi.toolbar && hi.menubar && hi.window_ui);
  const BASE_TOOL = "select"; // tocar un campo lo rellena; los dedos desplazan (gestos.js)

  const S = {
    ready: false,
    doc: null,          // documento a la vista: { id, meta, name, pages, dirty, dirtySince }
    docs: new Map(),    // id de PdfCraft → { meta, name }
    opening: false,
    preparing: false,
    mode: null,         // "comentar" | "firmar" | "editar" | "organizar"
    tool: null,         // herramienta elegida (nombre de ui.set quick) o null
    toolSetAt: 0,
    modal: false,       // hay un diálogo de PdfCraft abierto
    desktop: false,     // interfaz completa de PdfCraft
    searching: false,
    last: null,         // último ui.state
    ratio: 1,           // px de pantalla (CSS) por punto de PdfCraft, ahora
    r100: 0,            // lo mismo con la interfaz al 100 %
    scalePct: 0,
    chrome: 0,          // alto de la barra de pestañas de PdfCraft que queda fuera de la vista (px)
    fitZoom: 0,         // zoom con que se ajustó al ancho (para reajustar al girar el teléfono)
    polling: false,
    saveWaiters: [],
    appVersion: "",
  };

  // ---------- Eventos del modo anfitrión ----------
  canvas.addEventListener("pdfcraft:ready", (e) => { S.appVersion = (e.detail && e.detail.appVersion) || ""; });
  canvas.addEventListener("pdfcraft:dirty", (e) => {
    if (!S.doc) return;
    setDirty(!!(e.detail && e.detail.dirty));
  });
  canvas.addEventListener("pdfcraft:failed", (e) => {
    const err = $("pc-error");
    if (err) { err.hidden = false; err.textContent = "PdfCraft no pudo arrancar: " + ((e.detail && e.detail.error) || ""); }
  });
  canvas.addEventListener("pdfcraft:save", (e) => { onSaved(e.detail || {}).catch((err) => toast("No se pudo guardar: " + err.message, 5000)); });

  function setDirty(dirty) {
    if (!S.doc || S.doc.dirty === dirty) return;
    S.doc.dirty = dirty;
    S.doc.dirtySince = dirty ? Date.now() : 0;
    renderTop();
  }

  // Lo que PdfCraft guarda. Un PDF abierto en la app se actualiza (con tus cambios); un PDF nuevo
  // (p. ej. páginas extraídas) se agrega a la app; lo demás (imagen, Word…) se comparte.
  async function onSaved(d) {
    const name = d.name || "documento.pdf";
    const isPdf = /\.pdf$/i.test(name);
    const bytes = d.bytes instanceof ArrayBuffer ? d.bytes : (d.bytes && d.bytes.buffer) || new ArrayBuffer(0);
    const file = new File([bytes], name, { type: isPdf ? "application/pdf" : "" });
    const waiters = S.saveWaiters.filter((w) => w.name === name);
    S.saveWaiters = S.saveWaiters.filter((w) => w.name !== name);
    if (isPdf && !d.saveAs) {
      const entry = S.doc && S.doc.name === name ? { meta: S.doc.meta } : [...S.docs.values()].find((x) => x.name === name);
      if (entry) {
        entry.meta.tamano = file.size;
        entry.meta.modificado = Date.now();
        await files.save(entry.meta, file);
        waiters.forEach((w) => w.resolve(file));
        return;
      }
    }
    waiters.forEach((w) => w.resolve(file));
    if (isPdf) {
      const meta = { id: newId(), nombre: name, tamano: file.size, abierto: Date.now(), modificado: Date.now() };
      await files.save(meta, file);
      if (waiters.length) return;
      sheet({
        title: "Archivo listo",
        text: name + " · se guardó también en Recientes.",
        build: (close) => [h("button", { class: "pc-primary", type: "button", text: "Compartir o guardar en Archivos", onclick: () => { close(); share(file); } })],
      });
      return;
    }
    if (!waiters.length) await share(file);
  }

  // Guarda el documento activo de PdfCraft (se llama `name` en PdfCraft); devuelve el PDF guardado.
  function saveActive(name) {
    return new Promise((resolve, reject) => {
      const w = { name, resolve: (f) => { clearTimeout(timer); resolve(f); }, reject };
      const timer = setTimeout(() => {
        S.saveWaiters = S.saveWaiters.filter((x) => x !== w);
        reject(new Error("PdfCraft no respondió"));
      }, 30000);
      S.saveWaiters.push(w);
      pc.run("file.save").catch((e) => {
        clearTimeout(timer);
        S.saveWaiters = S.saveWaiters.filter((x) => x !== w);
        reject(e);
      });
    });
  }

  // El documento a la vista como archivo, guardando antes los cambios.
  async function currentFile() {
    if (!S.doc) return null;
    if (S.doc.dirty) return saveActive(S.doc.name);
    const blob = await files.blob(S.doc.meta.id);
    return blob ? new File([blob], S.doc.meta.nombre, { type: "application/pdf" }) : saveActive(S.doc.name);
  }

  async function share(file) {
    if (!file) return;
    const doneShare = window.pdfcraftShareFile ? await window.pdfcraftShareFile(file) : false;
    if (!doneShare) offerShare(file);
  }
  // iOS solo abre la hoja de compartir justo después de un toque: si ya pasó, se pide uno.
  function offerShare(file) {
    sheet({
      title: "Archivo listo",
      text: file.name,
      build: (close) => [h("button", { class: "pc-primary", type: "button", text: "Compartir o guardar en Archivos", onclick: () => { close(); share(file); } })],
    });
  }
  window.pdfcraftOfferShare = offerShare;

  // ---------- Arranque ----------
  window.pdfcraftHoldSplash = true;
  window.addEventListener("TrunkApplicationStarted", () => {
    start().catch((e) => { console.error(e); if (window.pdfcraftHideSplash) window.pdfcraftHideSplash(); });
  });

  let gestures = null;
  async function start() {
    for (let i = 0; i < 400 && !pc.ok(); i++) await sleep(50);
    if (!pc.ok()) throw new Error("sin window.pdfcraft");
    for (let i = 0; ; i++) {
      try { S.last = await pc.state(); break; } catch (e) { if (i > 40) throw e; await sleep(250); }
    }
    S.ready = true;
    await calibrate();
    const quiet = (p) => p.catch(() => {});
    quiet(pc.set("show_page_edge_shadows", "false"));
    quiet(pc.set("comment-tool-pinned", "true"));
    if (prefs.nombre) quiet(pc.set("author", prefs.nombre));
    if (prefs.tema !== "auto") quiet(pc.run(prefs.tema === "oscuro" ? "view.theme.dark" : "view.theme.light"));
    gestures = window.pdfcraftGestures && window.pdfcraftGestures.attach(canvas, {
      mode: () => (S.desktop ? "raton-zoom" : S.modal ? "raton" : S.tool ? "herramienta" : "ver"),
      ratio: () => S.ratio,
      onTap: hideSelectionBar,
      onLongPress: hideSelectionBar,
      onSelectEnd: (x, y, moved) => { if (moved && !S.mode && !S.modal && !S.desktop) showSelectionBar(); },
    });
    renderHome();
    if (window.pdfcraftHideSplash) window.pdfcraftHideSplash();
    setInterval(tick, 300);
    document.addEventListener("visibilitychange", () => {
      // iOS puede cerrar la app en segundo plano: los cambios se guardan al salir.
      if (document.visibilityState === "hidden" && S.doc && S.doc.dirty && !S.modal) saveActive(S.doc.name).catch(() => {});
    });
  }

  // Tamaño de la interfaz de PdfCraft: se mide cuántos px de pantalla ocupa un punto al 100 % y se
  // ajusta al tamaño elegido.
  async function calibrate() {
    try {
      await pc.set("ui-scale", "100");
      S.scalePct = 100;
      S.r100 = await measureRatio();
      S.ratio = S.r100;
      await applyScale();
    } catch (e) { console.warn("PdfCraft: sin calibrar", e); }
  }
  async function measureRatio() {
    let last = 0;
    for (let i = 0; i < 25; i++) {
      await sleep(60);
      const s = await pc.state();
      const r = canvas.clientWidth / ((s.window && s.window.width) || canvas.clientWidth);
      if (i > 1 && Math.abs(r - last) < 0.001) return r;
      last = r;
    }
    return last;
  }
  function targetSize() {
    const base = SIZES[prefs.tamano];
    if (S.desktop) return DESKTOP_SIZE;
    if (S.modal) return Math.min(base, S.dialogFit || base);
    if (S.mode === "organizar") return Math.min(base, COMPACT_SIZE);
    return base;
  }

  // Los diálogos de PdfCraft tienen ancho de escritorio: si uno no cabe, se achica la interfaz lo
  // justo para que quepa (su tamaño sale del árbol de accesibilidad, en puntos).
  async function fitDialog(s) {
    if (!s.window || !s.window.width) return;
    const W = s.window.width, H = s.window.height;
    const found = await window.pdfcraft.uiInspect({});
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const w of found.widgets || []) {
      const r = w.rect;
      if (!r || r.length !== 4 || r[3] <= 40) continue; // la barra de pestañas
      if (r[3] - r[1] > H * 0.95 || r[2] - r[0] > W * 1.2) continue; // el área del documento
      x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]); x1 = Math.max(x1, r[2]); y1 = Math.max(y1, r[3]);
    }
    if (!(x1 > x0) || (x0 >= 2 && x1 <= W - 2 && y1 - y0 + 32 <= H)) return;
    const fit = Math.min(canvas.clientWidth / (x1 - x0 + 32), canvas.clientHeight / (y1 - y0 + 32));
    const target = Math.max(MIN_DIALOG_SIZE, Math.min(targetSize(), fit));
    if (target < targetSize() - 0.005) {
      S.dialogFit = target;
      await applyScale();
    }
  }
  async function applyScale() {
    if (!S.r100) return;
    const pct = Math.max(50, Math.min(300, Math.round((100 * targetSize()) / S.r100)));
    if (pct === S.scalePct) return;
    const grew = pct > S.scalePct;
    S.scalePct = pct;
    S.ratio = (S.r100 * pct) / 100;
    await pc.set("ui-scale", String(pct));
    if (grew && S.doc && !S.modal && !S.desktop && S.mode !== "organizar") {
      await sleep(120);
      await recenter().catch(() => {});
    }
  }

  // ---------- Estado periódico ----------
  async function tick() {
    if (!S.ready || S.polling || document.visibilityState !== "visible") return;
    S.polling = true;
    try {
      const s = await pc.state();
      S.last = s;
      if (s.window && s.window.width) S.ratio = canvas.clientWidth / s.window.width;
      const modal = !!(s.dialog || s.password_prompt || s.close_prompt || s.palette_open);
      if (modal !== S.modal) {
        S.modal = modal;
        S.dialogFit = 0;
        body.classList.toggle("pc-modal", modal);
        if (modal) { busy(false); hideSelectionBar(); }
        await applyScale();
      } else if (modal) {
        await fitDialog(s);
      }
      if (!body.classList.contains("pc-in-viewer")) return;
      layoutCanvas(s);
      if (S.opening || S.preparing) return;
      const docs = s.documents || [];
      const active = docs.find((d) => d.active);
      if (!active) {
        // Se cerró el documento desde PdfCraft.
        if (!docs.length && S.doc && !S.modal && !S.desktop) { S.doc = null; showHome(); }
        return;
      }
      if (!S.doc || active.doc !== S.doc.id) {
        if (!S.modal && !S.desktop) await adopt(active);
        return;
      }
      S.doc.pages = active.pages;
      setDirty(!!active.dirty);
      updatePill(s);
      if (!S.desktop && !S.modal) syncTool(s);
      if (!S.desktop && !S.modal && S.mode !== "organizar" && gestures && !gestures.busy() && Date.now() - (S.recenteredAt || 0) > 1000) {
        S.recenteredAt = Date.now();
        await recenter(s);
      }
      if (S.mode === "organizar" && s.active && !s.active.organize && !S.modal) exitMode();
      if (S.searching && s.active && !s.active.find_open && Date.now() - S.searchOpenedAt > 1500) closeSearch(false);
      else if (S.searching && s.active && s.active.find_open) await readFind();
      // Guardado automático en la app medio minuto después del último cambio.
      if (S.doc.dirty && S.doc.dirtySince && Date.now() - S.doc.dirtySince > 30000 && !S.modal && !S.saveWaiters.length) {
        S.doc.dirtySince = Date.now();
        saveActive(S.doc.name).catch(() => {});
      }
    } catch (e) {
      /* PdfCraft ocupado: se reintenta en el siguiente ciclo */
    } finally {
      S.polling = false;
    }
  }

  // PdfCraft pasó a otro documento (p. ej. uno nuevo de páginas extraídas): se sigue con ese.
  async function adopt(active) {
    let entry = S.docs.get(active.doc);
    if (!entry) {
      entry = { name: active.name, meta: { id: newId(), nombre: active.name, tamano: 0, abierto: Date.now(), modificado: Date.now(), paginas: active.pages } };
      S.docs.set(active.doc, entry);
    }
    if (S.mode) await exitMode();
    const before = S.doc;
    S.doc = { id: active.doc, meta: entry.meta, name: active.name, pages: active.pages, dirty: !!active.dirty, dirtySince: active.dirty ? Date.now() : 0 };
    renderTop();
    await prepareDocument();
    if (before) toast("Se abrió «" + active.name + "». Al volver a Inicio quedará en Recientes, junto al original.", 6000);
  }

  // La barra de pestañas de PdfCraft (lo único que no oculta view.toggle_interface) queda fuera
  // de la vista: el lienzo sube lo que mide.
  function layoutCanvas(s) {
    let chrome = 0;
    if (S.desktop || S.modal) {
      chrome = 0;
    } else if (s.active && s.active.organize) {
      chrome = S.chrome; // la vista de organizar mide distinto: se deja como estaba
    } else if (s.active && s.window && s.window.width && allHidden(s.hidden_interface)) {
      // Buscando, la barra de búsqueda de PdfCraft (más ancha que la pantalla) también queda
      // tapada: sus resultados y flechas se muestran abajo, en la barra de la app.
      const top = S.searching && S.findBottom ? Math.max(s.active.viewport[1], S.findBottom + 4) : s.active.viewport[1];
      chrome = top * (canvas.clientWidth / s.window.width);
    }
    if (Math.abs(chrome - S.chrome) > 0.5) {
      S.chrome = chrome;
      $("pc-doc").style.setProperty("--pc-chrome", chrome.toFixed(1) + "px");
    }
  }

  function updatePill(s) {
    const pill = $("pc-pill");
    const page = s.active ? s.active.page : 1;
    const text = page + " / " + (S.doc ? S.doc.pages : 1);
    if (pill.textContent !== text) pill.textContent = text;
  }

  // PdfCraft vuelve a Seleccionar tras algunas acciones; fuera de una herramienta, siempre
  // Seleccionar (los gestos desplazan y el toque rellena campos y sigue enlaces).
  function syncTool(s) {
    if (Date.now() - S.toolSetAt < 1500) return;
    const q = s.quick_tool;
    if (S.tool && q !== S.tool) {
      S.tool = q === BASE_TOOL || q === "hand" ? null : q;
      renderToolbar();
    }
    if (!S.tool && q !== BASE_TOOL && S.mode !== "organizar") pc.set("quick", BASE_TOOL).catch(() => {});
  }

  // ---------- Inicio ----------
  const HOME_TOOLS = [
    { t: "Comentar", i: "comment", c: "#e8590c", mode: "comentar" },
    { t: "Rellenar y firmar", i: "sign", c: "#7048e8", mode: "firmar" },
    { t: "Editar PDF", i: "pencil", c: "#d6336c", mode: "editar" },
    { t: "Organizar páginas", i: "organize", c: "#2f9e44", mode: "organizar" },
    { t: "Proteger PDF", i: "lock", c: "#1c7ed6", cmd: "protect.password" },
    { t: "Exportar a Word", i: "word", c: "#1971c2", cmd: "export.docx" },
    { t: "Exportar imagen", i: "image", c: "#0ca678", cmd: "export.image" },
    { t: "Todas las herramientas", i: "desktop", c: "#495057", desktop: true },
  ];

  function toolTile(tool, onclick) {
    const tile = h("span", { class: "pc-tile", icon: tool.i });
    tile.style.background = tool.c;
    return h("button", { class: "pc-tool", type: "button", onclick }, tile, h("span", { text: tool.t }));
  }

  function renderHome() {
    $("pc-tools").replaceChildren(...HOME_TOOLS.map((tool) => toolTile(tool, () => homeTool(tool))));
    $("pc-settings").replaceChildren();
    $("pc-settings").insertAdjacentHTML("afterbegin", icon("settings"));
    refreshRecents();
  }

  async function refreshRecents() {
    let list = [];
    try { list = await files.list(); } catch (e) { console.warn("PdfCraft: sin almacenamiento", e); }
    const ul = $("pc-recents");
    $("pc-empty").hidden = list.length > 0;
    ul.hidden = list.length === 0;
    ul.replaceChildren(...list.map((meta) => {
      const thumb = h("span", { class: "pc-thumb" });
      if (meta.miniatura) thumb.append(h("img", { src: meta.miniatura, alt: "" }));
      else thumb.insertAdjacentHTML("afterbegin", icon("file"));
      return h("li", { class: "pc-recent" },
        h("button", { class: "pc-recent-open", type: "button", onclick: () => openRecent(meta) },
          thumb,
          h("span", { class: "pc-recent-text" }, h("b", { text: meta.nombre }), h("small", { text: describe(meta) }))),
        h("button", { class: "pc-recent-more", type: "button", "aria-label": "Opciones de " + meta.nombre, icon: "more", onclick: () => recentMenu(meta) }));
    }));
  }

  function describe(meta) {
    const d = new Date(meta.modificado || meta.abierto);
    const today = new Date();
    const when = d.toDateString() === today.toDateString()
      ? "Hoy, " + d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("es", { day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
    const pages = meta.paginas ? " · " + meta.paginas + (meta.paginas === 1 ? " página" : " páginas") : "";
    return when + " · " + sizeText(meta.tamano || 0) + pages;
  }
  function sizeText(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / 1024 / 1024).toFixed(1).replace(".", ",") + " MB";
  }

  function recentMenu(meta) {
    sheet({
      title: meta.nombre,
      build: (close) => [list([
        { i: "open", t: "Abrir", run: () => { close(); openRecent(meta); } },
        { i: "share", t: "Compartir", run: async () => { close(); const b = await files.blob(meta.id); if (b) share(new File([b], meta.nombre, { type: "application/pdf" })); } },
        { i: "trash", t: "Quitar de la app", danger: true, run: () => { close(); confirmRemove(meta); } },
      ])],
    });
  }
  function confirmRemove(meta) {
    sheet({
      title: "¿Quitar de la app?",
      text: meta.nombre + " se borrará de PdfCraft en este iPhone, con sus cambios. El original en Archivos no se toca.",
      build: (close) => [list([{ i: "trash", t: "Quitar", danger: true, run: async () => { close(); await files.remove(meta.id); refreshRecents(); toast("Se quitó de la app"); } }])],
    });
  }

  // Abrir un PDF de Archivos. La herramienta elegida en Inicio se usa al abrirlo.
  let pendingTool = null;
  function pickFile(tool) {
    pendingTool = tool || null;
    const input = $("pc-file");
    input.value = "";
    input.click();
  }
  $("pc-file").addEventListener("change", async () => {
    const file = $("pc-file").files && $("pc-file").files[0];
    if (!file) return;
    const meta = { id: newId(), nombre: file.name || "documento.pdf", tamano: file.size, abierto: Date.now(), modificado: file.lastModified || Date.now() };
    try {
      await files.save(meta, file);
    } catch (e) {
      toast("No se pudo guardar una copia en la app; se abre igual.");
    }
    openDocument(meta, file, pendingTool);
    pendingTool = null;
  });

  function homeTool(tool) {
    if (tool.desktop) { setDesktop(true); return; }
    pickFile(tool);
  }

  async function openRecent(meta) {
    const blob = await files.blob(meta.id);
    if (!blob) { toast("Ese archivo ya no está en la app."); await files.remove(meta.id); refreshRecents(); return; }
    meta.abierto = Date.now();
    files.putMeta(meta).catch(() => {});
    openDocument(meta, blob, null);
  }

  // ---------- Visor ----------
  async function openDocument(meta, blob, tool) {
    if (!S.ready) { toast("PdfCraft todavía está iniciando"); return; }
    S.opening = true;
    showViewer();
    renderTop(meta.nombre);
    busy(true, "Abriendo " + meta.nombre + "…");
    try {
      if (!(await closeAll())) { busy(false); return; }
      showViewer();
      renderTop(meta.nombre);
      busy(true, "Abriendo " + meta.nombre + "…");
      const before = new Set(((await pc.state()).documents || []).map((d) => d.doc));
      const bytes = await blob.arrayBuffer();
      canvas.dispatchEvent(new CustomEvent("pdfcraft:open", { detail: { name: meta.nombre, bytes } }));
      const started = Date.now();
      let doc = null;
      let sawPending = false;
      while (!doc) {
        await sleep(150);
        const s = await pc.state();
        const fresh = (s.documents || []).find((d) => !before.has(d.doc));
        // PdfCraft abre en segundo plano si ya se usó la app: se pasa a esa pestaña.
        if (fresh && !fresh.active) { await pc.run("view.next_tab").catch(() => {}); continue; }
        doc = fresh;
        const pending = (s.pending_opens || []).length > 0;
        sawPending = sawPending || pending;
        const waitingUser = s.password_prompt || s.dialog;
        if (waitingUser) busy(false);
        // Si PdfCraft empezó a leerlo y terminó sin abrirlo, el archivo no sirve.
        if (!doc && !waitingUser && sawPending && !pending && Date.now() - started > 1500) throw new Error("El archivo no se pudo abrir. ¿Es un PDF válido?");
        if (!doc && !waitingUser && Date.now() - started > 45000) throw new Error("PdfCraft tardó demasiado en abrirlo.");
      }
      S.docs.set(doc.doc, { meta, name: doc.name });
      S.doc = { id: doc.doc, meta, name: doc.name, pages: doc.pages, dirty: !!doc.dirty, dirtySince: 0 };
      if (meta.paginas !== doc.pages) { meta.paginas = doc.pages; files.putMeta(meta).catch(() => {}); }
      await prepareDocument();
      busy(false);
      renderTop();
      if (tool && tool.mode) enterMode(tool.mode);
      else if (tool && tool.cmd) runCommand(tool.cmd);
      if (!meta.miniatura) setTimeout(() => thumbnail(meta), 1200);
    } catch (e) {
      busy(false);
      toast(e.message || "No se pudo abrir el archivo.", 5000);
      S.doc = null;
      showHome();
    } finally {
      S.opening = false;
    }
  }

  async function prepareDocument() {
    S.preparing = true;
    try {
      let s = await pc.state();
      if (s.active && !allHidden(s.hidden_interface)) {
        await pc.run("view.toggle_interface");
        shield();
      }
      await pc.set("quick", BASE_TOOL);
      S.tool = null;
      for (let i = 0; i < 20; i++) {
        s = await pc.state();
        if (s.active && s.active.pages_on_screen && s.active.pages_on_screen.length) break;
        await sleep(80);
      }
      layoutCanvas(s);
      await sleep(60);
      const page = s.active ? s.active.page : 1;
      await fitWidth();
      await pc.set("page", String(page)); // el zoom no mueve la página en que estabas
      updatePill(await pc.state());
    } finally {
      S.preparing = false;
    }
  }

  // El aviso "Pulse F8 para mostrarlas" de PdfCraft sale abajo un par de segundos: se tapa.
  function shield() {
    const el = $("pc-shield");
    el.hidden = false;
    el.style.opacity = "1";
    clearTimeout(shield.timer);
    shield.timer = setTimeout(() => { el.style.opacity = "0"; setTimeout(() => { el.hidden = true; }, 300); }, 3200);
  }

  // Ajusta la página al ancho de la pantalla con un margen pequeño (el ajuste de PdfCraft deja
  // márgenes de escritorio).
  async function fitWidth() {
    const s = await pc.state();
    const a = s.active;
    if (!a || a.organize || !a.pages_on_screen || !a.pages_on_screen.length) return;
    const vw = a.viewport[2] - a.viewport[0];
    const p = a.pages_on_screen[0].rect;
    const pw = p[2] - p[0];
    if (!(vw > 0 && pw > 0)) return;
    const margin = Math.max(6, vw * 0.025);
    const zoom = Math.max(5, Math.floor(((a.zoom_percent * (vw - 2 * margin)) / pw) * 10) / 10);
    await pc.set("zoom", String(zoom));
    S.fitZoom = zoom;
    await sleep(80);
    await recenter();
  }

  // Desplaza el documento (dx, dy) puntos con una rueda simulada sobre su centro (PdfCraft solo
  // mueve lo que está bajo el puntero y solo si su lienzo tiene el foco).
  function scrollDoc(dx, dy) {
    const r = canvas.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const active = document.activeElement;
    if (active !== canvas && !(active && active.tagName === "INPUT" && canvas.parentNode.contains(active))) canvas.focus({ preventScroll: true });
    canvas.dispatchEvent(new MouseEvent("mousemove", { clientX: x, clientY: y, bubbles: true }));
    const n = Math.ceil(Math.hypot(dx, dy) / 7);
    for (let i = 0; i < n; i++) canvas.dispatchEvent(new WheelEvent("wheel", { clientX: x, clientY: y, deltaX: dx / n, deltaY: dy / n, deltaMode: 0, bubbles: true, cancelable: true }));
    setTimeout(() => canvas.dispatchEvent(new MouseEvent("mouseleave", { clientX: -1, clientY: -1 })), 300);
  }

  // Si la página cabe a lo ancho, queda centrada, como en iOS. PdfCraft deja márgenes laterales
  // anchos y la corre al cambiar el tamaño de la interfaz o al saltar a un resultado de búsqueda.
  async function recenter(state) {
    const s = state || (await pc.state());
    const a = s.active;
    if (!a || a.organize || !a.pages_on_screen || !a.pages_on_screen.length) return;
    const vw = a.viewport[2] - a.viewport[0];
    const p = a.pages_on_screen[0].rect;
    const pw = p[2] - p[0];
    if (pw > vw + 1) return;
    const dx = p[0] - (a.viewport[0] + (vw - pw) / 2);
    if (Math.abs(dx) >= 2) scrollDoc(dx, 0);
  }

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(async () => {
      if (!S.ready) return;
      try {
        const s = await pc.state();
        layoutCanvas(s);
        // Si no se hizo zoom a mano, se vuelve a ajustar al ancho (p. ej. al girar el teléfono).
        if (S.doc && s.active && S.fitZoom && Math.abs(s.active.zoom_percent - S.fitZoom) < 0.6) {
          await sleep(120);
          const page = s.active.page;
          await fitWidth();
          await pc.set("page", String(page));
        }
      } catch (e) { /* se reintenta en el próximo cambio */ }
    }, 350);
  });

  // Cierra todos los documentos de PdfCraft guardando antes sus cambios en la app.
  async function closeAll() {
    if (S.mode) await exitMode();
    if (S.searching) closeSearch();
    hideSelectionBar();
    for (let i = 0; i < 12; i++) {
      const s = await pc.state();
      const active = (s.documents || []).find((d) => d.active);
      if (!active) break;
      if (active.dirty) {
        try {
          await saveActive(active.name);
        } catch (e) {
          toast("No se pudieron guardar los cambios: " + e.message, 5000);
          return false;
        }
      }
      try { await pc.run("file.close"); } catch (e) { break; }
      await sleep(100);
      S.docs.delete(active.doc);
    }
    S.doc = null;
    return true;
  }

  async function goHome() {
    const hadChanges = !!(S.doc && S.doc.dirty);
    busy(true, hadChanges ? "Guardando…" : "Cerrando…");
    const ok = await closeAll();
    busy(false);
    if (!ok) return;
    if (hadChanges) toast("Cambios guardados en la app");
    showHome();
  }

  function showViewer() {
    body.classList.add("pc-in-viewer");
    renderToolbar();
  }
  // Actualización lista: se aplica (recargando) en Inicio, sin documentos abiertos.
  function updateNowIfIdle() {
    if (!window.pdfcraftUpdateReady || S.doc || S.desktop || body.classList.contains("pc-in-viewer")) return false;
    location.reload();
    return true;
  }
  window.pdfcraftOnUpdate = () => {
    if (!updateNowIfIdle()) toast("Hay una actualización de PdfCraft lista: se aplicará al volver a Inicio.", 6000);
  };

  function showHome() {
    body.classList.remove("pc-in-viewer", "pc-mode", "pc-searching");
    if (updateNowIfIdle()) return;
    S.mode = null;
    S.searching = false;
    hideSelectionBar();
    refreshRecents();
  }
  function busy(on, text) {
    $("pc-busy").hidden = !on;
    if (text) $("pc-busy-text").textContent = text;
  }

  // Miniatura de la primera página para Recientes (de una captura de PdfCraft).
  async function thumbnail(meta) {
    try {
      if (!S.doc || S.doc.meta !== meta || S.modal) return;
      const s = await pc.state();
      const first = s.active && (s.active.pages_on_screen || []).find((p) => p.page === 1);
      if (!first || !s.window) return;
      const shot = await window.pdfcraft.screenshot({});
      const data = shot && (shot.data || shot.png || shot.image);
      if (!data) return;
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = "data:image/png;base64," + data; });
      const k = img.width / s.window.width;
      const [x0, y0, x1, y1] = first.rect;
      const top = Math.max(y0, s.active.viewport[1]);
      const w = (x1 - x0) * k;
      const hgt = Math.min(y1 - top, (x1 - x0) * 1.3) * k;
      if (w < 20 || hgt < 20) return;
      const out = document.createElement("canvas");
      out.width = 120;
      out.height = Math.round((120 * hgt) / w);
      out.getContext("2d").drawImage(img, x0 * k, top * k, w, hgt, 0, 0, out.width, out.height);
      meta.miniatura = out.toDataURL("image/jpeg", 0.7);
      await files.putMeta(meta);
    } catch (e) { /* sin miniatura: se ve el ícono */ }
  }

  // ---------- Barra superior ----------
  function renderTop(name) {
    const top = $("pc-top");
    if (S.searching) {
      const input = h("input", { type: "search", placeholder: "Buscar en el documento", enterkeyhint: "search", autocomplete: "off", autocorrect: "off", autocapitalize: "off", spellcheck: "false", "aria-label": "Buscar en el documento" });
      let timer = null;
      const find = () => { if (input.value.trim()) pc.set("find", input.value.trim()).catch(() => {}); };
      input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(find, 350); });
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); clearTimeout(timer); input.blur(); find(); } });
      top.replaceChildren(
        h("label", { class: "pc-search" }, h("span", { icon: "search" }), input),
        h("button", { class: "pc-text-btn", type: "button", text: "Cancelar", onclick: () => closeSearch() }));
      return input;
    }
    if (S.mode) {
      const m = MODES[S.mode];
      top.replaceChildren(
        h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Deshacer", icon: "undo", onclick: () => runCommand("edit.undo") }),
        h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Rehacer", icon: "redo", onclick: () => runCommand("edit.redo") }),
        h("div", { class: "pc-title" }, h("b", { text: m.titulo }), m.ayuda ? h("small", { text: m.ayuda }) : null),
        h("button", { class: "pc-text-btn", type: "button", text: "Listo", onclick: () => exitMode() }));
      return null;
    }
    const title = S.doc ? S.doc.meta.nombre : name || "";
    const info = S.doc ? S.doc.pages + (S.doc.pages === 1 ? " página" : " páginas") + (S.doc.dirty ? " · editado" : "") : "";
    top.replaceChildren(
      h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Volver a Inicio", icon: "back", onclick: goHome }),
      h("div", { class: "pc-title" }, h("b", { text: title }), h("small", { text: info })),
      h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Buscar", icon: "search", disabled: !S.doc, onclick: openSearch }),
      h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Compartir", icon: "share", disabled: !S.doc, onclick: shareCurrent }),
      h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Más opciones", icon: "more", disabled: !S.doc, onclick: moreMenu }));
    return null;
  }

  async function shareCurrent() {
    try {
      busy(true, "Preparando…");
      const file = await currentFile();
      busy(false);
      if (file) share(file);
    } catch (e) {
      busy(false);
      toast("No se pudo preparar el archivo: " + e.message, 5000);
    }
  }

  // Se llama desde un toque: el campo toma el foco ahí mismo para que iOS muestre el teclado.
  function openSearch() {
    if (!S.doc) return;
    if (S.mode) exitMode();
    hideSelectionBar();
    S.searching = true;
    S.searchOpenedAt = Date.now();
    body.classList.add("pc-searching");
    const input = renderTop();
    renderToolbar();
    if (input) input.focus();
  }
  function closeSearch(sendEscape) {
    S.searching = false;
    S.findBottom = 0;
    S.findLabel = "";
    body.classList.remove("pc-searching");
    if (sendEscape !== false && S.last && S.last.active && S.last.active.find_open) pc.key("Escape").catch(() => {});
    renderTop();
    renderToolbar();
  }

  // Lee de la barra de búsqueda de PdfCraft (árbol de accesibilidad) el contador ("3 de 22") y dónde
  // termina, para taparla y mostrar el contador en la barra de abajo.
  async function readFind() {
    const found = await window.pdfcraft.uiInspect({});
    const ws = found.widgets || [];
    const input = ws.find((w) => w.role === "TextInput" && w.rect && w.rect[1] > 30 && w.rect[1] < 220);
    if (!input) return;
    const cy = (input.rect[1] + input.rect[3]) / 2;
    const row = ws.filter((w) => w.rect && w.rect.length === 4 && Math.abs((w.rect[1] + w.rect[3]) / 2 - cy) < 22);
    S.findBottom = Math.max(...row.map((w) => w.rect[3]));
    // Sus botones, de izquierda a derecha: anterior, siguiente, opciones, cerrar.
    S.findButtons = row.filter((w) => w.role === "Button").sort((a, b) => a.rect[0] - b.rect[0]);
    const label = row.find((w) => w.role === "Label");
    const text = label ? String(label.label || label.value || "") : "";
    if (text !== S.findLabel) { S.findLabel = text; renderToolbar(); }
  }
  // Siguiente / anterior: un clic en esos botones de PdfCraft (quedan tapados por la barra de la app).
  async function findStep(forward) {
    const b = (S.findButtons || [])[forward ? 1 : 0];
    if (!b) return;
    try {
      await window.pdfcraft.request("ui.click", { x: (b.rect[0] + b.rect[2]) / 2, y: (b.rect[1] + b.rect[3]) / 2 });
      await sleep(150);
      await readFind();
    } catch (e) { /* PdfCraft ocupado */ }
  }

  // ---------- Modos de herramientas ----------
  const MODES = {
    comentar: {
      titulo: "Comentar",
      herramientas: [
        { q: "highlight", t: "Resaltar", i: "highlight" },
        { q: "underline", t: "Subrayar", i: "underline" },
        { q: "strikeout", t: "Tachar", i: "strike" },
        { q: "note", t: "Nota", i: "note" },
        { q: "ink", t: "Dibujar", i: "draw" },
        { q: "freetext", t: "Texto", i: "text" },
        { q: "eraser", t: "Borrador", i: "eraser" },
      ],
    },
    firmar: {
      titulo: "Rellenar y firmar",
      ayuda: "Toca un campo para rellenarlo",
      herramientas: [
        { q: "fill-signature", t: "Firma", i: "sign" },
        { q: "fill-initials", t: "Iniciales", i: "initials" },
        { q: "fill-text", t: "Texto", i: "text" },
        { q: "fill-date", t: "Fecha", i: "date" },
        { q: "fill-check", t: "Marca", i: "check" },
        { q: "fill-cross", t: "Cruz", i: "cross" },
        { q: "fill-dot", t: "Punto", i: "dot" },
      ],
    },
    editar: {
      titulo: "Editar PDF",
      herramientas: [
        { q: "edit-text", t: "Editar texto", i: "editText" },
        { q: "add-text", t: "Añadir texto", i: "addText" },
        { q: "link", t: "Enlace", i: "link" },
      ],
    },
    organizar: {
      titulo: "Organizar páginas",
      ayuda: "Mantén y arrastra para mover",
      entrar: () => pc.set("organize", "on"),
      salir: () => pc.set("organize", "off"),
      herramientas: [
        { c: "page.rotate", t: "Girar", i: "rotate" },
        { c: "page.delete", t: "Eliminar", i: "trash" },
        { c: "page.duplicate", t: "Duplicar", i: "copy" },
        { c: "page.insert_blank", t: "En blanco", i: "plus" },
        { c: "page.extract", t: "Extraer", i: "extract" },
      ],
    },
  };

  async function enterMode(name) {
    const m = MODES[name];
    if (!m || !S.doc) return;
    if (S.mode) await exitMode();
    if (S.searching) closeSearch();
    hideSelectionBar();
    S.mode = name;
    S.tool = null;
    body.classList.add("pc-mode");
    renderTop();
    renderToolbar();
    try {
      await applyScale();
      if (m.entrar) await m.entrar();
    } catch (e) { toast(e.message); }
  }

  async function exitMode() {
    const m = MODES[S.mode];
    S.mode = null;
    S.tool = null;
    body.classList.remove("pc-mode");
    renderTop();
    renderToolbar();
    try {
      if (m && m.salir) await m.salir();
      await pc.set("quick", BASE_TOOL);
      await applyScale();
    } catch (e) { /* PdfCraft ocupado */ }
  }

  function renderToolbar() {
    const bar = $("pc-toolbar");
    if (S.searching) {
      bar.hidden = false;
      bar.replaceChildren(h("div", { class: "pc-find-row", role: "toolbar", "aria-label": "Resultados de la búsqueda" },
        h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Resultado anterior", icon: "up", onclick: () => findStep(false) }),
        h("span", { class: "pc-find-count", role: "status", "aria-live": "polite", text: S.findLabel || "Escribe para buscar" }),
        h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Resultado siguiente", icon: "down", onclick: () => findStep(true) })));
      return;
    }
    const m = S.mode && MODES[S.mode];
    bar.hidden = !m;
    if (!m) { bar.replaceChildren(); return; }
    bar.replaceChildren(h("div", { class: "pc-tools-row", role: "toolbar", "aria-label": m.titulo },
      m.herramientas.map((tool) => h("button", {
        class: "pc-tb", type: "button", icon: tool.i,
        "aria-pressed": tool.q ? String(S.tool === tool.q) : null,
        onclick: () => useTool(tool),
      }, h("span", { text: tool.t })))));
  }

  async function useTool(tool) {
    if (tool.c) { runCommand(tool.c, tool.t); return; }
    const next = S.tool === tool.q ? null : tool.q;
    S.tool = next;
    S.toolSetAt = Date.now();
    renderToolbar();
    try {
      await pc.set("quick", next || BASE_TOOL);
    } catch (e) {
      toast("No se pudo usar " + tool.t + ": " + e.message, 4000);
      S.tool = null;
      renderToolbar();
    }
  }

  async function runCommand(id, label) {
    try {
      await pc.run(id);
    } catch (e) {
      const msg = String(e.message || e);
      if (/disabled|not enabled|no selection|unavailable/i.test(msg)) toast(S.mode === "organizar" ? "Primero toca una página para elegirla." : (label || "Esa acción") + " no está disponible ahora.");
      else toast("No se pudo: " + msg, 4000);
    }
  }

  // ---------- Texto seleccionado (pulsación larga y arrastre) ----------
  // PdfCraft ya muestra junto a la selección su barra (Añadir comentario, Resaltar, Subrayado,
  // Tachado); aquí se agrega lo que le falta: Copiar.
  let selBar = null;
  function hideSelectionBar() {
    if (selBar) { selBar.remove(); selBar = null; }
  }
  function showSelectionBar() {
    hideSelectionBar();
    selBar = h("div", { class: "pc-selbar", role: "toolbar", "aria-label": "Texto seleccionado" },
      h("button", { type: "button", icon: "copy", "aria-label": "Copiar el texto seleccionado", onclick: copySelection }, h("span", { text: "Copiar" })));
    $("pc-doc").append(selBar);
  }

  // Copiar: el evento "copy" hace que eframe copie dentro del toque (Safari solo deja escribir en
  // el portapapeles ahí). Si iOS no lo dispara, PdfCraft copia por su cuenta y, si iOS lo rechaza
  // por llegar tarde, se ofrece un botón para copiar.
  let copyWanted = false;
  const clip = navigator.clipboard;
  const writeText = clip && clip.writeText ? clip.writeText.bind(clip) : null;
  if (writeText) {
    clip.writeText = (text) => writeText(text).then(
      () => { if (copyWanted) { copyWanted = false; toast("Copiado"); } },
      (err) => {
        if (copyWanted) {
          copyWanted = false;
          sheet({
            title: "Copiar texto",
            text: text.length > 160 ? text.slice(0, 160) + "…" : text,
            build: (close) => [h("button", { class: "pc-primary", type: "button", text: "Copiar", onclick: () => { close(); writeText(text).then(() => toast("Copiado"), () => toast("iOS no permitió copiar")); } })],
          });
        }
        throw err;
      });
  }
  function copySelection() {
    hideSelectionBar();
    copyWanted = true;
    let fired = false;
    const seen = () => { fired = true; };
    document.addEventListener("copy", seen, true);
    try {
      canvas.focus({ preventScroll: true });
      document.execCommand("copy");
    } catch (e) { /* sin execCommand */ }
    document.removeEventListener("copy", seen, true);
    if (!fired) pc.run("edit.copy").catch(() => { copyWanted = false; });
    setTimeout(() => { copyWanted = false; }, 4000);
  }

  // ---------- Botón flotante y menús ----------
  $("pc-fab").insertAdjacentHTML("afterbegin", icon("pencil"));
  $("pc-fab").addEventListener("click", () => {
    if (!S.doc) return;
    hideSelectionBar();
    sheet({
      title: "Herramientas",
      build: (close) => [
        h("div", { class: "pc-mode-grid" }, HOME_TOOLS.map((tool) => toolTile(tool, () => {
          close();
          if (tool.mode) enterMode(tool.mode);
          else if (tool.cmd) runCommand(tool.cmd, tool.t);
          else setDesktop(true);
        }))),
      ],
    });
  });

  $("pc-pill").addEventListener("click", () => goToPageSheet());
  $("pc-open").addEventListener("click", () => pickFile(null));
  $("pc-settings").addEventListener("click", () => settingsSheet());

  function goToPageSheet() {
    if (!S.doc) return;
    const input = h("input", { class: "pc-field", type: "number", inputmode: "numeric", min: "1", max: String(S.doc.pages), placeholder: "1 – " + S.doc.pages, "aria-label": "Número de página" });
    sheet({
      title: "Ir a la página",
      build: (close) => {
        const go = () => {
          const n = Math.max(1, Math.min(S.doc.pages, parseInt(input.value, 10) || 0));
          if (n) pc.set("page", String(n)).catch(() => {});
          close();
        };
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
        return [input, h("button", { class: "pc-primary", type: "button", text: "Ir", onclick: go })];
      },
    });
    input.focus(); // dentro del toque: iOS muestra el teclado numérico
  }

  function moreMenu() {
    if (!S.doc) return;
    hideSelectionBar();
    const a = S.last && S.last.active;
    const continuous = !a || a.continuous !== false;
    sheet({
      title: S.doc.meta.nombre,
      build: (close) => [
        list([
          { i: "page", t: "Ir a la página…", run: () => { close(); goToPageSheet(); } },
          { i: "fit", t: "Ajustar al ancho", run: () => { close(); fitWidth().catch(() => {}); } },
          { i: continuous ? "single" : "layout", t: continuous ? "Página por página" : "Desplazamiento continuo",
            run: () => { close(); pc.set("continuous", continuous ? "off" : "on").then(() => sleep(150)).then(fitWidth).catch(() => {}); } },
          { i: "search", t: "Buscar", run: () => { close(); openSearch(); } },
        ]),
        list([
          { i: "share", t: "Compartir o guardar en Archivos", run: () => { close(); shareCurrent(); } },
          { i: "info", t: "Propiedades del documento", run: () => { close(); runCommand("file.properties"); } },
          { i: "desktop", t: "Todas las herramientas", small: "Interfaz completa", run: () => { close(); setDesktop(true); } },
        ]),
      ],
    });
  }

  function settingsSheet() {
    const nameInput = h("input", { class: "pc-field", type: "text", value: prefs.nombre, placeholder: "Tu nombre", autocomplete: "name", "aria-label": "Tu nombre para comentarios y firmas" });
    nameInput.addEventListener("change", () => {
      prefs.nombre = nameInput.value.trim().slice(0, 200);
      savePrefs();
      if (prefs.nombre && S.ready) pc.set("author", prefs.nombre).catch(() => {});
    });
    const seg = (key, options, onChange) => {
      const wrap = h("div", { class: "pc-seg", role: "group" });
      const draw = () => wrap.replaceChildren(...options.map(([value, label]) => h("button", {
        type: "button", "aria-pressed": String(prefs[key] === value), text: label,
        onclick: () => { prefs[key] = value; savePrefs(); draw(); onChange(value); },
      })));
      draw();
      return wrap;
    };
    sheet({
      title: "Ajustes",
      build: (close) => [
        h("div", { class: "pc-label", text: "Tamaño de los textos de PdfCraft" }),
        seg("tamano", [["pequeno", "Pequeño"], ["mediano", "Mediano"], ["grande", "Grande"]], () => applyScale().catch(() => {})),
        h("div", { class: "pc-label", text: "Tema" }),
        seg("tema", [["auto", "Automático"], ["claro", "Claro"], ["oscuro", "Oscuro"]], (v) => {
          applyThemeAttr();
          if (S.ready) pc.run(v === "auto" ? "view.theme.system" : v === "oscuro" ? "view.theme.dark" : "view.theme.light").catch(() => {});
        }),
        h("div", { class: "pc-label", text: "Tu nombre (comentarios y firmas)" }),
        nameInput,
        list([{ i: "desktop", t: "Todas las herramientas", small: "Interfaz completa", run: () => { close(); setDesktop(true); } }]),
        h("p", { text: "PdfCraft es de código abierto (github.com/storytold/pdfcraft). Tus PDF se quedan en este iPhone." + (S.appVersion ? " Versión " + S.appVersion + "." : "") }),
      ],
    });
  }

  // Interfaz completa de PdfCraft, para lo que la de celular no tiene.
  let backButton = null;
  async function setDesktop(on) {
    if (!S.ready) return;
    if (on && S.mode) await exitMode();
    if (on && S.searching) closeSearch();
    hideSelectionBar();
    S.desktop = on;
    body.classList.toggle("pc-desktop", on);
    if (on) {
      showViewer();
      backButton = backButton || h("button", { class: "pc-back-mobile", type: "button", text: "Volver a la vista de celular", onclick: () => setDesktop(false) });
      body.append(backButton);
    } else if (backButton) {
      backButton.remove();
    }
    try {
      const s = await pc.state();
      if (s.active && allHidden(s.hidden_interface) === on) await pc.run("view.toggle_interface");
      await applyScale();
      layoutCanvas(await pc.state());
      if (!on) {
        const active = (s.documents || []).find((d) => d.active);
        if (!active) { S.doc = null; showHome(); return; }
        if (S.doc && active.doc === S.doc.id) {
          await prepareDocument();
          renderTop();
        } // si es otro documento, tick() lo adopta
      }
    } catch (e) { /* PdfCraft ocupado */ }
  }

  // ---------- Hojas ----------
  function sheet({ title, text, build }) {
    const wrap = h("div", { class: "pc-sheet-wrap", role: "dialog", "aria-modal": "true", "aria-label": title });
    const close = () => { wrap.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    const panel = h("div", { class: "pc-sheet" },
      h("div", { class: "pc-grabber" }),
      h("h3", {}, h("span", { text: title }), h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Cerrar", icon: "close", onclick: () => close() })),
      text ? h("p", { text }) : null,
      build(close));
    wrap.append(h("div", { class: "pc-scrim", onclick: close }), panel);
    document.addEventListener("keydown", onKey);
    body.append(wrap);
    return close;
  }
  function list(items) {
    return h("div", { class: "pc-list" }, items.map((it) => h("button", {
      class: "pc-item" + (it.danger ? " pc-danger" : ""), type: "button", icon: it.i, onclick: it.run,
    }, h("span", { text: it.t }), it.small ? h("small", { text: it.small }) : null)));
  }
})();
