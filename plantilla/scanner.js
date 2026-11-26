// PdfCraft para iPhone: escáner de documentos y creador de PDF desde fotos/cámara (100 % local).
// Genera un PDF estándar multipágina con flujos JPEG (/DCTDecode) sin dependencias externas.
(function () {
  "use strict";

  const MAX_SIDE = 2200;

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo leer la imagen " + (file.name || "")));
      };
      img.src = url;
    });
  }

  // Aplica filtro de escáner: "doc" (fondo blanco limpio + contraste) o "bw" (blanco y negro nítido).
  function applyFilter(ctx, w, h, filter) {
    if (!filter || filter === "original") return;
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    if (filter === "doc") {
      // Estiramiento suave de contraste y brillo para aclarar papel y marcar texto.
      for (let i = 0; i < d.length; i += 4) {
        let r = d[i], g = d[i + 1], b = d[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum > 195) {
          const boost = (lum - 195) / 60;
          r = r + (255 - r) * boost * 0.85;
          g = g + (255 - g) * boost * 0.85;
          b = b + (255 - b) * boost * 0.85;
        }
        d[i] = Math.max(0, Math.min(255, (r - 128) * 1.28 + 138));
        d[i + 1] = Math.max(0, Math.min(255, (g - 128) * 1.28 + 138));
        d[i + 2] = Math.max(0, Math.min(255, (b - 128) * 1.28 + 138));
      }
    } else if (filter === "bw") {
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        let v = (lum - 135) * 2.1 + 145;
        v = Math.max(0, Math.min(255, v));
        d[i] = d[i + 1] = d[i + 2] = v;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  function renderToCanvas(img, rot, filter, maxSide) {
    const swap = rot === 90 || rot === 270;
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    const rawW = swap ? srcH : srcW;
    const rawH = swap ? srcW : srcH;
    const scale = Math.min(1, (maxSide || MAX_SIDE) / Math.max(rawW, rawH, 1));
    const w = Math.max(1, Math.round(rawW * scale));
    const h = Math.max(1, Math.round(rawH * scale));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rot * Math.PI) / 180);
    const dw = swap ? h : w;
    const dh = swap ? w : h;
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    applyFilter(ctx, w, h, filter);
    return c;
  }

  function dataUrlToBytes(dataUrl) {
    const b64 = dataUrl.split(",")[1] || "";
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function ascii(str) {
    const out = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
    return out;
  }

  function concat(parts) {
    let total = 0;
    for (const p of parts) total += p.length;
    const out = new Uint8Array(total);
    let off = 0;
    for (const p of parts) {
      out.set(p, off);
      off += p.length;
    }
    return out;
  }

  function pageBox(w, h, paper) {
    const landscape = w > h;
    if (paper === "a4") {
      const pw = landscape ? 841.89 : 595.28;
      const ph = landscape ? 595.28 : 841.89;
      const margin = 18;
      const s = Math.min((pw - 2 * margin) / w, (ph - 2 * margin) / h);
      const dw = w * s, dh = h * s;
      return { pw, ph, x: (pw - dw) / 2, y: (ph - dh) / 2, dw, dh };
    }
    if (paper === "letter") {
      const pw = landscape ? 792 : 612;
      const ph = landscape ? 612 : 792;
      const margin = 18;
      const s = Math.min((pw - 2 * margin) / w, (ph - 2 * margin) / h);
      const dw = w * s, dh = h * s;
      return { pw, ph, x: (pw - dw) / 2, y: (ph - dh) / 2, dw, dh };
    }
    // Automático: ajusta exactamente a la proporción de la foto con ancho estándar.
    const targetW = landscape ? 792 : 595.28;
    const pw = targetW;
    const ph = Math.max(72, (h / w) * pw);
    return { pw, ph, x: 0, y: 0, dw: pw, dh: ph };
  }

  async function buildPdf(items, opts) {
    const paper = (opts && opts.paper) || "auto";
    const quality = (opts && opts.quality) || 0.86;
    const name = ((opts && opts.name) || "Escaneo.pdf").replace(/\.pdf$/i, "") + ".pdf";
    const prepared = [];
    for (const item of items) {
      const canvas = renderToCanvas(item.img, item.rot || 0, item.filter || "original", MAX_SIDE);
      const jpeg = dataUrlToBytes(canvas.toDataURL("image/jpeg", quality));
      prepared.push({ w: canvas.width, h: canvas.height, jpeg });
    }
    if (!prepared.length) throw new Error("No hay imágenes para convertir.");

    // Objetos: 1 = Catalog, 2 = Pages, luego por cada página: Image, Content, Page
    const objs = [];
    objs.push(null); // 1: Catalog
    objs.push(null); // 2: Pages
    const pageIds = [];
    const n = (v) => Number(v.toFixed(2));

    for (let i = 0; i < prepared.length; i++) {
      const p = prepared[i];
      const box = pageBox(p.w, p.h, paper);
      const imgId = objs.length + 1;
      objs.push(concat([
        ascii(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`),
        p.jpeg,
        ascii("\nendstream"),
      ]));
      const drawCmd = `q ${n(box.dw)} 0 0 ${n(box.dh)} ${n(box.x)} ${n(box.y)} cm /Im0 Do Q\n`;
      const contentId = objs.length + 1;
      objs.push(ascii(`<< /Length ${drawCmd.length} >>\nstream\n${drawCmd}endstream`));
      const pageId = objs.length + 1;
      objs.push(ascii(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(box.pw)} ${n(box.ph)}] ` +
        `/Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>`
      ));
      pageIds.push(pageId);
    }

    objs[0] = ascii("<< /Type /Catalog /Pages 2 0 R >>");
    objs[1] = ascii(`<< /Type /Pages /Kids [${pageIds.map((id) => id + " 0 R").join(" ")}] /Count ${pageIds.length} >>`);

    const chunks = [ascii("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
    let offset = chunks[0].length;
    const offsets = [0];
    for (let i = 0; i < objs.length; i++) {
      offsets.push(offset);
      const head = ascii(`${i + 1} 0 obj\n`);
      const tail = ascii("\nendobj\n");
      chunks.push(head, objs[i], tail);
      offset += head.length + objs[i].length + tail.length;
    }
    const xrefOffset = offset;
    let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objs.length; i++) {
      xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
    }
    xref += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    chunks.push(ascii(xref));

    const bytes = concat(chunks);
    return new File([bytes], name, { type: "application/pdf" });
  }

  function makeThumb(img, rot, filter) {
    return renderToCanvas(img, rot || 0, filter || "original", 180).toDataURL("image/jpeg", 0.72);
  }

  window.pdfcraftScanner = { loadImage, makeThumb, buildPdf };
})();
