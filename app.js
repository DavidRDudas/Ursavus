/* Ursavus v2 — interactions: theme, reveals, custom cursor, magnetics,
   nav, and the deep-time scale. Vanilla, no dependencies. */
(function () {
  "use strict";
  var root = document.documentElement;
  var motionQuery = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduce = !!(motionQuery && motionQuery.matches);
  window.URS = window.URS || {};
  window.URS.isLight = function () { return root.getAttribute("data-theme") === "light"; };

  /* ---- theme ---- */
  var toggle = document.querySelector(".tt");
  function applyTheme(next) {
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("urs-theme", next); } catch (e) {}
    document.querySelector('meta[name="theme-color"]').setAttribute("content", next === "light" ? "#F4F3EC" : "#0A0B0F");
    window.dispatchEvent(new CustomEvent("urs:theme"));
  }
  var replotting = false;
  if (toggle) toggle.addEventListener("click", function () {
    if (replotting) return;
    var next = window.URS.isLight() ? "dark" : "light";
    // The page is re-plotted through the hero's lattice; reduced motion,
    // the studio opening and browsers without WebGL switch at once.
    if (reduce || root.classList.contains("intro") || !replot(next)) applyTheme(next);
  });

  // Each theme's paper, graph lines and two inks, as in styles.css.
  var THEMES = {
    dark: { bg: [10, 11, 15], grid: [255, 255, 255], gridA: 0.03, a: [146, 136, 255], b: [84, 227, 198], dark: 1 },
    light: { bg: [244, 243, 236], grid: [20, 21, 26], gridA: 0.045, a: [75, 65, 224], b: [14, 155, 134], dark: 0 }
  };
  // Fill: from the toggle, the new paper fills each cell of the Dawn bear
  // lattice from its peak, with f = 0 plotted ahead in the old ink. The
  // theme switches under the full cover; then every cell opens again onto
  // the page in its new colours, and the equation's lines are the last to go.
  var FILL = 0.48, OPEN = 0.72, R_BAND = 0.3, R_LEAD = 0.18, R_AFTER = 0.36;
  function replot(next) {
    var canvas = document.createElement("canvas");
    canvas.className = "theme-replot";
    canvas.setAttribute("aria-hidden", "true");
    var gl = null;
    try { gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false }); } catch (e) {}
    if (!gl) return false;
    var deriv = gl.getExtension("OES_standard_derivatives");
    var fs = (deriv ? "#extension GL_OES_standard_derivatives : enable\n#define D(x) fwidth(x)\n" : "#define D(x) (0.0015)\n") + [
      "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif",
      "uniform vec2 uRes,uOrigin,uView;uniform float uDpr,uR,uUnit,uBand,uLead,uTau1,uTau2,uLines,uGrid,uGridA,uSwapped,uNewDark;",
      "uniform vec3 uFill,uGridC,uOldA,uOldB,uNewA,uNewB;",
      "float field(vec2 q){return sin(5.*cos(q.y)+sin(q.x))-sin(5.*cos(q.x)+sin(q.y));}",
      "void main(){",
      "  vec2 css=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uDpr,rel=css-uOrigin;",
      "  float f=field(vec2(rel.x,-rel.y)/uUnit),af=abs(f),r=length(rel)/uR;",
      "  float fw=max(D(f),1e-6),iso=1.-smoothstep(.5*uDpr,.5*uDpr+1.,af/fw);",
      "  float diag=smoothstep(.55,1.,clamp((css.x/uView.x+1.-css.y/uView.y)*.5,0.,1.));",
      "  vec3 inkOld=mix(uOldA,uOldB,diag),inkNew=mix(uNewA,uNewB,diag);",
      "  float s1r=(uTau1-r)/uBand,s1=clamp(s1r,0.,1.);",
      "  float e1=af-2.02*pow(1.-s1,1.5),w1=max(D(e1),1e-6);",
      "  float cover=max(smoothstep(-w1,w1,e1)*step(1e-4,s1),smoothstep(.9,1.,s1r));",
      "  float s2r=(uTau2-r)/uBand,s2=clamp(s2r,0.,1.);",
      "  float e2=2.02*pow(1.-s2,1.5)-af,w2=max(D(e2),1e-6);",
      "  float keep=smoothstep(-w2,w2,e2)*(1.-smoothstep(.9,1.,s2r));",
      "  vec2 cell=mod(css,uGrid);",
      "  float line=(cell.x<1.||cell.y<1.)?1.:0.;",
      "  vec2 g=vec2((css.x-uView.x*.5)/(1.2*uView.x),css.y/uView.y);",
      "  vec3 fill=mix(uFill,uGridC,line*(1.-smoothstep(.55,1.,length(g)))*uGridA);",
      "  vec4 col=vec4(fill,1.)*cover*keep;",
      "  float dp1=uTau1+uLead-r,dp2=uTau2+uLead-r,px1=e1/w1/uDpr,px2=e2/w2/uDpr;",
      "  float l1=iso*smoothstep(0.,.05,dp1)*(1.-cover)*.55*(1.-uSwapped)*uLines;",
      "  float l2=iso*smoothstep(0.,.05,dp2)*(s2r>1.?exp(-(s2r-1.)*2.4):1.)*.55*uSwapped*uLines;",
      "  float le=(exp(-px1*px1/1.2)*smoothstep(0.,.05,s1)*(1.-smoothstep(.8,1.,s1))*(1.-uSwapped)",
      "    +exp(-px2*px2/1.2)*smoothstep(0.,.05,s2)*(1.-smoothstep(.8,1.,s2))*uSwapped)*.7*uLines;",
      "  vec3 edge=uNewDark>.5?mix(inkNew,vec3(1.),.5):inkNew;",
      "  col=vec4(inkOld*l1,l1)+col*(1.-l1);",
      "  col=vec4(inkNew*l2,l2)+col*(1.-l2);",
      "  col=vec4(edge*le,le)+col*(1.-le);",
      "  gl_FragColor=col;",
      "}"
    ].join("\n");
    function compile(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = compile(gl.VERTEX_SHADER, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}"), fsh = compile(gl.FRAGMENT_SHADER, fs);
    if (!vs || !fsh) return false;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fsh); gl.bindAttribLocation(prog, 0, "p"); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var u = {};
    ["uRes", "uOrigin", "uView", "uDpr", "uR", "uUnit", "uBand", "uLead", "uTau1", "uTau2", "uLines", "uGrid", "uGridA", "uSwapped", "uNewDark", "uFill", "uGridC", "uOldA", "uOldB", "uNewA", "uNewB"].forEach(function (n) { u[n] = gl.getUniformLocation(prog, n); });
    var from = THEMES[next === "light" ? "dark" : "light"], to = THEMES[next];
    function rgb(name, c) { gl.uniform3f(u[name], c[0] / 255, c[1] / 255, c[2] / 255); }
    rgb("uFill", to.bg); rgb("uGridC", to.grid); rgb("uOldA", from.a); rgb("uOldB", from.b); rgb("uNewA", to.a); rgb("uNewB", to.b);
    gl.uniform1f(u.uGridA, to.gridA); gl.uniform1f(u.uNewDark, to.dark);
    gl.uniform1f(u.uBand, R_BAND); gl.uniform1f(u.uLead, R_LEAD);
    document.body.appendChild(canvas);
    replotting = true;
    var start = 0, swapped = false, lost = false;
    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); lost = true; });
    // The fill gathers pace as it leaves the toggle; the opening bursts out and settles.
    function easeIn(x) { x = Math.max(0, Math.min(1, x)); return x * x; }
    function easeOut(x) { x = Math.max(0, Math.min(1, x)); return 1 - (1 - x) * (1 - x); }
    function finish() {
      if (!swapped) applyTheme(next);
      try { var ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); } catch (e) {}
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      replotting = false;
    }
    function frame(now) {
      if (lost) { finish(); return; }
      if (!start) start = now;
      var t = (now - start) / 1000;
      var W = innerWidth, H = innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (W * H * dpr * dpr > 5.5e6) dpr = Math.max(1, Math.sqrt(5.5e6 / (W * H)));
      var pw = Math.round(W * dpr), ph = Math.round(H * dpr);
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
      var b = toggle.getBoundingClientRect(), ox = b.left + b.width / 2, oy = b.top + b.height / 2;
      var R = Math.max(1, Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy)));
      if (!swapped && t >= FILL) { swapped = true; applyTheme(next); }
      gl.viewport(0, 0, pw, ph);
      gl.uniform2f(u.uRes, pw, ph); gl.uniform2f(u.uView, W, H); gl.uniform1f(u.uDpr, pw / W);
      gl.uniform2f(u.uOrigin, ox, oy); gl.uniform1f(u.uR, R); gl.uniform1f(u.uUnit, Math.max(46, Math.min(W, H) / 7.6));
      gl.uniform1f(u.uGrid, parseFloat(getComputedStyle(document.body, "::before").backgroundSize) || Math.max(40, Math.min(76, W * 0.06)));
      gl.uniform1f(u.uTau1, -R_LEAD + (1 + R_BAND + R_LEAD) * easeIn(t / FILL));
      gl.uniform1f(u.uTau2, swapped ? -R_LEAD * 0.5 + (1 + R_BAND + R_AFTER + R_LEAD * 0.5) * easeOut((t - FILL) / OPEN) : -1);
      gl.uniform1f(u.uSwapped, swapped ? 1 : 0);
      gl.uniform1f(u.uLines, 1 - Math.max(0, Math.min(1, (t - FILL - OPEN + 0.16) / 0.16)));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (t >= FILL + OPEN) { finish(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return true;
  }

  /* ---- header stuck + mobile nav ---- */
  var head = document.querySelector(".site-head");
  var onScroll = function () { if (head) head.classList.toggle("is-stuck", window.scrollY > 12); };
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
  var burger = document.querySelector(".burger"), nav = document.querySelector(".nav");
  if (burger && nav) {
    function closeMenu() {
      nav.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    }
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeMenu); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { closeMenu(); burger.focus(); }
    });
    document.addEventListener("pointerdown", function (e) {
      if (!nav.contains(e.target) && !burger.contains(e.target)) closeMenu();
    });
  }

  /* ---- reveal on scroll ---- */
  var revs = [].slice.call(document.querySelectorAll(".reveal"));
  function startReveals() {
    if (reduce || !("IntersectionObserver" in window)) {
      revs.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    revs.forEach(function (el) { if (!el.classList.contains("in")) io.observe(el); });
  }
  // During the studio opening (intro.js), what is in view rises as the page
  // emerges; scrolling reveals the rest as usual.
  if (root.classList.contains("intro")) {
    var revealsStarted = false;
    var beginReveals = function () { if (!revealsStarted) { revealsStarted = true; startReveals(); } };
    window.addEventListener("urs:emerge", beginReveals);
    setTimeout(beginReveals, 12000);
  } else startReveals();
  root.classList.add("reveals-ready");

  /* ---- active nav by section ---- */
  var navlinks = [].slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var secs = navlinks.map(function (a) { return document.querySelector(a.getAttribute("href")); }).filter(Boolean);
  if (secs.length) {
    var navFrame = null;
    function updateActiveNav() {
      navFrame = null;
      var at = innerHeight * 0.4, active = "";
      secs.forEach(function (section) {
        var bounds = section.getBoundingClientRect();
        if (bounds.top <= at && bounds.bottom > at) active = "#" + section.id;
      });
      navlinks.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === active); });
    }
    function queueActiveNav() { if (navFrame === null) navFrame = requestAnimationFrame(updateActiveNav); }
    window.addEventListener("scroll", queueActiveNav, { passive: true });
    window.addEventListener("resize", queueActiveNav, { passive: true });
    updateActiveNav();
  }

  /* ---- custom cursor + magnetics ---- */
  var fineQuery = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)");
  var magnets = [].slice.call(document.querySelectorAll(".magnetic"));
  function hasFinePointer() { return !!(fineQuery && fineQuery.matches); }
  var stopCursor = function () {};
  if (document.querySelector(".cursor") && document.querySelector(".cursor-ring")) {
    var dot = document.querySelector(".cursor"), ring = document.querySelector(".cursor-ring");
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    var cursorRaf = null;
    function cursorAllowed() { return hasFinePointer() && !reduce && !document.hidden; }
    function loop() {
      if (!cursorAllowed()) { stopCursor(); return; }
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.left = rx + "px"; ring.style.top = ry + "px";
      cursorRaf = requestAnimationFrame(loop);
    }
    stopCursor = function () {
      if (cursorRaf !== null) cancelAnimationFrame(cursorRaf);
      cursorRaf = null;
      root.classList.remove("cursor-ready");
      document.body.classList.remove("cursor-hot");
      dot.style.opacity = 0; ring.style.opacity = 0;
    };
    window.addEventListener("pointermove", function (e) {
      if (!cursorAllowed() || e.pointerType === "touch") { stopCursor(); return; }
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + "px"; dot.style.top = my + "px";
      if (cursorRaf === null) {
        rx = mx; ry = my;
        ring.style.left = rx + "px"; ring.style.top = ry + "px";
        dot.style.opacity = 1; ring.style.opacity = 1;
        root.classList.add("cursor-ready");
        cursorRaf = requestAnimationFrame(loop);
      }
    });
    var hot = "a,button,.magnetic,input,textarea,label[for],.tl-track";
    document.querySelectorAll(hot).forEach(function (el) {
      el.addEventListener("pointerenter", function () { if (cursorAllowed()) document.body.classList.add("cursor-hot"); });
      el.addEventListener("pointerleave", function () { document.body.classList.remove("cursor-hot"); });
    });
    window.addEventListener("blur", stopCursor);
    document.documentElement.addEventListener("pointerleave", stopCursor);
    document.addEventListener("visibilitychange", function () { if (document.hidden) stopCursor(); });
  }
  magnets.forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      if (!hasFinePointer() || reduce || e.pointerType === "touch") return;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.transform = "translate(" + (dx * 10) + "px," + (dy * 10) + "px)";
    });
    el.addEventListener("pointerleave", function () { el.style.transform = ""; });
  });
  function updateMotion() {
    reduce = !!(motionQuery && motionQuery.matches);
    if (reduce || !hasFinePointer()) {
      stopCursor();
      magnets.forEach(function (el) { el.style.transform = ""; });
    }
    if (reduce) revs.forEach(function (el) { el.classList.add("in"); });
  }
  [motionQuery, fineQuery].forEach(function (query) {
    if (!query) return;
    if (query.addEventListener) query.addEventListener("change", updateMotion);
    else if (query.addListener) query.addListener(updateMotion);
  });

  /* ---- deep-time scale ---- */
  (function () {
    var track = document.getElementById("tl-track");
    if (!track) return;
    var thumb = document.getElementById("tl-thumb"), prog = document.getElementById("tl-progress");
    var whenEl = document.getElementById("tl-when"), eraEl = document.getElementById("tl-era"), noteEl = document.getElementById("tl-note");
    var stops = [].slice.call(track.querySelectorAll(".tl-stop"));
    stops.forEach(function (s) { s.style.left = s.getAttribute("data-p") + "%"; });
    var data = {
      0:   { when: "≈ 20,000,000 yr ago", era: "The dawn bear", note: "A small, fox-sized animal appears in the Miocene — the first undisputed bear, and the origin every living bear descends from." },
      25:  { when: "≈ 15,000,000 yr ago", era: "Divergence", note: "The living bear lineages branch away from Ursavus. The body plan is settled; everything later inherits it." },
      75:  { when: "≈ 5,000,000 yr ago", era: "Radiation", note: "Bears spread across Asia, Europe, and the Americas. The shape proves durable across deep time." },
      100: { when: "Today", era: "Ursavus, the studio", note: "An independent game studio, built on the same idea — get the origin right, and what comes after can stand on it." }
    };
    var keys = [0, 25, 75, 100];
    var cur = null;
    function nearest(p) { var best = 0, bd = 1e9; keys.forEach(function (k) { var d = Math.abs(k - p); if (d < bd) { bd = d; best = k; } }); return best; }
    function paint(p, snapKey) {
      p = Math.max(0, Math.min(100, p));
      thumb.style.left = p + "%"; prog.style.width = p + "%";
      track.setAttribute("aria-valuenow", Math.round(p));
      var key = snapKey != null ? snapKey : nearest(p);
      var d = data[key];
      track.setAttribute("aria-valuetext", d.when + " — " + d.era);
      if (key !== cur) {
        cur = key;
        whenEl.textContent = d.when; eraEl.textContent = d.era; noteEl.textContent = d.note;
      }
      stops.forEach(function (s) { s.classList.toggle("on", +s.getAttribute("data-p") === key); });
    }
    function fromEvent(e) { var r = track.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * 100; }
    var dragging = false, activePointer = null;
    track.addEventListener("pointerdown", function (e) {
      if (dragging || (e.pointerType === "mouse" && e.button !== 0)) return;
      dragging = true; activePointer = e.pointerId;
      track.focus({ preventScroll: true });
      track.setPointerCapture(e.pointerId); paint(fromEvent(e));
    });
    track.addEventListener("pointermove", function (e) { if (dragging && e.pointerId === activePointer) paint(fromEvent(e)); });
    function endDrag(e, canceled) {
      if (!dragging || e.pointerId !== activePointer) return;
      dragging = false; activePointer = null;
      var key = canceled ? cur : nearest(fromEvent(e));
      paint(key, key);
      if (track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId);
    }
    track.addEventListener("pointerup", function (e) { endDrag(e, false); });
    track.addEventListener("pointercancel", function (e) { endDrag(e, true); });
    track.addEventListener("lostpointercapture", function (e) { endDrag(e, true); });
    track.addEventListener("keydown", function (e) {
      var i = keys.indexOf(cur);
      if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); i = Math.min(keys.length - 1, i + 1); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); i = Math.max(0, i - 1); }
      else if (e.key === "Home") { e.preventDefault(); i = 0; }
      else if (e.key === "End") { e.preventDefault(); i = keys.length - 1; }
      else return;
      paint(keys[i], keys[i]);
    });
    paint(0, 0);
  })();
})();
