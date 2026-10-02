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
  if (toggle) toggle.addEventListener("click", function () {
    var next = window.URS.isLight() ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("urs-theme", next); } catch (e) {}
    document.querySelector('meta[name="theme-color"]').setAttribute("content", next === "light" ? "#F4F3EC" : "#0A0B0F");
    window.dispatchEvent(new CustomEvent("urs:theme"));
  });

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
  if (reduce || !("IntersectionObserver" in window)) {
    revs.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    revs.forEach(function (el) { io.observe(el); });
  }
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
