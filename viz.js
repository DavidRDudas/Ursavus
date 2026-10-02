/* Ursavus — a living implicit plot, drawn with marching squares.
   The original interference field and bear-forming lattice remain intact;
   optional hero controls add a quiet orbital field and a motion toggle. */
(function () {
  "use strict";
  var motionQuery = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduce = !!(motionQuery && motionQuery.matches);

  function colors(root) {
    var s = getComputedStyle(root);
    return { accent: s.getPropertyValue("--accent").trim() || "#7C73FF", accent2: s.getPropertyValue("--accent-2").trim() || "#54E3C6" };
  }
  function setup(canvas) {
    var ctx = canvas.getContext("2d"), dpr = 0, W = 0, H = 0;
    function resize() { dpr = Math.min(window.devicePixelRatio || 1, 2); W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    // the backing store goes stale when layout or devicePixelRatio settles after
    // setup (load races, zoom, monitor moves) — no resize event fires for those.
    function stale() { return canvas.clientWidth !== W || canvas.clientHeight !== H || Math.min(window.devicePixelRatio || 1, 2) !== dpr; }
    resize();
    return { ctx: ctx, resize: resize, stale: stale, W: function () { return W; }, H: function () { return H; } };
  }

  // an organic (slightly wobbly) closed loop — so the eyes read like the rest of
  // the hand-drawn contour, not perfect vector circles. Adds to the current path.
  function eyeLoop(ctx, cx, cy, r, ph) {
    for (var s = 0; s <= 16; s++) {
      var ang = s / 16 * 6.2832;
      var rr = r * (1 + 0.15 * Math.sin(ang * 3 + ph) + 0.09 * Math.sin(ang * 2 - ph));
      var x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
      if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }

  function initField() {
    var canvas = document.getElementById("field");
    if (!canvas || !canvas.getContext("2d")) return;
    var root = document.documentElement, s = setup(canvas), C = colors(root);
    var MS = [[], [3, 0], [0, 1], [3, 1], [1, 2], [3, 0, 1, 2], [0, 2], [3, 2], [2, 3], [0, 2], [0, 1, 2, 3], [1, 2], [3, 1], [0, 1], [3, 0], []];
    var mode = canvas.getAttribute("data-mode") || "ripple";
    if (["ripple", "lattice", "orbit"].indexOf(mode) < 0) mode = "ripple";
    var host = canvas.parentElement || canvas;
    var consoleEl = canvas.closest(".field-console");
    var buttons = document.querySelectorAll("[data-field-mode]");
    var pauseButton = document.querySelector("[data-field-pause]");
    var caption = document.getElementById("field-caption");
    var value = document.getElementById("field-value");
    var modeNames = { ripple: "Interference", lattice: "Dawn bear", orbit: "Orbital" };
    var t = 0, raf = null, last = 0, visible = true, paused = reduce;
    var mx = -1e5, hovering = false, kval = 3, kdir = 1, kdwell = 0;
    var px = 0, py = 0, tpx = 0, tpy = 0, fld = null;

    function syncControls() {
      for (var i = 0; i < buttons.length; i++) buttons[i].setAttribute("aria-pressed", String(buttons[i].getAttribute("data-field-mode") === mode));
      if (caption) caption.textContent = modeNames[mode];
      if (pauseButton) {
        pauseButton.setAttribute("aria-pressed", String(paused));
        pauseButton.setAttribute("aria-label", paused ? "Play field animation" : "Pause field animation");
        var pauseLabel = pauseButton.querySelector("[data-field-pause-label]");
        (pauseLabel || pauseButton).textContent = paused ? "Play motion" : "Pause motion";
      }
    }

    // Pointer input is local to the artwork; touch scrolling remains native.
    host.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      var r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left;
      hovering = mx >= 0 && mx <= r.width && e.clientY >= r.top && e.clientY <= r.bottom;
      tpx = Math.max(-1, Math.min(1, mx / Math.max(1, r.width) * 2 - 1));
      tpy = Math.max(-1, Math.min(1, (e.clientY - r.top) / Math.max(1, r.height) * 2 - 1));
    }, { passive: true });
    host.addEventListener("pointerleave", function () { hovering = false; tpx = 0; tpy = 0; });

    function draw(step) {
      if (s.stale()) s.resize();
      var W = s.W(), H = s.H(), ctx = s.ctx, light = !!(window.URS && window.URS.isLight && window.URS.isLight());
      if (!W || !H) return;
      t += step;
      ctx.clearRect(0, 0, W, H);

      var k, unit, ox, oy, x0, cell;
      if (mode === "lattice") {
        // k carries its own position + direction; on leaving the hover it keeps going the
        // way it was already heading. There are complete bears at BOTH ends (k = ±5) with
        // grid in the middle, so it only ever turns around at an end — never mid-stroke.
        if (step && hovering) {
          var target = Math.max(-5, Math.min(5, (mx / W) * 10 - 5));
          if (Math.abs(target - kval) > 0.0015) kdir = target > kval ? 1 : -1;   // follow the cursor's direction (ignore a still cursor)
          kval += (target - kval) * (1 - Math.pow(0.955, step));
        } else if (step && kdwell > 0) {
          kdwell -= step;                            // hold on a finished bear
        } else if (step) {
          if (kval >= 5 && kdir > 0) { kdir = -1; kdwell = 170; }        // bear complete at +5 — hold, then ease back
          else if (kval <= -5 && kdir < 0) { kdir = 1; kdwell = 170; }   // bear complete at -5 — hold, then ease back
          kval = Math.max(-5, Math.min(5, kval + kdir * 0.0065 * step));
        }
        k = kval;
        unit = Math.min(W, H) / (consoleEl ? 12 : 15); ox = W * (consoleEl ? 0.5 : 0.6); oy = H * 0.5; x0 = consoleEl ? 0 : W * 0.1; cell = Math.max(7, Math.min(W, H) / 66);
      } else {
        if (step) { px += (tpx - px) * (1 - Math.pow(0.95, step)); py += (tpy - py) * (1 - Math.pow(0.95, step)); }
        k = mode === "orbit" ? 3 + 1.5 * Math.sin(t * 0.0016) : 5 + 5 * Math.sin(t * 0.0026);
        unit = Math.min(W, H) / 9; ox = W * (consoleEl ? 0.5 : 0.72) + px * W * 0.025; oy = H * (consoleEl ? 0.5 : 0.4) + py * H * 0.025; x0 = 0; cell = Math.max(7, Math.min(W, H) / 72);
      }
      var nx = Math.ceil((W - x0) / cell), ny = Math.ceil(H / cell), W1 = nx + 1;
      var count = W1 * (ny + 1), gi, gj, X, Y;
      if (!fld || fld.length !== count) fld = new Float32Array(count);
      for (gj = 0; gj <= ny; gj++) {
        Y = -(gj * cell - oy) / unit;
        for (gi = 0; gi <= nx; gi++) {
          X = (x0 + gi * cell - ox) / unit;
          fld[gj * W1 + gi] = mode === "lattice"
            ? Math.sin(k * Math.cos(Y) + Math.sin(X)) - Math.sin(k * Math.cos(X) + Math.sin(Y))
            : mode === "orbit"
              ? Math.sin(0.72 * X * X + 1.35 * Y * Y - k * 0.55) - 0.48 * Math.cos(1.75 * X + 0.75 * Y + k * 0.32)
              : Math.sin(X * X + Y * Y + X * Y) - Math.sin(k + Math.sin(k * X) + Math.cos(k * Y));
        }
      }

      // A restrained glow gives the lines depth without becoming a backdrop to text.
      var wash = ctx.createRadialGradient(ox, oy, 0, ox, oy, Math.min(W, H) * 0.55);
      wash.addColorStop(0, C.accent2); wash.addColorStop(1, "transparent");
      ctx.fillStyle = wash; ctx.globalAlpha = light ? 0.025 : 0.065; ctx.fillRect(0, 0, W, H);
      var ink = ctx.createLinearGradient(0, H, W, 0);
      ink.addColorStop(0, C.accent); ink.addColorStop(0.55, C.accent); ink.addColorStop(1, C.accent2);
      ctx.globalCompositeOperation = light ? "source-over" : "lighter";
      ctx.strokeStyle = ink; ctx.lineJoin = "round";
      ctx.beginPath();
      for (gj = 0; gj < ny; gj++) {
        var yT = gj * cell, yB = yT + cell, rT = gj * W1, rB = rT + W1;
        for (gi = 0; gi < nx; gi++) {
          var a = fld[rT + gi], b = fld[rT + gi + 1], c = fld[rB + gi + 1], d = fld[rB + gi];
          var ci = (a > 0 ? 1 : 0) | (b > 0 ? 2 : 0) | (c > 0 ? 4 : 0) | (d > 0 ? 8 : 0);
          if (ci === 0 || ci === 15) continue;
          var seg = MS[ci], xL = x0 + gi * cell, xR = xL + cell, z, e1, e2, x1, y1, x2, y2;
          for (z = 0; z < seg.length; z += 2) {
            e1 = seg[z]; e2 = seg[z + 1];
            if (e1 === 0) { x1 = xL + cell * (a / (a - b)); y1 = yT; } else if (e1 === 1) { x1 = xR; y1 = yT + cell * (b / (b - c)); } else if (e1 === 2) { x1 = xL + cell * (d / (d - c)); y1 = yB; } else { x1 = xL; y1 = yT + cell * (a / (a - d)); }
            if (e2 === 0) { x2 = xL + cell * (a / (a - b)); y2 = yT; } else if (e2 === 1) { x2 = xR; y2 = yT + cell * (b / (b - c)); } else if (e2 === 2) { x2 = xL + cell * (d / (d - c)); y2 = yB; } else { x2 = xL; y2 = yT + cell * (a / (a - d)); }
            ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
          }
        }
      }
      ctx.globalAlpha = light ? 0.045 : 0.04; ctx.lineWidth = 5; ctx.stroke();
      ctx.globalAlpha = light ? 0.5 : 0.53; ctx.lineWidth = mode === "orbit" ? 0.95 : 1.1; ctx.stroke();

      // Coordinates and satellite points belong to the optional artwork panel only.
      if (consoleEl) {
        ctx.strokeStyle = C.accent2; ctx.globalAlpha = light ? 0.22 : 0.27; ctx.lineWidth = 0.7;
        ctx.setLineDash([2, 7]); ctx.beginPath();
        ctx.moveTo(ox - 13, oy); ctx.lineTo(ox + 13, oy);
        ctx.moveTo(ox, oy - 13); ctx.lineTo(ox, oy + 13); ctx.stroke(); ctx.setLineDash([]);
        for (var satellite = 0; satellite < 3; satellite++) {
          var angle = t * 0.0016 + satellite * Math.PI * 2 / 3;
          var radius = Math.min(W, H) * (0.29 + satellite * 0.055);
          var sx = ox + Math.cos(angle) * radius, sy = oy + Math.sin(angle) * radius * 0.74;
          ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fillStyle = C.accent2; ctx.globalAlpha = light ? 0.6 : 0.75; ctx.fill();
          ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.globalAlpha = light ? 0.2 : 0.3; ctx.stroke();
        }
      }

      // eyes — the lattice tiles into bear faces. The big heads are centred on the
      // a+b EVEN (saddle) nodes; drop a growing pair of eyes in each head's face,
      // in step with the nose loop the equation already draws.
      if (mode === "lattice") {
        var pu = Math.PI * unit;
        var eR = Math.max(0, Math.abs(kval) - 4.58) * unit * 0.43;   // the nose loop forms just past |k|=4.6 at BOTH ends; tie the eyes to that window
        var eKref = kval >= 0 ? 4.85 : -4.85;              // read the head's facing at the matching end
        if (eR > 0.6) {
          ctx.strokeStyle = C.accent; ctx.globalAlpha = light ? 0.8 : 0.66; ctx.lineWidth = 1.45; ctx.lineJoin = "round";
          // the faces sit on a 45° lattice, so the eye pair is offset along the
          // diagonal (one up-left, one down-right) and centred in the head.
          var exoff = unit * 0.72, eyoff = -unit * 0.95, comp = unit * 0.27;
          var mEX = exoff / unit, mEY = -eyoff / unit;   // the same offsets, in field (math) units
          var aMin = Math.floor((0 - ox) / pu) - 1, aMax = Math.ceil((W - ox) / pu) + 1;
          var bMin = Math.floor((oy - H) / pu) - 1, bMax = Math.ceil(oy / pu) + 1;
          ctx.beginPath();
          for (var ea = aMin; ea <= aMax; ea++) for (var eb = bMin; eb <= bMax; eb++) {
            if (((ea + eb) & 1) === 1) continue;          // big heads sit on the EVEN (saddle) nodes
            // read the field on both sides and put the eyes where the head's face is open,
            // so they follow the head however it turns — left/right and as it animates.
            var XA = ea * Math.PI + mEX, YA = eb * Math.PI + mEY, XB = ea * Math.PI - mEX, YB = eb * Math.PI - mEY;
            var FA = Math.sin(eKref * Math.cos(YA) + Math.sin(XA)) - Math.sin(eKref * Math.cos(XA) + Math.sin(YA));
            var FB = Math.sin(eKref * Math.cos(YB) + Math.sin(XB)) - Math.sin(eKref * Math.cos(XB) + Math.sin(YB));
            var fx = Math.abs(FA) >= Math.abs(FB) ? 1 : -1;   // side read at a fixed reference k, so it never flickers as the head forms
            var cxe = ox + ea * pu + fx * exoff, cyc = oy - eb * pu + fx * eyoff;
            eyeLoop(ctx, cxe + comp, cyc + comp, eR, ea * 1.7 + eb * 2.3);
            eyeLoop(ctx, cxe - comp, cyc - comp, eR, ea * 2.1 - eb * 1.3);
          }
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      if (value) value.textContent = k.toFixed(2);
    }

    function running() { return !paused && visible && !document.hidden; }
    function frame(now) {
      raf = null;
      if (!running()) { last = 0; return; }
      // Limit the expensive contour calculation to 30 fps, independent of display rate.
      if (!last || now - last >= 1000 / 30) {
        var step = last ? Math.min(3, (now - last) / (1000 / 60)) : 1;
        last = now; draw(step);
      }
      raf = requestAnimationFrame(frame);
    }
    function reconcile() {
      if (running()) { if (raf === null) { last = 0; raf = requestAnimationFrame(frame); } }
      else if (raf !== null) { cancelAnimationFrame(raf); raf = null; last = 0; }
    }
    function refresh() { draw(0); reconcile(); }
    for (var i = 0; i < buttons.length; i++) buttons[i].addEventListener("click", function () {
      var next = this.getAttribute("data-field-mode");
      if (!modeNames[next]) return;
      mode = next; canvas.setAttribute("data-mode", mode);
      if (mode === "lattice") { kval = 5; kdir = -1; kdwell = 170; }
      hovering = false; syncControls(); refresh();
    });
    if (pauseButton) pauseButton.addEventListener("click", function () { paused = !paused; syncControls(); reconcile(); });
    window.addEventListener("urs:theme", function () { C = colors(root); refresh(); });
    window.addEventListener("resize", function () { s.resize(); refresh(); }, { passive: true });
    document.addEventListener("visibilitychange", reconcile);
    if ("ResizeObserver" in window) new ResizeObserver(function () { if (s.stale()) { s.resize(); refresh(); } }).observe(canvas);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting; reconcile();
      }).observe(canvas);
    }
    if (motionQuery) {
      var updateMotion = function (event) { reduce = event.matches; paused = reduce; syncControls(); refresh(); };
      if (motionQuery.addEventListener) motionQuery.addEventListener("change", updateMotion);
      else if (motionQuery.addListener) motionQuery.addListener(updateMotion);
    }
    syncControls(); refresh();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initField);
  else initField();
})();
