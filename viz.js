/* Ursavus v2 — hero field (matches v1's About hero). Animated implicit plot
   drawn by marching squares:  sin(k cos y + sin x) = sin(k cos x + sin y)
   k sweeps; move the cursor left<->right to scrub k yourself. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function colors(root) {
    var s = getComputedStyle(root);
    return { accent: s.getPropertyValue("--accent").trim(), accent2: s.getPropertyValue("--accent-2").trim() };
  }
  function setup(canvas) {
    var ctx = canvas.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0;
    function resize() { W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    resize();
    return { ctx: ctx, resize: resize, W: function () { return W; }, H: function () { return H; } };
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
    if (!canvas) return;
    var root = document.documentElement, s = setup(canvas), C = colors(root);
    window.addEventListener("urs:theme", function () { C = colors(root); });

    var MS = [[], [3, 0], [0, 1], [3, 1], [1, 2], [3, 0, 1, 2], [0, 2], [3, 2], [2, 3], [0, 2], [0, 1, 2, 3], [1, 2], [3, 1], [0, 1], [3, 0], []];
    var mode = canvas.getAttribute("data-mode") || "ripple";   // "ripple" (home/contact) | "lattice" (about)
    var t = 0, raf, mx = -1e5, hovering = false, kval = 3, kdir = 1, kdwell = 0, px = 0, py = 0, tpx = 0, tpy = 0;
    if (mode === "lattice") {
      var host = canvas.parentElement || canvas;
      host.addEventListener("pointermove", function (e) { var r = canvas.getBoundingClientRect(); mx = e.clientX - r.left; hovering = true; });
      host.addEventListener("pointerleave", function () { hovering = false; });
    } else {
      window.addEventListener("pointermove", function (e) { tpx = (e.clientX / window.innerWidth) * 2 - 1; tpy = (e.clientY / window.innerHeight) * 2 - 1; }, { passive: true });
    }

    function frame() {
      var W = s.W(), H = s.H(), ctx = s.ctx, light = !!(window.URS && window.URS.isLight && window.URS.isLight());
      ctx.clearRect(0, 0, W, H);

      var k, unit, ox, oy, x0, cell;
      if (mode === "lattice") {
        // k carries its own position + direction; on leaving the hover it keeps going the
        // way it was already heading. There are complete bears at BOTH ends (k = ±5) with
        // grid in the middle, so it only ever turns around at an end — never mid-stroke.
        if (hovering) {
          var target = Math.max(-5, Math.min(5, (mx / W) * 10 - 5));
          if (Math.abs(target - kval) > 0.0015) kdir = target > kval ? 1 : -1;   // follow the cursor's direction (ignore a still cursor)
          kval += (target - kval) * 0.045;          // ease toward the cursor
        } else if (kdwell > 0) {
          kdwell--;                                  // hold on a finished bear
        } else {
          if (kval >= 5 && kdir > 0) { kdir = -1; kdwell = 170; }        // bear complete at +5 — hold, then ease back
          else if (kval <= -5 && kdir < 0) { kdir = 1; kdwell = 170; }   // bear complete at -5 — hold, then ease back
          kval += kdir * 0.0065;                     // self-contained drift, never reverses mid-stroke
        }
        k = kval;
        unit = Math.min(W, H) / 15; ox = W * 0.6; oy = H * 0.5; x0 = W * 0.1; cell = Math.max(9, Math.min(W, H) / 66);
      } else {
        px += (tpx - px) * 0.05; py += (tpy - py) * 0.05;
        k = 5 + 5 * Math.sin(t * 0.0026);
        unit = Math.min(W, H) / 9; ox = W * 0.72 + px * W * 0.05; oy = H * 0.40 + py * H * 0.05; x0 = 0; cell = Math.max(8, Math.min(W, H) / 72);
      }
      var nx = Math.ceil((W - x0) / cell), ny = Math.ceil(H / cell), W1 = nx + 1;
      var fld = new Float32Array(W1 * (ny + 1)), gi, gj, X, Y;
      for (gj = 0; gj <= ny; gj++) {
        Y = -(gj * cell - oy) / unit;
        for (gi = 0; gi <= nx; gi++) {
          X = (x0 + gi * cell - ox) / unit;
          fld[gj * W1 + gi] = mode === "lattice"
            ? Math.sin(k * Math.cos(Y) + Math.sin(X)) - Math.sin(k * Math.cos(X) + Math.sin(Y))
            : Math.sin(X * X + Y * Y + X * Y) - Math.sin(k + Math.sin(k * X) + Math.cos(k * Y));
        }
      }

      ctx.globalCompositeOperation = light ? "source-over" : "lighter";
      ctx.strokeStyle = C.accent; ctx.globalAlpha = light ? 0.6 : 0.46; ctx.lineWidth = 1.15; ctx.lineJoin = "round";
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
      ctx.stroke();

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
      t += 1; raf = requestAnimationFrame(frame);
    }

    window.addEventListener("resize", function () { s.resize(); });
    if (reduce) { frame(); cancelAnimationFrame(raf); raf = null; }
    else {
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { if (!raf) raf = requestAnimationFrame(frame); }
        else { cancelAnimationFrame(raf); raf = null; }
      }).observe(canvas);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initField);
  else initField();
})();
