// PdfCraft para iPhone: gestos nativos de iOS sobre el lienzo de PdfCraft.
//
// Traduce los dedos reales a eventos que PdfCraft (egui/eframe) entiende:
//   · un dedo que desliza → desplazamiento suave con inercia estilo iOS;
//   · deslizar horizontal en modo Página única → pasar a página siguiente/anterior;
//   · dos dedos → pellizco para acercar/alejar (Ctrl+rueda) + desplazamiento simultáneo;
//   · doble toque → acercar/ajustar al ancho centrado donde se tocó;
//   · un toque → clic síncrono dentro del toque (para abrir el teclado de iOS al 1er toque en campos)
//     y aviso onSingleTap (para ocultar/mostrar barras en modo lectura si no se abrió texto);
//   · pulsación larga (420 ms) y arrastre → seleccionar texto o mover páginas con anillo visual.
(function () {
  "use strict";

  const SLOP = 8;
  const LONG_PRESS = 420;
  const DOUBLE_TAP_MS = 290;
  const DOUBLE_TAP_DIST = 36;
  const WHEEL_STEP = 7;
  const ZOOM_K = 100;
  const DECAY = 0.9975;

  function attach(canvas, opts) {
    let g = null;
    let fling = null;
    let hovering = false;
    let lastTap = { t: 0, x: 0, y: 0 };
    let singleTapTimer = null;

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

    function scrollBy(dx, dy, x, y) {
      const r = opts.ratio() || 1;
      const px = -dx / r, py = -dy / r;
      const n = Math.ceil(Math.hypot(px, py) / WHEEL_STEP);
      for (let i = 0; i < n; i++) fire.wheel(x, y, px / n, py / n, false);
    }
    function zoomBy(factor, x, y) {
      if (!(factor > 0) || Math.abs(Math.log(factor)) < 0.002) return;
      ensureFocus();
      fire.move(x, y);
      fire.wheel(x, y, 0, -ZOOM_K * Math.log(factor), true);
    }

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

    function typing() {
      const active = document.activeElement;
      if (!active || active === document.body || active === canvas) return false;
      const isField = active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable;
      return !!(isField && canvas.parentNode && canvas.parentNode.contains(active));
    }

    function click(x, y) {
      fire.move(x, y);
      fire.down(x, y);
      fire.up(x, y);
      for (let i = 0; i < 2 && !typing(); i++) fire.up(x, y);
    }

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
        clearTimeout(singleTapTimer);
        if (g && g.timer) clearTimeout(g.timer);
        if (g && (g.kind === "drag" || g.kind === "press")) fire.up(g.x, g.y);
        startPinch(mine[0], mine[1], g ? g.mode : opts.mode());
        return;
      }
      if (g) return;
      const t = mine[0];
      g = {
        kind: "pending", mode: opts.mode(), id: t.identifier,
        x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY,
        t0: now, s: [[now, t.clientX, t.clientY]], stopped, lock: null, pageSwipe: false,
      };
      if (g.mode === "ver" && !stopped) {
        const mineG = g;
        g.timer = setTimeout(() => {
          if (g !== mineG || g.kind !== "pending") return;
          g.kind = "press";
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
          fire.move(p.x, p.y);
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
          g.pageSwipe = !!(g.lock === "x" && opts.singlePage && opts.singlePage());
          g.x = g.x0; g.y = g.y0;
          if (!g.pageSwipe) fire.move(g.x0, g.y0);
        } else {
          g.kind = "drag";
          g.x = g.x0; g.y = g.y0;
          fire.move(g.x0, g.y0);
          fire.down(g.x0, g.y0);
        }
      }
      if (g.kind === "pan") {
        if (!g.pageSwipe) {
          scrollBy(g.lock === "y" ? 0 : x - g.x, g.lock === "x" ? 0 : y - g.y, g.x0, g.y0);
        }
      } else {
        fire.move(x, y, 1);
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
          const t = rest[0];
          g = { kind: "pan", mode: g.mode, id: t.identifier, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY, s: [], lock: null, noFling: true, fromPinch: true };
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
          const now = performance.now();
          const isDouble = was.mode === "ver" && (now - lastTap.t) < DOUBLE_TAP_MS &&
            Math.hypot(was.x0 - lastTap.x, was.y0 - lastTap.y) < DOUBLE_TAP_DIST;
          if (isDouble && opts.onDoubleTap) {
            clearTimeout(singleTapTimer);
            lastTap = { t: 0, x: 0, y: 0 };
            opts.onDoubleTap(was.x0, was.y0);
            setTimeout(() => fire.leave(), 120);
            return;
          }
          // Clic síncrono dentro de touchend para que Safari muestre el teclado al 1er toque.
          click(was.x0, was.y0);
          if (opts.onTap) opts.onTap(was.x0, was.y0);
          if (was.mode === "ver") {
            lastTap = { t: now, x: was.x0, y: was.y0 };
            clearTimeout(singleTapTimer);
            const tapX = was.x0, tapY = was.y0;
            if (opts.onSingleTap) {
              singleTapTimer = setTimeout(() => {
                if (!typing()) opts.onSingleTap(tapX, tapY);
              }, DOUBLE_TAP_MS);
            }
          }
        }
        fire.leave();
      } else if (was.kind === "pan") {
        if (was.pageSwipe && !cancelled) {
          const dx = x - was.x0;
          const [vx] = velocity(was.s, performance.now());
          if (Math.abs(dx) > 54 || Math.abs(vx) > 0.45) {
            if (opts.onSwipePage) opts.onSwipePage(dx < 0 ? 1 : -1);
          }
          fire.leave();
          return;
        }
        const [vx, vy] = cancelled || was.noFling ? [0, 0] : velocity(was.s, performance.now());
        const fx = was.lock === "y" ? 0 : vx, fy = was.lock === "x" ? 0 : vy;
        if (Math.hypot(fx, fy) > 0.25) startFling(fx, fy, was.x0, was.y0);
        else fire.leave();
        if (was.fromPinch && opts.onPinchEnd) opts.onPinchEnd();
      } else {
        fire.move(x, y, 1);
        fire.up(x, y);
        fire.leave();
        if (was.kind === "press" && opts.onSelectEnd) opts.onSelectEnd(x, y, Math.hypot(x - was.x0, y - was.y0) >= SLOP);
      }
    }

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
    return {
      stop: () => { stopFling(); clearTimeout(singleTapTimer); fire.leave(); },
      busy: () => !!(g || fling),
      typing,
      zoomBy,
    };
  }

  window.pdfcraftGestures = { attach };
})();
