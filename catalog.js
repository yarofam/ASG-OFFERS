/* ASG catalogue — filter, numbering, copy-link. No dependencies, no network. */
(function () {
  var grid = document.getElementById('grid');
  var filters = document.getElementById('filters');
  var empty = document.getElementById('gridEmpty');
  var counter = document.getElementById('resultCount');
  var toast = document.getElementById('toast');
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

  function apply(filter, push) {
    var shown = 0;
    cards.forEach(function (card) {
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
