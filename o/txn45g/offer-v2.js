(() => {
  // v2 layer: runs after offer.js. Reads the same offer object; never computes a price.
  const byId = (id) => document.getElementById(id);
  const root = document.documentElement;
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STORE = "asg.offer.currency";
  if (!reduced) {
    root.classList.add("is-coach-intro");
    setTimeout(() => root.classList.remove("is-coach-intro"), 700);
  }

  function currentOffer() {
    const offers = window.ASG_OFFERS || {};
    return Object.values(offers).find((o) => o && o.slug === root.dataset.offer) || null;
  }

  function priceList(offer) {
    const list = Array.isArray(offer.prices) ? offer.prices.filter((p) => p && /^[A-Z]{3}$/.test(p.currency) && typeof p.price === "string" && p.price.trim()) : [];
    if (list.length) return list;
    const m = typeof offer.price === "string" && offer.price.match(/([A-Z]{3})$/);
    return [{ currency: m ? m[1] : "", price: offer.price }];
  }

  function paint(el, value) {
    if (!el) return;
    const m = typeof value === "string" && value.match(/^([0-9][0-9,.\u00a0\u202f ]*) ([A-Z]{3})$/);
    if (!m) { el.textContent = value || ""; return; }
    const a = document.createElement("span"); a.className = "price-amount"; a.textContent = m[1];
    const c = document.createElement("span"); c.className = "price-currency"; c.textContent = " " + m[2];
    el.replaceChildren(a, c);
  }

  function setupCurrency(offer) {
    const list = priceList(offer);
    const switches = [...document.querySelectorAll("[data-currency-switch]")];
    const note = byId("commercialCurrencyNote");
    let code = list[0].currency;
    try { const saved = localStorage.getItem(STORE); if (list.some((p) => p.currency === saved)) code = saved; } catch {}

    const apply = (next, animate) => {
      const entry = list.find((p) => p.currency === next) || list[0];
      code = entry.currency;
      const targets = ["priceValue", "commercialPrice"].map(byId);
      const write = () => {
        targets.forEach((el) => paint(el, entry.price));
        byId("dockPrice").textContent = entry.price;
        byId("priceNote").textContent = entry.note || offer.priceNote || "";
        note.textContent = entry.note || "";
        note.hidden = !entry.note;
        targets.forEach((el) => el && el.classList.remove("is-price-swapping"));
      };
      if (animate && !reduced) {
        targets.forEach((el) => el && el.classList.add("is-price-swapping"));
        setTimeout(write, 160);
      } else write();
      switches.forEach((s) => s.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.currency === code))));
    };

    switches.forEach((s) => {
      s.replaceChildren();
      s.hidden = list.length < 2;
      // The first entry is the contract currency — marked on its button and named beside the switch.
      if (!s.parentElement.classList.contains("currency-row")) {
        const row = document.createElement("div");
        row.className = "currency-row";
        s.before(row);
        row.append(s);
        const base = document.createElement("span");
        base.className = "currency-row__base";
        row.append(base);
      }
      const baseLabel = s.parentElement.querySelector(".currency-row__base");
      baseLabel.textContent = "Contract currency · " + list[0].currency;
      baseLabel.hidden = s.hidden;
      list.forEach((p, i) => {
        const b = document.createElement("button");
        b.type = "button"; b.dataset.currency = p.currency; b.textContent = p.currency;
        if (i === 0) { b.classList.add("is-base"); b.title = "Contract currency"; b.setAttribute("aria-label", p.currency + ", contract currency"); }
        b.addEventListener("click", () => {
          try { localStorage.setItem(STORE, p.currency); } catch {}
          apply(p.currency, true);
        });
        s.append(b);
      });
    });
    apply(code, false);
  }

  function setupDelivery(offer) {
    const section = byId("delivery");
    let steps = Array.isArray(offer.deliveryTimeline) ? offer.deliveryTimeline.filter((s) => s && String(s.title || "").trim()) : [];
    // No timeline supplied: the readiness steps become the path, so chapter 05 never needs its own list.
    if (!steps.length && Array.isArray(offer.readiness)) steps = offer.readiness.filter((r) => typeof r === "string" && r.trim()).map((r) => ({ title: r }));
    section.hidden = !steps.length;
    byId("decisionIndex").textContent = steps.length ? "07" : "06";
    if (!steps.length) return;
    byId("deliveryTitle").textContent = offer.deliveryTitle || "From confirmation to handover.";
    byId("deliveryIntro").textContent = offer.deliveryIntro || "";
    const track = byId("deliveryTrack");
    track.style.setProperty("--steps", String(steps.length));
    track.replaceChildren(...steps.map((s, i) => {
      const li = document.createElement("li");
      li.className = "delivery-step";
      li.style.setProperty("--d", Math.round(150 + (i / Math.max(1, steps.length - 1)) * 1200 * 0.92) + "ms");
      const idx = document.createElement("span"); idx.className = "delivery-step__index asg-data"; idx.textContent = String(i + 1).padStart(2, "0");
      const h = document.createElement("h3"); h.textContent = s.title;
      li.append(idx, h);
      if (s.body) { const p = document.createElement("p"); p.textContent = s.body; li.append(p); }
      if (s.duration) { const t = document.createElement("span"); t.className = "delivery-step__time asg-data"; t.textContent = s.duration; li.append(t); }
      return li;
    }));
  }

  function setupMotion() {
    const bar = byId("readProgress");
    let ticking = false;
    const update = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty("--read", max > 0 ? Math.min(1, Math.max(0, scrollY / max)).toFixed(4) : "0");
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener("resize", update);
    update();

    const hero = document.querySelector(".hero");
    const draw = [...document.querySelectorAll(".section__rail")];
    // Long lines wait until their block is on screen, then run on their own so the reader sees them travel.
    const bands = [...document.querySelectorAll(".delivery__track, .commercial__rule, .marque__rule")];
    if (typeof IntersectionObserver !== "function") {
      root.dataset.pastHero = "true";
      draw.forEach((el) => el.classList.add("is-drawn"));
      document.querySelectorAll(".delivery, .commercial--v2, .marque").forEach((el) => el.classList.add("is-drawn"));
      return;
    }
    if (hero) new IntersectionObserver(([e]) => { root.dataset.pastHero = String(!e.isIntersecting); }, { rootMargin: "-120px 0px 0px 0px" }).observe(hero);
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-drawn"); io.unobserve(e.target); }
    }), { threshold: 0.35 });
    draw.forEach((el) => io.observe(el));
    const bandIo = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.closest(".delivery, .commercial--v2, .marque")?.classList.add("is-drawn");
      bandIo.unobserve(e.target);
    }), { rootMargin: "0px 0px -35% 0px" });
    bands.forEach((el) => bandIo.observe(el));
  }

  // A hero title line is atomic: each authored line stays on one row, so a designation
  // never drops its numeral ("Series II" -> "II"). The size steps down until the longest line fits.
  // Transforms from the line-in animation do not affect scrollWidth, so the two never conflict.
  function fitHeroTitle() {
    const h1 = byId("offerTitle");
    if (!h1) return;
    const fit = () => {
      h1.style.fontSize = "";
      const ceiling = parseFloat(getComputedStyle(h1).fontSize);
      const available = h1.clientWidth;
      let widest = 0;
      h1.querySelectorAll("span").forEach((span) => { widest = Math.max(widest, span.scrollWidth); });
      if (!ceiling || !available || !widest || widest <= available) return;
      h1.style.fontSize = Math.max(34, Math.floor(ceiling * (available / widest))) + "px";
    };
    fit();
    addEventListener("resize", fit);
    document.fonts?.ready?.then(fit);
    new MutationObserver(() => requestAnimationFrame(fit)).observe(h1, { childList: true });
  }

  // Live indicative conversion. The contract price (fx.amount in fx.base) never changes;
  // other currencies are recalculated from the site's rates.json, refreshed daily by a workflow.
  // Any failure (offline, timeout, stale or malformed file) keeps the prices published with the offer.
  function liveRates(offer) {
    const fx = offer.fx;
    if (!fx || !Number.isFinite(fx.amount) || !/^[A-Z]{3}$/.test(fx.base || "") || !Array.isArray(fx.show) || typeof fetch !== "function") return Promise.resolve(null);
    const url = typeof fx.ratesUrl === "string" && /^(\/|\.{0,2}\/)?[\w./-]+\.json$/.test(fx.ratesUrl) ? fx.ratesUrl : "/rates.json";
    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = setTimeout(() => ctrl?.abort(), 1500);
    const fmt = (n, code) => Math.round(n).toLocaleString("en-US") + " " + code;
    return fetch(url, { cache: "no-cache", signal: ctrl?.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const r = data && data.rates;
        if (!r || data.base !== "EUR" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date || "")) return null;
        const age = (Date.now() - Date.parse(data.date + "T00:00:00Z")) / 864e5;
        if (!(age >= -1 && age <= 10)) return null;
        const perEur = (c) => (c === "EUR" ? 1 : Number(r[c]));
        const baseRate = perEur(fx.base);
        if (!(baseRate > 0)) return null;
        const date = new Date(data.date + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
        const out = [{ currency: fx.base, price: fmt(fx.amount, fx.base) }];
        fx.show.forEach((c) => {
          const rate = perEur(c) / baseRate;
          if (c === fx.base || !(rate > 0)) return;
          const shown = rate >= 10 ? rate.toFixed(2) : rate.toFixed(4);
          out.push({ currency: c, price: fmt(fx.amount * rate, c), note: "Indicative at the " + (data.source || "reference") + " rate of " + date + ": 1 " + fx.base + " = " + shown + " " + c + ". The contract is settled in " + fx.base + "." });
        });
        return out.length > 1 ? out : null;
      })
      .catch(() => null)
      .finally(() => clearTimeout(timer));
  }

  function init(tries = 0) {
    const offer = window.ASG_OFFER_READY && currentOffer();
    if (!offer) { if (tries < 120) requestAnimationFrame(() => init(tries + 1)); return; }
    fitHeroTitle();
    setupCurrency(offer);
    liveRates(offer).then((prices) => { if (prices) { offer.prices = prices; setupCurrency(offer); } });
    setupDelivery(offer);
    setupMotion();
    setupShimmer();
    setupMarque(offer);
    setupSpecTools(offer);
    setupGallerySource(offer);
    setupLensFacts();
  }

  // Column count follows the number of points: 1·2·3 in one row, 4 as 2×2, more in rows of 3.
  function setupLensFacts() {
    const ul = byId("specExperiencePoints");
    if (!ul) return;
    const sync = () => {
      const n = ul.children.length;
      ul.style.setProperty("--cols", String(n <= 3 ? Math.max(1, n) : n === 4 ? 2 : 3));
    };
    sync();
    new MutationObserver(sync).observe(ul, { childList: true });
  }

  function setupMarque(offer) {
    const band = byId("marque");
    const lines = Array.isArray(offer.titleLines) ? offer.titleLines : [];
    const make = String(offer.marque?.make || lines[0] || "").trim();
    const model = String(offer.marque?.model || lines.slice(1).join(" ") || "").trim();
    band.hidden = !make || offer.marque === false;
    if (band.hidden) return;
    const box = byId("marqueMake");
    const word = document.createElement("span");
    word.textContent = make;
    box.replaceChildren(word);
    byId("marqueModel").textContent = model;
    const fit = () => {
      box.style.fontSize = "100px";
      const w = word.getBoundingClientRect().width;
      if (w > 0) box.style.fontSize = Math.min(320, Math.floor(100 * box.clientWidth / w)) + "px";
    };
    fit();
    addEventListener("resize", fit);
    document.fonts?.ready?.then(fit);
  }

  function setupSpecTools(offer) {
    const tools = byId("specTools");
    const groups = [...document.querySelectorAll("#specGroups .spec-group")];
    const rows = [...document.querySelectorAll("#specGroups .spec-row")];
    const base = typeof offer.mediaBase === "string" && /^[\w./-]+\/$/.test(offer.mediaBase) && !offer.mediaBase.includes("..") ? offer.mediaBase : null;
    // Optional third field on a specification row: a small crop from the source PDF.
    (offer.specifications || []).forEach((group, gi) => {
      const body = byId("spec-group-" + gi);
      if (!body || !base) return;
      const rowEls = body.querySelectorAll(".spec-row");
      (group.items || []).forEach((item, ii) => {
        const file = item && item[2];
        const dt = rowEls[ii]?.querySelector("dt");
        if (!dt || typeof file !== "string" || !/^[\w.-]+\.(?:webp|jpe?g|png)$/i.test(file)) return;
        const img = document.createElement("img");
        img.className = "spec-row__thumb"; img.loading = "lazy"; img.decoding = "async"; img.alt = "";
        img.src = base + file;
        img.addEventListener("error", () => { img.remove(); dt.classList.remove("has-thumb"); });
        dt.classList.add("has-thumb");
        dt.prepend(img);
      });
    });
    tools.hidden = rows.length < 8;
    if (tools.hidden) return;
    rows.forEach((r) => { r.dataset.text = r.textContent.toLowerCase(); });
    const count = byId("specCount");
    const input = byId("specSearch");
    const expand = byId("specExpand");
    const setOpen = (group, open) => {
      const btn = group.querySelector(".spec-group__toggle");
      btn.setAttribute("aria-expanded", String(open));
      byId(btn.getAttribute("aria-controls")).hidden = !open;
    };
    const syncExpand = () => {
      const allOpen = groups.every((g) => g.querySelector(".spec-group__toggle").getAttribute("aria-expanded") === "true");
      expand.textContent = allOpen ? "Collapse all" : "Expand all";
    };
    const filter = () => {
      const q = input.value.trim().toLowerCase();
      let shown = 0;
      groups.forEach((g) => {
        let hits = 0;
        g.querySelectorAll(".spec-row").forEach((r) => {
          const hit = !q || r.dataset.text.includes(q);
          r.classList.toggle("is-filtered-out", !hit);
          if (hit) hits++;
        });
        g.classList.toggle("is-filtered-out", q && !hits);
        if (q) setOpen(g, hits > 0);
        shown += hits;
      });
      count.textContent = q ? shown + " of " + rows.length + " items" : rows.length + " items";
      syncExpand();
    };
    input.addEventListener("input", filter);
    expand.addEventListener("click", () => {
      const open = expand.textContent === "Expand all";
      groups.forEach((g) => { if (!g.classList.contains("is-filtered-out")) setOpen(g, open); });
      syncExpand();
    });
    document.querySelector("#specGroups").addEventListener("click", (e) => { if (e.target.closest(".spec-group__toggle")) requestAnimationFrame(syncExpand); });
    filter();
  }

  // Optional fourth gallery field: "configuration" marks a manufacturer visual on the frame itself.
  function setupGallerySource(offer) {
    const grid = byId("galleryGrid");
    const decorate = () => grid.querySelectorAll(".gallery-card").forEach((card) => {
      if (card.querySelector(".gallery-card__source")) return;
      const n = Number(card.querySelector(".gallery-card__caption b")?.textContent) - 1;
      if (offer.gallery?.[n]?.[3] !== "configuration") return;
      const tag = document.createElement("span");
      tag.className = "gallery-card__source";
      tag.textContent = "Manufacturer configuration visual";
      card.append(tag);
    });
    decorate();
    new MutationObserver(decorate).observe(grid, { childList: true });
  }

  // offer.js runs the Explore shimmer as an endless loop; v2 plays one sweep per appearance and on hover.
  function setupShimmer() {
    const link = byId("exploreLink");
    if (!link) return;
    // Phones and tablets (no hover, coarse pointer or narrow screen) keep the original continuous loop.
    const loopQuery = typeof matchMedia === "function" ? matchMedia("(hover: none), (pointer: coarse), (max-width: 980px)") : null;
    const isLoop = () => !loopQuery || loopQuery.matches;
    // offer.js may replace the label; a finished one-shot drops out of getAnimations(),
    // so keep a reference per label and only look it up while it is still live.
    const refs = new WeakMap();
    const current = () => {
      const label = link.querySelector(".explore-label");
      if (!label) return null;
      if (!refs.has(label)) { const live = label.getAnimations?.()[0]; if (live) refs.set(label, live); }
      return refs.get(label) || null;
    };
    const applyMode = () => {
      const anim = current();
      if (!anim) return;
      const loop = isLoop();
      const t = anim.effect.getTiming();
      if (loop && t.iterations !== Infinity) anim.effect.updateTiming({ iterations: Infinity, duration: 2500 });
      if (!loop && t.iterations !== 1) anim.effect.updateTiming({ iterations: 1, duration: 1600 });
      if (loop && anim.playState === "finished") { anim.currentTime = 0; anim.play(); }
    };
    applyMode();
    loopQuery?.addEventListener?.("change", applyMode);
    new MutationObserver(() => requestAnimationFrame(applyMode)).observe(link, { childList: true, subtree: true });
    const replay = () => { const anim = current(); if (anim && !isLoop()) { anim.currentTime = 0; anim.play(); } };
    link.addEventListener("mouseenter", replay);
    link.addEventListener("focus", replay);
  }

  if (byId("offerTitle")) init();
})();
