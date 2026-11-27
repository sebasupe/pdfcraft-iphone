// PdfCraft para iPhone: lector PDF ultrarrápido de nivel nativo iOS impulsado por Mozilla PDF.js
// en Web Worker (fuera del hilo principal).
//
// Características:
//   · Scroll nativo de iOS (UIScrollView / CoreAnimation a 60/120 Hz, sin tirones ni bloqueos WASM);
//   · Pellizco acelerado por GPU (translate3d + scale) con commit atómico sin salto ni parpadeo;
//   · Doble toque animado al punto exacto tocado y re-renderizado nítido en segundo plano (doble búfer);
//   · Tiles HD recortados al área visible en zoom alto (>1.6×) para nitidez Retina sin exceder RAM en iOS;
//   · Caché LRU de lienzos (máx. 7 páginas activas) para no superar el límite de memoria de Safari iOS;
//   · Búsqueda instantánea en Worker con resaltado sobre las palabras, índice (outline), enlaces y texto.
(function () {
  "use strict";

  const MAX_CANVAS_PAGES = 7;
  const MAX_BASE_DIM = 1550; // px máx del lienzo base por lado (rápido y seguro en RAM iOS)
  const MAX_TILE_DIM = 2200; // px máx del tile HD visible por lado
  const DOUBLE_TAP_MS = 320;
  const DOUBLE_TAP_DIST = 38;
  const LONG_PRESS_MS = 380;
  const SLOP = 9;

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

  function create() {
    let host = null;
    let scroller = null;
    let stage = null;
    let pdfDoc = null;
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
      dpr: 2,
      pageDims: [],    // [{ w, h }] en puntos PDF (rotación 0)
      slots: [],       // [{ num, el, baseCanvas, baseScale, hdCanvas, hdKey, textEl, annotEl, hlEl, task, hdTask, textLoaded, annotLoaded, lastUsed }]
      textCache: new Map(), // pageNum -> { items, text }
      searchQuery: "",
      searchMatches: [], // [{ page, idx, text }]
      searchPos: -1,
      outline: null,
      hasForms: false,
      back: [],
      fwd: [],
      pinching: false,
      animatingZoom: false,
      selectingPage: 0,
    };

    let renderTimer = null;
    let hdTimer = null;
    let scrollRaf = 0;
    let activeBaseRenders = 0;
    let activeHdRenders = 0;
    let zoomAnimTimer = null;

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
      const pad = 12;
      if (S.layout === "two-page") {
        const gap = S.pageGaps ? 8 : 0;
        return Math.max(0.15, (vp.w - pad * 2 - gap) / (sz.w * 2));
      }
      return Math.max(0.15, (vp.w - pad * 2) / sz.w);
    }

    function computeFitPageScale(pageNum) {
      const vp = viewportSize();
      const sz = pageRotatedSize(pageNum || S.page || 1);
      const pad = 12;
      const sw = S.layout === "two-page" ? (vp.w - pad * 2 - (S.pageGaps ? 8 : 0)) / (sz.w * 2) : (vp.w - pad * 2) / sz.w;
      const sh = (vp.h - pad * 2) / sz.h;
      return Math.max(0.15, Math.min(sw, sh));
    }

    function zoomPercentOf(scale) {
      // Escala 1.0 en PDF.js = 72pt * (96/72) = 96dpi -> 75% de 1.3333; normalizamos a 100% = 1.3333 como PdfCraft/Acrobat
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
        // En página única mostramos solo la página actual (más rápida y centrada).
        const slot = makeSlot(S.page);
        S.slots.push(slot);
        stage.append(slot.el);
      } else if (S.layout === "two-page") {
        // Dos páginas por fila
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
        // Continuo: un contenedor ligero por página con sus dimensiones exactas.
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
      const annotEl = document.createElement("div");
      annotEl.className = "pc-page-annots";
      el.append(hlEl, annotEl);
      return {
        num, el, hlEl, annotEl,
        baseCanvas: null, baseScale: 0,
        hdCanvas: null, hdKey: "",
        textEl: null, textLoaded: false,
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

      for (const slot of S.slots) {
        const sz = pageRotatedSize(slot.num);
        const w = Math.max(40, Math.round(sz.w * S.scale));
        const h = Math.max(40, Math.round(sz.h * S.scale));
        slot.w = w;
        slot.h = h;
        slot.el.style.width = w + "px";
        slot.el.style.height = h + "px";
        if (w > maxW) maxW = w;
      }
      const neededW = S.layout === "two-page" ? (maxW * 2 + gap + 16) : (maxW + 16);
      stage.style.width = Math.max(vp.w, neededW) + "px";
    }

    function getSlot(num) {
      if (S.layout === "single") return S.slots[0] && S.slots[0].num === num ? S.slots[0] : null;
      return S.slots[num - 1] || null;
    }

    // ---------- Gestión de memoria y cancelación de renders ----------
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
      if (rendered.length + visibleSet.size <= MAX_CANVAS_PAGES) return;
      rendered.sort((a, b) => a.lastUsed - b.lastUsed);
      let toDrop = (rendered.length + visibleSet.size) - MAX_CANVAS_PAGES;
      for (const slot of rendered) {
        if (toDrop <= 0) break;
        releaseSlotCanvas(slot);
        toDrop--;
      }
    }

    // ---------- Detección de páginas visibles y página actual ----------
    function findVisibleSlots() {
      if (!scroller || !S.slots.length) return { visible: [], primary: S.page };
      if (S.layout === "single") {
        return { visible: [S.slots[0]], primary: S.slots[0].num };
      }
      const cr = scroller.getBoundingClientRect();
      const topY = cr.top;
      const botY = cr.bottom;
      const midY = (topY + botY) * 0.5;
      const margin = Math.max(240, cr.height * 0.7);
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

    function updateVisible(immediate) {
      if (destroyed || !pdfDoc || S.pinching || S.animatingZoom) return;
      const { visible, primary } = findVisibleSlots();
      if (primary !== S.page) {
        S.page = primary;
        if (opts.onPageChange) opts.onPageChange(S.page, S.pages);
      }
      const now = performance.now();
      const visSet = new Set();
      for (const slot of visible) {
        slot.lastUsed = now;
        visSet.add(slot.num);
      }
      // Ordenar primero la página más cercana a la actual
      visible.sort((a, b) => Math.abs(a.num - S.page) - Math.abs(b.num - S.page));
      evictDistantCanvases(visSet);

      // Limpiar tiles HD en páginas fuera de vista
      for (const slot of S.slots) {
        if (!visSet.has(slot.num) && slot.hdCanvas) releaseHd(slot);
      }

      for (const slot of visible) {
        ensureBaseRendered(slot);
        if (!slot.annotLoaded) loadSlotAnnotations(slot);
        if (S.searchQuery) paintSearchHighlights(slot);
      }

      clearTimeout(hdTimer);
      hdTimer = setTimeout(() => {
        if (destroyed || !pdfDoc || S.pinching || S.animatingZoom) return;
        const cur = findVisibleSlots().visible;
        for (const slot of cur) ensureHdTile(slot);
      }, immediate ? 20 : 90);
    }

    function scheduleUpdate(delayMs) {
      clearTimeout(renderTimer);
      if (!delayMs) {
        updateVisible(false);
        return;
      }
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
        // Ya hay un render en curso; si la escala cambió mucho, reiniciarlo
        if (Math.abs((slot.pendingBaseScale || 0) - targetScale) / Math.max(0.01, targetScale) < 0.08) return;
        try { slot.task.cancel(); } catch (e) {}
        slot.task = null;
      }
      if (activeBaseRenders >= 2) {
        // Reintentar al terminar los actuales para no saturar WebKit
        setTimeout(() => ensureBaseRendered(slot), 45);
        return;
      }

      slot.pendingBaseScale = targetScale;
      activeBaseRenders++;
      try {
        const page = await pdfDoc.getPage(slot.num);
        if (destroyed || !pdfDoc) return;
        // Actualizar dimensión real si difería del estimado de la página 1
        const vp1 = page.getViewport({ scale: 1, rotation: 0 });
        const curDim = S.pageDims[slot.num - 1];
        if (!curDim || Math.abs(curDim.w - vp1.width) > 1 || Math.abs(curDim.h - vp1.height) > 1) {
          S.pageDims[slot.num - 1] = { w: vp1.width, h: vp1.height };
          applySlotSizes();
        }
        const viewport = page.getViewport({ scale: targetScale, rotation: S.rotation });
        const cw = Math.max(1, Math.floor(viewport.width));
        const ch = Math.max(1, Math.floor(viewport.height));

        // Lienzo fuera de pantalla (doble búfer): el lienzo previo queda visible sin parpadeo blanco.
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
        if (old) {
          old.width = 0;
          old.height = 0;
          old.remove();
        }

        // Generar miniatura instantánea de la página 1 si aún no existe
        if (slot.num === 1 && opts.onFirstThumb && !S.thumbSent) {
          S.thumbSent = true;
          try {
            const tw = 160;
            const th = Math.max(80, Math.round((tw * ch) / cw));
            const tc = document.createElement("canvas");
            tc.width = tw; tc.height = th;
            const tctx = tc.getContext("2d");
            tctx.fillStyle = "#ffffff";
            tctx.fillRect(0, 0, tw, th);
            tctx.drawImage(off, 0, 0, cw, ch, 0, 0, tw, th);
            opts.onFirstThumb(tc.toDataURL("image/jpeg", 0.74));
            tc.width = 0; tc.height = 0;
          } catch (e) {}
        }
      } catch (e) {
        if (!e || e.name !== "RenderingCancelledException") {
          // Silencioso si fue cancelado por scroll rápido
        }
      } finally {
        activeBaseRenders = Math.max(0, activeBaseRenders - 1);
      }
    }

    // ---------- Tile HD recortado al viewport en zoom alto (>1.5×) ----------
    async function ensureHdTile(slot) {
      if (destroyed || !pdfDoc || S.pinching || S.animatingZoom) return;
      const dpr = effectiveDpr();
      const desiredScale = S.scale * dpr;
      // Solo hace falta tile HD si el lienzo base quedó por debajo de la resolución Retina deseada
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

      // Intersección visible + margen de 90px para panear suavemente
      const pad = 90;
      const vx0 = Math.max(0, Math.floor((cr.left - pad) - pr.left));
      const vy0 = Math.max(0, Math.floor((cr.top - pad) - pr.top));
      const vx1 = Math.min(slot.w, Math.ceil((cr.right + pad) - pr.left));
      const vy1 = Math.min(slot.h, Math.ceil((cr.bottom + pad) - pr.top));
      const tw = vx1 - vx0;
      const th = vy1 - vy0;
      if (tw < 20 || th < 20) return;

      // Escalar tileDpr para jamás pasar de MAX_TILE_DIM en Safari iOS
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
        // Colocar justo encima del lienzo base y debajo de resaltados/enlaces
        if (slot.baseCanvas && slot.baseCanvas.nextSibling) {
          slot.el.insertBefore(off, slot.baseCanvas.nextSibling);
        } else {
          slot.el.insertBefore(off, slot.hlEl);
        }
        if (old) {
          old.width = 0; old.height = 0; old.remove();
        }
      } catch (e) {
        // Cancelado por nuevo scroll/zoom
      } finally {
        activeHdRenders = Math.max(0, activeHdRenders - 1);
      }
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

    // ---------- Capa de texto bajo demanda (pulsación larga para copiar/resaltar) ----------
    async function ensureTextLayer(slot) {
      if (destroyed || !pdfDoc) return null;
      if (slot.textEl && slot.textScale === S.scale && slot.textRot === S.rotation) return slot.textEl;
      const page = await pdfDoc.getPage(slot.num);
      if (destroyed || !pdfDoc) return null;
      const tc = await getPageTextData(slot.num, page);
      const vp = page.getViewport({ scale: S.scale, rotation: S.rotation });

      if (slot.textEl) slot.textEl.remove();
      const layer = document.createElement("div");
      layer.className = "pc-text-layer";
      const frag = document.createDocumentFragment();
      for (const item of tc.items) {
        if (!item.str) continue;
        const tx = multiplyTransform(vp.transform, item.transform);
        const fontHeight = Math.hypot(tx[2], tx[3]) || Math.hypot(tx[0], tx[1]) || 10;
        const angle = Math.atan2(tx[1], tx[0]);
        const span = document.createElement("span");
        span.textContent = item.str;
        const left = tx[4];
        const top = tx[5] - fontHeight * 0.85;
        const width = Math.max(2, (item.width || 0) * S.scale);
        span.style.left = left.toFixed(1) + "px";
        span.style.top = top.toFixed(1) + "px";
        span.style.fontSize = Math.max(4, fontHeight).toFixed(1) + "px";
        span.style.minWidth = width.toFixed(1) + "px";
        if (Math.abs(angle) > 0.01) span.style.transform = `rotate(${angle.toFixed(3)}rad)`;
        frag.append(span);
      }
      layer.append(frag);
      slot.el.append(layer);
      slot.textEl = layer;
      slot.textScale = S.scale;
      slot.textRot = S.rotation;
      return layer;
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
      if (S.textCache.has(num)) return S.textCache.get(num);
      const page = pageObj || (await pdfDoc.getPage(num));
      const content = await page.getTextContent();
      const items = content.items || [];
      const data = { items, vp1: page.getViewport({ scale: 1, rotation: 0 }) };
      S.textCache.set(num, data);
      return data;
    }

    function clearSelection() {
      if (S.selectingPage) {
        const old = getSlot(S.selectingPage);
        if (old && old.textEl) old.textEl.classList.remove("pc-selecting");
        S.selectingPage = 0;
      }
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) sel.removeAllRanges();
      } catch (e) {}
      if (opts.onSelectionChange) opts.onSelectionChange("");
    }

    function getSelectedText() {
      try { return String((window.getSelection && window.getSelection().toString()) || "").trim(); }
      catch (e) { return ""; }
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

      // Ir a la primera coincidencia desde la página actual en adelante
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
      const data = S.textCache.get(slot.num);
      if (!data) return;
      const pageMatches = S.searchMatches
        .map((m, idx) => ({ m, idx }))
        .filter((x) => x.m.page === slot.num);
      if (!pageMatches.length) return;
      const sz = pageRotatedSize(slot.num);
      const vp1 = { width: sz.w, height: sz.h };
      // Construir matriz de página a coordenadas % (independiente del zoom!)
      const rot = S.rotation;
      // Usamos transform de PDF.js con escala 1 y rotación actual si ya tenemos la página
      pdfDoc.getPage(slot.num).then((page) => {
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

    // ---------- Índice (Table of Contents / Outline) ----------
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
          scroller.scrollTo({ top, behavior: o.instant ? "auto" : "auto" });
        }
      }
      if (prev !== target && opts.onPageChange) opts.onPageChange(S.page, S.pages);
      updateVisible(true);
    }

    function stepPage(dir) {
      const step = S.layout === "two-page" ? 2 : 1;
      const target = Math.max(1, Math.min(S.pages, S.page + (dir > 0 ? step : -step)));
      if (target !== S.page) goToPage(target, { instant: true });
    }

    function back() {
      if (!S.back.length) return false;
      const to = S.back.pop();
      S.fwd.push(S.page);
      goToPage(to, { instant: true });
      return true;
    }

    function forward() {
      if (!S.fwd.length) return false;
      const to = S.fwd.pop();
      S.back.push(S.page);
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
      // Limpiar transformación GPU, redimensionar slots y restaurar scroll en UN SOLO frame síncrono!
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

      // Invalidar tiles HD viejos (el lienzo base sigue visible estirado sin parpadeo hasta que llegue el HD)
      for (const slot of S.slots) releaseHd(slot);
      if (opts.onZoomChange) opts.onZoomChange(zoomPercentOf(S.scale));
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
      for (const slot of S.slots) { slot.annotLoaded = false; slot.annotEl.replaceChildren(); }
      applySlotSizes();
      goToPage(cur, { instant: true });
    }

    // ---------- Gestos táctiles nativos (scroll nativo 1 dedo + pellizco GPU 2 dedos + doble toque + selección) ----------
    let cleanupListeners = null;
    function attachGestures() {
      if (!scroller) return;
      let pinch = null;
      let pinchRaf = 0;
      let tap = null;
      let lastTap = { t: 0, x: 0, y: 0 };
      let singleTapTimer = null;
      let longPressTimer = null;
      let swipeDx = 0;
      let lastScrollAt = 0;

      const pair = (a, b) => ({
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2,
        d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      });

      function startPinch(a, b) {
        clearTimeout(singleTapTimer);
        clearTimeout(longPressTimer);
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
        // No interferir si se tocó un enlace o campo de formulario
        if (e.target && e.target.closest && e.target.closest(".pc-pdf-link, .pc-pdf-field")) return;
        const t = e.touches[0];
        const now = performance.now();
        const wasScrolling = (now - lastScrollAt) < 90;
        tap = { id: t.identifier, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY, t0: now, moved: false, longPressed: false, swiping: false, wasScrolling };
        clearTimeout(longPressTimer);
        if (!wasScrolling) {
          longPressTimer = setTimeout(() => {
            if (!tap || tap.moved || pinch) return;
            tap.longPressed = true;
            triggerLongPress(tap.x0, tap.y0);
          }, LONG_PRESS_MS);
        }
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
          clearTimeout(longPressTimer);
          // En página única encajada al ancho, deslizar horizontalmente pasa página suavemente
          if (S.layout === "single" && S.scale <= S.fitScale * 1.05 && Math.abs(dx) > Math.abs(dy) * 1.4) {
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
          const remaining = e.touches.length;
          if (remaining < 2) {
            e.preventDefault();
            finishPinch(e.type === "touchcancel");
          }
          return;
        }
        clearTimeout(longPressTimer);
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
          if (e.type !== "touchcancel" && Math.abs(dx) > 52) {
            stepPage(dx < 0 ? 1 : -1);
          }
          return;
        }
        if (was.moved || was.longPressed || was.wasScrolling || e.type === "touchcancel") return;

        // Si había texto seleccionado, tocar la página limpia la selección
        if (S.selectingPage) {
          clearSelection();
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
          if (opts.onSingleTap) opts.onSingleTap(was.x0, was.y0);
        }, DOUBLE_TAP_MS);
      }

      async function triggerLongPress(clientX, clientY) {
        if (opts.onLongPress) opts.onLongPress(clientX, clientY);
        const anchor = findAnchorAt(clientX, clientY);
        if (!anchor || !anchor.slot) return;
        const slot = anchor.slot;
        const layer = await ensureTextLayer(slot);
        if (!layer || destroyed) return;
        if (S.selectingPage && S.selectingPage !== slot.num) clearSelection();
        S.selectingPage = slot.num;
        layer.classList.add("pc-selecting");

        // Seleccionar el span de texto más cercano al dedo para que aparezcan los tiradores nativos de iOS
        let best = null;
        let bestD = Infinity;
        for (const sp of layer.children) {
          const r = sp.getBoundingClientRect();
          const dx = clientX < r.left ? r.left - clientX : clientX > r.right ? clientX - r.right : 0;
          const dy = clientY < r.top ? r.top - clientY : clientY > r.bottom ? clientY - r.bottom : 0;
          const d = dx + dy * 2;
          if (d < bestD) { bestD = d; best = sp; }
        }
        if (best && bestD < 48) {
          try {
            const range = document.createRange();
            range.selectNodeContents(best);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            const text = String(sel.toString() || "").trim();
            if (text && opts.onSelectionChange) opts.onSelectionChange(text, slot.num);
          } catch (e) {}
        }
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
        if (!S.selectingPage) return;
        const txt = getSelectedText();
        if (opts.onSelectionChange) opts.onSelectionChange(txt, S.selectingPage);
      }

      // Bloquear gestos nativos de zoom de Safari sobre el visor (nosotros lo hacemos a 120fps)
      const blockGesture = (e) => { e.preventDefault(); };

      // Rueda con Ctrl en escritorio / trackpad (también útil para depuración y iPad con trackpad)
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
        clearTimeout(longPressTimer);
        clearTimeout(zoomAnimTimer);
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

      const bytes = blobOrBytes instanceof Uint8Array
        ? new Uint8Array(blobOrBytes)
        : blobOrBytes instanceof ArrayBuffer
          ? new Uint8Array(blobOrBytes.slice(0))
          : new Uint8Array(await blobOrBytes.arrayBuffer());

      const pdfjsLib = await loadPdfJs();
      if (destroyed) return null;

      const loadingTask = pdfjsLib.getDocument({
        data: bytes,
        standardFontDataUrl: "./pdfjs/standard_fonts/",
        isEvalSupported: false,
        useSystemFonts: true,
      });

      try {
        pdfDoc = await loadingTask.promise;
      } catch (err) {
        if (err && (err.name === "PasswordException" || /password/i.test(String(err.message || "")))) {
          const e = new Error("PDF protegido con contraseña");
          e.code = "PASSWORD_REQUIRED";
          throw e;
        }
        throw err;
      }
      if (destroyed) {
        pdfDoc.destroy().catch(() => {});
        pdfDoc = null;
        return null;
      }

      S.pages = pdfDoc.numPages || 1;
      S.page = Math.max(1, Math.min(S.pages, S.page));

      // Leer tamaño de la página 1 de inmediato y usarlo como estimado instantáneo para el resto
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

      // Cargar índice en segundo plano sin bloquear el primer fotograma
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
        updateVisible(false);
      }
    }

    function close() {
      destroyed = true;
      clearTimeout(renderTimer);
      clearTimeout(hdTimer);
      clearTimeout(zoomAnimTimer);
      if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = 0; }
      S.pinching = false;
      S.animatingZoom = false;
      activeBaseRenders = 0;
      activeHdRenders = 0;
      searchToken++;
      if (cleanupListeners) { cleanupListeners(); cleanupListeners = null; }
      cancelAllRenders();
      releaseAllCanvases();
      S.slots = [];
      S.textCache.clear();
      S.outline = null;
      S.searchQuery = "";
      S.searchMatches = [];
      S.selectingPage = 0;
      if (pdfDoc) {
        const d = pdfDoc;
        pdfDoc = null;
        d.destroy().catch(() => {});
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
        pinching: S.pinching,
        hasForms: S.hasForms,
      }),
    };
  }

  window.pdfcraftReader = { create, preload: loadPdfJs };
})();
