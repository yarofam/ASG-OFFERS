# Vehicle catalogue — the shelf

One page at the root of `offers.asg-hub.com`: every current vehicle as a card, filtered by marque, each card a link into its own offer page. One link to send instead of seven.

The offer page is a spread about one car. This is the shelf the spreads sit on — same system (iron ground, Onest, signal orange, hairlines), different job: scan, pick, forward.

## What ships

```
page/                     ← the deployable folder, drop it at the web root
  index.html              the template — generator markers live here
  catalog.css             the whole layout
  brand-interaction.css   lockup interaction — the same file as the offer page
  catalog.js              filter, numbering, copy-link. No dependencies, no network
  favicon.svg             square ASG mark
  favicon-32.png          fallback tab icon
  apple-touch-icon.png    iOS home-screen icon
  share.jpg               messenger link preview — 1200×630 JPEG
  share-card.html         build tool that renders share.jpg — delete before publishing
  assets/Onest.ttf        local font, no CDN
  assets/brand/           lockup and subline-free mark
  assets/media/           one card photograph per vehicle
```

Static. No build step, no framework, no external request. `Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'` — which also means **no inline `style=` attributes and no inline `<script>`**. Anything the generator emits must obey that.

The deployed tree:

```
/                index.html, catalog.css, catalog.js, assets/, share.jpg
/o/<slug>/       one offer folder per vehicle (vehicle-offer-web template)
```

---

## Contract for the generator (`tools/build-catalog.mjs`)

### 1. Markers

Everything between these comments is replaced wholesale. Keep the comments.

```html
<!-- ASG:FILTERS:START --> … <!-- ASG:FILTERS:END -->
<!-- ASG:CARDS:START -->   … <!-- ASG:CARDS:END -->
```

### 2. Placeholders

In the topbar, literal, replaced by string substitution:

| Token | Example | Notes |
| --- | --- | --- |
| `{{COUNT}}` | `07` | zero-padded to two digits |
| `{{UPDATED}}` | `18 Sept 2026` | day, short month, year |

`{{SITE_URL}}` appears three times in the `<head>` (og:url, og:image, twitter:image) — absolute site root, **no trailing slash**. Fill it the same way the offer workflow fills `{{OFFER_URL}}`.

### 3. Attributes that must survive

- grid container — `id="grid"`
- filter container — `id="filters"`
- empty state — `id="gridEmpty"` with `hidden`
- every card — `data-brand="<marque>"`, matching a chip's `data-filter` **exactly** (`Rolls-Royce`, not `rolls-royce`)
- every chip — `data-filter="<marque>"`; the first is `data-filter="all"` with `is-active`
- copy button — `data-copy="o/<slug>/"`, relative

`data-count` on the chips is **not** the generator's job — `catalog.js` counts the cards it finds and writes it.

### 4. Card markup

Emit exactly this shape (whitespace free to differ). The card index is written once by the generator and **rewritten by `catalog.js` on every filter change**, so a filtered view always reads 01, 02, 03 — emit the unfiltered number.

```html
<article class="card" data-brand="Ferrari">
<div class="card__frame">
<img class="card__photo" src="assets/media/<slug>.webp" alt="<brand> <model>" width="900" height="563" loading="lazy" decoding="async">
<span class="card__index asg-data" aria-hidden="true">01</span>
<button class="card__copy" type="button" data-copy="o/<slug>/" aria-label="Copy link to <brand> <model>"><svg …>…</svg><span>Copy link</span></button>
<i class="card__rule" aria-hidden="true"></i>
</div>
<div class="card__body">
<p class="card__brand">Ferrari</p>
<h3 class="card__model"><a class="card__link" href="o/<slug>/">296 Speciale</a></h3>
<p class="card__spec">Verde Nürburgring · Rosso Dino Alcantara · No. 25</p>
</div>
<div class="card__foot">
<p class="card__price asg-data"><span>Net</span><strong>470,269 EUR</strong></p>
<p class="card__status">Availability to be confirmed</p>
</div>
</article>
```

Copy the `<svg>` verbatim from any card in `index.html` — it is the only icon on the page.

The whole card is clickable: `.card__link::after` covers it. The copy button sits above that overlay, so it does not open the offer. Do not wrap the `<article>` in an `<a>` — a button inside an anchor is invalid and breaks both.

**No price.** Add `card__price--request` and put the words in `<strong>`:

```html
<p class="card__price card__price--request"><span>Net</span><strong>On request</strong></p>
```

**Field limits** (they are soft — the layout survives overruns, it just gets tall): model ~45 characters, wraps to two lines; specification ~110, clamped at two lines with an ellipsis; status ~50, two lines, uppercase.

### 5. Photographs

One per vehicle at `assets/media/<slug>.webp` — **900 px wide, 16:10, WebP q85, 40–100 kB**. Same frame as the offer's `thumbs/hero.webp` where one exists. The card crops to 16:10 with `object-fit: cover`, so a portrait frame loses the car; use the landscape one. Studio renders on white and live photographs on tarmac both sit fine on the dark ground — the card applies the house grade (`saturate .92 / contrast 1.045 / brightness .965`).

### 6. Degenerate cases

- **One card** — the grid is `auto-fill`, so a single card keeps its column width and does not stretch across the page.
- **Fifty cards** — the filter bar is sticky under the topbar, so the marque row stays reachable while scrolling.
- **No cards at all** — emit an empty `ASG:CARDS` block; `#gridEmpty` shows itself.
- **One marque only** — emit `All vehicles` plus that marque, or just `All vehicles`; counts are suppressed when there is a single chip.

---

## What `catalog.js` does

Filter by `data-brand`, renumber the visible cards, update the live result count, show and hide `#gridEmpty`, write per-marque counts onto the chips, and copy a vehicle's absolute link to the clipboard.

It also reads and writes the hash: `offers.asg-hub.com/#porsche` opens with the Porsche filter applied — a marque view is itself a sendable link. Slugging is `lowercase`, non-alphanumerics to `-`.

Everything works without JavaScript except filtering: the page renders the full unfiltered shelf and every card links correctly.

## What the generator must not touch

The topbar is the offer page's topbar, ported rule for rule: `min-height: 108px`, three columns `minmax(0,1fr) 280px minmax(0,1fr)`, the lockup **centred in the middle column at 280 px** with the `Automotive Supply Group` descriptor legible, and the same `brand-interaction.css` — the orange signal path brightens on hover and focus. It is the **inline** master SVG, not an `<img>`: a linked image cannot be styled, so the interaction would be lost. Leave the `<svg>` in place.

The count sits left and the update date right, one line each, mirroring where the offer puts its nav and meta. Below 680 px the bar unstacks exactly as the offer's does: lockup full width and centred, count and date on the row beneath.

## Beyond the brief — three additions

1. **Copy link per card.** The stated scenario is "open, scan, forward". Forwarding a single car previously meant opening it and copying the address bar. The button appears on hover, is always visible on touch, and confirms with a toast. Remove it by deleting `.card__copy` from the emitted markup — nothing else depends on it.
2. **Counts on the chips and a live result count.** Free — read from the cards, no generator work — and it tells a broker "Porsche 02" before they click.
3. **Filter in the hash.** Lets us send `/#rolls-royce` to a client who only buys Rolls-Royce, from the same one page.

## Link preview

`share.jpg` is rendered from `share-card.html`: the lead photograph under the house veil, the ASG mark without its subline, `Current vehicles`, and the count line. Set the photograph and the meta line by hand, capture `#card` at **exactly 1200×630**, save as JPEG q0.86 (~90 kB), then delete `share-card.html` before publishing.

The three constraints are the same as the offer pages and all three are mandatory: exactly 1200×630, `og:image:width`/`og:image:height` declared in the head, JPEG under 300 kB. Off-ratio or WebP and WhatsApp shows a postage stamp or nothing.

Unlike an offer, this URL never changes — so its preview is cached for good on the day the first person sends it. Re-render `share.jpg` only when the card design changes, and accept that already-sent links keep the old one.

## Rules that do not move

- Prices are net. The footer line stating what is excluded is load-bearing; it is not decoration.
- Nothing is invented. A vehicle with no confirmed price is `On request`, not a guess. A status the source does not carry is omitted, not filled.
- The repository is public. No supplier identity, no cost, no margin, no internal reference — on this page or in any file it loads.
- `noindex, noarchive` stays. The link is the access boundary.
- One approved lockup. Signal orange stays a signal: eyebrows, rules, the hover mark. Never a background.
- No marque logos. Text only.

## Demo content

The five cards in `index.html` are real vehicles with real photographs, kept so the states are visible: a two-line model name (Taycan Turbo GT with Weissach Package), a long specification line, and `On request` (Rolls-Royce Spectre — its price exists; the card demonstrates the state). The generator replaces all of it.
