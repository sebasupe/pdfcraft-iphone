// PdfCraft para iPhone: gestos nativos de iOS de alto rendimiento sobre el lienzo de PdfCraft.
//
// Traduce los dedos reales a eventos que PdfCraft (egui/eframe) entiende sin tirones:
//   · pellizco con dos dedos → vista previa acelerada por GPU (CSS translate3d + scale a 60/120 Hz)
//     y un único commit nítido al soltar (evita decenas de re-rasterizados CPU en WASM);
//   · un dedo que desliza → eventos agrupados en 1 envío por fotograma (rAF) con inercia estilo iOS;
//   · deslizar horizontal en modo Página única → pasar a página siguiente/anterior;
//   · doble toque → acercar/ajustar al ancho centrado donde se tocó;
//   · un toque → clic síncrono dentro del toque (para abrir el teclado de iOS al 1er toque en campos)
//     y aviso onSingleTap (para ocultar/mostrar barras en modo lectura si no se abrió texto);
//   · pulsación larga (420 ms) y arrastre → seleccionar texto o mover páginas con anillo visual.
(function () {
  "use strict";

  const SLOP = 8;
  const LONG_PRESS = 420;
  const DOUBLE_TAP_MS = 330;
  const DOUBLE_TAP_DIST = 40;
  const ZOOM_K = 100;
  const DECAY = 0.9968;
  const FLING_MIN_V = 0.22;
  const FLING_STOP_V = 0.035;

  function attach(canvas, opts) {
    let g = null;
    let fling = null;
    let hovering = false;
    let scrolling = false;
    let lastTap = { t: 0, x: 0, y: 0 };
    let singleTapTimer = null;
    let zoomLeaveTimer = null;

    // Agrupación de pan 1× por fotograma (rAF) para no saturar el hilo WASM en pantallas 120 Hz.
    let panRaf = 0;
    const panBuf = { dx: 0, dy: 0, x: 0, y: 0 };

    // Estado de transformación GPU durante el pellizco y espera de pintado nítido al soltar.
    let pinchRaf = 0;
    let pinchClearRaf = 0;
    let pinchTransformActive = false;

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

    function beginScroll() {
      if (scrolling) return;
      scrolling = true;
      if (opts.onScrollStart) opts.onScrollStart();
    }
    function endScroll() {
      if (!scrolling) return;
      scrolling = false;
      if (opts.onScrollEnd) opts.onScrollEnd();
    }

    // Un único WheelEvent en deltaMode=0 mueve la distancia exacta en un fotograma (sin dividir cada 7 px).
    function scrollBy(dx, dy, x, y) {
      if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) return;
      const r = opts.ratio() || 1;
      fire.wheel(x, y, -dx / r, -dy / r, false);
    }

    function zoomBy(factor, x, y) {
      if (!(factor > 0) || Math.abs(Math.log(factor)) < 0.002) return;
      clearTimeout(zoomLeaveTimer);
      ensureFocus();
      fire.move(x, y);
      fire.wheel(x, y, 0, -ZOOM_K * Math.log(factor), true);
      zoomLeaveTimer = setTimeout(() => { if (!g && !fling) fire.leave(); }, 180);
    }

    function flushPanNow() {
      if (panRaf) {
        cancelAnimationFrame(panRaf);
        panRaf = 0;
      }
      const dx = panBuf.dx, dy = panBuf.dy;
      if (dx === 0 && dy === 0) return;
      panBuf.dx = 0;
      panBuf.dy = 0;
      scrollBy(dx, dy, panBuf.x, panBuf.y);
    }

    function schedulePan() {
      if (panRaf) return;
      panRaf = requestAnimationFrame(() => {
        panRaf = 0;
        if (pinchClearRaf) {
          schedulePan();
          return;
        }
        flushPanNow();
      });
    }

    function clearPinchTransform() {
      if (pinchRaf) { cancelAnimationFrame(pinchRaf); pinchRaf = 0; }
      if (pinchClearRaf) { cancelAnimationFrame(pinchClearRaf); pinchClearRaf = 0; }
      if (!pinchTransformActive) return;
      pinchTransformActive = false;
      canvas.style.transform = "";
      canvas.style.transformOrigin = "";
      canvas.style.willChange = "";
    }

    function applyPinchTransform(tx, ty, scale) {
      pinchTransformActive = true;
      canvas.style.transform = "translate3d(" + tx.toFixed(2) + "px," + ty.toFixed(2) + "px,0) scale(" + scale.toFixed(5) + ")";
    }

    function schedulePinchFrame() {
      if (pinchRaf) return;
      pinchRaf = requestAnimationFrame(() => {
        pinchRaf = 0;
        if (!g || g.kind !== "pinch" || !g.gpu || !g.dirty) return;
        g.dirty = false;
        applyPinchTransform(g.tx, g.ty, g.scale);
      });
    }

    function commitPinch(pg, cancelled) {
      if (pinchRaf) { cancelAnimationFrame(pinchRaf); pinchRaf = 0; }
      if (!pg.gpu) {
        flushPanNow();
        return;
      }
      if (cancelled) {
        clearPinchTransform();
        return;
      }
      if (pg.dirty) {
        pg.dirty = false;
        applyPinchTransform(pg.tx, pg.ty, pg.scale);
      }
      const s = pg.scale || 1;
      const panX = pg.x - pg.x0;
      const panY = pg.y - pg.y0;
      const zoomed = Math.abs(Math.log(s)) >= 0.002;
      const panned = Math.hypot(panX, panY) >= 0.5;
      if (!zoomed && !panned) {
        clearPinchTransform();
        return;
      }
      // Mantener hover_pos en (pg.x0, pg.y0) durante todo el frame para que el zoom ancle ahí
      // y el pan desplace exactamente (panX, panY) al punto final de los dedos.
      // Quitamos transform solo durante el dispatch síncrono para que eframe lea getBoundingClientRect()
      // real sin escala CSS, y la restauramos antes del siguiente pintado para evitar parpadeo.
      const savedTransform = canvas.style.transform;
      canvas.style.transform = "";
      ensureFocus();
      fire.move(pg.x0, pg.y0);
      if (zoomed) fire.wheel(pg.x0, pg.y0, 0, -ZOOM_K * Math.log(s), true);
      if (panned) scrollBy(panX, panY, pg.x0, pg.y0);
      canvas.style.transform = savedTransform;
      // Esperar 2 rAF para quitar la transformación GPU justo después de que PdfCraft pinte el frame nítido.
      pinchClearRaf = requestAnimationFrame(() => {
        pinchClearRaf = requestAnimationFrame(() => {
          pinchClearRaf = 0;
          clearPinchTransform();
          if (panBuf.dx || panBuf.dy) schedulePan();
        });
      });
    }

    const onCanvas = (list) => Array.prototype.filter.call(list, (t) => t.target === canvas);
    const find = (list, id) => Array.prototype.find.call(list, (t) => t.identifier === id);
    const pair = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2, d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) });

    function stopFling(silent) {
      if (!fling) return false;
      cancelAnimationFrame(fling.raf);
      fling = null;
      if (!silent) endScroll();
      return true;
    }

    function startFling(vx, vy, x, y) {
      beginScroll();
      let last = performance.now();
      fling = { raf: 0 };
      const step = (now) => {
        if (!fling) return;
        // Limitar dt a 34 ms evita saltos bruscos si una página pesada tarda más en rasterizarse.
        const dt = Math.min(34, Math.max(1, now - last));
        last = now;
        const k = Math.pow(DECAY, dt);
        vx *= k; vy *= k;
        if (Math.hypot(vx, vy) < FLING_STOP_V) {
          fling = null;
          fire.leave();
          endScroll();
          return;
        }
        scrollBy(vx * dt, vy * dt, x, y);
        fling.raf = requestAnimationFrame(step);
      };
      fling.raf = requestAnimationFrame(step);
    }

    function velocity(s, now) {
      if (s.length < 2) return [0, 0];
      const b = s[s.length - 1];
      if (now - b[0] > 65) return [0, 0];
      let a = s[s.length - 2];
      for (let i = s.length - 2; i >= 0 && b[0] - s[i][0] <= 120; i--) a = s[i];
      const dt = b[0] - a[0];
      if (dt <= 0 || dt > 220) return [0, 0];
      const cap = (v) => Math.max(-7, Math.min(7, v));
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
      clearPinchTransform();
      flushPanNow();
      beginScroll();
      const p = pair(a, b);
      const rect = canvas.getBoundingClientRect();
      const bounds = (opts.zoomBounds && opts.zoomBounds()) || [0.25, 4.5];
      const gpu = mode !== "raton";
      g = {
        kind: "pinch", mode, a: a.identifier, b: b.identifier,
        rect,
        x0: p.x, y0: p.y,
        mx0: p.x - rect.left, my0: p.y - rect.top,
        d0: Math.max(12, p.d),
        x: p.x, y: p.y,
        scale: 1, tx: 0, ty: 0,
        minS: bounds[0], maxS: bounds[1],
        gpu, dirty: false,
      };
      if (gpu) {
        canvas.style.transformOrigin = "0 0";
        canvas.style.willChange = "transform";
      } else {
        fire.move(p.x, p.y);
      }
    }

    function onStart(e) {
      if (!e.isTrusted) return;
      const mine = onCanvas(e.touches);
      if (!mine.length) return;
      e.preventDefault();
      e.stopPropagation();
      clearTimeout(zoomLeaveTimer);
      ensureFocus();
      const now = performance.now();
      const stopped = stopFling(true);
      if (opts.onTouchStart) opts.onTouchStart(stopped);
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
        if (g.gpu) {
          const s = Math.max(g.minS, Math.min(g.maxS, p.d / g.d0));
          const mx = p.x - g.rect.left, my = p.y - g.rect.top;
          g.scale = s;
          g.tx = mx - s * g.mx0;
          g.ty = my - s * g.my0;
          g.x = p.x; g.y = p.y;
          g.dirty = true;
          schedulePinchFrame();
        } else {
          panBuf.dx += p.x - g.x;
          panBuf.dy += p.y - g.y;
          panBuf.x = p.x; panBuf.y = p.y;
          schedulePan();
          g.x = p.x; g.y = p.y;
        }
        return;
      }
      const t = find(e.touches, g.id);
      if (!t) return;
      const x = t.clientX, y = t.clientY, now = performance.now();
      g.s.push([now, x, y]);
      if (g.s.length > 10) g.s.shift();
      if (g.kind === "pending") {
        if (Math.hypot(x - g.x0, y - g.y0) < SLOP) return;
        clearTimeout(g.timer);
        if (g.mode === "ver") {
          g.kind = "pan";
          const dx = Math.abs(x - g.x0), dy = Math.abs(y - g.y0);
          g.lock = dy > 2 * dx ? "y" : dx > 2 * dy ? "x" : null;
          g.pageSwipe = !!(g.lock === "x" && opts.singlePage && opts.singlePage());
          g.x = g.x0; g.y = g.y0;
          if (!g.pageSwipe) {
            beginScroll();
            fire.move(g.x0, g.y0);
          }
        } else {
          g.kind = "drag";
          g.x = g.x0; g.y = g.y0;
          fire.move(g.x0, g.y0);
          fire.down(g.x0, g.y0);
        }
      }
      if (g.kind === "pan") {
        if (!g.pageSwipe) {
          panBuf.dx += g.lock === "y" ? 0 : x - g.x;
          panBuf.dy += g.lock === "x" ? 0 : y - g.y;
          panBuf.x = g.x0; panBuf.y = g.y0;
          schedulePan();
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
        const pg = g;
        commitPinch(pg, cancelled);
        const rest = onCanvas(e.touches);
        if (rest.length === 1 && !cancelled) {
          const t = rest[0];
          g = { kind: "pan", mode: pg.mode, id: t.identifier, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY, s: [], lock: null, noFling: true, fromPinch: true };
          return;
        }
        g = null;
        setTimeout(() => { if (!g && !fling) fire.leave(); }, 80);
        endScroll();
        if (opts.onPinchEnd) opts.onPinchEnd();
        return;
      }
      clearTimeout(g.timer);
      const t = find(e.changedTouches, g.id);
      const x = t.clientX, y = t.clientY;
      const was = g;
      g = null;
      if (was.kind === "pending") {
        if (was.stopped) endScroll();
        if (!was.stopped && !cancelled) {
          const now = performance.now();
          const isDouble = was.mode === "ver" && (was.t0 - lastTap.t) < DOUBLE_TAP_MS &&
            Math.hypot(was.x0 - lastTap.x, was.y0 - lastTap.y) < DOUBLE_TAP_DIST;
          if (isDouble && opts.onDoubleTap) {
            clearTimeout(singleTapTimer);
            lastTap = { t: 0, x: 0, y: 0 };
            opts.onDoubleTap(was.x0, was.y0);
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
          endScroll();
          return;
        }
        if (!pinchClearRaf) flushPanNow();
        const [vx, vy] = cancelled || was.noFling ? [0, 0] : velocity(was.s, performance.now());
        const fx = was.lock === "y" ? 0 : vx, fy = was.lock === "x" ? 0 : vy;
        if (Math.hypot(fx, fy) > FLING_MIN_V) startFling(fx, fy, was.x0, was.y0);
        else {
          if (pinchClearRaf) setTimeout(() => { if (!g && !fling) fire.leave(); }, 80);
          else fire.leave();
          endScroll();
        }
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
      stop: () => { stopFling(); clearPinchTransform(); flushPanNow(); clearTimeout(singleTapTimer); clearTimeout(zoomLeaveTimer); fire.leave(); },
      busy: () => !!(g || fling || pinchTransformActive || pinchClearRaf),
      typing,
      zoomBy,
    };
  }

  window.pdfcraftGestures = { attach };
})();
