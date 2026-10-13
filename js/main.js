/* =========================================================
   Maxxwell Logistics — interactions
   ========================================================= */
(function () {
  "use strict";

  const CONFIG = window.MAXXWEL_CONFIG || {};
  const root = document.documentElement;
  root.classList.remove("no-js");

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduceMotion = motionQuery.matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------------------------------------------------------
     Header state, back-to-top, footer year
     --------------------------------------------------------- */
  const header = $(".site-header");
  const toTop = $(".to-top");
  $("#year").textContent = new Date().getFullYear();

  function onScrollUI() {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 40);
    toTop.classList.toggle("is-visible", y > 700);
  }

  toTop.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    $(".brand").focus({ preventScroll: true });
  });

  /* ---------------------------------------------------------
     Mobile navigation
     --------------------------------------------------------- */
  const toggle = $(".nav__toggle");
  const menu = $("#nav-menu");

  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    if (open) {
      header.classList.add("is-scrolled");
      const first = $("a", menu);
      setTimeout(() => first && first.focus(), 50);
    } else {
      onScrollUI();
    }
  }

  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));

  document.addEventListener("keydown", (e) => {
    if (!menu.classList.contains("is-open")) return;
    if (e.key === "Escape") { setMenu(false); toggle.focus(); return; }
    if (e.key === "Tab") {
      const focusables = [toggle, ...$$("a", menu)];
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  window.matchMedia("(min-width: 1061px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

  /* ---------------------------------------------------------
     Active nav link
     --------------------------------------------------------- */
  // Only in-page links take part; on other pages the current link is marked in the HTML.
  const navLinks = $$('.nav__links a[href^="#"]');
  const sectionMap = new Map(navLinks.map((a) => [a.getAttribute("href").slice(1), a]));
  if ("IntersectionObserver" in window && navLinks.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => { a.classList.remove("is-active"); a.removeAttribute("aria-current"); });
        const link = sectionMap.get(entry.target.id);
        if (link) { link.classList.add("is-active"); link.setAttribute("aria-current", "true"); }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach((s) => spy.observe(s));
  }

  /* ---------------------------------------------------------
     Services page: highlight the service in view
     --------------------------------------------------------- */
  const svcLinks = $$(".svc-index a[href^='#']");
  if ("IntersectionObserver" in window && svcLinks.length) {
    const svcSpy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        svcLinks.forEach((a) => {
          const on = a.getAttribute("href") === "#" + entry.target.id;
          a.classList.toggle("is-active", on);
          if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-35% 0px -60% 0px" });
    $$(".svc-item[id]").forEach((s) => svcSpy.observe(s));
  }

  /* ---------------------------------------------------------
     Scroll reveal + counters
     --------------------------------------------------------- */
  const revealEls = $$(".reveal, .reveal-img");
  const counters = $$("[data-count]");

  function formatCount(el, value) {
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    if (el.dataset.format === "k") return Math.round(value / 1000) + "K";
    return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function runCounter(el) {
    const target = parseFloat(el.dataset.count);
    if (reduceMotion) { el.textContent = formatCount(el, target); return; }
    const duration = 1800;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = formatCount(el, target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  if ("IntersectionObserver" in window && !reduceMotion) {
    // Clipped image reveals have no visible area until revealed, so watch their parent instead.
    const watched = new Map();
    revealEls.forEach((el) => {
      const target = el.classList.contains("reveal-img") ? el.parentElement : el;
      if (!watched.has(target)) watched.set(target, []);
      watched.get(target).push(el);
    });
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        watched.get(entry.target).forEach((el) => el.classList.add("is-visible"));
        obs.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
    watched.forEach((_, target) => io.observe(target));

    const countIO = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        runCounter(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => { el.textContent = formatCount(el, 0); countIO.observe(el); });
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------------------------------------------------------
     Parallax (rAF-throttled, transform-only)
     --------------------------------------------------------- */
  const layers = $$("[data-parallax]").map((el) => ({ el, speed: parseFloat(el.dataset.parallax) || 0, ref: el.parentElement }));
  let ticking = false;

  function updateParallax() {
    ticking = false;
    if (reduceMotion) return;
    const vh = window.innerHeight;
    const factor = window.innerWidth < 680 ? 0.5 : 1;
    for (const layer of layers) {
      const rect = layer.ref.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) continue;
      const center = rect.top + rect.height / 2;
      let y = (vh / 2 - center) * layer.speed * factor;
      // keep background layers within their overscan so edges never show
      const slack = (layer.el.offsetHeight - rect.height) / 2;
      if (slack > 0) y = Math.max(-slack, Math.min(slack, y));
      layer.el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    }
  }

  function requestTick() {
    if (!ticking) { ticking = true; requestAnimationFrame(updateParallax); }
  }

  window.addEventListener("scroll", () => { onScrollUI(); requestTick(); }, { passive: true });
  window.addEventListener("resize", requestTick, { passive: true });
  motionQuery.addEventListener("change", (e) => {
    reduceMotion = e.matches;
    if (reduceMotion) {
      layers.forEach((l) => (l.el.style.transform = ""));
      revealEls.forEach((el) => el.classList.add("is-visible"));
    }
    requestTick();
  });
  onScrollUI();
  updateParallax();

  /* ---------------------------------------------------------
     Hero background video: play only while visible, never for reduced motion
     --------------------------------------------------------- */
  const heroVideo = $(".hero__video");
  if (heroVideo) {
    let heroInView = true;
    const syncVideo = () => {
      if (reduceMotion || !heroInView) heroVideo.pause();
      else heroVideo.play().catch(() => { /* autoplay blocked: poster stays */ });
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => { heroInView = entry.isIntersecting; syncVideo(); })
        .observe($(".hero"));
    }
    motionQuery.addEventListener("change", syncVideo);
    syncVideo();
  }

  /* ---------------------------------------------------------
     FAQ accordion
     --------------------------------------------------------- */
  $$(".accordion button").forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute("aria-controls"));
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      if (reduceMotion) { panel.hidden = open; return; }
      if (open) {
        panel.style.height = panel.scrollHeight + "px";
        requestAnimationFrame(() => { panel.style.height = "0px"; });
        panel.addEventListener("transitionend", function done() {
          panel.hidden = true; panel.style.height = "";
          panel.removeEventListener("transitionend", done);
        });
      } else {
        panel.hidden = false;
        panel.style.height = "0px";
        requestAnimationFrame(() => { panel.style.height = panel.scrollHeight + "px"; });
        panel.addEventListener("transitionend", function done() {
          panel.style.height = "";
          panel.removeEventListener("transitionend", done);
        });
      }
    });
  });

  /* ---------------------------------------------------------
     Global network map
     --------------------------------------------------------- */
  const W = 1000, H = 500;
  const project = (lat, lon) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];

  const HUBS = {
    chennai:   { name: "Chennai, India", lat: 13.08, lon: 80.27, type: "Global headquarters", hq: true, services: "Sea · Air · Road",
                 text: "Our head office and South Asia operations centre, with direct sailings to Singapore and Jebel Ali and daily air connections to Europe and the Gulf." },
    mumbai:    { name: "Mumbai, India", lat: 18.95, lon: 72.95, type: "Regional office · Nhava Sheva", services: "Sea · Road · Customs",
                 text: "Gateway for West India via JNPT, handling FCL exports to the Gulf, Africa and Europe plus bonded trucking inland." },
    dubai:     { name: "Dubai, UAE", lat: 25.01, lon: 55.06, type: "Middle East hub · Jebel Ali", services: "Sea · Air · Warehousing",
                 text: "Free-zone warehousing and sea-air transshipment linking the Indian subcontinent with Europe, Africa and the Americas." },
    singapore: { name: "Singapore", lat: 1.26, lon: 103.84, type: "Southeast Asia hub", services: "Sea · Air · Warehousing",
                 text: "Transshipment and consolidation centre for intra-Asia and Oceania lanes, with weekly LCL services to 30+ destinations." },
    hongkong:  { name: "Hong Kong", lat: 22.31, lon: 114.17, type: "Partner office", services: "Air · Sea",
                 text: "High-value electronics and e-commerce air freight, with consolidated uplift to Europe and North America." },
    shanghai:  { name: "Shanghai, China", lat: 31.23, lon: 121.47, type: "Partner office", services: "Sea · Customs",
                 text: "Supplier consolidation and purchase-order management for manufacturing customers sourcing from East China." },
    rotterdam: { name: "Rotterdam, Netherlands", lat: 51.92, lon: 4.48, type: "European headquarters", services: "Sea · Road · Customs",
                 text: "Our European base at Europe’s largest port, providing customs brokerage and onward trucking across the EU." },
    frankfurt: { name: "Frankfurt, Germany", lat: 50.03, lon: 8.57, type: "Air cargo gateway", services: "Air · Road",
                 text: "Airside handling partner at FRA for time-critical inbound cargo from Asia and onward road feeder services." },
    newyork:   { name: "New York, USA", lat: 40.67, lon: -74.04, type: "Partner office · Port Newark", services: "Sea · Air · Customs",
                 text: "US East Coast clearance and distribution through our licensed customs broker partner." },
    losangeles:{ name: "Los Angeles, USA", lat: 33.74, lon: -118.27, type: "Partner office", services: "Road · Air · Customs",
                 text: "West Coast distribution and transcontinental trucking connecting both US coasts." },
    durban:    { name: "Durban, South Africa", lat: -29.86, lon: 31.03, type: "Agency partner", services: "Sea · Road",
                 text: "Southern Africa gateway for automotive and industrial cargo, with road links to Johannesburg." },
    sydney:    { name: "Sydney, Australia", lat: -33.87, lon: 151.2, type: "Agency partner", services: "Sea · Customs",
                 text: "Oceania import services with biosecurity-compliant clearance and metropolitan delivery." }
  };

  const ROUTES = [
    ["chennai", "singapore", "ocean"], ["singapore", "shanghai", "ocean"], ["singapore", "hongkong", "ocean"],
    ["chennai", "dubai", "ocean"], ["mumbai", "dubai", "ocean"], ["dubai", "rotterdam", "ocean"],
    ["rotterdam", "newyork", "ocean"], ["singapore", "sydney", "ocean"], ["mumbai", "durban", "ocean"],
    ["chennai", "frankfurt", "air"], ["dubai", "newyork", "air"], ["hongkong", "frankfurt", "air"],
    ["chennai", "hongkong", "air"], ["frankfurt", "newyork", "air"],
    ["rotterdam", "frankfurt", "road"], ["chennai", "mumbai", "road"], ["newyork", "losangeles", "road"]
  ];

  const svg = $("#network-svg");
  const NS = "http://www.w3.org/2000/svg";
  const make = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };

  let selectedHub = "chennai";
  let activeMode = "all";

  if (svg) {
    // graticule
    const grid = $(".map-grid", svg);
    for (let lon = -180; lon <= 180; lon += 30) { const x = project(0, lon)[0]; grid.appendChild(make("line", { x1: x, y1: 0, x2: x, y2: H })); }
    for (let lat = -60; lat <= 90; lat += 30) { const y = project(lat, 0)[1]; grid.appendChild(make("line", { x1: 0, y1: y, x2: W, y2: y })); }

    // routes
    const routeLayer = $(".map-routes", svg);
    const routeEls = ROUTES.map(([a, b, mode]) => {
      const [x1, y1] = project(HUBS[a].lat, HUBS[a].lon);
      const [x2, y2] = project(HUBS[b].lat, HUBS[b].lon);
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 - dist * (mode === "road" ? 0.08 : 0.22);
      const path = make("path", { d: `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`, class: `route route--${mode}` });
      routeLayer.appendChild(path);
      return { a, b, mode, path };
    });

    // hubs
    const hubLayer = $(".map-hubs", svg);
    const hubList = $("#hub-list");
    const hubEls = {};
    Object.entries(HUBS).forEach(([id, hub]) => {
      const [x, y] = project(hub.lat, hub.lon);
      const g = make("g", { class: "hub" + (hub.hq ? " hub--hq" : ""), tabindex: "0", role: "button", "aria-label": `${hub.name} — ${hub.type}`, transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` });
      g.appendChild(make("circle", { class: "hub__pulse", r: hub.hq ? 9 : 6 }));
      g.appendChild(make("circle", { class: "hub__ring", r: 11 }));
      g.appendChild(make("circle", { class: "hub__dot", r: hub.hq ? 5.5 : 4 }));
      const label = make("text", { class: "hub__label", x: 9, y: -8 });
      label.textContent = hub.name.split(",")[0];
      if (["losangeles", "mumbai", "singapore"].includes(id)) { label.setAttribute("x", -9); label.setAttribute("text-anchor", "end"); }
      if (["frankfurt", "singapore", "durban", "mumbai"].includes(id)) label.setAttribute("y", 17);
      g.appendChild(label);
      hubLayer.appendChild(g);
      hubEls[id] = g;

      g.addEventListener("click", () => selectHub(id));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectHub(id); } });

      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button"; btn.textContent = hub.name.split(",")[0]; btn.dataset.hub = id; btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", () => selectHub(id));
      li.appendChild(btn); hubList.appendChild(li);
    });

    function applyState() {
      routeEls.forEach((r) => {
        const modeOk = activeMode === "all" || r.mode === activeMode;
        const touches = r.a === selectedHub || r.b === selectedHub;
        r.path.classList.toggle("is-dim", !modeOk);
        r.path.classList.toggle("is-hot", modeOk && touches);
      });
    }

    function selectHub(id) {
      selectedHub = id;
      const hub = HUBS[id];
      Object.entries(hubEls).forEach(([k, g]) => g.classList.toggle("is-selected", k === id));
      $$("button", hubList).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.hub === id)));
      $("#hub-name").textContent = hub.name;
      $("#hub-type").textContent = hub.type;
      $("#hub-text").textContent = hub.text;
      $("#hub-services").textContent = hub.services;
      $("#hub-lanes").textContent = routeEls.filter((r) => r.a === id || r.b === id).length;
      applyState();
    }

    $$(".network__filters .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        activeMode = chip.dataset.mode;
        $$(".network__filters .chip").forEach((c) => { const on = c === chip; c.classList.toggle("is-active", on); c.setAttribute("aria-pressed", String(on)); });
        applyState();
      });
    });

    selectHub(selectedHub);
    drawLand();
  }

  // Dot-matrix land layer built from Natural Earth (world-atlas) data.
  // If the data or library cannot load, the map still works on the graticule.
  function drawLand() {
    const run = () => {
      if (!window.topojson) return;
      fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json")
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((topo) => {
          const geo = window.topojson.feature(topo, topo.objects.land);
          const features = geo.type === "FeatureCollection" ? geo.features : [geo];
          const S = 0.5; // raster scale
          const canvas = document.createElement("canvas");
          canvas.width = W * S; canvas.height = H * S;
          const ctx = canvas.getContext("2d");
          ctx.beginPath();
          const drawRing = (ring) => ring.forEach(([lon, lat], i) => {
            const [x, y] = project(lat, lon);
            i ? ctx.lineTo(x * S, y * S) : ctx.moveTo(x * S, y * S);
          });
          features.forEach((f) => {
            const g = f.geometry;
            const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
            polys.forEach((poly) => poly.forEach(drawRing));
          });
          ctx.fill("evenodd");
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          const step = 4; // raster px → 8 svg units
          let d = "";
          for (let y = 2; y < canvas.height; y += step) {
            const sy = y / S;
            if (sy < 40 || sy > 380) continue;
            for (let x = 2; x < canvas.width; x += step) {
              if (data[(y * canvas.width + x) * 4 + 3] > 120) d += `M${x / S} ${sy}h0`;
            }
          }
          $(".map-land", svg).appendChild(make("path", { d }));
        })
        .catch(() => { /* graceful fallback: graticule only */ });
    };
    if (document.readyState === "complete") run(); else window.addEventListener("load", run);
  }

  /* ---------------------------------------------------------
     Form validation + submission (contact)
     --------------------------------------------------------- */
  function fieldMessage(f) {
    const v = f.validity;
    if (f.type === "checkbox" && v.valueMissing) return "Please confirm to continue.";
    if (v.valueMissing) return f.tagName === "SELECT" ? "Please choose an option." : "This field is required.";
    if (v.typeMismatch && f.type === "email") return "Enter a valid email address, e.g. name@company.com.";
    if (v.tooShort) return `Please enter at least ${f.minLength} characters.`;
    if (v.patternMismatch && f.type === "tel") return "Enter a valid phone number, including country code.";
    if (v.rangeUnderflow) return `Please enter a value of at least ${f.min}.`;
    if (v.badInput) return "Please enter a valid number.";
    if (v.customError) return f.validationMessage;
    return "";
  }

  function validateField(f) {
    if (f.type === "email" && f.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.value)) f.setCustomValidity("Enter a valid email address, e.g. name@company.com.");
    else if (f.type === "email") f.setCustomValidity("");

    const msg = f.checkValidity() ? "" : fieldMessage(f);
    const err = document.getElementById(f.getAttribute("aria-describedby"));
    if (err) err.textContent = msg;
    if (msg) f.setAttribute("aria-invalid", "true"); else f.removeAttribute("aria-invalid");
    return !msg;
  }

  function buildMailto(form, data) {
    const subject = `Website enquiry: ${data.subject || ""}`;
    const labels = $$("label[for]", form).reduce((acc, l) => {
      const input = document.getElementById(l.htmlFor);
      if (input) acc[input.name] = l.textContent.replace("*", "").trim();
      return acc;
    }, {});
    const body = Object.entries(data)
      .filter(([k, v]) => k !== "consent" && k !== "website" && v)
      .map(([k, v]) => `${labels[k] || k}: ${v}`)
      .join("\n");
    return `mailto:${CONFIG.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  $$("form[data-form]").forEach((form) => {
    const fields = $$("input:not([name=website]), select, textarea", form);
    const status = $(".form__status", form);
    const btn = $("button[type=submit]", form);
    let attempted = false;

    fields.forEach((f) => {
      f.addEventListener("blur", () => { if (f.value || attempted) validateField(f); });
      f.addEventListener(f.type === "checkbox" || f.tagName === "SELECT" ? "change" : "input", () => {
        if (attempted || f.getAttribute("aria-invalid")) validateField(f);
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      attempted = true;
      status.textContent = ""; status.className = "form__status";
      const invalid = fields.filter((f) => !validateField(f));
      if (invalid.length) {
        status.textContent = `Please correct ${invalid.length} highlighted field${invalid.length > 1 ? "s" : ""}.`;
        status.classList.add("is-error");
        invalid[0].focus();
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      if (data.website) { form.reset(); status.textContent = "Thank you — your message has been sent."; status.classList.add("is-success"); return; }
      data.formType = form.dataset.form;

      const endpoint = (CONFIG.formEndpoint || "").trim();
      if (!endpoint) {
        window.location.href = buildMailto(form, data);
        status.textContent = `Your email app should open with your request ready to send. If it doesn’t, please email ${CONFIG.contactEmail}.`;
        status.classList.add("is-success");
        return;
      }

      btn.classList.add("is-loading"); btn.disabled = true;
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        form.reset(); attempted = false;
        status.textContent = "Thank you. Your message has been sent and we’ll be in touch shortly.";
        status.classList.add("is-success");
      } catch (err) {
        status.textContent = `We couldn’t send your request just now. Please try again or email ${CONFIG.contactEmail}.`;
        status.classList.add("is-error");
      } finally {
        btn.classList.remove("is-loading"); btn.disabled = false;
      }
    });
  });

  // "Request a Quote" buttons open the contact form with that topic pre-selected
  const subjectSelect = $("#c-subject");
  const preselectQuote = () => { if (subjectSelect) subjectSelect.value = "Request a quote"; };
  $$('[data-enquiry="quote"]').forEach((a) => a.addEventListener("click", preselectQuote));
  if (new URLSearchParams(window.location.search).get("enquiry") === "quote") preselectQuote();
})();
