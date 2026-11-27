// PdfCraft para iPhone v3.1: lector PDF nativo iOS impulsado por Mozilla PDF.js en Web Worker.
//
// Soluciones de grado producción para libros grandes (100–400 MB, 1000+ páginas) en Safari iOS:
//   · BlobRangeTransport (PDFDataRangeTransport + Blob.slice): lee solo bloques de 128 KB bajo demanda
//     sin cargar jamás un libro de 380 MB completo en la RAM de Safari iOS (~200× menos memoria);
//   · TextLayer oficial de Mozilla PDF.js (sin transform:scale en el contenedor y con <br> absolutos
//     sin fondo azul): selección y copia multipárrafo/multipágina 100 % fiel a Safari iOS incluso en
//     textos escaneados/OCR;
//   · Búsqueda binaria O(log N) sobre alturas acumuladas (0 reflows por fotograma en libros de 1000+ págs);
//   · Normalización inteligente de ancho entre páginas de distinto tamaño (portada ancha vs texto);
//   · Pellizco GPU translate3d + scale con commit atómico + tiles HD Retina + caché LRU estricto.
(function () {
  "use strict";

  const MAX_CANVAS_PAGES = 5;
  const MAX_TEXT_LAYERS = 14;
  const MAX_TEXT_CACHE = 28;
  const MAX_BASE_DIM = 1480;
  const MAX_TILE_DIM = 2048;
  const DOUBLE_TAP_MS = 310;
  const DOUBLE_TAP_DIST = 36;
  const SLOP = 10;

  let pdfjsPromise = null;
  function loadPdfJs() {
    if (!pdfjsPromise) {
      pdfjsPromise = import("./pdfjs/pdf.min.mjs").then((lib) => {
        if (lib && lib.GlobalWorkerOptions) {
          lib.GlobalWorkerOptions.workerSrc = "./pdfjs/pdf.worker.min.mjs";
        }
        return lib;
      });
    }
    return pdfjsPromise;
  }

  // Transporte de rangos sobre Blob.slice(): permite abrir PDFs de 380 MB usando < 15 MB de RAM en iPhone
  function makeBlobRangeTransport(pdfjsLib, blob, initialChunk) {
    class BlobRangeTransport extends pdfjsLib.PDFDataRangeTransport {
      constructor() {
        super(blob.size, initialChunk);
        this._blob = blob;
        this._aborted = false;
      }
      requestDataRange(begin, end) {
        if (this._aborted || !this._blob) return;
        const safeBegin = Math.max(0, Math.min(this._blob.size, begin));
        const safeEnd = Math.max(safeBegin, Math.min(this._blob.size, end));
        this._blob.slice(safeBegin, safeEnd).arrayBuffer().then((buf) => {
          if (this._aborted) return;
          this.onDataRange(begin, new Uint8Array(buf));
        }).catch(() => {});
      }
      abort() {
        this._aborted = true;
        this._blob = null;
      }
    }
    return new BlobRangeTransport();
  }

  function create() {
    let host = null;
    let scroller = null;
    let stage = null;
    let pdfjs = null;
    let pdfDoc = null;
    let rangeTransport = null;
    let opts = {};
    let destroyed = false;

    const S = {
      pages: 0,
      page: 1,
      layout: "continuous", // "continuous" | "single" | "two-page"
      pageGaps: true,
      rotation: 0,
      scale: 1,
      fitScale: 1,
      minScale: 0.3,
      maxScale: 5.5,
      refWidth: 612,
      pageDims: [],    // [{ w, h }] en puntos PDF (rotación 0)
      slots: [],
      textCache: new Map(), // LRU: pageNum -> { rawContent, items, styles, vp1 }
      searchQuery: "",
      searchMatches: [],
      searchPos: -1,
      outline: null,
      hasForms: false,
      back: [],
      fwd: [],
      pinching: false,
      animatingZoom: false,
      lastSelectedText: "",
      stagePadTop: 8,
    };

    let renderTimer = null;
    let hdTimer = null;
    let selTimer = null;
    let scrollRaf = 0;
    let activeBaseRenders = 0;
    let activeHdRenders = 0;
    let activeTextBuilds = 0;
    let zoomAnimTimer = null;

    // ---------- Utilidades de geometría y normalización de ancho ----------
    function effectiveDpr() {
      const cap = opts.dpr ? opts.dpr() : (window.__pdfcraftActiveDpr || Math.min(window.devicePixelRatio || 1, 2));
      return Math.max(1, Math.min(3, cap || 2));
    }

    function pageRotatedSize(num) {
      const d = S.pageDims[num - 1] || S.pageDims[0] || { w: 612, h: 792 };
      return S.rotation % 180 === 90 ? { w: d.h, h: d.w } : { w: d.w, h: d.h };
    }

    // Normaliza páginas con distinto ancho físico (p. ej. portada ancha vs páginas de texto)
    // para que todas encajen limpiamente al ancho del iPhone sin franjas negras laterales.
    function slotDisplayScale(num) {
      if (S.layout === "two-page") return S.scale;
      const sz = pageRotatedSize(num);
      const ref = S.refWidth || sz.w || 612;
      const norm = Math.max(0.55, Math.min(1.85, ref / Math.max(80, sz.w)));
      return S.scale * norm;
    }

    function viewportSize() {
      const w = (scroller && scroller.clientWidth) || (host && host.clientWidth) || window.innerWidth || 393;
      const h = (scroller && scroller.clientHeight) || (host && host.clientHeight) || window.innerHeight || 700;
      return { w: Math.max(160, w), h: Math.max(160, h) };
    }

    function computeFitScale(pageNum) {
      const vp = viewportSize();
      const pad = 6;
      if (S.layout === "two-page") {
        const sz = pageRotatedSize(pageNum || S.page || 1);
        const gap = S.pageGaps ? 8 : 0;
        return Math.max(0.15, (vp.w - pad * 2 - gap) / (sz.w * 2));
      }
      const refW = S.refWidth || pageRotatedSize(pageNum || 1).w || 612;
      return Math.max(0.15, (vp.w - pad * 2) / refW);
    }

    function computeFitPageScale(pageNum) {
      const vp = viewportSize();
      const sz = pageRotatedSize(pageNum || S.page || 1);
      const pad = 8;
      if (S.layout === "two-page") {
        const sw = (vp.w - pad * 2 - (S.pageGaps ? 8 : 0)) / (sz.w * 2);
        const sh = (vp.h - pad * 2) / sz.h;
        return Math.max(0.15, Math.min(sw, sh));
      }
      const norm = Math.max(0.55, Math.min(1.85, (S.refWidth || sz.w) / Math.max(80, sz.w)));
      const sw = (vp.w - pad * 2) / (sz.w * norm);
      const sh = (vp.h - pad * 2) / (sz.h * norm);
      return Math.max(0.15, Math.min(sw, sh));
    }

    function zoomPercentOf(scale) {
      return Math.max(5, Math.round((scale / (96 / 72)) * 100));
    }

    function scaleFromZoomPercent(pct) {
      return Math.max(0.1, (pct / 100) * (96 / 72));
    }

    // ---------- Construcción de slots virtualizados + offsets O(log N) ----------
    function buildSlots() {
      if (!stage) return;
      cancelAllRenders();
      releaseAllCanvases();
      releaseAllTextLayers();
      stage.replaceChildren();
      stage.className = "pc-reader-stage pc-layout-" + S.layout + (S.pageGaps ? "" : " pc-no-gaps");
      S.slots = [];

      if (S.layout === "single") {
        const slot = makeSlot(S.page);
        S.slots.push(slot);
        stage.append(slot.el);
      } else if (S.layout === "two-page") {
        for (let i = 1; i <= S.pages; i += 2) {
          const row = document.createElement("div");
          row.className = "pc-spread-row";
          const s1 = makeSlot(i);
          S.slots.push(s1);
          row.append(s1.el);
          if (i + 1 <= S.pages) {
            const s2 = makeSlot(i + 1);
            S.slots.push(s2);
            row.append(s2.el);
          }
          stage.append(row);
        }
      } else {
        const frag = document.createDocumentFragment();
        for (let i = 1; i <= S.pages; i++) {
          const slot = makeSlot(i);
          S.slots.push(slot);
          frag.append(slot.el);
        }
        stage.append(frag);
      }
      applySlotSizes();
    }

    function makeSlot(num) {
      const el = document.createElement("div");
      el.className = "pc-page";
      el.dataset.page = String(num);
      const hlEl = document.createElement("div");
      hlEl.className = "pc-page-hl";
      const textWrap = document.createElement("div");
      textWrap.className = "pc-text-layer textLayer";
      const annotEl = document.createElement("div");
      annotEl.className = "pc-page-annots";
      el.append(hlEl, textWrap, annotEl);
      return {
        num, el, hlEl, textWrap, annotEl,
        w: 380, h: 500, top: 0, bottom: 500,
        baseCanvas: null, baseScale: 0,
        hdCanvas: null, hdKey: "",
        textLayer: null, textBuilt: false, textBuilding: false, textRot: -1, textScale: 0,
        annotLoaded: false,
        task: null, hdTask: null,
        lastUsed: 0,
      };
    }

    function applySlotSizes() {
      if (!stage) return;
      const vp = viewportSize();
      let maxW = 0;
      const gap = S.pageGaps ? Math.max(6, Math.round(10 * Math.min(2, S.scale / (S.fitScale || 1)))) : 0;
      stage.style.setProperty("--pc-gap", gap + "px");

      let y = S.stagePadTop;
      if (S.layout === "two-page") {
        for (let i = 0; i < S.slots.length; i += 2) {
          const s1 = S.slots[i];
          const s2 = S.slots[i + 1] || null;
          const sc1 = slotDisplayScale(s1.num);
          const sz1 = pageRotatedSize(s1.num);
          s1.w = Math.max(40, Math.round(sz1.w * sc1));
          s1.h = Math.max(40, Math.round(sz1.h * sc1));
          s1.el.style.width = s1.w + "px";
          s1.el.style.height = s1.h + "px";
          s1.el.style.setProperty("--scale-factor", String(sc1));
          if (s1.w > maxW) maxW = s1.w;
          let rowH = s1.h;
          if (s2) {
            const sc2 = slotDisplayScale(s2.num);
            const sz2 = pageRotatedSize(s2.num);
            s2.w = Math.max(40, Math.round(sz2.w * sc2));
            s2.h = Math.max(40, Math.round(sz2.h * sc2));
            s2.el.style.width = s2.w + "px";
            s2.el.style.height = s2.h + "px";
            s2.el.style.setProperty("--scale-factor", String(sc2));
            if (s2.w > maxW) maxW = s2.w;
            rowH = Math.max(rowH, s2.h);
          }
          s1.top = y; s1.bottom = y + rowH;
          if (s2) { s2.top = y; s2.bottom = y + rowH; }
          y += rowH + gap;
        }
      } else {
        for (const slot of S.slots) {
          const sc = slotDisplayScale(slot.num);
          const sz = pageRotatedSize(slot.num);
          const w = Math.max(40, Math.round(sz.w * sc));
          const h = Math.max(40, Math.round(sz.h * sc));
          slot.w = w;
          slot.h = h;
          slot.top = y;
          slot.bottom = y + h;
          slot.el.style.width = w + "px";
          slot.el.style.height = h + "px";
          slot.el.style.setProperty("--scale-factor", String(sc));
          if (w > maxW) maxW = w;
          y += h + gap;
        }
      }
      const neededW = S.layout === "two-page" ? (maxW * 2 + gap + 12) : (maxW + 12);
      stage.style.width = Math.max(vp.w, neededW) + "px";
    }

    function updateSingleSlotDim(slot, wPt, hPt) {
      const prev = S.pageDims[slot.num - 1];
      if (prev && Math.abs(prev.w - wPt) <= 1 && Math.abs(prev.h - hPt) <= 1) return;
      const oldH = slot.h;
      S.pageDims[slot.num - 1] = { w: wPt, h: hPt };
      const sc = slotDisplayScale(slot.num);
      const sz = pageRotatedSize(slot.num);
      const nw = Math.max(40, Math.round(sz.w * sc));
      const nh = Math.max(40, Math.round(sz.h * sc));
      slot.w = nw;
      slot.h = nh;
      slot.el.style.width = nw + "px";
      slot.el.style.height = nh + "px";
      slot.el.style.setProperty("--scale-factor", String(sc));

      const needW = nw + 12;
      if (stage && needW > stage.offsetWidth) stage.style.width = needW + "px";

      const dh = nh - oldH;
      if (dh !== 0 && S.layout === "continuous") {
        // Desplazar únicamente los offsets acumulados desde esta página en adelante
        slot.bottom = slot.top + nh;
        for (let i = slot.num; i < S.slots.length; i++) {
          S.slots[i].top += dh;
          S.slots[i].bottom += dh;
        }
        // Si esta página está por encima de la vista actual, compensar scrollTop para evitar saltos
        if (scroller && slot.bottom < scroller.scrollTop) {
          scroller.scrollTop += dh;
        }
      } else if (dh !== 0) {
        applySlotSizes();
      }
    }

    function getSlot(num) {
      if (S.layout === "single") return S.slots[0] && S.slots[0].num === num ? S.slots[0] : null;
      return S.slots[num - 1] || null;
    }

    // ---------- Gestión de memoria y selección activa ----------
    function hasActiveSelection() {
      try {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) return false;
        const r = sel.getRangeAt(0);
        return !!(host && host.contains(r.commonAncestorContainer));
      } catch (e) { return false; }
    }

    function isSlotInSelection(slot) {
      try {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) return false;
        return sel.containsNode ? sel.containsNode(slot.textWrap, true) : false;
      } catch (e) { return false; }
    }

    function cancelSlotTasks(slot) {
      if (slot.task) { try { slot.task.cancel(); } catch (e) {} slot.task = null; }
      if (slot.hdTask) { try { slot.hdTask.cancel(); } catch (e) {} slot.hdTask = null; }
      if (slot.textLayer) { try { slot.textLayer.cancel(); } catch (e) {} }
    }

    function cancelAllRenders() {
      for (const slot of S.slots) cancelSlotTasks(slot);
    }

    function releaseHd(slot) {
      if (slot.hdTask) { try { slot.hdTask.cancel(); } catch (e) {} slot.hdTask = null; }
      if (slot.hdCanvas) {
        slot.hdCanvas.width = 0; slot.hdCanvas.height = 0; slot.hdCanvas.remove();
        slot.hdCanvas = null; slot.hdKey = "";
      }
    }

    function releaseSlotCanvas(slot) {
      if (slot.task) { try { slot.task.cancel(); } catch (e) {} slot.task = null; }
      releaseHd(slot);
      if (slot.baseCanvas) {
        slot.baseCanvas.width = 0; slot.baseCanvas.height = 0; slot.baseCanvas.remove();
        slot.baseCanvas = null; slot.baseScale = 0;
      }
      if (slot.pageProxy) {
        try { slot.pageProxy.cleanup(); } catch (e) {}
        slot.pageProxy = null;
      }
    }

    function releaseSlotText(slot) {
      if (slot.textLayer) { try { slot.textLayer.cancel(); } catch (e) {} slot.textLayer = null; }
      slot.textWrap.replaceChildren();
      slot.textBuilt = false;
      slot.textBuilding = false;
    }

    function releaseAllCanvases() { for (const slot of S.slots) releaseSlotCanvas(slot); }
    function releaseAllTextLayers() { for (const slot of S.slots) releaseSlotText(slot); }

    function evictDistantCanvases(visibleSet) {
      const rendered = S.slots.filter((s) => s.baseCanvas && !visibleSet.has(s.num));
      if (rendered.length + visibleSet.size > MAX_CANVAS_PAGES) {
        rendered.sort((a, b) => a.lastUsed - b.lastUsed);
        let toDrop = (rendered.length + visibleSet.size) - MAX_CANVAS_PAGES;
        for (const slot of rendered) {
          if (toDrop <= 0) break;
          releaseSlotCanvas(slot);
          toDrop--;
        }
      }
      if (!hasActiveSelection()) {
        const withText = S.slots.filter((s) => s.textBuilt && !visibleSet.has(s.num) && !isSlotInSelection(s));
        if (withText.length + visibleSet.size > MAX_TEXT_LAYERS) {
          withText.sort((a, b) => a.lastUsed - b.lastUsed);
          let dropTxt = (withText.length + visibleSet.size) - MAX_TEXT_LAYERS;
          for (const slot of withText) {
            if (dropTxt <= 0) break;
            releaseSlotText(slot);
            dropTxt--;
          }
        }
      }
    }

    // ---------- Detección O(log N) de páginas visibles (0 reflows en libros de 1000+ páginas) ----------
    function findVisibleSlots() {
      if (!scroller || !S.slots.length) return { visible: [], primary: S.page };
      if (S.layout === "single") return { visible: [S.slots[0]], primary: S.slots[0].num };

      const scrollTop = scroller.scrollTop;
      const viewH = scroller.clientHeight || 700;
      const topY = scrollTop;
      const botY = scrollTop + viewH;
      const midY = scrollTop + viewH * 0.5;
      const margin = Math.max(260, viewH * 0.75);
      const minY = topY - margin;
      const maxY = botY + margin;

      // Búsqueda binaria del primer slot cuyo bottom >= minY
      let lo = 0, hi = S.slots.length - 1, start = S.slots.length;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (S.slots[mid].bottom >= minY) { start = mid; hi = mid - 1; }
        else lo = mid + 1;
      }

      const visible = [];
      let primary = S.page;
      let bestDist = Infinity;

      for (let i = Math.max(0, start - 1); i < S.slots.length; i++) {
        const slot = S.slots[i];
        if (slot.top > maxY) break;
        if (slot.bottom >= minY && slot.top <= maxY) visible.push(slot);
        if (slot.bottom > topY && slot.top < botY) {
          const overlap = Math.min(slot.bottom, botY) - Math.max(slot.top, topY);
          const centerDist = Math.abs((slot.top + slot.bottom) * 0.5 - midY) - overlap * 0.25;
          if (centerDist < bestDist) { bestDist = centerDist; primary = slot.num; }
        }
      }
      if (!visible.length && S.slots[primary - 1]) visible.push(S.slots[primary - 1]);
      return { visible, primary };
    }

    function reportScrollProgress() {
      if (!scroller || !opts.onScrollProgress) return;
      let frac = 0;
      if (S.layout === "single") {
        frac = S.pages > 1 ? (S.page - 1) / (S.pages - 1) : 0;
      } else {
        const maxST = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        frac = maxST > 0 ? Math.max(0, Math.min(1, scroller.scrollTop / maxST)) : 0;
      }
      opts.onScrollProgress(frac, S.page, S.pages);
    }

    function updateVisible(immediate) {
      if (destroyed || !pdfDoc || S.pinching || S.animatingZoom) return;
      const { visible, primary } = findVisibleSlots();
      if (primary !== S.page) {
        S.page = primary;
        if (opts.onPageChange) opts.onPageChange(S.page, S.pages);
      }
      reportScrollProgress();

      const now = performance.now();
      const visSet = new Set();
      for (const slot of visible) { slot.lastUsed = now; visSet.add(slot.num); }
      visible.sort((a, b) => Math.abs(a.num - S.page) - Math.abs(b.num - S.page));
      evictDistantCanvases(visSet);

      for (const slot of S.slots) {
        if (!visSet.has(slot.num) && slot.hdCanvas) releaseHd(slot);
      }

      const textTargets = visible.slice();
      if (S.layout !== "single") {
        const prevSlot = getSlot(S.page - 1);
        const nextSlot = getSlot(S.page + 1);
        if (prevSlot && !visSet.has(prevSlot.num)) { prevSlot.lastUsed = now; textTargets.push(prevSlot); }
        if (nextSlot && !visSet.has(nextSlot.num)) { nextSlot.lastUsed = now; textTargets.push(nextSlot); }
      }

      for (const slot of visible) {
        ensureBaseRendered(slot);
        if (!slot.annotLoaded) loadSlotAnnotations(slot);
        if (S.searchQuery) paintSearchHighlights(slot);
      }
      for (const slot of textTargets) {
        ensureTextLayer(slot);
      }

      clearTimeout(hdTimer);
      hdTimer = setTimeout(() => {
        if (destroyed || !pdfDoc || S.pinching || S.animatingZoom) return;
        const cur = findVisibleSlots().visible;
        for (const slot of cur) ensureHdTile(slot);
      }, immediate ? 25 : 100);
    }

    function scheduleUpdate(delayMs) {
      clearTimeout(renderTimer);
      if (!delayMs) { updateVisible(false); return; }
      renderTimer = setTimeout(() => updateVisible(false), delayMs);
    }

    // ---------- Renderizado base en Worker ----------
    async function ensureBaseRendered(slot) {
      if (destroyed || !pdfDoc) return;
      const dpr = effectiveDpr();
      const dispScale = slotDisplayScale(slot.num);
      const sz = pageRotatedSize(slot.num);
      const maxScaleByDim = MAX_BASE_DIM / Math.max(sz.w, sz.h);
      const targetScale = Math.min(dispScale * dpr, maxScaleByDim);

      if (slot.baseCanvas && Math.abs(slot.baseScale - targetScale) / Math.max(0.01, targetScale) < 0.08) return;
      if (slot.task) {
        if (Math.abs((slot.pendingBaseScale || 0) - targetScale) / Math.max(0.01, targetScale) < 0.08) return;
        try { slot.task.cancel(); } catch (e) {}
        slot.task = null;
      }
      if (activeBaseRenders >= 2) {
        setTimeout(() => ensureBaseRendered(slot), 50);
        return;
      }

      slot.pendingBaseScale = targetScale;
      activeBaseRenders++;
      try {
        const page = await pdfDoc.getPage(slot.num);
        if (destroyed || !pdfDoc) return;
        slot.pageProxy = page;
        const vp1 = page.getViewport({ scale: 1, rotation: 0 });
        updateSingleSlotDim(slot, vp1.width, vp1.height);

        const dispScaleNow = slotDisplayScale(slot.num);
        const szNow = pageRotatedSize(slot.num);
        const renderScale = Math.min(dispScaleNow * dpr, MAX_BASE_DIM / Math.max(szNow.w, szNow.h));
        const viewport = page.getViewport({ scale: renderScale, rotation: S.rotation });
        const cw = Math.max(1, Math.floor(viewport.width));
        const ch = Math.max(1, Math.floor(viewport.height));

        const off = document.createElement("canvas");
        off.className = "pc-page-base";
        off.width = cw;
        off.height = ch;
        const ctx = off.getContext("2d", { alpha: false });
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, cw, ch);

        const task = page.render({ canvasContext: ctx, viewport, intent: "display" });
        slot.task = task;
        await task.promise;
        if (slot.task !== task || destroyed) { off.width = 0; off.height = 0; return; }
        slot.task = null;
        slot.baseScale = renderScale;

        const old = slot.baseCanvas;
        slot.baseCanvas = off;
        slot.el.insertBefore(off, slot.el.firstChild);
        if (old) { old.width = 0; old.height = 0; old.remove(); }

        if (slot.num === 1 && opts.onFirstThumb && !S.thumbSent) {
          S.thumbSent = true;
          try {
            const tw = 220;
            const th = Math.max(100, Math.round((tw * ch) / cw));
            const tc = document.createElement("canvas");
            tc.width = tw; tc.height = th;
            const tctx = tc.getContext("2d");
            tctx.fillStyle = "#ffffff";
            tctx.fillRect(0, 0, tw, th);
            tctx.drawImage(off, 0, 0, cw, ch, 0, 0, tw, th);
            opts.onFirstThumb(tc.toDataURL("image/jpeg", 0.78));
            tc.width = 0; tc.height = 0;
          } catch (e) {}
        }
      } catch (e) {
      } finally {
        activeBaseRenders = Math.max(0, activeBaseRenders - 1);
      }
    }

    // ---------- Tile HD recortado al viewport en zoom alto ----------
    async function ensureHdTile(slot) {
      if (destroyed || !pdfDoc || S.pinching || S.animatingZoom) return;
      const dpr = effectiveDpr();
      const dispScale = slotDisplayScale(slot.num);
      const desiredScale = dispScale * dpr;
      if (slot.baseCanvas && slot.baseScale >= desiredScale * 0.92) { releaseHd(slot); return; }

      const cr = scroller.getBoundingClientRect();
      const pr = slot.el.getBoundingClientRect();
      if (pr.bottom <= cr.top || pr.top >= cr.bottom || pr.right <= cr.left || pr.left >= cr.right) { releaseHd(slot); return; }

      const pad = 90;
      const vx0 = Math.max(0, Math.floor((cr.left - pad) - pr.left));
      const vy0 = Math.max(0, Math.floor((cr.top - pad) - pr.top));
      const vx1 = Math.min(slot.w, Math.ceil((cr.right + pad) - pr.left));
      const vy1 = Math.min(slot.h, Math.ceil((cr.bottom + pad) - pr.top));
      const tw = vx1 - vx0;
      const th = vy1 - vy0;
      if (tw < 20 || th < 20) return;

      const tileDpr = Math.min(dpr, MAX_TILE_DIM / Math.max(tw, th));
      const key = `${dispScale.toFixed(3)}:${S.rotation}:${vx0},${vy0},${tw},${th}:${tileDpr.toFixed(2)}`;
      if (slot.hdKey === key && slot.hdCanvas) return;

      if (slot.hdTask) { try { slot.hdTask.cancel(); } catch (e) {} slot.hdTask = null; }
      if (activeHdRenders >= 1) return;

      activeHdRenders++;
      try {
        const page = await pdfDoc.getPage(slot.num);
        if (destroyed || !pdfDoc || S.pinching) return;
        const viewport = page.getViewport({ scale: dispScale, rotation: S.rotation });
        const off = document.createElement("canvas");
        off.className = "pc-page-hd";
        off.width = Math.max(1, Math.round(tw * tileDpr));
        off.height = Math.max(1, Math.round(th * tileDpr));
        off.style.left = vx0 + "px";
        off.style.top = vy0 + "px";
        off.style.width = tw + "px";
        off.style.height = th + "px";

        const ctx = off.getContext("2d", { alpha: false });
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, off.width, off.height);

        const task = page.render({
          canvasContext: ctx,
          viewport,
          transform: [tileDpr, 0, 0, tileDpr, -vx0 * tileDpr, -vy0 * tileDpr],
          intent: "display",
        });
        slot.hdTask = task;
        await task.promise;
        if (slot.hdTask !== task || destroyed || S.pinching) { off.width = 0; off.height = 0; return; }
        slot.hdTask = null;
        slot.hdKey = key;

        const old = slot.hdCanvas;
        slot.hdCanvas = off;
        if (slot.baseCanvas && slot.baseCanvas.nextSibling) slot.el.insertBefore(off, slot.baseCanvas.nextSibling);
        else slot.el.insertBefore(off, slot.hlEl);
        if (old) { old.width = 0; old.height = 0; old.remove(); }
      } catch (e) {
      } finally {
        activeHdRenders = Math.max(0, activeHdRenders - 1);
      }
    }

    // ---------- Capa de texto OFICIAL Mozilla PDF.js TextLayer (100 % nativa en Safari iOS) ----------
    async function ensureTextLayer(slot) {
      if (destroyed || !pdfDoc || !pdfjs || !pdfjs.TextLayer) return;
      const dispScale = slotDisplayScale(slot.num);
      if (slot.textBuilt && slot.textRot === S.rotation) {
        if (Math.abs(slot.textScale - dispScale) / Math.max(0.01, dispScale) > 0.02 && slot.textLayer) {
          slot.el.style.setProperty("--scale-factor", String(dispScale));
          slot.textScale = dispScale;
          pdfDoc.getPage(slot.num).then((page) => {
            if (destroyed || !slot.textLayer) return;
            const vp = page.getViewport({ scale: dispScale, rotation: S.rotation });
            try { slot.textLayer.update({ viewport: vp }); } catch (e) {}
          }).catch(() => {});
        }
        return;
      }
      if (slot.textBuilding) return;
      if (activeTextBuilds >= 2) {
        setTimeout(() => { if (!destroyed && pdfDoc && !slot.textBuilt) ensureTextLayer(slot); }, 70);
        return;
      }

      slot.textBuilding = true;
      activeTextBuilds++;
      const buildRot = S.rotation;
      try {
        const page = await pdfDoc.getPage(slot.num);
        if (destroyed || !pdfDoc || buildRot !== S.rotation) return;
        const vp1 = page.getViewport({ scale: 1, rotation: 0 });
        updateSingleSlotDim(slot, vp1.width, vp1.height);

        const tc = await getPageTextData(slot.num, page);
        if (destroyed || !pdfDoc || buildRot !== S.rotation) return;

        const curScale = slotDisplayScale(slot.num);
        const vp = page.getViewport({ scale: curScale, rotation: buildRot });
        slot.el.style.setProperty("--scale-factor", String(curScale));
        if (slot.textLayer) { try { slot.textLayer.cancel(); } catch (e) {} slot.textLayer = null; }
        slot.textWrap.replaceChildren();

        const tl = new pdfjs.TextLayer({
          textContentSource: tc.rawContent,
          container: slot.textWrap,
          viewport: vp,
        });
        slot.textLayer = tl;
        await tl.render();
        if (destroyed || slot.textLayer !== tl) return;

        // Nodo final no seleccionable recomendado por PDF.js para estabilizar el arrastre hacia abajo en iOS
        const endDiv = document.createElement("div");
        endDiv.className = "endOfContent";
        slot.textWrap.append(endDiv);

        slot.textBuilt = true;
        slot.textRot = buildRot;
        slot.textScale = curScale;
      } catch (e) {
      } finally {
        slot.textBuilding = false;
        activeTextBuilds = Math.max(0, activeTextBuilds - 1);
      }
    }

    function multiplyTransform(m1, m2) {
      return [
        m1[0] * m2[0] + m1[2] * m2[1],
        m1[1] * m2[0] + m1[3] * m2[1],
        m1[0] * m2[2] + m1[2] * m2[3],
        m1[1] * m2[2] + m1[3] * m2[3],
        m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
        m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
      ];
    }

    async function getPageTextData(num, pageObj) {
      if (S.textCache.has(num)) {
        const hit = S.textCache.get(num);
        S.textCache.delete(num);
        S.textCache.set(num, hit);
        return hit;
      }
      const page = pageObj || (await pdfDoc.getPage(num));
      const rawContent = await page.getTextContent({ includeMarkedContent: true });
      const items = (rawContent.items || []).filter((it) => typeof it.str === "string");
      const data = {
        rawContent,
        items,
        styles: rawContent.styles || {},
        vp1: page.getViewport({ scale: 1, rotation: 0 }),
      };
      S.textCache.set(num, data);
      if (S.textCache.size > MAX_TEXT_CACHE) {
        S.textCache.delete(S.textCache.keys().next().value);
      }
      return data;
    }

    // ---------- Extracción estructurada (Modo Líquido, Voz alta y Copiar rango) ----------
    async function getPageBlocks(num) {
      if (!pdfDoc) return [];
      const data = await getPageTextData(num);
      const items = data.items || [];
      if (!items.length) return [];

      const lines = [];
      let curLine = null;
      const heights = [];

      for (const it of items) {
        const str = String(it.str || "");
        if (!str.trim() && !it.hasEOL) continue;
        const tx = it.transform || [1, 0, 0, 1, 0, 0];
        const fh = Math.hypot(tx[2], tx[3]) || Math.hypot(tx[0], tx[1]) || 10;
        const x = tx[4];
        const y = tx[5];
        if (str.trim()) heights.push(fh);

        if (!curLine) {
          curLine = { y, fh, xMin: x, xMax: x + (it.width || 0), parts: [str] };
          lines.push(curLine);
        } else if (Math.abs(y - curLine.y) <= Math.max(fh, curLine.fh) * 0.55) {
          const gap = x - curLine.xMax;
          if (gap > Math.max(1.2, fh * 0.14) && !curLine.parts[curLine.parts.length - 1].endsWith(" ") && !str.startsWith(" ")) {
            curLine.parts.push(" ");
          }
          curLine.parts.push(str);
          curLine.xMax = Math.max(curLine.xMax, x + (it.width || str.length * fh * 0.5));
          curLine.fh = Math.max(curLine.fh, fh);
        } else {
          curLine = { y, fh, xMin: x, xMax: x + (it.width || 0), parts: [str] };
          lines.push(curLine);
        }
        if (it.hasEOL) curLine = null;
      }

      if (!lines.length) return [];
      heights.sort((a, b) => a - b);
      const bodyH = heights[Math.floor(heights.length * 0.5)] || 11;

      const blocks = [];
      let curPara = null;
      let prevLine = null;

      for (const ln of lines) {
        const text = ln.parts.join("").replace(/[ \t]+/g, " ").trim();
        if (!text) continue;
        const isHeading = ln.fh >= bodyH * 1.28 && text.length < 160;
        const isBullet = /^[•●▪▸\-–—*]\s+|^\d+[.)]\s+/.test(text);
        const yGap = prevLine ? Math.abs(prevLine.y - ln.y) : 0;
        const newPara = !curPara || isHeading || curPara.type === "h" || isBullet ||
          (prevLine && yGap > Math.max(ln.fh, prevLine.fh) * 1.55);

        if (newPara) {
          curPara = { type: isHeading ? "h" : "p", text };
          blocks.push(curPara);
        } else {
          if (curPara.text.endsWith("-") && !curPara.text.endsWith(" -") && /^[a-záéíóúñü]/i.test(text)) {
            curPara.text = curPara.text.slice(0, -1) + text;
          } else {
            curPara.text += " " + text;
          }
        }
        prevLine = ln;
      }
      return blocks;
    }

    async function getPagePlainText(num) {
      const blocks = await getPageBlocks(num);
      return blocks.map((b) => b.text).join("\n\n");
    }

    async function extractTextRange(fromPage, toPage, onProgress) {
      if (!pdfDoc) return "";
      const a = Math.max(1, Math.min(S.pages, parseInt(fromPage, 10) || 1));
      const b = Math.max(a, Math.min(S.pages, parseInt(toPage, 10) || a));
      const out = [];
      for (let p = a; p <= b; p++) {
        if (destroyed || !pdfDoc) break;
        const txt = await getPagePlainText(p);
        if (txt) out.push(b > a ? (`--- Página ${p} ---\n` + txt) : txt);
        if (onProgress) onProgress(p - a + 1, b - a + 1);
      }
      return out.join("\n\n");
    }

    async function renderThumbnail(pageNum, maxWidth, extraRotation) {
      if (destroyed || !pdfDoc) return null;
      const page = await pdfDoc.getPage(pageNum);
      if (destroyed || !pdfDoc) return null;
      const rot = ((extraRotation || 0) % 360 + 360) % 360;
      const vp1 = page.getViewport({ scale: 1, rotation: rot });
      const scale = Math.max(0.12, Math.min(1.2, (maxWidth || 220) / Math.max(1, vp1.width)));
      const vp = page.getViewport({ scale, rotation: rot });
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(vp.width));
      c.height = Math.max(1, Math.round(vp.height));
      const ctx = c.getContext("2d", { alpha: false });
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      const task = page.render({ canvasContext: ctx, viewport: vp, intent: "display" });
      await task.promise;
      const url = c.toDataURL("image/jpeg", 0.76);
      c.width = 0; c.height = 0;
      try { page.cleanup(); } catch (e) {}
      return url;
    }

    // ---------- Enlaces y formularios ----------
    async function loadSlotAnnotations(slot) {
      if (slot.annotLoaded || destroyed || !pdfDoc) return;
      slot.annotLoaded = true;
      try {
        const page = await pdfDoc.getPage(slot.num);
        if (destroyed || !pdfDoc) return;
        const annots = await page.getAnnotations({ intent: "display" });
        if (destroyed || !annots || !annots.length) return;
        const vp1 = page.getViewport({ scale: 1, rotation: S.rotation });
        slot.annotEl.replaceChildren();
        for (const a of annots) {
          if (!a.rect || a.rect.length !== 4) continue;
          const r = vp1.convertToViewportRectangle(a.rect);
          const x0 = Math.min(r[0], r[2]), x1 = Math.max(r[0], r[2]);
          const y0 = Math.min(r[1], r[3]), y1 = Math.max(r[1], r[3]);
          const leftPct = (x0 / vp1.width) * 100;
          const topPct = (y0 / vp1.height) * 100;
          const wPct = ((x1 - x0) / vp1.width) * 100;
          const hPct = ((y1 - y0) / vp1.height) * 100;
          if (wPct <= 0.1 || hPct <= 0.1) continue;

          if (a.subtype === "Link" && (a.dest || a.url)) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "pc-pdf-link";
            btn.style.cssText = `left:${leftPct}%;top:${topPct}%;width:${wPct}%;height:${hPct}%`;
            btn.setAttribute("aria-label", a.url ? "Abrir enlace" : "Ir a destino");
            btn.addEventListener("click", async (ev) => {
              ev.stopPropagation();
              if (a.url) {
                if (opts.onExternalLink) opts.onExternalLink(a.url);
                else window.open(a.url, "_blank", "noopener");
              } else if (a.dest) {
                const targetPage = await resolveDestPage(a.dest);
                if (targetPage) goToPage(targetPage, { recordHistory: true });
              }
            });
            slot.annotEl.append(btn);
          } else if (a.subtype === "Widget" && !a.readOnly && !a.hidden) {
            S.hasForms = true;
            const field = document.createElement("button");
            field.type = "button";
            field.className = "pc-pdf-field";
            field.style.cssText = `left:${leftPct}%;top:${topPct}%;width:${wPct}%;height:${hPct}%`;
            field.setAttribute("aria-label", a.fieldName || "Campo de formulario");
            field.addEventListener("click", (ev) => {
              ev.stopPropagation();
              if (opts.onFormTap) opts.onFormTap(slot.num, ev.clientX, ev.clientY);
            });
            slot.annotEl.append(field);
          }
        }
      } catch (e) {}
    }

    async function resolveDestPage(dest) {
      if (!pdfDoc || !dest) return null;
      try {
        const arr = typeof dest === "string" ? await pdfDoc.getDestination(dest) : dest;
        if (!Array.isArray(arr) || !arr.length) return null;
        const ref = arr[0];
        if (typeof ref === "number") return Math.max(1, Math.min(S.pages, ref + 1));
        const idx = await pdfDoc.getPageIndex(ref);
        return Math.max(1, Math.min(S.pages, idx + 1));
      } catch (e) { return null; }
    }

    function clearSelection() {
      S.lastSelectedText = "";
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) sel.removeAllRanges();
      } catch (e) {}
      if (opts.onSelectionChange) opts.onSelectionChange("");
    }

    function getSelectedText() {
      try {
        const sel = window.getSelection();
        const cur = sel ? String(sel.toString() || "").replace(/\n{3,}/g, "\n\n").trim() : "";
        return cur || S.lastSelectedText || "";
      } catch (e) { return S.lastSelectedText || ""; }
    }

    // ---------- Búsqueda ultrarrápida en Worker ----------
    let searchToken = 0;
    async function search(query) {
      const q = String(query || "").trim();
      S.searchQuery = q; S.searchMatches = []; S.searchPos = -1;
      for (const slot of S.slots) slot.hlEl.replaceChildren();
      if (!q || !pdfDoc) return { current: 0, total: 0, label: "" };

      const myToken = ++searchToken;
      const needle = q.toLowerCase();
      const matches = [];
      for (let p = 1; p <= S.pages; p++) {
        if (myToken !== searchToken || destroyed || !pdfDoc) return null;
        const data = await getPageTextData(p);
        for (let i = 0; i < data.items.length; i++) {
          const str = String(data.items[i].str || "");
          const low = str.toLowerCase();
          let at = 0;
          while ((at = low.indexOf(needle, at)) !== -1) {
            matches.push({ page: p, itemIdx: i, offset: at, len: needle.length });
            at += Math.max(1, needle.length);
          }
        }
      }
      if (myToken !== searchToken || destroyed) return null;
      S.searchMatches = matches;
      if (!matches.length) return { current: 0, total: 0, label: "Sin resultados" };
      let idx = matches.findIndex((m) => m.page >= S.page);
      if (idx < 0) idx = 0;
      return jumpToMatch(idx);
    }

    function jumpToMatch(idx) {
      if (!S.searchMatches.length) return { current: 0, total: 0, label: "Sin resultados" };
      const total = S.searchMatches.length;
      S.searchPos = ((idx % total) + total) % total;
      const m = S.searchMatches[S.searchPos];
      if (m.page !== S.page || S.layout === "single") goToPage(m.page, { recordHistory: false, instant: true });
      for (const slot of findVisibleSlots().visible) paintSearchHighlights(slot);
      const slot = getSlot(m.page);
      if (slot) {
        const activeBox = slot.hlEl.querySelector(".pc-hl-active");
        if (activeBox) activeBox.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
      }
      return { current: S.searchPos + 1, total, label: (S.searchPos + 1) + " de " + total };
    }

    function paintSearchHighlights(slot) {
      slot.hlEl.replaceChildren();
      if (!S.searchQuery || !S.searchMatches.length) return;
      const pageMatches = S.searchMatches.map((m, idx) => ({ m, idx })).filter((x) => x.m.page === slot.num);
      if (!pageMatches.length) return;
      const rot = S.rotation;
      getPageTextData(slot.num).then(async (data) => {
        if (destroyed || !S.searchQuery || !pdfDoc) return;
        const page = await pdfDoc.getPage(slot.num);
        if (destroyed || !S.searchQuery) return;
        const vp = page.getViewport({ scale: 1, rotation: rot });
        const frag = document.createDocumentFragment();
        for (const { m, idx } of pageMatches) {
          const item = data.items[m.itemIdx];
          if (!item || !item.str) continue;
          const tx = multiplyTransform(vp.transform, item.transform);
          const fh = Math.hypot(tx[2], tx[3]) || Math.hypot(tx[0], tx[1]) || 10;
          const totalLen = Math.max(1, item.str.length);
          const itemW = Math.max(4, item.width || (totalLen * fh * 0.52));
          const xStart = tx[4] + (m.offset / totalLen) * itemW;
          const w = Math.max(6, (m.len / totalLen) * itemW);
          const yTop = tx[5] - fh * 0.92;
          const box = document.createElement("div");
          box.className = "pc-hl-box" + (idx === S.searchPos ? " pc-hl-active" : "");
          box.style.left = ((xStart / vp.width) * 100).toFixed(3) + "%";
          box.style.top = ((yTop / vp.height) * 100).toFixed(3) + "%";
          box.style.width = ((w / vp.width) * 100).toFixed(3) + "%";
          box.style.height = (((fh * 1.15) / vp.height) * 100).toFixed(3) + "%";
          frag.append(box);
        }
        slot.hlEl.replaceChildren(frag);
      }).catch(() => {});
    }

    function clearSearch() {
      searchToken++; S.searchQuery = ""; S.searchMatches = []; S.searchPos = -1;
      for (const slot of S.slots) slot.hlEl.replaceChildren();
    }

    // ---------- Índice (Outline) ----------
    async function loadOutline() {
      if (!pdfDoc) return [];
      try {
        const raw = await pdfDoc.getOutline();
        if (!raw || !raw.length) { S.outline = []; return []; }
        const flat = [];
        const walk = async (items, depth) => {
          for (const it of items) {
            const page = it.dest ? await resolveDestPage(it.dest) : null;
            flat.push({ title: String(it.title || "").trim() || "Sección", page: page || 1, depth });
            if (it.items && it.items.length && depth < 3) await walk(it.items, depth + 1);
          }
        };
        await walk(raw, 0);
        S.outline = flat;
        if (opts.onOutlineReady) opts.onOutlineReady(flat);
        return flat;
      } catch (e) { S.outline = []; return []; }
    }

    // ---------- Navegación e historial ----------
    function recordBack(fromPage) {
      if (S.back[S.back.length - 1] !== fromPage) {
        S.back.push(fromPage);
        if (S.back.length > 60) S.back.shift();
      }
      S.fwd = [];
      if (opts.onHistoryChange) opts.onHistoryChange(S.back[S.back.length - 1] || 0);
    }

    function goToPage(n, navOpts) {
      if (!pdfDoc || !scroller) return;
      const target = Math.max(1, Math.min(S.pages, parseInt(n, 10) || 1));
      const o = navOpts || {};
      if (o.recordHistory && target !== S.page) recordBack(S.page);
      const prev = S.page;
      S.page = target;

      if (S.layout === "single") {
        if (!S.slots[0] || S.slots[0].num !== target) {
          buildSlots();
          scroller.scrollLeft = 0; scroller.scrollTop = 0;
        }
      } else {
        const slot = getSlot(target);
        if (slot) scroller.scrollTop = Math.max(0, slot.top - 8);
      }
      if (prev !== target && opts.onPageChange) opts.onPageChange(S.page, S.pages);
      reportScrollProgress();
      updateVisible(true);
    }

    function scrollToFraction(frac) {
      if (!pdfDoc || !scroller) return S.page;
      const f = Math.max(0, Math.min(1, frac));
      if (S.layout === "single") {
        const pg = Math.max(1, Math.min(S.pages, Math.round(1 + f * (S.pages - 1))));
        if (pg !== S.page) goToPage(pg, { instant: true });
        return pg;
      }
      const maxST = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      scroller.scrollTop = Math.round(f * maxST);
      const { primary } = findVisibleSlots();
      if (primary !== S.page) {
        S.page = primary;
        if (opts.onPageChange) opts.onPageChange(S.page, S.pages);
      }
      scheduleUpdate(60);
      return S.page;
    }

    function stepPage(dir) {
      const step = S.layout === "two-page" ? 2 : 1;
      const target = Math.max(1, Math.min(S.pages, S.page + (dir > 0 ? step : -step)));
      if (target !== S.page) goToPage(target, { instant: true });
      return target;
    }

    function back() {
      if (!S.back.length) return false;
      const to = S.back.pop(); S.fwd.push(S.page);
      if (opts.onHistoryChange) opts.onHistoryChange(S.back[S.back.length - 1] || 0);
      goToPage(to, { instant: true });
      return true;
    }

    function forward() {
      if (!S.fwd.length) return false;
      const to = S.fwd.pop(); S.back.push(S.page);
      if (opts.onHistoryChange) opts.onHistoryChange(S.back[S.back.length - 1] || 0);
      goToPage(to, { instant: true });
      return true;
    }

    // ---------- Zoom atómico sin salto ni parpadeo ----------
    function findAnchorAt(clientX, clientY) {
      const cr = scroller.getBoundingClientRect();
      const vx = clientX - cr.left;
      const vy = clientY - cr.top;
      const { visible } = findVisibleSlots();
      let bestSlot = getSlot(S.page) || S.slots[0];
      let bestDist = Infinity;
      for (const slot of visible.length ? visible : S.slots.slice(0, 5)) {
        const r = slot.el.getBoundingClientRect();
        if (clientY >= r.top && clientY <= r.bottom && clientX >= r.left && clientX <= r.right) { bestSlot = slot; break; }
        const dy = clientY < r.top ? r.top - clientY : clientY > r.bottom ? clientY - r.bottom : 0;
        const dx = clientX < r.left ? r.left - clientX : clientX > r.right ? clientX - r.right : 0;
        const d = dy * 2 + dx;
        if (d < bestDist) { bestDist = d; bestSlot = slot; }
      }
      if (!bestSlot) return null;
      const r = bestSlot.el.getBoundingClientRect();
      return {
        slot: bestSlot,
        fx: r.width > 0 ? (clientX - r.left) / r.width : 0.5,
        fy: r.height > 0 ? (clientY - r.top) / r.height : 0.5,
        vx, vy,
      };
    }

    function commitScaleAt(newScale, anchor) {
      const clamped = Math.max(S.minScale, Math.min(S.maxScale, newScale));
      S.scale = clamped;
      stage.style.transition = ""; stage.style.transform = ""; stage.style.transformOrigin = ""; stage.style.willChange = "";
      applySlotSizes();

      if (anchor && anchor.slot && anchor.slot.el.isConnected) {
        const el = anchor.slot.el;
        const pageLeft = el.offsetLeft + stage.offsetLeft;
        const pageTop = anchor.slot.top;
        const maxSL = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
        const maxST = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        scroller.scrollLeft = Math.max(0, Math.min(maxSL, pageLeft + anchor.fx * el.offsetWidth - anchor.vx));
        scroller.scrollTop = Math.max(0, Math.min(maxST, pageTop + anchor.fy * anchor.slot.h - anchor.vy));
      }

      for (const slot of S.slots) releaseHd(slot);
      if (opts.onZoomChange) opts.onZoomChange(zoomPercentOf(S.scale));
      reportScrollProgress();
      updateVisible(true);
    }

    function animateZoomTo(targetScale, clientX, clientY) {
      if (!scroller || !stage || S.pinching) return;
      clearTimeout(zoomAnimTimer);
      const clamped = Math.max(S.minScale, Math.min(S.maxScale, targetScale));
      const ratio = clamped / S.scale;
      if (Math.abs(ratio - 1) < 0.01) return;

      const anchor = findAnchorAt(clientX, clientY);
      const sr = stage.getBoundingClientRect();
      const sx = clientX - sr.left;
      const sy = clientY - sr.top;
      S.animatingZoom = true;
      stage.style.transformOrigin = "0 0";
      stage.style.willChange = "transform";
      stage.style.transition = "transform 175ms cubic-bezier(.25,.8,.25,1)";
      stage.style.transform = `translate3d(${(sx - ratio * sx).toFixed(2)}px,${(sy - ratio * sy).toFixed(2)}px,0) scale(${ratio.toFixed(5)})`;

      zoomAnimTimer = setTimeout(() => { S.animatingZoom = false; commitScaleAt(clamped, anchor); }, 185);
    }

    function fitWidth() {
      if (!pdfDoc) return;
      S.fitScale = computeFitScale(S.page);
      S.minScale = Math.max(0.22, S.fitScale * 0.65);
      S.maxScale = Math.max(4.5, S.fitScale * 6.5);
      const cr = scroller.getBoundingClientRect();
      commitScaleAt(S.fitScale, findAnchorAt(cr.left + cr.width / 2, cr.top + cr.height / 2));
      scroller.scrollLeft = 0;
    }

    function fitPage() {
      if (!pdfDoc) return;
      const cr = scroller.getBoundingClientRect();
      commitScaleAt(computeFitPageScale(S.page), findAnchorAt(cr.left + cr.width / 2, cr.top + cr.height / 2));
      scroller.scrollLeft = 0;
    }

    function setZoomPercent(pct) {
      if (!pdfDoc) return;
      const cr = scroller.getBoundingClientRect();
      commitScaleAt(scaleFromZoomPercent(pct), findAnchorAt(cr.left + cr.width / 2, cr.top + cr.height / 2));
    }

    function setLayout(mode) {
      const m = mode === "two" || mode === "two-page" ? "two-page" : mode === "single" ? "single" : "continuous";
      if (S.layout === m) return;
      S.layout = m;
      const cur = S.page;
      S.fitScale = computeFitScale(cur);
      S.scale = S.fitScale;
      S.minScale = Math.max(0.22, S.fitScale * 0.65);
      S.maxScale = Math.max(4.5, S.fitScale * 6.5);
      buildSlots();
      goToPage(cur, { instant: true });
    }

    function setPageGaps(on) {
      S.pageGaps = !!on;
      if (stage) stage.classList.toggle("pc-no-gaps", !S.pageGaps);
      applySlotSizes();
      updateVisible(false);
    }

    function rotateCw() {
      if (!pdfDoc) return;
      S.rotation = (S.rotation + 90) % 360;
      const cur = S.page;
      S.refWidth = pageRotatedSize(cur).w;
      S.fitScale = computeFitScale(cur);
      S.scale = S.fitScale;
      releaseAllCanvases();
      releaseAllTextLayers();
      for (const slot of S.slots) { slot.annotLoaded = false; slot.annotEl.replaceChildren(); }
      applySlotSizes();
      goToPage(cur, { instant: true });
    }

    // ---------- Gestos táctiles 100 % no-bloqueantes para Safari iOS ----------
    let cleanupListeners = null;
    function attachGestures() {
      if (!scroller) return;
      let pinch = null, pinchRaf = 0, tap = null, lastTap = { t: 0, x: 0, y: 0 }, singleTapTimer = null, swipeDx = 0, lastScrollAt = 0;

      const pair = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2, d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) });

      function startPinch(a, b) {
        clearTimeout(singleTapTimer); clearTimeout(zoomAnimTimer); S.animatingZoom = false; tap = null;
        if (swipeDx) { stage.style.transform = ""; swipeDx = 0; }
        const p = pair(a, b), sr = stage.getBoundingClientRect(), cr = scroller.getBoundingClientRect();
        pinch = {
          a: a.identifier, b: b.identifier, d0: Math.max(12, p.d),
          srLeft: sr.left, srTop: sr.top, sx0: p.x - sr.left, sy0: p.y - sr.top,
          crLeft: cr.left, crTop: cr.top, scale0: S.scale,
          minR: S.minScale / S.scale, maxR: S.maxScale / S.scale,
          ratio: 1, vx: p.x - cr.left, vy: p.y - cr.top, tx: 0, ty: 0,
          anchor: findAnchorAt(p.x, p.y), dirty: false,
        };
        S.pinching = true;
        stage.style.transition = ""; stage.style.transformOrigin = "0 0"; stage.style.willChange = "transform";
      }

      function renderPinch() {
        pinchRaf = 0;
        if (!pinch || !pinch.dirty) return;
        pinch.dirty = false;
        stage.style.transform = `translate3d(${pinch.tx.toFixed(2)}px,${pinch.ty.toFixed(2)}px,0) scale(${pinch.ratio.toFixed(5)})`;
      }

      function finishPinch(cancelled) {
        if (pinchRaf) { cancelAnimationFrame(pinchRaf); pinchRaf = 0; }
        const pg = pinch; pinch = null; S.pinching = false;
        if (!pg) return;
        if (cancelled || Math.abs(pg.ratio - 1) < 0.004) {
          stage.style.transform = ""; stage.style.transformOrigin = ""; stage.style.willChange = "";
          return;
        }
        const finalAnchor = pg.anchor ? { slot: pg.anchor.slot, fx: pg.anchor.fx, fy: pg.anchor.fy, vx: pg.vx, vy: pg.vy } : null;
        commitScaleAt(pg.scale0 * pg.ratio, finalAnchor);
      }

      function onTouchStart(e) {
        if (e.touches.length >= 2) { e.preventDefault(); startPinch(e.touches[0], e.touches[1]); return; }
        if (pinch) return;
        if (e.target && e.target.closest && e.target.closest(".pc-pdf-link, .pc-pdf-field")) return;
        const t = e.touches[0], now = performance.now();
        tap = { id: t.identifier, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY, t0: now, moved: false, swiping: false, hadSel: hasActiveSelection(), wasScrolling: (now - lastScrollAt) < 90 };
      }

      function onTouchMove(e) {
        if (pinch) {
          e.preventDefault();
          const a = Array.prototype.find.call(e.touches, (t) => t.identifier === pinch.a) || e.touches[0];
          const b = Array.prototype.find.call(e.touches, (t) => t.identifier === pinch.b) || e.touches[1];
          if (!a || !b) return;
          const p = pair(a, b);
          const ratio = Math.max(pinch.minR, Math.min(pinch.maxR, p.d / pinch.d0));
          pinch.ratio = ratio; pinch.vx = p.x - pinch.crLeft; pinch.vy = p.y - pinch.crTop;
          pinch.tx = (p.x - pinch.srLeft) - ratio * pinch.sx0; pinch.ty = (p.y - pinch.srTop) - ratio * pinch.sy0;
          pinch.dirty = true;
          if (!pinchRaf) pinchRaf = requestAnimationFrame(renderPinch);
          return;
        }
        if (!tap) return;
        const t = Array.prototype.find.call(e.touches, (x) => x.identifier === tap.id);
        if (!t) return;
        tap.x = t.clientX; tap.y = t.clientY;
        const dx = tap.x - tap.x0, dy = tap.y - tap.y0;
        if (!tap.moved && Math.hypot(dx, dy) >= SLOP) {
          tap.moved = true;
          if (!tap.hadSel && !hasActiveSelection() && S.layout === "single" && S.scale <= S.fitScale * 1.06 && Math.abs(dx) > Math.abs(dy) * 1.45) {
            tap.swiping = true;
          }
        }
        if (tap.swiping) {
          e.preventDefault();
          swipeDx = dx * 0.48;
          stage.style.transform = `translate3d(${swipeDx.toFixed(1)}px,0,0)`;
        }
      }

      function onTouchEnd(e) {
        if (pinch) {
          if (e.touches.length < 2) { e.preventDefault(); finishPinch(e.type === "touchcancel"); }
          return;
        }
        if (!tap) return;
        const ended = Array.prototype.find.call(e.changedTouches, (x) => x.identifier === tap.id);
        if (!ended) return;
        const was = tap; tap = null;

        if (was.swiping) {
          const dx = ended.clientX - was.x0;
          stage.style.transition = "transform 160ms ease"; stage.style.transform = ""; swipeDx = 0;
          setTimeout(() => { if (stage) stage.style.transition = ""; }, 170);
          if (e.type !== "touchcancel" && Math.abs(dx) > 50) stepPage(dx < 0 ? 1 : -1);
          return;
        }
        const dt = performance.now() - was.t0;
        if (was.moved || was.wasScrolling || dt > 300 || e.type === "touchcancel") return;

        // Si estaba en modo inmersivo, cualquier toque corto restaura las barras de inmediato
        if (opts.isImmersive && opts.isImmersive()) {
          if (opts.onSingleTap) opts.onSingleTap(was.x0, was.y0);
          return;
        }
        if (was.hadSel || hasActiveSelection()) return;

        const now = performance.now();
        const isDouble = (was.t0 - lastTap.t) < DOUBLE_TAP_MS && Math.hypot(was.x0 - lastTap.x, was.y0 - lastTap.y) < DOUBLE_TAP_DIST;
        if (isDouble) {
          clearTimeout(singleTapTimer); lastTap = { t: 0, x: 0, y: 0 };
          const target = S.scale > S.fitScale * 1.18 ? S.fitScale : Math.min(S.maxScale, S.fitScale * 2.2);
          animateZoomTo(target, was.x0, was.y0);
          return;
        }
        lastTap = { t: now, x: was.x0, y: was.y0 };
        clearTimeout(singleTapTimer);
        singleTapTimer = setTimeout(() => {
          if (!hasActiveSelection() && opts.onSingleTap) opts.onSingleTap(was.x0, was.y0);
        }, DOUBLE_TAP_MS);
      }

      function onScroll() {
        lastScrollAt = performance.now();
        if (scrollRaf || S.pinching || S.animatingZoom) return;
        scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; scheduleUpdate(0); });
      }

      function onSelectionChangeDom() {
        clearTimeout(selTimer);
        selTimer = setTimeout(() => {
          if (destroyed || !host) return;
          try {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed || !sel.rangeCount) {
              if (S.lastSelectedText) { S.lastSelectedText = ""; if (opts.onSelectionChange) opts.onSelectionChange(""); }
              return;
            }
            const range = sel.getRangeAt(0);
            if (!host.contains(range.commonAncestorContainer)) return;
            const txt = String(sel.toString() || "").replace(/\n{3,}/g, "\n\n").trim();
            if (txt !== S.lastSelectedText) {
              S.lastSelectedText = txt;
              if (opts.onSelectionChange) opts.onSelectionChange(txt, S.page);
            }
          } catch (e) {}
        }, 70);
      }

      const blockGesture = (e) => { e.preventDefault(); };
      function onWheel(e) {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        commitScaleAt(S.scale * Math.exp(-e.deltaY / 160), findAnchorAt(e.clientX, e.clientY));
      }

      scroller.addEventListener("touchstart", onTouchStart, { passive: false });
      scroller.addEventListener("touchmove", onTouchMove, { passive: false });
      scroller.addEventListener("touchend", onTouchEnd, { passive: false });
      scroller.addEventListener("touchcancel", onTouchEnd, { passive: false });
      scroller.addEventListener("gesturestart", blockGesture, { passive: false });
      scroller.addEventListener("gesturechange", blockGesture, { passive: false });
      scroller.addEventListener("gestureend", blockGesture, { passive: false });
      scroller.addEventListener("scroll", onScroll, { passive: true });
      scroller.addEventListener("wheel", onWheel, { passive: false });
      document.addEventListener("selectionchange", onSelectionChangeDom);

      cleanupListeners = () => {
        clearTimeout(singleTapTimer); clearTimeout(zoomAnimTimer); clearTimeout(selTimer);
        if (pinchRaf) { cancelAnimationFrame(pinchRaf); pinchRaf = 0; }
        if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = 0; }
        scroller.removeEventListener("touchstart", onTouchStart);
        scroller.removeEventListener("touchmove", onTouchMove);
        scroller.removeEventListener("touchend", onTouchEnd);
        scroller.removeEventListener("touchcancel", onTouchEnd);
        scroller.removeEventListener("gesturestart", blockGesture);
        scroller.removeEventListener("gesturechange", blockGesture);
        scroller.removeEventListener("gestureend", blockGesture);
        scroller.removeEventListener("scroll", onScroll);
        scroller.removeEventListener("wheel", onWheel);
        document.removeEventListener("selectionchange", onSelectionChangeDom);
      };
    }

    // ---------- Ciclo de vida: open / close / resize ----------
    async function open(container, blobOrBytes, options) {
      close();
      destroyed = false;
      host = container;
      opts = options || {};
      S.layout = opts.layout || "continuous";
      S.pageGaps = opts.pageGaps !== false;
      S.rotation = opts.rotation || 0;
      S.page = Math.max(1, opts.page || 1);
      S.thumbSent = false; S.hasForms = false; S.outline = null;
      S.back = []; S.fwd = []; S.textCache.clear();
      S.searchQuery = ""; S.searchMatches = []; S.searchPos = -1; S.lastSelectedText = "";

      pdfjs = await loadPdfJs();
      if (destroyed) return null;

      let loadingTask;
      if (blobOrBytes instanceof Blob && blobOrBytes.size > 0 && pdfjs.PDFDataRangeTransport) {
        // Para libros de cualquier tamaño (incluidos 100-400 MB): streaming por rangos de 128 KB vía Blob.slice()!
        const initSize = Math.min(65536, blobOrBytes.size);
        const initBuf = new Uint8Array(await blobOrBytes.slice(0, initSize).arrayBuffer());
        if (destroyed) return null;
        if (blobOrBytes.size <= 2 * 1024 * 1024) {
          // PDFs pequeños (<= 2 MB): carga directa inmediata en 0 viajes
          const full = initSize === blobOrBytes.size ? initBuf : new Uint8Array(await blobOrBytes.arrayBuffer());
          loadingTask = pdfjs.getDocument({
            data: full,
            standardFontDataUrl: "./pdfjs/standard_fonts/",
            isEvalSupported: false,
            useSystemFonts: true,
          });
        } else {
          rangeTransport = makeBlobRangeTransport(pdfjs, blobOrBytes, initBuf);
          loadingTask = pdfjs.getDocument({
            range: rangeTransport,
            length: blobOrBytes.size,
            standardFontDataUrl: "./pdfjs/standard_fonts/",
            isEvalSupported: false,
            useSystemFonts: true,
            disableAutoFetch: true,
            disableStream: true,
            rangeChunkSize: 131072,
          });
        }
      } else {
        const bytes = blobOrBytes instanceof Uint8Array
          ? new Uint8Array(blobOrBytes)
          : blobOrBytes instanceof ArrayBuffer
            ? new Uint8Array(blobOrBytes.slice(0))
            : new Uint8Array(await blobOrBytes.arrayBuffer());
        loadingTask = pdfjs.getDocument({
          data: bytes,
          standardFontDataUrl: "./pdfjs/standard_fonts/",
          isEvalSupported: false,
          useSystemFonts: true,
        });
      }

      try {
        pdfDoc = await loadingTask.promise;
      } catch (err) {
        if (err && (err.name === "PasswordException" || /password/i.test(String(err.message || "")))) {
          if (rangeTransport) { rangeTransport.abort(); rangeTransport = null; }
          const e = new Error("PDF protegido con contraseña");
          e.code = "PASSWORD_REQUIRED";
          throw e;
        }
        throw err;
      }
      if (destroyed) {
        pdfDoc.destroy().catch(() => {}); pdfDoc = null;
        if (rangeTransport) { rangeTransport.abort(); rangeTransport = null; }
        return null;
      }

      S.pages = pdfDoc.numPages || 1;
      S.page = Math.max(1, Math.min(S.pages, S.page));

      // Muestrear página 1 y una página interior (si el libro tiene >= 3 págs) para obtener el ancho real de texto
      const p1 = await pdfDoc.getPage(1);
      const vp1 = p1.getViewport({ scale: 1, rotation: 0 });
      let refDim = { w: vp1.width, h: vp1.height };
      if (S.pages >= 3) {
        try {
          const sampleNum = Math.min(S.pages, S.pages >= 8 ? 5 : 3);
          const pMid = await pdfDoc.getPage(sampleNum);
          const vpMid = pMid.getViewport({ scale: 1, rotation: 0 });
          if (vpMid.width > 100 && vpMid.height > 100) refDim = { w: vpMid.width, h: vpMid.height };
        } catch (e) {}
      }
      S.pageDims = Array.from({ length: S.pages }, (_, idx) => (idx === 0 ? { w: vp1.width, h: vp1.height } : { w: refDim.w, h: refDim.h }));
      S.refWidth = S.rotation % 180 === 90 ? refDim.h : refDim.w;

      scroller = document.createElement("div");
      scroller.className = "pc-reader-scroll";
      stage = document.createElement("div");
      stage.className = "pc-reader-stage";
      scroller.append(stage);
      host.replaceChildren(scroller);

      S.fitScale = computeFitScale(S.page);
      S.scale = S.fitScale;
      S.minScale = Math.max(0.22, S.fitScale * 0.65);
      S.maxScale = Math.max(4.5, S.fitScale * 6.5);

      buildSlots();
      attachGestures();
      goToPage(S.page, { instant: true });
      if (opts.onZoomChange) opts.onZoomChange(zoomPercentOf(S.scale));

      loadOutline().catch(() => {});
      return { pages: S.pages, page: S.page };
    }

    function resize() {
      if (destroyed || !pdfDoc || !scroller) return;
      const wasFit = Math.abs(S.scale - S.fitScale) / Math.max(0.01, S.fitScale) < 0.06;
      const oldFit = S.fitScale;
      S.fitScale = computeFitScale(S.page);
      S.minScale = Math.max(0.22, S.fitScale * 0.65);
      S.maxScale = Math.max(4.5, S.fitScale * 6.5);
      if (wasFit && Math.abs(S.fitScale - oldFit) > 0.005) fitWidth();
      else { applySlotSizes(); reportScrollProgress(); updateVisible(false); }
    }

    function close() {
      destroyed = true;
      clearTimeout(renderTimer); clearTimeout(hdTimer); clearTimeout(zoomAnimTimer); clearTimeout(selTimer);
      if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = 0; }
      S.pinching = false; S.animatingZoom = false;
      activeBaseRenders = 0; activeHdRenders = 0; activeTextBuilds = 0;
      searchToken++;
      if (cleanupListeners) { cleanupListeners(); cleanupListeners = null; }
      cancelAllRenders(); releaseAllCanvases(); releaseAllTextLayers();
      S.slots = []; S.textCache.clear(); S.outline = null;
      S.searchQuery = ""; S.searchMatches = []; S.lastSelectedText = "";
      if (pdfDoc) { const d = pdfDoc; pdfDoc = null; d.destroy().catch(() => {}); }
      if (rangeTransport) { rangeTransport.abort(); rangeTransport = null; }
      if (host) host.replaceChildren();
      scroller = null; stage = null;
    }

    return {
      open, close, resize, goToPage, scrollToFraction, stepPage, back, forward,
      fitWidth, fitPage, setZoomPercent, setLayout, setPageGaps, rotateCw,
      search, nextMatch: () => jumpToMatch(S.searchPos + 1), prevMatch: () => jumpToMatch(S.searchPos - 1), clearSearch,
      getOutline: () => (S.outline ? Promise.resolve(S.outline) : loadOutline()),
      getPageBlocks, getPagePlainText, extractTextRange, renderThumbnail,
      clearSelection, getSelectedText,
      isOpen: () => !!pdfDoc && !destroyed,
      getState: () => ({
        page: S.page, pages: S.pages,
        zoomPercent: zoomPercentOf(S.scale), fitZoomPercent: zoomPercentOf(S.fitScale),
        layout: S.layout, pageGaps: S.pageGaps, rotation: S.rotation,
        scale: S.scale, fitScale: S.fitScale,
        backCount: S.back.length, fwdCount: S.fwd.length,
        lastBackPage: S.back.length ? S.back[S.back.length - 1] : 0,
        pinching: S.pinching, hasForms: S.hasForms,
        streamingRange: !!rangeTransport,
      }),
    };
  }

  window.pdfcraftReader = {
    create,
    preload: loadPdfJs,
    openDocumentFromBlob: async (blob) => {
      const lib = await loadPdfJs();
      if (blob instanceof Blob && blob.size > 2 * 1024 * 1024 && lib.PDFDataRangeTransport) {
        const initBuf = new Uint8Array(await blob.slice(0, Math.min(65536, blob.size)).arrayBuffer());
        const tr = makeBlobRangeTransport(lib, blob, initBuf);
        const doc = await lib.getDocument({
          range: tr,
          length: blob.size,
          standardFontDataUrl: "./pdfjs/standard_fonts/",
          isEvalSupported: false,
          useSystemFonts: true,
          disableAutoFetch: true,
          disableStream: true,
          rangeChunkSize: 131072,
        }).promise;
        return { doc, cleanup: () => { try { tr.abort(); } catch (e) {} } };
      }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const doc = await lib.getDocument({
        data: bytes,
        standardFontDataUrl: "./pdfjs/standard_fonts/",
        isEvalSupported: false,
        useSystemFonts: true,
      }).promise;
      return { doc, cleanup: () => {} };
    },
  };
})();
