(() => {
  // Shared header/footer behavior also works on staff-only pages, without offer data.
  setupBrandInteractions();
  if (!document.getElementById("requestForm") || !document.getElementById("offerTitle")) return;
  const offers = window.ASG_OFFERS;
  const state = {
    key: null,
    filter: "All",
    gallery: [],
    lightboxIndex: 0,
    chapterIndex: 0,
    enquiryBusy: false,
    enquiryFingerprint: null,
    idempotencyKey: null,
    lightboxTrigger: null,
    requestTrigger: null,
    enquiryContext: null,
    enquiryEpoch: 0
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const byId = (id) => document.getElementById(id);
  const setText = (id, value) => { byId(id).textContent = value ?? ""; };
  const COPY = Object.freeze({ specialOfferFor: "Prepared especially for", signature: "Your consultant" });
  let exploreMotionCleanup;
  let exploreMotionPaused = false;

  function renderExploreLabel(label) {
    const link = byId("exploreLink");
    exploreMotionCleanup?.();
    const text = document.createElement("span");
    text.className = "explore-label";
    text.textContent = label;
    link.replaceChildren(text);
    // The pause control was removed from the footer; the shimmer still respects
    // reduced motion, forced colours, tab visibility and the viewport.
    const control = byId("exploreMotionToggle") || document.createElement("button");
    control.hidden = true;
    // F03: a real repeating 2.5s animation, with an independent lasting user
    // pause. No desktop hover trigger and no viewport/layout measurement.
    if (typeof window.matchMedia !== "function" ||
        typeof window.IntersectionObserver !== "function" ||
        typeof text.animate !== "function" ||
        !window.CSS?.supports?.("background-clip", "text") ||
        !window.CSS.supports("-webkit-text-fill-color", "transparent")) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const forced = window.matchMedia("(forced-colors: active)");
    // 1000ms sweeps; 1500ms rests on base-white letters. pause()/play()
    // retain the animation clock, avoiding a restart flash on visibility changes.
    const animation = text.animate([
      { backgroundPosition: "100% 0", offset: 0 },
      { backgroundPosition: "0% 0", offset: .4 },
      { backgroundPosition: "0% 0", offset: 1 }
    ], { duration: 2500, iterations: Infinity, easing: "linear" });
    animation.pause();
    let inView = false;
    const sync = () => {
      const effectsAllowed = !reduced.matches && !forced.matches;
      const running = effectsAllowed && !exploreMotionPaused && inView && document.visibilityState === "visible";
      text.classList.toggle("is-shimmer-loop", effectsAllowed);
      text.dataset.motionState = running ? "running" : "paused";
      control.hidden = !effectsAllowed;
      control.textContent = exploreMotionPaused ? "Resume animation" : "Pause animation";
      control.setAttribute("aria-label", (exploreMotionPaused ? "Resume" : "Pause") + " animation of Explore text");
      if (running) { if (animation.playState !== "running") animation.play(); }
      else if (animation.playState !== "paused") animation.pause();
    };
    const toggle = () => { exploreMotionPaused = !exploreMotionPaused; sync(); };
    const observer = new window.IntersectionObserver(entries => {
      for (const entry of entries) if (entry.target === link) inView = entry.isIntersecting && entry.intersectionRatio > 0;
      sync();
    }, { threshold: 0 });
    document.addEventListener("visibilitychange", sync);
    [reduced, forced].forEach(query => query.addEventListener?.("change", sync));
    control.addEventListener("click", toggle);
    sync();
    observer.observe(link);
    exploreMotionCleanup = () => {
      animation.cancel();
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      [reduced, forced].forEach(query => query.removeEventListener?.("change", sync));
      control.removeEventListener("click", toggle);
    };
  }

  function setupBrandInteractions() {
    const header = document.querySelector(".topbar__brand");
    const footer = document.querySelector(".footer__brand");
    const root = document.documentElement;
    const matches = (query) => typeof window.matchMedia === "function" && window.matchMedia(query).matches;
    let lastPointer = matches("(hover: none)") ? "touch" : "mouse";
    let pulseTimer, cycle = 0;
    const setPointer = (type) => {
      lastPointer = type;
      root.dataset.brandPointer = type;
      if (header) {
        if (type === "touch" || type === "pen") header.setAttribute("role", "button");
        else header.removeAttribute("role");
      }
    };
    setPointer(lastPointer);
    const pulse = () => {
      if (!header) return;
      window.clearTimeout(pulseTimer);
      header.dataset.signalCycle = String(++cycle % 2);
      header.classList.add("is-signal-pulsing");
      pulseTimer = window.setTimeout(() => header.classList.remove("is-signal-pulsing"), 800);
    };
    [header, footer].filter(Boolean).forEach((brand) => {
      brand.addEventListener("pointerdown", (event) => setPointer(event.pointerType || "mouse"));
      brand.addEventListener("pointerover", (event) => {
        if (event.pointerType === "mouse") setPointer("mouse");
      });
    });
    header?.addEventListener("click", (event) => {
      const pointer = event.pointerType || lastPointer;
      if (pointer === "touch" || pointer === "pen" || (event.detail === 0 && matches("(hover: none)"))) {
        event.preventDefault();
        setPointer(pointer === "pen" ? "pen" : "touch");
        pulse();
      }
    });
    header?.addEventListener("keydown", (event) => {
      if (event.key === " " && header.getAttribute("role") === "button") {
        event.preventDefault();
        pulse();
      }
    });
    footer?.addEventListener("click", (event) => {
      event.preventDefault();
      if (event.pointerType) setPointer(event.pointerType);
      window.scrollTo({ top: 0, behavior: matches("(prefers-reduced-motion: reduce)") ? "instant" : "smooth" });
      // Keyboard users return to a meaningful focus target; touch keeps no glow.
      if (event.detail === 0) header?.focus({ preventScroll: true });
    });
  }

  // Escape only at HTML interpolation boundaries. DOM textContent receives raw values.
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

  function localAsset(value) {
    if (typeof value !== "string" || !value || /[\\\\?#\u0000-\u0020]/.test(value) ||
        /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(value)) throw new Error("INVALID_LOCAL_ASSET");
    let decoded;
    try { decoded = decodeURIComponent(value); } catch { throw new Error("INVALID_LOCAL_ASSET"); }
    if (decoded.split("/").some((part) => part === "." || part === "..") ||
        /[\\\\?#\u0000-\u0020]/.test(decoded) || decoded.includes(":")) throw new Error("INVALID_LOCAL_ASSET");
    return value;
  }

  function mediaBase(offer) {
    const base = localAsset(offer.mediaBase);
    if (!base.endsWith("/")) throw new Error("INVALID_MEDIA_BASE");
    return base;
  }

  function offerStatuses(offer) {
    return [["Offer", offer.commercialStatus], ["Availability", offer.availabilityStatus], ["Location", offer.locationStatus]]
      .filter(([, value]) => value != null && String(value).trim().length > 0);
  }

  function assetOrNull(value) {
    if (!value) return null;
    try {
      const path = localAsset(value);
      const embedded = window.ASG_INTERNAL_PREVIEW_ASSETS;
      if (embedded) {
        // Internal self-contained preview only. No arbitrary remote/data URL is
        // accepted from vehicle content; the server builds an admitted map.
        const bytes = Object.hasOwn(embedded, path) ? embedded[path] : null;
        return typeof bytes === "string" && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(bytes) ? bytes : null;
      }
      const resources = window.ASG_CLIENT_RESOURCES;
      if (resources) {
        const resource = Object.hasOwn(resources, path) ? resources[path] : null;
        const inquiryPath = window.ASG_CLIENT_DELIVERY?.inquiryPath;
        const prefix = typeof inquiryPath === "string" && /^\/api\/delivery-v2\/client\/[A-Za-z0-9_-]{43}\/inquiries$/.test(inquiryPath)
          ? inquiryPath.slice(0, -"inquiries".length) + "resources/" : null;
        return prefix && typeof resource === "string" && resource.startsWith(prefix) && /^[a-f0-9]{64}$/.test(resource.slice(prefix.length)) ? resource : null;
      }
      return path;
    } catch { return null; }
  }

  function chapterAsset(offer, file) {
    if (!file) return null;
    try { return assetOrNull(mediaBase(offer) + file); } catch { return null; }
  }

  // Gallery cards load a lighter file from thumbBase when the build produced one
  // for every gallery entry; the lightbox always uses the full frame.
  function thumbAsset(offer, file) {
    if (!file || !offer.thumbBase) return null;
    try {
      const base = localAsset(offer.thumbBase);
      if (!base.endsWith("/")) return null;
      return assetOrNull(base + file);
    } catch { return null; }
  }

  // Image failure affects only that visual, never the offer's facts or readiness.
  function setImage(image, src, alt) {
    image.hidden = !src;
    image.alt = alt || "";
    if (src) image.src = src;
    else image.removeAttribute("src");
  }

  function renderPresentation() {
    const presentation = window.ASG_PRESENTATION;
    const recipient = presentation?.recipient;
    const name = ["person", "family", "company"].includes(recipient?.kind)
      && typeof recipient.displayName === "string" ? recipient.displayName.trim() : "";
    setText("personalOffer", name ? COPY.specialOfferFor + " " + name : "");
    byId("personalOffer").hidden = !name;
    if (name) {
      const label = document.createElement("span");
      label.className = "personal-offer__label";
      label.textContent = COPY.specialOfferFor + " ";
      const displayName = document.createElement("strong");
      displayName.className = "personal-offer__name";
      displayName.textContent = name;
      byId("personalOffer").replaceChildren(label, displayName);
    }
    byId("personalIntro").dataset.recipientKind = recipient?.kind || "none";
    byId("personalIntro").classList.toggle("has-long-name", name.length > 48);
    const message = typeof presentation?.message === "string" ? presentation.message.trim() : "";
    setText("personalMessage", message);
    byId("personalMessage").hidden = !message;
    // A message alone is not a structured personalized recipient.
    byId("personalIntro").hidden = !name;
    const signature = typeof presentation?.signature?.displayName === "string"
      ? presentation.signature.displayName.trim() : "";
    setText("presentationSignature", signature ? COPY.signature + ": " + signature : "");
    byId("presentationSignature").hidden = !signature;
    byId("presentationSignatureBlock").hidden = !message && !signature;
    syncEnquiryRecipient();
  }

  function syncEnquiryRecipient() {
    const presentation = window.ASG_PRESENTATION;
    const recipient = presentation?.recipient;
    const context = JSON.stringify([state.key, presentation?.offerId, presentation?.presentationId,
      presentation?.presentationRevisionId, recipient?.kind, recipient?.displayName, recipient?.contactPersonName]);
    if (context === state.enquiryContext) return;
    const firstInitialization = state.enquiryContext === null;
    state.enquiryContext = context;
    state.enquiryEpoch += 1;
    state.enquiryFingerprint = null;
    state.idempotencyKey = null;
    state.enquiryBusy = false;
    // Never carry a previous person's contact or question into another presentation.
    if (!firstInitialization) {
      ["name", "contactChannel", "contact", "destination", "requestedVehicleText", "message"].forEach((key) => { form.elements[key].value = ""; });
      form.elements.topic.value = "THIS_VEHICLE";
    }
    const structuredName = recipient?.kind === "person" ? recipient.displayName
      : ["family", "company"].includes(recipient?.kind) ? recipient.contactPersonName : "";
    const name = typeof structuredName === "string" ? structuredName.trim() : "";
    // No greeting parsing and no truncation of a long recipient into a different person.
    if (!firstInitialization || !form.elements.name.value) form.elements.name.value = name;
    ["name", "contactChannel", "contact", "destination", "topic", "requestedVehicleText", "message"].forEach((key) => { form.elements[key].disabled = false; });
    byId("enquirySubmit").disabled = false;
    form.setAttribute("aria-busy", "false");
    fieldError(form.elements.name, "nameError", "");
    fieldError(form.elements.contactChannel, "channelError", "");
    updateContactMode();
    updateTopic();
  }

  function resolveKey() {
    const search = new URLSearchParams(location.search);
    if (search.has("offer")) return search.get("offer");
    const keys = Object.keys(offers || {});
    return keys.length === 1 ? keys[0] : null;
  }

  function showFailure(error) {
    exploreMotionCleanup?.();
    byId("exploreMotionToggle")?.removeAttribute("hidden");
    window.ASG_OFFER_READY = false;
    window.ASG_PRINT_READY = false;
    window.ASG_OFFER_ERROR = error.message || "OFFER_UNAVAILABLE";
    document.title = "ASG — Offer unavailable";
    byId("personalIntro").hidden = true;
    const main = byId("main");
    main.replaceChildren();
    const section = document.createElement("section");
    section.className = "offer-unavailable";
    const title = document.createElement("h1");
    title.textContent = "This offer cannot be opened.";
    const body = document.createElement("p");
    body.textContent = "Please ask your ASG advisor for the current offer link.";
    section.append(title, body);
    main.append(section);
    $$('[data-request-trigger]').forEach((button) => { button.disabled = true; });
    byId("requestPanel").close();
  }

  function renderFacts(offer) {
    byId("factGrid").innerHTML = offer.facts.map(([label, value], index) => `
      <article class="fact" data-fact-kind="${/powertrain/i.test(label) ? "powertrain" : /power/i.test(label) ? "power" : /drive/i.test(label) ? "drive" : "other"}">
        <span>${String(index + 1).padStart(2, "0")} / ${escapeHTML(label)}</span>
        <strong>${escapeHTML(value)}</strong>
      </article>`).join("");
  }

  function renderHighlights(offer) {
    if (offer.signatureDecisions?.length) {
      byId("highlightGrid").innerHTML = offer.signatureDecisions.map((decision, index) => `
        <article class="highlight highlight--editorial">
          <span>${String(index + 1).padStart(2, "0")} / ${escapeHTML(decision.label)}</span>
          <strong>${escapeHTML(decision.title)}</strong>
          <p>${escapeHTML(decision.body)}</p>
        </article>`).join("");
      return;
    }
    byId("highlightGrid").innerHTML = offer.highlights.map(([label, value], index) => `
      <article class="highlight">
        <span>${String(index + 1).padStart(2, "0")} / ${escapeHTML(label)}</span>
        <strong>${escapeHTML(value)}</strong>
      </article>`).join("");
  }

  function renderSpecification(offer) {
    // Optional, role-safe editorial input. Do not infer benefits from factory codes.
    const highlights = Array.isArray(offer.specificationHighlights) ? offer.specificationHighlights : [];
    const groups = ["Driving", "Visual", "Cabin"].map((group) => ({
      group,
      items: highlights.filter((item) => item && item.group === group
        && typeof item.title === "string" && item.title.trim()
        && typeof item.meaning === "string" && item.meaning.trim())
    })).filter((group) => group.items.length);
    const summary = byId("specificationHighlights");
    summary.hidden = !groups.length;
    summary.innerHTML = groups.map(({ group, items }) => `
      <section class="specification-highlights__group">
        <h3>${escapeHTML(group)}</h3>
        <dl>${items.map((item) => `<div><dt>${escapeHTML(item.title)}</dt><dd>${escapeHTML(item.meaning)}</dd></div>`).join("")}</dl>
      </section>`).join("");
    byId("specGroups").innerHTML = offer.specifications.map((group, groupIndex) => {
      const expanded = false;
      return `
        <section class="spec-group">
          <button class="spec-group__toggle" type="button" aria-expanded="${expanded}" aria-controls="spec-group-${groupIndex}">
            <span>${String(groupIndex + 1).padStart(2, "0")}</span>
            <strong>${escapeHTML(group.group)}</strong>
            <i aria-hidden="true"></i>
          </button>
          <dl class="spec-group__body" id="spec-group-${groupIndex}"${expanded ? "" : " hidden"}>
            ${group.items.map(([term, description]) => `<div class="spec-row"><dt>${escapeHTML(term)}</dt><dd>${escapeHTML(description)}</dd></div>`).join("")}
          </dl>
        </section>`;
    }).join("");

    $$(".spec-group__toggle").forEach((button) => {
      button.addEventListener("click", () => {
        const expanded = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!expanded));
        byId(button.getAttribute("aria-controls")).hidden = expanded;
      });
    });
  }

  function renderExperience(offer) {
    const chapters = offer.experienceChapters || [];
    $(".spec-experience").hidden = !chapters.length;
    $(".specification__head").hidden = !chapters.length;
    if (!chapters.length) return;
    const nav = byId("specExperienceNav");
    const picker = byId("specExperienceNumbers");
    picker.replaceChildren();
    chapters.forEach((chapter, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "spec-experience__number";
      option.id = "chapter-number-" + index;
      option.textContent = String(index + 1).padStart(2, "0");
      option.setAttribute("role", "tab");
      option.setAttribute("aria-controls", "specExperiencePanel");
      option.setAttribute("aria-label", option.textContent + " · " + chapter.title);
      option.addEventListener("click", () => selectChapter(offer, index));
      option.addEventListener("keydown", event => {
        let next = index;
        if (event.key === "ArrowRight") next = (index + 1) % chapters.length;
        else if (event.key === "ArrowLeft") next = (index - 1 + chapters.length) % chapters.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = chapters.length - 1;
        else return;
        event.preventDefault();
        selectChapter(offer, next);
        picker.children[next].focus();
      });
      picker.append(option);
    });
    if (!picker.dataset.wired) {
      picker.dataset.wired = "true";
      [["specExperiencePrev", -1], ["specExperienceNext", 1], ["specExperiencePrevBottom", -1], ["specExperienceNextBottom", 1]].forEach(([id, step]) => {
        byId(id).addEventListener("click", () => {
          const currentOffer = offers[state.key];
          const length = currentOffer?.experienceChapters?.length || 0;
          if (length < 2) return;
          selectChapter(currentOffer, (state.chapterIndex + step + length) % length);
          // Bottom controls return the reader to the new chapter, not its old footer.
          if (id.endsWith("Bottom")) byId("specExperienceMobileHeading").focus();
        });
      });
    }
    nav.setAttribute("role", "tablist");
    nav.setAttribute("aria-label", "Configuration topics");
    nav.dataset.count = String(chapters.length);
    nav.replaceChildren();
    chapters.forEach((chapter, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "spec-experience__tab";
      button.id = "chapter-tab-" + index;
      button.dataset.chapterIndex = String(index);
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", "specExperiencePanel");
      const number = document.createElement("span");
      number.textContent = String(index + 1).padStart(2, "0");
      number.setAttribute("aria-hidden", "true");
      const title = document.createElement("b");
      title.textContent = chapter.title;
      button.append(number, title);
      button.addEventListener("click", () => selectChapter(offer, index));
      button.addEventListener("keydown", (event) => {
        let next = index;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % chapters.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + chapters.length) % chapters.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = chapters.length - 1;
        else return;
        event.preventDefault();
        selectChapter(offer, next);
        nav.children[next].focus();
      });
      nav.append(button);
    });
    selectChapter(offer, Math.min(state.chapterIndex, chapters.length - 1));
  }

  function selectChapter(offer, index) {
    const chapters = offer.experienceChapters || [];
    const chapter = chapters[index];
    if (!chapter) return;
    state.chapterIndex = index;
    setText("specExperienceMobileTitle", chapter.title);
    setText("specExperienceMobileCount", String(index + 1).padStart(2, "0") + " / " + String(chapters.length).padStart(2, "0"));
    setText("specExperienceStatus", "Chapter " + (index + 1) + " of " + chapters.length + ": " + chapter.title);
    [...byId("specExperienceNumbers").children].forEach((button, itemIndex) => {
      const selected = itemIndex === index;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    for (const id of ["specExperiencePrev", "specExperienceNext", "specExperiencePrevBottom", "specExperienceNextBottom"]) byId(id).disabled = chapters.length < 2;
    $$(".spec-experience__tab").forEach((button, itemIndex) => {
      const selected = itemIndex === index;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    // The reading heading is visible in both responsive modes. Do not label
    // the shared panel only through a desktop tab hidden on mobile.
    byId("specExperiencePanel").setAttribute("aria-labelledby", "specExperienceReading");
    setText("specExperienceIndex", String(index + 1).padStart(2, "0") + " / " + String(chapters.length).padStart(2, "0"));
    setText("specExperienceEyebrow", chapter.eyebrow);
    setText("specExperienceReading", chapter.clientReading || chapter.title);
    setText("specExperienceSummary", chapter.summary);
    byId("specExperiencePoints").innerHTML = (chapter.points || []).map((point) => "<li>" + escapeHTML(point) + "</li>").join("");
    const src = chapterAsset(offer, chapter.image);
    const visuals = $(".spec-experience__visuals");
    visuals.hidden = !src;
    byId("specExperiencePanel").classList.toggle("has-no-visual", !src);
    const image = byId("specExperienceImage");
    byId("specExperiencePanel").dataset.imageOrientation = "pending";
    setImage(image, src, offer.title + ": " + (chapter.caption || chapter.title));
    if (src && image.complete) setLensAspect(image);
    setText("specExperienceCaption", chapter.caption);
  }

  function setLensAspect(image) {
    if (image.hidden || !(image.naturalWidth > 0 && image.naturalHeight > 0)) return;
    const ratio = image.naturalWidth / image.naturalHeight;
    const panel = byId("specExperiencePanel");
    panel.dataset.imageOrientation = ratio < .9 ? "portrait" : ratio > 2.1 ? "wide" : "landscape";
    // The natural image height is retained; no fixed contain slot or crop.
    panel.style.setProperty("--lens-aspect", String(ratio));
  }

  function setActionLabel(button, label) {
    const text = document.createElement("span");
    text.textContent = label;
    const arrow = document.createElement("span");
    arrow.className = "button__arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";
    button.replaceChildren(text, arrow);
  }

  function renderPrice(id, value) {
    // Formatting only: arithmetic/rounding and approval remain upstream.
    // Split an admitted trailing ISO currency; never guess a locale or amount.
    setText(id, value);
    const match = typeof value === "string" && value.match(/^([0-9][0-9,.\u00a0\u202f ]*) ([A-Z]{3})$/);
    if (!match) return;
    const amount = document.createElement("span");
    amount.className = "price-amount";
    amount.textContent = match[1];
    const currency = document.createElement("span");
    currency.className = "price-currency";
    currency.textContent = " " + match[2];
    byId(id).replaceChildren(amount, currency);
  }

  function renderSpecPrototype(offer) {
    const prototype = offer.specificationPrototype;
    const root = byId("specPrototype");
    if (!prototype?.clusters?.length) {
      root.hidden = true;
      root.innerHTML = "";
      return;
    }

    root.hidden = false;
    root.innerHTML = `
      <header class="spec-prototype__head">
        <p class="eyebrow eyebrow--light">${escapeHTML(prototype.eyebrow)}</p>
        <h3 id="specPrototypeTitle">${escapeHTML(prototype.title)}</h3>
        <p>${escapeHTML(prototype.intro)}</p>
      </header>
      <div class="spec-prototype__grid">
        ${prototype.clusters.map((cluster, index) => `
          <article class="spec-cluster spec-cluster--${index + 1}">
            <figure>
              ${chapterAsset(offer, cluster.image) ? `<img class="asg-photo" src="${escapeHTML(chapterAsset(offer, cluster.image))}" alt="${escapeHTML(offer.title)}: ${escapeHTML(cluster.caption)}" loading="lazy" decoding="async">` : `<p class="image-unavailable">No image is available for this detail.</p>`}
              <figcaption>${escapeHTML(cluster.caption)}</figcaption>
            </figure>
            <div class="spec-cluster__copy">
              <span>${String(index + 1).padStart(2, "0")} / ${escapeHTML(cluster.label)}</span>
              <h4>${escapeHTML(cluster.title)}</h4>
              <p>${escapeHTML(cluster.reading)}</p>
              <dl>${cluster.items.map(([term, value]) => `<div><dt>${escapeHTML(term)}</dt><dd>${escapeHTML(value)}</dd></div>`).join("")}</dl>
            </div>
          </article>`).join("")}
      </div>`;
  }

  function buildFilters(offer) {
    const categories = ["All", ...new Set(offer.gallery.map((item) => item[1]))];
    const root = byId("galleryFilters");
    root.replaceChildren();
    categories.forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gallery__filter";
      button.dataset.filter = category;
      button.textContent = category;
      button.setAttribute("aria-pressed", String(category === state.filter));
      button.addEventListener("click", () => {
        state.filter = category;
        renderGallery(offer);
      });
      root.append(button);
    });
  }

  function renderGallery(offer) {
    state.gallery = offer.gallery.map((item, sourceIndex) => ({ item, sourceIndex }))
      .filter(({ item }) => state.filter === "All" || item[1] === state.filter);
    $$(".gallery__filter").forEach((button) => {
      const selected = button.dataset.filter === state.filter;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("is-active", selected);
    });
    byId("galleryGrid").innerHTML = state.gallery.map(({ item, sourceIndex }, index) => {
      const [file, category, caption] = item;
      const full = chapterAsset(offer, file);
      const src = full ? (thumbAsset(offer, file) || full) : null;
      const fullCaption = String(caption || category || "Vehicle detail");
      const shortCaption = fullCaption.length > 72 ? fullCaption.slice(0, 69).trimEnd() + "…" : fullCaption;
      return `
        <button class="gallery-card" type="button" data-gallery-index="${index}" aria-label="Open image ${sourceIndex + 1}: ${escapeHTML(fullCaption)}">
          <span class="gallery-card__visual">${src ? `<img class="asg-photo" src="${escapeHTML(src)}" alt="${escapeHTML(offer.title)}: ${escapeHTML(fullCaption)}" loading="lazy" decoding="async">` : '<span class="image-unavailable">This image is unavailable.</span>'}</span>
          <span class="gallery-card__caption"><b>${String(sourceIndex + 1).padStart(2, "0")}</b><span>${escapeHTML(shortCaption)}</span></span>
        </button>`;
    }).join("");
    setText("visibleCount", String(state.gallery.length));
    setText("totalCount", String(offer.gallery.length));
    $(".gallery__count").setAttribute("aria-label", state.gallery.length + " of " + offer.gallery.length + " photographs shown");
    byId("galleryGrid").dataset.count = String(state.gallery.length);
    byId("galleryEmpty").hidden = Boolean(offer.gallery.length);
    $(".gallery__toolbar").hidden = !offer.gallery.length;
    $$(".gallery-card").forEach((card) => {
      card.addEventListener("click", () => openLightbox(Number(card.dataset.galleryIndex), card));
      const image = $("img", card);
      if (image) {
        image.addEventListener("load", () => setGalleryAspect(image, card));
        if (image.complete) setGalleryAspect(image, card);
      }
    });
  }

  function setGalleryAspect(image, card) {
    if (!(image.naturalWidth > 0 && image.naturalHeight > 0)) return;
    const ratio = image.naturalWidth / image.naturalHeight;
    card.dataset.orientation = ratio < .9 ? "portrait" : ratio > 1.15 ? "landscape" : "square";
    card.style.setProperty("--image-aspect", String(ratio));
    card.style.setProperty("--gallery-weight", String(Math.max(.6, Math.min(2, ratio))));
  }

  async function renderOffer(key, updateUrl = true) {
    window.ASG_OFFER_READY = false;
    window.ASG_PRINT_READY = false;
    if (!key || !Object.prototype.hasOwnProperty.call(offers || {}, key)) throw new Error("UNKNOWN_OFFER");
    const offer = offers[key];
    if (!Array.isArray(offer.gallery)) throw new Error("INVALID_GALLERY");
    state.key = key;
    state.filter = "All";
    state.chapterIndex = 0;
    document.documentElement.dataset.offer = offer.slug;
    document.documentElement.dataset.evidenceMode = offer.evidenceMode;
    document.documentElement.dataset.reviewMode = "client";
    document.documentElement.dataset.mediaGrade = offer.mediaGrade || "css";
    document.title = window.ASG_CLIENT_RESOURCES ? "ASG Private Offer" : `ASG Private Offer — ${offer.title}`;

    renderPresentation();
    setText("modelDataNote", offer.uiCopy?.modelDataNote);
    byId("modelDataNote").hidden = !offer.uiCopy?.modelDataNote;
    setText("chapterModelDataNote", offer.uiCopy?.modelDataNote);
    byId("chapterModelDataNote").hidden = !offer.uiCopy?.modelDataNote;
    setText("serviceEyebrow", offer.asgService?.eyebrow || "ASG PRIVATE CLIENT SERVICE");
    setText("decisionTitle", offer.asgService?.title || "Contact the ASG team.");
    setText("serviceBody", offer.asgService?.body || "Discuss this vehicle, your destination or another car you have in mind.");
    setText("serviceAlternativeTitle", offer.asgService?.alternativeTitle);
    setText("serviceAlternativeBody", offer.asgService?.alternativeBody);
    byId("serviceAlternative").hidden = !offer.asgService?.alternativeBody;
    $$('[data-request-trigger]').filter((button) => !button.classList.contains("topbar__contact"))
      .forEach((button) => setActionLabel(button, offer.uiCopy?.primaryCta || "Contact the ASG team"));
    renderExploreLabel(offer.uiCopy?.galleryLink || "Explore the configuration");
    byId("exploreLink").href = offer.uiCopy?.galleryLink ? "#gallery" : "#specification";
    setText("requestPanelTitle", offer.uiCopy?.enquiry?.title || "Speak with ASG");
    setText("enquiryIntro", offer.uiCopy?.enquiry?.intro || "Tell us how to reach you. The ASG team can help with this vehicle, delivery arrangements or another search.");
    // This heading introduces selective Lens chapters, not the full list below.
    setText("specTitle", "Explore the configuration.");
    const mediaLabel = !offer.gallery.length ? "Vehicle details"
      : offer.evidenceMode === "actual" ? (offer.uiCopy?.mediaLabel || "Vehicle photography")
      : "Manufacturer configuration visuals — not actual vehicle photographs";
    $("#heroEvidence span").textContent = mediaLabel;
    // Source classification stays in Overview and image alt text, not the sales headline.
    byId("heroEvidence").hidden = true;
    setText("heroEyebrow", offer.commercialStatus || "Private offer");
    byId("heroEyebrow").hidden = true;
    byId("offerTitle").innerHTML = offer.titleLines.map((line) => `<span>${escapeHTML(line)}</span>`).join("");
    setText("offerSubtitle", offer.subtitle);
    setText("priceLabel", offer.priceLabel);
    renderPrice("priceValue", offer.price);
    setText("priceNote", offer.priceNote);
    setText("commercialPriceLabel", offer.priceLabel);
    renderPrice("commercialPrice", offer.price);
    setText("commercialNote", offer.priceNote);
    const hero = byId("heroImage");
    const heroSrc = assetOrNull(offer.hero);
    setImage(hero, heroSrc, offer.evidenceMode === "actual"
      ? "Photograph of " + offer.title
      : offer.title + " manufacturer configuration visual, not an actual vehicle photograph");
    byId("heroNoVisual").hidden = Boolean(heroSrc);
    $(".hero").classList.toggle("hero--no-image", !heroSrc);
    if (!heroSrc) setText("heroNoVisual", offer.gallery.length ? "The main image is unavailable. Explore the gallery below." : "No vehicle images are available in this offer.");
    const position = (value) => typeof value === "string" && /^(?:(?:left|right|top|bottom|center|\d+(?:\.\d+)?%)\s*){1,2}$/.test(value) ? value : "center";
    hero.style.setProperty("--hero-position", position(offer.heroPosition));
    hero.style.setProperty("--hero-mobile-position", position(offer.heroMobilePosition || offer.heroPosition));

    $("#evidenceBannerChip span").textContent = mediaLabel;
    // Actual photography remains explained by image alt text/gallery/disclosure.
    // Configuration and no-media disclosures must remain visible.
    byId("evidenceBannerChip").hidden = offer.evidenceMode === "actual" && offer.gallery.length > 0;
    setText("evidenceBannerTitle", offer.evidenceTitle);
    setText("evidenceBannerBody", offer.evidenceBody);
    const statuses = offerStatuses(offer);
    byId("evidenceProof").hidden = !statuses.length;
    byId("evidenceProof").style.setProperty("--status-count", statuses.length || 1);
    byId("evidenceProof").innerHTML = statuses
      .map(([label, value]) => `<div><span>${escapeHTML(label)}</span><b>${escapeHTML(value)}</b></div>`).join("");

    setText("storyEyebrow", offer.narrative.eyebrow);
    setText("storyTitle", offer.narrative.title);
    setText("storyBody", offer.narrative.body);
    setText("commercialTitle", offer.commercialTitle || "Vehicle price before destination costs.");
    setText("commercialNote", offer.commercialBody || offer.priceNote);
    const terms = Array.isArray(offer.commercialTerms)
      ? offer.commercialTerms.filter((pair) => Array.isArray(pair) && String(pair[0] ?? "").trim() && String(pair[1] ?? "").trim())
      : [];
    byId("commercialTerms").innerHTML = terms
      .map(([label, value]) => `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`).join("");
    byId("commercialTerms").hidden = !terms.length;
    setText("galleryTitle", offer.galleryTitle);
    setText("galleryIntro", offer.mediaIntro);
    setText("sourceDisclosure", offer.sourceDisclosure);
    byId("readinessList").innerHTML = offer.readiness.map((item) => `<li>${escapeHTML(item)}</li>`).join("");

    renderFacts(offer);
    renderHighlights(offer);
    renderExperience(offer);
    renderSpecPrototype(offer);
    renderSpecification(offer);
    buildFilters(offer);
    renderGallery(offer);
    refreshTransportStatus();


    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("offer", key);
      history.replaceState({ offer: key }, "", url);
    }
    window.ASG_OFFER_READY = true;
  }

  function openLightbox(index, trigger) {
    if (!state.gallery[index]) return;
    state.lightboxIndex = index;
    state.lightboxTrigger = trigger;
    updateLightbox();
    byId("lightbox").showModal();
    document.body.classList.add("is-modal");
    $(".lightbox__close").focus();
  }

  function updateLightbox() {
    const offer = offers[state.key];
    const entry = state.gallery[state.lightboxIndex];
    if (!entry) return;
    const [file, category, caption] = entry.item;
    const src = chapterAsset(offer, file);
    setImage(byId("lightboxImage"), src, offer.title + ": " + (caption || category));
    byId("lightboxError").hidden = Boolean(src);
    setText("lightboxCaption", caption || category);
    setText("lightboxPosition", String(state.lightboxIndex + 1) + " / " + String(state.gallery.length));
    $(".lightbox__prev").disabled = state.gallery.length < 2;
    $(".lightbox__next").disabled = state.gallery.length < 2;
  }

  function stepLightbox(direction) {
    if (!state.gallery.length) return;
    state.lightboxIndex = (state.lightboxIndex + direction + state.gallery.length) % state.gallery.length;
    updateLightbox();
  }

  function closeLightbox() { byId("lightbox").close(); }

  const CHANNELS = {
    Email: { type: "email", mode: "email", autocomplete: "email", label: "Email address (required)", placeholder: "name@example.com", hint: "Enter the email address where ASG can reply." },
    Phone: { type: "tel", mode: "tel", autocomplete: "tel", label: "Phone number (required)", placeholder: "+44 7700 900000", hint: "Include your country code, starting with +." },
    WhatsApp: { type: "tel", mode: "tel", autocomplete: "tel", label: "WhatsApp number (required)", placeholder: "+44 7700 900000", hint: "Include your country code, starting with +." },
    Telegram: { type: "text", mode: "text", autocomplete: "off", label: "Telegram username (required)", placeholder: "@username", hint: "Enter your Telegram username: 5–32 letters, numbers or underscores, starting with a letter. The @ is optional." }
  };
  const form = byId("requestForm");
  const requestPanel = byId("requestPanel");

  function fieldError(input, errorId, message) {
    input.setAttribute("aria-invalid", String(Boolean(message)));
    setText(errorId, message);
    byId(errorId).hidden = !message;
  }

  function updateContactMode() {
    const config = CHANNELS[form.elements.contactChannel.value];
    const input = form.elements.contact;
    input.type = config?.type || "text";
    input.inputMode = config?.mode || "text";
    input.autocomplete = config?.autocomplete || "off";
    input.placeholder = config?.placeholder || "Choose your preferred channel above";
    setText("contactLabel", config?.label || "Contact (required)");
    setText("contactHint", config?.hint || "Your contact will be used to respond to this enquiry.");
    fieldError(input, "contactError", "");
  }

  function refreshTransportStatus() {
    if (state.enquiryBusy) return;
    const connected = typeof window.ASG_ENQUIRY_TRANSPORT === "function";
    byId("enquirySubmit").textContent = connected ? (offers[state.key]?.uiCopy?.enquiry?.submit || "Send enquiry") : "Check details";
    setText("enquiryAvailability", connected
      ? "Your enquiry goes to the ASG team."
      : "Online enquiries are temporarily unavailable. Please contact your ASG advisor.");
    if (!state.enquiryFingerprint) setText("enquiryStatus", connected
      ? "Complete the form and select Send enquiry."
      : "Your entries stay in this form. Nothing has been sent.");
  }

  function collectEnquiry() {
    const fields = Object.fromEntries(["name", "contactChannel", "contact", "destination", "topic", "message"]
      .map((key) => [key, form.elements[key].value.trim()]));
    fields.requestedVehicleText = fields.topic === "OTHER_VEHICLE" ? form.elements.requestedVehicleText.value.trim() : "";
    return fields;
  }

  function updateTopic() {
    const otherVehicle = form.elements.topic.value === "OTHER_VEHICLE";
    byId("requestedVehicleField").hidden = !otherVehicle;
    form.elements.requestedVehicleText.required = otherVehicle;
    // A temporary topic change must not destroy the user's draft; collectEnquiry
    // excludes this field unless OTHER_VEHICLE is selected.
    fieldError(form.elements.requestedVehicleText, "requestedVehicleError", "");
  }

  function validateEnquiry(fields) {
    const errors = [];
    const check = (key, errorId, message) => {
      fieldError(form.elements[key], errorId, message);
      if (message) errors.push(form.elements[key]);
    };
    check("name", "nameError", !fields.name ? "Enter your name." : fields.name.length > 160 ? "Use 160 characters or fewer." : "");
    check("contactChannel", "channelError", !Object.hasOwn(CHANNELS, fields.contactChannel) ? "Choose how ASG should contact you." : "");
    let contactError = !fields.contact ? "Enter your contact details." : fields.contact.length > 254 ? "Use 254 characters or fewer." : "";
    const phone = (value) => /^\+[0-9 ()-]+$/.test(value) && value.replace(/\D/g, "").length >= 7 && value.replace(/\D/g, "").length <= 15;
    if (!contactError && fields.contactChannel === "Email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.contact)) contactError = "Enter a valid email address, such as name@example.com.";
    if (!contactError && ["Phone", "WhatsApp"].includes(fields.contactChannel) && !phone(fields.contact)) contactError = "Enter an international number with + and your country code.";
    if (!contactError && fields.contactChannel === "Telegram" && !/^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(fields.contact)) contactError = "Enter a Telegram username of 5–32 characters, starting with a letter. Use letters, numbers or underscores, with an optional @.";
    check("contact", "contactError", contactError);
    check("requestedVehicleText", "requestedVehicleError", fields.topic === "OTHER_VEHICLE"
      ? !fields.requestedVehicleText?.trim() ? "Tell us which vehicle you would like to discuss."
        : fields.requestedVehicleText.length > 1000 ? "Use 1,000 characters or fewer." : ""
      : "");
    if (errors.length) {
      setText("enquiryStatus", "Please check the highlighted fields. Nothing has been sent.");
      errors[0].focus();
      return false;
    }
    return true;
  }

  function newIdempotencyKey() {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return Array.from(crypto.getRandomValues(new Uint8Array(24)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  form.elements.contactChannel.addEventListener("change", () => {
    updateContactMode();
    fieldError(form.elements.contactChannel, "channelError", "");
  });
  form.elements.topic.addEventListener("change", updateTopic);
  form.addEventListener("input", (event) => {
    const error = { name: "nameError", contact: "contactError", requestedVehicleText: "requestedVehicleError" }[event.target.name];
    if (error) fieldError(event.target, error, "");
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    syncEnquiryRecipient();
    if (state.enquiryBusy) return;
    const fields = collectEnquiry();
    if (!validateEnquiry(fields)) return;
    const transport = window.ASG_ENQUIRY_TRANSPORT;
    if (typeof transport !== "function") {
      setText("enquiryStatus", "Your details are complete, but online enquiries are unavailable right now. Please contact your ASG advisor.");
      return;
    }
    // The service must validate again and resolve presentation / offer / partner server-side.
    const fingerprint = JSON.stringify([state.enquiryContext, fields]);
    if (fingerprint !== state.enquiryFingerprint) {
      state.idempotencyKey = newIdempotencyKey();
      state.enquiryFingerprint = fingerprint;
    }
    state.enquiryBusy = true;
    byId("enquirySubmit").disabled = true;
    ["name", "contactChannel", "contact", "destination", "topic", "requestedVehicleText", "message"].forEach((key) => { form.elements[key].disabled = true; });
    form.setAttribute("aria-busy", "true");
    setText("enquiryStatus", "Sending your enquiry…");
    const epoch = state.enquiryEpoch;
    let timeout;
    try {
      const result = await Promise.race([
        Promise.resolve().then(() => transport(fields, { idempotencyKey: state.idempotencyKey })),
        new Promise((_, reject) => { timeout = window.setTimeout(() => reject(new Error("RECEIPT_TIMEOUT")), 20000); })
      ]);
      if (epoch !== state.enquiryEpoch) return;
      if (result?.accepted !== true || typeof result.reference !== "string" || !result.reference.trim()) throw new Error("NOT_ACKNOWLEDGED");
      setText("enquiryStatus", "Your enquiry has been received by the ASG team. Reference: " + result.reference + ".");
      showEnquirySuccess(result.reference);
    } catch {
      if (epoch === state.enquiryEpoch) setText("enquiryStatus", "We could not confirm receipt. Your entries are still here. Please try again.");
    } finally {
      window.clearTimeout(timeout);
      if (epoch !== state.enquiryEpoch) return;
      state.enquiryBusy = false;
      byId("enquirySubmit").disabled = false;
      ["name", "contactChannel", "contact", "destination", "topic", "requestedVehicleText", "message"].forEach((key) => { form.elements[key].disabled = false; });
      form.setAttribute("aria-busy", "false");
    }
  });

  $(".lightbox__close").addEventListener("click", closeLightbox);
  $(".lightbox__prev").addEventListener("click", () => stepLightbox(-1));
  $(".lightbox__next").addEventListener("click", () => stepLightbox(1));
  byId("lightbox").addEventListener("close", () => {
    document.body.classList.remove("is-modal");
    if (state.lightboxTrigger?.isConnected) state.lightboxTrigger.focus({ preventScroll: true });
  });
  byId("lightbox").addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      stepLightbox(event.key === "ArrowLeft" ? -1 : 1);
    }
  });
  // A receipt replaces the form: the reader must see acknowledgement, not read a status line.
  function showEnquirySuccess(reference) {
    setText("enquirySuccessRef", reference);
    requestPanel.dataset.enquiryState = "sent";
    $(".request-panel__intro").hidden = true;
    form.hidden = true;
    byId("enquirySuccess").hidden = false;
    $(".request-panel__body").scrollTop = 0;
    byId("enquirySuccessTitle").focus({ preventScroll: true });
  }
  function resetEnquiryPanel() {
    if (requestPanel.dataset.enquiryState !== "sent") return;
    delete requestPanel.dataset.enquiryState;
    byId("enquirySuccess").hidden = true;
    form.hidden = false;
    $(".request-panel__intro").hidden = false;
    form.reset();
    // A sent enquiry must never be resubmitted from stale keys or a carried-over fingerprint.
    state.enquiryFingerprint = null;
    state.idempotencyKey = null;
    state.enquiryContext = null;
    updateTopic();
  }
  byId("enquirySuccessClose").addEventListener("click", () => requestPanel.close());
  function openRequest(button, topic) {
    state.requestTrigger = button;
    syncEnquiryRecipient();
    if (topic) { form.elements.topic.value = topic; updateTopic(); }
    refreshTransportStatus();
    if (requestPanel.open) return;
    requestPanel.showModal();
    $(".request-panel__body").scrollTop = 0;
    document.body.classList.add("is-modal");
    // Start on the title, not an input: do not summon a phone keyboard before context.
    byId("requestPanelTitle").focus({ preventScroll: true });
  }
  $$("[data-request-trigger]").forEach((button) => button.addEventListener("click", () => openRequest(button)));
  $$("[data-request-topic]").forEach((button) => button.addEventListener("click", () => openRequest(button, button.dataset.requestTopic)));
  $(".request-panel__close").addEventListener("click", () => requestPanel.close());
  requestPanel.addEventListener("close", () => {
    document.body.classList.remove("is-modal");
    resetEnquiryPanel();
    if (state.requestTrigger?.isConnected) state.requestTrigger.focus({ preventScroll: true });
  });

  byId("specExperienceImage").addEventListener("load", () => setLensAspect(byId("specExperienceImage")));
  document.addEventListener("error", (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    image.hidden = true;
    if (image.id === "heroImage") {
      byId("heroNoVisual").hidden = false;
      $(".hero")?.classList.add("hero--no-image");
      setText("heroNoVisual", "The main image could not be loaded. Vehicle details remain available below.");
    } else if (image.id === "lightboxImage") {
      byId("lightboxError").hidden = false;
    } else if (image.id === "specExperienceImage") {
      $(".spec-experience__visuals").hidden = true;
      byId("specExperiencePanel").classList.add("has-no-visual");
    } else if (image.closest(".gallery-card, .spec-cluster")) {
      const fallback = document.createElement("span");
      fallback.className = "image-unavailable";
      fallback.textContent = "This image could not be loaded.";
      image.after(fallback);
    }
  }, true);
  window.addEventListener("popstate", () => renderOffer(resolveKey(), false).catch(showFailure));
  updateContactMode();
  updateTopic();
  renderOffer(resolveKey(), false).catch(showFailure);
})();
