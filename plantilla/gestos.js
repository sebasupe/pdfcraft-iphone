// PdfCraft para iPhone: gestos de iOS sobre el lienzo de PdfCraft.
//
// PdfCraft (egui) trata el dedo como un ratón: arrastrar selecciona texto en vez de desplazar, no
// hay inercia y el teclado solo aparece al segundo toque. Aquí se capturan los toques reales del
// lienzo (en window, fase de captura, antes que eframe) y se traducen a lo que PdfCraft entiende:
//   · un dedo que se desliza → rueda (desplazamiento) con inercia al soltar;
//   · dos dedos → Ctrl+rueda (zoom con el factor exacto del pellizco) y rueda (desplazamiento);
//   · un toque → clic (pointerdown + pointerup), que eframe procesa en el mismo momento, así el
//     campo de texto toma el foco dentro del toque y iOS muestra el teclado;
//   · pulsación larga y arrastre → arrastre con el botón apretado (seleccionar texto, mover páginas).
// Con una herramienta elegida (resaltar, dibujar…) arrastrar con un dedo usa la herramienta, y en
// los diálogos o la interfaz completa se arrastra como con el ratón.
(function () {
  "use strict";

  const SLOP = 8;          // px que se puede mover un toque sin dejar de ser toque
  const LONG_PRESS = 450;  // ms de la pulsación larga
  const WHEEL_STEP = 7;    // puntos por evento de rueda: egui aplica al momento los menores de 8
  const ZOOM_K = 100;      // eframe: factor de zoom = exp(-0.01 · deltaY) cuando viene con Ctrl
  const DECAY = 0.9975;    // frenado de la inercia por milisegundo (parecido a iOS)

  function attach(canvas, opts) {
    // opts.mode(): "ver" | "herramienta" | "raton" | "raton-zoom" (ratón con pellizco)
    // opts.ratio(): px de pantalla (CSS) por punto de PdfCraft
    // opts.onTap(x, y), opts.onSelectEnd(x, y), opts.onPinchEnd(): avisos opcionales
    let g = null;        // gesto en curso
    let fling = null;    // inercia en curso
    let hovering = false;

    // ---- Eventos que recibe eframe (no son "de confianza": isTrusted = false) ----
    const fire = {
      move(x, y, buttons) {
        canvas.dispatchEvent(new MouseEvent("mousemove", { clientX: x, clientY: y, buttons: buttons || 0, bubbles: true, cancelable: true }));
        hovering = true;
      },
      down(x, y) {
        canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: x, clientY: y, button: 0, buttons: 1, pointerId: 1, pointerType: "mouse", isPrimary: true, bubbles: true, cancelable: true }));
      },
      up(x, y) {
        canvas.dispatchEvent(new PointerEvent("pointerup", { clientX: x, clientY: y, button: 0, buttons: 0, pointerId: 1, pointerType: "mouse", isPrimary: true, bubbles: true, cancelable: true }));
      },
      leave() {
        if (!hovering) return;
        hovering = false;
        canvas.dispatchEvent(new MouseEvent("mouseleave", { clientX: -1, clientY: -1 }));
      },
      wheel(x, y, dx, dy, ctrl) {
        canvas.dispatchEvent(new WheelEvent("wheel", { clientX: x, clientY: y, deltaX: dx, deltaY: dy, deltaMode: 0, ctrlKey: !!ctrl, bubbles: true, cancelable: true }));
      },
    };

    // Mueve el contenido (dx, dy) px de pantalla, en pasos pequeños para que egui no los suavice.
    function scrollBy(dx, dy, x, y) {
      const r = opts.ratio() || 1;
      const px = -dx / r, py = -dy / r;
      const n = Math.ceil(Math.hypot(px, py) / WHEEL_STEP);
      for (let i = 0; i < n; i++) fire.wheel(x, y, px / n, py / n, false);
    }
    function zoomBy(factor, x, y) {
      if (!(factor > 0) || Math.abs(Math.log(factor)) < 0.002) return;
      fire.wheel(x, y, 0, -ZOOM_K * Math.log(factor), true);
    }

    // ---- Toques reales ----
    const onCanvas = (list) => Array.prototype.filter.call(list, (t) => t.target === canvas);
    const find = (list, id) => Array.prototype.find.call(list, (t) => t.identifier === id);
    const pair = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2, d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) });

    function stopFling() {
      if (!fling) return false;
      cancelAnimationFrame(fling.raf);
      fling = null;
      return true;
    }
    function startFling(vx, vy, x, y) {
      let last = performance.now();
      fling = { raf: 0 };
      const step = (now) => {
        if (!fling) return;
        const dt = Math.min(40, Math.max(1, now - last));
        last = now;
        const k = Math.pow(DECAY, dt);
        vx *= k; vy *= k;
        if (Math.hypot(vx, vy) < 0.03) { fling = null; fire.leave(); return; }
        scrollBy(vx * dt, vy * dt, x, y);
        fling.raf = requestAnimationFrame(step);
      };
      fling.raf = requestAnimationFrame(step);
    }

    // Velocidad del dedo (px/ms) al soltarlo: entre el último movimiento y el más viejo de los
    // últimos 150 ms (o el anterior, si los movimientos llegan espaciados). 0 si el dedo se detuvo.
    function velocity(s, now) {
      if (s.length < 2) return [0, 0];
      const b = s[s.length - 1];
      if (now - b[0] > 80) return [0, 0];
      let a = s[s.length - 2];
      for (let i = s.length - 2; i >= 0 && b[0] - s[i][0] <= 150; i--) a = s[i];
      const dt = b[0] - a[0];
      if (dt <= 0 || dt > 250) return [0, 0];
      const cap = (v) => Math.max(-6, Math.min(6, v));
      return [cap((b[1] - a[1]) / Math.max(8, dt)), cap((b[2] - a[2]) / Math.max(8, dt))];
    }

    // El campo de texto oculto de eframe (el que recibe el teclado) tiene el foco.
    function typing() {
      const active = document.activeElement;
      return !!(active && active.tagName === "INPUT" && canvas.parentNode && canvas.parentNode.contains(active));
    }

    // Clic dentro del toque real. Cada pointerup hace que eframe procese al momento; si el clic
    // abre un campo de texto (de un formulario, una nota…), PdfCraft lo enfoca una o dos pasadas
    // después, ya fuera del toque, y iOS no mostraría el teclado. Por eso se fuerzan hasta dos
    // pasadas más con pointerup sueltos (egui no los cuenta como clic: no hay botón apretado).
    function click(x, y) {
      fire.move(x, y);
      fire.down(x, y);
      fire.up(x, y);
      for (let i = 0; i < 2 && !typing(); i++) fire.up(x, y);
    }

    // PdfCraft ignora la rueda si su lienzo no tiene el foco (p. ej. tras tocar un botón de la
    // interfaz). El campo de texto oculto de eframe (hermano del lienzo) también cuenta como foco:
    // si se está escribiendo, no se le quita.
    function ensureFocus() {
      const active = document.activeElement;
      if (active === canvas) return;
      if (active && active !== document.body && canvas.parentNode && canvas.parentNode.contains(active)) return;
      canvas.focus({ preventScroll: true });
    }

    function startPinch(a, b, mode) {
      const p = pair(a, b);
      g = { kind: "pinch", mode, a: a.identifier, b: b.identifier, x: p.x, y: p.y, d: p.d };
      fire.move(p.x, p.y);
    }

    function onStart(e) {
      if (!e.isTrusted) return;
      const mine = onCanvas(e.touches);
      if (!mine.length) return;
      e.preventDefault();
      e.stopPropagation();
      ensureFocus();
      const now = performance.now();
      const stopped = stopFling();
      if (mine.length >= 2) {
        if (g && g.timer) clearTimeout(g.timer);
        // El primer dedo estaba arrastrando: se suelta donde estaba.
        if (g && (g.kind === "drag" || g.kind === "press")) fire.up(g.x, g.y);
        startPinch(mine[0], mine[1], g ? g.mode : opts.mode());
        return;
      }
      if (g) return;
      const t = mine[0];
      g = { kind: "pending", mode: opts.mode(), id: t.identifier, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY, t0: now, s: [[now, t.clientX, t.clientY]], stopped, lock: null };
      if (g.mode === "ver" && !stopped) {
        const mineG = g;
        g.timer = setTimeout(() => {
          if (g !== mineG || g.kind !== "pending") return;
          g.kind = "press"; // pulsación larga: se aprieta el botón donde está el dedo
          fire.move(g.x0, g.y0);
          fire.down(g.x0, g.y0);
          if (opts.onLongPress) opts.onLongPress(g.x0, g.y0);
        }, LONG_PRESS);
      }
    }

    function onMove(e) {
      if (!e.isTrusted || !g) return;
      if (!onCanvas(e.touches).length) return;
      e.preventDefault();
      e.stopPropagation();
      if (g.kind === "pinch") {
        const a = find(e.touches, g.a), b = find(e.touches, g.b);
        if (!a || !b) return;
        const p = pair(a, b);
        if (g.mode !== "raton") {
          fire.move(p.x, p.y); // el zoom se centra en el puntero
          zoomBy(p.d / (g.d || p.d), p.x, p.y);
        }
        scrollBy(p.x - g.x, p.y - g.y, p.x, p.y);
        g.x = p.x; g.y = p.y; g.d = p.d;
        return;
      }
      const t = find(e.touches, g.id);
      if (!t) return;
      const x = t.clientX, y = t.clientY, now = performance.now();
      g.s.push([now, x, y]);
      if (g.s.length > 12) g.s.shift();
      if (g.kind === "pending") {
        if (Math.hypot(x - g.x0, y - g.y0) < SLOP) return;
        clearTimeout(g.timer);
        if (g.mode === "ver") {
          g.kind = "pan";
          const dx = Math.abs(x - g.x0), dy = Math.abs(y - g.y0);
          g.lock = dy > 2 * dx ? "y" : dx > 2 * dy ? "x" : null;
          g.x = g.x0; g.y = g.y0;
          fire.move(g.x0, g.y0); // la rueda va a lo que está bajo el puntero
        } else {
          g.kind = "drag";
          g.x = g.x0; g.y = g.y0;
          fire.move(g.x0, g.y0);
          fire.down(g.x0, g.y0);
        }
      }
      if (g.kind === "pan") {
        scrollBy(g.lock === "y" ? 0 : x - g.x, g.lock === "x" ? 0 : y - g.y, g.x0, g.y0);
      } else {
        fire.move(x, y, 1); // "drag" o "press": arrastre con el botón apretado
      }
      g.x = x; g.y = y;
    }

    function onEnd(e) {
      if (!e.isTrusted || !g) return;
      const ours = g.kind === "pinch"
        ? Array.prototype.some.call(e.changedTouches, (t) => t.identifier === g.a || t.identifier === g.b)
        : !!find(e.changedTouches, g.id);
      if (!ours) return;
      e.preventDefault();
      e.stopPropagation();
      const cancelled = e.type === "touchcancel";
      if (g.kind === "pinch") {
        const rest = onCanvas(e.touches);
        if (rest.length === 1 && !cancelled) {
          // Queda un dedo: sigue desplazando, sin inercia.
          const t = rest[0];
          g = { kind: "pan", mode: g.mode, id: t.identifier, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY, s: [], lock: null, noFling: true };
          return;
        }
        g = null;
        fire.leave();
        if (opts.onPinchEnd) opts.onPinchEnd();
        return;
      }
      clearTimeout(g.timer);
      const t = find(e.changedTouches, g.id);
      const x = t.clientX, y = t.clientY;
      const was = g;
      g = null;
      if (was.kind === "pending") {
        if (!was.stopped && !cancelled) {
          // Un toque: clic donde empezó (el dedo suele correrse un poco al levantarlo).
          click(was.x0, was.y0);
          if (opts.onTap) opts.onTap(was.x0, was.y0);
        }
        fire.leave();
      } else if (was.kind === "pan") {
        const [vx, vy] = cancelled || was.noFling ? [0, 0] : velocity(was.s, performance.now());
        const fx = was.lock === "y" ? 0 : vx, fy = was.lock === "x" ? 0 : vy;
        if (Math.hypot(fx, fy) > 0.25) startFling(fx, fy, was.x0, was.y0);
        else fire.leave();
      } else {
        fire.move(x, y, 1);
        fire.up(x, y);
        fire.leave();
        if (was.kind === "press" && opts.onSelectEnd) opts.onSelectEnd(x, y, Math.hypot(x - was.x0, y - was.y0) >= SLOP);
      }
    }

    // Los eventos de puntero y de gestos de Safari que generan los dedos tampoco llegan a eframe.
    function block(e) {
      if (!e.isTrusted || e.target !== canvas) return;
      if (e.type.startsWith("pointer") && e.pointerType === "mouse") return;
      e.stopPropagation();
      if (e.cancelable && !e.type.startsWith("pointer")) e.preventDefault();
    }

    const active = { passive: false, capture: true };
    window.addEventListener("touchstart", onStart, active);
    window.addEventListener("touchmove", onMove, active);
    window.addEventListener("touchend", onEnd, active);
    window.addEventListener("touchcancel", onEnd, active);
    for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "gesturestart", "gesturechange", "gestureend"]) {
      window.addEventListener(type, block, active);
    }
    return { stop: () => { stopFling(); fire.leave(); }, busy: () => !!(g || fling) };
  }

  window.pdfcraftGestures = { attach };
})();
