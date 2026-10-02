/* Ursavus — the studio opening.
   The ident is SHATTERWING's UrsavusIdent, redrawn for the browser with the
   game's own cues, geometry and colours (1280x720 design space). Where the
   game fades to its title, the site is carved out of the dark by a level set
   of the hero's equation, and the bear flies home to the header.
   Plays on a fresh load or a reload, once per visit; any input skips ahead. */
(function () {
  "use strict";
  var root = document.documentElement;
  if (!root.classList.contains("intro")) return;
  var URS = window.URS = window.URS || {};
  var reduced = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ---------- the game's constants ---------- */
  var DESIGN_W = 1280, DESIGN_H = 720;
  var FONT_SIZE = 92, TRACKING = 12, BASELINE = 354;
  // Measured from Cycle's crest; the head is centred on the A.
  var HEAD_SCALE = 0.714282413, HEAD_TOP = 1.759097972, HEAD_CENTER_X = 24;
  var SLASH_HALF_HEIGHT = 38, SLASH_HALF_WIDTH = 10, SLASH_SKEW = 18, SLASH_GAP = 17;
  var SLOPE = SLASH_SKEW / SLASH_HALF_HEIGHT;
  // Unit vector up a slash, from its lower-left end to its upper-right end.
  var AXIS_X = 0.428087, AXIS_Y = -0.903739;
  var STRIKE_TRAVEL = 0.12, CARVE_MARGIN = 28, SWEEP_WIDTH = 26;
  // Onsets in the studio recording, in seconds.
  var IGNITE = 0.04, STRIKE = 0.27, PART = 1.01, WORD = 1.29, BEAR = 2.02, BEAR_DONE = 2.40,
      CAPTION = 2.55, GLEAM = 3.42;
  var ARPEGGIO = [0.394, 0.513, 0.645, 0.769, 0.893];
  // Night is the game's own palette: light added to black. Dawn is the light
  // theme's: ink on warm paper, lit by a sunrise behind the name.
  var NIGHT = {
    blend: "lighter", violet: [143, 122, 250], glowGain: 1,
    faceTop: [246, 244, 255], faceBottom: [207, 198, 246],
    headLight: [169, 158, 255], headDark: [117, 106, 242], aViolet: [117, 107, 242],
    heat: [255, 249, 255], sweep: [255, 250, 255], front: [217, 204, 255], rim: [255, 255, 255], bloom: [255, 255, 255],
    caption: [187, 181, 214], hairline: [168, 152, 232],
    blade: [[244, 240, 255], [183, 169, 233], [91, 77, 146]], bladeEdge: [251, 247, 255],
    halo: [143, 122, 250], star: [251, 247, 255], sparkHot: [251, 247, 255], sparkCool: [143, 122, 250],
    mote: [233, 231, 255], mote2: [143, 122, 250], moteGain: 1,
    bearGlow: [143, 122, 250], bearCore: [251, 247, 255], bearGain: 1
  };
  var DAWN = {
    blend: "source-over", violet: [75, 65, 224], glowGain: 1.6,
    faceTop: [28, 29, 42], faceBottom: [64, 58, 124],
    headLight: [124, 113, 246], headDark: [75, 65, 224], aViolet: [75, 65, 224],
    heat: [238, 150, 64], sweep: [255, 232, 196], front: [255, 205, 140], rim: [255, 232, 196], bloom: [255, 222, 176],
    caption: [88, 91, 99], hairline: [75, 65, 224],
    blade: [[132, 122, 248], [75, 65, 224], [36, 30, 108]], bladeEdge: [255, 206, 140],
    halo: [246, 188, 136], star: [226, 140, 56], sparkHot: [232, 150, 60], sparkCool: [75, 65, 224],
    mote: [242, 190, 122], mote2: [156, 146, 238], moteGain: 1.5,
    bearGlow: [246, 186, 136], bearCore: [255, 206, 150], bearGain: 0.75
  };
  var P = NIGHT;
  var LETTERS = "URSAVUS", LABEL = "INDEPENDENT GAME STUDIO";
  var GLOWS = [[16, 0.016], [9, 0.026], [4, 0.045]];
  var BODY = new Path2D("M4,24 C4,12 14,8 24,8 C34,8 44,12 44,24 L44,33 C44,45 35,50 24,50 C13,50 4,45 4,33 Z");
  var MARK = new Path2D("M4,24 C4,12 14,8 24,8 C34,8 44,12 44,24 L44,33 C44,45 35,50 24,50 C13,50 4,45 4,33 Z M14,28.5 a2.7,2.7 0 1,0 5.4,0 a2.7,2.7 0 1,0 -5.4,0 z M28.6,28.5 a2.7,2.7 0 1,0 5.4,0 a2.7,2.7 0 1,0 -5.4,0 z M20.2,37 a3.8,3.8 0 1,0 7.6,0 a3.8,3.8 0 1,0 -7.6,0 z");

  /* ---------- the web handoff ---------- */
  // The lockup holds into the last gleam; the game's exit (4.85 s) is replaced.
  var HANDOFF = 3.80;
  // Times after the handoff, in seconds.
  var B_CAPTION = 0.30, B_LETTERS = 0.06, B_STAGGER = 0.055, B_LETTER = 0.32, B_BODY = [0.14, 0.42];
  var B_FRONT = [0.12, 2.15], B_FLIGHT = [1.3, 2.15], B_END = 2.4;
  var QUICK_FRONT = [0.0, 1.05], QUICK_END = 1.15;
  // Reduced motion: the game's calm reveal, then a crossfade.
  var CALM_HOLD = 2.55, CALM_FADE = 0.7;
  // The hero's "Dawn bear" lattice. Its zero set is plotted outward from the
  // bear; behind the front each cell opens from its peak, |f| > m, and the
  // equation's own lines are the last of the dark to go. Distances are in
  // units of the farthest corner.
  var FIELD_K = 5.0, BAND = 0.46, LEAD = 0.24, AFTER = 0.42;

  /* ---------- small helpers ---------- */
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(e0, e1, x) { var t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); }
  function outCubic(x) { var r = 1 - clamp01(x); return 1 - r * r * r; }
  function inOutCubic(x) { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  // Ease-out with a 5% overshoot; exactly 0 at 0 and 1 at 1.
  function overshoot(x) { var y = x - 1; return Math.max(0, 1 + 2.2 * y * y * y + 1.2 * y * y); }
  function hash(v) { var x = Math.sin(v * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
  function mixc(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function rgba(c, a) { return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + (a < 0 ? 0 : a > 1 ? 1 : +a.toFixed(4)) + ")"; }
  function hex(value, fallback) {
    var m = /^#?([0-9a-f]{6})$/i.exec((value || "").trim());
    if (!m) return fallback;
    var n = parseInt(m[1], 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  // A gradient whose parameter is dot(p - c, dir): constant along lines
  // perpendicular to dir, running from o0 to o1.
  function lineGradient(ctx, cx, cy, dx, dy, o0, o1) {
    var n = dx * dx + dy * dy;
    return ctx.createLinearGradient(cx + dx * o0 / n, cy + dy * o0 / n, cx + dx * o1 / n, cy + dy * o1 / n);
  }
  // The hero's "Dawn bear" field (viz.js), in field units with y up.
  function field(x, y) { return Math.sin(FIELD_K * Math.cos(y) + Math.sin(x)) - Math.sin(FIELD_K * Math.cos(x) + Math.sin(y)); }

  /* ---------- stage ---------- */
  var stage = document.createElement("div");
  stage.className = "intro-stage";
  stage.setAttribute("aria-hidden", "true");
  var veilCanvas = document.createElement("canvas");
  var identCanvas = document.createElement("canvas");
  stage.appendChild(veilCanvas);
  stage.appendChild(identCanvas);
  var skipButton = document.createElement("button");
  skipButton.type = "button";
  skipButton.className = "intro-skip";
  skipButton.textContent = "Skip intro";
  document.body.appendChild(stage);
  document.body.appendChild(skipButton);
  var ix = identCanvas.getContext("2d");
  var wc = document.createElement("canvas"), wx = wc.getContext("2d");
  var mc = document.createElement("canvas"), mx = mc.getContext("2d");
  var rc = document.createElement("canvas"), rx = rc.getContext("2d");
  if (!ix || !wx || !mx || !rx) { release(); return; }
  var veil = makeVeil(veilCanvas) || makeFlatVeil(veilCanvas);
  root.classList.add("intro-live");
  if (!reduced) root.classList.add("intro-flight");

  /* ---------- layout ---------- */
  var FAMILY = "Ursavus Orbitron";
  var WORD_FONT = "720 " + FONT_SIZE + "px '" + FAMILY + "', system-ui, sans-serif", CAPTION_FONT = "500 13px '" + FAMILY + "', system-ui, sans-serif";
  var glyphX = [], advance = [], captionW = [], wordL = 0, wordR = 0;
  var aCX = 640, aCY = 321, capTop = 288, capBottom = 354, LS = 1.656;
  function measure() {
    ix.font = WORD_FONT;
    var x = 0, i;
    advance = [];
    for (i = 0; i < 7; i++) { advance.push(ix.measureText(LETTERS[i]).width); }
    glyphX = [];
    for (i = 0; i < 7; i++) { glyphX.push(x); x += advance[i] + TRACKING; }
    x -= TRACKING;
    for (i = 0; i < 7; i++) glyphX[i] += (DESIGN_W - x) / 2;
    wordL = (DESIGN_W - x) / 2; wordR = (DESIGN_W + x) / 2;
    // The actual A ink, as the game measures its glyph contour.
    var m = ix.measureText("A");
    var inkL = glyphX[3] - m.actualBoundingBoxLeft, inkR = glyphX[3] + m.actualBoundingBoxRight;
    capTop = BASELINE - m.actualBoundingBoxAscent; capBottom = BASELINE + m.actualBoundingBoxDescent;
    if (!(capBottom - capTop > 10)) { capTop = BASELINE - 66.24; capBottom = BASELINE; inkL = glyphX[3]; inkR = glyphX[3] + advance[3]; }
    aCX = (inkL + inkR) / 2; aCY = (capTop + capBottom) / 2;
    LS = (capBottom - capTop) / 40;
    ix.font = CAPTION_FONT;
    captionW = [];
    for (i = 0; i < LABEL.length; i++) captionW.push(ix.measureText(LABEL[i]).width);
  }

  var W = 0, H = 0, dpr = 1, sf = 1, offX = 0, offY = 0;
  function layout() {
    W = window.innerWidth; H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(W * dpr), h = Math.round(H * dpr);
    if (identCanvas.width !== w || identCanvas.height !== h) { identCanvas.width = w; identCanvas.height = h; }
    // The game fits its 1280x720 frame; a tall phone keeps the name readable.
    var fit = (wordR - wordL) + 150;
    sf = Math.min(H / DESIGN_H, Math.max(W / DESIGN_W, W * 0.92 / fit));
    offX = (W - DESIGN_W * sf) / 2; offY = (H - DESIGN_H * sf) / 2;
    veil.resize(W, H);
  }
  function toScreen(x, y) { return [offX + x * sf, offY + y * sf]; }

  /* ---------- clock ---------- */
  var T = 0, handoff = reduced ? CALM_HOLD : HANDOFF, quick = false, speed = 1;
  var paused = false, started = false, finished = false, raf = 0, last = 0;
  var landed = false, emerged = false, skips = 0;
  var accent = [146, 136, 255], accent2 = [84, 227, 198];
  // The light theme opens at dawn; the dark theme keeps the game's night.
  var lightTheme = root.getAttribute("data-theme") === "light";
  P = lightTheme ? DAWN : NIGHT;
  var emergeList = null, frontR = 1, frontUnit = 100, originX = 0, originY = 0;

  function u() { return T - handoff; }
  function inB() { return T >= handoff; }
  // A cue's light only when its cue was reached before the handoff.
  function cued(at) { return at <= handoff + 1e-6; }
  function pulse(at, decay) {
    if (!cued(at) || T < at - 0.03 || T > at + decay * 9) return 0;
    return smooth(at - 0.03, at, T) * Math.exp(-Math.max(0, T - at) / decay);
  }

  function pose() {
    var p = {};
    if (reduced) {
      p.reveal = smooth(0.08, 0.45, T); p.morph = smooth(0.75, 1.25, T);
      p.caption = smooth(1.35, 1.75, T); p.slashed = 0; p.zoom = 1;
    } else {
      p.reveal = clamp01((T - PART) / (WORD - PART));
      p.morph = clamp01((T - BEAR) / (BEAR_DONE - BEAR));
      p.caption = cued(CAPTION) ? smooth(CAPTION, CAPTION + 0.5, T) : 0;
      p.slashed = smooth(STRIKE - STRIKE_TRAVEL, STRIKE - STRIKE_TRAVEL + 0.02, T) * (1 - smooth(WORD, WORD + 0.16, T));
      // The strike lands with a small push of the frame.
      p.zoom = 1 + (T >= STRIKE && T < STRIKE + 0.8 ? 0.04 * Math.exp(-(T - STRIKE) / 0.09) : 0);
    }
    return p;
  }

  /* ---------- the ident ---------- */
  function reach(side) { return side < 0 ? aCX - wordL + CARVE_MARGIN : wordR + CARVE_MARGIN - aCX; }
  // Where a slash's centre is: striking in along its own axis, resting as the
  // studio's // mark, then carving outward along the name.
  function bladeCenter(side, time) {
    var rx = aCX + side * SLASH_GAP;
    if (time < STRIKE) {
      var travel = clamp01((time - (STRIKE - STRIKE_TRAVEL)) / STRIKE_TRAVEL);
      var k = side * 560 * (1 - travel) * (1 - travel);
      return [rx + AXIS_X * k, aCY + AXIS_Y * k];
    }
    if (time < PART) return [rx, aCY];
    var carve = outCubic((time - PART) / (WORD - PART));
    return [aCX + side * (SLASH_GAP + (reach(side) - SLASH_GAP) * carve), aCY];
  }
  function bladePoints(c, stretch, inflate) {
    stretch = stretch || 1; inflate = inflate || 0;
    var hx = SLASH_HALF_WIDTH + inflate, hy = SLASH_HALF_HEIGHT * stretch + inflate, skew = SLASH_SKEW * stretch;
    return [[c[0] - hx + skew, c[1] - hy], [c[0] + hx + skew, c[1] - hy], [c[0] + hx - skew, c[1] + hy], [c[0] - hx - skew, c[1] + hy]];
  }
  // Left edge, right edge and feather of the revealed name.
  function carveMask() {
    if (reduced) {
      var soft = 70, half = (Math.max(reach(-1), reach(1)) + 2 * soft) * smooth(0.08, 0.45, T) - soft;
      return [aCX - half, aCX + half, soft];
    }
    if (T >= WORD) return null;
    return [bladeCenter(-1, T)[0], bladeCenter(1, T)[0], 1];
  }
  // Specular sweeps: design-space x of the band and its strength.
  function sweep() {
    if (reduced) return null;
    var gleams = [[1.38, 1.98, 0.55], [GLEAM, GLEAM + 0.56, 0.4]];
    for (var i = 0; i < 2; i++) {
      var g = gleams[i];
      if (cued(g[0]) && T >= g[0] && T <= g[1]) {
        var progress = (T - g[0]) / (g[1] - g[0]);
        return [lerp(wordL - 140, wordR + 140, smooth(0, 1, progress)), g[2] * Math.sin(Math.PI * progress)];
      }
    }
    return null;
  }
  // When a slash passed a point of the name; freshly cut letters glow white-hot.
  function cutTime(offset, reachValue) {
    var travel = clamp01((offset - SLASH_GAP) / Math.max(reachValue - SLASH_GAP, 1));
    return PART + (1 - Math.pow(1 - travel, 1 / 3)) * (WORD - PART);
  }
  function heatAt(offset) {
    if (reduced) return 0;
    var cut = offset < 0 ? cutTime(-offset, reach(-1)) : cutTime(offset, reach(1));
    var age = T - cut;
    return age >= 0 ? Math.exp(-age / 0.17) : 0;
  }
  function letterPresence(i) {
    if (!inB()) return 1;
    if (quick) return 1;
    var start = B_LETTERS + (3 - Math.abs(i - 3)) * B_STAGGER;
    return 1 - smooth(start, start + B_LETTER, u());
  }

  function drawWordmark(p, D, opacity) {
    if (p.reveal <= 0 || opacity <= 0) return;
    var X0 = wordL - 46, X1 = wordR + 46, Y0 = capTop - 42, Y1 = BASELINE + 28;
    var w = Math.max(1, Math.ceil((X1 - X0) * D)), h = Math.max(1, Math.ceil((Y1 - Y0) * D));
    if (wc.width !== w || wc.height !== h) { wc.width = w; wc.height = h; }
    wx.setTransform(1, 0, 0, 1, 0, 0);
    wx.globalCompositeOperation = "source-over"; wx.globalAlpha = 1;
    wx.clearRect(0, 0, w, h);
    wx.setTransform(D, 0, 0, D, -X0 * D, -Y0 * D);
    wx.font = WORD_FONT; wx.lineJoin = "round"; wx.textBaseline = "alphabetic";
    var face = wx.createLinearGradient(0, capTop, 0, capBottom);
    face.addColorStop(0, rgba(P.faceTop, 1)); face.addColorStop(1, rgba(P.faceBottom, 1));
    var sw = sweep(), heating = !reduced && T < WORD + 1.3, drawn = false;
    for (var i = 0; i < 7; i++) {
      // The morph surface takes ownership of the A slot once the bear begins.
      if (i === 3 && morphShown) continue;
      var alpha = letterPresence(i) * opacity;
      if (alpha <= 0) continue;
      drawn = true;
      var cx = glyphX[i] + advance[i] / 2;
      var bloom = 1;
      if (heating) bloom += Math.min(1, heatAt(cx - aCX)) * 4;
      if (sw) { var band = (cx - sw[0]) / SWEEP_WIDTH; bloom += Math.exp(-band * band) * sw[1] * 3.5; }
      // Faint layered violet glow; heat and sweeps bloom it.
      for (var g = 0; g < 3; g++) {
        wx.lineWidth = GLOWS[g][0];
        wx.strokeStyle = rgba(P.violet, alpha * GLOWS[g][1] * bloom * P.glowGain);
        wx.strokeText(LETTERS[i], glyphX[i], BASELINE);
      }
      wx.globalAlpha = alpha; wx.fillStyle = face;
      wx.fillText(LETTERS[i], glyphX[i], BASELINE);
      wx.globalAlpha = 1;
    }
    if (!drawn) return;
    wx.globalCompositeOperation = "source-atop";
    if (heating) {
      var lo = -(reach(-1) + 60), hi = reach(1) + 60, n = 48;
      var hg = lineGradient(wx, aCX, aCY, 1, SLOPE, lo, hi), any = false;
      for (var s = 0; s <= n; s++) {
        var heat = Math.min(1, heatAt(lerp(lo, hi, s / n)));
        if (heat > 0.004) any = true;
        hg.addColorStop(s / n, rgba(P.heat, heat * 0.8));
      }
      if (any) { wx.fillStyle = hg; wx.fillRect(X0, Y0, X1 - X0, Y1 - Y0); }
    }
    if (sw && sw[1] > 0.002) {
      var sg = lineGradient(wx, sw[0], aCY, 1, 0.55, -3 * SWEEP_WIDTH, 3 * SWEEP_WIDTH);
      for (var b = 0; b <= 12; b++) {
        var o = (b / 12 * 6 - 3);
        sg.addColorStop(b / 12, rgba(P.sweep, Math.exp(-o * o) * sw[1]));
      }
      wx.fillStyle = sg; wx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    }
    // Only what the slashes have cut is visible.
    var mask = carveMask();
    if (mask) {
      wx.globalCompositeOperation = "destination-in";
      var L = mask[0] - aCX, R = mask[1] - aCX, f = mask[2];
      var a0 = Math.min(L - f, -2000), a1 = Math.max(R + f, 2000);
      var mg = lineGradient(wx, aCX, aCY, 1, SLOPE, a0, a1), span = a1 - a0;
      var stops = [[a0, 0], [L - f, 0], [L + f, 1], [R - f, 1], [R + f, 0], [a1, 0]];
      if (R - f < L + f) stops = [[a0, 0], [L - f, 0], [(L + R) / 2, clamp01((R - L) / (2 * f))], [R + f, 0], [a1, 0]];
      for (var m = 0; m < stops.length; m++) mg.addColorStop(clamp01((stops[m][0] - a0) / span), "rgba(0,0,0," + stops[m][1] + ")");
      wx.fillStyle = mg; wx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    }
    wx.globalCompositeOperation = "source-over";
    ix.drawImage(wc, X0, Y0, w / D, h / D);
  }

  // A vertical gradient sampled from a colour function of y.
  function sampled(ctx, y0, y1, n, fn) {
    var g = ctx.createLinearGradient(0, y0, 0, y1);
    for (var i = 0; i <= n; i++) { var c = fn(lerp(y0, y1, i / n)); g.addColorStop(i / n, rgba(c, c[3] == null ? 1 : c[3])); }
    return g;
  }
  function plain(y) { return mixc(P.faceTop, P.faceBottom, clamp01((y - 8) / 40)); }
  function headFace(yHead) { return mixc(P.headLight, P.headDark, clamp01((yHead - 6) / 44)); }
  // Source units (the A is 40 tall, centred on 24,28) to the head's SVG units.
  function headTransform(ctx, size) {
    ctx.translate(24, 31); ctx.scale(size, size);
    ctx.translate(HEAD_CENTER_X - 24, HEAD_TOP - 31);
    ctx.scale(HEAD_SCALE, HEAD_SCALE); ctx.translate(-24, -5.5);
  }
  function headToSource(ySvg, size) { return 31 + size * ((ySvg - 5.5) * HEAD_SCALE + HEAD_TOP - 31); }
  function fillGlyphA(ctx) {
    ctx.save();
    ctx.translate(24, 28); ctx.scale(1 / LS, 1 / LS); ctx.translate(-aCX, -aCY);
    ctx.font = WORD_FONT; ctx.textBaseline = "alphabetic";
    ctx.fillText("A", glyphX[3], BASELINE);
    ctx.restore();
  }
  function fillHead(ctx, size, ears) {
    ctx.save(); headTransform(ctx, size);
    ctx.beginPath();
    var r = Math.max(0, 8.5 * ears);
    ctx.arc(10, 14, r, 0, Math.PI * 2); ctx.closePath();
    ctx.arc(38, 14, r, 0, Math.PI * 2); ctx.closePath();
    ctx.fill(); ctx.fill(BODY);
    ctx.restore();
  }

  var morphShown = false;
  // The A becomes the bear: violet floods it from its feet, the head rises
  // out of the crossbar with a 5% overshoot, the ears follow and the face
  // opens last. At morph 1 it is the source lockup: the complete A beneath
  // Cycle's measured head.
  function drawMorph(p, D, opacity, body) {
    var morph = p.morph, k = LS * D;
    var w = Math.max(1, Math.ceil(56 * k)), h = Math.max(1, Math.ceil(80 * k));
    if (mc.width !== w || mc.height !== h) { mc.width = w; mc.height = h; }
    mx.setTransform(1, 0, 0, 1, 0, 0);
    mx.globalCompositeOperation = "source-over"; mx.globalAlpha = 1;
    mx.clearRect(0, 0, w, h);
    mx.setTransform(k, 0, 0, k, 4 * k, 20 * k);
    var growT = clamp01((morph - 0.10) / 0.62), earsT = clamp01((morph - 0.28) / 0.55);
    var grow = reduced ? smooth(0, 1, growT) : overshoot(growT);
    var ears = reduced ? smooth(0, 1, earsT) : overshoot(earsT);
    var eyes = smooth(0.70, 0.96, morph), size = Math.max(grow, 0.02);
    var flood = smooth(0, reduced ? 0.45 : 0.30, morph), front = lerp(54, -6, flood);
    // The plain face above the front, Cycle's matte violet below it.
    if (body > 0) {
      mx.globalAlpha = body;
      mx.fillStyle = sampled(mx, aCY - 48 * LS, aCY + 32 * LS, 40, function (yd) {
        var y = (yd - aCY) / LS + 28;
        return mixc(plain(y), P.aViolet, smooth(front - 2.5, front + 2.5, y));
      });
      fillGlyphA(mx);
      mx.globalAlpha = 1;
    }
    if (growT > 0) {
      mx.fillStyle = sampled(mx, -12, 62, 37, function (yHead) {
        var y = headToSource(yHead, size);
        return mixc(plain(y), headFace(yHead), smooth(front - 2.5, front + 2.5, y));
      });
      fillHead(mx, size, ears);
    }
    mx.globalCompositeOperation = "source-atop";
    if (!reduced) {
      // A bright front, then a lit rim while the silhouette changes.
      if (flood < 1) {
        var fg = mx.createLinearGradient(0, front - 5, 0, front + 5);
        for (var i = 0; i <= 10; i++) { var o = (i - 5) / 1.6; fg.addColorStop(i / 10, rgba(P.front, Math.exp(-o * o) * (1 - flood) * 0.9)); }
        mx.fillStyle = fg; mx.fillRect(-4, front - 5, 56, 10);
      }
      var rim = Math.sin(Math.PI * morph);
      if (rim > 0.01 && morph < 1) {
        // The silhouette minus itself nudged down-right: the edges facing
        // the upper-left light.
        if (rc.width !== w || rc.height !== h) { rc.width = w; rc.height = h; }
        rx.setTransform(1, 0, 0, 1, 0, 0); rx.globalCompositeOperation = "source-over"; rx.clearRect(0, 0, w, h);
        rx.setTransform(k, 0, 0, k, 4 * k, 20 * k);
        rx.fillStyle = rgba(P.rim, 1); fillGlyphA(rx); if (growT > 0) fillHead(rx, size, ears);
        rx.globalCompositeOperation = "destination-out";
        rx.setTransform(k, 0, 0, k, (4 + 1.1) * k, (20 + 1.45) * k);
        fillGlyphA(rx); if (growT > 0) fillHead(rx, size, ears);
        mx.save(); mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalAlpha = rim * 0.62;
        mx.drawImage(rc, 0, 0); mx.restore();
      }
      var glow = pulse(BEAR + 0.02, 0.16) * 0.8;
      if (glow > 0.002) { mx.fillStyle = rgba(P.bloom, glow * 0.45); mx.fillRect(-4, -20, 56, 80); }
      // The name's specular band crosses the bear, in source units.
      var sw = sweep();
      if (sw && sw[1] > 0.002) {
        var off = (sw[0] - aCX) / LS, width = SWEEP_WIDTH / LS;
        var sg = lineGradient(mx, 24 + off, 28, 1, 0.55, -3 * width, 3 * width);
        for (var b = 0; b <= 12; b++) { var q = b / 12 * 6 - 3; sg.addColorStop(b / 12, rgba(P.sweep, Math.exp(-q * q) * sw[1] * 0.8)); }
        mx.fillStyle = sg; mx.fillRect(-4, -20, 56, 80);
      }
    }
    if (eyes > 0) {
      mx.globalCompositeOperation = "destination-out";
      mx.fillStyle = "#000";
      mx.save(); headTransform(mx, size);
      mx.beginPath();
      mx.arc(16.7, 28.5, 2.7 * eyes, 0, Math.PI * 2); mx.closePath();
      mx.arc(31.3, 28.5, 2.7 * eyes, 0, Math.PI * 2); mx.closePath();
      mx.arc(24, 37, 3.8 * eyes, 0, Math.PI * 2); mx.closePath();
      mx.fill(); mx.restore();
    }
    mx.globalCompositeOperation = "source-over";
    ix.globalAlpha = clamp01(opacity);
    ix.drawImage(mc, aCX - 28 * LS, aCY - 48 * LS, w / D, h / D);
    ix.globalAlpha = 1;
  }

  function drawCaption(p, presence) {
    var progress = p.caption;
    if (progress <= 0 || presence <= 0) return;
    ix.font = CAPTION_FONT; ix.textBaseline = "alphabetic";
    // Letters open from the centre while the tracking settles.
    var spacing = reduced ? 5.2 : lerp(10, 5.2, outCubic(progress));
    var width = -spacing, i;
    for (i = 0; i < LABEL.length; i++) width += captionW[i] + spacing;
    var x = (DESIGN_W - width) / 2, middle = (LABEL.length - 1) / 2;
    for (i = 0; i < LABEL.length; i++) {
      var delay = Math.abs(i - middle) / middle * 0.5;
      var alpha = smooth(delay, delay + 0.5, progress) * presence;
      if (alpha > 0.002) { ix.fillStyle = rgba(P.caption, alpha * 0.92); ix.fillText(LABEL[i], x, BASELINE + 52); }
      x += captionW[i] + spacing;
    }
    // A hairline draws outward beneath it, bright at the centre.
    var reachH = 150 * outCubic(clamp01((progress - 0.15) / 0.85));
    if (reachH > 1) {
      var y = BASELINE + 74;
      for (var side = -1; side <= 1; side += 2) {
        var g = ix.createLinearGradient(640, 0, 640 + side * reachH, 0);
        g.addColorStop(0, rgba(P.hairline, 0.5 * presence)); g.addColorStop(1, rgba(P.hairline, 0));
        ix.fillStyle = g; ix.fillRect(side < 0 ? 640 - reachH : 640, y - 0.5, reachH, 1);
      }
    }
  }

  /* ---------- additive light ---------- */
  function glow(x, y, r, c, a) {
    if (a <= 0.002 || r <= 0) return;
    var g = ix.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(c, a)); g.addColorStop(0.25, rgba(c, a * 0.8187)); g.addColorStop(0.5, rgba(c, a * 0.4493));
    g.addColorStop(0.75, rgba(c, a * 0.1653)); g.addColorStop(1, rgba(c, 0));
    ix.fillStyle = g; ix.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function streak(cx, cy, hx, hy, width, c, a) {
    if (a <= 0.002) return;
    var len = Math.sqrt(hx * hx + hy * hy) || 1, ax = -hy / len * width, ay = hx / len * width;
    var g = ix.createLinearGradient(cx - hx, cy - hy, cx + hx, cy + hy);
    g.addColorStop(0, rgba(c, 0)); g.addColorStop(0.5, rgba(c, a)); g.addColorStop(1, rgba(c, 0));
    ix.fillStyle = g;
    ix.beginPath(); ix.moveTo(cx - hx, cy - hy); ix.lineTo(cx - ax, cy - ay); ix.lineTo(cx + hx, cy + hy); ix.lineTo(cx + ax, cy + ay); ix.closePath(); ix.fill();
  }
  // A four-point glint: halo, horizontal and vertical streaks, bright core.
  function star(x, y, level, reachX, rise) {
    if (level <= 0.002) return;
    glow(x, y, reachX * 0.4, P.halo, Math.min(1, level * 0.3));
    streak(x, y, reachX, 0, 1.3, P.star, Math.min(1, level * 0.8));
    streak(x, y, 0, rise, 1.0, P.star, Math.min(1, level * 0.55));
    ix.fillStyle = rgba(P.star, Math.min(1, level));
    ix.beginPath(); ix.arc(x, y, 1.6, 0, Math.PI * 2); ix.fill();
  }
  function polygon(points) {
    ix.beginPath(); ix.moveTo(points[0][0], points[0][1]);
    for (var i = 1; i < points.length; i++) ix.lineTo(points[i][0], points[i][1]);
    ix.closePath();
  }
  function hull(points) {
    var pts = points.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lower = [], upper = [], i;
    for (i = 0; i < pts.length; i++) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop(); lower.push(pts[i]); }
    for (i = pts.length - 1; i >= 0; i--) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop(); upper.push(pts[i]); }
    upper.pop(); lower.pop();
    return lower.concat(upper);
  }
  function rim(side) {
    var total = 0;
    for (var i = 0; i < ARPEGGIO.length; i++) {
      if ((i % 2 === 0 ? -1 : 1) !== side) continue;
      var age = T - ARPEGGIO[i];
      if (age >= 0) total += 0.6 * Math.exp(-age / 0.09);
    }
    return total;
  }
  function drawSpark() {
    if (T < IGNITE || T > STRIKE + 0.5) return;
    var level;
    if (T < STRIKE) {
      // The first bell lights a point; the second makes it flare.
      var bell = T >= 0.146 ? Math.exp(-(T - 0.146) / 0.07) : 0;
      level = smooth(IGNITE, IGNITE + 0.03, T) * (0.5 + 0.35 * bell);
    } else level = 1.5 * Math.exp(-(T - STRIKE) / 0.07);
    star(aCX, aCY, level, 64, 9);
  }
  function drawBlades(p) {
    var presence = p.slashed;
    if (presence <= 0) return;
    var dissolve = smooth(WORD, WORD + 0.16, T), stretch = 1 + 0.55 * dissolve, side, i;
    for (side = -1; side <= 1; side += 2) {
      var center = bladeCenter(side, T);
      var level = Math.min(1, presence * (1 + rim(side)));
      // Motion blur: the slash swept over its last 30 ms, clear at the tail.
      var past = bladeCenter(side, Math.max(STRIKE - STRIKE_TRAVEL, T - 0.03));
      var dx = center[0] - past[0], dy = center[1] - past[1];
      if (dx * dx + dy * dy >= 4) {
        var tg = ix.createLinearGradient(past[0], past[1], center[0], center[1]);
        tg.addColorStop(0, rgba(P.violet, 0)); tg.addColorStop(1, rgba(P.violet, presence * 0.45));
        ix.fillStyle = tg; polygon(hull(bladePoints(center, stretch).concat(bladePoints(past, stretch)))); ix.fill();
      }
      for (var halo = 0; halo < 3; halo++) {
        ix.fillStyle = rgba(P.violet, level * [0.07, 0.035, 0.018][halo]);
        polygon(bladePoints(center, stretch, 4 + halo * 5)); ix.fill();
      }
      var pts = bladePoints(center, stretch);
      var bg = ix.createLinearGradient(pts[0][0], pts[0][1], pts[2][0], pts[2][1]);
      bg.addColorStop(0, rgba(P.blade[0], level)); bg.addColorStop(0.5, rgba(P.blade[1], level)); bg.addColorStop(1, rgba(P.blade[2], level));
      ix.fillStyle = bg; polygon(pts); ix.fill();
      ix.strokeStyle = rgba(P.bladeEdge, level); ix.lineWidth = 1.5; ix.lineJoin = "round";
      ix.beginPath(); ix.moveTo(pts[3][0], pts[3][1]); ix.lineTo(pts[0][0], pts[0][1]); ix.lineTo(pts[1][0], pts[1][1]); ix.stroke();
    }
    // Each rising note sends a glint up alternate slashes.
    for (i = 0; i < ARPEGGIO.length; i++) {
      var age = T - ARPEGGIO[i];
      if (age < 0 || age > 0.3 || T >= PART) continue;
      var b = bladePoints(bladeCenter(i % 2 === 0 ? -1 : 1, T)), t = outCubic(age / 0.18);
      star(lerp(b[3][0], b[0][0], t), lerp(b[3][1], b[0][1], t), Math.exp(-age / 0.1) * 0.8 * presence, 20, 6);
    }
    // Both slashes flare out at the ends of the name.
    if (T >= WORD) for (side = -1; side <= 1; side += 2) { var e = bladeCenter(side, WORD); star(e[0], e[1], Math.exp(-(T - WORD) / 0.1) * 0.9, 90, 14); }
  }
  // A spray of cooling glass sparks; each follows a closed-form path.
  function burst(ox, oy, start, count, salt, power) {
    var age = T - start;
    if (!cued(start) || age < 0 || age > 1.25) return;
    for (var i = 0; i < count; i++) {
      var spread = hash(salt * 97 + i * 3), pace = hash(salt * 97 + i * 3 + 1), span = hash(salt * 97 + i * 3 + 2);
      var life = lerp(0.5, 1.2, span);
      if (age > life) continue;
      var angle = Math.PI * 2 * spread;
      // Flattened like an anamorphic lens flare.
      var dx = Math.cos(angle), dy = Math.sin(angle) * 0.55;
      var speedV = lerp(260, 1100, pace * pace) * power;
      var travel = speedV / 3.2 * (1 - Math.exp(-3.2 * age));
      var hx = ox + dx * travel, hy = oy + dy * travel, remaining = 1 - age / life;
      var length = speedV * Math.exp(-3.2 * age) * 0.035 + 2;
      streak(hx - dx * length * 0.5, hy - dy * length * 0.5, dx * length * 0.5, dy * length * 0.5, lerp(0.7, 1.4, span), mixc(P.sparkHot, P.sparkCool, 1 - remaining), 0.9 * Math.pow(remaining, 1.3));
    }
  }
  function drawDust(level) {
    if (level <= 0) return;
    // Out-of-focus motes drift up through the light; they never cross the lockup.
    var cl = wordL - 24, ct = capTop - 48, cr = wordR + 24, cb = BASELINE + 96;
    for (var i = 0; i < 26; i++) {
      var depth = hash(3001 + i);
      var x = lerp(170, 1110, hash(1001 + i)) + Math.sin(T * (0.45 + depth * 0.5) + hash(4001 + i) * Math.PI * 2) * (6 + 14 * depth);
      var y = 560 - (((hash(2001 + i) * 440 + T * lerp(5, 19, depth)) % 440) + 440) % 440;
      var nx = Math.max(cl, Math.min(cr, x)), ny = Math.max(ct, Math.min(cb, y));
      var outside = Math.sqrt((x - nx) * (x - nx) + (y - ny) * (y - ny));
      var alpha = level * smooth(120, 180, y) * (1 - smooth(500, 560, y)) * Math.min(1, outside / 36) * lerp(0.10, 0.05, depth) * P.moteGain;
      glow(x, y, lerp(2.2, 7.5, depth), mixc(P.mote, P.mote2, hash(5001 + i) * 0.6), alpha);
    }
  }
  // The outer top of an ear, in design space.
  function earTip(side) {
    var sx = HEAD_CENTER_X + (side * 20) * HEAD_SCALE, sy = HEAD_TOP + 2.5 * HEAD_SCALE;
    return [aCX + (sx - 24) * LS, aCY + (sy - 28) * LS];
  }
  function drawBearLight() {
    // The bear forms in a short bloom of its own light.
    var age = T - BEAR;
    if (cued(BEAR) && age >= 0 && age < 0.9) {
      var level = smooth(0, 0.035, age) * Math.exp(-age / 0.2);
      glow(aCX, aCY - 10, 115, P.bearGlow, level * 0.34 * P.bearGain);
      glow(aCX, aCY - 6, 46, P.bearCore, level * 0.22 * P.bearGain);
    }
    var a = earTip(1), b = earTip(-1);
    star(a[0], a[1], pulse(BEAR_DONE - 0.06, 0.13) * 0.9, 34, 10);
    star(b[0], b[1], pulse(GLEAM + 0.28, 0.14) * 0.75, 30, 9);
  }

  /* ---------- the bear flies home ---------- */
  var brandMark = document.querySelector(".site-head .brand .mark");
  function drawFlight(t) {
    if (!brandMark) return;
    var r = brandMark.getBoundingClientRect();
    if (!r.width) return;
    var e = inOutCubic(t);
    // The head's SVG origin and scale at the start: its place in the A.
    var k0 = HEAD_SCALE * LS * sf;
    var o0 = toScreen(aCX + (HEAD_CENTER_X - 24 - 24 * HEAD_SCALE) * LS, aCY + (HEAD_TOP - 28 - 5.5 * HEAD_SCALE) * LS);
    var k1 = r.width / 48;
    // Fly the head's centre along a gentle arc; scale geometrically.
    var c0x = o0[0] + 24 * k0, c0y = o0[1] + 29 * k0, c1x = r.left + 24 * k1, c1y = r.top + 29 * k1;
    var qx = lerp(c0x, c1x, 0.18), qy = lerp(c0y, c1y, 0.92);
    var cx = (1 - e) * (1 - e) * c0x + 2 * (1 - e) * e * qx + e * e * c1x;
    var cy = (1 - e) * (1 - e) * c0y + 2 * (1 - e) * e * qy + e * e * c1y;
    var k = k0 * Math.pow(k1 / k0, e);
    var ox = cx - 24 * k, oy = cy - 29 * k;
    // It carries a little of the light with it.
    ix.setTransform(dpr, 0, 0, dpr, 0, 0);
    ix.globalCompositeOperation = P.blend;
    var gl = Math.sin(Math.PI * e) * 0.28 * P.bearGain;
    if (gl > 0.002) glow(cx, cy, 44 * k, P.bearGlow, gl);
    ix.globalCompositeOperation = "source-over";
    ix.setTransform(dpr * k, 0, 0, dpr * k, dpr * ox, dpr * oy);
    var c = smooth(0.2, 0.85, e);
    var g = ix.createLinearGradient(0, 6, 0, 50);
    g.addColorStop(0, rgba(mixc(P.headLight, accent, c), 1)); g.addColorStop(1, rgba(mixc(P.headDark, accent, c), 1));
    ix.fillStyle = g;
    ix.beginPath(); ix.arc(10, 14, 8.5, 0, Math.PI * 2); ix.closePath(); ix.arc(38, 14, 8.5, 0, Math.PI * 2); ix.closePath(); ix.fill();
    ix.fill(MARK, "evenodd");
  }

  /* ---------- the site emerges ---------- */
  function frontWindow() { return quick ? QUICK_FRONT : B_FRONT; }
  // The front's progress: slow to leave the bear, quick through the middle.
  function tauAt(time) {
    var win = frontWindow();
    return lerp(-LEAD, 1 + BAND + AFTER, smooth(0, 1, (time - win[0]) / (win[1] - win[0])));
  }
  function distanceAt(x, y) { return Math.hypot(x - originX, y - originY) / frontR; }
  function prepareFront() {
    originX = offX + aCX * sf; originY = offY + aCY * sf;
    frontR = Math.max(1, Math.hypot(Math.max(originX, W - originX), Math.max(originY, H - originY)));
    frontUnit = Math.max(46, Math.min(W, H) / 7.6);
    // Everything in view rises once the cells around it are half open.
    emergeList = [];
    var els = document.querySelectorAll(".reveal");
    for (var e = 0; e < els.length; e++) {
      var r = els[e].getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= H || r.width === 0) continue;
      var nx = Math.max(r.left, Math.min(r.right, originX)), ny = Math.max(r.top, Math.min(r.bottom, originY));
      emergeList.push({ el: els[e], at: distanceAt(nx, ny) + BAND * 0.45 });
    }
  }
  function emerge(tau) {
    if (!emergeList) return;
    for (var i = 0; i < emergeList.length; i++) {
      var item = emergeList[i];
      if (item.done || tau < item.at) continue;
      item.done = true;
      item.el.style.setProperty("--d", "0");
      item.el.classList.add("in");
    }
  }
  function releaseReveals() {
    if (emerged) return;
    emerged = true;
    if (emergeList) emerge(1e9);
    else {
      var els = document.querySelectorAll(".reveal");
      for (var i = 0; i < els.length; i++) {
        var r = els[i].getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) els[i].classList.add("in");
      }
    }
    window.dispatchEvent(new CustomEvent("urs:emerge"));
  }
  function land() {
    if (landed) return;
    landed = true;
    root.classList.remove("intro-flight");
    root.classList.add("intro-landed");
  }

  /* ---------- frame ---------- */
  function render() {
    layout();
    var p = pose(), D = dpr * sf * p.zoom, U = u(), B = inB();
    // Reduced motion: the lockup leaves first, then the dark lifts.
    var calmFade = reduced ? 1 - smooth(handoff + 0.2, handoff + CALM_FADE, T) : 1;
    var quickFade = quick && B ? 1 - smooth(0, 0.25, U) : 1;
    var identAlpha = (reduced ? 1 - smooth(handoff, handoff + 0.42, T) : 1) * quickFade;
    // The bear holds at the origin while the site opens, then flies home.
    var flight = B_FLIGHT, flying = B && !quick && !reduced && U >= flight[0];
    // --- the veil ---
    var auraLevel = 0, flash = 0, streakLevel = 0;
    if (reduced) auraLevel = p.reveal * 0.65;
    else {
      var breath = 1 + 0.08 * Math.sin(Math.PI * 2 * (T - BEAR_DONE) / 2.6) * smooth(BEAR_DONE, BEAR_DONE + 0.8, T);
      auraLevel = (0.5 * smooth(STRIKE, 0.7, T) + 0.5 * smooth(0.7, WORD + 0.06, T)) * breath;
      flash = pulse(STRIKE, 0.10) + pulse(WORD, 0.2) * 0.3 + pulse(BEAR, 0.18) * 0.45;
      streakLevel = (T < STRIKE ? smooth(IGNITE, IGNITE + 0.1, T) : 0) * 0.16 + pulse(STRIKE, 0.15);
    }
    var v = { aura: auraLevel * (B ? 1 - smooth(0, 0.9, U) : 1) * calmFade, flash: flash, streak: streakLevel,
      seed: Math.floor(T * 30), fade: calmFade, front: 0,
      sky: B ? 1 : reduced ? smooth(0.0, 0.9, T) : smooth(IGNITE, WORD + 0.06, T) };
    if (B && reduced) releaseReveals();
    if (B && !reduced) {
      if (!emergeList) prepareFront();
      var tau = tauAt(U), win = frontWindow();
      v.front = 1; v.tau = tau; v.origin = [originX, originY]; v.radius = frontR; v.unit = frontUnit;
      v.lines = smooth(win[0], win[0] + 0.25, U) * (1 - smooth(win[1] - 0.2, win[1] + 0.1, U));
      v.heat = 1 - smooth(win[1] - 0.3, win[1], U);
      emerge(tau);
      if (U >= win[0] && stage.style.pointerEvents !== "none") { stage.style.pointerEvents = "none"; skipButton.classList.add("is-gone"); }
      if (U >= win[1] - 0.2) releaseReveals();
    }
    v.offset = [offX, offY]; v.scale = sf; v.center = [aCX, aCY];
    v.ink = accent; v.ink2 = accent2; v.dawn = lightTheme;
    veil.draw(v);
    // --- the ident ---
    ix.setTransform(1, 0, 0, 1, 0, 0);
    ix.globalCompositeOperation = "source-over"; ix.globalAlpha = 1;
    ix.clearRect(0, 0, identCanvas.width, identCanvas.height);
    if (!started) return;
    if (identAlpha > 0.002) {
      var z = p.zoom;
      ix.setTransform(D, 0, 0, D, dpr * (offX + sf * aCX * (1 - z)), dpr * (offY + sf * aCY * (1 - z)));
      morphShown = T >= (reduced ? 0.75 : BEAR);
      drawWordmark(p, D, identAlpha);
      if (morphShown && !flying) {
        var body = B && !quick ? 1 - smooth(B_BODY[0], B_BODY[1], U) : 1;
        drawMorph(p, D, identAlpha, body);
      }
      ix.setTransform(D, 0, 0, D, dpr * (offX + sf * aCX * (1 - z)), dpr * (offY + sf * aCY * (1 - z)));
      drawCaption(p, (B ? 1 - smooth(0, B_CAPTION, U) : 1) * identAlpha);
      if (!reduced) {
        ix.globalCompositeOperation = P.blend;
        ix.globalAlpha = identAlpha;
        drawSpark(); drawBlades(p);
        burst(aCX, aCY, STRIKE, 40, 11, 1.0);
        for (var side = -1; side <= 1; side += 2) { var end = bladeCenter(side, WORD); burst(end[0], end[1], WORD, 12, 29 + side * 7, 0.55); }
        drawDust(smooth(STRIKE, 1.4, T) * (B ? 1 - smooth(0, 0.5, U) : 1));
        if (!flying) drawBearLight();
        ix.globalCompositeOperation = "source-over"; ix.globalAlpha = 1;
      }
    }
    if (flying && !landed) {
      var ft = (U - flight[0]) / (flight[1] - flight[0]);
      if (ft >= 1) land(); else drawFlight(ft);
    }
  }

  function frame(now) {
    raf = 0;
    if (finished) return;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (!paused && started) T += dt * speed;
    try {
      var end = handoff + (reduced ? CALM_FADE : quick ? QUICK_END : B_END);
      if (started && T >= end) { finish(); return; }
      render();
    } catch (err) { finish(); throw err; }
    raf = requestAnimationFrame(frame);
  }

  /* ---------- input ---------- */
  function skip() {
    if (finished || !started) return;
    skips++;
    if (reduced) { handoff = Math.min(handoff, T); speed = 1.6; return; }
    if (!inB()) {
      handoff = T;
      quick = T < BEAR_DONE;
      if (quick) land();
      speed = 1.5;
    } else speed = skips > 1 ? 4 : 3;
  }
  function onKey(e) {
    if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") return;
    if (e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "PageDown" || e.key === "PageUp" || e.key === "Home" || e.key === "End") e.preventDefault();
    skip();
  }
  function onWheel(e) { e.preventDefault(); skip(); }
  function onPointer(e) { if (e.target === skipButton) return; if (!inB()) e.preventDefault(); skip(); }
  function onScroll() {
    if (!window.scrollY) return;
    try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, 0); }
  }
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchmove", onWheel, { passive: false });
  stage.addEventListener("pointerdown", onPointer);
  window.addEventListener("scroll", onScroll, { passive: true });
  skipButton.addEventListener("click", function () { skip(); skip(); });
  window.addEventListener("pageshow", function (e) { if (e.persisted) finish(); });

  function finish() {
    if (finished) return;
    finished = true;
    if (raf) cancelAnimationFrame(raf);
    land();
    releaseReveals();
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("touchmove", onWheel);
    window.removeEventListener("scroll", onScroll);
    veil.destroy();
    if (stage.parentNode) stage.parentNode.removeChild(stage);
    if (skipButton.parentNode) skipButton.parentNode.removeChild(skipButton);
    root.classList.remove("intro", "intro-live", "intro-flight");
    window.dispatchEvent(new CustomEvent("urs:intro-done"));
  }
  // Nothing could be drawn: give the page back untouched.
  function release() {
    if (stage.parentNode) stage.parentNode.removeChild(stage);
    if (skipButton.parentNode) skipButton.parentNode.removeChild(skipButton);
    root.classList.remove("intro", "intro-live", "intro-flight");
    window.dispatchEvent(new CustomEvent("urs:emerge"));
  }

  /* ---------- start ---------- */
  function readTheme() {
    var s = getComputedStyle(root);
    accent = hex(s.getPropertyValue("--accent"), accent);
    accent2 = hex(s.getPropertyValue("--accent-2"), accent2);
  }
  function begin() {
    if (started || finished) return;
    readTheme();
    measure();
    started = true;
    warm();
    last = 0;
    if (!raf) raf = requestAnimationFrame(frame);
  }
  // Rasterise the name, the bear and the lattice once while the screen is
  // still black, so a first visit doesn't stall on them mid-opening.
  function warm() {
    try {
      var times = reduced ? [0.3, 1.0, 2.0] : [1.2, 2.2, 2.6];
      for (var i = 0; i < times.length; i++) { T = times[i]; render(); }
      veil.draw({ aura: 0, flash: 0, streak: 0, seed: 0, fade: 1, front: 1, tau: -9, origin: [W / 2, H / 2], radius: 1000, unit: 100,
        lines: 0, heat: 0, sky: 1, offset: [offX, offY], scale: sf, center: [aCX, aCY], ink: accent, ink2: accent2, dawn: lightTheme });
    } catch (e) {}
    T = 0;
    render();
  }
  layout();
  render();
  raf = requestAnimationFrame(frame);
  var fontReady = null;
  try {
    var face = new FontFace(FAMILY, "url(fonts/orbitron.woff2) format('woff2')", { weight: "400 900" });
    document.fonts.add(face);
    fontReady = face.load();
  } catch (e) { fontReady = null; }
  var gate = setTimeout(begin, 1600);
  function go() { clearTimeout(gate); if (started) { measure(); return; } if (document.hidden) document.addEventListener("visibilitychange", function wait() { if (!document.hidden) { document.removeEventListener("visibilitychange", wait); begin(); } }); else begin(); }
  if (fontReady && fontReady.then) fontReady.then(go, go); else go();

  // For stepping through frames from the console; nothing calls these.
  URS.intro = {
    pause: function () { paused = true; },
    play: function () { paused = false; },
    seek: function (t) { T = t; },
    skip: skip,
    get time() { return T; }
  };

  /* ---------- the veil: WebGL ---------- */
  function makeVeil(canvas) {
    var gl = null;
    try { gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false }); } catch (e) {}
    if (!gl) return null;
    var deriv = gl.getExtension("OES_standard_derivatives");
    var head = deriv ? "#extension GL_OES_standard_derivatives : enable\n#define D(x) fwidth(x)\n" : "#define D(x) (0.0012)\n";
    var vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    var fs = head + [
      "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif",
      "uniform vec2 uRes;uniform float uDpr;uniform vec2 uOffset;uniform float uScale;uniform vec2 uCenter;",
      "uniform float uAura,uFlash,uStreak,uSeed,uFade,uFront,uTau,uR,uBand,uLead,uUnit,uK,uLines,uHeat,uDawn,uSky,uGrid;",
      "uniform vec2 uOrigin;uniform vec3 uInk,uInk2;",
      "float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}",
      // The hero's Dawn bear lattice (viz.js), y up.
      "float field(vec2 q){return sin(uK*cos(q.y)+sin(q.x))-sin(uK*cos(q.x)+sin(q.y));}",
      "void main(){",
      "  vec2 css=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uDpr;",
      "  vec2 d=(css-uOffset)/uScale-uCenter;",
      "  vec2 wide=d/vec2(430.,205.),near=d/vec2(165.,92.);",
      "  float flash=exp(-dot(d,d)/22500.)*uFlash;",
      "  float streak=(exp(-(d.y*d.y)/4.8)*exp(-abs(d.x)/380.)*.55+exp(-(d.y*d.y)/60.)*exp(-abs(d.x)/260.)*.08)*uStreak;",
      "  vec3 sky;",
      "  if(uDawn>.5){",
      // Dawn: pre-dawn grey warms to the site's paper as the name is carved,
      // with a sunrise behind it, a gold streak and warm flashes.
      "    vec2 h=(d-vec2(0.,150.))/vec2(640.,250.);",
      "    sky=mix(vec3(.886,.882,.918),vec3(.957,.953,.925),uSky);",
      "    sky=mix(sky,vec3(.976,.862,.765),exp(-dot(h,h)*1.25)*.6*uAura);",
      "    sky=mix(sky,vec3(.972,.885,.890),exp(-dot(h*vec2(.6,1.)-vec2(0.,-.9),h*vec2(.6,1.)-vec2(0.,-.9))*1.1)*.22*uAura);",
      "    sky=mix(sky,vec3(.996,.965,.910),clamp((exp(-dot(wide,wide)*1.6)*.42+exp(-dot(near,near)*1.4)*.3)*uAura,0.,1.));",
      "    sky=mix(sky,vec3(1.,.988,.965),clamp(flash*.5,0.,1.));",
      "    sky=mix(sky,vec3(.902,.639,.345),clamp(streak*.85,0.,1.));",
      "  }else{",
      // Night: the game's backdrop, a dark violet aura, the strike flashes and an anamorphic streak.
      "    sky=vec3(.475,.333,.788)*(exp(-dot(wide,wide)*2.)*.046+exp(-dot(near,near)*1.6)*.026)*uAura;",
      "    sky+=vec3(.80,.72,1.)*flash*.24+vec3(.78,.70,1.)*streak;",
      "  }",
      "  float veil=1.;vec3 glow=vec3(0.);vec4 ink=vec4(0.);",
      "  if(uFront>.5){",
      "    vec2 rel=css-uOrigin;",
      "    float f=field(vec2(rel.x,-rel.y)/uUnit),af=abs(f);",
      "    float r=length(rel)/uR;",
      // 0 ahead of the front, 1 once it has passed: every cell opens from its peak.
      "    float sr=(uTau-r)/uBand,s=clamp(sr,0.,1.);",
      "    float m=2.02*pow(1.-s,1.5);",
      "    float e=m-af,ew=max(D(e),1e-6);",
      // Once the front has passed, nothing of the veil is left, not even on f = 0.
      "    veil=smoothstep(-ew,ew,e)*(1.-smoothstep(.9,1.,sr));",
      "    float px=e/ew/uDpr;",
      "    vec2 res=uRes/uDpr;",
      "    float diag=clamp((css.x/res.x+1.-css.y/res.y)*.5,0.,1.);",
      "    vec3 inkC=mix(uInk,uInk2,smoothstep(.55,1.,diag));",
      // f = 0 is plotted outward from the bear ahead of the front and fades after it.
      "    float fw=max(D(f),1e-6);",
      "    float iso=1.-smoothstep(.5*uDpr,.5*uDpr+1.,af/fw);",
      "    float halo=exp(-pow(af/fw/(3.*uDpr),2.));",
      "    float dp=uTau+uLead-r;",
      "    float plot=smoothstep(0.,.06,dp)*(sr>1.?exp(-(sr-1.)*2.4):1.);",
      "    float pen=exp(-dp*dp/.0004);",
      "    float lines=(iso*(plot*.5+pen*.8)+halo*(plot*.07+pen*.12))*uLines;",
      // Each opening edge is cut like the slashes carved the name.
      "    float opening=smoothstep(0.,.05,s)*(1.-smoothstep(.8,1.,s));",
      "    float edge=exp(-px*px/1.2)*opening*.62*uLines;",
      // The wake cools, and the page's own graph paper glows as it is drawn.
      "    float heat=e<0.?exp(e/.14)*(1.-s):0.;",
      "    vec2 cell=mod(css,uGrid);",
      "    float grid=max(1.-smoothstep(0.,1.5,cell.x),1.-smoothstep(0.,1.5,cell.y))*sin(3.14159*s);",
      "    if(uDawn>.5){",
      // On paper the equation is drawn in ink and the wake is sunlit.
      "      float w=clamp((heat*.32+grid*.18)*uHeat,0.,1.)*(1.-veil);",
      "      vec3 wc=mix(vec3(.965,.745,.53),inkC,grid/(heat+grid+1e-4));",
      "      float a=clamp(lines*.62+edge*.55,0.,1.);",
      "      ink=vec4(inkC*a,a)+vec4(wc*w,w)*(1.-a);",
      "    }else{",
      "      glow+=(inkC*lines+mix(inkC,vec3(1.),.55)*edge)+(inkC*heat*.24+uInk2*grid*.30)*uHeat*(1.-veil);",
      "    }",
      "  }",
      "  vec4 col=vec4(sky*veil,veil);",
      "  col.rgb+=glow;",
      "  col=ink+col*(1.-ink.a);",
      "  float level=max(col.r,max(col.g,col.b));",
      "  col.rgb+=vec3(hash(gl_FragCoord.xy+vec2(uSeed*17.,uSeed*5.))-.5)/255.*clamp(level*60.,0.,1.)*col.a;",
      "  gl_FragColor=vec4(max(col.rgb,vec3(0.)),col.a)*uFade;",
      "}"
    ].join("\n");
    function shader(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { var log = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(log); }
      return s;
    }
    var prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, shader(gl.VERTEX_SHADER, vs));
      gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(prog, 0, "p");
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) { if (window.console) console.warn("Ursavus intro:", e); return null; }
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(prog);
    var loc = {};
    ["uRes", "uDpr", "uOffset", "uScale", "uCenter", "uAura", "uFlash", "uStreak", "uSeed", "uFade", "uFront", "uTau", "uR", "uBand", "uLead", "uUnit", "uK", "uLines", "uHeat", "uDawn", "uSky", "uGrid", "uOrigin", "uInk", "uInk2"].forEach(function (n) { loc[n] = gl.getUniformLocation(prog, n); });
    var lost = false, vdpr = 1, vw = 0, vh = 0;
    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); lost = true; finish(); });
    return {
      resize: function (w, h) {
        vdpr = Math.min(window.devicePixelRatio || 1, 2);
        // Keep the veil's pixel count bounded on very large screens.
        if (w * h * vdpr * vdpr > 5.5e6) vdpr = Math.max(1, Math.sqrt(5.5e6 / (w * h)));
        var pw = Math.round(w * vdpr), ph = Math.round(h * vdpr);
        if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
        vw = pw; vh = ph;
      },
      draw: function (v) {
        if (lost) return;
        gl.viewport(0, 0, vw, vh);
        gl.uniform2f(loc.uRes, vw, vh); gl.uniform1f(loc.uDpr, vw / Math.max(1, W));
        gl.uniform2f(loc.uOffset, v.offset[0], v.offset[1]); gl.uniform1f(loc.uScale, v.scale);
        gl.uniform2f(loc.uCenter, v.center[0], v.center[1]);
        gl.uniform1f(loc.uAura, v.aura); gl.uniform1f(loc.uFlash, v.flash); gl.uniform1f(loc.uStreak, v.streak);
        gl.uniform1f(loc.uSeed, v.seed); gl.uniform1f(loc.uFade, v.fade); gl.uniform1f(loc.uFront, v.front);
        if (v.front) {
          gl.uniform1f(loc.uTau, v.tau); gl.uniform1f(loc.uR, v.radius); gl.uniform1f(loc.uBand, BAND); gl.uniform1f(loc.uLead, LEAD);
          gl.uniform1f(loc.uUnit, v.unit); gl.uniform1f(loc.uK, FIELD_K); gl.uniform2f(loc.uOrigin, v.origin[0], v.origin[1]);
          gl.uniform1f(loc.uLines, v.lines); gl.uniform1f(loc.uHeat, v.heat);
        }
        gl.uniform1f(loc.uDawn, v.dawn ? 1 : 0); gl.uniform1f(loc.uSky, v.sky == null ? 1 : v.sky);
        gl.uniform1f(loc.uGrid, Math.max(40, Math.min(76, W * 0.06)));
        gl.uniform3f(loc.uInk, v.ink[0] / 255, v.ink[1] / 255, v.ink[2] / 255);
        gl.uniform3f(loc.uInk2, v.ink2[0] / 255, v.ink2[1] / 255, v.ink2[2] / 255);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      destroy: function () { try { var ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); } catch (e) {} lost = true; }
    };
  }

  /* ---------- the veil without WebGL: night or paper, then a soft circular wipe ---------- */
  function makeFlatVeil(canvas) {
    var c = canvas.getContext("2d"), vw = 0, vh = 0, vd = 1;
    return {
      resize: function (w, h) { vd = Math.min(window.devicePixelRatio || 1, 2); var pw = Math.round(w * vd), ph = Math.round(h * vd); if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; } vw = pw; vh = ph; },
      draw: function (v) {
        if (!c) return;
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-over"; c.clearRect(0, 0, vw, vh);
        c.globalAlpha = v.fade; c.fillStyle = v.dawn ? "#f4f3ec" : "#03040a"; c.fillRect(0, 0, vw, vh);
        if (v.front) {
          var r = Math.max(0, v.tau) * v.radius * vd, x = v.origin[0] * vd, y = v.origin[1] * vd;
          c.globalCompositeOperation = "destination-out";
          var g = c.createRadialGradient(x, y, Math.max(0, r - 60 * vd), x, y, r + 1);
          g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
          c.fillStyle = g; c.fillRect(0, 0, vw, vh);
        }
        c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
      },
      destroy: function () {}
    };
  }
})();
