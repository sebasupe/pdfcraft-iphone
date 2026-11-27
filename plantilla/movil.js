// PdfCraft para iPhone v3: interfaz móvil fiel a Adobe Acrobat iOS 2026 (sin marcas ajenas ni paywalls)
// con lector ultrarrápido PDF.js (selección multipágina nativa + Modo Líquido + Leer en voz alta),
// Organizar páginas / Combinar nativos con pdf-lib, y motor completo PdfCraft WASM para edición avanzada.
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const toast = (text, ms) => (window.pdfcraftToast ? window.pdfcraftToast(text, ms) : console.log(text));
  const canvas = $("pdfcraft");
  const body = document.body;

  // ---------- Iconos vectoriales nítidos ----------
  const ICONS = {
    home: "M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6.5h-5V21H4a1 1 0 0 1-1-1z",
    spaces: "M4 12h16v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M4 12l2-5h10l2 5 M17 4l.8 1.8L19.6 6.6l-1.8.8L17 9.2l-.8-1.8-1.8-.8 1.8-.8z",
    folder: "M3 6a2 2 0 0 1 2-2h4.2l2 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    folderPlus: "M3 6a2 2 0 0 1 2-2h4.2l2 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M12 10.5v5 M9.5 13h5",
    tools: "M4 4h6.5v6.5H4z M13.5 4H20v6.5h-6.5z M4 13.5h6.5V20H4z M13.5 13.5H20V20h-6.5z",
    open: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M12 11v7 M8.5 14.5h7",
    file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5",
    fileLines: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M8.5 13h7 M8.5 16.5h5",
    blank: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5",
    settings: "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M12 2.8v2.6 M12 18.6v2.6 M4 7.4l2.3 1.3 M17.7 15.3l2.3 1.3 M4 16.6l2.3-1.3 M17.7 8.7L20 7.4",
    back: "M15 5l-7 7 7 7",
    chevRight: "M9 6l6 6-6 6",
    chevDown: "M6 9l6 6 6-6",
    search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M20 20l-4.8-4.8",
    share: "M12 3v12 M8 7l4-4 4 4 M7 10H5.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H17",
    more: "M5.5 12h.01 M12 12h.01 M18.5 12h.01",
    star: "M12 3.2l2.6 5.3 5.9.8-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z",
    glasses: "M2 13a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0z M15 13a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0z M9 13h6",
    liquid: "M12 2.8C9 7.2 6 10.6 6 14.2a6 6 0 0 0 12 0c0-3.6-3-7-6-11.4z M12 9h4 M12 12.5h4.5 M12 16h3.5",
    speaker: "M4 9.5h4l5-4.5v14l-5-4.5H4z M16.5 8.5a5 5 0 0 1 0 7 M19 6a8.5 8.5 0 0 1 0 12",
    speakerOff: "M4 9.5h4l5-4.5v14l-5-4.5H4z M16 9l5 6 M21 9l-5 6",
    play: "M7 5l12 7-12 7z",
    pause: "M7 5h3.5v14H7z M13.5 5H17v14h-3.5z",
    bookmark: "M6 4h12v17l-6-4-6 4z",
    bookmarkPlus: "M6 4h12v17l-6-4-6 4z M12 8v5 M9.5 10.5h5",
    listView: "M4 6h16 M4 12h16 M4 18h16",
    gridView: "M4 4h6.5v6.5H4z M13.5 4H20v6.5h-6.5z M4 13.5h6.5V20H4z M13.5 13.5H20V20h-6.5z",
    sort: "M4 7h11 M4 12h8 M4 17h5 M17 7v11 M14 15l3 3 3-3",
    pencil: "M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z M13.5 6.5l4 4",
    editBox: "M4 6a2 2 0 0 1 2-2h7 M20 11v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6 M18.5 3.5a2.1 2.1 0 0 1 3 3L12 16l-4 1 1-4z",
    comment: "M12 20a8 8 0 1 0-6.3-3.1L4 20l4.3-.7A8 8 0 0 0 12 20z M8.5 10.5h7 M8.5 13.5h4.5",
    sign: "M3 17c3-1 4-9 6-9s-1 9 1 9 3-4 4-4 1 3 3 3 M3 21h18",
    organize: "M4 5h6v14H4z M14 5h6v14h-6z M10 8l2-2 2 2",
    combine: "M8 6h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z M4 15V4a1 1 0 0 1 1-1h10",
    camera: "M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
    compress: "M4 14h6v6 M20 10h-6V4 M10 14l-6 6 M14 10l6-6",
    split: "M12 4v16 M4 9l4 3-4 3 M20 9l-4 3 4 3",
    crop: "M6 2v14a2 2 0 0 0 2 2h14 M18 22V8a2 2 0 0 0-2-2H2",
    ocr: "M4 7V5a1 1 0 0 1 1-1h2 M17 4h2a1 1 0 0 1 1 1v2 M20 17v2a1 1 0 0 1-1 1h-2 M7 20H5a1 1 0 0 1-1-1v-2 M9 16l3-8 3 8 M10 13.5h4",
    redact: "M4 6h16v12H4z M4 10h16 M8 6v12 M16 6v12",
    watermark: "M12 3l8 9-8 9-8-9z M9 12h6",
    print: "M6 9V4h12v5 M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2 M6 14h12v7H6z",
    lock: "M12 3l7 3v5c0 4.8-3 8.6-7 10-4-1.4-7-5.2-7-10V6z M10 12h4v3h-4z M11 12v-1.2a1 1 0 0 1 2 0V12",
    exportDoc: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7 M14 3v5h5 M19 8v4 M15 17h6 M18 14l3 3-3 3",
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
    trash: "M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3",
    plus: "M12 5v14 M5 12h14",
    copy: "M8 8h12v12H8z M16 8V4H4v12h4",
    extract: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M12 18v-7 M9 14l3-3 3 3",
    page: "M6 3h9l4 4v14H6z M9 12h6 M9 16h4",
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
    moon: "M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z",
    eyeOff: "M3 3l18 18 M10.6 10.6a2 2 0 0 0 2.8 2.8 M9.9 5.1A10 10 0 0 1 12 5c5.5 0 9.5 7 9.5 7a16 16 0 0 1-3.1 4 M6.5 6.6A15 15 0 0 0 2.5 12s4 7 9.5 7a9.7 9.7 0 0 0 4.3-1",
    sliders: "M4 6h16 M4 12h16 M4 18h16 M9 4v4 M15 10v4 M8 16v4",
    compare: "M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4 M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4 M12 2v20",
    refresh: "M20 11a8 8 0 1 0-2.3 5.7 M20 4v7h-7",
    arrowLeft: "M19 12H5 M11 6l-6 6 6 6",
    arrowRight: "M5 12h14 M13 6l6 6-6 6",
    iphone: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M11 18.5h2",
    rename: "M4 17l4 0 11-11-4-4-11 11z M13.5 5.5l4 4 M3 21h18",
    clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2",
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
    if (tag === "span" && props && (props.icon || props.iconFilled)) el.classList.add("pc-iw");
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  // ---------- Preferencias ----------
  const PREFS_KEY = "pdfcraft-movil";
  const SEARCH_HIST_KEY = "pdfcraft-search-hist";
  const SIZES = { pequeno: 0.85, mediano: 0.92, grande: 1.0 };
  const DESKTOP_SIZE = 0.78;
  const MIN_DIALOG_SIZE = 0.58;
  const prefs = Object.assign({
    tamano: "grande",
    calidad: "fluida",      // "fluida" (2x) | "rapida" (1.5x) | "maxima" (3x)
    nombre: "",
    tema: "oscuro",         // "auto" | "claro" | "oscuro" (Acrobat iOS dark por defecto)
    lectura: "normal",      // "normal" | "noche" | "sepia"
    brillo: 100,
    pantallaActiva: false,
    vistaArchivos: "lista", // "lista" | "cuadricula"
    orden: "reciente",      // "reciente" | "nombre" | "tamano"
    liquidFontSize: 18,
    ttsRate: 1.0,
  }, readPrefs());
  if (!SIZES[prefs.tamano]) prefs.tamano = "grande";
  if (!/^(fluida|rapida|maxima)$/.test(prefs.calidad)) prefs.calidad = "fluida";
  function readPrefs() { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); } catch (e) { return {}; } }
  function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {} }
  function readSearchHist() { try { return JSON.parse(localStorage.getItem(SEARCH_HIST_KEY) || "[]"); } catch (e) { return []; } }
  function saveSearchHist(arr) { try { localStorage.setItem(SEARCH_HIST_KEY, JSON.stringify(arr.slice(0, 10))); } catch (e) {} }

  function applyThemeAttr() {
    if (prefs.tema === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", prefs.tema === "oscuro" ? "dark" : "light");
    if (window.pdfcraftSyncThemeColor) window.pdfcraftSyncThemeColor(body.classList.contains("pc-in-viewer"));
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

  // Wake Lock ("Mantener pantalla encendida")
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

  // ---------- Almacenamiento local (IndexedDB v3: meta + datos + carpetas + espacios) ----------
  const MAX_RECIENTES = 120;
  let dbPromise = null;
  function db() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const r = indexedDB.open("pdfcraft-movil", 3);
        r.onupgradeneeded = () => {
          const d = r.result;
          if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta", { keyPath: "id" });
          if (!d.objectStoreNames.contains("datos")) d.createObjectStore("datos");
          if (!d.objectStoreNames.contains("carpetas")) d.createObjectStore("carpetas", { keyPath: "id" });
          if (!d.objectStoreNames.contains("espacios")) d.createObjectStore("espacios", { keyPath: "id" });
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
      try { return (await done((await storeOf("carpetas", "readonly")).getAll())).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")); }
      catch (e) { return []; }
    },
    async saveFolder(folder) { return done((await storeOf("carpetas", "readwrite")).put(folder)); },
    async removeFolder(id) {
      const list = await files.list();
      for (const m of list) { if (m.carpeta === id) { delete m.carpeta; await files.putMeta(m); } }
      return done((await storeOf("carpetas", "readwrite")).delete(id));
    },
    async listSpaces() {
      try { return (await done((await storeOf("espacios", "readonly")).getAll())).sort((a, b) => (b.modificado || 0) - (a.modificado || 0)); }
      catch (e) { return []; }
    },
    async saveSpace(sp) { return done((await storeOf("espacios", "readwrite")).put(sp)); },
    async removeSpace(id) { return done((await storeOf("espacios", "readwrite")).delete(id)); },
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

  // ---------- Estado global ----------
  const S = {
    ready: false,
    uiBooted: false,
    tab: "inicio",          // "inicio" | "espacios" | "archivos" | "buscar" | "herramientas"
    homeFilter: "recientes",// "recientes" | "destacados" | "iphone"
    filesView: null,        // null | "iphone" | "destacados" | folderId
    activeSpaceId: null,
    spaceSort: "fecha",     // "fecha" | "nombre"
    globalQuery: "",
    toolsQuery: "",
    toolsCat: "todo",       // "todo" | "lectura" | "crear" | "editar" | "convertir" | "organizar" | "proteger"
    cachedList: [],
    cachedFolders: [],
    cachedSpaces: [],
    doc: null,
    docs: new Map(),
    opening: false,
    preparing: false,
    mode: null,             // "dibujar" | "texto" | "comentar" | "firmar" | "editar" | "censurar"
    panel: null,
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
    scrollHand: false,
    scrollRestoreTimer: null,
    fastReader: false,
    liquidMode: false,
    liquidIo: null,
    ttsActive: false,
    ttsPaused: false,
    ttsBlocks: [],
    ttsIdx: 0,
    ttsPage: 1,
    readerLayout: "continuous",
    readerPageGaps: true,
    readerRotation: 0,
    vthumbDragging: false,
    lastSelectionText: "",
  };
  const reader = window.pdfcraftReader ? window.pdfcraftReader.create() : null;
  const readerEl = $("pc-reader");
  const liquidEl = $("pc-liquid");

  function setFastReader(on) {
    const want = !!(on && reader && reader.isOpen());
    S.fastReader = want;
    body.classList.toggle("pc-fast-reader", want);
    if (readerEl) readerEl.hidden = !want || S.liquidMode;
  }

  async function ensureEngineReady() {
    if (S.ready) return true;
    for (let i = 0; i < 450 && !S.ready; i++) await sleep(100);
    if (!S.ready) throw new Error("El motor de edición aún está iniciando. Intenta en unos segundos.");
    return true;
  }

  // ---------- Paleta de íconos tintados (exacto a Acrobat iOS 2026) ----------
  const TINTS = {
    red:    { bg: "rgba(235, 87, 87, 0.16)",  fg: "#f06565" },
    pink:   { bg: "rgba(230, 73, 128, 0.16)", fg: "#ec6598" },
    purple: { bg: "rgba(151, 117, 250, 0.16)",fg: "#a78bfa" },
    green:  { bg: "rgba(56, 217, 169, 0.15)", fg: "#38d9a9" },
    indigo: { bg: "rgba(116, 143, 252, 0.16)",fg: "#849dff" },
    lime:   { bg: "rgba(148, 216, 45, 0.15)", fg: "#a9e34b" },
    blue:   { bg: "rgba(75, 156, 245, 0.16)", fg: "#5ca8ff" },
    amber:  { bg: "rgba(255, 169, 77, 0.16)", fg: "#ffa94d" },
    yellow: { bg: "rgba(252, 196, 25, 0.16)", fg: "#ffd43b" },
    cyan:   { bg: "rgba(59, 201, 219, 0.16)", fg: "#4dd4e6" },
    slate:  { bg: "rgba(160, 165, 180, 0.16)",fg: "#b8beca" },
    emerald:{ bg: "rgba(64, 192, 87, 0.16)",  fg: "#51cf66" },
  };
  function tintedTile(iconName, tintKey) {
    const t = TINTS[tintKey] || TINTS.blue;
    const box = h("span", { class: "pc-sq-ico", icon: iconName });
    box.style.background = t.bg;
    box.style.color = t.fg;
    return box;
  }

  // ---------- Catálogo completo de herramientas (100 % gratuitas y locales) ----------
  const TOOL_CATS = [
    ["todo", "Todo"],
    ["lectura", "Lectura"],
    ["crear", "Crear"],
    ["editar", "Editar"],
    ["convertir", "Convertir"],
    ["organizar", "Organizar"],
    ["proteger", "Proteger"],
  ];

  const ALL_TOOLS = [
    { id: "firmar",    cat: "editar",    t: "Rellenar y firmar",   d: "Completa un formulario y agrega tu firma",         i: "sign",      tint: "purple", mode: "firmar" },
    { id: "comentar",  cat: "editar",    t: "Añadir comentario",   d: "Resalta texto, dibuja y añade notas rápidas",      i: "comment",   tint: "yellow", mode: "comentar" },
    { id: "liquido",   cat: "lectura",   t: "Modo Líquido",        d: "Refluye el texto para leer y copiar sin límites",  i: "liquid",    tint: "amber",  docAction: "liquid" },
    { id: "voz",       cat: "lectura",   t: "Leer en voz alta",    d: "Escucha tu PDF en cualquier lugar",                i: "speaker",   tint: "blue",   docAction: "tts" },
    { id: "copiar",    cat: "lectura",   t: "Copiar texto",        d: "Extrae el texto de una página o un rango completo",i: "copy",      tint: "cyan",   docAction: "copyRange" },
    { id: "escanear",  cat: "crear",     t: "Nueva digitalización",d: "Escanea páginas o fotos como PDF limpio",          i: "camera",    tint: "cyan",   action: "scan" },
    { id: "combinar",  cat: "crear",     t: "Combinar archivos",   d: "Une varios archivos PDF en uno solo al instante",  i: "combine",   tint: "indigo", action: "combine" },
    { id: "espacio",   cat: "crear",     t: "Crea un Espacio PDF", d: "Agrupa tus libros y apuntes en una colección",     i: "spaces",    tint: "purple", action: "newSpace" },
    { id: "organizar", cat: "organizar", t: "Organizar páginas",   d: "Gira, mueve, inserta, extrae y elimina páginas",   i: "organize",  tint: "lime",   docAction: "organize" },
    { id: "recortar",  cat: "organizar", t: "Recortar páginas",    d: "Recorta márgenes o cambia el tamaño de página",    i: "crop",      tint: "blue",   cmd: "page.boxes" },
    { id: "dividir",   cat: "organizar", t: "Dividir PDF",         d: "Separa un documento largo en partes más pequeñas", i: "split",     tint: "emerald",docAction: "organize" },
    { id: "editar",    cat: "editar",    t: "Editar PDF",          d: "Modifica o añade texto, imágenes y enlaces",       i: "editBox",   tint: "pink",   mode: "editar" },
    { id: "dibujar",   cat: "editar",    t: "Dibujar a mano",      d: "Subraya y dibuja libremente sobre las páginas",    i: "draw",      tint: "red",    mode: "dibujar" },
    { id: "ocr",       cat: "editar",    t: "Reconocer texto",     d: "Aplica OCR para hacer buscables tus escaneos",     i: "ocr",       tint: "emerald",cmd: "ocr.recognize" },
    { id: "exportar",  cat: "convertir", t: "Exportar PDF",        d: "Convierte tu PDF a Word, PowerPoint o imagen",     i: "exportDoc", tint: "green",  docAction: "exportMenu" },
    { id: "word",      cat: "convertir", t: "Convertir a Word",    d: "Exporta el PDF al formato Microsoft Word (.docx)", i: "word",      tint: "blue",   cmd: "export.docx" },
    { id: "pptx",      cat: "convertir", t: "Convertir a PPT",     d: "Exporta el PDF a presentación PowerPoint (.pptx)", i: "pptx",      tint: "amber",  cmd: "export.pptx" },
    { id: "imagen",    cat: "convertir", t: "Exportar a imagen",   d: "Guarda las páginas como fotos PNG o JPEG",         i: "image",     tint: "green",  cmd: "export.image" },
    { id: "texto",     cat: "convertir", t: "Exportar a texto",    d: "Descarga todo el documento en texto plano (.txt)", i: "text",      tint: "slate",  cmd: "export.text" },
    { id: "rtf",       cat: "convertir", t: "Exportar a RTF",      d: "Exporta a formato de texto enriquecido (.rtf)",    i: "fileLines", tint: "indigo", cmd: "export.rtf" },
    { id: "imagenes",  cat: "convertir", t: "Extraer imágenes",    d: "Extrae todas las ilustraciones incrustadas",       i: "extract",   tint: "cyan",   cmd: "export.all_images" },
    { id: "comprimir", cat: "proteger",  t: "Comprimir PDF",       d: "Reduce el tamaño para compartirlo más fácil",      i: "compress",  tint: "cyan",   cmd: "optimize.reduce" },
    { id: "proteger",  cat: "proteger",  t: "Definir contraseña",  d: "Añade contraseña y permisos a un PDF",             i: "lock",      tint: "purple", cmd: "protect.password" },
    { id: "censurar",  cat: "proteger",  t: "Censurar PDF",        d: "Oculta de forma permanente datos sensibles",       i: "redact",    tint: "red",    mode: "censurar" },
    { id: "marca",     cat: "editar",    t: "Marca de agua",       d: "Añade sellos o texto de fondo a las páginas",      i: "watermark", tint: "blue",   cmd: "edit.watermark" },
    { id: "encab",     cat: "editar",    t: "Encabezado y pie",    d: "Añade numeración y títulos en cada página",        i: "page",      tint: "indigo", cmd: "edit.header_footer" },
    { id: "mejorar",   cat: "editar",    t: "Mejorar escaneo",     d: "Limpia y endereza páginas escaneadas",             i: "sliders",   tint: "purple", cmd: "ocr.enhance" },
    { id: "blanco",    cat: "crear",     t: "PDF en blanco",       d: "Crea un documento nuevo desde cero",               i: "blank",     tint: "slate",  action: "blank" },
    { id: "imprimir",  cat: "proteger",  t: "Imprimir",            d: "Envía el documento a tu impresora o AirPrint",     i: "print",     tint: "slate",  cmd: "print.dialog" },
    { id: "comparar",  cat: "lectura",   t: "Comparar PDF",        d: "Encuentra diferencias entre dos versiones",        i: "compare",   tint: "cyan",   cmd: "doc.compare" },
    { id: "escritorio",cat: "proteger",  t: "Interfaz completa",   d: "Abre la barra completa de escritorio de PdfCraft", i: "desktop",   tint: "slate",  desktop: true },
  ];

  const HOME_QUICK_TILES = [
    { t: "Convertir a PDF",   i: "open",      tint: "red",    action: "scan" },
    { t: "Editar PDF",        i: "editBox",   tint: "pink",   mode: "editar" },
    { t: "Rellenar y firmar", i: "sign",      tint: "purple", mode: "firmar" },
    { t: "Exportar PDF",      i: "exportDoc", tint: "green",  docAction: "exportMenu" },
    { t: "Combinar archivos", i: "combine",   tint: "indigo", action: "combine" },
    { t: "Organizar páginas", i: "organize",  tint: "lime",   docAction: "organize" },
    { t: "Modo Líquido",      i: "liquid",    tint: "amber",  docAction: "liquid" },
    { t: "Comprimir PDF",     i: "compress",  tint: "cyan",   cmd: "optimize.reduce" },
  ];

  // ---------- Eventos del modo anfitrión PdfCraft WASM ----------
  canvas.addEventListener("pdfcraft:ready", (e) => { S.appVersion = (e.detail && e.detail.appVersion) || ""; });
  canvas.addEventListener("pdfcraft:dirty", (e) => { if (S.doc) setDirty(!!(e.detail && e.detail.dirty)); });
  canvas.addEventListener("pdfcraft:failed", (e) => {
    const err = $("pc-error");
    if (err) { err.hidden = false; err.textContent = "PdfCraft no pudo arrancar: " + ((e.detail && e.detail.error) || ""); }
  });
  canvas.addEventListener("pdfcraft:save", (e) => { onSaved(e.detail || {}).catch((err) => toast("No se pudo guardar: " + err.message, 5000)); });

  function setDirty(dirty) {
    if (!S.doc || S.doc.dirty === dirty) return;
    S.doc.dirty = dirty;
    if (dirty) { S.doc.edited = true; S.doc.engineDirtyForReader = true; }
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
      const entry = (S.doc && S.doc.name === name ? { meta: S.doc.meta } : null)
        || [...S.docs.values()].find((x) => x.name === name)
        || (S.lastDocMeta && S.lastDocMeta.nombre === name ? { meta: S.lastDocMeta } : null);
      if (entry) {
        entry.meta.tamano = file.size;
        entry.meta.modificado = Date.now();
        if (S.doc && S.doc.meta === entry.meta) S.doc.blob = file;
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

  function saveActive(name) {
    return new Promise((resolve, reject) => {
      let sawModal = false;
      let idleMs = 0;
      const w = { name, resolve: (f) => { clearInterval(watch); resolve(f); }, reject: (e) => { clearInterval(watch); reject(e); } };
      const watch = setInterval(() => {
        if (S.modal) { sawModal = true; idleMs = 0; return; }
        idleMs += 250;
        if (sawModal && idleMs > 1800) {
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
    if (S.doc.dirty && S.doc.engineLoaded) return saveActive(S.doc.name);
    if (S.doc.blob) return new File([S.doc.blob], S.doc.meta.nombre, { type: "application/pdf" });
    const blob = await files.blob(S.doc.meta.id);
    if (blob) return new File([blob], S.doc.meta.nombre, { type: "application/pdf" });
    return S.doc.engineLoaded ? saveActive(S.doc.name) : null;
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

  // ---------- Arranque instantáneo UI + motor WASM en segundo plano ----------
  window.pdfcraftHoldSplash = true;
  async function bootUI() {
    if (S.uiBooted) return;
    S.uiBooted = true;
    initStaticChrome();
    await reloadLibrary();
    renderShell();
    if (window.pdfcraftReader && window.pdfcraftReader.preload) {
      window.pdfcraftReader.preload().catch(() => {});
    }
    const installingOffline = !!(navigator.serviceWorker && window.isSecureContext && !navigator.serviceWorker.controller);
    if (!installingOffline && window.pdfcraftHideSplash) {
      window.pdfcraftHideSplash();
    }
    document.addEventListener("visibilitychange", () => {
      syncWakeLock();
      if (document.visibilityState === "hidden" && S.doc) {
        saveLastPage();
        if (S.doc.dirty && S.doc.engineLoaded && !S.modal) saveActive(S.doc.name).catch(() => {});
      }
    });
  }
  bootUI().catch((e) => console.error("bootUI:", e));

  window.addEventListener("TrunkApplicationStarted", () => {
    start().catch((e) => { console.error(e); if (window.pdfcraftHideSplash) window.pdfcraftHideSplash(); });
  });

  let gestures = null;
  async function start() {
    await bootUI();
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
    quiet(pc.set("animation_effects", "off"));
    quiet(pc.set("text-links", "false"));
    if (prefs.nombre) quiet(pc.set("author", prefs.nombre));
    if (prefs.tema !== "auto") quiet(pc.run(prefs.tema === "oscuro" ? "view.theme.dark" : "view.theme.light"));

    function enterScrollHand() {
      clearTimeout(S.scrollRestoreTimer);
      if (S.fastReader || !S.doc || S.mode || S.searching || S.tool || S.modal || S.desktop || S.panel) return;
      if (S.scrollHand) return;
      S.scrollHand = true;
      S.toolSetAt = Date.now();
      pc.set("quick", "hand").catch(() => {});
    }
    function restoreSelectNow() {
      clearTimeout(S.scrollRestoreTimer);
      if (!S.scrollHand) return;
      S.scrollHand = false;
      if (!S.tool && !S.mode && !S.modal && !S.desktop && !S.panel && S.ready) {
        S.toolSetAt = Date.now();
        pc.set("quick", BASE_TOOL).catch(() => {});
      }
    }
    function scheduleRestoreSelect() {
      clearTimeout(S.scrollRestoreTimer);
      S.scrollRestoreTimer = setTimeout(() => {
        if (gestures && gestures.busy()) return;
        restoreSelectNow();
        tick();
      }, 170);
    }
    S.restoreSelectNow = restoreSelectNow;

    gestures = window.pdfcraftGestures && window.pdfcraftGestures.attach(canvas, {
      mode: () => (S.desktop ? "raton-zoom" : (S.modal || S.panel) ? "raton" : S.tool ? "herramienta" : "ver"),
      ratio: () => S.ratio,
      zoomBounds: () => {
        const a = S.last && S.last.active;
        const cur = (a && a.zoom_percent) || S.fitZoom || 100;
        const minZ = Math.max(12, (S.fitZoom || 45) * 0.6);
        return [Math.max(0.2, minZ / cur), Math.min(5.0, 600 / cur)];
      },
      singlePage: () => {
        const a = S.last && S.last.active;
        if (!a || a.continuous !== false || !a.pages_on_screen || !a.pages_on_screen.length) return false;
        const vw = a.viewport[2] - a.viewport[0];
        const p = a.pages_on_screen[0].rect;
        return (p[2] - p[0]) <= vw + 6;
      },
      onTouchStart: (stoppedFling) => {
        clearTimeout(S.scrollRestoreTimer);
        if (!stoppedFling && S.scrollHand) restoreSelectNow();
      },
      onScrollStart: enterScrollHand,
      onScrollEnd: () => { scheduleRestoreSelect(); setTimeout(() => { if (!gestures || !gestures.busy()) tick(); }, 50); },
      onPinchEnd: () => { scheduleRestoreSelect(); setTimeout(() => { if (!gestures || !gestures.busy()) tick(); }, 90); },
      onSwipePage: (dir) => stepPage(dir),
      onDoubleTap: (x, y) => toggleDoubleTapZoom(x, y),
      onTap: () => { restoreSelectNow(); hideSelectionBar(); },
      onSingleTap: () => {
        if (!S.doc || S.mode || S.searching || S.modal || S.desktop || S.panel) return;
        const a = S.last && S.last.active;
        if (a && (a.selected_comment || a.comment_composer_open)) return;
        setImmersive(!S.immersive);
      },
      onLongPress: (x, y) => { restoreSelectNow(); hideSelectionBar(); showPressRing(x, y); },
      onSelectEnd: (x, y, moved) => { if (moved && !S.mode && !S.modal && !S.desktop && !S.panel) showSelectionBar(); },
    });

    if (window.pdfcraftHideSplash) window.pdfcraftHideSplash();
    setInterval(tick, 500);
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

  function showModeHint(text) {
    const el = $("pc-mode-hint");
    if (!el) return;
    clearTimeout(showModeHint.t1);
    clearTimeout(showModeHint.t2);
    if (!text) { el.hidden = true; return; }
    el.textContent = text;
    el.style.opacity = "1";
    el.hidden = false;
    showModeHint.t1 = setTimeout(() => { el.style.opacity = "0"; }, 2500);
    showModeHint.t2 = setTimeout(() => { el.hidden = true; }, 2850);
  }

  function setImmersive(on) {
    if (S.immersive === on) return;
    S.immersive = on;
    body.classList.toggle("pc-immersive", on);
  }

  async function toggleDoubleTapZoom(x, y) {
    if (!S.doc || S.modal || S.desktop) return;
    const s = await pc.state().catch(() => null);
    const a = s && s.active;
    if (!a) return;
    const base = S.fitZoom || 100;
    if (a.zoom_percent > base * 1.25) await fitWidth();
    else if (gestures && gestures.zoomBy) gestures.zoomBy(2.0, x, y);
    else await pc.set("zoom", String(Math.round(base * 2)));
  }

  async function stepPage(dir) {
    if (!S.doc) return;
    if (S.fastReader && reader && reader.isOpen()) {
      const next = reader.stepPage(dir);
      S.doc.page = next;
      updatePageIndicator(next, S.doc.pages);
      saveLastPage();
      return;
    }
    const next = Math.max(1, Math.min(S.doc.pages, (S.doc.page || 1) + dir));
    if (next === S.doc.page) return;
    await pc.set("page", String(next)).catch(() => {});
    S.doc.page = next;
    updatePageIndicator(next, S.doc.pages);
    saveLastPage();
  }

  // ---------- Calibración y escala WASM ----------
  async function calibrate() {
    try {
      await pc.set("ui-scale", "100");
      S.scalePct = 100;
      S.r100 = await measureRatio();
      S.ratio = S.r100;
      await applyScale();
    } catch (e) {}
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
    if (target < targetSize() - 0.005) { S.dialogFit = target; await applyScale(); }
  }
  async function applyScale() {
    if (!S.r100) return;
    const pct = Math.max(50, Math.min(300, Math.round((100 * targetSize()) / S.r100)));
    if (pct === S.scalePct) return;
    const grew = pct > S.scalePct;
    S.scalePct = pct;
    S.ratio = (S.r100 * pct) / 100;
    await pc.set("ui-scale", String(pct));
    if (grew && S.doc && !S.modal && !S.desktop && !S.panel) {
      await sleep(120);
      await recenter().catch(() => {});
    }
  }

  // ---------- Sondeo periódico del motor WASM (inactivo mientras corre Lector Rápido) ----------
  async function tick() {
    if (!S.ready || S.polling || document.visibilityState !== "visible") return;
    if (S.fastReader || (window.pdfcraftOrganizer && window.pdfcraftOrganizer.isOpen())) return;
    if (gestures && gestures.busy()) return;
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
      if (S.doc.page > active.pages) S.doc.page = active.pages;
      const curPage = s.active ? s.active.page : 1;
      if (curPage !== S.doc.page) {
        S.doc.page = curPage;
        if (!S.vthumbDragging) updatePageIndicator(curPage, active.pages);
        saveLastPage();
      } else if (!S.vthumbDragging) {
        updatePageIndicator(curPage, active.pages);
      }
      setDirty(!!active.dirty);

      const selC = s.active && s.active.selected_comment;
      const selKey = selC ? (selC.page + ":" + selC.index) : null;
      if (selKey !== S.selectedAnnot) {
        S.selectedAnnot = selKey;
        if (selKey && !S.modal && !S.desktop && !S.panel) showAnnotBar();
        else hideAnnotBar();
      }

      if (!S.desktop && !S.modal && !S.panel) syncTool(s);
      const isTyping = gestures && gestures.typing && gestures.typing();
      const composing = !!(s.active && s.active.comment_composer_open);
      if (!S.desktop && !S.modal && !S.panel && !isTyping && !composing && gestures && !gestures.busy() && Date.now() - (S.recenteredAt || 0) > 1200) {
        S.recenteredAt = Date.now();
        await recenter(s);
      }
      if (S.searching && s.active && !s.active.find_open && Date.now() - S.searchOpenedAt > 1500) closeSearch(false);
      else if (S.searching && s.active && s.active.find_open) await readFind();

      if (S.doc.dirty && S.doc.dirtySince && Date.now() - S.doc.dirtySince > 30000 && !S.modal && !S.saveWaiters.length) {
        S.doc.dirtySince = Date.now();
        saveActive(S.doc.name).catch(() => {});
      }
    } catch (e) {
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
    if (S.mode) await exitMode(true);
    if (S.panel) await closePanel(true);
    S.doc = { id: active.doc, meta: entry.meta, name: active.name, pages: active.pages, page: 1, dirty: !!active.dirty, dirtySince: active.dirty ? Date.now() : 0, edited: false, engineLoaded: true };
    renderTop();
    await prepareDocument();
  }

  function layoutCanvas(s) {
    let chrome = 0;
    if (S.desktop || S.modal) chrome = 0;
    else if (S.panel) {
      const top = (s.active && s.active.viewport && s.active.viewport[1]) || 86;
      const ratio = (s.window && s.window.width) ? (canvas.clientWidth / s.window.width) : S.ratio;
      chrome = top * ratio;
    } else if (s.active && s.window && s.window.width && allHidden(s.hidden_interface)) {
      const top = S.searching && S.findBottom ? Math.max(s.active.viewport[1], S.findBottom + 4) : s.active.viewport[1];
      chrome = top * (canvas.clientWidth / s.window.width);
    }
    if (Math.abs(chrome - S.chrome) > 0.5) {
      S.chrome = chrome;
      $("pc-doc").style.setProperty("--pc-chrome", chrome.toFixed(1) + "px");
    }
  }

  // ---------- Pestaña vertical del borde derecho + Paso rápido en Página única ----------
  function updatePageIndicator(page, pages, scrollFraction) {
    const track = $("pc-vthumb-track");
    const thumb = $("pc-vthumb");
    const snav = $("pc-single-nav");
    const show = !!(S.doc && !S.panel && !S.modal && !S.desktop && !S.liquidMode);
    if (!show) {
      if (track) track.hidden = true;
      if (snav) snav.hidden = true;
      return;
    }
    const isSingle = S.readerLayout === "single" && !S.mode;
    if (snav) {
      snav.hidden = !isSingle || pages <= 1;
      if (!snav.hidden) {
        $("pc-page-pill").textContent = page + " / " + pages;
        $("pc-page-prev").disabled = page <= 1;
        $("pc-page-next").disabled = page >= pages;
      }
    }
    if (track && thumb) {
      track.hidden = isSingle;
      if (!track.hidden) {
        if (thumb.textContent !== String(page)) thumb.textContent = String(page);
        const frac = typeof scrollFraction === "number"
          ? scrollFraction
          : (pages > 1 ? (page - 1) / (pages - 1) : 0);
        const maxTop = Math.max(0, track.clientHeight - thumb.offsetHeight);
        thumb.style.top = Math.round(Math.max(0, Math.min(1, frac)) * maxTop) + "px";
      }
    }
  }

  function updateBackJumpChip(targetPage) {
    const btn = $("pc-back-jump");
    if (!btn) return;
    if (!targetPage || !S.doc || S.mode || S.panel || S.modal || S.desktop || S.liquidMode) {
      btn.hidden = true;
      return;
    }
    btn.hidden = false;
    btn.replaceChildren(h("span", { icon: "arrowLeft" }), h("span", { text: "Volver a pág. " + targetPage }));
  }

  function saveLastPage() {
    if (!S.doc || !S.doc.meta || !S.doc.page) return;
    if (S.doc.meta.ultimaPagina === S.doc.page) return;
    S.doc.meta.ultimaPagina = S.doc.page;
    files.putMeta(S.doc.meta).catch(() => {});
  }

  function syncTool(s) {
    if (S.scrollHand || Date.now() - S.toolSetAt < 1500) return;
    const q = s.quick_tool;
    if (S.tool && q !== S.tool) {
      S.tool = q === BASE_TOOL || q === "hand" ? null : q;
      renderBottom();
    }
    if (!S.tool && q !== BASE_TOOL) pc.set("quick", BASE_TOOL).catch(() => {});
  }

  // ---------- Controles estáticos (FAB, pestaña vertical derecha, flechas página única, grabber) ----------
  function initStaticChrome() {
    const fab = $("pc-create-fab");
    fab.replaceChildren();
    fab.insertAdjacentHTML("afterbegin", icon("plus"));
    fab.addEventListener("click", openCreateSheet);

    $("pc-bottom-grab").addEventListener("click", viewerMoreToolsSheet);

    $("pc-page-prev").insertAdjacentHTML("afterbegin", icon("back"));
    $("pc-page-next").insertAdjacentHTML("afterbegin", icon("chevRight"));
    $("pc-page-prev").addEventListener("click", () => stepPage(-1));
    $("pc-page-next").addEventListener("click", () => stepPage(1));
    $("pc-page-pill").addEventListener("click", goToPageSheet);

    $("pc-back-jump").addEventListener("click", () => {
      if (S.fastReader && reader) reader.back();
      else pc.run("view.previous_view").catch(() => {});
    });

    // Arrastre vertical de la pestaña derecha de páginas (exacto a Acrobat iOS)
    const track = $("pc-vthumb-track");
    const thumb = $("pc-vthumb");
    const tip = $("pc-vthumb-tip");
    let dragStart = null;
    let wasmScrubTimer = null;

    function startVThumb(ev) {
      if (!S.doc) return;
      const pt = ev.touches ? ev.touches[0] : ev;
      dragStart = { y0: pt.clientY, moved: false };
      if (ev.cancelable) ev.preventDefault();
      ev.stopPropagation();
    }
    function moveVThumb(ev) {
      if (!dragStart || !S.doc) return;
      const pt = ev.touches ? ev.touches[0] : ev;
      if (!pt) return;
      if (ev.cancelable) ev.preventDefault();
      if (!dragStart.moved && Math.abs(pt.clientY - dragStart.y0) > 6) {
        dragStart.moved = true;
        S.vthumbDragging = true;
        thumb.classList.add("pc-dragging");
        tip.hidden = false;
      }
      if (!dragStart.moved) return;
      const tr = track.getBoundingClientRect();
      const th = thumb.offsetHeight || 34;
      const maxTop = Math.max(1, tr.height - th);
      const frac = Math.max(0, Math.min(1, (pt.clientY - tr.top - th / 2) / maxTop));
      thumb.style.top = Math.round(frac * maxTop) + "px";
      tip.style.top = Math.round(tr.top - $("pc-doc").getBoundingClientRect().top + frac * maxTop + th / 2) + "px";
      let pg = Math.max(1, Math.min(S.doc.pages, Math.round(1 + frac * (S.doc.pages - 1))));
      if (S.fastReader && reader && reader.isOpen()) {
        pg = reader.scrollToFraction(frac);
      } else {
        clearTimeout(wasmScrubTimer);
        wasmScrubTimer = setTimeout(() => { pc.set("page", String(pg)).catch(() => {}); }, 80);
      }
      S.doc.page = pg;
      thumb.textContent = String(pg);
      tip.textContent = "Pág. " + pg + " de " + S.doc.pages;
    }
    function endVThumb() {
      if (!dragStart) return;
      const wasMoved = dragStart.moved;
      dragStart = null;
      S.vthumbDragging = false;
      thumb.classList.remove("pc-dragging");
      tip.hidden = true;
      clearTimeout(wasmScrubTimer);
      if (!wasMoved) {
        goToPageSheet();
      } else if (S.doc) {
        if (!S.fastReader) pc.set("page", String(S.doc.page)).catch(() => {});
        saveLastPage();
      }
    }

    thumb.addEventListener("touchstart", startVThumb, { passive: false });
    window.addEventListener("touchmove", moveVThumb, { passive: false });
    window.addEventListener("touchend", endVThumb);
    window.addEventListener("touchcancel", endVThumb);
    thumb.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") startVThumb(e); });
    window.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") moveVThumb(e); });
    window.addEventListener("pointerup", (e) => { if (e.pointerType === "mouse") endVThumb(); });

    renderTabBar();
  }

  // ---------- Barra flotante Liquid-Glass de 5 pestañas ----------
  function renderTabBar() {
    const tabs = [
      { id: "inicio",       t: "Inicio",       i: "home" },
      { id: "espacios",     t: "Espacios",     i: "spaces" },
      { id: "archivos",     t: "Archivos",     i: "file" },
      { id: "buscar",       t: "Buscar",       i: "search" },
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
    if (tab !== "archivos") S.filesView = null;
    if (tab !== "espacios") S.activeSpaceId = null;
    renderTabBar();
    await reloadLibrary();
    renderShell();
  }

  async function reloadLibrary() {
    try { S.cachedList = await files.list(); } catch (e) { S.cachedList = []; }
    try { S.cachedFolders = await files.listFolders(); } catch (e) { S.cachedFolders = []; }
    try { S.cachedSpaces = await files.listSpaces(); } catch (e) { S.cachedSpaces = []; }
  }

  function sortFiles(arr) {
    const copy = arr.slice();
    if (prefs.orden === "nombre") copy.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
    else if (prefs.orden === "tamano") copy.sort((a, b) => (b.tamano || 0) - (a.tamano || 0));
    else copy.sort((a, b) => (b.abierto || 0) - (a.abierto || 0));
    return copy;
  }

  function renderShell() {
    $("pc-create-fab").hidden = !(S.tab === "inicio" || S.tab === "archivos");
    if (S.tab === "inicio") renderHomeTab();
    else if (S.tab === "espacios") renderSpacesTab();
    else if (S.tab === "archivos") renderFilesTab();
    else if (S.tab === "buscar") renderSearchTab();
    else renderToolsTab();
  }

  function topBrandRow(backLabel, onBack) {
    const initial = (prefs.nombre || "P").trim().charAt(0).toUpperCase() || "P";
    return h("div", { class: "pc-topbar-row" },
      backLabel
        ? h("button", { class: "pc-head-back", type: "button", icon: "back", onclick: onBack }, h("span", { text: backLabel }))
        : h("div", { class: "pc-brand-badge" }, h("img", { class: "pc-brand-logo", src: "./icons/icon-192.png", alt: "PdfCraft" })),
      h("div", { class: "pc-glass-pill" },
        h("button", { class: "pc-pill-ic", type: "button", "aria-label": "Ajustes", icon: "settings", onclick: settingsSheet }),
        h("button", { class: "pc-avatar", type: "button", "aria-label": "Perfil y ajustes", text: initial, onclick: settingsSheet })));
  }

  // ---------- Pestaña 1: Inicio (exacto a Captura 3) ----------
  function renderHomeTab() {
    const greeting = prefs.nombre ? ("Le damos la bienvenida de nuevo, " + prefs.nombre) : "Le damos la bienvenida de nuevo";
    $("pc-app-head").replaceChildren(
      topBrandRow(null, null),
      h("h1", { class: "pc-hero-title", text: greeting })
    );
    renderHomeBody();
  }

  function renderHomeBody() {
    const bodyEl = $("pc-tab-body");
    const nodes = [];

    nodes.push(
      h("div", { class: "pc-sub-label", text: "¿Qué desea hacer?" }),
      h("div", { class: "pc-action-strip", role: "region", "aria-label": "Acciones rápidas" },
        HOME_QUICK_TILES.map((qa) => h("button", {
          class: "pc-action-tile", type: "button", onclick: () => launchToolFromHome(qa),
        }, tintedTile(qa.i, qa.tint), h("span", { text: qa.t }))))
    );

    // Pestañas subrayadas: Recientes | Destacado | Archivos de iPhone | •••
    const homeTabs = [
      ["recientes", "Recientes"],
      ["destacados", "Destacado"],
      ["iphone", "Archivos de iPhone"],
    ];
    nodes.push(
      h("div", { class: "pc-utabs-row" },
        h("div", { class: "pc-utabs", role: "tablist" },
          homeTabs.map(([id, label]) => h("button", {
            class: "pc-utab", type: "button", role: "tab",
            "aria-selected": String(S.homeFilter === id),
            text: label,
            onclick: () => { S.homeFilter = id; renderHomeBody(); },
          }))),
        h("button", { class: "pc-utab-more", type: "button", "aria-label": "Ordenar archivos", icon: "more", onclick: sortSheet }))
    );

    let items = S.cachedList;
    if (S.homeFilter === "destacados") items = items.filter((m) => m.destacado);
    items = sortFiles(items);

    if (items.length) {
      nodes.push(renderFileList(items));
    } else {
      nodes.push(h("div", { class: "pc-empty" },
        h("div", { icon: S.homeFilter === "destacados" ? "star" : "fileLines" }),
        h("b", { text: S.homeFilter === "destacados" ? "Sin archivos destacados" : "Tus PDF aparecerán aquí" }),
        h("div", { text: S.homeFilter === "destacados" ? "Toca ••• en un PDF y márcalo con estrella para fijarlo aquí." : "Abre un PDF desde Archivos o crea uno escaneando con tu cámara." }),
        S.homeFilter !== "destacados"
          ? h("button", { class: "pc-empty-btn", type: "button", text: "Abrir un PDF", onclick: () => pickFile(null) })
          : null));
    }

    bodyEl.replaceChildren(...nodes);
  }

  // ---------- Pestaña 2: Espacios (Colecciones locales de PDF, Captura 1) ----------
  function renderSpacesTab() {
    if (S.activeSpaceId) {
      const sp = S.cachedSpaces.find((x) => x.id === S.activeSpaceId);
      if (!sp) { S.activeSpaceId = null; }
      else {
        $("pc-app-head").replaceChildren(
          topBrandRow("Espacios", () => { S.activeSpaceId = null; renderSpacesTab(); }),
          h("h1", { class: "pc-page-title", text: sp.nombre })
        );
        const docIds = new Set(sp.archivos || []);
        const spFiles = S.cachedList.filter((m) => docIds.has(m.id));
        const notesArea = h("textarea", {
          class: "pc-space-notes", placeholder: "Escribe apuntes, resúmenes o pendientes para este Espacio…",
          "aria-label": "Apuntes del Espacio",
        });
        notesArea.value = sp.notas || "";
        let nTimer = null;
        notesArea.addEventListener("input", () => {
          clearTimeout(nTimer);
          nTimer = setTimeout(() => {
            sp.notas = notesArea.value;
            sp.modificado = Date.now();
            files.saveSpace(sp).catch(() => {});
          }, 400);
        });

        $("pc-tab-body").replaceChildren(
          h("div", { class: "pc-btn-row" },
            h("button", { class: "pc-primary", type: "button", icon: "plus", text: "Añadir PDF", onclick: () => addFilesToSpaceSheet(sp) }),
            spFiles.length >= 2
              ? h("button", { class: "pc-secondary", type: "button", icon: "combine", text: "Combinar", onclick: () => combineSpaceFiles(sp, spFiles) })
              : null),
          h("div", { class: "pc-label", text: "Notas del espacio" }),
          notesArea,
          h("div", { class: "pc-sec-head" }, h("h2", { text: "Documentos (" + spFiles.length + ")" })),
          spFiles.length
            ? renderFileList(spFiles, sp)
            : h("div", { class: "pc-empty" },
                h("div", { icon: "spaces" }),
                h("b", { text: "Sin documentos aún" }),
                h("div", { text: "Añade varios PDF de tu biblioteca para estudiarlos juntos." }))
        );
        return;
      }
    }

    $("pc-app-head").replaceChildren(
      topBrandRow(null, null),
      h("h1", { class: "pc-page-title", text: "Espacios" })
    );

    const spaces = S.cachedSpaces.slice();
    if (S.spaceSort === "nombre") spaces.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
    else spaces.sort((a, b) => (b.modificado || 0) - (a.modificado || 0));

    const bar = h("div", { class: "pc-space-bar" },
      h("button", {
        class: "pc-space-sort", type: "button",
        onclick: () => { S.spaceSort = S.spaceSort === "fecha" ? "nombre" : "fecha"; renderSpacesTab(); },
      }, h("span", { text: S.spaceSort === "fecha" ? "Ordenar por fecha" : "Ordenar por nombre" }), h("span", { icon: "chevDown" })),
      h("button", { class: "pc-space-add", type: "button", "aria-label": "Crear espacio", icon: "plus", onclick: () => newSpaceSheet(null) }));

    if (!spaces.length) {
      const heroSvg = `<svg width="112" height="96" viewBox="0 0 112 96" fill="none" aria-hidden="true">
        <defs><linearGradient id="spg" x1="12" y1="8" x2="96" y2="88" gradientUnits="userSpaceOnUse"><stop stop-color="#f06565"/><stop offset="0.55" stop-color="#9775fa"/><stop offset="1" stop-color="#4b9cf5"/></linearGradient></defs>
        <rect x="20" y="16" width="38" height="48" rx="7" stroke="url(#spg)" stroke-width="2.4"/>
        <rect x="44" y="34" width="48" height="44" rx="7" stroke="url(#spg)" stroke-width="2.4" fill="rgba(151,117,250,0.08)"/>
        <path d="M39 27l2.5 5.5 5.5 2.5-5.5 2.5-2.5 5.5-2.5-5.5-5.5-2.5 5.5-2.5z" fill="#9775fa"/>
        <path d="M68 46l1.8 4 4 1.8-4 1.8-1.8 4-1.8-4-4-1.8 4-1.8z" fill="#f06565"/>
      </svg>`;
      const wrap = h("div", { class: "pc-space-hero" });
      wrap.insertAdjacentHTML("afterbegin", heroSvg);
      wrap.append(
        h("b", { text: "Comienza con un Espacio PDF" }),
        h("p", { text: "Agrupa varios libros, presentaciones y apuntes por materia, guarda notas de estudio y combínalos en un toque, todo sin conexión." }),
        h("button", { class: "pc-pill-cta", type: "button", text: "Añadir archivos", onclick: () => newSpaceSheet(null) })
      );
      $("pc-tab-body").replaceChildren(bar, wrap);
      return;
    }

    $("pc-tab-body").replaceChildren(
      bar,
      ...spaces.map((sp) => {
        const cnt = (sp.archivos || []).filter((id) => S.cachedList.some((m) => m.id === id)).length;
        return h("div", { class: "pc-space-card" },
          h("button", {
            style: "flex:1;min-width:0;display:flex;align-items:center;gap:13px;text-align:left",
            type: "button",
            onclick: () => { S.activeSpaceId = sp.id; renderSpacesTab(); },
          },
            h("span", { class: "pc-space-ico", icon: "spaces" }),
            h("span", { class: "pc-space-info" },
              h("b", { text: sp.nombre }),
              h("small", { text: cnt + (cnt === 1 ? " PDF" : " PDFs") + (sp.notas && sp.notas.trim() ? " · con notas" : "") }))),
          h("button", { class: "pc-row-more", type: "button", "aria-label": "Opciones de espacio", icon: "more", onclick: () => spaceMenu(sp) }));
      })
    );
  }

  function newSpaceSheet(initialDocMeta) {
    const input = h("input", { class: "pc-field", type: "text", placeholder: "Ej. Anatomía, Histología, Contratos…" });
    sheet({
      title: "Nuevo Espacio PDF",
      build: (close) => {
        const create = async () => {
          const name = input.value.trim();
          if (!name) return;
          const sp = {
            id: newId(), nombre: name, notas: "",
            archivos: initialDocMeta && initialDocMeta.id ? [initialDocMeta.id] : [],
            creado: Date.now(), modificado: Date.now(),
          };
          await files.saveSpace(sp);
          await reloadLibrary();
          close();
          if (S.tab === "espacios") { S.activeSpaceId = sp.id; renderSpacesTab(); }
          toast("Espacio «" + name + "» creado");
        };
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") create(); });
        return [input, h("button", { class: "pc-primary", type: "button", text: "Crear espacio", onclick: create })];
      },
    });
    input.focus();
  }

  function addFilesToSpaceSheet(sp) {
    const existing = new Set(sp.archivos || []);
    const candidates = S.cachedList.filter((m) => !existing.has(m.id));
    sheet({
      title: "Añadir a «" + sp.nombre + "»",
      build: (close) => [
        h("button", {
          class: "pc-primary", style: "margin-bottom:14px", type: "button", icon: "open", text: "Importar PDF desde Archivos",
          onclick: () => { close(); pickFile({ addToSpaceId: sp.id }); },
        }),
        candidates.length
          ? list(candidates.slice(0, 20).map((m) => ({
              i: "plus", t: m.nombre, small: sizeText(m.tamano || 0),
              run: async () => {
                sp.archivos = (sp.archivos || []).concat(m.id);
                sp.modificado = Date.now();
                await files.saveSpace(sp);
                await reloadLibrary();
                close();
                renderSpacesTab();
                toast("Añadido a «" + sp.nombre + "»");
              },
            })))
          : h("p", { text: "Todos tus archivos guardados ya están en este Espacio." }),
      ],
    });
  }

  function addDocToSpaceSheet(meta) {
    sheet({
      title: "Añadir a un Espacio PDF",
      build: (close) => [
        S.cachedSpaces.length
          ? list(S.cachedSpaces.map((sp) => {
              const has = (sp.archivos || []).includes(meta.id);
              return {
                i: has ? "check" : "spaces", t: sp.nombre, small: has ? "Ya está" : "",
                run: async () => {
                  if (!has) {
                    sp.archivos = (sp.archivos || []).concat(meta.id);
                    sp.modificado = Date.now();
                    await files.saveSpace(sp);
                    await reloadLibrary();
                    toast("Añadido a «" + sp.nombre + "»");
                  }
                  close();
                },
              };
            }))
          : null,
        h("button", { class: "pc-secondary", type: "button", icon: "plus", text: "Crear un Espacio nuevo", onclick: () => { close(); newSpaceSheet(meta); } }),
      ],
    });
  }

  function spaceMenu(sp) {
    sheet({
      title: sp.nombre,
      build: (close) => [list([
        { i: "rename", t: "Renombrar espacio", run: () => {
          close();
          const inp = h("input", { class: "pc-field", type: "text", value: sp.nombre });
          sheet({
            title: "Renombrar espacio",
            build: (c2) => [inp, h("button", { class: "pc-primary", type: "button", text: "Guardar", onclick: async () => {
              const v = inp.value.trim(); if (!v) return;
              sp.nombre = v; sp.modificado = Date.now();
              await files.saveSpace(sp); await reloadLibrary(); renderSpacesTab(); c2();
            } })],
          });
          inp.focus();
        } },
        { i: "trash", t: "Eliminar espacio", danger: true, run: async () => {
          close();
          await files.removeSpace(sp.id);
          if (S.activeSpaceId === sp.id) S.activeSpaceId = null;
          await reloadLibrary();
          renderSpacesTab();
          toast("Espacio eliminado (tus PDF se conservan)");
        } },
      ])],
    });
  }

  async function combineSpaceFiles(sp, spFiles) {
    const resolved = [];
    for (const m of spFiles) {
      const b = await files.blob(m.id);
      if (b) resolved.push(new File([b], m.nombre, { type: "application/pdf" }));
    }
    if (resolved.length < 2) { toast("Se necesitan al menos 2 PDF en el Espacio."); return; }
    combinePdfFilesFast(resolved, sp.nombre + " (combinado).pdf");
  }

  // ---------- Pestaña 3: Archivos ("Ubicaciones de archivo", Capturas 7 y 8) ----------
  function renderFilesTab() {
    const folder = S.filesView && S.filesView !== "iphone" && S.filesView !== "destacados"
      ? S.cachedFolders.find((f) => f.id === S.filesView)
      : null;
    const subTitle = S.filesView === "iphone" ? "Archivos de iPhone"
      : S.filesView === "destacados" ? "Destacados"
      : folder ? folder.nombre : null;

    $("pc-app-head").replaceChildren(
      topBrandRow(subTitle ? "Archivos" : null, () => { S.filesView = null; renderFilesTab(); }),
      h("h1", { class: "pc-page-title", text: subTitle || "Ubicaciones de archivo" })
    );

    const bodyEl = $("pc-tab-body");
    if (subTitle) {
      let items = S.cachedList;
      if (S.filesView === "destacados") items = items.filter((m) => m.destacado);
      else if (folder) items = items.filter((m) => m.carpeta === folder.id);
      items = sortFiles(items);
      const bar = h("div", { class: "pc-space-bar" },
        h("button", { class: "pc-space-sort", type: "button", onclick: sortSheet },
          h("span", { text: prefs.orden === "nombre" ? "Nombre" : prefs.orden === "tamano" ? "Tamaño" : "Más recientes" }),
          h("span", { icon: "chevDown" })),
        h("button", {
          class: "pc-space-add", type: "button",
          "aria-label": prefs.vistaArchivos === "lista" ? "Cuadrícula" : "Lista",
          icon: prefs.vistaArchivos === "lista" ? "gridView" : "listView",
          onclick: () => { prefs.vistaArchivos = prefs.vistaArchivos === "lista" ? "cuadricula" : "lista"; savePrefs(); renderFilesTab(); },
        }));
      bodyEl.replaceChildren(
        bar,
        items.length
          ? (prefs.vistaArchivos === "cuadricula" ? renderFileGrid(items) : renderFileList(items))
          : h("div", { class: "pc-empty" }, h("div", { icon: "folder" }), h("b", { text: "Carpeta vacía" }))
      );
      return;
    }

    const nodes = [];
    // Carrusel horizontal de portadas recientes (exacto a Captura 7)
    if (S.cachedList.length) {
      nodes.push(
        h("div", { class: "pc-sec-head" },
          h("h2", { text: "Archivos recientes" }),
          h("button", { class: "pc-sec-link", type: "button", text: "Ver todo", onclick: () => { S.filesView = "iphone"; renderFilesTab(); } })),
        h("div", { class: "pc-cover-carousel" },
          S.cachedList.slice(0, 12).map((meta) => {
            const box = h("div", { class: "pc-cover-box" });
            if (meta.miniatura) box.append(h("img", { src: meta.miniatura, alt: "" }));
            else box.insertAdjacentHTML("afterbegin", icon("fileLines"));
            return h("button", { class: "pc-cover-card", type: "button", onclick: () => openRecent(meta) },
              box, h("b", { text: meta.nombre }), h("small", { text: "PDF · " + sizeText(meta.tamano || 0) }));
          }))
      );
    }

    const totalBytes = S.cachedList.reduce((acc, m) => acc + (m.tamano || 0), 0);
    const starCount = S.cachedList.filter((m) => m.destacado).length;
    const loc = (ic, color, title, sub, onclick) => {
      const ico = h("span", { class: "pc-loc-ico", icon: ic });
      ico.style.color = color;
      return h("button", { class: "pc-loc-row", type: "button", onclick },
        ico,
        h("span", { class: "pc-loc-info" }, h("b", { text: title }), sub ? h("small", { text: sub }) : null),
        h("span", { class: "pc-loc-chev", icon: "chevRight" }));
    };

    const locRows = [
      loc("folder", "#4b9cf5", "Archivos de iPhone", S.cachedList.length + (S.cachedList.length === 1 ? " documento" : " documentos") + " · " + sizeText(totalBytes), () => { S.filesView = "iphone"; renderFilesTab(); }),
      loc("star", "#fcc419", "Destacados", starCount + (starCount === 1 ? " archivo" : " archivos"), () => { S.filesView = "destacados"; renderFilesTab(); }),
      loc("image", "#a1a1aa", "Fotos a PDF", "Convierte fotos de tu galería en PDF", () => openScannerSheet()),
      loc("camera", "#4dd4e6", "Escáner de documentos", "Escanea hojas con la cámara", () => openScannerSheet()),
      loc("open", "#38d9a9", "Importar desde Archivos / iCloud", "Abrir PDF desde iPhone, iCloud o Drive", () => pickFile(null)),
    ];
    nodes.push(h("div", { class: "pc-loc-list" }, locRows));

    nodes.push(
      h("div", { class: "pc-sec-head" },
        h("h2", { text: "Mis carpetas" }),
        h("button", { class: "pc-sec-link", type: "button", text: "+ Nueva", onclick: () => newFolderSheet(null) })),
      S.cachedFolders.length
        ? h("div", { class: "pc-loc-list" }, S.cachedFolders.map((f) => {
            const cnt = S.cachedList.filter((m) => m.carpeta === f.id).length;
            return h("div", { class: "pc-loc-row", style: "padding-right:8px" },
              h("button", {
                style: "flex:1;min-width:0;display:flex;align-items:center;gap:14px;text-align:left", type: "button",
                onclick: () => { S.filesView = f.id; renderFilesTab(); },
              },
                (() => { const ic = h("span", { class: "pc-loc-ico", icon: "folder" }); ic.style.color = "#849dff"; return ic; })(),
                h("span", { class: "pc-loc-info" }, h("b", { text: f.nombre }), h("small", { text: cnt + (cnt === 1 ? " archivo" : " archivos") }))),
              h("button", { class: "pc-row-more", type: "button", "aria-label": "Opciones de carpeta", icon: "more", onclick: () => folderMenu(f) }));
          }))
        : h("p", { style: "color:var(--muted);font-size:13.5px;margin:0 0 12px", text: "Crea carpetas para organizar tus materias o proyectos." })
    );

    bodyEl.replaceChildren(...nodes);
  }

  // ---------- Pestaña 4: Buscar (Captura 2) ----------
  function renderSearchTab() {
    const input = h("input", {
      type: "search", placeholder: "Buscar", value: S.globalQuery,
      autocomplete: "off", autocorrect: "off", autocapitalize: "off", spellcheck: "false", "aria-label": "Buscar archivos y herramientas",
    });
    const clearBtn = h("button", {
      class: "pc-clear-btn", type: "button", "aria-label": "Limpiar", icon: "close",
      hidden: !S.globalQuery,
      onclick: () => { input.value = ""; S.globalQuery = ""; clearBtn.hidden = true; renderSearchBody(); input.focus(); },
    });
    input.addEventListener("input", () => {
      S.globalQuery = input.value;
      clearBtn.hidden = !input.value;
      renderSearchBody();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        const q = input.value.trim();
        const hist = [q, ...readSearchHist().filter((x) => x.toLowerCase() !== q.toLowerCase())];
        saveSearchHist(hist);
        input.blur();
      }
    });

    $("pc-app-head").replaceChildren(
      topBrandRow(null, null),
      h("label", { class: "pc-search-pill" }, h("span", { icon: "search" }), input, clearBtn)
    );
    renderSearchBody();
  }

  function renderSearchBody() {
    const bodyEl = $("pc-tab-body");
    const q = S.globalQuery.trim().toLowerCase();
    if (!q) {
      const hist = readSearchHist();
      if (hist.length) {
        bodyEl.replaceChildren(
          h("div", { class: "pc-sec-head" },
            h("h2", { text: "Búsquedas recientes" }),
            h("button", { class: "pc-sec-link", type: "button", text: "Borrar", onclick: () => { saveSearchHist([]); renderSearchBody(); } })),
          h("div", { class: "pc-recent-chips" }, hist.map((term) => h("button", {
            class: "pc-qchip", type: "button",
            onclick: () => { S.globalQuery = term; renderSearchTab(); },
          }, h("span", { icon: "clock" }), h("span", { text: term }))))
        );
        return;
      }
      const emptySvg = `<svg width="96" height="96" viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity=".55" aria-hidden="true">
        <circle cx="48" cy="44" r="24"/><path d="M65 62l16 16"/><circle cx="30" cy="40" r="11" fill="var(--bg)"/><path d="M30 35v5l3 2"/>
      </svg>`;
      const wrap = h("div", { class: "pc-search-empty" });
      wrap.insertAdjacentHTML("afterbegin", emptySvg);
      wrap.append(
        h("b", { text: "No hay ninguna búsqueda reciente." }),
        h("p", { text: "Busca entre todos los PDF guardados en este iPhone, tus Espacios y tus herramientas." })
      );
      bodyEl.replaceChildren(wrap);
      return;
    }

    const matchFiles = sortFiles(S.cachedList.filter((m) => (m.nombre || "").toLowerCase().includes(q)));
    const matchSpaces = S.cachedSpaces.filter((sp) => (sp.nombre + " " + (sp.notas || "")).toLowerCase().includes(q));
    const matchTools = ALL_TOOLS.filter((t) => (t.t + " " + t.d).toLowerCase().includes(q));

    const nodes = [];
    if (matchFiles.length) {
      nodes.push(h("div", { class: "pc-sec-head" }, h("h2", { text: "Archivos (" + matchFiles.length + ")" })), renderFileList(matchFiles));
    }
    if (matchSpaces.length) {
      nodes.push(
        h("div", { class: "pc-sec-head" }, h("h2", { text: "Espacios (" + matchSpaces.length + ")" })),
        ...matchSpaces.map((sp) => h("button", {
          class: "pc-space-card", style: "width:100%", type: "button",
          onclick: () => { S.tab = "espacios"; S.activeSpaceId = sp.id; renderTabBar(); renderShell(); },
        }, h("span", { class: "pc-space-ico", icon: "spaces" }), h("span", { class: "pc-space-info" }, h("b", { text: sp.nombre }))))
      );
    }
    if (matchTools.length) {
      nodes.push(
        h("div", { class: "pc-sec-head" }, h("h2", { text: "Herramientas" })),
        h("div", { class: "pc-tools-grid" }, matchTools.slice(0, 6).map((t) => h("button", {
          class: "pc-tcard", type: "button", onclick: () => launchToolFromHome(t),
        }, tintedTile(t.i, t.tint), h("b", { text: t.t }), h("small", { text: t.d }))))
      );
    }
    if (!nodes.length) {
      nodes.push(h("div", { class: "pc-empty" }, h("div", { icon: "search" }), h("b", { text: "Sin resultados para «" + S.globalQuery + "»" })));
    }
    bodyEl.replaceChildren(...nodes);
  }

  // ---------- Pestaña 5: Herramientas (exacto a Capturas 4, 5, 6, 9, 10, 11) ----------
  function renderToolsTab() {
    const input = h("input", {
      type: "search", placeholder: "Buscar herramientas", value: S.toolsQuery,
      autocomplete: "off", autocorrect: "off", autocapitalize: "off", spellcheck: "false", "aria-label": "Buscar herramientas",
    });
    const clearBtn = h("button", {
      class: "pc-clear-btn", type: "button", "aria-label": "Limpiar", icon: "close",
      hidden: !S.toolsQuery,
      onclick: () => { input.value = ""; S.toolsQuery = ""; clearBtn.hidden = true; renderToolsBody(); input.focus(); },
    });
    input.addEventListener("input", () => { S.toolsQuery = input.value; clearBtn.hidden = !input.value; renderToolsBody(); });

    $("pc-app-head").replaceChildren(
      topBrandRow(null, null),
      h("h1", { class: "pc-page-title", text: "Herramientas" }),
      h("label", { class: "pc-search-line" }, h("span", { icon: "search" }), input, clearBtn),
      h("div", { class: "pc-utabs-row", style: "margin-top:4px" },
        h("div", { class: "pc-utabs", role: "tablist" },
          TOOL_CATS.map(([id, label]) => h("button", {
            class: "pc-utab", type: "button", role: "tab",
            "aria-selected": String(S.toolsCat === id),
            text: label,
            onclick: () => { S.toolsCat = id; renderToolsTab(); },
          }))))
    );
    renderToolsBody();
  }

  function renderToolsBody() {
    const bodyEl = $("pc-tab-body");
    const q = S.toolsQuery.trim().toLowerCase();
    let items = ALL_TOOLS;
    if (S.toolsCat !== "todo") items = items.filter((t) => t.cat === S.toolsCat);
    if (q) items = items.filter((t) => (t.t + " " + t.d).toLowerCase().includes(q));

    if (!items.length) {
      bodyEl.replaceChildren(h("div", { class: "pc-empty" },
        h("div", { icon: "search" }),
        h("b", { text: "No se encontró esa herramienta" }),
        h("div", { text: "Prueba otra palabra o abre Interfaz completa (PC)." })));
      return;
    }

    bodyEl.replaceChildren(h("div", { class: "pc-tools-grid" }, items.map((tool) => h("button", {
      class: "pc-tcard", type: "button", onclick: () => launchToolFromHome(tool),
    }, tintedTile(tool.i, tool.tint), h("b", { text: tool.t }), h("small", { text: tool.d })))));
  }

  // ---------- Renderizado de archivos (Lista Acrobat / Cuadrícula) ----------
  function renderFileList(arr, spaceObj) {
    return h("ul", { class: "pc-file-list", "aria-label": "Documentos PDF" }, arr.map((meta) => {
      const thumb = h("span", { class: "pc-thumb" });
      if (meta.miniatura) thumb.append(h("img", { src: meta.miniatura, alt: "" }));
      else { thumb.insertAdjacentHTML("afterbegin", icon("fileLines")); thumb.append(h("span", { class: "pc-thumb-tag", text: "PDF" })); }
      const badges = [];
      if (meta.ultimaPagina && meta.ultimaPagina > 1 && meta.paginas > 1) {
        badges.push(h("span", { class: "pc-mini-badge pc-accent-badge", text: "Pág. " + meta.ultimaPagina }));
      }
      if (meta.destacado) badges.push(h("span", { class: "pc-mini-badge", text: "★" }));
      return h("li", { class: "pc-file-row" },
        h("button", { class: "pc-file-open", type: "button", onclick: () => openRecent(meta) },
          thumb,
          h("span", { class: "pc-file-meta" },
            h("b", { text: meta.nombre }),
            h("small", { text: "PDF · " + describe(meta) }),
            badges.length ? h("span", { class: "pc-file-badges" }, badges) : null)),
        h("button", {
          class: "pc-row-more", type: "button", "aria-label": "Opciones de " + meta.nombre,
          icon: "more", onclick: () => recentMenu(meta, spaceObj),
        }));
    }));
  }

  function renderFileGrid(arr) {
    return h("div", { class: "pc-file-grid" }, arr.map((meta) => {
      const prev = h("div", { class: "pc-file-card-preview" });
      if (meta.miniatura) prev.append(h("img", { src: meta.miniatura, alt: "" }));
      else prev.insertAdjacentHTML("afterbegin", icon("fileLines"));
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
          h("button", { class: "pc-card-dot", type: "button", "aria-label": "Más", icon: "more", onclick: () => recentMenu(meta) })));
    }));
  }

  async function toggleStar(meta) {
    meta.destacado = !meta.destacado;
    await files.putMeta(meta).catch(() => {});
    if (S.doc && S.doc.meta.id === meta.id) S.doc.meta.destacado = meta.destacado;
    await reloadLibrary();
    if (!body.classList.contains("pc-in-viewer")) renderShell();
  }

  function describe(meta) {
    const d = new Date(meta.modificado || meta.abierto || Date.now());
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    let when;
    if (d.toDateString() === today.toDateString()) {
      when = d.toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" });
    } else if (d.toDateString() === yesterday.toDateString()) {
      when = "Ayer";
    } else {
      when = d.toLocaleDateString("es", { day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
    }
    return when + " · " + sizeText(meta.tamano || 0);
  }
  function sizeText(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / 1024 / 1024).toFixed(1).replace(".", ",") + " MB";
  }

  // ---------- Menús de archivo y carpetas ----------
  function recentMenu(meta, spaceObj) {
    sheet({
      title: meta.nombre,
      text: "PDF · " + describe(meta) + (meta.paginas ? " · " + meta.paginas + " pág." : ""),
      starMeta: meta,
      build: (close) => [
        list([
          { i: "open", t: "Abrir", run: () => { close(); openRecent(meta); } },
          { i: "liquid", t: "Abrir en Modo Líquido", run: () => { close(); openRecent(meta, { docAction: "liquid" }); } },
          { i: "organize", t: "Organizar páginas", run: () => { close(); openRecent(meta, { docAction: "organize" }); } },
          { i: "comment", t: "Comentar", run: () => { close(); openRecent(meta, { mode: "comentar" }); } },
          { i: "sign", t: "Rellenar y firmar", run: () => { close(); openRecent(meta, { mode: "firmar" }); } },
        ]),
        list([
          { i: "share", t: "Compartir / Guardar en Archivos", run: async () => { close(); const b = await files.blob(meta.id); if (b) share(new File([b], meta.nombre, { type: "application/pdf" })); } },
          { i: "spaces", t: "Añadir a un Espacio PDF…", run: () => { close(); addDocToSpaceSheet(meta); } },
          { i: "folder", t: "Mover a carpeta…", run: () => { close(); moveFolderSheet(meta); } },
          { i: "rename", t: "Renombrar", run: () => { close(); renameSheet(meta); } },
          { i: "copy", t: "Guardar una copia", run: () => { close(); duplicateFile(meta); } },
        ]),
        list([
          spaceObj ? {
            i: "close", t: "Quitar de «" + spaceObj.nombre + "»",
            run: async () => {
              close();
              spaceObj.archivos = (spaceObj.archivos || []).filter((id) => id !== meta.id);
              await files.saveSpace(spaceObj);
              await reloadLibrary();
              renderSpacesTab();
            },
          } : null,
          { i: "trash", t: "Quitar de la app", danger: true, run: () => { close(); confirmRemove(meta); } },
        ].filter(Boolean)),
      ],
    });
  }

  function renameSheet(meta) {
    const base = (meta.nombre || "documento.pdf").replace(/\.pdf$/i, "");
    const input = h("input", { class: "pc-field", type: "text", value: base, placeholder: "Nombre del PDF" });
    sheet({
      title: "Renombrar PDF",
      build: (close) => {
        const save = async () => {
          const clean = input.value.trim();
          if (!clean) return;
          meta.nombre = clean.replace(/\.pdf$/i, "") + ".pdf";
          await files.putMeta(meta).catch(() => {});
          if (S.doc && S.doc.meta.id === meta.id) S.doc.meta.nombre = meta.nombre;
          await reloadLibrary();
          if (!body.classList.contains("pc-in-viewer")) renderShell();
          close();
          toast("Renombrado a " + meta.nombre);
        };
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
        return [input, h("button", { class: "pc-primary", type: "button", text: "Guardar nombre", onclick: save })];
      },
    });
    input.focus(); input.select();
  }

  async function duplicateFile(meta) {
    const blob = await files.blob(meta.id);
    if (!blob) { toast("No se encontró el archivo."); return; }
    const copyName = meta.nombre.replace(/\.pdf$/i, "") + " (copia).pdf";
    const copyMeta = Object.assign({}, meta, { id: newId(), nombre: copyName, abierto: Date.now(), modificado: Date.now(), destacado: false });
    await files.save(copyMeta, blob);
    await reloadLibrary();
    if (!body.classList.contains("pc-in-viewer")) renderShell();
    toast("Copia guardada: " + copyName);
  }

  function moveFolderSheet(meta) {
    sheet({
      title: "Mover a carpeta",
      build: (close) => [
        list([
          { i: "iphone", t: "Sin carpeta (Raíz)", small: !meta.carpeta ? "Actual" : "", run: async () => { close(); delete meta.carpeta; await files.putMeta(meta); await reloadLibrary(); renderShell(); toast("Movido a la raíz"); } },
          ...S.cachedFolders.map((f) => ({
            i: "folder", t: f.nombre, small: meta.carpeta === f.id ? "Actual" : "",
            run: async () => { close(); meta.carpeta = f.id; await files.putMeta(meta); await reloadLibrary(); renderShell(); toast("Movido a " + f.nombre); },
          })),
        ]),
        h("button", { class: "pc-secondary", type: "button", icon: "folderPlus", text: "Crear carpeta nueva", onclick: () => { close(); newFolderSheet(meta); } }),
      ],
    });
  }

  function newFolderSheet(moveMeta) {
    const targetMeta = moveMeta && moveMeta.id ? moveMeta : null;
    const input = h("input", { class: "pc-field", type: "text", placeholder: "Ej. Medicina, Universidad, Trabajo…" });
    sheet({
      title: "Nueva carpeta",
      build: (close) => {
        const create = async () => {
          const name = input.value.trim(); if (!name) return;
          const folder = { id: newId(), nombre: name, creada: Date.now() };
          await files.saveFolder(folder);
          if (targetMeta) { targetMeta.carpeta = folder.id; await files.putMeta(targetMeta); }
          await reloadLibrary();
          renderShell();
          close();
          toast("Carpeta «" + name + "» creada");
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
          const inp = h("input", { class: "pc-field", type: "text", value: folder.nombre });
          sheet({
            title: "Renombrar carpeta",
            build: (c2) => [inp, h("button", { class: "pc-primary", type: "button", text: "Guardar", onclick: async () => {
              const v = inp.value.trim(); if (!v) return;
              folder.nombre = v; await files.saveFolder(folder); await reloadLibrary(); renderFilesTab(); c2();
            } })],
          });
          inp.focus();
        } },
        { i: "trash", t: "Eliminar carpeta", danger: true, run: async () => {
          close(); await files.removeFolder(folder.id);
          if (S.filesView === folder.id) S.filesView = null;
          await reloadLibrary(); renderFilesTab(); toast("Carpeta eliminada");
        } },
      ])],
    });
  }

  function sortSheet() {
    const opts = [["reciente", "Más reciente primero"], ["nombre", "Nombre (A – Z)"], ["tamano", "Tamaño (mayor primero)"]];
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
      text: meta.nombre + " se borrará de PdfCraft en este iPhone. El archivo original en Archivos no se toca.",
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
        { i: "camera", t: "Nueva digitalización / Fotos a PDF", small: "Cámara o galería", run: () => { close(); openScannerSheet(); } },
        { i: "combine", t: "Combinar archivos PDF", small: "Unir varios", run: () => { close(); openCombineSheet(); } },
        { i: "blank", t: "Crear PDF en blanco", small: "Página nueva", run: () => { close(); createBlankPdfFast(); } },
        { i: "spaces", t: "Nuevo Espacio PDF", small: "Colección", run: () => { close(); newSpaceSheet(null); } },
      ])],
    });
  }

  function launchToolFromHome(tool) {
    if (tool.action === "open") { pickFile(null); return; }
    if (tool.action === "scan") { openScannerSheet(); return; }
    if (tool.action === "combine") { openCombineSheet(); return; }
    if (tool.action === "blank") { createBlankPdfFast(); return; }
    if (tool.action === "newSpace") { newSpaceSheet(null); return; }
    if (tool.desktop) { setDesktop(true); return; }
    if (!S.cachedList.length) { pickFile(tool); return; }
    sheet({
      title: tool.t,
      text: "Elige un PDF para usar esta herramienta",
      build: (close) => [
        h("button", { class: "pc-primary", type: "button", icon: "open", text: "Abrir desde Archivos / iCloud", onclick: () => { close(); pickFile(tool); } }),
        h("div", { class: "pc-label", style: "margin-top:16px", text: "O elige uno de tus recientes" }),
        list(S.cachedList.slice(0, 12).map((meta) => ({
          i: "fileLines", t: meta.nombre, small: meta.paginas ? meta.paginas + " pág." : sizeText(meta.tamano || 0),
          run: () => { close(); openRecent(meta, tool); },
        }))),
      ],
    });
  }

  // ---------- Escáner / Fotos a PDF ----------
  function openScannerSheet() {
    if (!window.pdfcraftScanner) { toast("Escáner no disponible"); return; }
    const pages = [];
    let filter = "doc";
    let paper = "auto";
    const nameInput = h("input", {
      class: "pc-field", type: "text",
      value: "Escaneo " + new Date().toLocaleDateString("es", { day: "2-digit", month: "2-digit" }).replace("/", "-"),
      placeholder: "Nombre del PDF",
    });
    const listWrap = h("div", { class: "pc-scan-list" });
    const createBtn = h("button", { class: "pc-primary", type: "button", text: "Añade al menos una foto", disabled: true });

    const refresh = () => {
      createBtn.disabled = pages.length === 0;
      createBtn.textContent = pages.length ? "Crear PDF (" + pages.length + (pages.length === 1 ? " página)" : " páginas)") : "Añade al menos una foto";
      if (!pages.length) {
        listWrap.replaceChildren(h("div", { class: "pc-empty", style: "padding:20px" },
          h("div", { icon: "camera" }),
          h("div", { text: "Toma fotos con la cámara o elige imágenes de tu galería." })));
        return;
      }
      listWrap.replaceChildren(...pages.map((p, idx) => h("div", { class: "pc-scan-item" },
        h("img", { class: "pc-scan-thumb", src: p.thumb, alt: "" }),
        h("div", { class: "pc-scan-info" }, h("b", { text: "Página " + (idx + 1) }), h("small", { text: p.name })),
        h("div", { class: "pc-scan-btns" },
          h("button", { type: "button", "aria-label": "Girar", icon: "rotate", onclick: () => { p.rot = (p.rot + 90) % 360; p.thumb = window.pdfcraftScanner.makeThumb(p.img, p.rot, filter); refresh(); } }),
          idx > 0 ? h("button", { type: "button", "aria-label": "Subir", icon: "up", onclick: () => { [pages[idx - 1], pages[idx]] = [pages[idx], pages[idx - 1]]; refresh(); } }) : null,
          idx < pages.length - 1 ? h("button", { type: "button", "aria-label": "Bajar", icon: "down", onclick: () => { [pages[idx + 1], pages[idx]] = [pages[idx], pages[idx + 1]]; refresh(); } }) : null,
          h("button", { class: "pc-danger", type: "button", "aria-label": "Quitar", icon: "trash", onclick: () => { pages.splice(idx, 1); refresh(); } })))));
    };

    const addImages = async (fileList) => {
      for (const f of fileList || []) {
        try {
          const img = await window.pdfcraftScanner.loadImage(f);
          pages.push({ id: newId(), name: f.name || "Foto.jpg", img, rot: 0, thumb: window.pdfcraftScanner.makeThumb(img, 0, filter) });
        } catch (e) { toast(e.message); }
      }
      refresh();
    };
    const gal = $("pc-img-gallery"), cam = $("pc-img-camera");
    const onGal = () => { addImages(gal.files); gal.value = ""; };
    const onCam = () => { addImages(cam.files); cam.value = ""; };
    gal.addEventListener("change", onGal);
    cam.addEventListener("change", onCam);

    const makeSeg = (opts, get, set) => {
      const wrap = h("div", { class: "pc-seg", role: "group" });
      const draw = () => wrap.replaceChildren(...opts.map(([val, label]) => h("button", {
        type: "button", "aria-pressed": String(get() === val), text: label,
        onclick: () => { set(val); draw(); },
      })));
      draw(); return wrap;
    };

    const close = sheet({
      title: "Fotos / Escáner a PDF",
      onClose: () => { gal.removeEventListener("change", onGal); cam.removeEventListener("change", onCam); },
      build: () => {
        createBtn.addEventListener("click", async () => {
          if (!pages.length) return;
          createBtn.disabled = true; createBtn.textContent = "Generando PDF…";
          try {
            const file = await window.pdfcraftScanner.buildPdf(pages.map((p) => ({ img: p.img, rot: p.rot, filter })), { name: nameInput.value.trim() || "Escaneo.pdf", paper });
            const meta = { id: newId(), nombre: file.name, tamano: file.size, abierto: Date.now(), modificado: Date.now(), paginas: pages.length };
            await files.save(meta, file);
            await reloadLibrary();
            close();
            openDocument(meta, file, null);
            toast("PDF creado con " + pages.length + (pages.length === 1 ? " página" : " páginas"));
          } catch (e) { toast("Error al crear PDF: " + e.message, 5000); refresh(); }
        });
        return [
          h("div", { class: "pc-btn-row" },
            h("button", { class: "pc-secondary", type: "button", icon: "camera", text: "Tomar foto", onclick: () => cam.click() }),
            h("button", { class: "pc-secondary", type: "button", icon: "image", text: "Galería", onclick: () => gal.click() })),
          listWrap,
          h("div", { class: "pc-label", text: "Filtro de escaneo" }),
          makeSeg([["original", "Original"], ["doc", "Documento"], ["bw", "Blanco y negro"]], () => filter, (v) => {
            filter = v; pages.forEach((p) => { p.thumb = window.pdfcraftScanner.makeThumb(p.img, p.rot, filter); }); refresh();
          }),
          h("div", { class: "pc-label", text: "Tamaño de página" }),
          makeSeg([["auto", "Auto"], ["a4", "A4"], ["letter", "Carta"]], () => paper, (v) => { paper = v; }),
          h("div", { class: "pc-label", text: "Nombre del archivo" }),
          nameInput, createBtn,
        ];
      },
    });
    refresh();
  }

  // ---------- Combinar archivos PDF (instantáneo con pdf-lib, respaldo PdfCraft WASM) ----------
  function openCombineSheet(preselectedMeta) {
    const queue = [];
    if (preselectedMeta && preselectedMeta.id) queue.push({ id: newId(), name: preselectedMeta.nombre, metaId: preselectedMeta.id });
    const nameInput = h("input", { class: "pc-field", type: "text", value: "Combinado.pdf", placeholder: "Nombre del PDF combinado" });
    const listWrap = h("div", { class: "pc-scan-list" });
    const runBtn = h("button", { class: "pc-primary", type: "button", text: "Añade al menos 2 PDF", disabled: true });

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
      multiInput.value = ""; refresh();
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
          combinePdfFilesFast(resolved, outName);
        });
        const recentsPick = S.cachedList.length
          ? [h("div", { class: "pc-label", text: "Añadir desde tus recientes" }),
             list(S.cachedList.slice(0, 8).map((m) => ({
               i: "plus", t: m.nombre, small: m.paginas ? m.paginas + " pág." : "",
               run: () => { queue.push({ id: newId(), name: m.nombre, metaId: m.id }); refresh(); },
             })))]
          : [];
        return [
          listWrap,
          h("button", { class: "pc-secondary", style: "margin-bottom:14px", type: "button", icon: "open", text: "Añadir PDF desde Archivos / iCloud", onclick: () => multiInput.click() }),
          ...recentsPick,
          h("div", { class: "pc-label", text: "Nombre del PDF resultante" }),
          nameInput, runBtn,
        ];
      },
    });
    refresh();
  }

  async function combinePdfFilesFast(pdfFiles, outName) {
    if (window.pdfcraftPdfLib && window.pdfcraftPdfLib.available()) {
      showViewer();
      busy(true, "Combinando " + pdfFiles.length + " archivos…");
      try {
        const res = await window.pdfcraftPdfLib.combinePdfs(pdfFiles, outName);
        const meta = { id: newId(), nombre: res.file.name, tamano: res.file.size, abierto: Date.now(), modificado: Date.now(), paginas: res.pages };
        await files.save(meta, res.file);
        await reloadLibrary();
        busy(false);
        await openDocument(meta, res.file, null);
        toast("PDF combinado listo (" + res.pages + " pág.)");
        return;
      } catch (e) {
        busy(false);
        if (!e || e.code !== "ENCRYPTED") {
          toast("Error al combinar: " + (e.message || e), 5000);
          if (!S.doc) showHome();
          return;
        }
      }
    }
    // Respaldo al motor WASM si algún PDF estaba cifrado
    runCombineInEngine(pdfFiles, outName);
  }

  async function runCombineInEngine(pdfFiles, outName) {
    S.combiningAuto = true; S.opening = true;
    showViewer(); busy(true, "Combinando archivos protegidos…");
    try {
      await ensureEngineReady();
      if (!(await closeAll())) { busy(false); return; }
      setFastReader(false); showViewer();
      const before = new Set(((await pc.state()).documents || []).map((d) => d.doc));
      await pc.run("page.combine");
      await sleep(350);
      for (const f of pdfFiles) {
        const dt = new DataTransfer(); dt.items.add(f);
        canvas.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
        canvas.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
        await sleep(250);
      }
      const ui = await pc.inspect({});
      const btn = (ui.widgets || []).find((w) => w.role === "Button" && /^(Combinar|Combine)$/i.test(String(w.label || "").trim()));
      if (!btn) throw new Error("No se pudo iniciar la combinación.");
      await pc.click({ id: btn.id });
      let doc = null;
      for (let i = 0; i < 80; i++) {
        await sleep(200);
        const s = await pc.state();
        doc = (s.documents || []).find((d) => !before.has(d.doc));
        if (doc) break;
      }
      if (!doc) throw new Error("No se pudo generar el PDF combinado.");
      const meta = { id: newId(), nombre: outName, tamano: 0, abierto: Date.now(), modificado: Date.now(), paginas: doc.pages };
      S.docs.set(doc.doc, { meta, name: doc.name });
      S.doc = { id: doc.doc, meta, name: doc.name, pages: doc.pages, page: 1, dirty: true, dirtySince: Date.now(), edited: true, engineLoaded: true, engineDirtyForReader: true, blob: null };
      await prepareDocument();
      const saved = await saveActive(doc.name).catch(() => null);
      if (saved) {
        meta.tamano = saved.size;
        S.doc.blob = new File([saved], outName, { type: "application/pdf" });
        S.doc.dirty = false; S.doc.engineDirtyForReader = false;
        await files.save(meta, S.doc.blob);
        await openFastReaderForCurrent(1).catch(() => {});
      }
      busy(false); renderTop(); renderBottom();
      toast("PDF combinado listo: " + outName);
    } catch (e) {
      busy(false); toast("Error al combinar: " + e.message, 5000); S.doc = null; showHome();
    } finally { S.combiningAuto = false; S.opening = false; }
  }

  // ---------- Crear PDF en blanco instantáneo (pdf-lib) ----------
  async function createBlankPdfFast() {
    const name = "Documento " + new Date().toLocaleDateString("es", { day: "2-digit", month: "2-digit" }).replace("/", "-") + ".pdf";
    try {
      if (window.pdfcraftPdfLib && window.pdfcraftPdfLib.available()) {
        const file = await window.pdfcraftPdfLib.createBlankPdf(name);
        const meta = { id: newId(), nombre: file.name, tamano: file.size, abierto: Date.now(), modificado: Date.now(), paginas: 1 };
        await files.save(meta, file);
        await reloadLibrary();
        await openDocument(meta, file, null);
        toast("PDF en blanco creado");
        return;
      }
    } catch (e) {}
    toast("No se pudo crear el PDF en blanco");
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
    try { await files.save(meta, file); } catch (e) { toast("Se abrirá sin copia local."); }
    if (pendingTool && pendingTool.addToSpaceId) {
      const sp = S.cachedSpaces.find((x) => x.id === pendingTool.addToSpaceId);
      if (sp) {
        sp.archivos = (sp.archivos || []).concat(meta.id);
        sp.modificado = Date.now();
        await files.saveSpace(sp).catch(() => {});
        await reloadLibrary();
        renderSpacesTab();
        toast("Añadido a «" + sp.nombre + "»");
      }
      pendingTool = null;
      return;
    }
    const tool = pendingTool;
    pendingTool = null;
    openDocument(meta, file, tool);
  });

  async function openRecent(meta, tool) {
    const blob = await files.blob(meta.id);
    if (!blob) { toast("Ese archivo ya no está en la app."); await files.remove(meta.id); await reloadLibrary(); renderShell(); return; }
    meta.abierto = Date.now();
    files.putMeta(meta).catch(() => {});
    openDocument(meta, blob, tool || null);
  }

  // ---------- Visor (Motor dual: PDF.js rápido + PdfCraft WASM para edición) ----------
  async function openFastReaderForCurrent(pageNum) {
    if (!S.doc || !reader || !readerEl || S.doc.readerUnsupported) return false;
    const blob = S.doc.blob || (await files.blob(S.doc.meta.id));
    if (!blob) return false;
    const meta = S.doc.meta;
    readerEl.hidden = S.liquidMode;
    body.classList.add("pc-fast-reader");
    S.fastReader = true;
    try {
      const info = await reader.open(readerEl, blob, {
        page: pageNum || S.doc.page || 1,
        layout: S.readerLayout,
        pageGaps: S.readerPageGaps,
        rotation: S.readerRotation,
        onPageChange: (pg, total) => {
          if (!S.doc) return;
          S.doc.page = pg;
          S.doc.pages = total;
          saveLastPage();
        },
        onScrollProgress: (frac, pg, total) => {
          if (!S.doc || S.vthumbDragging) return;
          updatePageIndicator(pg, total, frac);
        },
        onHistoryChange: (lastBackPage) => updateBackJumpChip(lastBackPage),
        onSingleTap: () => {
          if (!S.doc || S.mode || S.searching || S.modal || S.desktop || S.panel || S.liquidMode) return;
          setImmersive(!S.immersive);
        },
        onSelectionChange: (txt) => {
          S.lastSelectionText = txt || "";
          if (txt && S.fastReader && !S.mode && !S.panel && !S.desktop) showSelectionBar();
          else if (!txt) hideSelectionBar();
        },
        onFirstThumb: (dataUrl) => {
          if (!meta.miniatura && dataUrl) {
            meta.miniatura = dataUrl;
            files.putMeta(meta).catch(() => {});
          }
        },
        onFormTap: async (pg) => {
          if (!S.doc) return;
          S.doc.page = pg;
          const ok = await ensureInEngine("Abriendo campo de formulario…");
          if (ok) toast("Toca el campo para escribir", 2400);
        },
      });
      if (!info) return false;
      S.doc.pages = info.pages;
      S.doc.page = info.page;
      if (meta.paginas !== info.pages) { meta.paginas = info.pages; files.putMeta(meta).catch(() => {}); }
      updatePageIndicator(info.page, info.pages);
      return true;
    } catch (e) {
      setFastReader(false);
      if (e && e.code === "PASSWORD_REQUIRED") S.doc.readerUnsupported = true;
      throw e;
    }
  }

  async function ensureInEngine(msg) {
    if (!S.doc) return false;
    if (S.liquidMode) setLiquidMode(false);
    stopTts();
    const page = (S.fastReader && reader && reader.isOpen()) ? reader.getState().page : (S.doc.page || 1);
    S.doc.page = page;
    if (S.doc.engineLoaded && S.doc.id != null) {
      setFastReader(false);
      await pc.set("page", String(page)).catch(() => {});
      return true;
    }
    busy(true, msg || "Abriendo herramientas…");
    try {
      await ensureEngineReady();
      if (!(await closeAllEngineDocs())) { busy(false); return false; }
      const blob = S.doc.blob || (await files.blob(S.doc.meta.id));
      if (!blob) throw new Error("No se encontró el archivo.");
      const before = new Set(((await pc.state()).documents || []).map((d) => d.doc));
      const bytes = await blob.arrayBuffer();
      setFastReader(false);
      canvas.dispatchEvent(new CustomEvent("pdfcraft:open", { detail: { name: S.doc.meta.nombre, bytes } }));
      const started = Date.now();
      let doc = null;
      let sawPending = false;
      while (!doc) {
        await sleep(130);
        const s = await pc.state();
        const fresh = (s.documents || []).find((d) => !before.has(d.doc));
        if (fresh && !fresh.active) { await pc.run("view.next_tab").catch(() => {}); continue; }
        doc = fresh;
        const pending = (s.pending_opens || []).length > 0;
        sawPending = sawPending || pending;
        const waitingUser = s.password_prompt || s.dialog;
        if (waitingUser) busy(false);
        if (!doc && !waitingUser && sawPending && !pending && Date.now() - started > 1500) throw new Error("El archivo no se pudo abrir.");
        if (!doc && !waitingUser && Date.now() - started > 45000) throw new Error("PdfCraft tardó demasiado en abrirlo.");
      }
      S.doc.id = doc.doc;
      S.doc.name = doc.name;
      S.doc.pages = doc.pages;
      S.doc.engineLoaded = true;
      S.docs.set(doc.doc, { meta: S.doc.meta, name: doc.name });
      if (S.doc.meta.paginas !== doc.pages) { S.doc.meta.paginas = doc.pages; files.putMeta(S.doc.meta).catch(() => {}); }
      await prepareDocument(page);
      busy(false);
      return true;
    } catch (e) {
      busy(false);
      if (reader && reader.isOpen()) setFastReader(true);
      toast(e.message || "No se pudo abrir en el editor.", 5000);
      return false;
    }
  }

  async function returnToFastReader() {
    if (!S.doc || !reader || S.doc.readerUnsupported || S.mode || S.panel || S.desktop || S.modal) return;
    const curPage = S.doc.page || 1;
    try {
      if (S.doc.engineLoaded && (S.doc.dirty || S.doc.engineDirtyForReader)) {
        busy(true, "Guardando cambios…");
        const updated = await saveActive(S.doc.name).catch(() => null);
        busy(false);
        if (updated) {
          S.doc.blob = updated;
          S.doc.dirty = false;
          S.doc.engineDirtyForReader = false;
          await openFastReaderForCurrent(curPage);
          renderTop(); renderBottom();
          return;
        }
      }
      if (reader.isOpen()) {
        setFastReader(true);
        reader.goToPage(curPage, { instant: true });
        renderTop(); renderBottom();
        updatePageIndicator(curPage, S.doc.pages);
      } else if (S.doc.blob) {
        await openFastReaderForCurrent(curPage);
        renderTop(); renderBottom();
      }
    } catch (e) { busy(false); }
  }

  async function openDocument(meta, blob, tool) {
    S.opening = true;
    setImmersive(false);
    setLiquidMode(false);
    stopTts();
    updateBackJumpChip(0);
    showViewer();
    renderTop(meta.nombre);
    busy(true, "Abriendo " + meta.nombre + "…");
    try {
      if (!(await closeAll())) { busy(false); return; }
      showViewer();
      renderTop(meta.nombre);
      busy(true, "Abriendo " + meta.nombre + "…");
      const resumePage = (meta.ultimaPagina && meta.ultimaPagina >= 1) ? meta.ultimaPagina : 1;
      S.doc = {
        id: null, meta, name: meta.nombre, pages: meta.paginas || 1, page: resumePage,
        dirty: false, dirtySince: 0, edited: false, blob, engineLoaded: false, engineDirtyForReader: false, readerUnsupported: false,
      };

      const needsEngineImmediate = !!(tool && (tool.mode || tool.cmd));
      let openedFast = false;
      if (!needsEngineImmediate && reader) {
        try { openedFast = await openFastReaderForCurrent(resumePage); } catch (e) { openedFast = false; }
      }
      if (!openedFast) {
        const ok = await ensureInEngine("Abriendo " + meta.nombre + "…");
        if (!ok) throw new Error("No se pudo abrir el archivo.");
      }

      busy(false);
      renderTop();
      renderBottom();
      syncWakeLock();

      if (tool && tool.mode) enterMode(tool.mode);
      else if (tool && tool.cmd) runCommand(tool.cmd, tool.t);
      else if (tool && tool.docAction) runDocAction(tool.docAction);

      clearTimeout(S.thumbTimer);
      if (!meta.miniatura && !S.fastReader) S.thumbTimer = setTimeout(() => thumbnail(meta), 1100);
    } catch (e) {
      busy(false);
      toast(e.message || "No se pudo abrir el archivo.", 5000);
      S.doc = null;
      if (reader) reader.close();
      setFastReader(false);
      showHome();
    } finally {
      S.opening = false;
    }
  }

  function runDocAction(act) {
    if (!S.doc) return;
    if (act === "liquid") setLiquidMode(!S.liquidMode);
    else if (act === "tts") toggleTts();
    else if (act === "organize") openPagesOverlay("organize");
    else if (act === "pages") openPagesOverlay("view");
    else if (act === "copyRange") copyTextRangeSheet();
    else if (act === "exportMenu") exportMenuSheet();
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
      updatePageIndicator(actualPage, S.doc ? S.doc.pages : 1);
    } finally { S.preparing = false; }
  }

  function shield() {
    const el = $("pc-shield");
    el.hidden = false; el.style.opacity = "1";
    clearTimeout(shield.timer);
    shield.timer = setTimeout(() => { el.style.opacity = "0"; setTimeout(() => { el.hidden = true; }, 300); }, 3200);
  }

  async function fitWidth() {
    const s = await pc.state();
    const a = s.active;
    if (!a || !a.pages_on_screen || !a.pages_on_screen.length) return;
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
    if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) return;
    const r = canvas.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    canvas.dispatchEvent(new MouseEvent("mousemove", { clientX: x, clientY: y, bubbles: true }));
    canvas.dispatchEvent(new WheelEvent("wheel", { clientX: x, clientY: y, deltaX: dx, deltaY: dy, deltaMode: 0, bubbles: true, cancelable: true }));
    setTimeout(() => canvas.dispatchEvent(new MouseEvent("mouseleave", { clientX: -1, clientY: -1 })), 140);
  }

  async function recenter(state) {
    const s = state || (await pc.state());
    const a = s.active;
    if (!a || !a.pages_on_screen || !a.pages_on_screen.length) return;
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
      if (S.fastReader && reader && reader.isOpen()) { reader.resize(); return; }
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
    }, 280);
  });

  async function closeAllEngineDocs() {
    if (!S.ready || !pc.ok()) return true;
    for (let i = 0; i < 12; i++) {
      const s = await pc.state();
      const active = (s.documents || []).find((d) => d.active);
      if (!active) break;
      if (active.dirty) {
        try { await saveActive(active.name); } catch (e) {
          if (/cancelado/i.test(e.message)) return false;
          toast("No se pudieron guardar los cambios: " + e.message, 5000);
          return false;
        }
      }
      try { await pc.run("file.close"); } catch (e) { break; }
      await sleep(90);
      S.docs.delete(active.doc);
    }
    return true;
  }

  async function closeAll() {
    clearTimeout(S.thumbTimer);
    if (window.pdfcraftOrganizer) window.pdfcraftOrganizer.close();
    setLiquidMode(false);
    stopTts();
    updateBackJumpChip(0);
    if (S.restoreSelectNow) S.restoreSelectNow();
    if (S.panel) await closePanel(true);
    if (S.mode) await exitMode(true);
    if (S.searching) closeSearch();
    hideSelectionBar(); hideAnnotBar();
    saveLastPage();
    if (reader) reader.close();
    setFastReader(false);
    if (S.doc && S.doc.engineLoaded) {
      if (!(await closeAllEngineDocs())) return false;
    } else if (S.ready && S.docs.size) {
      if (!(await closeAllEngineDocs())) return false;
    }
    if (S.doc && S.doc.meta) S.lastDocMeta = S.doc.meta;
    S.doc = null;
    return true;
  }

  async function goHome() {
    const doc = S.doc;
    const hadChanges = !!(doc && doc.dirty && doc.engineLoaded);
    if (doc && doc.edited && doc.page === 1 && !S.fastReader) await thumbnail(doc.meta);
    if (hadChanges) busy(true, "Guardando…");
    const ok = await closeAll();
    busy(false);
    if (!ok) return;
    if (hadChanges) toast("Cambios guardados en la app");
    showHome();
  }

  function showViewer() {
    body.classList.add("pc-in-viewer");
    if (window.pdfcraftSyncThemeColor) window.pdfcraftSyncThemeColor(true);
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
    body.classList.remove("pc-in-viewer", "pc-mode", "pc-searching", "pc-immersive", "pc-panel", "pc-fast-reader", "pc-pages-open");
    if (window.pdfcraftSyncThemeColor) window.pdfcraftSyncThemeColor(false);
    if (readerEl) readerEl.hidden = true;
    if (liquidEl) { liquidEl.hidden = true; liquidEl.replaceChildren(); }
    S.fastReader = false; S.liquidMode = false; S.immersive = false;
    S.mode = null; S.panel = null; S.searching = false; S.selectedAnnot = null;
    stopTts();
    syncWakeLock();
    if (updateNowIfIdle()) return;
    hideSelectionBar(); hideAnnotBar(); showModeHint("");
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
      out.width = 200; out.height = Math.round((200 * hgt) / w);
      out.getContext("2d").drawImage(img, x0 * k, top * k, w, hgt, 0, 0, out.width, out.height);
      meta.miniatura = out.toDataURL("image/jpeg", 0.76);
      await files.putMeta(meta);
    } catch (e) {} finally { S.takingThumb = false; }
  }

  // ---------- Modo Líquido (Lectura refluida + copia masiva multipágina) ----------
  function setLiquidMode(on) {
    const want = !!(on && S.doc && reader && reader.isOpen());
    if (S.liquidMode === want) return;
    if (want && S.mode) exitMode(true);
    if (S.liquidIo) { S.liquidIo.disconnect(); S.liquidIo = null; }
    S.liquidMode = want;
    if (!want) {
      if (liquidEl) { liquidEl.hidden = true; liquidEl.replaceChildren(); }
      if (readerEl) readerEl.hidden = !S.fastReader;
      renderTop();
      if (S.doc) updatePageIndicator(S.doc.page, S.doc.pages);
      return;
    }

    setImmersive(false);
    hideSelectionBar();
    if (readerEl) readerEl.hidden = true;
    liquidEl.hidden = false;
    liquidEl.style.setProperty("--pc-liquid-fs", (prefs.liquidFontSize || 18) + "px");

    const bar = h("div", { class: "pc-liquid-bar" },
      h("button", { type: "button", text: "A−", "aria-label": "Reducir letra", onclick: () => {
        prefs.liquidFontSize = Math.max(13, (prefs.liquidFontSize || 18) - 2);
        savePrefs(); liquidEl.style.setProperty("--pc-liquid-fs", prefs.liquidFontSize + "px");
      } }),
      h("button", { type: "button", text: "A+", "aria-label": "Agrandar letra", onclick: () => {
        prefs.liquidFontSize = Math.min(30, (prefs.liquidFontSize || 18) + 2);
        savePrefs(); liquidEl.style.setProperty("--pc-liquid-fs", prefs.liquidFontSize + "px");
      } }),
      h("button", { type: "button", icon: "copy", onclick: () => copyTextRangeSheet() }, h("span", { text: "Copiar" })),
      h("button", { type: "button", icon: "close", "aria-label": "Salir de Modo Líquido", onclick: () => setLiquidMode(false) }));

    const content = h("div", { class: "pc-liquid-content" });
    const startP = S.doc.page || 1;
    const total = S.doc.pages || 1;

    const loadPageEl = async (sec, pNum) => {
      if (sec.dataset.loaded) return;
      sec.dataset.loaded = "1";
      const blocks = await reader.getPageBlocks(pNum).catch(() => []);
      if (!sec.isConnected || !S.liquidMode) return;
      const frag = document.createDocumentFragment();
      frag.append(h("div", { class: "pc-liquid-pnum", text: "Página " + pNum + " de " + total }));
      if (!blocks.length) {
        frag.append(h("p", { class: "pc-liquid-empty", text: "(Esta página es una imagen o no contiene texto seleccionable. Usa Reconocer texto / OCR para extraerlo.)" }));
      } else {
        for (const b of blocks) frag.append(h(b.type === "h" ? "h3" : "p", { text: b.text }));
      }
      sec.replaceChildren(frag);
    };

    S.liquidIo = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const pNum = parseInt(entry.target.dataset.page, 10);
        if (pNum) loadPageEl(entry.target, pNum);
      }
    }, { root: liquidEl, rootMargin: "500px 0px" });

    for (let p = 1; p <= total; p++) {
      const sec = h("article", { class: "pc-liquid-page", "data-page": String(p) },
        h("div", { class: "pc-liquid-pnum", text: "Página " + p + " de " + total }),
        h("p", { class: "pc-liquid-empty", text: "Cargando texto…" }));
      content.append(sec);
      S.liquidIo.observe(sec);
    }

    liquidEl.replaceChildren(bar, content);
    updatePageIndicator(startP, total);
    renderTop();

    const targetEl = content.querySelector(`.pc-liquid-page[data-page="${startP}"]`);
    if (targetEl) {
      loadPageEl(targetEl, startP);
      if (startP + 1 <= total) {
        const nextEl = content.querySelector(`.pc-liquid-page[data-page="${startP + 1}"]`);
        if (nextEl) loadPageEl(nextEl, startP + 1);
      }
      setTimeout(() => targetEl.scrollIntoView({ block: "start", behavior: "auto" }), 20);
    }
    toast("Modo Líquido: selecciona y copia libremente entre páginas", 2600);
  }

  // ---------- Leer en voz alta (Web Speech API) ----------
  function stopTts() {
    S.ttsActive = false; S.ttsPaused = false; S.ttsBlocks = []; S.ttsIdx = 0;
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
    const bar = $("pc-tts-bar");
    if (bar) { bar.hidden = true; bar.replaceChildren(); }
    if (S.doc && !S.mode && !S.searching && !S.panel) renderTop();
  }

  async function toggleTts() {
    if (S.ttsActive) { stopTts(); return; }
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
      toast("Leer en voz alta no está disponible en este navegador."); return;
    }
    if (!S.doc || !reader || !reader.isOpen()) {
      toast("Abre el documento en modo lectura para escucharlo."); return;
    }
    S.ttsActive = true;
    S.ttsPaused = false;
    S.ttsPage = S.doc.page || 1;
    renderTop();
    renderTtsBar("Preparando lectura…");
    await startTtsPage(S.ttsPage);
  }

  async function startTtsPage(pg) {
    if (!S.ttsActive || !reader || !reader.isOpen()) return;
    S.ttsPage = pg;
    const blocks = await reader.getPageBlocks(pg).catch(() => []);
    if (!S.ttsActive) return;
    S.ttsBlocks = blocks.map((b) => b.text).filter(Boolean);
    S.ttsIdx = 0;
    if (!S.ttsBlocks.length) {
      if (pg < S.doc.pages) { startTtsPage(pg + 1); return; }
      toast("No hay texto para leer en esta página.");
      stopTts();
      return;
    }
    if (pg !== S.doc.page) {
      reader.goToPage(pg, { instant: true });
      S.doc.page = pg;
    }
    speakCurrentBlock();
  }

  function speakCurrentBlock() {
    if (!S.ttsActive || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const txt = S.ttsBlocks[S.ttsIdx];
    if (!txt) {
      if (S.ttsPage < (S.doc ? S.doc.pages : 1)) startTtsPage(S.ttsPage + 1);
      else stopTts();
      return;
    }
    renderTtsBar(`Pág. ${S.ttsPage} · ${txt.slice(0, 60)}`);
    const utt = new SpeechSynthesisUtterance(txt);
    utt.lang = "es-ES";
    utt.rate = prefs.ttsRate || 1.0;
    const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
    const esVoice = voices.find((v) => /^es/i.test(v.lang));
    if (esVoice) utt.voice = esVoice;
    utt.onend = () => {
      if (!S.ttsActive || S.ttsPaused) return;
      S.ttsIdx++;
      speakCurrentBlock();
    };
    utt.onerror = () => {};
    window.speechSynthesis.speak(utt);
  }

  function renderTtsBar(label) {
    const bar = $("pc-tts-bar");
    if (!bar) return;
    if (!S.ttsActive) { bar.hidden = true; return; }
    bar.hidden = false;
    const rates = [0.8, 1.0, 1.25, 1.5, 2.0];
    bar.replaceChildren(
      h("button", { class: "pc-tts-btn", type: "button", "aria-label": "Anterior", icon: "back", onclick: () => { S.ttsIdx = Math.max(0, S.ttsIdx - 1); S.ttsPaused = false; speakCurrentBlock(); } }),
      h("button", {
        class: "pc-tts-btn pc-primary-mini", type: "button", "aria-label": S.ttsPaused ? "Reanudar" : "Pausar",
        icon: S.ttsPaused ? "play" : "pause",
        onclick: () => {
          S.ttsPaused = !S.ttsPaused;
          if (S.ttsPaused) window.speechSynthesis.cancel();
          else speakCurrentBlock();
          renderTtsBar(label);
        },
      }),
      h("button", { class: "pc-tts-btn", type: "button", "aria-label": "Siguiente", icon: "chevRight", onclick: () => { S.ttsIdx++; S.ttsPaused = false; speakCurrentBlock(); } }),
      h("span", { text: label || ("Leyendo pág. " + S.ttsPage) }),
      h("button", {
        class: "pc-tts-btn", type: "button", text: (prefs.ttsRate || 1) + "×",
        onclick: () => {
          const i = rates.indexOf(prefs.ttsRate || 1);
          prefs.ttsRate = rates[(i + 1) % rates.length];
          savePrefs();
          if (!S.ttsPaused) speakCurrentBlock();
          else renderTtsBar(label);
        },
      }),
      h("button", { class: "pc-tts-btn", type: "button", "aria-label": "Detener", icon: "close", onclick: stopTts })
    );
  }

  // ---------- Copiar texto de página o rango completo (solución definitiva para bloques largos) ----------
  function copyTextRangeSheet() {
    if (!S.doc || !reader || !reader.isOpen()) {
      toast("Disponible en modo lectura rápida."); return;
    }
    const cur = S.doc.page || 1;
    const total = S.doc.pages || 1;
    const fromIn = h("input", { class: "pc-field", type: "number", inputmode: "numeric", min: "1", max: String(total), value: String(cur), "aria-label": "Desde página" });
    const toIn = h("input", { class: "pc-field", type: "number", inputmode: "numeric", min: "1", max: String(total), value: String(Math.min(total, cur)), "aria-label": "Hasta página" });
    const preview = h("textarea", { class: "pc-textarea", placeholder: "Pulsa «Extraer texto» para ver y copiar el texto aquí…", hidden: true });
    const copyBtn = h("button", { class: "pc-primary", type: "button", text: "Copiar texto ahora", hidden: true });
    const extractBtn = h("button", { class: "pc-primary", type: "button", icon: "copy", text: "Extraer y copiar" });

    sheet({
      title: "Copiar texto del PDF",
      text: "Extrae texto limpio de una página o de varias páginas seguidas sin bloqueos.",
      build: (close) => {
        const runExtract = async (a, b) => {
          extractBtn.disabled = true;
          extractBtn.textContent = "Extrayendo texto…";
          try {
            const txt = await reader.extractTextRange(a, b, (doneP, totP) => {
              extractBtn.textContent = `Extrayendo ${doneP} de ${totP}…`;
            });
            extractBtn.disabled = false;
            extractBtn.textContent = "Extraer y copiar";
            if (!txt.trim()) { toast("No se encontró texto seleccionable en esas páginas."); return; }
            preview.value = txt;
            preview.hidden = false;
            copyBtn.hidden = false;
            copyBtn.textContent = "Copiar (" + txt.length + " caracteres)";
            const ok = await copyTextToClipboard(txt, true);
            if (ok) { toast("Copiado (" + txt.length + " caracteres)"); close(); }
          } catch (e) {
            extractBtn.disabled = false; extractBtn.textContent = "Extraer y copiar";
            toast("Error al extraer texto: " + (e.message || e));
          }
        };
        extractBtn.addEventListener("click", () => runExtract(fromIn.value, toIn.value));
        copyBtn.addEventListener("click", async () => {
          const ok = await copyTextToClipboard(preview.value, true);
          if (ok) { toast("Copiado al portapapeles"); close(); }
          else { preview.focus(); preview.select(); toast("Pulsa Copiar en el menú de iOS"); }
        });

        return [
          h("div", { class: "pc-btn-row" },
            h("button", { class: "pc-secondary", type: "button", text: "Solo pág. " + cur, onclick: () => { fromIn.value = String(cur); toIn.value = String(cur); runExtract(cur, cur); } }),
            total > cur ? h("button", { class: "pc-secondary", type: "button", text: `Pág. ${cur} – ${Math.min(total, cur + 4)}`, onclick: () => { fromIn.value = String(cur); toIn.value = String(Math.min(total, cur + 4)); runExtract(cur, Math.min(total, cur + 4)); } }) : null),
          h("div", { class: "pc-btn-row" },
            h("div", { style: "flex:1" }, h("div", { class: "pc-label", text: "Desde página" }), fromIn),
            h("div", { style: "flex:1" }, h("div", { class: "pc-label", text: "Hasta página" }), toIn)),
          extractBtn,
          preview,
          copyBtn,
        ];
      },
    });
  }

  // ---------- Vista nativa móvil de Páginas y Organizar páginas (pdf-lib + PDF.js) ----------
  async function openPagesOverlay(initialMode) {
    if (!S.doc || !window.pdfcraftOrganizer) return;
    document.querySelectorAll(".pc-sheet-wrap").forEach((w) => w.remove());
    setImmersive(false);
    hideSelectionBar(); hideAnnotBar();
    if (S.mode) await exitMode(true);
    if (S.searching) closeSearch();
    if (S.liquidMode) setLiquidMode(false);
    stopTts();

    // Si había cambios sin guardar en el motor WASM, guárdalos antes de organizar
    if (S.doc.engineLoaded && S.doc.dirty) {
      busy(true, "Guardando cambios…");
      const saved = await saveActive(S.doc.name).catch(() => null);
      busy(false);
      if (saved) { S.doc.blob = saved; S.doc.dirty = false; S.doc.engineDirtyForReader = false; }
    }
    const blob = S.doc.blob || (await files.blob(S.doc.meta.id));
    if (!blob) { toast("No se pudo leer el archivo."); return; }

    window.pdfcraftOrganizer.open({
      blob,
      name: S.doc.meta.nombre,
      pageCount: S.doc.pages || 1,
      currentPage: S.doc.page || 1,
      mode: initialMode || "view",
      reader,
      toast,
      sheet,
      list,
      onJumpPage: (pg) => {
        if (S.fastReader && reader && reader.isOpen()) reader.goToPage(pg, { recordHistory: true, instant: true });
        else pc.set("page", String(pg)).catch(() => {});
        if (S.doc) { S.doc.page = pg; updatePageIndicator(pg, S.doc.pages); saveLastPage(); }
      },
      onEditPdf: () => enterMode("editar"),
      onCropPages: () => runCommand("page.boxes", "Recortar páginas"),
      onApplyChanges: async (newFile, newCount, nextPage) => {
        busy(true, "Actualizando documento…");
        try {
          if (S.doc.engineLoaded) {
            await closeAllEngineDocs().catch(() => {});
            S.doc.engineLoaded = false;
            S.doc.id = null;
          }
          S.doc.blob = newFile;
          S.doc.pages = newCount;
          S.doc.page = nextPage;
          S.doc.dirty = false;
          S.doc.engineDirtyForReader = false;
          S.doc.meta.tamano = newFile.size;
          S.doc.meta.paginas = newCount;
          S.doc.meta.modificado = Date.now();
          delete S.doc.meta.miniatura;
          await files.save(S.doc.meta, newFile);
          await openFastReaderForCurrent(nextPage);
          if (reader && reader.isOpen() && reader.renderThumbnail) {
            const mRef = S.doc.meta;
            reader.renderThumbnail(1, 220, 0).then((url) => {
              if (url) { mRef.miniatura = url; files.putMeta(mRef).catch(() => {}); }
            }).catch(() => {});
          }
          renderTop(); renderBottom();
          toast("Cambios aplicados (" + newCount + (newCount === 1 ? " página)" : " páginas)"));
        } catch (e) {
          toast("Error al aplicar cambios: " + (e.message || e), 5000);
        } finally { busy(false); }
      },
      onExtractedPdf: async (file, count) => {
        const meta = { id: newId(), nombre: file.name, tamano: file.size, abierto: Date.now(), modificado: Date.now(), paginas: count };
        await files.save(meta, file);
        await reloadLibrary();
        sheet({
          title: "Páginas extraídas",
          text: file.name + " (" + count + (count === 1 ? " página" : " páginas") + ") se guardó en tus archivos.",
          build: (close) => [
            h("button", { class: "pc-primary", type: "button", text: "Abrir nuevo PDF", onclick: () => { close(); window.pdfcraftOrganizer.close(); openDocument(meta, file, null); } }),
            h("button", { class: "pc-secondary", type: "button", icon: "share", text: "Compartir / Guardar en Archivos", onclick: () => { close(); share(file); } }),
          ],
        });
      },
      onSplitPdfs: async (parts) => {
        for (const pt of parts) {
          const meta = { id: newId(), nombre: pt.file.name, tamano: pt.file.size, abierto: Date.now(), modificado: Date.now(), paginas: pt.pages };
          await files.save(meta, pt.file);
        }
        await reloadLibrary();
        toast("PDF dividido en " + parts.length + " archivos guardados en tu biblioteca", 4200);
      },
      onFallbackEngine: () => {
        runCommand("page.split", "Organizar");
      },
    });
  }

  // ---------- Barra superior del visor (exacto a Capturas 12, 14, 15, 19) ----------
  function renderTop(name) {
    const top = $("pc-top");
    if (S.searching) {
      const input = h("input", {
        type: "search", placeholder: "Buscar en el documento", value: S.searchQuery || "",
        enterkeyhint: "search", autocomplete: "off", autocorrect: "off", autocapitalize: "off", spellcheck: "false",
      });
      const clearBtn = h("button", {
        class: "pc-clear-btn", type: "button", "aria-label": "Limpiar", icon: "close", hidden: !input.value,
        onclick: () => {
          input.value = ""; S.searchQuery = ""; clearBtn.hidden = true; S.findLabel = "";
          if (S.fastReader && reader) reader.clearSearch();
          renderBottom(); input.focus();
        },
      });
      let timer = null;
      const find = async () => {
        S.searchQuery = input.value;
        const q = input.value.trim();
        if (S.fastReader && reader && reader.isOpen()) {
          if (!q) { reader.clearSearch(); S.findLabel = ""; renderBottom(); return; }
          S.findLabel = "Buscando…"; renderBottom();
          const res = await reader.search(q).catch(() => null);
          if (res && S.searching) { S.findLabel = res.label; renderBottom(); }
          return;
        }
        if (q) pc.set("find", q).catch(() => {});
      };
      input.addEventListener("input", () => { clearBtn.hidden = !input.value; clearTimeout(timer); timer = setTimeout(find, 220); });
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); clearTimeout(timer); input.blur(); find(); } });
      top.replaceChildren(
        h("label", { class: "pc-search" }, h("span", { icon: "search" }), input, clearBtn),
        h("button", { class: "pc-text-btn pc-accent", type: "button", text: "Cancelar", onclick: () => closeSearch() }));
      return input;
    }

    if (S.panel) {
      const TITLES = { bookmarks: "Índice del PDF", comments: "Comentarios", layers: "Capas", attachments: "Adjuntos", signatures: "Firmas", fields: "Campos" };
      top.replaceChildren(
        h("button", { class: "pc-text-btn pc-accent", type: "button", text: "Hecho", onclick: () => closePanel() }),
        h("div", { class: "pc-title pc-center" }, h("b", { text: TITLES[S.panel] || "Panel" })),
        h("span", { style: "width:56px" }));
      return null;
    }

    if (S.mode) {
      const m = MODES[S.mode];
      top.replaceChildren(
        h("button", { class: "pc-text-btn", type: "button", text: "Hecho", onclick: () => exitMode() }),
        h("span", { class: "pc-top-divider" }),
        h("div", { class: "pc-title" }, h("b", { text: m ? m.titulo : "Editar" })),
        h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Deshacer", icon: "undo", onclick: () => runCommand("edit.undo", "Deshacer") }),
        h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Rehacer", icon: "redo", onclick: () => runCommand("edit.redo", "Rehacer") }));
      return null;
    }

    // Barra principal del visor fiel a Captura 12: Casa | Audio | [espacio] | Modo Líquido | Buscar | Compartir | •••
    const ttsPill = h("button", {
      class: "pc-tts-pill", type: "button", "aria-label": "Leer en voz alta",
      "aria-pressed": String(S.ttsActive), disabled: !S.doc, onclick: toggleTts,
    }, h("span", { class: "pc-tts-knob", icon: S.ttsActive ? "speaker" : "speakerOff" }));

    top.replaceChildren(
      h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Inicio", icon: "home", onclick: goHome }),
      h("span", { class: "pc-top-divider" }),
      ttsPill,
      h("span", { class: "pc-top-spacer" }),
      h("button", {
        class: "pc-icon-btn" + (S.liquidMode ? " pc-on" : ""), type: "button",
        "aria-label": "Modo Líquido", "aria-pressed": String(S.liquidMode),
        icon: "liquid", disabled: !S.doc, onclick: () => setLiquidMode(!S.liquidMode),
      }),
      h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Buscar", icon: "search", disabled: !S.doc, onclick: openSearch }),
      h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Compartir", icon: "share", disabled: !S.doc, onclick: shareCurrent }),
      h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Más opciones", icon: "more", disabled: !S.doc, onclick: moreMenu }));
    return null;
  }

  async function shareCurrent() {
    try {
      const f = await currentFile();
      if (f) await share(f);
    } catch (e) { toast("No se pudo preparar el archivo: " + e.message, 4500); }
  }

  // ---------- Búsqueda en documento ----------
  async function openSearch() {
    if (!S.doc) return;
    if (S.liquidMode) setLiquidMode(false);
    setImmersive(false);
    if (S.mode) await exitMode(true);
    if (S.panel) await closePanel(true);
    hideSelectionBar(); hideAnnotBar();
    S.searching = true; S.searchOpenedAt = Date.now(); S.findLabel = ""; S.findBottom = 0;
    body.classList.add("pc-searching");
    const input = renderTop();
    renderBottom();
    if (input) input.focus();
    if (!S.fastReader && S.ready) {
      pc.run("edit.find").then(async () => { await sleep(200); await readFind(); }).catch(() => {});
    }
  }

  function closeSearch(sendEsc = true) {
    if (!S.searching) return;
    S.searching = false; S.findBottom = 0; S.findLabel = "";
    body.classList.remove("pc-searching");
    if (S.fastReader && reader) reader.clearSearch();
    else if (sendEsc && S.ready) pc.key("Escape").catch(() => {});
    renderTop(); renderBottom();
  }

  async function readFind() {
    if (!S.searching || S.fastReader) return;
    const ui = await pc.inspect({});
    const box = (ui.widgets || []).find((w) => w.role === "TextEdit" && w.rect && w.rect[1] < 160);
    if (!box) return;
    const row = ui.widgets.filter((w) => w.rect && Math.abs((w.rect[1] + w.rect[3]) / 2 - (box.rect[1] + box.rect[3]) / 2) < 20);
    S.findBottom = Math.max(...row.map((w) => w.rect[3]));
    if (S.last) layoutCanvas(S.last);
    const btns = row.filter((w) => w.role === "Button" && w.rect[0] > box.rect[2]).sort((a, b) => a.rect[0] - b.rect[0]);
    S.findPrev = btns.find((b) => /anterior|prev/i.test(String(b.label || ""))) || btns[0] || null;
    S.findNext = btns.find((b) => /siguiente|next/i.test(String(b.label || ""))) || btns[1] || null;
    const label = row.find((w) => w.role === "Label");
    const text = label ? String(label.value || label.label || "") : "";
    if (text !== S.findLabel) { S.findLabel = text; renderBottom(); }
  }

  async function findStep(forward) {
    if (S.fastReader && reader && reader.isOpen()) {
      const res = forward ? reader.nextMatch() : reader.prevMatch();
      if (res) { S.findLabel = res.label; renderBottom(); }
      return;
    }
    const b = forward ? S.findNext : S.findPrev;
    if (!b) return;
    try {
      await pc.click({ x: (b.rect[0] + b.rect[2]) / 2, y: (b.rect[1] + b.rect[3]) / 2 });
      await sleep(140); await readFind();
    } catch (e) {}
  }

  // ---------- Paneles nativos de PdfCraft (Comentarios, Capas, Adjuntos, Firmas) ----------
  async function openPanel(panelName) {
    if (!S.doc) return;
    setImmersive(false);
    if (S.mode) await exitMode(true);
    if (S.searching) closeSearch();
    hideSelectionBar(); hideAnnotBar();
    if (!(await ensureInEngine("Abriendo panel…"))) return;
    S.panel = panelName;
    body.classList.add("pc-panel");
    renderTop();
    updatePageIndicator(S.doc.page, S.doc.pages);
    try {
      const s = await pc.state();
      if (allHidden(s.hidden_interface)) await pc.run("view.toggle_interface");
      await pc.set("mode", "read").catch(() => {});
      await pc.set("left", "closed").catch(() => {});
      await pc.set("panel", panelName);
      await applyScale();
      await sleep(120);
      layoutCanvas(await pc.state());
    } catch (e) { toast("No se pudo abrir el panel: " + e.message); closePanel(); }
  }

  async function closePanel(skipReturnReader) {
    if (!S.panel) return;
    S.panel = null;
    body.classList.remove("pc-panel");
    renderTop(); renderBottom();
    try {
      await pc.set("panel", "none").catch(() => {});
      await pc.set("mode", "all").catch(() => {});
      const s = await pc.state();
      if (s.active && !allHidden(s.hidden_interface)) { await pc.run("view.toggle_interface"); shield(); }
      await applyScale();
      await sleep(120);
      layoutCanvas(await pc.state());
      await fitWidth();
      if (S.doc) updatePageIndicator(S.doc.page, S.doc.pages);
      if (!skipReturnReader) await returnToFastReader();
    } catch (e) {}
  }

  // ---------- Marcadores e índice (exacto a Captura 18) ----------
  function bookmarksSheet(onBack) {
    if (!S.doc) return;
    const meta = S.doc.meta;
    meta.marcadores = meta.marcadores || [];
    const curPage = S.doc.page || 1;
    const listWrap = h("div");
    const outlineWrap = h("div");

    const jumpTo = (pg, close) => {
      if (S.fastReader && reader && reader.isOpen()) reader.goToPage(pg, { recordHistory: true, instant: true });
      else pc.set("page", String(pg)).catch(() => {});
      if (S.doc) { S.doc.page = pg; updatePageIndicator(pg, S.doc.pages); saveLastPage(); }
      close();
    };

    const draw = (close) => {
      const bms = (meta.marcadores || []).slice().sort((a, b) => a.pagina - b.pagina);
      if (!bms.length) {
        listWrap.replaceChildren(h("p", { style: "color:var(--muted);font-size:13.5px;margin:4px 0 12px", text: "Aún no has guardado marcadores personales." }));
      } else {
        listWrap.replaceChildren(h("div", { class: "pc-list" }, bms.map((bm) => h("div", { class: "pc-bm-item" },
          h("button", { class: "pc-bm-go", type: "button", onclick: () => jumpTo(bm.pagina, close) },
            h("span", { class: "pc-bm-page", text: "P. " + bm.pagina }),
            h("span", { class: "pc-bm-title", text: bm.titulo })),
          h("button", { class: "pc-row-more", type: "button", "aria-label": "Eliminar marcador", icon: "trash", onclick: async () => {
            meta.marcadores = meta.marcadores.filter((x) => x !== bm);
            await files.putMeta(meta).catch(() => {}); draw(close);
          } })))));
      }
    };

    const close = sheet({
      title: "Marcadores",
      onBack,
      build: (c) => [
        h("button", {
          class: "pc-primary", style: "margin-bottom:14px", type: "button", icon: "bookmarkPlus",
          text: "Marcar página actual (Pág. " + curPage + ")",
          onclick: () => {
            c();
            const inp = h("input", { class: "pc-field", type: "text", value: "Página " + curPage });
            sheet({
              title: "Nuevo marcador",
              build: (c2) => {
                const save = async () => {
                  meta.marcadores = meta.marcadores || [];
                  meta.marcadores.push({ pagina: curPage, titulo: inp.value.trim() || ("Página " + curPage) });
                  await files.putMeta(meta).catch(() => {});
                  c2(); toast("Marcador guardado (Pág. " + curPage + ")");
                };
                inp.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
                return [inp, h("button", { class: "pc-primary", type: "button", text: "Guardar marcador", onclick: save })];
              },
            });
            inp.focus(); inp.select();
          },
        }),
        outlineWrap,
        h("div", { class: "pc-label", text: "Mis marcadores" }),
        listWrap,
      ],
    });
    draw(close);
    if (reader && reader.isOpen()) {
      reader.getOutline().then((items) => {
        if (!items || !items.length || !outlineWrap.isConnected) return;
        outlineWrap.replaceChildren(
          h("div", { class: "pc-label", text: "Índice del documento" }),
          h("div", { class: "pc-list" }, items.slice(0, 100).map((it) => h("div", { class: "pc-bm-item", style: it.depth ? ("padding-left:" + (14 + it.depth * 14) + "px") : null },
            h("button", { class: "pc-bm-go", type: "button", onclick: () => jumpTo(it.page, close) },
              h("span", { class: "pc-bm-page", text: "P. " + it.page }),
              h("span", { class: "pc-bm-title", text: it.title }))))));
      }).catch(() => {});
    }
  }

  // ---------- Modos de edición y anotación (Capturas 14, 15, 19) ----------
  const MODES = {
    dibujar: {
      titulo: "Dibujar",
      defaultTool: "ink",
      hint: "Arrastra para dibujar y utiliza dos dedos para desplazarte",
      herramientas: [
        { q: "ink", t: "Dibujar", i: "draw" },
        { q: "freehand_highlight", t: "Resaltar", i: "highlight" },
        { q: "arrow", t: "Flecha", i: "arrow" },
        { q: "line", t: "Línea", i: "line" },
        { q: "square", t: "Cuadro", i: "square" },
        { q: "circle", t: "Óvalo", i: "circle" },
        { q: "eraser", t: "Borrador", i: "eraser" },
      ],
    },
    texto: {
      titulo: "Añadir texto",
      defaultTool: "freetext",
      hint: "Toque el documento para añadir texto",
      herramientas: [
        { q: "freetext", t: "Texto libre", i: "text" },
        { q: "add-text", t: "Texto PDF", i: "addText" },
        { q: "edit-text", t: "Editar texto", i: "editText" },
        { q: "note", t: "Nota", i: "note" },
      ],
    },
    comentar: {
      titulo: "Comentar",
      defaultTool: "highlight",
      hint: "Arrastra sobre el texto para resaltar o elige una herramienta",
      herramientas: [
        { q: "highlight", t: "Resaltar", i: "highlight" },
        { q: "freehand_highlight", t: "Libre", i: "highlight" },
        { q: "underline", t: "Subrayar", i: "underline" },
        { q: "strikeout", t: "Tachar", i: "strike" },
        { q: "squiggly", t: "Ondulado", i: "squiggly" },
        { q: "note", t: "Nota", i: "note" },
        { q: "freetext", t: "Texto", i: "text" },
        { q: "ink", t: "Dibujar", i: "draw" },
        { q: "eraser", t: "Borrador", i: "eraser" },
        { panel: "comments", t: "Lista", i: "comment" },
        { c: "comment.hide_all", t: "Ocultar", i: "eyeOff" },
        { c: "comment.flatten", t: "Aplanar", i: "layers" },
      ],
    },
    firmar: {
      titulo: "Rellenar y firmar",
      hint: "Toca un campo o elige Firma / Texto abajo",
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
        { c: "form.clear", t: "Limpiar", i: "eraser" },
      ],
    },
    editar: {
      titulo: "Editar PDF",
      defaultTool: "edit-text",
      hint: "Toca el texto o imagen que deseas modificar",
      herramientas: [
        { q: "add-text", t: "Añadir texto", i: "addText" },
        { q: "edit-text", t: "Editar texto", i: "editText" },
        { c: "edit.image", t: "Añadir imagen", i: "image" },
        { q: "link", t: "Enlace", i: "link" },
        { q: "crop", t: "Recortar", i: "crop" },
        { c: "edit.replace", t: "Reemplazar", i: "search" },
        { c: "edit.watermark", t: "Marca agua", i: "watermark" },
        { c: "edit.header_footer", t: "Encab./Pie", i: "page" },
      ],
    },
    censurar: {
      titulo: "Censurar PDF",
      hint: "Marca zonas sensibles y pulsa Aplicar",
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

  async function enterMode(name, initialTool) {
    const m = MODES[name];
    if (!m || !S.doc) return;
    if (S.restoreSelectNow) S.restoreSelectNow();
    setImmersive(false);
    if (S.liquidMode) setLiquidMode(false);
    if (S.panel) await closePanel(true);
    if (S.mode) await exitMode(true);
    if (S.searching) closeSearch();
    hideSelectionBar(); hideAnnotBar();
    if (!(await ensureInEngine("Preparando " + m.titulo + "…"))) return;
    S.mode = name;
    S.tool = null;
    body.classList.add("pc-mode");
    renderTop();
    renderBottom();
    updatePageIndicator(S.doc.page, S.doc.pages);
    try {
      await applyScale();
      const targetQ = initialTool || m.defaultTool;
      if (targetQ) {
        const obj = m.herramientas.find((x) => x.q === targetQ);
        if (obj) await useTool(obj);
      }
      if (m.hint) showModeHint(m.hint);
    } catch (e) { toast(e.message); }
  }

  async function exitMode(skipReturnReader) {
    S.mode = null; S.tool = null;
    body.classList.remove("pc-mode");
    showModeHint("");
    renderTop(); renderBottom();
    try {
      if (S.ready && pc.ok()) {
        await pc.set("quick", BASE_TOOL);
        await applyScale();
      }
      if (S.doc) updatePageIndicator(S.doc.page, S.doc.pages);
      if (!skipReturnReader) await returnToFastReader();
    } catch (e) {}
  }

  // ---------- Barra inferior del visor (exacto a Captura 12) ----------
  function renderBottom() {
    const nav = $("pc-viewer-nav");
    const bar = $("pc-toolbar");
    if (S.searching) {
      nav.hidden = true; bar.hidden = false;
      bar.replaceChildren(h("div", { class: "pc-find-row", role: "toolbar", "aria-label": "Resultados" },
        h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Anterior", icon: "up", onclick: () => findStep(false) }),
        h("span", { class: "pc-find-count", role: "status", "aria-live": "polite", text: S.findLabel || (S.searchQuery ? "Buscando…" : "Escribe para buscar") }),
        h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Siguiente", icon: "down", onclick: () => findStep(true) })));
      return;
    }
    const m = S.mode && MODES[S.mode];
    if (m) {
      nav.hidden = true; bar.hidden = false;
      bar.replaceChildren(h("div", { class: "pc-tools-row", role: "toolbar", "aria-label": m.titulo },
        m.herramientas.map((tool) => h("button", {
          class: "pc-tb", type: "button", icon: tool.i,
          "aria-pressed": tool.q ? String(S.tool === tool.q) : null,
          onclick: () => useTool(tool),
        }, h("span", { text: tool.t })))));
      return;
    }
    // 5 botones exactos de Adobe Acrobat iPhone (Captura 12): Dibujar | Texto | Rellenar y firmar | Editar PDF | Más herramientas
    bar.hidden = true; bar.replaceChildren(); nav.hidden = false;
    const actions = [
      { t: "Dibujar",           i: "draw",    run: () => enterMode("dibujar") },
      { t: "Texto",             i: "text",    run: () => enterMode("texto") },
      { t: "Rellenar y firmar", i: "sign",    run: () => enterMode("firmar") },
      { t: "Editar PDF",        i: "editBox", run: () => enterMode("editar") },
      { t: "Más herramientas",  i: "tools",   run: () => viewerMoreToolsSheet() },
    ];
    nav.replaceChildren(...actions.map((a) => h("button", {
      class: "pc-vnav-btn", type: "button", icon: a.i, disabled: !S.doc, onclick: a.run,
    }, h("span", { text: a.t }))));
  }

  async function useTool(tool) {
    if (tool.panel) { openPanel(tool.panel); return; }
    if (tool.q && tool.c) {
      const next = S.tool === tool.q ? null : tool.q;
      S.tool = next; S.toolSetAt = Date.now(); renderBottom();
      try {
        if (next) await pc.run(tool.c);
        else await pc.set("quick", BASE_TOOL);
      } catch (e) { toast("No se pudo usar " + tool.t + ": " + e.message, 4000); S.tool = null; renderBottom(); }
      return;
    }
    if (tool.c) { runCommand(tool.c, tool.t); return; }
    const next = S.tool === tool.q ? null : tool.q;
    S.tool = next; S.toolSetAt = Date.now(); renderBottom();
    try { await pc.set("quick", next || BASE_TOOL); }
    catch (e) { toast("No se pudo usar " + tool.t + ": " + e.message, 4000); S.tool = null; renderBottom(); }
  }

  async function runCommand(id, label) {
    try {
      if (S.doc && S.fastReader) {
        const ok = await ensureInEngine("Preparando " + (label || "herramienta") + "…");
        if (!ok) return;
      } else {
        await ensureEngineReady();
      }
      await pc.run(id);
    } catch (e) {
      const msg = String(e.message || e);
      if (/disabled|not enabled|no selection|unavailable/i.test(msg)) toast((label || "Esa acción") + " no está disponible ahora.");
      else toast("No se pudo: " + msg, 4000);
    }
  }

  // ---------- Portapapeles 100 % fiable en Safari iOS + barra flotante de selección ----------
  const clip = navigator.clipboard;
  const rawWriteText = clip && clip.writeText ? clip.writeText.bind(clip) : null;

  async function copyTextToClipboard(text, silentFail) {
    const clean = String(text || "");
    if (!clean) return false;
    if (rawWriteText) {
      try { await rawWriteText(clean); return true; } catch (e) {}
    }
    // Respaldo síncrono execCommand("copy") con textarea temporal
    try {
      const ta = document.createElement("textarea");
      ta.value = clean;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, clean.length);
      const ok = document.execCommand("copy");
      ta.remove();
      if (ok) return true;
    } catch (e) {}
    if (!silentFail) {
      const ta = h("textarea", { class: "pc-textarea" });
      ta.value = clean;
      sheet({
        title: "Copiar texto seleccionado",
        build: (close) => [
          ta,
          h("button", { class: "pc-primary", type: "button", text: "Copiar todo", onclick: async () => {
            ta.select();
            const ok = await copyTextToClipboard(ta.value, true);
            if (ok) { close(); toast("Copiado al portapapeles"); }
          } }),
        ],
      });
      setTimeout(() => { ta.focus(); ta.select(); }, 60);
    }
    return false;
  }

  let selBar = null;
  function hideSelectionBar() { if (selBar) { selBar.remove(); selBar = null; } }
  function showSelectionBar() {
    hideSelectionBar(); hideAnnotBar();
    const keepSel = (e) => { e.preventDefault(); };
    const mark = async (cmd, qTool, label) => {
      hideSelectionBar();
      if (S.fastReader && reader) {
        reader.clearSelection();
        await enterMode("comentar", qTool);
        toast("Arrastra sobre el texto para " + label.toLowerCase(), 2600);
        return;
      }
      runCommand(cmd, label);
    };
    const mkBtn = (ic, label, fn) => {
      const b = h("button", { type: "button", icon: ic, onclick: fn }, h("span", { text: label }));
      // Evita que tocar Copiar colapse la selección de Safari iOS antes de leerla
      b.addEventListener("pointerdown", keepSel);
      b.addEventListener("touchstart", keepSel, { passive: false });
      return b;
    };
    selBar = h("div", { class: "pc-selbar", role: "toolbar", "aria-label": "Texto seleccionado" },
      mkBtn("copy", "Copiar", copySelection),
      mkBtn("fileLines", "Pág.", () => { hideSelectionBar(); copyTextRangeSheet(); }),
      mkBtn("highlight", "Resaltar", () => mark("comment.highlight", "highlight", "Resaltar")),
      mkBtn("underline", "Subrayar", () => mark("comment.underline", "underline", "Subrayar")),
      mkBtn("strike", "Tachar", () => mark("comment.strikeout", "strikeout", "Tachar")));
    $("pc-doc").append(selBar);
  }

  let annotBar = null;
  function hideAnnotBar() { if (annotBar) { annotBar.remove(); annotBar = null; } }
  function showAnnotBar() {
    hideAnnotBar(); hideSelectionBar();
    annotBar = h("div", { class: "pc-selbar", role: "toolbar", "aria-label": "Anotación seleccionada" },
      h("button", { type: "button", icon: "sliders", onclick: () => { hideAnnotBar(); pc.set("dialog", "comment-props").catch(() => {}); } }, h("span", { text: "Estilo y color" })),
      h("button", { type: "button", icon: "copy", onclick: () => { hideAnnotBar(); runCommand("comment.copy", "Copiar"); toast("Anotación copiada"); } }, h("span", { text: "Copiar" })),
      h("button", { class: "pc-danger", type: "button", icon: "trash", onclick: () => { hideAnnotBar(); pc.key("Delete").catch(() => {}); } }, h("span", { text: "Eliminar" })));
    $("pc-doc").append(annotBar);
  }

  let copyWanted = false;
  if (rawWriteText) {
    clip.writeText = (text) => rawWriteText(text).then(
      () => { if (copyWanted) { copyWanted = false; toast("Copiado al portapapeles"); } },
      (err) => { if (copyWanted) { copyWanted = false; copyTextToClipboard(text, false); } throw err; });
  }
  async function copySelection() {
    if (S.fastReader && reader) {
      const text = reader.getSelectedText() || S.lastSelectionText;
      hideSelectionBar();
      if (!text) return;
      const ok = await copyTextToClipboard(text, false);
      reader.clearSelection();
      S.lastSelectionText = "";
      if (ok) toast("Copiado (" + text.length + " caracteres)");
      return;
    }
    hideSelectionBar();
    copyWanted = true;
    try { canvas.focus({ preventScroll: true }); document.execCommand("copy"); } catch (e) {}
    pc.run("edit.copy").catch(() => { copyWanted = false; });
    setTimeout(() => { copyWanted = false; }, 3500);
  }

  // ---------- Hoja "Más herramientas" 4×3 (exacto a Captura 13) ----------
  function viewerMoreToolsSheet() {
    if (!S.doc) return;
    hideSelectionBar();
    const tiles = [
      { t: "Comentar",          i: "comment",   tint: "yellow", run: () => enterMode("comentar") },
      { t: "Resaltar",          i: "highlight", tint: "pink",   run: () => enterMode("comentar", "highlight") },
      { t: "Exportar PDF",      i: "exportDoc", tint: "green",  run: () => exportMenuSheet() },
      { t: "Combinar archivos", i: "combine",   tint: "indigo", run: () => openCombineSheet(S.doc.meta) },
      { t: "Comprimir PDF",     i: "compress",  tint: "cyan",   run: () => runCommand("optimize.reduce", "Comprimir PDF") },
      { t: "Definir contraseña",i: "lock",      tint: "purple", run: () => runCommand("protect.password", "Proteger") },
      { t: "Organizar páginas", i: "organize",  tint: "lime",   run: () => openPagesOverlay("organize") },
      { t: "Recortar páginas",  i: "crop",      tint: "blue",   run: () => runCommand("page.boxes", "Recortar páginas") },
      { t: "Reconocer texto",   i: "ocr",       tint: "emerald",run: () => runCommand("ocr.recognize", "OCR") },
      { t: "Copiar texto",      i: "copy",      tint: "cyan",   run: () => copyTextRangeSheet() },
      { t: "Nueva digitalización",i:"camera",   tint: "cyan",   run: () => openScannerSheet() },
      { t: "Añadir a Espacio",  i: "spaces",    tint: "purple", run: () => addDocToSpaceSheet(S.doc.meta) },
    ];
    sheet({
      title: "Más herramientas",
      build: (close) => [
        h("div", { class: "pc-more-grid" }, tiles.map((tl) => h("button", {
          class: "pc-mtile", type: "button",
          onclick: () => { close(); tl.run(); },
        }, tintedTile(tl.i, tl.tint), h("span", { text: tl.t })))),
        h("button", { class: "pc-outline-pill", type: "button", text: "Ver todas las herramientas", onclick: () => { close(); allDocToolsSheet(); } }),
      ],
    });
  }

  function allDocToolsSheet() {
    if (!S.doc) return;
    const docTools = ALL_TOOLS.filter((t) => !t.action || t.action === "combine");
    sheet({
      title: "Todas las herramientas",
      build: (close) => [
        list(docTools.map((tool) => ({
          i: tool.i, t: tool.t, small: tool.d.slice(0, 26),
          run: () => {
            close();
            if (tool.mode) enterMode(tool.mode);
            else if (tool.docAction) runDocAction(tool.docAction);
            else if (tool.action === "combine") openCombineSheet(S.doc.meta);
            else if (tool.cmd) runCommand(tool.cmd, tool.t);
            else if (tool.desktop) setDesktop(true);
          },
        }))),
      ],
    });
  }

  function exportMenuSheet(onBack) {
    if (!S.doc) return;
    sheet({
      title: "Exportar como…",
      onBack,
      build: (close) => [list([
        { i: "word", t: "Documento de Word (.docx)", run: () => { close(); runCommand("export.docx", "Exportar a Word"); } },
        { i: "pptx", t: "Presentación PowerPoint (.pptx)", run: () => { close(); runCommand("export.pptx", "Exportar a PowerPoint"); } },
        { i: "image", t: "Imágenes (PNG / JPEG)", run: () => { close(); runCommand("export.image", "Exportar imagen"); } },
        { i: "text", t: "Texto plano (.txt)", run: () => { close(); runCommand("export.text", "Exportar texto"); } },
        { i: "fileLines", t: "Texto enriquecido (.rtf)", run: () => { close(); runCommand("export.rtf", "Exportar RTF"); } },
        { i: "extract", t: "Extraer todas las imágenes", run: () => { close(); runCommand("export.all_images", "Extraer imágenes"); } },
      ])],
    });
  }

  // ---------- Hoja "Ver configuración" (exacto a Captura 22) ----------
  function viewSettingsSheet(onBack) {
    if (!S.doc) return;
    hideSelectionBar();
    const rs = S.fastReader && reader && reader.isOpen() ? reader.getState() : null;
    let layoutMode = S.liquidMode ? "liquid" : (rs ? (rs.layout === "two-page" ? "two" : rs.layout === "single" ? "single" : "continuous") : S.readerLayout);

    const applyLayout = async (mode, close) => {
      if (mode === "liquid") { close(); setLiquidMode(true); return; }
      if (S.liquidMode) setLiquidMode(false);
      const token = mode === "two" ? "two-page" : mode === "single" ? "single" : "continuous";
      S.readerLayout = token;
      if (S.fastReader && reader && reader.isOpen()) {
        reader.setLayout(token);
        updatePageIndicator(S.doc.page, S.doc.pages);
      } else {
        await pc.set("layout", token).catch(() => {});
        await sleep(140);
        await fitWidth().catch(() => {});
      }
      close();
    };

    const makeToggle = (ic, label, get, onToggle) => {
      const sw = h("button", { class: "pc-switch", type: "button", role: "switch", "aria-checked": String(get()), "aria-label": label });
      sw.addEventListener("click", () => { onToggle(!get()); sw.setAttribute("aria-checked", String(get())); });
      return h("div", { class: "pc-toggle-row" },
        h("div", { class: "pc-toggle-row-left" }, h("span", { icon: ic }), h("span", { text: label })),
        sw);
    };

    const dimSlider = h("input", { type: "range", min: "45", max: "100", value: String(prefs.brillo || 100), "aria-label": "Brillo" });
    dimSlider.addEventListener("input", () => { prefs.brillo = parseInt(dimSlider.value, 10) || 100; savePrefs(); applyReadingVisuals(); });

    sheet({
      title: "Ver configuración",
      onBack,
      build: (close) => [
        h("div", { class: "pc-flat-list" },
          [["continuous", "Continuo", "layout"],
           ["single", "Una sola página", "single"],
           ["two", "Dos páginas", "twoPage"],
           ["liquid", "Modo de lectura (Líquido)", "liquid"]].map(([id, label, ic]) => h("button", {
             class: "pc-item" + (layoutMode === id ? " pc-active-row" : ""), type: "button",
             onclick: () => applyLayout(id, close),
           }, h("span", { icon: ic }), h("span", { text: label }), layoutMode === id ? h("span", { icon: "check" }) : null))),
        h("div", { class: "pc-list" },
          makeToggle("moon", "Modo nocturno", () => prefs.lectura === "noche", (v) => { prefs.lectura = v ? "noche" : "normal"; savePrefs(); applyReadingVisuals(); }),
          makeToggle("sun", "Tono sepia", () => prefs.lectura === "sepia", (v) => { prefs.lectura = v ? "sepia" : "normal"; savePrefs(); applyReadingVisuals(); }),
          makeToggle("iphone", "Mantener pantalla encendida", () => !!prefs.pantallaActiva, (v) => { prefs.pantallaActiva = v; savePrefs(); syncWakeLock(); })),
        h("div", { class: "pc-label", text: "Brillo y ajuste" }),
        h("div", { class: "pc-list" },
          h("div", { class: "pc-slider-row" }, h("span", { icon: "sun", style: "opacity:.45" }), dimSlider, h("span", { icon: "sun" }))),
        h("div", { class: "pc-btn-row" },
          h("button", { class: "pc-secondary", type: "button", text: "Ancho", onclick: () => { close(); if (S.fastReader && reader) reader.fitWidth(); else fitWidth().catch(() => {}); } }),
          h("button", { class: "pc-secondary", type: "button", text: "Página", onclick: () => { close(); if (S.fastReader && reader) reader.fitPage(); else pc.run("view.fit_one_page").catch(() => {}); } }),
          h("button", { class: "pc-secondary", type: "button", text: "100 %", onclick: () => { close(); if (S.fastReader && reader) reader.setZoomPercent(100); else pc.set("zoom", "100").catch(() => {}); } }),
          h("button", { class: "pc-secondary", type: "button", icon: "rotate", "aria-label": "Rotar", onclick: () => { if (S.fastReader && reader) { reader.rotateCw(); S.readerRotation = reader.getState().rotation; } else pc.run("view.rotate.cw").catch(() => {}); } })),
      ],
    });
  }

  function goToPageSheet() {
    if (!S.doc) return;
    const total = S.doc.pages || 1;
    const cur = S.doc.page || 1;
    const input = h("input", {
      class: "pc-field", type: "number", inputmode: "numeric",
      min: "1", max: String(total), placeholder: "1 – " + total, "aria-label": "Número de página",
    });
    const jump = (n, close) => {
      const target = Math.max(1, Math.min(total, n));
      if (S.fastReader && reader && reader.isOpen()) reader.goToPage(target, { recordHistory: true, instant: true });
      else pc.set("page", String(target)).catch(() => {});
      if (S.doc) { S.doc.page = target; updatePageIndicator(target, total); saveLastPage(); }
      close();
    };
    sheet({
      title: "Ir a la página",
      text: "Actualmente en página " + cur + " de " + total,
      build: (close) => {
        const go = () => { const n = parseInt(input.value, 10); if (n) jump(n, close); };
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
        return [
          h("div", { class: "pc-btn-row" },
            h("button", { class: "pc-secondary", type: "button", text: "Inicio", onclick: () => jump(1, close) }),
            h("button", { class: "pc-secondary", type: "button", text: "← Ant.", disabled: cur <= 1, onclick: () => jump(cur - 1, close) }),
            h("button", { class: "pc-secondary", type: "button", text: "Sig. →", disabled: cur >= total, onclick: () => jump(cur + 1, close) }),
            h("button", { class: "pc-secondary", type: "button", text: "Final", onclick: () => jump(total, close) })),
          input,
          h("button", { class: "pc-primary", type: "button", text: "Ir a página", onclick: go }),
        ];
      },
    });
    input.focus();
  }

  // ---------- Menú ••• del visor (exacto a Capturas 16, 20, 21 — sin banners de suscripción) ----------
  function moreMenu() {
    if (!S.doc) return;
    hideSelectionBar();
    const meta = S.doc.meta;
    sheet({
      title: meta.nombre,
      text: "PDF · " + describe(meta) + " · Pág. " + (S.doc.page || 1) + " de " + S.doc.pages,
      starMeta: meta,
      build: (close) => [
        h("div", { class: "pc-flat-list" }, [
          { i: "glasses",  t: "Ver configuración",         chev: true, run: () => { close(); viewSettingsSheet(() => moreMenu()); } },
          { i: "gridView", t: "Páginas",                   chev: true, run: () => { close(); openPagesOverlay("view"); } },
          { i: "bookmark", t: "Marcadores",                chev: true, run: () => { close(); bookmarksSheet(() => moreMenu()); } },
          { i: "comment",  t: "Comentarios",               chev: true, run: () => { close(); openPanel("comments"); } },
          { i: "copy",     t: "Copiar texto (página o rango)",         run: () => { close(); copyTextRangeSheet(); } },
          { i: "editBox",  t: "Editar PDF",                            run: () => { close(); enterMode("editar"); } },
          { i: "organize", t: "Organizar páginas",                     run: () => { close(); openPagesOverlay("organize"); } },
          { i: "exportDoc",t: "Exportar como…",            chev: true, run: () => { close(); exportMenuSheet(() => moreMenu()); } },
          { i: "combine",  t: "Combinar archivos",                     run: () => { close(); openCombineSheet(meta); } },
          { i: "speaker",  t: "Leer en voz alta",                      run: () => { close(); toggleTts(); } },
          { i: "spaces",   t: "Añadir a un Espacio PDF",               run: () => { close(); addDocToSpaceSheet(meta); } },
          { i: "compress", t: "Comprimir PDF",                         run: () => { close(); runCommand("optimize.reduce", "Comprimir PDF"); } },
          { i: "lock",     t: "Definir contraseña",                    run: () => { close(); runCommand("protect.password", "Proteger"); } },
          { i: "tools",    t: "Ver todas las herramientas",            run: () => { close(); allDocToolsSheet(); } },
          { i: "share",    t: "Compartir",                             run: () => { close(); shareCurrent(); } },
          { i: "copy",     t: "Guardar una copia",                     run: () => { close(); duplicateFile(meta); } },
          { i: "print",    t: "Imprimir",                              run: () => { close(); runCommand("print.dialog", "Imprimir"); } },
          { i: "layers",   t: "Capas y adjuntos",          chev: true, run: () => { close(); panelsSubSheet(() => moreMenu()); } },
          { i: "desktop",  t: "Interfaz completa (PC)",                run: () => { close(); setDesktop(true); } },
        ].map((it) => h("button", { class: "pc-item", type: "button", onclick: it.run },
          h("span", { icon: it.i }),
          h("span", { text: it.t }),
          it.chev ? h("span", { class: "pc-loc-chev", icon: "chevRight" }) : null))),
      ],
    });
  }

  function panelsSubSheet(onBack) {
    sheet({
      title: "Paneles y propiedades",
      onBack,
      build: (close) => [list([
        { i: "layers", t: "Capas del PDF", run: () => { close(); openPanel("layers"); } },
        { i: "clip", t: "Archivos adjuntos", run: () => { close(); openPanel("attachments"); } },
        { i: "sign", t: "Firmas digitales", run: () => { close(); openPanel("signatures"); } },
        { i: "info", t: "Propiedades del documento", run: () => { close(); runCommand("file.properties", "Propiedades"); } },
        { i: "text", t: "Contar palabras", run: () => { close(); runCommand("file.word_count", "Contar palabras"); } },
      ])],
    });
  }

  // ---------- Ajustes ----------
  function settingsSheet() {
    const nameInput = h("input", { class: "pc-field", type: "text", value: prefs.nombre, placeholder: "Ej. Sebastian", autocomplete: "name" });
    nameInput.addEventListener("change", () => {
      prefs.nombre = nameInput.value.trim().slice(0, 120);
      savePrefs();
      if (prefs.nombre && S.ready) pc.set("author", prefs.nombre).catch(() => {});
      if (!body.classList.contains("pc-in-viewer")) renderShell();
    });
    const seg = (key, options, onChange) => {
      const wrap = h("div", { class: "pc-seg", role: "group" });
      const draw = () => wrap.replaceChildren(...options.map(([val, label]) => h("button", {
        type: "button", "aria-pressed": String(prefs[key] === val), text: label,
        onclick: () => { prefs[key] = val; savePrefs(); draw(); onChange(val); },
      })));
      draw(); return wrap;
    };
    sheet({
      title: "Ajustes",
      build: (close) => [
        h("div", { class: "pc-label", text: "Apariencia" }),
        seg("tema", [["oscuro", "Oscuro"], ["claro", "Claro"], ["auto", "Sistema"]], (v) => {
          applyThemeAttr();
          if (S.ready) pc.run(v === "auto" ? "view.theme.system" : v === "oscuro" ? "view.theme.dark" : "view.theme.light").catch(() => {});
        }),
        h("div", { class: "pc-label", text: "Modo de lectura" }),
        seg("lectura", [["normal", "Normal"], ["noche", "Nocturno"], ["sepia", "Sepia"]], () => applyReadingVisuals()),
        h("div", { class: "pc-label", text: "Fluidez y nitidez" }),
        seg("calidad", [["fluida", "Fluida (2×)"], ["rapida", "Ultra rápida"], ["maxima", "Máxima (3×)"]], (v) => {
          const realDpr = window.__pdfcraftNativeDpr || window.devicePixelRatio || 1;
          const wanted = Math.min(realDpr, v === "maxima" ? realDpr : v === "rapida" ? 1.5 : 2);
          if (Math.abs(wanted - (window.__pdfcraftActiveDpr || realDpr)) > 0.01) {
            if (!S.doc) { close(); setTimeout(() => location.reload(), 250); }
            else toast("Se aplicará al volver a Inicio.", 3500);
          }
        }),
        h("div", { class: "pc-label", text: "Tu nombre (saludo, firmas y comentarios)" }),
        nameInput,
        list([
          { i: "sign", t: "Editar mi firma guardada", run: () => { close(); runCommand("sign.fill.signature.change", "Firma"); } },
          { i: "refresh", t: "Buscar actualizaciones", run: () => { close(); if (window.pdfcraftCheckUpdate) window.pdfcraftCheckUpdate(); } },
          { i: "desktop", t: "Interfaz completa (PC)", small: "Escritorio", run: () => { close(); setDesktop(true); } },
        ]),
        h("p", { text: "PdfCraft para iPhone v3.0 · Lector PDF.js (streaming para libros grandes), Organizar nativo pdf-lib y Editor PdfCraft. 100 % local." + (S.appVersion ? " Motor " + S.appVersion + "." : "") }),
      ],
    });
  }

  // ---------- Modo escritorio completo ----------
  let backButton = null;
  async function setDesktop(on) {
    try { await ensureEngineReady(); } catch (e) { toast(e.message); return; }
    if (on && S.panel) await closePanel(true);
    if (on && S.mode) await exitMode(true);
    if (on && S.searching) closeSearch();
    if (on && S.liquidMode) setLiquidMode(false);
    setImmersive(false); hideSelectionBar(); hideAnnotBar();
    if (on && S.doc && S.fastReader) {
      if (!(await ensureInEngine("Abriendo modo completo…"))) return;
    }
    S.desktop = on;
    body.classList.toggle("pc-desktop", on);
    if (on) {
      setFastReader(false); showViewer();
      backButton = backButton || h("button", { class: "pc-back-mobile", type: "button", text: "Volver a vista móvil", onclick: () => setDesktop(false) });
      body.append(backButton);
    } else if (backButton) backButton.remove();
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
          await returnToFastReader();
          renderTop(); renderBottom();
        }
      }
    } catch (e) {}
  }

  // ---------- Hojas modales iOS (Bottom Sheets) ----------
  function sheet({ title, text, starMeta, onBack, build, onClose }) {
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

    let starBtn = null;
    if (starMeta) {
      starBtn = h("button", {
        class: "pc-icon-btn" + (starMeta.destacado ? " pc-starred" : ""),
        type: "button", "aria-label": "Destacar",
        [starMeta.destacado ? "iconFilled" : "icon"]: "star",
        onclick: async () => {
          await toggleStar(starMeta);
          starBtn.classList.toggle("pc-starred", !!starMeta.destacado);
          starBtn.innerHTML = icon("star", !!starMeta.destacado);
          toast(starMeta.destacado ? "Añadido a Destacados" : "Quitado de Destacados");
        },
      });
    }

    const headRow = h("div", { class: "pc-sheet-head" },
      onBack ? h("button", { class: "pc-sheet-back", type: "button", "aria-label": "Volver", icon: "back", onclick: () => { close(); onBack(); } }) : null,
      h("div", { class: "pc-sheet-head-txt" }, h("h3", { text: title }), text ? h("small", { text }) : null),
      starBtn || h("button", { class: "pc-icon-btn", type: "button", "aria-label": "Cerrar", icon: "close", onclick: close }));

    const panel = h("div", { class: "pc-sheet" }, h("div", { class: "pc-grabber" }), headRow, build(close));
    wrap.append(h("div", { class: "pc-scrim", onclick: close }), panel);
    document.body.append(wrap);
    document.addEventListener("keydown", onKey);
    return close;
  }

  function list(items) {
    return h("div", { class: "pc-list" }, items.map((it) => h("button", {
      class: "pc-item" + (it.danger ? " pc-danger" : ""), type: "button", onclick: it.run,
    }, h("span", { icon: it.i }), h("span", { text: it.t }), it.small ? h("small", { text: it.small }) : null)));
  }

  window.pdfcraftMobile = {
    openDocument,
    openPagesOverlay,
    setLiquidMode,
    toggleTts,
    copyTextRangeSheet,
    getState: () => ({
      tab: S.tab, fastReader: S.fastReader, liquidMode: S.liquidMode,
      ttsActive: S.ttsActive, mode: S.mode, ready: S.ready, opening: S.opening,
      doc: S.doc ? { page: S.doc.page, pages: S.doc.pages, name: S.doc.meta.nombre } : null,
    }),
  };
})();
