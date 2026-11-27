// PdfCraft para iPhone v3: gestor nativo móvil de Páginas y Organizar páginas
// + utilidades locales ultrarrápidas con pdf-lib (combinar, extraer, dividir, girar, reordenar, insertar).
(function () {
  "use strict";

  const ICONS = {
    close: "M6 6l12 12 M18 6L6 18",
    check: "M5 12l5 5 9-10",
    undo: "M9 14L4 9l5-5 M4 9h11a5 5 0 0 1 0 10h-3",
    redo: "M15 14l5-5-5-5 M20 9H9a5 5 0 0 0 0 10h3",
    rotateCcw: "M4 11a8 8 0 1 1 2.3 5.7 M4 4v7h7",
    rotate: "M20 11a8 8 0 1 0-2.3 5.7 M20 4v7h-7",
    move: "M12 3v18 M8 7l4-4 4 4 M8 17l4 4 4-4 M3 12h18 M7 8l-4 4 4 4 M17 8l4 4-4 4",
    copy: "M8 8h12v12H8z M16 8V4H4v12h4",
    plus: "M12 5v14 M5 12h14",
    extract: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M12 18v-7 M9 14l3-3 3 3",
    split: "M12 4v16 M4 9l4 3-4 3 M20 9l-4 3 4 3",
    reverse: "M7 4v16 M4 17l3 3 3-3 M17 20V4 M14 7l3-3 3 3",
    trash: "M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3",
    organize: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
    edit: "M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z M13.5 6.5l4 4",
    crop: "M6 2v14a2 2 0 0 0 2 2h14 M18 22V8a2 2 0 0 0-2-2H2",
    grid2: "M4 4h7v16H4z M13 4h7v16h-7z",
    grid3: "M3 4h5v7H3z M9.5 4h5v7h-5z M16 4h5v7h-5z M3 13h5v7H3z M9.5 13h5v7h-5z M16 13h5v7h-5z",
    grip: "M8 7h8 M8 12h8 M8 17h8",
    blank: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5",
    image: "M4 5h16v14H4z M4 16l5-5 4 4 2-2 5 5 M15.5 9.5h.01",
    open: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M12 11v7 M8.5 14.5h7",
    left: "M15 6l-6 6 6 6",
    right: "M9 6l6 6-6 6",
  };

  function svgIcon(name) {
    return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name] || ""}"/></svg>`;
  }

  function el(tag, props, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "icon") node.insertAdjacentHTML("beforeend", svgIcon(v));
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return node;
  }

  function hasPdfLib() {
    return !!(window.PDFLib && window.PDFLib.PDFDocument);
  }

  function parsePageRanges(str, maxPage) {
    const result = [];
    const seen = new Set();
    const parts = String(str || "").split(/[,;\s]+/).filter(Boolean);
    for (const part of parts) {
      const m = part.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
      if (!m) continue;
      let a = Math.max(1, Math.min(maxPage, parseInt(m[1], 10)));
      let b = m[2] ? Math.max(1, Math.min(maxPage, parseInt(m[2], 10))) : a;
      const step = a <= b ? 1 : -1;
      for (let p = a; step > 0 ? p <= b : p >= b; p += step) {
        if (!seen.has(p)) {
          seen.add(p);
          result.push(p);
        }
      }
    }
    return result;
  }

  // ---------- Operaciones directas con pdf-lib (instantáneas, 100 % offline) ----------
  async function loadPdfLibDoc(blobOrBytes) {
    if (!hasPdfLib()) throw new Error("Motor pdf-lib no disponible.");
    const buf = blobOrBytes instanceof Uint8Array
      ? blobOrBytes
      : blobOrBytes instanceof ArrayBuffer
        ? new Uint8Array(blobOrBytes)
        : new Uint8Array(await blobOrBytes.arrayBuffer());
    try {
      return await window.PDFLib.PDFDocument.load(buf, { ignoreEncryption: false });
    } catch (e) {
      if (/encrypt/i.test(String((e && e.message) || e))) {
        const err = new Error("Este PDF está protegido con contraseña.");
        err.code = "ENCRYPTED";
        throw err;
      }
      throw e;
    }
  }

  async function combinePdfs(fileList, outName) {
    const outDoc = await window.PDFLib.PDFDocument.create();
    let totalPages = 0;
    for (const f of fileList) {
      const src = await loadPdfLibDoc(f);
      const idxs = src.getPageIndices();
      const copied = await outDoc.copyPages(src, idxs);
      for (const p of copied) outDoc.addPage(p);
      totalPages += copied.length;
    }
    const bytes = await outDoc.save();
    const clean = (outName || "Combinado.pdf").replace(/\.pdf$/i, "") + ".pdf";
    return { file: new File([bytes], clean, { type: "application/pdf" }), pages: totalPages };
  }

  async function createBlankPdf(name, width, height) {
    const doc = await window.PDFLib.PDFDocument.create();
    doc.addPage([width || 595.28, height || 841.89]);
    const bytes = await doc.save();
    const clean = (name || "Documento.pdf").replace(/\.pdf$/i, "") + ".pdf";
    return new File([bytes], clean, { type: "application/pdf" });
  }

  async function buildPdfFromDescriptors(origBlob, descriptors, outName) {
    const origDoc = await loadPdfLibDoc(origBlob);
    const outDoc = await window.PDFLib.PDFDocument.create();
    const extCache = new Map();
    const degrees = window.PDFLib.degrees;

    let defaultW = 595.28;
    let defaultH = 841.89;
    if (origDoc.getPageCount() > 0) {
      const sz = origDoc.getPage(0).getSize();
      defaultW = sz.width;
      defaultH = sz.height;
    }

    for (const item of descriptors) {
      if (item.source === "orig") {
        const [copied] = await outDoc.copyPages(origDoc, [item.srcIndex]);
        if (item.rot) {
          const cur = (copied.getRotation && copied.getRotation().angle) || 0;
          copied.setRotation(degrees((cur + item.rot + 360) % 360));
        }
        outDoc.addPage(copied);
      } else if (item.source === "blank") {
        const swap = item.rot % 180 === 90;
        outDoc.addPage([swap ? defaultH : defaultW, swap ? defaultW : defaultH]);
      } else if (item.source === "pdf") {
        let extDoc = extCache.get(item.extId);
        if (!extDoc) {
          extDoc = await loadPdfLibDoc(item.extBlob);
          extCache.set(item.extId, extDoc);
        }
        const [copied] = await outDoc.copyPages(extDoc, [item.srcIndex]);
        if (item.rot) {
          const cur = (copied.getRotation && copied.getRotation().angle) || 0;
          copied.setRotation(degrees((cur + item.rot + 360) % 360));
        }
        outDoc.addPage(copied);
      } else if (item.source === "image") {
        const imgBytes = item.imgBytes;
        const embedded = item.isPng
          ? await outDoc.embedPng(imgBytes)
          : await outDoc.embedJpg(imgBytes);
        const dims = embedded.scale(1);
        const targetW = dims.width > dims.height ? 792 : 595.28;
        const pw = targetW;
        const ph = Math.max(72, (dims.height / Math.max(1, dims.width)) * pw);
        const page = outDoc.addPage([pw, ph]);
        page.drawImage(embedded, { x: 0, y: 0, width: pw, height: ph });
        if (item.rot) page.setRotation(degrees((item.rot + 360) % 360));
      }
    }

    const bytes = await outDoc.save();
    const clean = (outName || "Documento.pdf").replace(/\.pdf$/i, "") + ".pdf";
    return new File([bytes], clean, { type: "application/pdf" });
  }

  async function splitPdfByChunks(origBlob, chunkSize, baseName) {
    const src = await loadPdfLibDoc(origBlob);
    const total = src.getPageCount();
    const n = Math.max(1, Math.min(total, parseInt(chunkSize, 10) || 1));
    const stem = (baseName || "Documento").replace(/\.pdf$/i, "");
    const files = [];
    let part = 1;
    for (let start = 0; start < total; start += n) {
      const end = Math.min(total, start + n);
      const out = await window.PDFLib.PDFDocument.create();
      const idxs = [];
      for (let i = start; i < end; i++) idxs.push(i);
      const copied = await out.copyPages(src, idxs);
      for (const p of copied) out.addPage(p);
      const bytes = await out.save();
      files.push({
        file: new File([bytes], `${stem} (parte ${part}).pdf`, { type: "application/pdf" }),
        pages: copied.length,
      });
      part++;
    }
    return files;
  }

  // ---------- Interfaz nativa móvil de Páginas y Organizar páginas ----------
  let activeSession = null;

  function close() {
    if (!activeSession) return;
    const s = activeSession;
    activeSession = null;
    if (s.io) s.io.disconnect();
    if (s.ownPdfDoc) { s.ownPdfDoc.destroy().catch(() => {}); }
    if (s.ownObjUrl) {
      try { (window.__pcRawRevokeObjectURL || URL.revokeObjectURL)(s.ownObjUrl); } catch (e) {}
    }
    s.overlay.hidden = true;
    s.overlay.replaceChildren();
    document.body.classList.remove("pc-pages-open");
  }

  async function open(options) {
    close();
    const overlay = document.getElementById("pc-pages-overlay");
    if (!overlay) return;

    const {
      blob,
      name,
      pageCount,
      currentPage,
      mode, // "view" | "organize"
      reader,
      toast,
      sheet,
      list,
      onJumpPage,
      onEditPdf,
      onCropPages,
      onApplyChanges,
      onExtractedPdf,
      onSplitPdfs,
      onFallbackEngine,
    } = options;

    const tell = toast || ((m) => console.log(m));
    let uid = 1;
    const makeId = () => "pg_" + (uid++);

    const S = {
      overlay,
      mode: mode === "organize" ? "organize" : "view",
      cols: 2,
      dirty: false,
      currentPage: Math.max(1, Math.min(pageCount || 1, currentPage || 1)),
      pages: [],
      selected: new Set(),
      undoStack: [],
      redoStack: [],
      thumbCache: new Map(), // key -> dataUrl
      thumbQueue: [],
      activeThumbs: 0,
      io: null,
      ownPdfDoc: null,
      ownObjUrl: null,
      saving: false,
      drag: null,
    };

    for (let i = 0; i < (pageCount || 1); i++) {
      S.pages.push({ id: makeId(), source: "orig", srcIndex: i, rot: 0, origNum: i + 1 });
    }
    activeSession = S;

    // Si el lector rápido no está abierto, cargamos una instancia ligera de PDF.js solo para miniaturas
    async function renderThumbFor(item) {
      if (item.source === "blank") return null;
      if (item.source === "image") return item.thumbUrl || null;
      const cacheKey = item.source === "orig" ? ("orig:" + item.srcIndex) : (item.extId + ":" + item.srcIndex);
      if (S.thumbCache.has(cacheKey)) return S.thumbCache.get(cacheKey);
      if (item.source === "pdf" && item.thumbUrl) return item.thumbUrl;

      let url = null;
      if (item.source === "orig") {
        if (reader && reader.isOpen && reader.isOpen() && reader.renderThumbnail) {
          url = await reader.renderThumbnail(item.srcIndex + 1, 240, 0).catch(() => null);
        }
        if (!url && blob && window.pdfcraftReader && window.pdfcraftReader.preload) {
          if (!S.ownPdfDoc) {
            const pdfjsLib = await window.pdfcraftReader.preload();
            S.ownObjUrl = (window.__pcRawCreateObjectURL || URL.createObjectURL)(blob);
            S.ownPdfDoc = await pdfjsLib.getDocument({
              url: S.ownObjUrl,
              standardFontDataUrl: "./pdfjs/standard_fonts/",
              isEvalSupported: false,
              useSystemFonts: true,
              disableAutoFetch: true,
            }).promise;
          }
          if (S.ownPdfDoc && activeSession === S) {
            const pg = await S.ownPdfDoc.getPage(item.srcIndex + 1);
            const vp1 = pg.getViewport({ scale: 1 });
            const scale = Math.max(0.12, Math.min(1, 240 / Math.max(1, vp1.width)));
            const vp = pg.getViewport({ scale });
            const c = document.createElement("canvas");
            c.width = Math.max(1, Math.round(vp.width));
            c.height = Math.max(1, Math.round(vp.height));
            const ctx = c.getContext("2d", { alpha: false });
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, c.width, c.height);
            await pg.render({ canvasContext: ctx, viewport: vp, intent: "display" }).promise;
            url = c.toDataURL("image/jpeg", 0.75);
            c.width = 0; c.height = 0;
          }
        }
      }
      if (url) {
        S.thumbCache.set(cacheKey, url);
        if (S.thumbCache.size > 160) {
          S.thumbCache.delete(S.thumbCache.keys().next().value);
        }
      }
      return url;
    }

    function snapshot() {
      return S.pages.map((p) => Object.assign({}, p));
    }

    function pushUndo() {
      S.undoStack.push(snapshot());
      if (S.undoStack.length > 35) S.undoStack.shift();
      S.redoStack = [];
      S.dirty = true;
    }

    function undo() {
      if (!S.undoStack.length) return;
      S.redoStack.push(snapshot());
      S.pages = S.undoStack.pop();
      S.selected.clear();
      S.dirty = S.undoStack.length > 0;
      render();
    }

    function redo() {
      if (!S.redoStack.length) return;
      S.undoStack.push(snapshot());
      S.pages = S.redoStack.pop();
      S.selected.clear();
      S.dirty = true;
      render();
    }

    function targetIndices() {
      if (S.selected.size > 0) {
        const idxs = [];
        S.pages.forEach((p, i) => { if (S.selected.has(p.id)) idxs.push(i); });
        return idxs;
      }
      return [];
    }

    function rotateSelected(deltaDeg) {
      let idxs = targetIndices();
      if (!idxs.length) {
        const curIdx = Math.max(0, Math.min(S.pages.length - 1, S.currentPage - 1));
        idxs = [curIdx];
        tell("Página " + (curIdx + 1) + " girada");
      }
      pushUndo();
      for (const i of idxs) {
        S.pages[i].rot = (S.pages[i].rot + deltaDeg + 360) % 360;
      }
      render();
    }

    function deleteSelected() {
      const idxs = targetIndices();
      if (!idxs.length) { tell("Toca una o más páginas para eliminarlas."); return; }
      if (idxs.length >= S.pages.length) { tell("Un PDF debe conservar al menos una página."); return; }
      pushUndo();
      const dropIds = new Set(idxs.map((i) => S.pages[i].id));
      S.pages = S.pages.filter((p) => !dropIds.has(p.id));
      S.selected.clear();
      if (S.currentPage > S.pages.length) S.currentPage = S.pages.length;
      render();
      tell(idxs.length === 1 ? "1 página eliminada" : idxs.length + " páginas eliminadas");
    }

    function duplicateSelected() {
      const idxs = targetIndices();
      if (!idxs.length) { tell("Primero selecciona al menos una página para duplicar."); return; }
      pushUndo();
      const next = [];
      for (let i = 0; i < S.pages.length; i++) {
        next.push(S.pages[i]);
        if (S.selected.has(S.pages[i].id)) {
          next.push(Object.assign({}, S.pages[i], { id: makeId() }));
        }
      }
      S.pages = next;
      S.selected.clear();
      render();
      tell(idxs.length === 1 ? "1 página duplicada" : idxs.length + " páginas duplicadas");
    }

    function reverseOrder() {
      if (S.pages.length < 2) return;
      pushUndo();
      S.pages.reverse();
      render();
      tell("Orden de páginas invertido");
    }

    function moveSelectedTo(position) {
      const idxs = targetIndices();
      if (!idxs.length) return;
      pushUndo();
      const picked = [];
      const rest = [];
      S.pages.forEach((p) => {
        if (S.selected.has(p.id)) picked.push(p);
        else rest.push(p);
      });
      const clamped = Math.max(0, Math.min(rest.length, position));
      rest.splice(clamped, 0, ...picked);
      S.pages = rest;
      render();
    }

    function shiftSelected(dir) {
      const idxs = targetIndices();
      if (!idxs.length) { tell("Selecciona las páginas que quieras mover."); return; }
      if (dir < 0 && idxs[0] === 0) return;
      if (dir > 0 && idxs[idxs.length - 1] === S.pages.length - 1) return;
      pushUndo();
      if (dir < 0) {
        for (const i of idxs) {
          [S.pages[i - 1], S.pages[i]] = [S.pages[i], S.pages[i - 1]];
        }
      } else {
        for (let k = idxs.length - 1; k >= 0; k--) {
          const i = idxs[k];
          [S.pages[i + 1], S.pages[i]] = [S.pages[i], S.pages[i + 1]];
        }
      }
      render();
    }

    function openMoveSheet() {
      const idxs = targetIndices();
      if (!idxs.length) { tell("Toca una o más páginas para moverlas."); return; }
      const total = S.pages.length;
      const input = el("input", {
        class: "pc-field", type: "number", inputmode: "numeric",
        min: "1", max: String(total), placeholder: "Posición (1 – " + total + ")",
      });
      sheet({
        title: "Mover " + idxs.length + (idxs.length === 1 ? " página" : " páginas"),
        build: (c) => [
          el("div", { class: "pc-btn-row" },
            el("button", { class: "pc-secondary", type: "button", icon: "left", text: "Antes", onclick: () => { c(); shiftSelected(-1); } }),
            el("button", { class: "pc-secondary", type: "button", icon: "right", text: "Después", onclick: () => { c(); shiftSelected(1); } })),
          list([
            { i: "up", t: "Mover al principio (Página 1)", run: () => { c(); moveSelectedTo(0); tell("Movido al principio"); } },
            { i: "down", t: "Mover al final (Página " + total + ")", run: () => { c(); moveSelectedTo(total); tell("Movido al final"); } },
          ]),
          el("div", { class: "pc-label", text: "O mover a la posición exacta" }),
          input,
          el("button", {
            class: "pc-primary", type: "button", text: "Mover a esa posición",
            onclick: () => {
              const n = parseInt(input.value, 10);
              if (!n) return;
              c();
              moveSelectedTo(Math.max(0, n - 1));
              tell("Movido a posición " + Math.max(1, Math.min(total, n)));
            },
          }),
        ],
      });
    }

    function openInsertSheet() {
      const idxs = targetIndices();
      const insertAt = idxs.length ? idxs[idxs.length - 1] + 1 : S.pages.length;
      sheet({
        title: "Insertar páginas",
        text: "Se insertará después de la página " + insertAt,
        build: (c) => [
          list([
            {
              i: "blank", t: "Página en blanco", small: "A4 / mismo tamaño",
              run: () => {
                c();
                pushUndo();
                S.pages.splice(insertAt, 0, { id: makeId(), source: "blank", rot: 0 });
                render();
                tell("Página en blanco insertada");
              },
            },
            {
              i: "image", t: "Desde fotos / galería", small: "JPG o PNG",
              run: () => {
                c();
                const inp = el("input", { type: "file", accept: "image/*", multiple: true });
                inp.addEventListener("change", async () => {
                  const chosen = Array.from(inp.files || []);
                  if (!chosen.length) return;
                  const added = [];
                  for (const imgFile of chosen) {
                    try {
                      const img = await window.pdfcraftScanner.loadImage(imgFile);
                      const thumbUrl = window.pdfcraftScanner.makeThumb(img, 0, "original");
                      const c2 = document.createElement("canvas");
                      const scale = Math.min(1, 2000 / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
                      c2.width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
                      c2.height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
                      const ctx = c2.getContext("2d");
                      ctx.fillStyle = "#ffffff";
                      ctx.fillRect(0, 0, c2.width, c2.height);
                      ctx.drawImage(img, 0, 0, c2.width, c2.height);
                      const jpgUrl = c2.toDataURL("image/jpeg", 0.86);
                      const bin = atob(jpgUrl.split(",")[1] || "");
                      const bytes = new Uint8Array(bin.length);
                      for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
                      c2.width = 0; c2.height = 0;
                      added.push({ id: makeId(), source: "image", imgBytes: bytes, isPng: false, thumbUrl, rot: 0 });
                    } catch (e) { tell("No se pudo leer una imagen"); }
                  }
                  if (added.length) {
                    pushUndo();
                    S.pages.splice(insertAt, 0, ...added);
                    render();
                    tell(added.length === 1 ? "1 imagen añadida como página" : added.length + " imágenes añadidas");
                  }
                });
                inp.click();
              },
            },
            {
              i: "open", t: "Desde otro archivo PDF…", small: "Archivos / iCloud",
              run: () => {
                c();
                const inp = el("input", { type: "file", accept: "application/pdf,.pdf" });
                inp.addEventListener("change", async () => {
                  const extFile = inp.files && inp.files[0];
                  if (!extFile) return;
                  try {
                    const extDoc = await loadPdfLibDoc(extFile);
                    const count = extDoc.getPageCount();
                    const extId = "ext_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
                    const added = [];
                    for (let i = 0; i < count; i++) {
                      added.push({
                        id: makeId(),
                        source: "pdf",
                        extId,
                        extBlob: extFile,
                        extName: extFile.name,
                        srcIndex: i,
                        rot: 0,
                      });
                    }
                    pushUndo();
                    S.pages.splice(insertAt, 0, ...added);
                    render();
                    tell(count + (count === 1 ? " página añadida" : " páginas añadidas") + " de " + extFile.name);
                  } catch (e) {
                    tell(e.message || "No se pudo leer el PDF");
                  }
                });
                inp.click();
              },
            },
          ]),
        ],
      });
    }

    async function extractSelected() {
      const idxs = targetIndices();
      if (!idxs.length) { tell("Selecciona las páginas que deseas extraer."); return; }
      const picked = idxs.map((i) => S.pages[i]);
      const base = (name || "Documento").replace(/\.pdf$/i, "");
      const outName = `${base} (extraídas).pdf`;
      try {
        S.saving = true;
        renderHeader();
        const extracted = await buildPdfFromDescriptors(blob, picked, outName);
        S.saving = false;
        renderHeader();
        if (onExtractedPdf) await onExtractedPdf(extracted, picked.length);
      } catch (e) {
        S.saving = false;
        renderHeader();
        if (e && e.code === "ENCRYPTED" && onFallbackEngine) {
          close();
          onFallbackEngine("extract");
          return;
        }
        tell("Error al extraer: " + (e.message || e));
      }
    }

    function openSplitSheet() {
      const total = S.pages.length;
      if (total < 2) { tell("El PDF solo tiene 1 página."); return; }
      const rangeInput = el("input", { class: "pc-field", type: "text", placeholder: "Ej. 1-5, 8, 10-12", value: "1-" + Math.ceil(total / 2) });
      const everyInput = el("input", { class: "pc-field", type: "number", inputmode: "numeric", min: "1", max: String(total), value: String(Math.max(1, Math.ceil(total / 2))) });
      sheet({
        title: "Dividir PDF (" + total + " páginas)",
        build: (c) => [
          el("div", { class: "pc-label", text: "Opción 1: Extraer rango a un nuevo PDF" }),
          rangeInput,
          el("button", {
            class: "pc-primary", style: "margin-bottom:16px", type: "button", text: "Crear PDF con ese rango",
            onclick: async () => {
              const nums = parsePageRanges(rangeInput.value, total);
              if (!nums.length) { tell("Escribe un rango válido, p. ej. 1-5"); return; }
              c();
              const picked = nums.map((n) => S.pages[n - 1]).filter(Boolean);
              const base = (name || "Documento").replace(/\.pdf$/i, "");
              try {
                const file = await buildPdfFromDescriptors(blob, picked, `${base} (pág ${rangeInput.value.trim()}).pdf`);
                if (onExtractedPdf) await onExtractedPdf(file, picked.length);
              } catch (e) {
                tell("No se pudo dividir: " + (e.message || e));
              }
            },
          }),
          el("div", { class: "pc-label", text: "Opción 2: Dividir cada N páginas" }),
          everyInput,
          el("button", {
            class: "pc-secondary", type: "button", text: "Dividir en partes iguales",
            onclick: async () => {
              const n = Math.max(1, parseInt(everyInput.value, 10) || 1);
              c();
              try {
                const srcBlob = S.dirty ? await buildPdfFromDescriptors(blob, S.pages, name) : blob;
                const parts = await splitPdfByChunks(srcBlob, n, name);
                if (onSplitPdfs) await onSplitPdfs(parts);
              } catch (e) {
                tell("No se pudo dividir: " + (e.message || e));
              }
            },
          }),
        ],
      });
    }

    async function commitAndClose() {
      if (S.saving) return;
      if (!S.dirty) {
        close();
        return;
      }
      S.saving = true;
      renderHeader();
      try {
        const outFile = await buildPdfFromDescriptors(blob, S.pages, name);
        const newCount = S.pages.length;
        const nextPage = Math.max(1, Math.min(newCount, S.currentPage));
        close();
        if (onApplyChanges) await onApplyChanges(outFile, newCount, nextPage);
      } catch (e) {
        S.saving = false;
        renderHeader();
        if (e && e.code === "ENCRYPTED" && onFallbackEngine) {
          tell("PDF protegido: abriendo editor avanzado…", 2600);
          close();
          onFallbackEngine("organize");
          return;
        }
        tell("No se pudieron guardar los cambios: " + (e.message || e), 5000);
      }
    }

    // ---------- Cola de miniaturas con IntersectionObserver ----------
    function pumpThumbs() {
      while (S.activeThumbs < 3 && S.thumbQueue.length) {
        const job = S.thumbQueue.shift();
        if (!job.img.isConnected) continue;
        S.activeThumbs++;
        renderThumbFor(job.item).then((url) => {
          if (url && job.img.isConnected && activeSession === S) {
            job.img.src = url;
            job.img.classList.add("pc-loaded");
          }
        }).catch(() => {}).finally(() => {
          S.activeThumbs = Math.max(0, S.activeThumbs - 1);
          pumpThumbs();
        });
      }
    }

    // ---------- Arrastre táctil (drag-and-drop) para reordenar tarjetas ----------
    function startCardDrag(ev, fromIdx, cardEl) {
      ev.preventDefault();
      ev.stopPropagation();
      const touch = ev.touches ? ev.touches[0] : ev;
      let targetIdx = fromIdx;
      cardEl.classList.add("pc-pg-dragging");

      const ghost = cardEl.cloneNode(true);
      ghost.className = "pc-pg-card pc-pg-ghost";
      const r = cardEl.getBoundingClientRect();
      ghost.style.width = r.width + "px";
      ghost.style.left = r.left + "px";
      ghost.style.top = r.top + "px";
      overlay.append(ghost);
      const offX = touch.clientX - r.left;
      const offY = touch.clientY - r.top;

      const onMove = (me) => {
        const pt = me.touches ? me.touches[0] : me;
        if (!pt) return;
        if (me.cancelable) me.preventDefault();
        ghost.style.left = (pt.clientX - offX) + "px";
        ghost.style.top = (pt.clientY - offY) + "px";
        ghost.style.visibility = "hidden";
        const under = document.elementFromPoint(pt.clientX, pt.clientY);
        ghost.style.visibility = "";
        const hit = under && under.closest ? under.closest(".pc-pg-card[data-idx]") : null;
        overlay.querySelectorAll(".pc-pg-drop-target").forEach((n) => n.classList.remove("pc-pg-drop-target"));
        if (hit) {
          const idx = parseInt(hit.dataset.idx, 10);
          if (!Number.isNaN(idx)) {
            targetIdx = idx;
            if (idx !== fromIdx) hit.classList.add("pc-pg-drop-target");
          }
        }
      };

      const onEnd = () => {
        window.removeEventListener("touchmove", onMove, { passive: false });
        window.removeEventListener("touchend", onEnd);
        window.removeEventListener("touchcancel", onEnd);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        ghost.remove();
        cardEl.classList.remove("pc-pg-dragging");
        overlay.querySelectorAll(".pc-pg-drop-target").forEach((n) => n.classList.remove("pc-pg-drop-target"));
        if (targetIdx !== fromIdx && targetIdx >= 0 && targetIdx < S.pages.length) {
          pushUndo();
          const [moved] = S.pages.splice(fromIdx, 1);
          S.pages.splice(targetIdx, 0, moved);
          render();
          tell("Página movida a posición " + (targetIdx + 1));
        }
      };

      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onEnd);
      window.addEventListener("touchcancel", onEnd);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
    }

    // ---------- Renderizado de la pantalla Páginas / Organizar ----------
    const headEl = el("header", { class: "pc-pg-head" });
    const bodyEl = el("div", { class: "pc-pg-body" });
    const footEl = el("footer", { class: "pc-pg-foot" });
    overlay.replaceChildren(headEl, bodyEl, footEl);
    overlay.hidden = false;
    document.body.classList.add("pc-pages-open");

    function renderHeader() {
      if (S.mode === "view") {
        headEl.replaceChildren(
          el("span", { class: "pc-pg-head-spacer" }),
          el("h2", { class: "pc-pg-title", text: "Páginas" }),
          el("button", {
            class: "pc-pg-close-circle", type: "button", "aria-label": "Cerrar", icon: "close",
            onclick: close,
          })
        );
        return;
      }

      const selCount = S.selected.size;
      const allSelected = selCount > 0 && selCount === S.pages.length;
      headEl.replaceChildren(
        el("button", {
          class: "pc-text-btn", type: "button", disabled: S.saving,
          text: S.saving ? "Guardando…" : "Hecho",
          onclick: commitAndClose,
        }),
        el("div", { class: "pc-pg-title-stack" },
          el("b", { text: "Organizar páginas" }),
          el("small", {
            text: selCount
              ? (selCount + (selCount === 1 ? " seleccionada" : " seleccionadas"))
              : (S.pages.length + (S.pages.length === 1 ? " página" : " páginas") + (S.dirty ? " · editado" : "")),
          })),
        el("div", { class: "pc-pg-head-acts" },
          el("button", { class: "pc-icon-btn", type: "button", "aria-label": "Deshacer", icon: "undo", disabled: !S.undoStack.length, onclick: undo }),
          el("button", { class: "pc-icon-btn", type: "button", "aria-label": "Rehacer", icon: "redo", disabled: !S.redoStack.length, onclick: redo }),
          el("button", {
            class: "pc-icon-btn", type: "button",
            "aria-label": S.cols === 2 ? "Vista compacta" : "Vista amplia",
            icon: S.cols === 2 ? "grid3" : "grid2",
            onclick: () => { S.cols = S.cols === 2 ? 3 : 2; render(); },
          }),
          el("button", {
            class: "pc-text-btn pc-pg-selall", type: "button",
            text: allSelected ? "Ninguna" : "Todas",
            onclick: () => {
              if (allSelected) S.selected.clear();
              else S.pages.forEach((p) => S.selected.add(p.id));
              render();
            },
          }))
      );
    }

    function renderGrid() {
      if (S.io) S.io.disconnect();
      S.thumbQueue = [];
      const grid = el("div", { class: "pc-pg-grid pc-pg-cols-" + S.cols });

      S.io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const img = entry.target.querySelector("img.pc-pg-img");
          if (!img || img.dataset.queued) continue;
          img.dataset.queued = "1";
          const idx = parseInt(entry.target.dataset.idx, 10);
          const item = S.pages[idx];
          if (item) {
            S.thumbQueue.push({ item, img });
            S.io.unobserve(entry.target);
          }
        }
        pumpThumbs();
      }, { root: bodyEl, rootMargin: "260px 0px" });

      S.pages.forEach((item, idx) => {
        const isCurrent = S.mode === "view" && (idx + 1) === S.currentPage;
        const isSel = S.mode === "organize" && S.selected.has(item.id);
        const card = el("div", {
          class: "pc-pg-card" + (isCurrent ? " pc-pg-current" : "") + (isSel ? " pc-pg-selected" : ""),
          "data-idx": String(idx),
        });

        const frame = el("div", { class: "pc-pg-frame" });
        if (item.source === "blank") {
          frame.append(el("div", { class: "pc-pg-placeholder" }, el("span", { icon: "blank" }), el("small", { text: "En blanco" })));
        } else if (item.source === "pdf" && !item.thumbUrl) {
          frame.append(el("div", { class: "pc-pg-placeholder" }, el("span", { icon: "open" }), el("small", { text: "Pág. " + (item.srcIndex + 1) })));
        } else {
          const img = el("img", { class: "pc-pg-img", alt: "Página " + (idx + 1) });
          if (item.rot) img.style.transform = `rotate(${item.rot}deg)` + (item.rot % 180 === 90 ? " scale(0.76)" : "");
          const key = item.source === "orig" ? ("orig:" + item.srcIndex) : (item.extId + ":" + item.srcIndex);
          const cached = item.source === "image" ? item.thumbUrl : S.thumbCache.get(key);
          if (cached) {
            img.src = cached;
            img.classList.add("pc-loaded");
            img.dataset.queued = "1";
          }
          frame.append(img);
        }

        if (S.mode === "organize") {
          const checkBadge = el("span", { class: "pc-pg-check" + (isSel ? " pc-on" : ""), icon: isSel ? "check" : null });
          const gripBtn = el("button", {
            class: "pc-pg-grip", type: "button", "aria-label": "Arrastrar para reordenar página " + (idx + 1),
            icon: "grip",
          });
          gripBtn.addEventListener("touchstart", (e) => startCardDrag(e, idx, card), { passive: false });
          gripBtn.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") startCardDrag(e, idx, card); });
          frame.append(gripBtn, checkBadge);
        }

        if (item.rot) {
          frame.append(el("span", { class: "pc-pg-rot-tag", text: item.rot + "°" }));
        }

        card.addEventListener("click", () => {
          if (S.mode === "view") {
            close();
            if (onJumpPage) onJumpPage(idx + 1);
            return;
          }
          if (S.selected.has(item.id)) S.selected.delete(item.id);
          else S.selected.add(item.id);
          renderHeader();
          card.classList.toggle("pc-pg-selected", S.selected.has(item.id));
          const chk = card.querySelector(".pc-pg-check");
          if (chk) {
            chk.classList.toggle("pc-on", S.selected.has(item.id));
            chk.innerHTML = S.selected.has(item.id) ? svgIcon("check") : "";
          }
        });

        card.append(frame, el("div", { class: "pc-pg-num", text: String(idx + 1) }));
        grid.append(card);
        if (item.source === "orig") S.io.observe(card);
      });

      bodyEl.replaceChildren(grid);
    }

    function renderFooter() {
      if (S.mode === "view") {
        footEl.replaceChildren(
          el("div", { class: "pc-pg-view-bar" },
            el("button", {
              class: "pc-pg-vbtn", type: "button", icon: "organize",
              onclick: () => { S.mode = "organize"; render(); },
            }, el("span", { text: "Organizar páginas" })),
            el("button", {
              class: "pc-pg-vbtn", type: "button", icon: "edit",
              onclick: () => { close(); if (onEditPdf) onEditPdf(); },
            }, el("span", { text: "Editar PDF" })),
            el("button", {
              class: "pc-pg-vbtn", type: "button", icon: "crop",
              onclick: () => { close(); if (onCropPages) onCropPages(); },
            }, el("span", { text: "Recortar páginas" })))
        );
        return;
      }

      const actions = [
        { i: "rotateCcw", t: "Girar izq.", fn: () => rotateSelected(-90) },
        { i: "rotate", t: "Girar der.", fn: () => rotateSelected(90) },
        { i: "move", t: "Mover", fn: openMoveSheet },
        { i: "copy", t: "Duplicar", fn: duplicateSelected },
        { i: "plus", t: "Insertar", fn: openInsertSheet },
        { i: "extract", t: "Extraer", fn: extractSelected },
        { i: "split", t: "Dividir", fn: openSplitSheet },
        { i: "reverse", t: "Invertir", fn: reverseOrder },
        { i: "trash", t: "Eliminar", danger: true, fn: deleteSelected },
      ];
      footEl.replaceChildren(
        el("div", { class: "pc-pg-org-bar" },
          actions.map((a) => el("button", {
            class: "pc-pg-obtn" + (a.danger ? " pc-danger" : ""),
            type: "button", icon: a.i, onclick: a.fn,
          }, el("span", { text: a.t }))))
      );
    }

    function render() {
      renderHeader();
      renderGrid();
      renderFooter();
    }

    render();
    // Centrar la página actual al abrir
    setTimeout(() => {
      const curCard = bodyEl.querySelector(`.pc-pg-card[data-idx="${S.currentPage - 1}"]`);
      if (curCard) curCard.scrollIntoView({ block: "center", behavior: "auto" });
    }, 30);
  }

  window.pdfcraftPdfLib = {
    available: hasPdfLib,
    combinePdfs,
    createBlankPdf,
    splitPdfByChunks,
    parsePageRanges,
  };

  window.pdfcraftOrganizer = {
    open,
    close,
    isOpen: () => !!activeSession,
  };
})();
