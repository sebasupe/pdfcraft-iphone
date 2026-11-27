// PdfCraft para iPhone v3: lector PDF de nivel nativo iOS impulsado por Mozilla PDF.js
// en Web Worker (fuera del hilo principal).
//
// Mejoras clave v3:
//   · Streaming por Blob URL (disableAutoFetch: true) para abrir libros médicos de 100-400 MB
//     sin duplicar el archivo completo en la RAM de Safari iOS;
//   · Selección y copia de texto NATIVA multipárrafo y MULTIPÁGINA sin bloqueos:
//     cada página visible y adyacente monta su capa de texto con ajuste scaleX real y
//     `user-select: text` continuo a través de todo el visor, sin interceptar toques de 1 dedo;
//   · Extracción estructurada de bloques/párrafos para Modo Líquido, Leer en voz alta y
//     copia rápida de páginas o rangos completos;
//   · Scroll nativo 60/120 Hz + pellizco GPU translate3d/scale con commit atómico + tiles HD Retina;
//   · Seguimiento fluido del progreso de scroll para la pestaña vertical del borde derecho;
//   · Renderizado de miniaturas en el mismo Worker para la vista nativa de Páginas / Organizar.
(function () {
  "use strict";

  const MAX_CANVAS_PAGES = 7;
  const MAX_TEXT_LAYERS = 24;
  const MAX_TEXT_CACHE = 45;
  const MAX_BASE_DIM = 1550;
  const MAX_TILE_DIM = 2200;
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

  // Lienzo ligero reutilizable para medir el ancho exacto a 100px (cero redondeo subpíxel)
  let measureCtx = null;
  function measureTextWidth(str, fontSize, fontFamily) {
    if (!measureCtx) {
      const c = document.createElement("canvas");
      measureCtx = c.getContext("2d");
    }
    measureCtx.font = "100px " + (fontFamily || "sans-serif");
    return ((measureCtx.measureText(str).width || 0) * fontSize) / 100;
  }

  function create() {
    let host = null;
    let scroller = null;
    let stage = null;
    let pdfDoc = null;
    let objectUrl = null;
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
      pageDims: [],
      slots: [],
      textCache: new Map(), // LRU: pageNum -> { items, styles, vp1 }
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
    };

    let renderTimer = null;
    let hdTimer = null;
    let selTimer = null;
    let scrollRaf = 0;
    let activeBaseRenders = 0;
    let activeHdRenders = 0;
    let activeTextBuilds = 0;
    let zoomAnimTimer = null;

    function rawCreateURL(blob) {
      return (window.__pcRawCreateObjectURL || URL.createObjectURL)(blob);
    }
    function rawRevokeURL(url) {
      if (!url) return;
      try { (window.__pcRawRevokeObjectURL || URL.revokeObjectURL)(url); } catch (e) {}
    }

    // ---------- Utilidades de geometría ----------
    function effectiveDpr() {
      const cap = opts.dpr ? opts.dpr() : (window.__pdfcraftActiveDpr || Math.min(window.devicePixelRatio || 1, 2));
      return Math.max(1, Math.min(3, cap || 2));
    }

    function pageRotatedSize(num) {
      const d = S.pageDims[num - 1] || S.pageDims[0] || { w: 612, h: 792 };
      return S.rotation % 180 === 90 ? { w: d.h, h: d.w } : { w: d.w, h: d.h };
    }

    function viewportSize() {
      const w = (scroller && scroller.clientWidth) || (host && host.clientWidth) || window.innerWidth || 393;
      const h = (scroller && scroller.clientHeight) || (host && host.clientHeight) || window.innerHeight || 700;
      return { w: Math.max(160, w), h: Math.max(160, h) };
    }

    function computeFitScale(pageNum) {
      const vp = viewportSize();
      const sz = pageRotatedSize(pageNum || S.page || 1);
      const pad = 8;
      if (S.layout === "two-page") {
        const gap = S.pageGaps ? 8 : 0;
        return Math.max(0.15, (vp.w - pad * 2 - gap) / (sz.w * 2));
      }
      return Math.max(0.15, (vp.w - pad * 2) / sz.w);
    }

    function computeFitPageScale(pageNum) {
      const vp = viewportSize();
      const sz = pageRotatedSize(pageNum || S.page || 1);
      const pad = 10;
      const sw = S.layout === "two-page" ? (vp.w - pad * 2 - (S.pageGaps ? 8 : 0)) / (sz.w * 2) : (vp.w - pad * 2) / sz.w;
      const sh = (vp.h - pad * 2) / sz.h;
      return Math.max(0.15, Math.min(sw, sh));
    }

    function zoomPercentOf(scale) {
      return Math.max(5, Math.round((scale / (96 / 72)) * 100));
    }

    function scaleFromZoomPercent(pct) {
      return Math.max(0.1, (pct / 100) * (96 / 72));
    }

    // ---------- Construcción de slots virtualizados ----------
    function buildSlots() {
      if (!stage) return;
      cancelAllRenders();
      releaseAllCanvases();
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
      textWrap.className = "pc-text-layer";
      const annotEl = document.createElement("div");
      annotEl.className = "pc-page-annots";
      // Orden de capas: canvas base -> canvas HD -> resaltados -> texto seleccionable -> enlaces/formularios
      el.append(hlEl, textWrap, annotEl);
      return {
        num, el, hlEl, textWrap, annotEl,
        baseCanvas: null, baseScale: 0,
        hdCanvas: null, hdKey: "",
        textBuilt: false, textBuilding: false, textRot: -1, textScale: 0,
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
      stage.style.setProperty("--pc-scale", String(S.scale));

      for (const slot of S.slots) {
        const sz = pageRotatedSize(slot.num);
        const w = Math.max(40, Math.round(sz.w * S.scale));
        const h = Math.max(40, Math.round(sz.h * S.scale));
        slot.w = w;
        slot.h = h;
        slot.el.style.width = w + "px";
        slot.el.style.height = h + "px";
        // La capa de texto usa --pc-scale automáticamente vía calc() cuando se reescala
        if (slot.textBuilt && slot.textRot === S.rotation) {
          slot.textWrap.style.setProperty("--scale-factor", String(S.scale));
          slot.textScale = S.scale;
        }
        if (w > maxW) maxW = w;
      }
      const neededW = S.layout === "two-page" ? (maxW * 2 + gap + 12) : (maxW + 12);
      stage.style.width = Math.max(vp.w, neededW) + "px";
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
      } catch (e) {
        return false;
      }
    }

    function isSlotInSelection(slot) {
      try {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) return false;
        return sel.containsNode ? sel.containsNode(slot.textWrap, true) : false;
      } catch (e) {
        return false;
      }
    }

    function cancelSlotTasks(slot) {
      if (slot.task) { try { slot.task.cancel(); } catch (e) {} slot.task = null; }
      if (slot.hdTask) { try { slot.hdTask.cancel(); } catch (e) {} slot.hdTask = null; }
    }

    function cancelAllRenders() {
      for (const slot of S.slots) cancelSlotTasks(slot);
    }

    function releaseHd(slot) {
      if (slot.hdTask) { try { slot.hdTask.cancel(); } catch (e) {} slot.hdTask = null; }
      if (slot.hdCanvas) {
        slot.hdCanvas.width = 0;
        slot.hdCanvas.height = 0;
        slot.hdCanvas.remove();
        slot.hdCanvas = null;
        slot.hdKey = "";
      }
    }

    function releaseSlotCanvas(slot) {
      cancelSlotTasks(slot);
      releaseHd(slot);
      if (slot.baseCanvas) {
        slot.baseCanvas.width = 0;
        slot.baseCanvas.height = 0;
        slot.baseCanvas.remove();
        slot.baseCanvas = null;
        slot.baseScale = 0;
      }
    }

    function releaseAllCanvases() {
      for (const slot of S.slots) releaseSlotCanvas(slot);
    }

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
      // Jamás limpiar capas de texto mientras el usuario está seleccionando entre varias páginas
      if (!hasActiveSelection()) {
        const withText = S.slots.filter((s) => s.textBuilt && !visibleSet.has(s.num) && !isSlotInSelection(s));
        if (withText.length + visibleSet.size > MAX_TEXT_LAYERS) {
          withText.sort((a, b) => a.lastUsed - b.lastUsed);
          let dropTxt = (withText.length + visibleSet.size) - MAX_TEXT_LAYERS;
          for (const slot of withText) {
            if (dropTxt <= 0) break;
            slot.textWrap.replaceChildren();
            slot.textBuilt = false;
            dropTxt--;
          }
        }
      }
    }

    // ---------- Detección de páginas visibles, progreso y página actual ----------
    function findVisibleSlots() {
      if (!scroller || !S.slots.length) return { visible: [], primary: S.page };
      if (S.layout === "single") {
        return { visible: [S.slots[0]], primary: S.slots[0].num };
      }
      const cr = scroller.getBoundingClientRect();
      const topY = cr.top;
      const botY = cr.bottom;
      const midY = (topY + botY) * 0.5;
      const margin = Math.max(280, cr.height * 0.85);
      const visible = [];
      let primary = S.page;
      let bestDist = Infinity;

      for (const slot of S.slots) {
        const r = slot.el.getBoundingClientRect();
        if (r.bottom >= topY - margin && r.top <= botY + margin) {
          visible.push(slot);
        }
        if (r.bottom > topY && r.top < botY) {
          const overlap = Math.min(r.bottom, botY) - Math.max(r.top, topY);
          const centerDist = Math.abs((r.top + r.bottom) * 0.5 - midY) - overlap * 0.25;
          if (centerDist < bestDist) {
            bestDist = centerDist;
            primary = slot.num;
          }
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
      for (const slot of visible) {
        slot.lastUsed = now;
        visSet.add(slot.num);
      }
      visible.sort((a, b) => Math.abs(a.num - S.page) - Math.abs(b.num - S.page));
      evictDistantCanvases(visSet);

      for (const slot of S.slots) {
        if (!visSet.has(slot.num) && slot.hdCanvas) releaseHd(slot);
      }

      // También precargar capa de texto en la página anterior y siguiente para arrastrar selección entre páginas sin cortes
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
      }, immediate ? 20 : 95);
    }

    function scheduleUpdate(delayMs) {
      clearTimeout(renderTimer);
      if (!delayMs) { updateVisible(false); return; }
      renderTimer = setTimeout(() => updateVisible(false), delayMs);
    }

    // ---------- Renderizado base en Worker (doble búfer sin parpadeo) ----------
    async function ensureBaseRendered(slot) {
      if (destroyed || !pdfDoc) return;
      const dpr = effectiveDpr();
      const sz = pageRotatedSize(slot.num);
      const maxScaleByDim = MAX_BASE_DIM / Math.max(sz.w, sz.h);
      const targetScale = Math.min(S.scale * dpr, maxScaleByDim);

      if (slot.baseCanvas && Math.abs(slot.baseScale - targetScale) / Math.max(0.01, targetScale) < 0.08) {
        return;
      }
      if (slot.task) {
        if (Math.abs((slot.pendingBaseScale || 0) - targetScale) / Math.max(0.01, targetScale) < 0.08) return;
        try { slot.task.cancel(); } catch (e) {}
        slot.task = null;
      }
      if (activeBaseRenders >= 2) {
        setTimeout(() => ensureBaseRendered(slot), 45);
        return;
      }

      slot.pendingBaseScale = targetScale;
      activeBaseRenders++;
      try {
        const page = await pdfDoc.getPage(slot.num);
        if (destroyed || !pdfDoc) return;
        const vp1 = page.getViewport({ scale: 1, rotation: 0 });
        const curDim = S.pageDims[slot.num - 1];
        if (!curDim || Math.abs(curDim.w - vp1.width) > 1 || Math.abs(curDim.h - vp1.height) > 1) {
          S.pageDims[slot.num - 1] = { w: vp1.width, h: vp1.height };
          applySlotSizes();
        }
        const viewport = page.getViewport({ scale: targetScale, rotation: S.rotation });
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
        if (slot.task !== task || destroyed) {
          off.width = 0; off.height = 0;
          return;
        }
        slot.task = null;
        slot.baseScale = targetScale;

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
        // Cancelado por scroll rápido
      } finally {
        activeBaseRenders = Math.max(0, activeBaseRenders - 1);
      }
    }

    // ---------- Tile HD recortado al viewport en zoom alto ----------
    async function ensureHdTile(slot) {
      if (destroyed || !pdfDoc || S.pinching || S.animatingZoom) return;
      const dpr = effectiveDpr();
      const desiredScale = S.scale * dpr;
      if (slot.baseCanvas && slot.baseScale >= desiredScale * 0.92) {
        releaseHd(slot);
        return;
      }
      const cr = scroller.getBoundingClientRect();
      const pr = slot.el.getBoundingClientRect();
      if (pr.bottom <= cr.top || pr.top >= cr.bottom || pr.right <= cr.left || pr.left >= cr.right) {
        releaseHd(slot);
        return;
      }

      const pad = 90;
      const vx0 = Math.max(0, Math.floor((cr.left - pad) - pr.left));
      const vy0 = Math.max(0, Math.floor((cr.top - pad) - pr.top));
      const vx1 = Math.min(slot.w, Math.ceil((cr.right + pad) - pr.left));
      const vy1 = Math.min(slot.h, Math.ceil((cr.bottom + pad) - pr.top));
      const tw = vx1 - vx0;
      const th = vy1 - vy0;
      if (tw < 20 || th < 20) return;

      const tileDpr = Math.min(dpr, MAX_TILE_DIM / Math.max(tw, th));
      const key = `${S.scale.toFixed(3)}:${S.rotation}:${vx0},${vy0},${tw},${th}:${tileDpr.toFixed(2)}`;
      if (slot.hdKey === key && slot.hdCanvas) return;

      if (slot.hdTask) { try { slot.hdTask.cancel(); } catch (e) {} slot.hdTask = null; }
      if (activeHdRenders >= 1) return;

      activeHdRenders++;
      try {
        const page = await pdfDoc.getPage(slot.num);
        if (destroyed || !pdfDoc || S.pinching) return;
        const viewport = page.getViewport({ scale: S.scale, rotation: S.rotation });
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
        if (slot.hdTask !== task || destroyed || S.pinching) {
          off.width = 0; off.height = 0;
          return;
        }
        slot.hdTask = null;
        slot.hdKey = key;

        const old = slot.hdCanvas;
        slot.hdCanvas = off;
        if (slot.baseCanvas && slot.baseCanvas.nextSibling) {
          slot.el.insertBefore(off, slot.baseCanvas.nextSibling);
        } else {
          slot.el.insertBefore(off, slot.hlEl);
        }
        if (old) { old.width = 0; old.height = 0; old.remove(); }
      } catch (e) {
      } finally {
        activeHdRenders = Math.max(0, activeHdRenders - 1);
      }
    }

    // ---------- Capa de texto SIEMPRE ACTIVA multipágina con ajuste scaleX ----------
    // Cada coordenada se expresa con `calc(val * var(--scale-factor))` para que hacer zoom
    // reescale los textos al instante sin reconstruir el DOM ni perder la selección.
    async function ensureTextLayer(slot) {
      if (destroyed || !pdfDoc) return;
      if (slot.textBuilt && slot.textRot === S.rotation) {
        if (slot.textScale !== S.scale) {
          slot.textWrap.style.setProperty("--scale-factor", String(S.scale));
          slot.textScale = S.scale;
        }
        return;
      }
      if (slot.textBuilding) return;
      if (activeTextBuilds >= 2) {
        setTimeout(() => { if (!destroyed && pdfDoc && !slot.textBuilt) ensureTextLayer(slot); }, 60);
        return;
      }

      slot.textBuilding = true;
      activeTextBuilds++;
      const buildRot = S.rotation;
      try {
        const page = await pdfDoc.getPage(slot.num);
        if (destroyed || !pdfDoc || buildRot !== S.rotation) return;
        const tc = await getPageTextData(slot.num, page);
        if (destroyed || !pdfDoc || buildRot !== S.rotation) return;
        const vp1 = page.getViewport({ scale: 1, rotation: buildRot });

        const frag = document.createDocumentFragment();
        const items = tc.items || [];
        const styles = tc.styles || {};

        let prevRight = -999;
        let prevBaseline = -999;
        let prevFontH = 10;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const str = item.str;
          if (!str) {
            if (item.hasEOL) frag.append(document.createElement("br"));
            continue;
          }
          const tx = multiplyTransform(vp1.transform, item.transform);
          const fontH = Math.hypot(tx[2], tx[3]) || Math.hypot(tx[0], tx[1]) || 10;
          const angle = Math.atan2(tx[1], tx[0]);
          const left = tx[4];
          const baseline = tx[5];
          const top = baseline - fontH * 0.86;
          const styleObj = styles[item.fontName];
          const family = (styleObj && styleObj.fontFamily) || "sans-serif";
          const targetW = item.width > 0 ? item.width : 0;

          // Separación real con <br> / espacios para que copiar párrafos y varias páginas
          // produzca saltos de línea limpios y jamás pegue palabras
          if (i > 0) {
            const dy = Math.abs(baseline - prevBaseline);
            if (dy > Math.max(fontH, prevFontH) * 0.55) {
              frag.append(document.createElement("br"));
            } else if (left - prevRight > Math.max(1.2, fontH * 0.14) && !str.startsWith(" ")) {
              frag.append(document.createTextNode(" "));
            }
          }

          const span = document.createElement("span");
          span.textContent = str;
          span.style.left = left.toFixed(2) + "px";
          span.style.top = top.toFixed(2) + "px";
          span.style.fontSize = Math.max(4, fontH).toFixed(2) + "px";
          span.style.fontFamily = family;

          const transforms = [];
          if (Math.abs(angle) > 0.01) transforms.push(`rotate(${angle.toFixed(4)}rad)`);
          if (targetW > 0.5 && str.trim().length > 0) {
            const measured = measureTextWidth(str, Math.max(4, fontH), family);
            if (measured > 0.5) {
              const sx = Math.max(0.5, Math.min(2.4, targetW / measured));
              if (Math.abs(sx - 1) > 0.015) transforms.push(`scaleX(${sx.toFixed(4)})`);
            }
          }
          if (transforms.length) span.style.transform = transforms.join(" ");
          frag.append(span);
          if (item.hasEOL) frag.append(document.createElement("br"));

          prevRight = left + (targetW || (str.length * fontH * 0.5));
          prevBaseline = baseline;
          prevFontH = fontH;
        }
        // Salto de página limpio al copiar entre página N y página N+1
        if (items.length) {
          frag.append(document.createElement("br"), document.createElement("br"));
        }

        slot.textWrap.style.width = vp1.width.toFixed(2) + "px";
        slot.textWrap.style.height = vp1.height.toFixed(2) + "px";
        slot.textWrap.style.setProperty("--scale-factor", String(S.scale));
        slot.textWrap.replaceChildren(frag);
        slot.textBuilt = true;
        slot.textRot = buildRot;
        slot.textScale = S.scale;
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
      const content = await page.getTextContent();
      const data = {
        items: content.items || [],
        styles: content.styles || {},
        vp1: page.getViewport({ scale: 1, rotation: 0 }),
      };
      S.textCache.set(num, data);
      if (S.textCache.size > MAX_TEXT_CACHE) {
        const oldest = S.textCache.keys().next().value;
        S.textCache.delete(oldest);
      }
      return data;
    }

    // ---------- Extracción estructurada de texto (Modo Líquido, Voz alta y Copiar rango) ----------
    async function getPageBlocks(num) {
      if (!pdfDoc) return [];
      const data = await getPageTextData(num);
      const items = data.items || [];
      if (!items.length) return [];

      // Agrupar items en líneas visuales
      const lines = [];
      let curLine = null;
      const heights = [];

      for (const it of items) {
        const str = String(it.str || "");
        if (!str.trim() && !it.hasEOL) continue;
        const tx = it.transform || [1, 0, 0, 1, 0, 0];
        const fh = Math.hypot(tx[2], tx[3]) || Math.hypot(tx[0], tx[1]) || 10;
        const x = tx[4];
        const y = tx[5]; // En coordenadas PDF, Y sube hacia arriba
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
        if (txt) {
          out.push(b > a ? (`--- Página ${p} ---\n` + txt) : txt);
        }
        if (onProgress) onProgress(p - a + 1, b - a + 1);
      }
      return out.join("\n\n");
    }

    // ---------- Miniatura rápida para Organizar páginas (reutiliza el mismo Worker) ----------
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
      return url;
    }

    // ---------- Enlaces y detección de formularios ----------
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
      } catch (e) {
        return null;
      }
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
      } catch (e) {
        return S.lastSelectedText || "";
      }
    }

    // ---------- Búsqueda ultrarrápida en Worker ----------
    let searchToken = 0;
    async function search(query) {
      const q = String(query || "").trim();
      S.searchQuery = q;
      S.searchMatches = [];
      S.searchPos = -1;
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
      if (m.page !== S.page || S.layout === "single") {
        goToPage(m.page, { recordHistory: false, instant: true });
      }
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
      const pageMatches = S.searchMatches
        .map((m, idx) => ({ m, idx }))
        .filter((x) => x.m.page === slot.num);
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
      searchToken++;
      S.searchQuery = "";
      S.searchMatches = [];
      S.searchPos = -1;
      for (const slot of S.slots) slot.hlEl.replaceChildren();
    }

    // ---------- Índice (Outline / Marcadores del PDF) ----------
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
      } catch (e) {
        S.outline = [];
        return [];
      }
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
          scroller.scrollLeft = 0;
          scroller.scrollTop = 0;
        }
      } else {
        const slot = getSlot(target);
        if (slot) {
          const top = Math.max(0, slot.el.offsetTop - 8);
          scroller.scrollTop = top;
        }
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
      const to = S.back.pop();
      S.fwd.push(S.page);
      if (opts.onHistoryChange) opts.onHistoryChange(S.back[S.back.length - 1] || 0);
      goToPage(to, { instant: true });
      return true;
    }

    function forward() {
      if (!S.fwd.length) return false;
      const to = S.fwd.pop();
      S.back.push(S.page);
      if (opts.onHistoryChange) opts.onHistoryChange(S.back[S.back.length - 1] || 0);
      goToPage(to, { instant: true });
      return true;
    }

    // ---------- Zoom atómico sin salto ni parpadeo ----------
    function findAnchorAt(clientX, clientY) {
      const cr = scroller.getBoundingClientRect();
      const vx = clientX - cr.left;
      const vy = clientY - cr.top;
      let bestSlot = getSlot(S.page) || S.slots[0];
      let bestDist = Infinity;
      for (const slot of S.slots) {
        const r = slot.el.getBoundingClientRect();
        if (clientY >= r.top && clientY <= r.bottom && clientX >= r.left && clientX <= r.right) {
          bestSlot = slot;
          break;
        }
        const dy = clientY < r.top ? r.top - clientY : clientY > r.bottom ? clientY - r.bottom : 0;
        const dx = clientX < r.left ? r.left - clientX : clientX > r.right ? clientX - r.right : 0;
        const d = dy * 2 + dx;
        if (d < bestDist) { bestDist = d; bestSlot = slot; }
      }
      if (!bestSlot) return null;
      const r = bestSlot.el.getBoundingClientRect();
      const fx = r.width > 0 ? (clientX - r.left) / r.width : 0.5;
      const fy = r.height > 0 ? (clientY - r.top) / r.height : 0.5;
      return { slot: bestSlot, fx, fy, vx, vy };
    }

    function commitScaleAt(newScale, anchor) {
      const clamped = Math.max(S.minScale, Math.min(S.maxScale, newScale));
      S.scale = clamped;
      stage.style.transition = "";
      stage.style.transform = "";
      stage.style.transformOrigin = "";
      stage.style.willChange = "";
      applySlotSizes();

      if (anchor && anchor.slot && anchor.slot.el.isConnected) {
        const el = anchor.slot.el;
        const pageLeft = el.offsetLeft + stage.offsetLeft;
        const pageTop = el.offsetTop + stage.offsetTop;
        const maxSL = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
        const maxST = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        scroller.scrollLeft = Math.max(0, Math.min(maxSL, pageLeft + anchor.fx * el.offsetWidth - anchor.vx));
        scroller.scrollTop = Math.max(0, Math.min(maxST, pageTop + anchor.fy * el.offsetHeight - anchor.vy));
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
      const tx = sx - ratio * sx;
      const ty = sy - ratio * sy;

      S.animatingZoom = true;
      stage.style.transformOrigin = "0 0";
      stage.style.willChange = "transform";
      stage.style.transition = "transform 175ms cubic-bezier(.25,.8,.25,1)";
      stage.style.transform = `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${ratio.toFixed(5)})`;

      zoomAnimTimer = setTimeout(() => {
        S.animatingZoom = false;
        commitScaleAt(clamped, anchor);
      }, 185);
    }

    function fitWidth() {
      if (!pdfDoc) return;
      S.fitScale = computeFitScale(S.page);
      S.minScale = Math.max(0.22, S.fitScale * 0.65);
      S.maxScale = Math.max(4.5, S.fitScale * 6.5);
      const cr = scroller.getBoundingClientRect();
      const anchor = findAnchorAt(cr.left + cr.width / 2, cr.top + cr.height / 2);
      commitScaleAt(S.fitScale, anchor);
      scroller.scrollLeft = 0;
    }

    function fitPage() {
      if (!pdfDoc) return;
      const target = computeFitPageScale(S.page);
      const cr = scroller.getBoundingClientRect();
      const anchor = findAnchorAt(cr.left + cr.width / 2, cr.top + cr.height / 2);
      commitScaleAt(target, anchor);
      scroller.scrollLeft = 0;
    }

    function setZoomPercent(pct) {
      if (!pdfDoc) return;
      const cr = scroller.getBoundingClientRect();
      const anchor = findAnchorAt(cr.left + cr.width / 2, cr.top + cr.height / 2);
      commitScaleAt(scaleFromZoomPercent(pct), anchor);
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
      S.fitScale = computeFitScale(cur);
      S.scale = S.fitScale;
      releaseAllCanvases();
      for (const slot of S.slots) {
        slot.annotLoaded = false;
        slot.annotEl.replaceChildren();
        slot.textBuilt = false;
        slot.textWrap.replaceChildren();
      }
      applySlotSizes();
      goToPage(cur, { instant: true });
    }

    // ---------- Gestos táctiles 100 % compatibles con selección nativa multipágina de iOS ----------
    // Regla de oro: NUNCA bloquear 1 dedo en touchstart/touchmove (salvo swipe en Página única sin selección)
    // para que Safari iOS permita mantener pulsado y arrastrar los tiradores azules entre párrafos y páginas
    // con desplazamiento automático suave y cero bloqueos.
    let cleanupListeners = null;
    function attachGestures() {
      if (!scroller) return;
      let pinch = null;
      let pinchRaf = 0;
      let tap = null;
      let lastTap = { t: 0, x: 0, y: 0 };
      let singleTapTimer = null;
      let swipeDx = 0;
      let lastScrollAt = 0;

      const pair = (a, b) => ({
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2,
        d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      });

      function startPinch(a, b) {
        clearTimeout(singleTapTimer);
        clearTimeout(zoomAnimTimer);
        S.animatingZoom = false;
        tap = null;
        if (swipeDx) { stage.style.transform = ""; swipeDx = 0; }

        const p = pair(a, b);
        const sr = stage.getBoundingClientRect();
        const cr = scroller.getBoundingClientRect();
        const anchor = findAnchorAt(p.x, p.y);
        pinch = {
          a: a.identifier, b: b.identifier,
          d0: Math.max(12, p.d),
          srLeft: sr.left, srTop: sr.top,
          sx0: p.x - sr.left, sy0: p.y - sr.top,
          crLeft: cr.left, crTop: cr.top,
          scale0: S.scale,
          minR: S.minScale / S.scale,
          maxR: S.maxScale / S.scale,
          ratio: 1,
          vx: p.x - cr.left, vy: p.y - cr.top,
          tx: 0, ty: 0,
          anchor,
          dirty: false,
        };
        S.pinching = true;
        stage.style.transition = "";
        stage.style.transformOrigin = "0 0";
        stage.style.willChange = "transform";
      }

      function renderPinch() {
        pinchRaf = 0;
        if (!pinch || !pinch.dirty) return;
        pinch.dirty = false;
        stage.style.transform = `translate3d(${pinch.tx.toFixed(2)}px,${pinch.ty.toFixed(2)}px,0) scale(${pinch.ratio.toFixed(5)})`;
      }

      function finishPinch(cancelled) {
        if (pinchRaf) { cancelAnimationFrame(pinchRaf); pinchRaf = 0; }
        const pg = pinch;
        pinch = null;
        S.pinching = false;
        if (!pg) return;
        if (cancelled || Math.abs(pg.ratio - 1) < 0.004) {
          stage.style.transform = "";
          stage.style.transformOrigin = "";
          stage.style.willChange = "";
          return;
        }
        const finalAnchor = pg.anchor ? {
          slot: pg.anchor.slot,
          fx: pg.anchor.fx,
          fy: pg.anchor.fy,
          vx: pg.vx,
          vy: pg.vy,
        } : null;
        commitScaleAt(pg.scale0 * pg.ratio, finalAnchor);
      }

      function onTouchStart(e) {
        if (e.touches.length >= 2) {
          e.preventDefault();
          startPinch(e.touches[0], e.touches[1]);
          return;
        }
        if (pinch) return;
        if (e.target && e.target.closest && e.target.closest(".pc-pdf-link, .pc-pdf-field")) return;
        // No rastrear toques de doble toque / inmersivo si ya hay texto seleccionado (dejamos arrastrar tiradores libres)
        const hadSel = hasActiveSelection();
        const t = e.touches[0];
        const now = performance.now();
        tap = {
          id: t.identifier,
          x0: t.clientX, y0: t.clientY,
          x: t.clientX, y: t.clientY,
          t0: now,
          moved: false,
          swiping: false,
          hadSel,
          wasScrolling: (now - lastScrollAt) < 90,
        };
      }

      function onTouchMove(e) {
        if (pinch) {
          e.preventDefault();
          const a = Array.prototype.find.call(e.touches, (t) => t.identifier === pinch.a) || e.touches[0];
          const b = Array.prototype.find.call(e.touches, (t) => t.identifier === pinch.b) || e.touches[1];
          if (!a || !b) return;
          const p = pair(a, b);
          const ratio = Math.max(pinch.minR, Math.min(pinch.maxR, p.d / pinch.d0));
          pinch.ratio = ratio;
          pinch.vx = p.x - pinch.crLeft;
          pinch.vy = p.y - pinch.crTop;
          pinch.tx = (p.x - pinch.srLeft) - ratio * pinch.sx0;
          pinch.ty = (p.y - pinch.srTop) - ratio * pinch.sy0;
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
          if (e.touches.length < 2) {
            e.preventDefault();
            finishPinch(e.type === "touchcancel");
          }
          return;
        }
        if (!tap) return;
        const ended = Array.prototype.find.call(e.changedTouches, (x) => x.identifier === tap.id);
        if (!ended) return;
        const was = tap;
        tap = null;

        if (was.swiping) {
          const dx = ended.clientX - was.x0;
          stage.style.transition = "transform 160ms ease";
          stage.style.transform = "";
          swipeDx = 0;
          setTimeout(() => { if (stage) stage.style.transition = ""; }, 170);
          if (e.type !== "touchcancel" && Math.abs(dx) > 50) {
            stepPage(dx < 0 ? 1 : -1);
          }
          return;
        }
        // Si fue pulsación larga (>360ms), arrastre, scroll o selección activa, no disparar tap/doble toque
        const dt = performance.now() - was.t0;
        if (was.moved || was.wasScrolling || was.hadSel || dt > 340 || e.type === "touchcancel" || hasActiveSelection()) {
          return;
        }

        const now = performance.now();
        const isDouble = (was.t0 - lastTap.t) < DOUBLE_TAP_MS &&
          Math.hypot(was.x0 - lastTap.x, was.y0 - lastTap.y) < DOUBLE_TAP_DIST;
        if (isDouble) {
          clearTimeout(singleTapTimer);
          lastTap = { t: 0, x: 0, y: 0 };
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
        scrollRaf = requestAnimationFrame(() => {
          scrollRaf = 0;
          scheduleUpdate(0);
        });
      }

      function onSelectionChangeDom() {
        clearTimeout(selTimer);
        selTimer = setTimeout(() => {
          if (destroyed || !host) return;
          try {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed || !sel.rangeCount) {
              if (S.lastSelectedText) {
                S.lastSelectedText = "";
                if (opts.onSelectionChange) opts.onSelectionChange("");
              }
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
        const factor = Math.exp(-e.deltaY / 160);
        const anchor = findAnchorAt(e.clientX, e.clientY);
        commitScaleAt(S.scale * factor, anchor);
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
        clearTimeout(singleTapTimer);
        clearTimeout(zoomAnimTimer);
        clearTimeout(selTimer);
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
      S.thumbSent = false;
      S.hasForms = false;
      S.outline = null;
      S.back = [];
      S.fwd = [];
      S.textCache.clear();
      S.searchQuery = "";
      S.searchMatches = [];
      S.searchPos = -1;
      S.lastSelectedText = "";

      const pdfjsLib = await loadPdfJs();
      if (destroyed) return null;

      // Streaming por Blob URL: evita copiar PDFs de 100-400 MB en el heap JS de Safari iOS!
      let docOpts;
      if (blobOrBytes instanceof Blob) {
        objectUrl = rawCreateURL(blobOrBytes);
        docOpts = {
          url: objectUrl,
          standardFontDataUrl: "./pdfjs/standard_fonts/",
          isEvalSupported: false,
          useSystemFonts: true,
          disableAutoFetch: true,
          rangeChunkSize: 262144,
        };
      } else {
        const bytes = blobOrBytes instanceof Uint8Array
          ? new Uint8Array(blobOrBytes)
          : new Uint8Array(blobOrBytes.slice(0));
        docOpts = {
          data: bytes,
          standardFontDataUrl: "./pdfjs/standard_fonts/",
          isEvalSupported: false,
          useSystemFonts: true,
        };
      }

      let loadingTask = pdfjsLib.getDocument(docOpts);
      try {
        pdfDoc = await loadingTask.promise;
      } catch (err) {
        if (err && (err.name === "PasswordException" || /password/i.test(String(err.message || "")))) {
          rawRevokeURL(objectUrl); objectUrl = null;
          const e = new Error("PDF protegido con contraseña");
          e.code = "PASSWORD_REQUIRED";
          throw e;
        }
        // Respaldo a buffer si algún entorno restringiera fetch de blob: en Worker
        if (blobOrBytes instanceof Blob && objectUrl) {
          rawRevokeURL(objectUrl); objectUrl = null;
          const bytes = new Uint8Array(await blobOrBytes.arrayBuffer());
          loadingTask = pdfjsLib.getDocument({
            data: bytes,
            standardFontDataUrl: "./pdfjs/standard_fonts/",
            isEvalSupported: false,
            useSystemFonts: true,
          });
          pdfDoc = await loadingTask.promise;
        } else {
          throw err;
        }
      }
      if (destroyed) {
        pdfDoc.destroy().catch(() => {});
        pdfDoc = null;
        rawRevokeURL(objectUrl); objectUrl = null;
        return null;
      }

      S.pages = pdfDoc.numPages || 1;
      S.page = Math.max(1, Math.min(S.pages, S.page));

      const p1 = await pdfDoc.getPage(1);
      const vp1 = p1.getViewport({ scale: 1, rotation: 0 });
      S.pageDims = Array.from({ length: S.pages }, () => ({ w: vp1.width, h: vp1.height }));

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
      if (wasFit && Math.abs(S.fitScale - oldFit) > 0.005) {
        fitWidth();
      } else {
        applySlotSizes();
        reportScrollProgress();
        updateVisible(false);
      }
    }

    function close() {
      destroyed = true;
      clearTimeout(renderTimer);
      clearTimeout(hdTimer);
      clearTimeout(zoomAnimTimer);
      clearTimeout(selTimer);
      if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = 0; }
      S.pinching = false;
      S.animatingZoom = false;
      activeBaseRenders = 0;
      activeHdRenders = 0;
      activeTextBuilds = 0;
      searchToken++;
      if (cleanupListeners) { cleanupListeners(); cleanupListeners = null; }
      cancelAllRenders();
      releaseAllCanvases();
      S.slots = [];
      S.textCache.clear();
      S.outline = null;
      S.searchQuery = "";
      S.searchMatches = [];
      S.lastSelectedText = "";
      if (pdfDoc) {
        const d = pdfDoc;
        pdfDoc = null;
        d.destroy().catch(() => {});
      }
      if (objectUrl) {
        rawRevokeURL(objectUrl);
        objectUrl = null;
      }
      if (host) host.replaceChildren();
      scroller = null;
      stage = null;
    }

    return {
      open,
      close,
      resize,
      goToPage,
      scrollToFraction,
      stepPage,
      back,
      forward,
      fitWidth,
      fitPage,
      setZoomPercent,
      setLayout,
      setPageGaps,
      rotateCw,
      search,
      nextMatch: () => jumpToMatch(S.searchPos + 1),
      prevMatch: () => jumpToMatch(S.searchPos - 1),
      clearSearch,
      getOutline: () => (S.outline ? Promise.resolve(S.outline) : loadOutline()),
      getPageBlocks,
      getPagePlainText,
      extractTextRange,
      renderThumbnail,
      clearSelection,
      getSelectedText,
      isOpen: () => !!pdfDoc && !destroyed,
      getState: () => ({
        page: S.page,
        pages: S.pages,
        zoomPercent: zoomPercentOf(S.scale),
        fitZoomPercent: zoomPercentOf(S.fitScale),
        layout: S.layout,
        pageGaps: S.pageGaps,
        rotation: S.rotation,
        scale: S.scale,
        fitScale: S.fitScale,
        backCount: S.back.length,
        fwdCount: S.fwd.length,
        lastBackPage: S.back.length ? S.back[S.back.length - 1] : 0,
        pinching: S.pinching,
        hasForms: S.hasForms,
      }),
    };
  }

  window.pdfcraftReader = { create, preload: loadPdfJs };
})();
