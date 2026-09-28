/* ASG catalogue — filter, sort, indicative currency, numbering, copy-link.
   No dependencies. The only request is /rates.json on the same origin. */
(function () {
  var grid = document.getElementById('grid');
  var filters = document.getElementById('filters');
  var empty = document.getElementById('gridEmpty');
  var counter = document.getElementById('resultCount');
  var toast = document.getElementById('toast');
  var root = document.documentElement;
  var reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* The header coachline draws once on load, as on the offer pages. */
  if (!reduced) {
    root.classList.add('is-coach-intro');
    setTimeout(function () { root.classList.remove('is-coach-intro'); }, 700);
  }
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'));
  var chips = filters ? Array.prototype.slice.call(filters.querySelectorAll('.chip')) : [];
  var slug = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
  var pad = function (n) { return n < 10 ? '0' + n : String(n); };

  /* Per-marque counts on the chips — read from the cards, so the generator
     never has to supply them. */
  chips.forEach(function (chip) {
    var f = chip.dataset.filter;
    var n = f === 'all' ? cards.length : cards.filter(function (c) { return c.dataset.brand === f; }).length;
    if (chips.length > 1) chip.dataset.count = pad(n);
  });

  var currentFilter = 'all';
  function apply(filter, push) {
    currentFilter = filter;
    var shown = 0;
    Array.prototype.slice.call(grid.querySelectorAll('.card')).forEach(function (card) {
      var match = filter === 'all' || card.dataset.brand === filter;
      card.hidden = !match;
      if (match) {
        shown++;
        var index = card.querySelector('.card__index');
        if (index) index.textContent = pad(shown);
      }
    });
    chips.forEach(function (chip) {
      var on = chip.dataset.filter === filter;
      chip.classList.toggle('is-active', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (empty) empty.hidden = shown !== 0;
    if (counter) {
      counter.textContent = shown === cards.length
        ? pad(cards.length) + (cards.length === 1 ? ' vehicle' : ' vehicles')
        : pad(shown) + ' of ' + pad(cards.length) + ' vehicles';
    }
    if (push) {
      try {
        history.replaceState(null, '', filter === 'all' ? location.pathname + location.search : '#' + slug(filter));
      } catch (err) { /* sandboxed or opaque origin — filtering still works */ }
    }
  }

  if (filters) {
    filters.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (chip) apply(chip.dataset.filter, true);
    });
  }
  if (empty) {
    empty.addEventListener('click', function (e) {
      if (e.target.closest('[data-filter]')) apply('all', true);
    });
  }

  /* A marque view is a sendable link: offers.asg-hub.com/#porsche */
  var initial = 'all';
  if (location.hash) {
    var wanted = location.hash.slice(1).toLowerCase();
    chips.forEach(function (chip) { if (slug(chip.dataset.filter) === wanted) initial = chip.dataset.filter; });
  }
  apply(initial, false);

  /* ---------- currency: indicative conversion from the site's /rates.json ---------- */
  var STORE = 'asg.offer.currency'; /* same key as the offer pages, so the choice carries across */
  var CODES = ['EUR', 'USD', 'GBP', 'AED'];
  var currencyControl = document.getElementById('currencyControl');
  var currencySelect = document.getElementById('currencySelect');
  var sortSelect = document.getElementById('sortSelect');
  var fxNote = document.getElementById('fxNote');
  var rates = null;
  var currency = '';

  cards.forEach(function (card) {
    var strong = card.querySelector('.card__price strong');
    if (strong) card.dataset.listed = strong.textContent;
  });

  function perEur(code) { return code === 'EUR' ? 1 : Number(rates && rates.rates[code]); }
  function fmt(n, code) { return Math.round(n).toLocaleString('en-US') + ' ' + code; }

  /* A card's price in the chosen currency; null when it cannot be converted. */
  function convert(card, code) {
    var amount = Number(card.dataset.amount);
    var base = card.dataset.currency;
    if (!(amount > 0) || !base || !rates) return null;
    var from = perEur(base), to = perEur(code);
    if (!(from > 0) || !(to > 0)) return null;
    return amount * to / from;
  }

  function paintPrices() {
    cards.forEach(function (card) {
      var strong = card.querySelector('.card__price strong');
      if (!strong || !card.dataset.amount) return;
      var value = currency ? convert(card, currency) : null;
      if (value == null || card.dataset.currency === currency) {
        strong.textContent = card.dataset.listed;
        return;
      }
      var approx = document.createElement('span');
      approx.className = 'card__approx';
      approx.textContent = '≈';
      strong.replaceChildren(approx, document.createTextNode(fmt(value, currency)));
    });
    if (fxNote) {
      fxNote.hidden = !currency;
      if (currency && rates) {
        var date = new Date(rates.date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
        fxNote.textContent = 'Indicative at the ' + (rates.source || 'ECB') + ' rate of ' + date + '. Each contract is settled in its listed currency.';
      }
    }
  }

  /* ---------- sort: newest (as published), or by price; "On request" always last ---------- */
  function priceKey(card) {
    if (!card.dataset.amount) return null;
    var live = rates ? convert(card, 'EUR') : null;
    if (live != null) return live;
    var eur = Number(card.dataset.eur);
    return eur > 0 ? eur : null;
  }

  function sortCards(mode) {
    var ordered = cards.slice().sort(function (a, b) {
      if (mode === 'price-asc' || mode === 'price-desc') {
        var ka = priceKey(a), kb = priceKey(b);
        if (ka == null && kb == null) return Number(a.dataset.order) - Number(b.dataset.order);
        if (ka == null) return 1;
        if (kb == null) return -1;
        if (ka !== kb) return mode === 'price-asc' ? ka - kb : kb - ka;
      }
      return Number(a.dataset.order) - Number(b.dataset.order);
    });
    ordered.forEach(function (card) { grid.appendChild(card); });
    apply(currentFilter, false);
  }

  if (sortSelect) sortSelect.addEventListener('change', function () { sortCards(sortSelect.value); });

  if (currencySelect) {
    currencySelect.addEventListener('change', function () {
      currency = currencySelect.value;
      try {
        if (currency) localStorage.setItem(STORE, currency);
        else localStorage.removeItem(STORE);
      } catch (err) { /* storage blocked — the choice just is not remembered */ }
      paintPrices();
      if (sortSelect && sortSelect.value !== 'newest') sortCards(sortSelect.value);
    });
  }

  /* The switch only appears once a fresh, well-formed file has arrived:
     1.5 s timeout, hidden when missing, malformed or older than ten days. */
  function loadRates() {
    if (typeof fetch !== 'function' || !currencyControl) return;
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 1500);
    fetch('/rates.json', { cache: 'no-cache', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || data.base !== 'EUR' || !data.rates || !/^\d{4}-\d{2}-\d{2}$/.test(data.date || '')) return;
        var age = (Date.now() - Date.parse(data.date + 'T00:00:00Z')) / 864e5;
        if (!(age >= -1 && age <= 10)) return;
        if (!CODES.every(function (c) { return c === 'EUR' || Number(data.rates[c]) > 0; })) return;
        rates = data;
        currencyControl.hidden = false;
        var saved = '';
        try { saved = localStorage.getItem(STORE) || ''; } catch (err) { saved = ''; }
        if (CODES.indexOf(saved) !== -1) {
          currency = saved;
          currencySelect.value = saved;
          paintPrices();
        }
        if (sortSelect && sortSelect.value !== 'newest') sortCards(sortSelect.value);
      })
      .catch(function () { /* offline or blocked: prices stay as listed */ })
      .then(function () { clearTimeout(timer); });
  }
  loadRates();

  /* Copy one vehicle's link without opening it — forwarding it on is the common case. */
  var toastTimer;
  function flash(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    requestAnimationFrame(function () { toast.classList.add('is-visible'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('is-visible');
      setTimeout(function () { toast.hidden = true; }, 240);
    }, 2000);
  }
  function write(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.className = 'visually-hidden';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject();
    });
  }
  grid.addEventListener('click', function (e) {
    var button = e.target.closest('.card__copy');
    if (!button) return;
    e.preventDefault();
    var url = new URL(button.dataset.copy, location.href).href;
    var label = button.querySelector('span:not([class])') || button.lastElementChild;
    write(url).then(function () {
      button.classList.add('is-done');
      if (label) label.textContent = 'Copied';
      flash('Link copied');
      setTimeout(function () {
        button.classList.remove('is-done');
        if (label) label.textContent = 'Copy link';
      }, 1800);
    }).catch(function () { flash(url); });
  });
})();
