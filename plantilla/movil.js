// PdfCraft para iPhone: interfaz completa al estilo de Adobe Acrobat móvil sobre el motor de
// PdfCraft (modo anfitrión data-host="page" + API de página ?control).
(function () {
  "use strict";

  // ---------- Utilidades ----------
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const toast = (text, ms) => (window.pdfcraftToast ? window.pdfcraftToast(text, ms) : console.log(text));
  const canvas = $("pdfcraft");
  const body = document.body;

  const ICONS = {
    home: "M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6.5h-5V21H4a1 1 0 0 1-1-1z",
    folder: "M3 6a2 2 0 0 1 2-2h4.2l2 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    folderPlus: "M3 6a2 2 0 0 1 2-2h4.2l2 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M12 10.5v5 M9.5 13h5",
    tools: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
    open: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M12 11v7 M8.5 14.5h7",
    file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M8.5 13h7 M8.5 16.5h5",
    blank: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5",
    settings: "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M12 2.8v2.6 M12 18.6v2.6 M4 7.4l2.3 1.3 M17.7 15.3l2.3 1.3 M4 16.6l2.3-1.3 M17.7 8.7L20 7.4",
    back: "M15 5l-7 7 7 7",
    chevRight: "M9 6l6 6-6 6",
    search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M20 20l-4.8-4.8",
    share: "M12 3v12 M8 7l4-4 4 4 M7 10H5.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H17",
    more: "M5.5 12h.01 M12 12h.01 M18.5 12h.01",
    star: "M12 3.2l2.6 5.3 5.9.8-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z",
    viewOpts: "M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    bookmark: "M6 4h12v17l-6-4-6 4z",
    bookmarkPlus: "M6 4h12v17l-6-4-6 4z M12 8v5 M9.5 10.5h5",
    listView: "M4 6h16 M4 12h16 M4 18h16",
    gridView: "M4 4h6.5v6.5H4z M13.5 4H20v6.5h-6.5z M4 13.5h6.5V20H4z M13.5 13.5H20V20h-6.5z",
    sort: "M4 7h11 M4 12h8 M4 17h5 M17 7v11 M14 15l3 3 3-3",
    pencil: "M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z M13.5 6.5l4 4",
    comment: "M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4z M8 9h8 M8 12h5",
    sign: "M3 17c3-1 4-9 6-9s-1 9 1 9 3-4 4-4 1 3 3 3 M3 21h18",
    organize: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
    combine: "M8 6h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z M4 15V4a1 1 0 0 1 1-1h10",
    camera: "M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
    compress: "M4 14h6v6 M20 10h-6V4 M10 14l-6 6 M14 10l6-6",
    split: "M12 4v16 M4 9l4 3-4 3 M20 9l-4 3 4 3",
    crop: "M6 2v14a2 2 0 0 0 2 2h14 M18 22V8a2 2 0 0 0-2-2H2",
    ocr: "M4 7V5a1 1 0 0 1 1-1h2 M17 4h2a1 1 0 0 1 1 1v2 M20 17v2a1 1 0 0 1-1 1h-2 M7 20H5a1 1 0 0 1-1-1v-2 M8 9h8 M8 12.5h8 M8 16h5",
    redact: "M4 6h16v12H4z M4 10h16 M8 6v12 M16 6v12",
    watermark: "M12 3l8 9-8 9-8-9z M9 12h6",
    print: "M6 9V4h12v5 M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2 M6 14h12v7H6z",
    lock: "M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3 M12 15v2",
    word: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M8 12l1.6 6 2.4-4.5 2.4 4.5L16 12",
    pptx: "M4 5h16v11H4z M12 16v5 M8 21h8 M9 9h4a2 2 0 0 1 0 4H9z",
    image: "M4 5h16v14H4z M4 16l5-5 4 4 2-2 5 5 M15.5 9.5h.01",
    desktop: "M3 5h18v12H3z M8 21h8 M12 17v4",
    highlight: "M9 15l-2 5h5l1-2 M14 4l6 6-7 7-6-6z",
    underline: "M7 4v6a5 5 0 0 0 10 0V4 M5 20h14",
    strike: "M5 12h14 M16 7.5A4 3 0 0 0 12 5c-2.5 0-4 1.2-4 2.8 0 1.4 1.2 2.2 3 2.8 M8 16.5c.6 1.6 2.1 2.5 4 2.5 2.5 0 4.2-1.3 4.2-3.1",
    squiggly: "M4 17c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 2.5 1 2.5 0 M7 5v5a5 5 0 0 0 10 0V5",
    note: "M5 4h14v10l-6 6H5z M13 20v-6h6",
    draw: "M3 18c3 0 4-3 6-6s4-6 6-6 3 2 2 4-5 5-3 8 5 1 7-1",
    line: "M5 19L19 5",
    arrow: "M5 19L19 5 M11 5h8v8",
    square: "M5 5h14v14H5z",
    circle: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
    text: "M5 7V5h14v2 M12 5v14 M9 19h6",
    eraser: "M8 20h12 M5 15l9-9 5 5-9 9H9z",
    undo: "M9 14L4 9l5-5 M4 9h11a5 5 0 0 1 0 10h-3",
    redo: "M15 14l5-5-5-5 M20 9H9a5 5 0 0 0 0 10h3",
    check: "M5 12l5 5 9-10",
    cross: "M6 6l12 12 M18 6L6 18",
    dot: "M12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z",
    minus: "M5 12h14",
    date: "M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5",
    initials: "M6 18V6h4.5a3 3 0 0 1 0 6H6 M6 12h5.5a3 3 0 0 1 0 6H6 M15 18l2.5-7 2.5 7",
    editText: "M4 7V5h11v2 M9.5 5v14 M7 19h5 M18 9v10 M16 9h4 M16 19h4",
    addText: "M4 6V4h12v2 M10 4v16 M7 20h6 M18 14v6 M15 17h6",
    link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
    rotate: "M20 11a8 8 0 1 0-2.3 5.7 M20 4v7h-7",
    rotateCcw: "M4 11a8 8 0 1 1 2.3 5.7 M4 4v7h7",
    reverse: "M7 4v16 M4 17l3 3 3-3 M17 20V4 M14 7l3-3 3 3",
    trash: "M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3",
    plus: "M12 5v14 M5 12h14",
    copy: "M8 8h12v12H8z M16 8V4H4v12h4",
    extract: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M12 18v-7 M9 14l3-3 3 3",
    page: "M6 3h9l4 4v14H6z M9 12h6 M9 16h4",
    fit: "M3 12h18 M7 8l-4 4 4 4 M17 8l4 4-4 4",
    layout: "M7 3h10v8H7z M7 13h10v8H7z",
    single: "M7 4h10v16H7z",
    twoPage: "M3 5h8v14H3z M13 5h8v14h-8z",
    layers: "M12 3l9 4.5-9 4.5-9-4.5z M3 12l9 4.5 9-4.5 M3 16.5l9 4.5 9-4.5",
    clip: "M21 11.5l-8.5 8.5a5 5 0 0 1-7-7L14 4.5a3.3 3.3 0 0 1 4.7 4.7L10 17.8a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8",
    info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5 M12 8h.01",
    close: "M6 6l12 12 M18 6L6 18",
    up: "M6 15l6-6 6 6",
    down: "M6 9l6 6 6-6",
    sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4",
    eyeOff: "M3 3l18 18 M10.6 10.6a2 2 0 0 0 2.8 2.8 M9.9 5.1A10 10 0 0 1 12 5c5.5 0 9.5 7 9.5 7a16 16 0 0 1-3.1 4 M6.5 6.6A15 15 0 0 0 2.5 12s4 7 9.5 7a9.7 9.7 0 0 0 4.3-1",
    sliders: "M4 6h16 M4 12h16 M4 18h16 M9 4v4 M15 10v4 M8 16v4",
    compare: "M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4 M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4 M12 2v20",
    refresh: "M20 11a8 8 0 1 0-2.3 5.7 M20 4v7h-7",
    arrowLeft: "M19 12H5 M11 6l-6 6 6 6",
    arrowRight: "M5 12h14 M13 6l6 6-6 6",
    iphone: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M11 18.5h2",
    rename: "M4 17l4 0 11-11-4-4-11 11z M13.5 5.5l4 4 M3 21h18",
  };
  const BOLD_ICONS = { more: 3.2, dot: 3 };
  function icon(name, filled) {
    const w = BOLD_ICONS[name] ? ` style="stroke-width:${BOLD_ICONS[name]}"` : "";
    const cls = filled ? "ic ic-fill" : "ic";
    return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"${w}><path d="${ICONS[name] || ""}"/></svg>`;
  }
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "icon") el.insertAdjacentHTML("beforeend", icon(v));
      else if (k === "iconFilled") el.insertAdjacentHTML("beforeend", icon(v, true));
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  // ---------- Preferencias ----------
  const PREFS_KEY = "pdfcraft-movil";
  const SIZES = { pequeno: 0.85, mediano: 0.92, grande: 1.0 };
  const COMPACT_SIZE = 0.75;
  const DESKTOP_SIZE = 0.78;
  const MIN_DIALOG_SIZE = 0.58;
  const prefs = Object.assign({
    tamano: "grande",
    nombre: "",
    tema: "auto",
    lectura: "normal",   // "normal" | "noche" | "sepia"
    brillo: 100,         // 45..100
    pantallaActiva: false,
    vistaArchivos: "lista", // "lista" | "cuadricula"
    orden: "reciente",      // "reciente" | "nombre" | "tamano"
  }, readPrefs());
  if (!SIZES[prefs.tamano]) prefs.tamano = "grande";
  function readPrefs() { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); } catch (e) { return {}; } }
  function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {} }
  function applyThemeAttr() {
    if (prefs.tema === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", prefs.tema === "oscuro" ? "dark" : "light");
  }
  function applyReadingVisuals() {
    body.classList.toggle("pc-read-noche", prefs.lectura === "noche");
    body.classList.toggle("pc-read-sepia", prefs.lectura === "sepia");
    const dim = $("pc-dimmer");
    if (dim) {
      const pct = Math.max(45, Math.min(100, Number(prefs.brillo) || 100));
      dim.style.opacity = ((100 - pct) / 100).toFixed(2);
    }
  }
  applyThemeAttr();
  applyReadingVisuals();

  // Wake Lock ("Mantener pantalla encendida", igual que Acrobat iOS)
  let wakeLock = null;
  async function syncWakeLock() {
    const want = !!(prefs.pantallaActiva && body.classList.contains("pc-in-viewer") && document.visibilityState === "visible");
    if (!want) {
      if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
      return;
    }
    if (!wakeLock && navigator.wakeLock && navigator.wakeLock.request) {
      try { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => { wakeLock = null; }); }
      catch (e) {}
    }
  }

  // ---------- Almacenamiento local (IndexedDB v2) ----------
  const MAX_RECIENTES = 100;
  let dbPromise = null;
  function db() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const r = indexedDB.open("pdfcraft-movil", 2);
        r.onupgradeneeded = () => {
          const d = r.result;
          if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta", { keyPath: "id" });
          if (!d.objectStoreNames.contains("datos")) d.createObjectStore("datos");
          if (!d.objectStoreNames.contains("carpetas")) d.createObjectStore("carpetas", { keyPath: "id" });
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
    async list() { return (await done((await storeOf("meta", "readonly")).getAll())).sort((a, b) => (b.abierto || 0) - (a.abierto || 0)); },
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
      if (all.length <= MAX_RECIENTES) return;
      const nonStarred = all.filter((m) => !m.destacado);
      const excess = all.length - MAX_RECIENTES;
      for (const old of nonStarred.slice(-excess)) await files.remove(old.id);
    },
    async listFolders() {
      try {
        return (await done((await storeOf("carpetas", "readonly")).getAll())).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      } catch (e) { return []; }
    },
    async saveFolder(folder) { return done((await storeOf("carpetas", "readwrite")).put(folder)); },
    async removeFolder(id) {
      const list = await files.list();
      for (const m of list) {
        if (m.carpeta === id) { delete m.carpeta; await files.putMeta(m); }
      }
      return done((await storeOf("carpetas", "readwrite")).delete(id));
    },
  };
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ---------- PdfCraft API ----------
  const pc = {
    ok: () => !!(window.pdfcraft && typeof window.pdfcraft.request === "function"),
    state: () => window.pdfcraft.docInspect(),
    run: (id) => window.pdfcraft.execute(id),
    set: (key, value) => window.pdfcraft.request("ui.set", { key, value: String(value) }),
    key: (key, modifiers) => window.pdfcraft.request("ui.key", modifiers ? { key, modifiers } : { key }),
    click: (params) => window.pdfcraft.request("ui.click", params),
    inspect: (params) => window.pdfcraft.uiInspect(params || {}),
  };
  const allHidden = (hi) => !!(hi && hi.toolbar && hi.menubar && hi.window_ui);
  const BASE_TOOL = "select";

  const S = {
    ready: false,
    tab: "inicio",          // "inicio" | "archivos" | "herramientas"
    homeFilter: "recientes",// "recientes" | "destacados"
    homeSearchOpen: false,
    homeQuery: "",
    filesQuery: "",
    filesFolder: null,      // null | "destacados" | folderId
    toolsQuery: "",
    cachedList: [],
    cachedFolders: [],
    doc: null,              // { id, meta, name, pages, page, dirty, dirtySince, edited }
    docs: new Map(),        // pdfcraft docId -> { meta, name }
    opening: false,
    preparing: false,
    mode: null,             // "comentar" | "firmar" | "editar" | "organizar" | "censurar"
    panel: null,            // null | "bookmarks" | "comments" | "layers" | "attachments" | "signatures" | "fields"
    tool: null,
    toolSetAt: 0,
    immersive: false,
    modal: false,
    desktop: false,
    searching: false,
    searchQuery: "",
    last: null,
    ratio: 1,
    r100: 0,
    scalePct: 0,
    chrome: 0,
    fitZoom: 0,
    polling: false,
    saveWaiters: [],
    appVersion: "",
    selectedAnnot: null,
    navHistoryUsed: false,
    scrubbing: false,
    orgSelCount: 0,
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
    if (dirty) S.doc.edited = true;
    S.doc.dirtySince = dirty ? Date.now() : 0;
    renderTop();
  }

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
        title: "PDF listo",
        text: name + " se guardó también en tus archivos.",
        build: (close) => [h("button", { class: "pc-primary", type: "button", text: "Compartir o guardar en Archivos", onclick: () => { close(); share(file); } })],
      });
      return;
    }
    if (!waiters.length) await share(file);
  }

  // Guarda el documento activo manejando diálogos de PdfCraft (p. ej. "Bloquear firma") sin colgarse.
  function saveActive(name) {
    return new Promise((resolve, reject) => {
      let sawModal = false;
      let idleMs = 0;
      const w = { name, resolve: (f) => { clearInterval(watch); resolve(f); }, reject: (e) => { clearInterval(watch); reject(e); } };
      const watch = setInterval(() => {
        if (S.modal) {
          sawModal = true;
          idleMs = 0;
          return;
        }
        idleMs += 250;
        if (sawModal && idleMs > 1800) {
          // El usuario cerró o canceló el diálogo de bloqueo sin guardar.
          S.saveWaiters = S.saveWaiters.filter((x) => x !== w);
          clearInterval(watch);
          reject(new Error("Guardado cancelado"));
          return;
        }
        if (idleMs > 30000) {
          S.saveWaiters = S.saveWaiters.filter((x) => x !== w);
          clearInterval(watch);
          reject(new Error("PdfCraft no respondió"));
        }
      }, 250);
      S.saveWaiters.push(w);
      pc.run("file.save").catch((e) => {
        clearInterval(watch);
        S.saveWaiters = S.saveWaiters.filter((x) => x !== w);
        reject(e);
      });
    });
  }

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
      mode: () => (S.desktop ? "raton-zoom" : (S.modal || S.panel) ? "raton" : S.tool ? "herramienta" : "ver"),
      ratio: () => S.ratio,
      singlePage: () => {
        const a = S.last && S.last.active;
        if (!a || a.continuous !== false || a.organize || !a.pages_on_screen || !a.pages_on_screen.length) return false;
        const vw = a.viewport[2] - a.viewport[0];
        const p = a.pages_on_screen[0].rect;
        return (p[2] - p[0]) <= vw + 6;
      },
      onSwipePage: (dir) => stepPage(dir),
      onDoubleTap: (x, y) => toggleDoubleTapZoom(x, y),
      onTap: () => { hideSelectionBar(); },
      onSingleTap: () => {
        if (!S.doc || S.mode || S.searching || S.modal || S.desktop || S.panel) return;
        const a = S.last && S.last.active;
        if (a && (a.selected_comment || a.comment_composer_open)) return;
        setImmersive(!S.immersive);
      },
      onLongPress: (x, y) => {
        hideSelectionBar();
        showPressRing(x, y);
        if (navigator.vibrate) try { navigator.vibrate(14); } catch (e) {}
      },
      onSelectEnd: (x, y, moved) => { if (moved && !S.mode && !S.modal && !S.desktop && !S.panel) showSelectionBar(); },
    });

    initStaticChrome();
    await reloadLibrary();
    renderShell();
    if (window.pdfcraftHideSplash) window.pdfcraftHideSplash();
    setInterval(tick, 300);
    document.addEventListener("visibilitychange", () => {
      syncWakeLock();
      if (document.visibilityState === "hidden" && S.doc) {
        saveLastPage();
        if (S.doc.dirty && !S.modal) saveActive(S.doc.name).catch(() => {});
      }
    });
  }

  function showPressRing(clientX, clientY) {
    const ring = $("pc-press-ring");
    const docEl = $("pc-doc");
    if (!ring || !docEl) return;
    const r = docEl.getBoundingClientRect();
    ring.style.left = (clientX - r.left) + "px";
    ring.style.top = (clientY - r.top) + "px";
    ring.hidden = false;
    ring.style.animation = "none";
    void ring.offsetWidth;
    ring.style.animation = "";
    clearTimeout(showPressRing.t);
    showPressRing.t = setTimeout(() => { ring.hidden = true; }, 430);
  }

  function setImmersive(on) {
    if (S.immersive === on) return;
    S.immersive = on;
    body.classList.toggle("pc-immersive", on);
  }

  async function toggleDoubleTapZoom(x, y) {
    if (!S.doc || S.mode === "organizar" || S.modal || S.desktop) return;
    const s = await pc.state().catch(() => null);
    const a = s && s.active;
    if (!a) return;
    const base = S.fitZoom || 100;
    if (a.zoom_percent > base * 1.25) {
      await fitWidth();
    } else if (gestures && gestures.zoomBy) {
      gestures.zoomBy(2.0, x, y);
    } else {
      await pc.set("zoom", String(Math.round(base * 2)));
    }
  }

  async function stepPage(dir) {
    if (!S.doc) return;
    const next = Math.max(1, Math.min(S.doc.pages, (S.doc.page || 1) + dir));
    if (next === S.doc.page) return;
    await pc.set("page", String(next)).catch(() => {});
    S.doc.page = next;
    updateScrubber(next, S.doc.pages);
    saveLastPage();
  }

  // ---------- Calibración y escala ----------
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
    if (S.panel) return Math.min(base, 0.9);
    if (S.mode === "organizar") return Math.min(base, COMPACT_SIZE);
    return base;
  }

  async function fitDialog(s) {
    if (!s.window || !s.window.width) return;
    const W = s.window.width, H = s.window.height;
    const found = await pc.inspect({});
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const w of found.widgets || []) {
      const r = w.rect;
      if (!r || r.length !== 4 || r[3] <= 40) continue;
      if (r[3] - r[1] > H * 0.95 || r[2] - r[0] > W * 1.2) continue;
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
    if (grew && S.doc && !S.modal && !S.desktop && !S.panel && S.mode !== "organizar") {
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
      const combineOpen = !!(s.combine && s.combine.showing);
      const modal = !!(s.dialog || s.password_prompt || s.close_prompt || s.palette_open || (combineOpen && !S.combiningAuto));
      if (modal !== S.modal) {
        S.modal = modal;
        S.dialogFit = 0;
        body.classList.toggle("pc-modal", modal);
        if (modal) { busy(false); hideSelectionBar(); hideAnnotBar(); setImmersive(false); }
        await applyScale();
      } else if (modal && !combineOpen) {
        await fitDialog(s);
      }
      if (!body.classList.contains("pc-in-viewer")) return;
      layoutCanvas(s);
      if (S.opening || S.preparing || S.combiningAuto) return;
      const docs = s.documents || [];
      const active = docs.find((d) => d.active);
      if (!active) {
        if (!docs.length && !combineOpen && S.doc && !S.modal && !S.desktop) { S.doc = null; showHome(); }
        return;
      }
      if (!S.doc || active.doc !== S.doc.id) {
        if (!S.modal && !S.desktop) await adopt(active);
        return;
      }
      S.doc.pages = active.pages;
      const curPage = s.active ? s.active.page : 1;
      if (curPage !== S.doc.page) {
        S.doc.page = curPage;
        if (!S.scrubbing) updateScrubber(curPage, active.pages);
        if (!S.mode && !S.searching && !S.panel) renderTop();
        saveLastPage();
      } else if (!S.scrubbing) {
        updateScrubber(curPage, active.pages);
      }
      setDirty(!!active.dirty);

      // Si el usuario está en Modo Organizar, reflejar cuántas páginas eligió
      if (S.mode === "organizar" && s.active) {
        const cnt = (s.active.selected_pages || []).length;
        if (cnt !== S.orgSelCount) { S.orgSelCount = cnt; renderTop(); }
        if (!s.active.organize && !S.modal && Date.now() - (S.modeEnteredAt || 0) > 1500) exitMode();
      }

      // Barra contextual para anotación seleccionada
      const selC = s.active && s.active.selected_comment;
      const selKey = selC ? (selC.page + ":" + selC.index) : null;
      if (selKey !== S.selectedAnnot) {
        S.selectedAnnot = selKey;
        if (selKey && !S.modal && !S.desktop && !S.panel && S.mode !== "organizar") showAnnotBar();
        else hideAnnotBar();
      }

      if (!S.desktop && !S.modal && !S.panel) syncTool(s);
      const isTyping = gestures && gestures.typing && gestures.typing();
      const composing = !!(s.active && s.active.comment_composer_open);
      if (!S.desktop && !S.modal && !S.panel && !isTyping && !composing && S.mode !== "organizar" && gestures && !gestures.busy() && Date.now() - (S.recenteredAt || 0) > 1200) {
        S.recenteredAt = Date.now();
        await recenter(s);
      }
      if (S.searching && s.active && !s.active.find_open && Date.now() - S.searchOpenedAt > 1500) closeSearch(false);
      else if (S.searching && s.active && s.active.find_open) await readFind();

      // Guardado automático 30 s tras el último cambio
      if (S.doc.dirty && S.doc.dirtySince && Date.now() - S.doc.dirtySince > 30000 && !S.modal && !S.saveWaiters.length) {
        S.doc.dirtySince = Date.now();
        saveActive(S.doc.name).catch(() => {});
      }
    } catch (e) {
      /* PdfCraft ocupado */
    } finally {
      S.polling = false;
    }
  }

  async function adopt(active) {
    let entry = S.docs.get(active.doc);
    if (!entry) {
      entry = { name: active.name, meta: { id: newId(), nombre: active.name, tamano: 0, abierto: Date.now(), modificado: Date.now(), paginas: active.pages } };
      S.docs.set(active.doc, entry);
    }
    if (S.mode) await exitMode();
    if (S.panel) await closePanel();
    const before = S.doc;
    S.doc = { id: active.doc, meta: entry.meta, name: active.name, pages: active.pages, page: 1, dirty: !!active.dirty, dirtySince: active.dirty ? Date.now() : 0, edited: false };
    renderTop();
    await prepareDocument();
    if (before) toast("Se abrió «" + active.name + "». Quedará guardado en tus archivos.", 5000);
  }

  function layoutCanvas(s) {
    let chrome = 0;
    if (S.desktop || S.modal) {
      chrome = 0;
    } else if (S.panel) {
      // Oculta la barra de título y modos de PdfCraft (arriba de viewport[1]) dejando solo el panel.
      const top = (s.active && s.active.viewport && s.active.viewport[1]) || 86;
      const ratio = (s.window && s.window.width) ? (canvas.clientWidth / s.window.width) : S.ratio;
      chrome = top * ratio;
    } else if (s.active && s.active.organize) {
      chrome = S.chrome;
    } else if (s.active && s.window && s.window.width && allHidden(s.hidden_interface)) {
      const top = S.searching && S.findBottom ? Math.max(s.active.viewport[1], S.findBottom + 4) : s.active.viewport[1];
      chrome = top * (canvas.clientWidth / s.window.width);
    }
    if (Math.abs(chrome - S.chrome) > 0.5) {
      S.chrome = chrome;
      $("pc-doc").style.setProperty("--pc-chrome", chrome.toFixed(1) + "px");
    }
  }

  function updateScrubber(page, pages) {
    const scrub = $("pc-scrubber");
    const pill = $("pc-pill");
    const rangeWrap = $("pc-range-wrap");
    const range = $("pc-range");
    if (!S.doc || S.mode === "organizar" || S.panel || S.modal || S.desktop) {
      scrub.hidden = true;
      return;
    }
    scrub.hidden = false;
    const text = page + " / " + pages;
    if (pill.textContent !== text) pill.textContent = text;
    rangeWrap.hidden = pages <= 1;
    if (pages > 1) {
      range.max = String(pages);
      range.value = String(page);
    }
    const showHist = !!(S.navHistoryUsed && !S.mode && !S.searching);
    $("pc-hist-back").hidden = !showHist;
    $("pc-hist-fwd").hidden = !showHist;
  }

  function saveLastPage() {
    if (!S.doc || !S.doc.meta || !S.doc.page) return;
    if (S.doc.meta.ultimaPagina === S.doc.page) return;
    S.doc.meta.ultimaPagina = S.doc.page;
    files.putMeta(S.doc.meta).catch(() => {});
  }

  function syncTool(s) {
    if (Date.now() - S.toolSetAt < 1500) return;
    const q = s.quick_tool;
    if (S.tool && q !== S.tool) {
      S.tool = q === BASE_TOOL || q === "hand" ? null : q;
      renderBottom();
    }
    if (!S.tool && q !== BASE_TOOL && S.mode !== "organizar") pc.set("quick", BASE_TOOL).catch(() => {});
  }

  // ---------- Catálogo de herramientas (estilo Acrobat iPhone) ----------
  const TOOL_CATEGORIES = [
    {
      titulo: "Anotar y firmar",
      items: [
        { id: "comentar", t: "Comentar", d: "Resaltar, notas y dibujo", i: "comment", c: "#e8590c", mode: "comentar" },
        { id: "firmar", t: "Rellenar y firmar", d: "Firma, texto y marcas", i: "sign", c: "#6741d9", mode: "firmar" },
        { id: "editar", t: "Editar PDF", d: "Texto, imágenes y enlaces", i: "pencil", c: "#d6336c", mode: "editar" },
        { id: "censurar", t: "Censurar", d: "Ocultar datos sensibles", i: "redact", c: "#c92a2a", mode: "censurar" },
      ],
    },
    {
      titulo: "Crear y organizar",
      items: [
        { id: "escanear", t: "Fotos a PDF", d: "Cámara o galería a PDF", i: "camera", c: "#0c8599", action: "scan" },
        { id: "combinar", t: "Combinar PDF", d: "Unir varios archivos", i: "combine", c: "#1971c2", action: "combine" },
        { id: "organizar", t: "Organizar páginas", d: "Mover, girar y extraer", i: "organize", c: "#2b8a3e", mode: "organizar" },
        { id: "dividir", t: "Dividir PDF", d: "Separar en varios PDF", i: "split", c: "#2f9e44", cmd: "page.split" },
        { id: "recortar", t: "Recortar páginas", d: "Ajustar márgenes", i: "crop", c: "#5c940d", cmd: "page.boxes" },
        { id: "blanco", t: "PDF en blanco", d: "Crear documento vacío", i: "blank", c: "#495057", action: "blank" },
      ],
    },
    {
      titulo: "Convertir y exportar",
      items: [
        { id: "word", t: "Exportar a Word", d: "Documento .docx", i: "word", c: "#1864ab", cmd: "export.docx" },
        { id: "pptx", t: "A PowerPoint", d: "Presentación .pptx", i: "pptx", c: "#d9480f", cmd: "export.pptx" },
        { id: "imagen", t: "Exportar imagen", d: "Páginas en PNG / JPEG", i: "image", c: "#099268", cmd: "export.image" },
        { id: "texto", t: "Exportar a texto", d: "Texto plano .txt", i: "text", c: "#495057", cmd: "export.text" },
        { id: "rtf", t: "Exportar a RTF", d: "Texto enriquecido", i: "file", c: "#364fc7", cmd: "export.rtf" },
        { id: "imagenes", t: "Extraer imágenes", d: "Todas las fotos del PDF", i: "extract", c: "#0b7285", cmd: "export.all_images" },
      ],
    },
    {
      titulo: "Optimizar, OCR y proteger",
      items: [
        { id: "comprimir", t: "Comprimir PDF", d: "Reducir tamaño", i: "compress", c: "#2b8a3e", cmd: "optimize.reduce" },
        { id: "proteger", t: "Proteger PDF", d: "Contraseña y permisos", i: "lock", c: "#c92a2a", cmd: "protect.password" },
        { id: "ocr", t: "Reconocer texto", d: "OCR en escaneos", i: "ocr", c: "#5f3dc4", cmd: "ocr.recognize" },
        { id: "mejorar", t: "Mejorar escaneo", d: "Limpiar páginas", i: "sliders", c: "#7048e8", cmd: "ocr.enhance" },
        { id: "marca", t: "Marca de agua", d: "Sello en las páginas", i: "watermark", c: "#1971c2", cmd: "edit.watermark" },
        { id: "encabezado", t: "Encabezado y pie", d: "Títulos y números", i: "page", c: "#1c7ed6", cmd: "edit.header_footer" },
      ],
    },
    {
      titulo: "Más utilidades",
      items: [
        { id: "imprimir", t: "Imprimir", d: "Impresora / AirPrint", i: "print", c: "#343a40", cmd: "print.dialog" },
        { id: "comparar", t: "Comparar PDF", d: "Ver diferencias", i: "compare", c: "#0c8599", cmd: "doc.compare" },
        { id: "palabras", t: "Contar palabras", d: "Estadísticas del texto", i: "info", c: "#495057", cmd: "file.word_count" },
        { id: "escritorio", t: "Modo completo", d: "Todas las funciones PC", i: "desktop", c: "#212529", desktop: true },
      ],
    },
  ];
  const ALL_TOOLS = TOOL_CATEGORIES.flatMap((c) => c.items);

  const QUICK_ACTIONS = [
    { t: "Abrir PDF", i: "open", c: "#1473e6", action: "open" },
    { t: "Fotos a PDF", i: "camera", c: "#0c8599", action: "scan" },
    { t: "Combinar PDF", i: "combine", c: "#1971c2", action: "combine" },
    { t: "Firmar", i: "sign", c: "#6741d9", mode: "firmar" },
    { t: "Comentar", i: "comment", c: "#e8590c", mode: "comentar" },
    { t: "Organizar", i: "organize", c: "#2b8a3e", mode: "organizar" },
    { t: "Comprimir", i: "compress", c: "#2f9e44", cmd: "optimize.reduce" },
    { t: "A Word", i: "word", c: "#1864ab", cmd: "export.docx" },
  ];

  // ---------- Shell principal (3 pestañas: Inicio, Archivos, Herramientas) ----------
  function initStaticChrome() {
    $("pc-create-fab").replaceChildren();
    $("pc-create-fab").insertAdjacentHTML("afterbegin", icon("plus"));
    $("pc-create-fab").addEventListener("click", openCreateSheet);

    $("pc-hist-back").insertAdjacentHTML("afterbegin", icon("arrowLeft"));
    $("pc-hist-fwd").insertAdjacentHTML("afterbegin", icon("arrowRight"));
    $("pc-hist-back").addEventListener("click", () => pc.run("view.previous_view").catch(() => {}));
    $("pc-hist-fwd").addEventListener("click", () => pc.run("view.next_view").catch(() => {}));
    $("pc-pill").addEventListener("click", goToPageSheet);

    // Scrubber interactivo para saltar rápido por documentos largos (p. ej. libros de 500+ páginas)
    const range = $("pc-range");
    const tip = $("pc-scrub-tip");
    let scrubTimer = null;
    range.addEventListener("input", () => {
      S.scrubbing = true;
      const n = parseInt(range.value, 10) || 1;
      $("pc-pill").textContent = n + " / " + (S.doc ? S.doc.pages : 1);
      tip.textContent = "Página " + n;
      tip.hidden = false;
      clearTimeout(scrubTimer);
      scrubTimer = setTimeout(() => {
        pc.set("page", String(n)).catch(() => {});
      }, 90);
    });
    const finishScrub = () => {
      if (!S.scrubbing) return;
      S.scrubbing = false;
      tip.hidden = true;
      clearTimeout(scrubTimer);
      const n = parseInt(range.value, 10) || 1;
      S.navHistoryUsed = true;
      pc.set("page", String(n)).catch(() => {});
      if (S.doc) { S.doc.page = n; saveLastPage(); }
    };
    range.addEventListener("change", finishScrub);
    range.addEventListener("touchend", finishScrub);
    range.addEventListener("pointerup", finishScrub);

    renderTabBar();
  }

  function renderTabBar() {
    const tabs = [
      { id: "inicio", t: "Inicio", i: "home" },
      { id: "archivos", t: "Archivos", i: "folder" },
      { id: "herramientas", t: "Herramientas", i: "tools" },
    ];
    $("pc-tabbar").replaceChildren(...tabs.map((tb) => h("button", {
      class: "pc-tab-btn", type: "button",
      "aria-current": S.tab === tb.id ? "page" : null,
      onclick: () => switchTab(tb.id),
    }, h("span", { icon: tb.i }), h("span", { text: tb.t }))));
  }

  async function switchTab(tab) {
    S.tab = tab;
    if (tab !== "archivos") S.filesFolder = null;
    renderTabBar();
    await reloadLibrary();
    renderShell();
  }

  async function reloadLibrary() {
    try { S.cachedList = await files.list(); } catch (e) { S.cachedList = []; }
    try { S.cachedFolders = await files.listFolders(); } catch (e) { S.cachedFolders = []; }
  }

  function sortFiles(list) {
    const copy = list.slice();
    if (prefs.orden === "nombre") copy.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
    else if (prefs.orden === "tamano") copy.sort((a, b) => (b.tamano || 0) - (a.tamano || 0));
    else copy.sort((a, b) => (b.abierto || 0) - (a.abierto || 0));
    return copy;
  }

  function renderShell() {
    $("pc-create-fab").hidden = S.tab === "herramientas";
    if (S.tab === "inicio") renderHomeTab();
    else if (S.tab === "archivos") renderFilesTab();
    else renderToolsTab();
  }

  function makeSearchBox(placeholder, value, onChange, autoFocus) {
    const input = h("input", {
      type: "search", placeholder, value, autocomplete: "off", autocorrect: "off",
      autocapitalize: "off", spellcheck: "false", "aria-label": placeholder,
    });
    const clearBtn = h("button", {
      class: "pc-clear-btn", type: "button", "aria-label": "Limpiar búsqueda", icon: "close",
      hidden: !value,
      onclick: () => { input.value = ""; clearBtn.hidden = true; onChange(""); input.focus(); },
    });
    input.addEventListener("input", () => {
      clearBtn.hidden = !input.value;
      onChange(input.value);
    });
    const box = h("label", { class: "pc-search-box" }, h("span", { icon: "search" }), input, clearBtn);
    if (autoFocus) setTimeout(() => input.focus(), 30);
    return box;
  }

  // ----- Pestaña 1: Inicio -----
  function renderHomeTab() {
    const head = $("pc-app-head");
    head.replaceChildren(...[
      h("div", { class: "pc-head-row" },
        h("img", { class: "pc-brand-logo", src: "./icons/icon-192.png", alt: "" }),
        h("h1", { class: "pc-head-title", text: "PdfCraft" }),
        h("button", {
          class: "pc-head-btn" + (S.homeSearchOpen ? " pc-active" : ""), type: "button",
          "aria-label": "Buscar archivos", icon: "search",
          onclick: () => {
            S.homeSearchOpen = !S.homeSearchOpen;
            if (!S.homeSearchOpen) S.homeQuery = "";
            renderHomeTab();
          },
        }),
        h("button", { class: "pc-head-btn", type: "button", "aria-label": "Ajustes", icon: "settings", onclick: settingsSheet })),
      S.homeSearchOpen
        ? makeSearchBox("Buscar en tus PDF…", S.homeQuery, (q) => { S.homeQuery = q; renderHomeBody(); }, true)
        : null,
    ].filter(Boolean));
    renderHomeBody();
  }

  function renderHomeBody() {
    const bodyEl = $("pc-tab-body");
    const q = S.homeQuery.trim().toLowerCase();
    const starredCount = S.cachedList.filter((m) => m.destacado).length;
    let list = S.cachedList;
    if (S.homeFilter === "destacados") list = list.filter((m) => m.destacado);
    if (q) list = list.filter((m) => (m.nombre || "").toLowerCase().includes(q));
    list = sortFiles(list);

    const nodes = [];
    if (!q) {
      nodes.push(h("div", { class: "pc-quick-strip", role: "region", "aria-label": "Acciones rápidas" },
        QUICK_ACTIONS.map((qa) => {
          const badge = h("span", { class: "pc-quick-badge", icon: qa.i });
          badge.style.background = qa.c;
          return h("button", { class: "pc-quick-card", type: "button", onclick: () => launchToolFromHome(qa) }, badge, h("span", { text: qa.t }));
        })));
    }

    nodes.push(h("div", { class: "pc-filter-row" },
      h("div", { class: "pc-pills", role: "tablist" },
        h("button", {
          class: "pc-chip", type: "button", "aria-pressed": String(S.homeFilter === "recientes"),
          text: "Recientes", onclick: () => { S.homeFilter = "recientes"; renderHomeBody(); },
        }),
        h("button", {
          class: "pc-chip", type: "button", "aria-pressed": String(S.homeFilter === "destacados"),
          onclick: () => { S.homeFilter = "destacados"; renderHomeBody(); },
        }, h("span", { iconFilled: "star" }), h("span", { text: "Destacados" + (starredCount ? " (" + starredCount + ")" : "") }))),
      h("button", { class: "pc-sort-btn", type: "button", icon: "sort", onclick: sortSheet },
        h("span", { text: prefs.orden === "nombre" ? "Nombre" : prefs.orden === "tamano" ? "Tamaño" : "Reciente" }))));

    if (list.length) {
      nodes.push(renderFileList(list));
    } else {
      nodes.push(h("div", { class: "pc-empty" },
        h("div", { icon: S.homeFilter === "destacados" ? "star" : "file" }),
        h("b", { text: q ? "Sin resultados" : S.homeFilter === "destacados" ? "Sin documentos destacados" : "Tus PDF aparecerán aquí" }),
        h("div", {
          text: q
            ? "No encontramos ningún archivo que coincida con «" + S.homeQuery + "»."
            : S.homeFilter === "destacados"
              ? "Toca la estrella en cualquier documento para tenerlo siempre a mano."
              : "Abre un PDF desde Archivos o crea uno nuevo con fotos de tu iPhone.",
        }),
        !q && S.homeFilter === "recientes"
          ? h("button", { class: "pc-empty-btn", type: "button", text: "Abrir un PDF", onclick: () => pickFile(null) })
          : null));
    }

    bodyEl.replaceChildren(...nodes);
  }

  // ----- Pestaña 2: Archivos -----
  function renderFilesTab() {
    const head = $("pc-app-head");
    const folder = S.filesFolder && S.filesFolder !== "destacados"
      ? S.cachedFolders.find((f) => f.id === S.filesFolder)
      : null;
    const title = S.filesFolder === "destacados" ? "Destacados" : folder ? folder.nombre : "Archivos";

    head.replaceChildren(
      h("div", { class: "pc-head-row" },
        S.filesFolder
          ? h("button", { class: "pc-head-back", type: "button", icon: "back", onclick: () => { S.filesFolder = null; renderFilesTab(); } }, h("span", { text: "Archivos" }))
          : null,
        h("h1", { class: "pc-head-title", text: title }),
        !S.filesFolder
          ? h("button", { class: "pc-head-btn", type: "button", "aria-label": "Nueva carpeta", icon: "folderPlus", onclick: () => newFolderSheet(null) })
          : null,
        h("button", {
          class: "pc-head-btn", type: "button",
          "aria-label": prefs.vistaArchivos === "lista" ? "Ver en cuadrícula" : "Ver en lista",
          icon: prefs.vistaArchivos === "lista" ? "gridView" : "listView",
          onclick: () => {
            prefs.vistaArchivos = prefs.vistaArchivos === "lista" ? "cuadricula" : "lista";
            savePrefs();
            renderFilesTab();
          },
        }),
        h("button", { class: "pc-head-btn", type: "button", "aria-label": "Ordenar", icon: "sort", onclick: sortSheet })),
      makeSearchBox("Buscar en tus archivos…", S.filesQuery, (q) => { S.filesQuery = q; renderFilesBody(); }, false)
    );
    renderFilesBody();
  }

  function renderFilesBody() {
    const bodyEl = $("pc-tab-body");
    const q = S.filesQuery.trim().toLowerCase();
    const nodes = [];

    if (!S.filesFolder && !q) {
      const totalBytes = S.cachedList.reduce((acc, m) => acc + (m.tamano || 0), 0);
      const starCount = S.cachedList.filter((m) => m.destacado).length;
      nodes.push(h("div", { class: "pc-loc-card" },
        locRow("iphone", "#1473e6", "En este iPhone", S.cachedList.length + (S.cachedList.length === 1 ? " documento" : " documentos") + " · " + sizeText(totalBytes), () => {
          const el = bodyEl.querySelector("#pc-all-files-anchor");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }),
        locRow("star", "#f59f00", "Destacados", starCount + (starCount === 1 ? " documento" : " documentos"), () => {
          S.filesFolder = "destacados";
          renderFilesTab();
        }),
        locRow("open", "#2b8a3e", "Archivos / iCloud Drive", "Importar un PDF desde tu iPhone", () => pickFile(null))));

      if (S.cachedFolders.length) {
        nodes.push(h("div", { class: "pc-section-head" },
          h("h2", { text: "Carpetas" }),
          h("button", { class: "pc-link-btn", type: "button", text: "+ Nueva", onclick: () => newFolderSheet(null) })));
        nodes.push(h("div", { class: "pc-loc-card" },
          S.cachedFolders.map((f) => {
            const cnt = S.cachedList.filter((m) => m.carpeta === f.id).length;
            return h("div", { class: "pc-loc-row", style: "padding-right:6px" },
              h("button", {
                style: "flex:1;min-width:0;display:flex;align-items:center;gap:12px;text-align:left",
                type: "button",
                onclick: () => { S.filesFolder = f.id; renderFilesTab(); },
              },
                (() => { const ic = h("span", { class: "pc-loc-ico", icon: "folder" }); ic.style.background = "#495057"; return ic; })(),
                h("span", { class: "pc-loc-info" }, h("b", { text: f.nombre }), h("small", { text: cnt + (cnt === 1 ? " archivo" : " archivos") }))),
              h("button", { class: "pc-recent-more", type: "button", "aria-label": "Opciones de carpeta", icon: "more", onclick: () => folderMenu(f) }));
          })));
      }
      nodes.push(h("div", { class: "pc-section-head", id: "pc-all-files-anchor" },
        h("h2", { text: "Todos los documentos" }),
        h("small", { text: String(S.cachedList.length) })));
    }

    let list = S.cachedList;
    if (S.filesFolder === "destacados") list = list.filter((m) => m.destacado);
    else if (S.filesFolder) list = list.filter((m) => m.carpeta === S.filesFolder);
    if (q) list = list.filter((m) => (m.nombre || "").toLowerCase().includes(q));
    list = sortFiles(list);

    if (list.length) {
      nodes.push(prefs.vistaArchivos === "cuadricula" ? renderFileGrid(list) : renderFileList(list));
    } else {
      nodes.push(h("div", { class: "pc-empty" },
        h("div", { icon: "folder" }),
        h("b", { text: q ? "Sin coincidencias" : "Carpeta vacía" }),
        h("div", { text: q ? "Prueba con otro nombre de archivo." : "Usa ••• en un PDF para moverlo aquí o toca + para abrir uno." })));
    }
    bodyEl.replaceChildren(...nodes);
  }

  function locRow(ic, color, title, sub, onclick) {
    const badge = h("span", { class: "pc-loc-ico", icon: ic });
    badge.style.background = color;
    return h("button", { class: "pc-loc-row", type: "button", onclick },
      badge,
      h("span", { class: "pc-loc-info" }, h("b", { text: title }), h("small", { text: sub })),
      h("span", { class: "pc-loc-chev", icon: "chevRight" }));
  }

  // ----- Pestaña 3: Herramientas -----
  function renderToolsTab() {
    const head = $("pc-app-head");
    head.replaceChildren(
      h("div", { class: "pc-head-row" },
        h("h1", { class: "pc-head-title", text: "Herramientas" }),
        h("button", { class: "pc-head-btn", type: "button", "aria-label": "Ajustes", icon: "settings", onclick: settingsSheet })),
      makeSearchBox("Buscar herramienta…", S.toolsQuery, (q) => { S.toolsQuery = q; renderToolsBody(); }, false)
    );
    renderToolsBody();
  }

  function renderToolsBody() {
    const bodyEl = $("pc-tab-body");
    const q = S.toolsQuery.trim().toLowerCase();
    const nodes = [];
    for (const cat of TOOL_CATEGORIES) {
      const items = q
        ? cat.items.filter((it) => (it.t + " " + it.d).toLowerCase().includes(q))
        : cat.items;
      if (!items.length) continue;
      nodes.push(h("section", { class: "pc-tool-cat" },
        h("h3", { text: cat.titulo }),
        h("div", { class: "pc-tool-grid" }, items.map((tool) => {
          const tile = h("span", { class: "pc-tile", icon: tool.i });
          tile.style.background = tool.c;
          return h("button", { class: "pc-tool-card", type: "button", onclick: () => launchToolFromHome(tool) },
            tile,
            h("span", { class: "pc-tool-card-txt" }, h("b", { text: tool.t }), h("small", { text: tool.d })));
        }))));
    }
    if (!nodes.length) {
      nodes.push(h("div", { class: "pc-empty" },
        h("div", { icon: "search" }),
        h("b", { text: "No se encontró esa herramienta" }),
        h("div", { text: "También puedes abrir el Modo completo para acceder a todas las funciones de PdfCraft." })));
    }
    bodyEl.replaceChildren(...nodes);
  }

  // ---------- Renderizado de archivos (Lista / Cuadrícula) ----------
  function folderNameOf(id) {
    if (!id) return "";
    const f = S.cachedFolders.find((x) => x.id === id);
    return f ? f.nombre : "";
  }

  function renderFileList(list) {
    return h("ul", { class: "pc-recents", "aria-label": "Documentos PDF" }, list.map((meta) => {
      const thumb = h("span", { class: "pc-thumb" });
      if (meta.miniatura) thumb.append(h("img", { src: meta.miniatura, alt: "" }));
      else { thumb.insertAdjacentHTML("afterbegin", icon("file")); thumb.append(h("span", { class: "pc-thumb-tag", text: "PDF" })); }
      const fName = folderNameOf(meta.carpeta);
      const tags = [];
      if (meta.ultimaPagina && meta.ultimaPagina > 1 && meta.paginas > 1) {
        tags.push(h("span", { class: "pc-mini-badge pc-accent-badge", text: "Pág. " + meta.ultimaPagina }));
      }
      if (fName && !S.filesFolder) {
        tags.push(h("span", { class: "pc-mini-badge", text: fName }));
      }
      return h("li", { class: "pc-recent" },
        h("button", { class: "pc-recent-open", type: "button", onclick: () => openRecent(meta) },
          thumb,
          h("span", { class: "pc-recent-text" },
            h("b", { text: meta.nombre }),
            h("small", { text: describe(meta) }),
            tags.length ? h("span", { class: "pc-recent-tags" }, tags) : null)),
        h("button", {
          class: "pc-star-btn" + (meta.destacado ? " pc-starred" : ""),
          type: "button", "aria-label": meta.destacado ? "Quitar de destacados" : "Destacar",
          [meta.destacado ? "iconFilled" : "icon"]: "star",
          onclick: () => toggleStar(meta),
        }),
        h("button", {
          class: "pc-recent-more", type: "button", "aria-label": "Opciones de " + meta.nombre,
          icon: "more", onclick: () => recentMenu(meta),
        }));
    }));
  }

  function renderFileGrid(list) {
    return h("div", { class: "pc-file-grid" }, list.map((meta) => {
      const prev = h("div", { class: "pc-file-card-preview" });
      if (meta.miniatura) prev.append(h("img", { src: meta.miniatura, alt: "" }));
      else prev.insertAdjacentHTML("afterbegin", icon("file"));
      return h("div", { class: "pc-file-card" },
        h("button", { class: "pc-file-card-tap", type: "button", onclick: () => openRecent(meta) },
          prev,
          h("div", { class: "pc-file-card-meta" }, h("b", { text: meta.nombre }), h("small", { text: describe(meta) }))),
        h("div", { class: "pc-file-card-actions" },
          h("button", {
            class: "pc-card-dot" + (meta.destacado ? " pc-starred" : ""), type: "button",
            "aria-label": "Destacar", [meta.destacado ? "iconFilled" : "icon"]: "star",
            onclick: () => toggleStar(meta),
          }),
          h("button", {
            class: "pc-card-dot", type: "button", "aria-label": "Más opciones", icon: "more",
            onclick: () => recentMenu(meta),
          })));
    }));
  }

  async function toggleStar(meta) {
    meta.destacado = !meta.destacado;
    await files.putMeta(meta).catch(() => {});
    if (S.doc && S.doc.meta.id === meta.id) { S.doc.meta.destacado = meta.destacado; renderTop(); }
    await reloadLibrary();
    if (!body.classList.contains("pc-in-viewer")) renderShell();
  }

  function describe(meta) {
    const d = new Date(meta.modificado || meta.abierto || Date.now());
    const today = new Date();
    const when = d.toDateString() === today.toDateString()
      ? "Hoy, " + d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("es", { day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
    const pages = meta.paginas ? " · " + meta.paginas + " pág." : "";
    return when + " · " + sizeText(meta.tamano || 0) + pages;
  }
  function sizeText(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / 1024 / 1024).toFixed(1).replace(".", ",") + " MB";
  }

  // ---------- Menús de archivo y carpetas ----------
  function recentMenu(meta) {
    sheet({
      title: meta.nombre,
      text: describe(meta),
      build: (close) => [
        list([
          { i: "open", t: "Abrir", run: () => { close(); openRecent(meta); } },
          { i: "star", t: meta.destacado ? "Quitar de destacados" : "Destacar", run: () => { close(); toggleStar(meta); } },
          { i: "comment", t: "Comentar", run: () => { close(); openRecent(meta, { mode: "comentar" }); } },
          { i: "sign", t: "Rellenar y firmar", run: () => { close(); openRecent(meta, { mode: "firmar" }); } },
          { i: "organize", t: "Organizar páginas", run: () => { close(); openRecent(meta, { mode: "organizar" }); } },
        ]),
        list([
          { i: "share", t: "Compartir / Guardar en Archivos", run: async () => { close(); const b = await files.blob(meta.id); if (b) share(new File([b], meta.nombre, { type: "application/pdf" })); } },
          { i: "compress", t: "Comprimir PDF", run: () => { close(); openRecent(meta, { cmd: "optimize.reduce", t: "Comprimir PDF" }); } },
          { i: "word", t: "Exportar a Word", run: () => { close(); openRecent(meta, { cmd: "export.docx", t: "Exportar a Word" }); } },
          { i: "folder", t: "Mover a carpeta…", run: () => { close(); moveFolderSheet(meta); } },
          { i: "rename", t: "Renombrar", run: () => { close(); renameSheet(meta); } },
          { i: "copy", t: "Duplicar", run: () => { close(); duplicateFile(meta); } },
        ]),
        list([
          { i: "trash", t: "Quitar de la app", danger: true, run: () => { close(); confirmRemove(meta); } },
        ]),
      ],
    });
  }

  function renameSheet(meta) {
    const base = (meta.nombre || "documento.pdf").replace(/\.pdf$/i, "");
    const input = h("input", { class: "pc-field", type: "text", value: base, placeholder: "Nombre del PDF", "aria-label": "Nombre del PDF" });
    sheet({
      title: "Renombrar PDF",
      build: (close) => {
        const save = async () => {
          const clean = input.value.trim();
          if (!clean) return;
          meta.nombre = clean.replace(/\.pdf$/i, "") + ".pdf";
          await files.putMeta(meta).catch(() => {});
          if (S.doc && S.doc.meta.id === meta.id) { S.doc.meta.nombre = meta.nombre; renderTop(); }
          await reloadLibrary();
          if (!body.classList.contains("pc-in-viewer")) renderShell();
          close();
          toast("Renombrado a " + meta.nombre);
        };
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
        return [input, h("button", { class: "pc-primary", type: "button", text: "Guardar nombre", onclick: save })];
      },
    });
    input.focus();
    input.select();
  }

  async function duplicateFile(meta) {
    const blob = await files.blob(meta.id);
    if (!blob) { toast("No se encontró el archivo."); return; }
    const copyName = meta.nombre.replace(/\.pdf$/i, "") + " (copia).pdf";
    const copyMeta = Object.assign({}, meta, {
      id: newId(), nombre: copyName, abierto: Date.now(), modificado: Date.now(), destacado: false,
    });
    await files.save(copyMeta, blob);
    await reloadLibrary();
    renderShell();
    toast("Copia creada: " + copyName);
  }

  function moveFolderSheet(meta) {
    sheet({
      title: "Mover a carpeta",
      build: (close) => {
        const rows = [
          {
            i: "iphone", t: "Sin carpeta (Raíz)", small: !meta.carpeta ? "Actual" : "",
            run: async () => { close(); delete meta.carpeta; await files.putMeta(meta); await reloadLibrary(); renderShell(); toast("Movido a la raíz"); },
          },
          ...S.cachedFolders.map((f) => ({
            i: "folder", t: f.nombre, small: meta.carpeta === f.id ? "Actual" : "",
            run: async () => { close(); meta.carpeta = f.id; await files.putMeta(meta); await reloadLibrary(); renderShell(); toast("Movido a " + f.nombre); },
          })),
        ];
        return [
          list(rows),
          h("button", { class: "pc-secondary", type: "button", icon: "folderPlus", text: "Crear carpeta nueva", onclick: () => { close(); newFolderSheet(meta); } }),
        ];
      },
    });
  }

  function newFolderSheet(moveMeta) {
    const targetMeta = moveMeta && moveMeta.id ? moveMeta : null;
    const input = h("input", { class: "pc-field", type: "text", placeholder: "Ej. Universidad, Contratos…", "aria-label": "Nombre de la carpeta" });
    sheet({
      title: "Nueva carpeta",
      build: (close) => {
        const create = async () => {
          const name = input.value.trim();
          if (!name) return;
          const folder = { id: newId(), nombre: name, creada: Date.now() };
          await files.saveFolder(folder);
          if (targetMeta) { targetMeta.carpeta = folder.id; await files.putMeta(targetMeta); }
          await reloadLibrary();
          renderShell();
          close();
          toast(targetMeta ? "Movido a «" + name + "»" : "Carpeta «" + name + "» creada");
        };
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") create(); });
        return [input, h("button", { class: "pc-primary", type: "button", text: "Crear", onclick: create })];
      },
    });
    input.focus();
  }

  function folderMenu(folder) {
    sheet({
      title: folder.nombre,
      build: (close) => [list([
        { i: "rename", t: "Renombrar carpeta", run: () => {
          close();
          const input = h("input", { class: "pc-field", type: "text", value: folder.nombre });
          sheet({
            title: "Renombrar carpeta",
            build: (c2) => [input, h("button", { class: "pc-primary", type: "button", text: "Guardar", onclick: async () => {
              const v = input.value.trim();
              if (!v) return;
              folder.nombre = v;
              await files.saveFolder(folder);
              await reloadLibrary();
              renderFilesTab();
              c2();
            } })],
          });
          input.focus();
        } },
        { i: "trash", t: "Eliminar carpeta", danger: true, run: async () => {
          close();
          await files.removeFolder(folder.id);
          if (S.filesFolder === folder.id) S.filesFolder = null;
          await reloadLibrary();
          renderFilesTab();
          toast("Carpeta eliminada (los PDF se conservan)");
        } },
      ])],
    });
  }

  function sortSheet() {
    const opts = [
      ["reciente", "Más reciente primero"],
      ["nombre", "Nombre (A – Z)"],
      ["tamano", "Tamaño (mayor primero)"],
    ];
    sheet({
      title: "Ordenar archivos",
      build: (close) => [list(opts.map(([val, label]) => ({
        i: prefs.orden === val ? "check" : "sort", t: label,
        run: () => { prefs.orden = val; savePrefs(); close(); renderShell(); },
      })))],
    });
  }

  function confirmRemove(meta) {
    sheet({
      title: "¿Quitar de la app?",
      text: meta.nombre + " se borrará de PdfCraft en este iPhone junto con sus cambios. El archivo original en Archivos no se toca.",
      build: (close) => [list([{
        i: "trash", t: "Quitar", danger: true,
        run: async () => { close(); await files.remove(meta.id); await reloadLibrary(); renderShell(); toast("Se quitó de la app"); },
      }])],
    });
  }

  // ---------- Menú "+" Crear o abrir ----------
  function openCreateSheet() {
    sheet({
      title: "Crear o abrir",
      build: (close) => [list([
        { i: "open", t: "Abrir PDF desde Archivos", small: "iCloud / iPhone", run: () => { close(); pickFile(null); } },
        { i: "camera", t: "Escanear / Fotos a PDF", small: "Cámara o galería", run: () => { close(); openScannerSheet(); } },
        { i: "combine", t: "Combinar archivos PDF", small: "Unir varios", run: () => { close(); openCombineSheet(); } },
        { i: "blank", t: "Crear PDF en blanco", small: "Página nueva", run: () => { close(); createBlankPdf(); } },
      ])],
    });
  }

  function launchToolFromHome(tool) {
    if (tool.action === "open") { pickFile(null); return; }
    if (tool.action === "scan") { openScannerSheet(); return; }
    if (tool.action === "combine") { openCombineSheet(); return; }
    if (tool.action === "blank") { createBlankPdf(); return; }
    if (tool.desktop) { setDesktop(true); return; }
    if (!S.cachedList.length) { pickFile(tool); return; }
    // Selector inteligente estilo Acrobat: elegir de Recientes o desde Archivos
    sheet({
      title: tool.t,
      text: "Elige un PDF para usar esta herramienta",
      build: (close) => [
        h("button", { class: "pc-primary", type: "button", icon: "open", text: "Abrir desde Archivos / iCloud", onclick: () => { close(); pickFile(tool); } }),
        h("div", { class: "pc-label", style: "margin-top:16px", text: "O elige uno de tus recientes" }),
        list(S.cachedList.slice(0, 12).map((meta) => ({
          i: "file", t: meta.nombre, small: meta.paginas ? meta.paginas + " pág." : "",
          run: () => { close(); openRecent(meta, tool); },
        }))),
      ],
    });
  }

  // ---------- Escáner / Fotos a PDF (100 % compatible con Safari iOS) ----------
  function openScannerSheet() {
    if (!window.pdfcraftScanner) { toast("Escáner no disponible"); return; }
    const pages = [];
    let filter = "doc"; // "original" | "doc" | "bw"
    let paper = "auto"; // "auto" | "a4" | "letter"
    const nameInput = h("input", {
      class: "pc-field", type: "text",
      value: "Escaneo " + new Date().toLocaleDateString("es", { day: "2-digit", month: "2-digit" }).replace("/", "-"),
      placeholder: "Nombre del PDF", "aria-label": "Nombre del PDF",
    });
    const listWrap = h("div", { class: "pc-scan-list" });
    const createBtn = h("button", { class: "pc-primary", type: "button", text: "Crear PDF", disabled: true });

    const refresh = () => {
      createBtn.disabled = pages.length === 0;
      createBtn.textContent = pages.length ? "Crear PDF (" + pages.length + (pages.length === 1 ? " página)" : " páginas)") : "Añade al menos una foto";
      if (!pages.length) {
        listWrap.replaceChildren(h("div", { class: "pc-empty", style: "padding:20px" },
          h("div", { icon: "camera" }),
          h("div", { text: "Toma fotos con la cámara o elige varias imágenes de tu galería." })));
        return;
      }
      listWrap.replaceChildren(...pages.map((p, idx) => h("div", { class: "pc-scan-item" },
        h("img", { class: "pc-scan-thumb", src: p.thumb, alt: "" }),
        h("div", { class: "pc-scan-info" },
          h("b", { text: "Página " + (idx + 1) }),
          h("small", { text: p.name })),
        h("div", { class: "pc-scan-btns" },
          h("button", { type: "button", "aria-label": "Girar", icon: "rotate", onclick: () => {
            p.rot = (p.rot + 90) % 360;
            p.thumb = window.pdfcraftScanner.makeThumb(p.img, p.rot, filter);
            refresh();
          } }),
          idx > 0 ? h("button", { type: "button", "aria-label": "Subir", icon: "up", onclick: () => {
            [pages[idx - 1], pages[idx]] = [pages[idx], pages[idx - 1]]; refresh();
          } }) : null,
          idx < pages.length - 1 ? h("button", { type: "button", "aria-label": "Bajar", icon: "down", onclick: () => {
            [pages[idx + 1], pages[idx]] = [pages[idx], pages[idx + 1]]; refresh();
          } }) : null,
          h("button", { class: "pc-danger", type: "button", "aria-label": "Quitar", icon: "trash", onclick: () => {
            pages.splice(idx, 1); refresh();
          } })))));
    };

    const addImages = async (fileList) => {
      if (!fileList || !fileList.length) return;
      for (const f of fileList) {
        try {
          const img = await window.pdfcraftScanner.loadImage(f);
          pages.push({
            id: newId(), name: f.name || "Foto.jpg", img, rot: 0,
            thumb: window.pdfcraftScanner.makeThumb(img, 0, filter),
          });
        } catch (e) { toast(e.message); }
      }
      refresh();
    };

    const galleryInput = $("pc-img-gallery");
    const cameraInput = $("pc-img-camera");
    const onGal = () => { addImages(galleryInput.files); galleryInput.value = ""; };
    const onCam = () => { addImages(cameraInput.files); cameraInput.value = ""; };
    galleryInput.addEventListener("change", onGal);
    cameraInput.addEventListener("change", onCam);

    const makeSeg = (opts, get, set) => {
      const wrap = h("div", { class: "pc-seg", role: "group" });
      const draw = () => wrap.replaceChildren(...opts.map(([val, label]) => h("button", {
        type: "button", "aria-pressed": String(get() === val), text: label,
        onclick: () => { set(val); draw(); },
      })));
      draw();
      return wrap;
    };

    const close = sheet({
      title: "Fotos / Escáner a PDF",
      onClose: () => {
        galleryInput.removeEventListener("change", onGal);
        cameraInput.removeEventListener("change", onCam);
      },
      build: () => {
        createBtn.addEventListener("click", async () => {
          if (!pages.length) return;
          createBtn.disabled = true;
          createBtn.textContent = "Generando PDF…";
          try {
            const pdfItems = pages.map((p) => ({ img: p.img, rot: p.rot, filter }));
            const file = await window.pdfcraftScanner.buildPdf(pdfItems, { name: nameInput.value.trim() || "Escaneo.pdf", paper });
            const meta = { id: newId(), nombre: file.name, tamano: file.size, abierto: Date.now(), modificado: Date.now(), paginas: pages.length };
            await files.save(meta, file);
            await reloadLibrary();
            close();
            openDocument(meta, file, null);
            toast("PDF creado con " + pages.length + (pages.length === 1 ? " página" : " páginas"));
          } catch (e) {
            toast("Error al crear PDF: " + e.message, 5000);
            refresh();
          }
        });
        return [
          h("div", { class: "pc-btn-row" },
            h("button", { class: "pc-secondary", type: "button", icon: "camera", text: "Tomar foto", onclick: () => cameraInput.click() }),
            h("button", { class: "pc-secondary", type: "button", icon: "image", text: "Galería", onclick: () => galleryInput.click() })),
          listWrap,
          h("div", { class: "pc-label", text: "Filtro de escaneo" }),
          makeSeg([["original", "Original"], ["doc", "Documento"], ["bw", "Blanco y negro"]], () => filter, (v) => {
            filter = v;
            pages.forEach((p) => { p.thumb = window.pdfcraftScanner.makeThumb(p.img, p.rot, filter); });
            refresh();
          }),
          h("div", { class: "pc-label", text: "Tamaño de página" }),
          makeSeg([["auto", "Auto"], ["a4", "A4"], ["letter", "Carta"]], () => paper, (v) => { paper = v; }),
          h("div", { class: "pc-label", text: "Nombre del archivo" }),
          nameInput,
          createBtn,
        ];
      },
    });
    refresh();
  }

  // ---------- Combinar archivos PDF (usando el motor Rust de PdfCraft vía drop) ----------
  function openCombineSheet(preselectedMeta) {
    const queue = []; // [{ id, name, file?, metaId? }]
    const pre = preselectedMeta && preselectedMeta.id ? preselectedMeta : null;
    if (pre) queue.push({ id: newId(), name: pre.nombre, metaId: pre.id });
    const nameInput = h("input", { class: "pc-field", type: "text", value: "Combinado.pdf", placeholder: "Nombre del PDF combinado", "aria-label": "Nombre del archivo" });
    const listWrap = h("div", { class: "pc-scan-list" });
    const runBtn = h("button", { class: "pc-primary", type: "button", text: "Combinar PDF", disabled: true });

    const refresh = () => {
      runBtn.disabled = queue.length < 2;
      runBtn.textContent = queue.length < 2 ? "Añade al menos 2 PDF" : "Combinar " + queue.length + " archivos";
      if (!queue.length) {
        listWrap.replaceChildren(h("div", { class: "pc-empty", style: "padding:18px" },
          h("div", { icon: "combine" }),
          h("div", { text: "Añade PDF de tus recientes o desde Archivos para unirlos en uno solo." })));
        return;
      }
      listWrap.replaceChildren(...queue.map((it, idx) => h("div", { class: "pc-scan-item" },
        h("span", { class: "pc-bm-page", text: String(idx + 1) }),
        h("div", { class: "pc-scan-info" }, h("b", { text: it.name })),
        h("div", { class: "pc-scan-btns" },
          idx > 0 ? h("button", { type: "button", "aria-label": "Subir", icon: "up", onclick: () => { [queue[idx - 1], queue[idx]] = [queue[idx], queue[idx - 1]]; refresh(); } }) : null,
          idx < queue.length - 1 ? h("button", { type: "button", "aria-label": "Bajar", icon: "down", onclick: () => { [queue[idx + 1], queue[idx]] = [queue[idx], queue[idx + 1]]; refresh(); } }) : null,
          h("button", { class: "pc-danger", type: "button", "aria-label": "Quitar", icon: "trash", onclick: () => { queue.splice(idx, 1); refresh(); } })))));
    };

    const multiInput = $("pc-files-multi");
    const onMulti = () => {
      for (const f of multiInput.files || []) queue.push({ id: newId(), name: f.name || "archivo.pdf", file: f });
      multiInput.value = "";
      refresh();
    };
    multiInput.addEventListener("change", onMulti);

    const close = sheet({
      title: "Combinar archivos PDF",
      onClose: () => multiInput.removeEventListener("change", onMulti),
      build: () => {
        runBtn.addEventListener("click", async () => {
          if (queue.length < 2) return;
          const outName = (nameInput.value.trim() || "Combinado").replace(/\.pdf$/i, "") + ".pdf";
          const resolved = [];
          for (const it of queue) {
            if (it.file) resolved.push(it.file);
            else if (it.metaId) {
              const b = await files.blob(it.metaId);
              if (b) resolved.push(new File([b], it.name, { type: "application/pdf" }));
            }
          }
          if (resolved.length < 2) { toast("No se pudieron leer los archivos."); return; }
          close();
          runCombineInEngine(resolved, outName);
        });

        const recentsPick = S.cachedList.length
          ? [
              h("div", { class: "pc-label", text: "Añadir desde tus recientes" }),
              list(S.cachedList.slice(0, 8).map((m) => ({
                i: "plus", t: m.nombre, small: m.paginas ? m.paginas + " pág." : "",
                run: () => { queue.push({ id: newId(), name: m.nombre, metaId: m.id }); refresh(); },
              }))),
            ]
          : [];

        return [
          listWrap,
          h("button", { class: "pc-secondary", style: "margin-bottom:14px", type: "button", icon: "open", text: "Añadir PDF desde Archivos / iCloud", onclick: () => multiInput.click() }),
          ...recentsPick,
          h("div", { class: "pc-label", text: "Nombre del PDF resultante" }),
          nameInput,
          runBtn,
        ];
      },
    });
    refresh();
  }

  async function runCombineInEngine(pdfFiles, outName) {
    if (!S.ready) { toast("PdfCraft todavía está iniciando"); return; }
    S.combiningAuto = true;
    S.opening = true;
    showViewer();
    renderTop(outName);
    busy(true, "Combinando " + pdfFiles.length + " archivos…");
    try {
      if (!(await closeAll())) { busy(false); return; }
      showViewer();
      busy(true, "Combinando " + pdfFiles.length + " archivos…");
      const before = new Set(((await pc.state()).documents || []).map((d) => d.doc));
      await pc.run("page.combine");
      await sleep(350);

      // Si había archivos anteriores en la pestaña Combinar, los quitamos primero
      const s0 = await pc.state();
      if (s0.combine && s0.combine.files && s0.combine.files.length) {
        await pc.key("a", ["ctrl"]).catch(() => {});
        await sleep(100);
        await pc.key("Delete").catch(() => {});
        await sleep(150);
      }

      // Entrega los archivos ordenados uno a uno para garantizar el orden exacto
      for (const f of pdfFiles) {
        const dt = new DataTransfer();
        dt.items.add(f);
        canvas.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
        canvas.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
        await sleep(250);
      }
      // Esperar a que PdfCraft registre todos los archivos
      for (let i = 0; i < 30; i++) {
        const sc = await pc.state();
        if (sc.combine && sc.combine.files && sc.combine.files.length >= pdfFiles.length) break;
        await sleep(200);
      }
      // Pulsar el botón "Combinar" / "Combine" en PdfCraft
      const ui = await pc.inspect({});
      const btn = (ui.widgets || []).find((w) => w.role === "Button" && /^(Combinar|Combine)$/i.test(String(w.label || "").trim()));
      if (!btn) throw new Error("No se encontró el botón Combinar en PdfCraft.");
      await pc.click({ id: btn.id });

      // Esperar al documento combinado
      let doc = null;
      for (let i = 0; i < 80; i++) {
        await sleep(200);
        const s = await pc.state();
        const fresh = (s.documents || []).find((d) => !before.has(d.doc));
        if (fresh) { doc = fresh; break; }
      }
      if (!doc) throw new Error("No se pudo generar el PDF combinado.");
      const meta = { id: newId(), nombre: outName, tamano: 0, abierto: Date.now(), modificado: Date.now(), paginas: doc.pages };
      S.docs.set(doc.doc, { meta, name: doc.name });
      S.doc = { id: doc.doc, meta, name: doc.name, pages: doc.pages, page: 1, dirty: true, dirtySince: Date.now(), edited: true };
      await prepareDocument();
      // Guardar inmediatamente el resultado combinado en IndexedDB
      const saved = await saveActive(doc.name).catch(() => null);
      if (saved) {
        meta.tamano = saved.size;
        await files.save(meta, new File([saved], outName, { type: "application/pdf" }));
      }
      busy(false);
      renderTop();
      setTimeout(() => thumbnail(meta), 900);
      toast("PDF combinado listo: " + outName);
    } catch (e) {
      busy(false);
      toast("Error al combinar: " + e.message, 5000);
      S.doc = null;
      showHome();
    } finally {
      S.combiningAuto = false;
      S.opening = false;
    }
  }

  // ---------- Crear PDF en blanco ----------
  async function createBlankPdf() {
    if (!S.ready) { toast("PdfCraft todavía está iniciando"); return; }
    S.opening = true;
    showViewer();
    renderTop("Nuevo documento.pdf");
    busy(true, "Creando PDF en blanco…");
    try {
      if (!(await closeAll())) { busy(false); return; }
      showViewer();
      busy(true, "Creando PDF en blanco…");
      const before = new Set(((await pc.state()).documents || []).map((d) => d.doc));
      await pc.run("create.blank");
      let doc = null;
      for (let i = 0; i < 30; i++) {
        await sleep(150);
        const s = await pc.state();
        doc = (s.documents || []).find((d) => !before.has(d.doc));
        if (doc) break;
      }
      if (!doc) throw new Error("No se pudo crear el documento.");
      const name = "Documento " + new Date().toLocaleDateString("es", { day: "2-digit", month: "2-digit" }).replace("/", "-") + ".pdf";
      const meta = { id: newId(), nombre: name, tamano: 0, abierto: Date.now(), modificado: Date.now(), paginas: doc.pages };
      S.docs.set(doc.doc, { meta, name: doc.name });
      S.doc = { id: doc.doc, meta, name: doc.name, pages: doc.pages, page: 1, dirty: true, dirtySince: Date.now(), edited: true };
      await prepareDocument();
      const saved = await saveActive(doc.name).catch(() => null);
      if (saved) { meta.tamano = saved.size; await files.save(meta, new File([saved], name, { type: "application/pdf" })); }
      busy(false);
      renderTop();
      enterMode("comentar");
    } catch (e) {
      busy(false);
      toast(e.message || "No se pudo crear el PDF");
      S.doc = null;
      showHome();
    } finally {
      S.opening = false;
    }
  }

  // ---------- Abrir PDF desde Archivos / Recientes ----------
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
    try { await files.save(meta, file); }
    catch (e) { toast("No se pudo guardar una copia local; se abre igual."); }
    openDocument(meta, file, pendingTool);
    pendingTool = null;
  });

  async function openRecent(meta, tool) {
    const blob = await files.blob(meta.id);
    if (!blob) { toast("Ese archivo ya no está en la app."); await files.remove(meta.id); await reloadLibrary(); renderShell(); return; }
    meta.abierto = Date.now();
    files.putMeta(meta).catch(() => {});
    openDocument(meta, blob, tool || null);
  }

  // ---------- Visor ----------
  async function openDocument(meta, blob, tool) {
    if (!S.ready) { toast("PdfCraft todavía está iniciando"); return; }
    S.opening = true;
    S.navHistoryUsed = false;
    setImmersive(false);
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
        if (fresh && !fresh.active) { await pc.run("view.next_tab").catch(() => {}); continue; }
        doc = fresh;
        const pending = (s.pending_opens || []).length > 0;
        sawPending = sawPending || pending;
        const waitingUser = s.password_prompt || s.dialog;
        if (waitingUser) busy(false);
        if (!doc && !waitingUser && sawPending && !pending && Date.now() - started > 1500) throw new Error("El archivo no se pudo abrir. ¿Es un PDF válido?");
        if (!doc && !waitingUser && Date.now() - started > 45000) throw new Error("PdfCraft tardó demasiado en abrirlo.");
      }
      const resumePage = (meta.ultimaPagina && meta.ultimaPagina >= 1 && meta.ultimaPagina <= doc.pages) ? meta.ultimaPagina : 1;
      S.docs.set(doc.doc, { meta, name: doc.name });
      S.doc = { id: doc.doc, meta, name: doc.name, pages: doc.pages, page: resumePage, dirty: !!doc.dirty, dirtySince: 0, edited: false };
      if (meta.paginas !== doc.pages) { meta.paginas = doc.pages; files.putMeta(meta).catch(() => {}); }
      await prepareDocument(resumePage);
      busy(false);
      renderTop();
      renderBottom();
      syncWakeLock();
      if (tool && tool.mode) enterMode(tool.mode);
      else if (tool && tool.cmd) runCommand(tool.cmd, tool.t);
      clearTimeout(S.thumbTimer);
      if (!meta.miniatura) S.thumbTimer = setTimeout(() => thumbnail(meta), 1100);
    } catch (e) {
      busy(false);
      toast(e.message || "No se pudo abrir el archivo.", 5000);
      S.doc = null;
      showHome();
    } finally {
      S.opening = false;
    }
  }

  async function prepareDocument(targetPage) {
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
      const page = targetPage || (s.active ? s.active.page : 1);
      await fitWidth();
      await pc.set("page", String(page));
      const finalState = await pc.state();
      const actualPage = finalState.active ? finalState.active.page : page;
      if (S.doc) S.doc.page = actualPage;
      updateScrubber(actualPage, S.doc ? S.doc.pages : 1);
    } finally {
      S.preparing = false;
    }
  }

  function shield() {
    const el = $("pc-shield");
    el.hidden = false;
    el.style.opacity = "1";
    clearTimeout(shield.timer);
    shield.timer = setTimeout(() => { el.style.opacity = "0"; setTimeout(() => { el.hidden = true; }, 300); }, 3200);
  }

  async function fitWidth() {
    const s = await pc.state();
    const a = s.active;
    if (!a || a.organize || !a.pages_on_screen || !a.pages_on_screen.length) return;
    const vw = a.viewport[2] - a.viewport[0];
    const p = a.pages_on_screen[0].rect;
    const pw = p[2] - p[0];
    if (!(vw > 0 && pw > 0)) return;
    const margin = Math.max(5, vw * 0.02);
    const zoom = Math.max(5, Math.floor(((a.zoom_percent * (vw - 2 * margin)) / pw) * 10) / 10);
    await pc.set("zoom", String(zoom));
    S.fitZoom = zoom;
    await sleep(80);
    await recenter();
  }

  function scrollDoc(dx, dy) {
    const r = canvas.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const active = document.activeElement;
    if (active !== canvas && !(active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA") && canvas.parentNode.contains(active))) {
      canvas.focus({ preventScroll: true });
    }
    canvas.dispatchEvent(new MouseEvent("mousemove", { clientX: x, clientY: y, bubbles: true }));
    const n = Math.ceil(Math.hypot(dx, dy) / 7);
    for (let i = 0; i < n; i++) canvas.dispatchEvent(new WheelEvent("wheel", { clientX: x, clientY: y, deltaX: dx / n, deltaY: dy / n, deltaMode: 0, bubbles: true, cancelable: true }));
    setTimeout(() => canvas.dispatchEvent(new MouseEvent("mouseleave", { clientX: -1, clientY: -1 })), 260);
  }

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
        if (S.doc && s.active && !S.panel && S.fitZoom && Math.abs(s.active.zoom_percent - S.fitZoom) < 0.8) {
          await sleep(120);
          const page = s.active.page;
          await fitWidth();
          await pc.set("page", String(page));
        }
      } catch (e) {}
    }, 350);
  });

  async function closeAll() {
    clearTimeout(S.thumbTimer);
    if (S.panel) await closePanel();
    if (S.mode) await exitMode();
    if (S.searching) closeSearch();
    hideSelectionBar();
    hideAnnotBar();
    saveLastPage();
    for (let i = 0; i < 12; i++) {
      const s = await pc.state();
      const active = (s.documents || []).find((d) => d.active);
      if (!active) break;
      if (active.dirty) {
        try {
          await saveActive(active.name);
        } catch (e) {
          if (/cancelado/i.test(e.message)) return false;
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
    const doc = S.doc;
    const hadChanges = !!(doc && doc.dirty);
    const wasEdited = !!(doc && doc.edited);
    if (doc && wasEdited && doc.page === 1) await thumbnail(doc.meta);
    busy(true, hadChanges ? "Guardando…" : "Cerrando…");
    const ok = await closeAll();
    busy(false);
    if (!ok) return;
    if (hadChanges) toast("Cambios guardados en la app");
    showHome();
  }

  function showViewer() {
    body.classList.add("pc-in-viewer");
    renderBottom();
    syncWakeLock();
  }

  function updateNowIfIdle() {
    if (!window.pdfcraftUpdateReady || S.doc || S.desktop || body.classList.contains("pc-in-viewer")) return false;
    location.reload();
    return true;
  }
  window.pdfcraftOnUpdate = () => {
    if (!updateNowIfIdle()) toast("Hay una actualización lista: se aplicará al volver a Inicio.", 6000);
  };

  async function showHome() {
    body.classList.remove("pc-in-viewer", "pc-mode", "pc-searching", "pc-immersive", "pc-panel", "pc-organize");
    S.immersive = false;
    S.mode = null;
    S.panel = null;
    S.searching = false;
    S.selectedAnnot = null;
    syncWakeLock();
    if (updateNowIfIdle()) return;
    hideSelectionBar();
    hideAnnotBar();
    await reloadLibrary();
    renderShell();
  }

  function busy(on, text) {
    $("pc-busy").hidden = !on;
    if (text) $("pc-busy-text").textContent = text;
  }

  async function thumbnail(meta) {
    if (S.takingThumb) return;
    S.takingThumb = true;
    try {
      if (!S.doc || S.doc.meta !== meta || S.modal || S.panel || S.opening || !body.classList.contains("pc-in-viewer")) return;
      const s = await pc.state();
      const first = s.active && (s.active.pages_on_screen || []).find((p) => p.page === 1);
      if (!first || !s.window) return;
      const shot = await Promise.race([window.pdfcraft.screenshot({}), sleep(2500).then(() => null)]);
      const data = shot && (shot.data || shot.png || shot.image);
      if (!data) return;
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = "data:image/png;base64," + data; });
      const k = img.width / s.window.width;
      const [x0, y0, x1, y1] = first.rect;
      const top = Math.max(y0, s.active.viewport[1]);
      const w = (x1 - x0) * k;
      const hgt = Math.min(y1 - top, (x1 - x0) * 1.32) * k;
      if (w < 20 || hgt < 20) return;
      const out = document.createElement("canvas");
      out.width = 160;
      out.height = Math.round((160 * hgt) / w);
      out.getContext("2d").drawImage(img, x0 * k, top * k, w, hgt, 0, 0, out.width, out.height);
      meta.miniatura = out.toDataURL("image/jpeg", 0.72);
      await files.putMeta(meta);
    } catch (e) {} finally {
      S.takingThumb = false;
    }
  }

  // ---------- Barra superior del visor ----------
  function renderTop(name) {
    const top = $("pc-top");
    if (S.searching) {
      const input = h("input", {
        type: "search", placeholder: "Buscar en el documento", value: S.searchQuery || "",
        enterkeyhint: "search", autocomplete: "off", autocorrect: "off", autocapitalize: "off",
        spellcheck: "false", "aria-label": "Buscar en el documento",
      });
      const clearBtn = h("button", {
        class: "pc-clear-btn", type: "button", "aria-label": "Limpiar", icon: "close",
        hidden: !input.value,
        onclick: () => { input.value = ""; S.searchQuery = ""; clearBtn.hidden = true; S.findLabel = ""; renderBottom(); input.focus(); },
      });
      let timer = null;
      const find = () => {
        S.searchQuery = input.value;
        if (input.value.trim()) pc.set("find", input.value.trim()).catch(() => {});
      };
      input.addEventListener("input", () => { clearBtn.hidden = !input.value; clearTimeout(timer); timer = setTimeout(find, 320); });
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); clearTimeout(timer); input.blur(); find(); } });
      top.replaceChildren(
        h("label", { class: "pc-search" }, h("span", { icon: "search" }), input, clearBtn),
        h("button", { class: "pc-text-btn", type: "button", text: "Cancelar", onclick: () => closeSearch() }));
      return input;
    }
    if (S.panel) {
      const PANEL_TITLES = {
        bookmarks: "Índice del PDF",
        comments: "Lista de comentarios",
        layers: "Capas",
        attachments: "Adjuntos",
        signatures: "Firmas digitales",
        fields: "Campos de formulario",
      };
      top.replaceChildren(
        h("div", { class: "pc-title", style: "padding-left:10px" },
          h("b", { text: PANEL_TITLES[S.panel] || "Panel" }),
          h("small", { text: S.doc ? S.doc.meta.nombre : "" })),
        h("button", { class: "pc-text-btn", type: "button", text: "Listo", onclick: () => closePanel() }));
      return null;
    }
    if (S.mode) {
      const m = MODES[S.mode];
      let ayuda = m.ayuda || "";
      if (S.mode === "organizar") {
        ayuda = S.orgSelCount > 0 ? (S.orgSelCount + (S.orgSelCount === 1 ? " página elegida" : " páginas elegidas")) : "Toca para elegir · mantén para mover";
      }
      top.replaceChildren(...[
        h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Deshacer", icon: "undo", onclick: () => runCommand("edit.undo", "Deshacer") }),
        h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Rehacer", icon: "redo", onclick: () => runCommand("edit.redo", "Rehacer") }),
        h("div", { class: "pc-title pc-center" }, h("b", { text: m.titulo }), ayuda ? h("small", { text: ayuda }) : null),
        S.mode === "organizar"
          ? h("button", {
              class: "pc-text-btn", type: "button", style: "font-size:14px;padding:0 6px",
              text: S.orgSelCount ? "Ninguna" : "Todas",
              onclick: () => pc.set("select", S.orgSelCount ? "" : ("1-" + (S.doc ? S.doc.pages : 1))).catch(() => {}),
            })
          : null,
        h("button", { class: "pc-text-btn", type: "button", text: "Listo", onclick: () => exitMode() }),
      ].filter(Boolean));
      return null;
    }

    const title = S.doc ? S.doc.meta.nombre : name || "";
    const info = S.doc
      ? ("Pág. " + (S.doc.page || 1) + " de " + S.doc.pages + (S.doc.dirty ? " · editado" : ""))
      : "";
    top.replaceChildren(
      h("button", { class: "pc-icon-btn pc-accent", type: "button", "aria-label": "Volver a Inicio", icon: "back", onclick: goHome }),
      h("button", { class: "pc-title", type: "button", onclick: () => { if (S.doc) renameSheet(S.doc.meta); } },
        h("b", { text: title }),
        h("small", { text: info })),
      h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Ajustes de vista", icon: "viewOpts", disabled: !S.doc, onclick: viewSettingsSheet }),
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

  // ---------- Búsqueda ----------
  function openSearch() {
    if (!S.doc) return;
    setImmersive(false);
    if (S.mode) exitMode();
    if (S.panel) closePanel();
    hideSelectionBar();
    hideAnnotBar();
    S.searching = true;
    S.searchOpenedAt = Date.now();
    body.classList.add("pc-searching");
    const input = renderTop();
    renderBottom();
    if (input) input.focus();
  }
  function closeSearch(sendEscape) {
    S.searching = false;
    S.findBottom = 0;
    S.findLabel = "";
    S.searchQuery = "";
    body.classList.remove("pc-searching");
    if (sendEscape !== false && S.last && S.last.active && S.last.active.find_open) pc.key("Escape").catch(() => {});
    renderTop();
    renderBottom();
    if (S.doc) updateScrubber(S.doc.page, S.doc.pages);
  }

  async function readFind() {
    const found = await pc.inspect({});
    const ws = found.widgets || [];
    const input = ws.find((w) => w.role === "TextInput" && /buscar|find/i.test(String(w.label || ""))) ||
      ws.find((w) => w.role === "TextInput" && w.rect && w.rect[1] > 28 && w.rect[1] < 240);
    if (!input) return;
    const cy = (input.rect[1] + input.rect[3]) / 2;
    const row = ws.filter((w) => w.rect && w.rect.length === 4 && Math.abs((w.rect[1] + w.rect[3]) / 2 - cy) < 24);
    S.findBottom = Math.max(...row.map((w) => w.rect[3]));
    const btns = row.filter((w) => w.role === "Button").sort((a, b) => a.rect[0] - b.rect[0]);
    S.findPrev = btns.find((b) => /anterior|prev/i.test(String(b.label || ""))) || btns[0] || null;
    S.findNext = btns.find((b) => /siguiente|next/i.test(String(b.label || ""))) || btns[1] || null;
    const label = row.find((w) => w.role === "Label");
    const text = label ? String(label.value || label.label || "") : "";
    if (text !== S.findLabel) { S.findLabel = text; renderBottom(); }
  }

  async function findStep(forward) {
    const b = forward ? S.findNext : S.findPrev;
    if (!b) return;
    try {
      await pc.click({ x: (b.rect[0] + b.rect[2]) / 2, y: (b.rect[1] + b.rect[3]) / 2 });
      await sleep(140);
      await readFind();
    } catch (e) {}
  }

  // ---------- Paneles nativos de PdfCraft (Índice, Comentarios, Capas, Adjuntos, Firmas) ----------
  async function openPanel(panelName) {
    if (!S.doc) return;
    setImmersive(false);
    if (S.mode) await exitMode();
    if (S.searching) closeSearch();
    hideSelectionBar();
    hideAnnotBar();
    S.panel = panelName;
    body.classList.add("pc-panel");
    renderTop();
    updateScrubber(S.doc.page, S.doc.pages);
    try {
      const s = await pc.state();
      if (allHidden(s.hidden_interface)) await pc.run("view.toggle_interface");
      await pc.set("mode", "read").catch(() => {});
      await pc.set("left", "closed").catch(() => {});
      await pc.set("panel", panelName);
      await applyScale();
      await sleep(120);
      layoutCanvas(await pc.state());
    } catch (e) {
      toast("No se pudo abrir el panel: " + e.message);
      closePanel();
    }
  }

  async function closePanel() {
    if (!S.panel) return;
    S.panel = null;
    body.classList.remove("pc-panel");
    renderTop();
    renderBottom();
    try {
      await pc.set("panel", "none").catch(() => {});
      await pc.set("mode", "all").catch(() => {});
      const s = await pc.state();
      if (s.active && !allHidden(s.hidden_interface)) {
        await pc.run("view.toggle_interface");
        shield();
      }
      await applyScale();
      await sleep(120);
      layoutCanvas(await pc.state());
      await fitWidth();
      if (S.doc) updateScrubber(S.doc.page, S.doc.pages);
    } catch (e) {}
  }

  // ---------- Marcadores (Mis marcadores + Índice del PDF) ----------
  function bookmarksSheet() {
    if (!S.doc) return;
    const meta = S.doc.meta;
    meta.marcadores = meta.marcadores || [];
    const curPage = S.doc.page || 1;
    const listWrap = h("div");

    const draw = (close) => {
      const bms = (meta.marcadores || []).slice().sort((a, b) => a.pagina - b.pagina);
      if (!bms.length) {
        listWrap.replaceChildren(h("div", { class: "pc-empty", style: "padding:20px;margin-bottom:12px" },
          h("div", { icon: "bookmark" }),
          h("div", { text: "Aún no tienes marcadores guardados en este documento." })));
      } else {
        listWrap.replaceChildren(h("div", { class: "pc-list" }, bms.map((bm, i) => h("div", { class: "pc-bm-item" },
          h("button", { class: "pc-bm-go", type: "button", onclick: () => {
            S.navHistoryUsed = true;
            pc.set("page", String(bm.pagina)).catch(() => {});
            close();
          } },
            h("span", { class: "pc-bm-page", text: "P. " + bm.pagina }),
            h("span", { class: "pc-bm-title", text: bm.titulo })),
          h("button", { class: "pc-recent-more", type: "button", "aria-label": "Eliminar marcador", icon: "trash", onclick: async () => {
            meta.marcadores = meta.marcadores.filter((x) => x !== bm);
            await files.putMeta(meta).catch(() => {});
            draw(close);
          } })))));
      }
    };

    const close = sheet({
      title: "Marcadores e índice",
      build: (c) => {
        const addBtn = h("button", {
          class: "pc-primary", style: "margin-bottom:12px", type: "button", icon: "bookmarkPlus",
          text: "Marcar página actual (Pág. " + curPage + ")",
          onclick: () => {
            c();
            const inp = h("input", { class: "pc-field", type: "text", value: "Página " + curPage, placeholder: "Título del marcador" });
            sheet({
              title: "Nuevo marcador",
              build: (c2) => {
                const save = async () => {
                  meta.marcadores = meta.marcadores || [];
                  meta.marcadores.push({ pagina: curPage, titulo: inp.value.trim() || ("Página " + curPage) });
                  await files.putMeta(meta).catch(() => {});
                  c2();
                  toast("Marcador guardado (Pág. " + curPage + ")");
                };
                inp.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
                return [inp, h("button", { class: "pc-primary", type: "button", text: "Guardar marcador", onclick: save })];
              },
            });
            inp.focus();
            inp.select();
          },
        });
        return [
          addBtn,
          list([
            { i: "listView", t: "Ver índice / tabla de contenidos del PDF", small: "Capítulos", run: () => { c(); openPanel("bookmarks"); } },
          ]),
          h("div", { class: "pc-label", text: "Mis marcadores" }),
          listWrap,
        ];
      },
    });
    draw(close);
  }

  // ---------- Modos de herramientas ----------
  const MODES = {
    comentar: {
      titulo: "Comentar",
      herramientas: [
        { q: "highlight", t: "Resaltar", i: "highlight" },
        { q: "freehand_highlight", t: "Libre", i: "highlight" },
        { q: "underline", t: "Subrayar", i: "underline" },
        { q: "strikeout", t: "Tachar", i: "strike" },
        { q: "squiggly", t: "Ondulado", i: "squiggly" },
        { q: "note", t: "Nota", i: "note" },
        { q: "freetext", t: "Texto", i: "text" },
        { q: "ink", t: "Dibujar", i: "draw" },
        { q: "arrow", t: "Flecha", i: "arrow" },
        { q: "line", t: "Línea", i: "line" },
        { q: "square", t: "Cuadro", i: "square" },
        { q: "circle", t: "Óvalo", i: "circle" },
        { q: "eraser", t: "Borrador", i: "eraser" },
        { panel: "comments", t: "Lista", i: "comment" },
        { c: "comment.hide_all", t: "Ocultar", i: "eyeOff" },
        { c: "comment.flatten", t: "Aplanar", i: "layers" },
      ],
    },
    firmar: {
      titulo: "Rellenar y firmar",
      ayuda: "Toca un campo o elige firma/texto",
      herramientas: [
        { q: "fill-signature", c: "sign.fill.signature", t: "Firma", i: "sign" },
        { q: "fill-initials", c: "sign.fill.initials", t: "Iniciales", i: "initials" },
        { q: "fill-text", t: "Texto", i: "text" },
        { q: "fill-date", t: "Fecha", i: "date" },
        { q: "fill-check", t: "Marca", i: "check" },
        { q: "fill-cross", t: "Cruz", i: "cross" },
        { q: "fill-dot", t: "Punto", i: "dot" },
        { q: "fill-line", t: "Línea", i: "minus" },
        { c: "sign.fill.signature.change", t: "Editar firma", i: "pencil" },
        { c: "sign.fill.initials.change", t: "Edit. inic.", i: "rename" },
        { c: "form.clear", t: "Limpiar", i: "eraser" },
      ],
    },
    editar: {
      titulo: "Editar PDF",
      herramientas: [
        { q: "edit-text", t: "Editar texto", i: "editText" },
        { q: "add-text", t: "Añadir texto", i: "addText" },
        { c: "edit.image", t: "Imagen", i: "image" },
        { q: "link", t: "Enlace", i: "link" },
        { q: "crop", t: "Recortar", i: "crop" },
        { c: "edit.replace", t: "Reemplazar", i: "search" },
        { c: "edit.watermark", t: "Marca agua", i: "watermark" },
        { c: "edit.header_footer", t: "Encab./Pie", i: "page" },
      ],
    },
    organizar: {
      titulo: "Organizar páginas",
      ayuda: "Toca para elegir · mantén para mover",
      entrar: () => pc.set("organize", "on"),
      salir: () => pc.set("organize", "off"),
      herramientas: [
        { c: "page.rotate_ccw", t: "Girar izq.", i: "rotateCcw" },
        { c: "page.rotate", t: "Girar der.", i: "rotate" },
        { c: "page.delete", t: "Eliminar", i: "trash" },
        { fn: () => insertPageSheet(), t: "Insertar", i: "plus" },
        { c: "page.extract", t: "Extraer", i: "extract" },
        { c: "page.split", t: "Dividir", i: "split" },
        { c: "page.boxes", t: "Recortar", i: "crop" },
        { c: "page.reverse", t: "Invertir", i: "reverse" },
      ],
    },
    censurar: {
      titulo: "Censurar PDF",
      ayuda: "Marca zonas o texto y luego pulsa Aplicar",
      herramientas: [
        { q: "redact", t: "Marcar", i: "redact" },
        { c: "redact.search", t: "Buscar", i: "search" },
        { c: "redact.pages", t: "Páginas", i: "page" },
        { c: "redact.apply", t: "Aplicar", i: "check" },
        { c: "redact.clear", t: "Quitar", i: "eraser" },
        { c: "redact.sanitize", t: "Sanear", i: "lock" },
      ],
    },
  };

  function insertPageSheet() {
    sheet({
      title: "Insertar páginas",
      build: (close) => [list([
        { i: "blank", t: "Insertar página en blanco", run: () => { close(); runCommand("page.insert_blank", "Insertar en blanco"); } },
        { i: "copy", t: "Duplicar páginas elegidas", run: () => { close(); runCommand("page.duplicate", "Duplicar"); } },
        { i: "open", t: "Insertar páginas desde otro PDF…", run: () => { close(); runCommand("page.insert", "Insertar PDF"); } },
      ])],
    });
  }

  async function enterMode(name) {
    const m = MODES[name];
    if (!m || !S.doc) return;
    setImmersive(false);
    if (S.panel) await closePanel();
    if (S.mode) await exitMode();
    if (S.searching) closeSearch();
    hideSelectionBar();
    hideAnnotBar();
    S.mode = name;
    S.modeEnteredAt = Date.now();
    S.tool = null;
    S.orgSelCount = 0;
    body.classList.add("pc-mode");
    body.classList.toggle("pc-organize", name === "organizar");
    renderTop();
    renderBottom();
    updateScrubber(S.doc.page, S.doc.pages);
    try {
      await applyScale();
      if (m.entrar) await m.entrar();
    } catch (e) { toast(e.message); }
  }

  async function exitMode() {
    const m = MODES[S.mode];
    S.mode = null;
    S.tool = null;
    S.orgSelCount = 0;
    body.classList.remove("pc-mode", "pc-organize");
    renderTop();
    renderBottom();
    try {
      if (m && m.salir) await m.salir();
      await pc.set("quick", BASE_TOOL);
      await applyScale();
      if (S.doc) updateScrubber(S.doc.page, S.doc.pages);
    } catch (e) {}
  }

  // ---------- Barra inferior del visor (Acrobat Nav o Barra del modo activo) ----------
  function renderBottom() {
    const nav = $("pc-viewer-nav");
    const bar = $("pc-toolbar");
    if (S.searching) {
      nav.hidden = true;
      bar.hidden = false;
      bar.replaceChildren(h("div", { class: "pc-find-row", role: "toolbar", "aria-label": "Resultados de la búsqueda" },
        h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Resultado anterior", icon: "up", onclick: () => findStep(false) }),
        h("span", { class: "pc-find-count", role: "status", "aria-live": "polite", text: S.findLabel || (S.searchQuery ? "Buscando…" : "Escribe para buscar") }),
        h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Resultado siguiente", icon: "down", onclick: () => findStep(true) })));
      return;
    }
    const m = S.mode && MODES[S.mode];
    if (m) {
      nav.hidden = true;
      bar.hidden = false;
      bar.replaceChildren(h("div", { class: "pc-tools-row", role: "toolbar", "aria-label": m.titulo },
        m.herramientas.map((tool) => h("button", {
          class: "pc-tb", type: "button", icon: tool.i,
          "aria-pressed": tool.q ? String(S.tool === tool.q) : null,
          onclick: () => useTool(tool),
        }, h("span", { text: tool.t })))));
      return;
    }
    // Barra principal del visor estilo Adobe Acrobat iPhone
    bar.hidden = true;
    bar.replaceChildren();
    nav.hidden = false;
    const actions = [
      { t: "Páginas", i: "organize", run: () => enterMode("organizar") },
      { t: "Marcadores", i: "bookmark", run: () => bookmarksSheet() },
      { t: "Comentar", i: "comment", run: () => enterMode("comentar") },
      { t: "Firmar", i: "sign", run: () => enterMode("firmar") },
      { t: "Herramientas", i: "tools", accent: true, run: () => viewerToolsSheet() },
    ];
    nav.replaceChildren(...actions.map((a) => h("button", {
      class: "pc-vnav-btn" + (a.accent ? " pc-accent" : ""), type: "button", icon: a.i,
      disabled: !S.doc, onclick: a.run,
    }, h("span", { text: a.t }))));
  }

  async function useTool(tool) {
    if (tool.fn) { tool.fn(); return; }
    if (tool.panel) { openPanel(tool.panel); return; }
    // Firma e Iniciales usan el comando oficial (abre automáticamente el panel de firma si no existe aún)
    if (tool.q && tool.c) {
      const next = S.tool === tool.q ? null : tool.q;
      S.tool = next;
      S.toolSetAt = Date.now();
      renderBottom();
      try {
        if (next) await pc.run(tool.c);
        else await pc.set("quick", BASE_TOOL);
      } catch (e) {
        toast("No se pudo usar " + tool.t + ": " + e.message, 4000);
        S.tool = null;
        renderBottom();
      }
      return;
    }
    if (tool.c) { runCommand(tool.c, tool.t); return; }
    const next = S.tool === tool.q ? null : tool.q;
    S.tool = next;
    S.toolSetAt = Date.now();
    renderBottom();
    try {
      await pc.set("quick", next || BASE_TOOL);
    } catch (e) {
      toast("No se pudo usar " + tool.t + ": " + e.message, 4000);
      S.tool = null;
      renderBottom();
    }
  }

  async function runCommand(id, label) {
    try {
      await pc.run(id);
    } catch (e) {
      const msg = String(e.message || e);
      if (/disabled|not enabled|no selection|unavailable/i.test(msg)) {
        toast(S.mode === "organizar" ? "Primero toca una página para elegirla." : (label || "Esa acción") + " no está disponible ahora.");
      } else {
        toast("No se pudo: " + msg, 4000);
      }
    }
  }

  // ---------- Menús flotantes de texto y anotaciones ----------
  let selBar = null;
  function hideSelectionBar() { if (selBar) { selBar.remove(); selBar = null; } }
  function showSelectionBar() {
    hideSelectionBar();
    hideAnnotBar();
    const mark = (cmd, label) => { hideSelectionBar(); runCommand(cmd, label); };
    selBar = h("div", { class: "pc-selbar", role: "toolbar", "aria-label": "Texto seleccionado" },
      h("button", { type: "button", icon: "copy", onclick: copySelection }, h("span", { text: "Copiar" })),
      h("button", { type: "button", icon: "highlight", onclick: () => mark("comment.highlight", "Resaltar") }, h("span", { text: "Resaltar" })),
      h("button", { type: "button", icon: "underline", onclick: () => mark("comment.underline", "Subrayar") }, h("span", { text: "Subrayar" })),
      h("button", { type: "button", icon: "strike", onclick: () => mark("comment.strikeout", "Tachar") }, h("span", { text: "Tachar" })),
      h("button", { type: "button", icon: "note", onclick: () => mark("comment.note", "Nota") }, h("span", { text: "Nota" })));
    $("pc-doc").append(selBar);
  }

  let annotBar = null;
  function hideAnnotBar() { if (annotBar) { annotBar.remove(); annotBar = null; } }
  function showAnnotBar() {
    hideAnnotBar();
    hideSelectionBar();
    annotBar = h("div", { class: "pc-selbar", role: "toolbar", "aria-label": "Anotación seleccionada" },
      h("button", { type: "button", icon: "sliders", onclick: () => { hideAnnotBar(); pc.set("dialog", "comment-props").catch(() => {}); } }, h("span", { text: "Estilo y color" })),
      h("button", { type: "button", icon: "copy", onclick: () => { hideAnnotBar(); runCommand("comment.copy", "Copiar"); toast("Anotación copiada"); } }, h("span", { text: "Copiar" })),
      h("button", { class: "pc-danger", type: "button", icon: "trash", onclick: () => { hideAnnotBar(); pc.key("Delete").catch(() => {}); } }, h("span", { text: "Eliminar" })));
    $("pc-doc").append(annotBar);
  }

  // Portapapeles compatible con Safari iOS
  let copyWanted = false;
  const clip = navigator.clipboard;
  const writeText = clip && clip.writeText ? clip.writeText.bind(clip) : null;
  if (writeText) {
    clip.writeText = (text) => writeText(text).then(
      () => { if (copyWanted) { copyWanted = false; toast("Copiado al portapapeles"); } },
      (err) => {
        if (copyWanted) {
          copyWanted = false;
          sheet({
            title: "Copiar texto",
            text: text.length > 180 ? text.slice(0, 180) + "…" : text,
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
    } catch (e) {}
    document.removeEventListener("copy", seen, true);
    if (!fired) pc.run("edit.copy").catch(() => { copyWanted = false; });
    setTimeout(() => { copyWanted = false; }, 4000);
  }

  // ---------- Hojas del visor (Herramientas, Ajustes de vista, Ir a página, Más opciones) ----------
  function viewerToolsSheet() {
    if (!S.doc) return;
    hideSelectionBar();
    const docTools = ALL_TOOLS.filter((t) => !t.action || t.action === "combine");
    sheet({
      title: "Herramientas",
      build: (close) => [
        h("div", { class: "pc-mode-grid" }, docTools.slice(0, 12).map((tool) => {
          const tile = h("span", { class: "pc-tile", icon: tool.i });
          tile.style.background = tool.c;
          return h("button", {
            class: "pc-tool", type: "button",
            onclick: () => {
              close();
              if (tool.mode) enterMode(tool.mode);
              else if (tool.action === "combine") openCombineSheet(S.doc.meta);
              else if (tool.cmd) runCommand(tool.cmd, tool.t);
              else if (tool.desktop) setDesktop(true);
            },
          }, tile, h("span", { text: tool.t }));
        })),
        list(docTools.slice(12).map((tool) => ({
          i: tool.i, t: tool.t, small: tool.d,
          run: () => {
            close();
            if (tool.mode) enterMode(tool.mode);
            else if (tool.cmd) runCommand(tool.cmd, tool.t);
            else if (tool.desktop) setDesktop(true);
          },
        }))),
      ],
    });
  }

  function viewSettingsSheet() {
    if (!S.doc) return;
    hideSelectionBar();
    const a = S.last && S.last.active;
    const isTwoUp = a && /two/i.test(String(a.layout || ""));
    const isSingle = a && !isTwoUp && a.continuous === false;
    const isCont = !isTwoUp && !isSingle;
    let layoutMode = isTwoUp ? "two" : isSingle ? "single" : "continuous";
    let pageGaps = !a || a.page_gaps !== false;
    let hlFields = true;

    const layoutWrap = h("div", { class: "pc-view-cards" });
    const drawLayout = () => {
      const cards = [
        ["continuous", "Continuo", "layout"],
        ["single", "Página única", "single"],
        ["two", "Dos páginas", "twoPage"],
      ];
      layoutWrap.replaceChildren(...cards.map(([id, label, ic]) => h("button", {
        class: "pc-view-card", type: "button", "aria-pressed": String(layoutMode === id), icon: ic,
        onclick: async () => {
          layoutMode = id;
          drawLayout();
          const token = id === "two" ? "two-page" : id === "single" ? "single" : "continuous";
          await pc.set("layout", token).catch(() => {});
          await sleep(140);
          await fitWidth().catch(() => {});
        },
      }, h("span", { text: label }))));
    };
    drawLayout();

    const readWrap = h("div", { class: "pc-view-cards" });
    const drawRead = () => {
      const modes = [
        ["normal", "Normal", "#ffffff"],
        ["noche", "Modo noche", "#1c1c1e"],
        ["sepia", "Sepia", "#efe3c8"],
      ];
      readWrap.replaceChildren(...modes.map(([id, label, bg]) => {
        const dot = h("span", { class: "pc-swatch-dot" });
        dot.style.background = bg;
        return h("button", {
          class: "pc-view-card", type: "button", "aria-pressed": String(prefs.lectura === id),
          onclick: () => { prefs.lectura = id; savePrefs(); applyReadingVisuals(); drawRead(); },
        }, dot, h("span", { text: label }));
      }));
    };
    drawRead();

    const makeToggle = (label, get, onToggle) => {
      const sw = h("button", { class: "pc-switch", type: "button", role: "switch", "aria-checked": String(get()), "aria-label": label });
      sw.addEventListener("click", () => { onToggle(!get()); sw.setAttribute("aria-checked", String(get())); });
      return h("div", { class: "pc-toggle-row" }, h("span", { text: label }), sw);
    };

    const dimSlider = h("input", { type: "range", min: "45", max: "100", value: String(prefs.brillo || 100), "aria-label": "Brillo de lectura" });
    dimSlider.addEventListener("input", () => {
      prefs.brillo = parseInt(dimSlider.value, 10) || 100;
      savePrefs();
      applyReadingVisuals();
    });

    sheet({
      title: "Ajustes de vista",
      build: (close) => [
        h("div", { class: "pc-label", text: "Disposición de páginas" }),
        layoutWrap,
        h("div", { class: "pc-label", text: "Modo de lectura" }),
        readWrap,
        h("div", { class: "pc-label", text: "Brillo de lectura" }),
        h("div", { class: "pc-list" },
          h("div", { class: "pc-slider-row" }, h("span", { icon: "sun", style: "opacity:.45" }), dimSlider, h("span", { icon: "sun" }))),
        h("div", { class: "pc-label", text: "Zoom y rotación" }),
        h("div", { class: "pc-btn-row" },
          h("button", { class: "pc-secondary", type: "button", text: "Ancho", onclick: () => { close(); fitWidth().catch(() => {}); } }),
          h("button", { class: "pc-secondary", type: "button", text: "Página", onclick: () => { close(); pc.run("view.fit_one_page").catch(() => {}); } }),
          h("button", { class: "pc-secondary", type: "button", text: "100 %", onclick: () => { close(); pc.set("zoom", "100").catch(() => {}); } }),
          h("button", { class: "pc-secondary", type: "button", icon: "rotate", "aria-label": "Rotar vista", onclick: () => { pc.run("view.rotate.cw").catch(() => {}); } })),
        h("div", { class: "pc-list" },
          makeToggle("Mantener pantalla encendida", () => !!prefs.pantallaActiva, (v) => { prefs.pantallaActiva = v; savePrefs(); syncWakeLock(); }),
          makeToggle("Espacio entre páginas", () => pageGaps, (v) => { pageGaps = v; pc.set("page-gaps", v ? "on" : "off").catch(() => {}); }),
          makeToggle("Resaltar campos rellenables", () => hlFields, (v) => { hlFields = v; pc.set("fields", v ? "on" : "off").catch(() => {}); })),
      ],
    });
  }

  function goToPageSheet() {
    if (!S.doc) return;
    const input = h("input", {
      class: "pc-field", type: "number", inputmode: "numeric",
      min: "1", max: String(S.doc.pages), placeholder: "1 – " + S.doc.pages, "aria-label": "Número de página",
    });
    sheet({
      title: "Ir a la página",
      build: (close) => {
        const go = () => {
          const n = Math.max(1, Math.min(S.doc.pages, parseInt(input.value, 10) || 0));
          if (n) { S.navHistoryUsed = true; pc.set("page", String(n)).catch(() => {}); }
          close();
        };
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
        return [input, h("button", { class: "pc-primary", type: "button", text: "Ir", onclick: go })];
      },
    });
    input.focus();
  }

  function moreMenu() {
    if (!S.doc) return;
    hideSelectionBar();
    const meta = S.doc.meta;
    sheet({
      title: meta.nombre,
      text: "Página " + (S.doc.page || 1) + " de " + S.doc.pages,
      build: (close) => [
        list([
          { i: "star", t: meta.destacado ? "Quitar de destacados" : "Destacar documento", run: () => { close(); toggleStar(meta); toast(meta.destacado ? "Añadido a Destacados" : "Quitado de Destacados"); } },
          { i: "share", t: "Compartir o guardar en Archivos", run: () => { close(); shareCurrent(); } },
          { i: "print", t: "Imprimir (AirPrint)", run: () => { close(); runCommand("print.dialog", "Imprimir"); } },
          { i: "page", t: "Ir a la página…", run: () => { close(); goToPageSheet(); } },
        ]),
        list([
          { i: "compress", t: "Comprimir PDF", run: () => { close(); runCommand("optimize.reduce", "Comprimir PDF"); } },
          { i: "lock", t: "Proteger con contraseña", run: () => { close(); runCommand("protect.password", "Proteger"); } },
          { i: "word", t: "Exportar a Word (.docx)", run: () => { close(); runCommand("export.docx", "Exportar a Word"); } },
          { i: "image", t: "Exportar como imagen", run: () => { close(); runCommand("export.image", "Exportar imagen"); } },
          { i: "ocr", t: "Reconocer texto (OCR)", run: () => { close(); runCommand("ocr.recognize", "OCR"); } },
          { i: "combine", t: "Combinar con otros PDF…", run: () => { close(); openCombineSheet(meta); } },
        ]),
        list([
          { i: "comment", t: "Lista de comentarios", run: () => { close(); openPanel("comments"); } },
          { i: "layers", t: "Capas del PDF", run: () => { close(); openPanel("layers"); } },
          { i: "clip", t: "Archivos adjuntos", run: () => { close(); openPanel("attachments"); } },
          { i: "sign", t: "Firmas digitales", run: () => { close(); openPanel("signatures"); } },
        ]),
        list([
          { i: "info", t: "Propiedades del documento", run: () => { close(); runCommand("file.properties", "Propiedades"); } },
          { i: "text", t: "Contar palabras", run: () => { close(); runCommand("file.word_count", "Contar palabras"); } },
          { i: "desktop", t: "Interfaz completa (PC)", small: "Todas las herramientas", run: () => { close(); setDesktop(true); } },
        ]),
      ],
    });
  }

  function settingsSheet() {
    const nameInput = h("input", {
      class: "pc-field", type: "text", value: prefs.nombre,
      placeholder: "Tu nombre", autocomplete: "name", "aria-label": "Tu nombre para comentarios y firmas",
    });
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
        h("div", { class: "pc-label", text: "Apariencia de la app" }),
        seg("tema", [["auto", "Sistema"], ["claro", "Claro"], ["oscuro", "Oscuro"]], (v) => {
          applyThemeAttr();
          if (S.ready) pc.run(v === "auto" ? "view.theme.system" : v === "oscuro" ? "view.theme.dark" : "view.theme.light").catch(() => {});
        }),
        h("div", { class: "pc-label", text: "Modo de lectura predeterminado" }),
        seg("lectura", [["normal", "Normal"], ["noche", "Noche"], ["sepia", "Sepia"]], () => applyReadingVisuals()),
        h("div", { class: "pc-label", text: "Tamaño de diálogos de PdfCraft" }),
        seg("tamano", [["pequeno", "Pequeño"], ["mediano", "Mediano"], ["grande", "Grande"]], () => applyScale().catch(() => {})),
        h("div", { class: "pc-label", text: "Tu nombre (comentarios y firmas)" }),
        nameInput,
        list([
          { i: "sign", t: "Editar mi firma guardada", run: () => { close(); runCommand("sign.fill.signature.change", "Firma"); } },
          { i: "refresh", t: "Buscar actualizaciones", run: () => { close(); if (window.pdfcraftCheckUpdate) window.pdfcraftCheckUpdate(); } },
          { i: "desktop", t: "Interfaz completa (PC)", small: "Modo escritorio", run: () => { close(); setDesktop(true); } },
        ]),
        h("p", {
          text: "PdfCraft para iPhone · Motor de código abierto (github.com/storytold/pdfcraft). Tus documentos nunca salen de tu teléfono." +
            (S.appVersion ? " Motor " + S.appVersion + "." : ""),
        }),
      ],
    });
  }

  // ---------- Modo escritorio completo ----------
  let backButton = null;
  async function setDesktop(on) {
    if (!S.ready) return;
    if (on && S.panel) await closePanel();
    if (on && S.mode) await exitMode();
    if (on && S.searching) closeSearch();
    setImmersive(false);
    hideSelectionBar();
    hideAnnotBar();
    S.desktop = on;
    body.classList.toggle("pc-desktop", on);
    if (on) {
      showViewer();
      backButton = backButton || h("button", { class: "pc-back-mobile", type: "button", text: "Volver a vista móvil", onclick: () => setDesktop(false) });
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
          renderBottom();
        }
      }
    } catch (e) {}
  }

  // ---------- Hojas modales (iOS Bottom Sheets) ----------
  function sheet({ title, text, build, onClose }) {
    const wrap = h("div", { class: "pc-sheet-wrap", role: "dialog", "aria-modal": "true", "aria-label": title });
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      wrap.remove();
      document.removeEventListener("keydown", onKey);
      if (onClose) onClose();
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    const panel = h("div", { class: "pc-sheet" },
      h("div", { class: "pc-grabber" }),
      h("h3", {}, h("span", { text: title }), h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Cerrar", icon: "close", onclick: close })),
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

  // Exposición mínima para pruebas automatizadas
  window.pdfcraftMobile = {
    switchTab,
    openScannerSheet,
    openCombineSheet,
    viewSettingsSheet,
    bookmarksSheet,
    viewerToolsSheet,
    moreMenu,
    settingsSheet,
    enterMode,
    exitMode,
    openPanel,
    closePanel,
    openSearch,
    closeSearch,
    goHome,
    state: () => S,
  };
})();
