#!/usr/bin/env node
/* Builds the root catalogue page (index.html) from the offers published in o/.
 *
 * Every offer folder stays untouched and self-contained: this script only reads
 * each offer's own data file (or its og: tags, for single-file offers) and
 * writes one file — index.html at the repository root. Publishing an offer
 * therefore stays a plain copy of a folder into o/<slug>/; the catalogue
 * rebuilds itself from what is there.
 *
 * Presentation lives in catalog.css / catalog.js; catalog.json carries the
 * editorial choices (headline, price visibility, order, hidden offers).
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createContext, runInContext } from "node:vm";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://offers.asg-hub.com";

/* Longest first: "Rolls-Royce" must win before "Royce", "Mercedes-AMG" before
   "Mercedes-Benz". Unknown makes fall back to the first word of the title. */
const BRANDS = [
  "Rolls-Royce", "Aston Martin", "Range Rover", "Land Rover", "Mercedes-AMG",
  "Mercedes-Benz", "Alfa Romeo", "Lamborghini", "Koenigsegg", "Volkswagen",
  "Maserati", "Bugatti", "Bentley", "McLaren", "Cadillac", "Chevrolet",
  "Ferrari", "Porsche", "Hyundai", "Genesis", "Maybach", "Pagani", "Jaguar",
  "Lexus", "Lotus", "Lucid", "Rimac", "Tesla", "Volvo", "Cupra", "Audi",
  "BMW", "Mini", "Ford", "Jeep", "Kia"
];

const CURRENCIES = ["EUR", "GBP", "USD", "CHF", "AED", "SAR", "QAR", "CNY", "JPY", "SEK", "NOK", "DKK", "PLN", "CZK"];
const SYMBOLS = { "£": "GBP", "€": "EUR", "$": "USD", "¥": "JPY", "₣": "CHF", "د.إ": "AED" };

const DEFAULTS = {
  eyebrow: "ASG · Automotive Supply Group",
  title: "Current vehicles",
  lead: "Every car below is a specified, individually documented vehicle held or configured through ASG. Open a vehicle for its full specification, evidence and commercial terms.",
  showPrices: true,
  order: [],
  hidden: [],
  images: {}
};

/* ---------- small helpers ---------- */

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const unesc = (s) => String(s ?? "")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

function readConfig() {
  const path = join(ROOT, "catalog.json");
  if (!existsSync(path)) return { ...DEFAULTS };
  try {
    return { ...DEFAULTS, ...JSON.parse(readFileSync(path, "utf8")) };
  } catch (error) {
    console.warn(`catalog.json ignored (${error.message})`);
    return { ...DEFAULTS };
  }
}

/* The offer data files are hand-authored JS with varying syntax (quoted and
   unquoted keys, minified and pretty). Running them beats regexing them. */
function readOfferData(slug) {
  const path = join(ROOT, "o", slug, "data", "offer.js");
  if (!existsSync(path)) return null;
  try {
    const sandbox = { window: {} };
    createContext(sandbox);
    runInContext(readFileSync(path, "utf8"), sandbox, { timeout: 5000 });
    const offers = sandbox.window.ASG_OFFERS;
    if (!offers) return null;
    const keys = Object.keys(offers);
    return keys.length ? offers[keys[0]] : null;
  } catch (error) {
    console.warn(`o/${slug}/data/offer.js could not be read (${error.message})`);
    return null;
  }
}

function metaContent(html, attribute, name) {
  const tag = html.match(new RegExp(`<meta[^>]+${attribute}=["']${name}["'][^>]*>`, "i"));
  if (!tag) return "";
  const content = tag[0].match(/content=["']([^"']*)["']/i);
  return content ? unesc(content[1]) : "";
}

function splitBrand(title) {
  const brand = BRANDS.find((candidate) => title.toLowerCase().startsWith(candidate.toLowerCase()));
  if (brand) return { brand, model: title.slice(brand.length).trim() || brand };
  const [first, ...rest] = title.split(" ");
  return { brand: first || title, model: rest.join(" ") || title };
}

function parsePrice(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const amount = text.match(/\d[\d\s.,']*\d|\d/);
  if (!amount) return null;
  const code = text.match(new RegExp(`\\b(${CURRENCIES.join("|")})\\b`, "i"));
  let currency = code ? code[1].toUpperCase() : "";
  if (!currency) {
    const symbol = Object.keys(SYMBOLS).find((key) => text.includes(key));
    currency = symbol ? SYMBOLS[symbol] : "";
  }
  return { amount: amount[0].trim(), currency };
}

/* Newest offer first. The catalogue is a stock list, so what arrived last is
   what brokers want to see first. Needs full history (fetch-depth: 0); with a
   shallow checkout every offer scores 0 and the order falls back to the
   configured one, then alphabetical. */
function firstPublished(slug) {
  try {
    const log = execFileSync("git", ["log", "--diff-filter=A", "--format=%ct", "--", `o/${slug}`], {
      cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]
    }).trim().split("\n").filter(Boolean);
    return log.length ? Number(log[log.length - 1]) : 0;
  } catch {
    return 0;
  }
}

/* The card shows the offer's own hero image. Some packages carry leftover
   thumbnails from the template under a name the offer itself never renders
   (o/8sq511 has a Ferrari thumbs/hero.webp), so a thumbnail is only trusted
   when the offer's gallery actually uses that file. Otherwise the full-size
   hero is used — it is exactly what the offer page shows. A better frame can be
   named per offer under "images" in catalog.json, as a path inside the offer
   folder; the offer package itself is never edited. */
function cardImage(slug, data, overrides) {
  const override = overrides && overrides[slug];
  if (override && existsSync(join(ROOT, "o", slug, override))) return `o/${slug}/${override}`;

  const hero = data && typeof data.hero === "string" ? data.hero : "";
  const thumbBase = data && typeof data.thumbBase === "string" ? data.thumbBase : "assets/media/thumbs/";
  const gallery = Array.isArray(data && data.gallery)
    ? data.gallery.map((entry) => (Array.isArray(entry) ? entry[0] : entry)).filter((name) => typeof name === "string")
    : [];

  const candidates = [];
  if (hero) {
    const file = basename(hero);
    if (gallery.includes(file)) candidates.push(`${thumbBase.replace(/\/?$/, "/")}${file}`);
    candidates.push(hero);
  }
  candidates.push("share.jpg");

  const found = candidates.find((relative) => existsSync(join(ROOT, "o", slug, relative)));
  return found ? `o/${slug}/${found}` : "";
}

/* ---------- collect ---------- */

function collectOffers(config) {
  const dir = join(ROOT, "o");
  if (!existsSync(dir)) return [];
  const hidden = new Set(config.hidden);

  const offers = readdirSync(dir)
    .filter((slug) => !slug.startsWith(".") && statSync(join(dir, slug)).isDirectory())
    .filter((slug) => existsSync(join(dir, slug, "index.html")))
    .filter((slug) => !hidden.has(slug))
    .map((slug) => {
      const html = readFileSync(join(dir, slug, "index.html"), "utf8");
      const data = readOfferData(slug) || {};
      const ogTitle = metaContent(html, "property", "og:title").replace(/\s+[—-]\s+ASG.*$/i, "").trim();
      const title = (data.title || ogTitle || slug).trim();
      const { brand, model } = splitBrand(title);

      return {
        slug,
        title,
        brand,
        model,
        spec: (data.subtitle || metaContent(html, "property", "og:description") || "").trim(),
        price: parsePrice(data.price),
        availability: (data.availabilityStatus || "").trim(),
        location: (data.locationStatus || "").trim(),
        image: cardImage(slug, data, config.images),
        published: firstPublished(slug)
      };
    });

  const rank = new Map(config.order.map((slug, index) => [slug, index]));
  return offers.sort((a, b) => {
    const rankA = rank.has(a.slug) ? rank.get(a.slug) : Infinity;
    const rankB = rank.has(b.slug) ? rank.get(b.slug) : Infinity;
    if (rankA !== rankB) return rankA - rankB;
    if (a.published !== b.published) return b.published - a.published;
    return a.title.localeCompare(b.title);
  });
}

/* ---------- render ---------- */

function renderCard(offer, index, showPrices) {
  const number = String(index + 1).padStart(2, "0");
  const eager = index < 3;
  const media = offer.image
    ? `<img class="card__image asg-photo" src="${esc(offer.image)}" alt="" width="1200" height="750" loading="${eager ? "eager" : "lazy"}"${eager ? ' fetchpriority="high"' : ""} decoding="async">`
    : `<span class="card__image card__image--empty" aria-hidden="true"></span>`;

  const price = showPrices && offer.price
    ? `<span class="card__price"><small>Net</small><b class="asg-data">${esc(offer.price.amount)}${offer.price.currency ? ` ${esc(offer.price.currency)}` : ""}</b></span>`
    : `<span class="card__price"><small>Price</small><b>On request</b></span>`;

  const status = offer.availability || offer.location
    ? `<span class="card__status">${esc(offer.availability || offer.location)}</span>`
    : "";

  return `        <a class="card" href="${esc(`o/${offer.slug}/`)}" data-brand="${esc(offer.brand)}">
          <span class="card__media">${media}<span class="card__index">${number}</span></span>
          <span class="card__body">
            <span class="card__brand">${esc(offer.brand)}</span>
            <span class="card__model">${esc(offer.model)}</span>
            ${offer.spec ? `<span class="card__spec">${esc(offer.spec)}</span>` : ""}
          </span>
          <span class="card__foot">${price}${status}</span>
        </a>`;
}

function renderFilters(offers) {
  const brands = [...new Set(offers.map((offer) => offer.brand))].sort((a, b) => a.localeCompare(b));
  if (brands.length < 2) return "";
  const chips = brands.map((brand) =>
    `          <button class="chip" type="button" data-filter="${esc(brand)}">${esc(brand)}</button>`
  ).join("\n");
  return `      <div class="filters" id="filters" role="group" aria-label="Filter by make">
          <button class="chip is-active" type="button" data-filter="all">All vehicles</button>
${chips}
      </div>`;
}

function renderPage(offers, config, updated) {
  const count = String(offers.length).padStart(2, "0");
  const description = `${offers.length} specified vehicles currently offered through ASG — Automotive Supply Group.`;
  /* The brand file carries a large c2pa <metadata> blob; it has no business
     being inlined into every page load. */
  const lockup = readFileSync(join(ROOT, "assets", "brand", "asg-lockup-dark.svg"), "utf8")
    .replace(/<\?xml[^>]*\?>\s*/i, "")
    .replace(/<metadata>[\s\S]*?<\/metadata>/i, "")
    .replace(/<svg /i, '<svg class="brand-lockup" aria-hidden="true" focusable="false" ');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#111315">
  <meta name="color-scheme" content="dark">
  <title>ASG — Current Vehicles</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="noindex, noarchive">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="icon" href="favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="ASG — Automotive Supply Group">
  <meta property="og:title" content="ASG — Current Vehicles">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${SITE}/">
  <meta property="og:image" content="${SITE}/share.jpg">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="ASG — current vehicles">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${SITE}/share.jpg">
  <link rel="stylesheet" href="catalog.css">
</head>
<body>
  <a class="skip-link" href="#vehicles">Skip to vehicles</a>

  <header class="topbar">
    <span class="topbar__brand" aria-label="ASG — Automotive Supply Group">
${lockup.trim().split("\n").map((line) => `      ${line}`).join("\n")}
    </span>
    <p class="topbar__meta"><b class="asg-data">${esc(count)}</b><span>vehicles · updated ${esc(updated)}</span></p>
  </header>

  <main id="main">
    <section class="intro">
      <p class="eyebrow">${esc(config.eyebrow)}</p>
      <div class="intro__grid">
        <h1>${esc(config.title)}</h1>
        <p class="intro__lead">${esc(config.lead)}</p>
      </div>
${renderFilters(offers)}
    </section>

    <section class="vehicles" id="vehicles" aria-label="Vehicles">
      <div class="grid" id="grid">
${offers.map((offer, index) => renderCard(offer, index, config.showPrices)).join("\n")}
      </div>
      <p class="grid__empty" id="gridEmpty" hidden>No vehicles for this make.</p>
    </section>
  </main>

  <footer class="footer">
    <p class="footer__note">Each vehicle is a private proposal prepared for a named buyer. Prices are net vehicle prices and exclude delivery, destination taxes and registration unless stated inside the offer.</p>
    <p class="footer__meta"><span>ASG — Automotive Supply Group</span><span>offers.asg-hub.com</span></p>
  </footer>

  <script src="catalog.js"></script>
</body>
</html>
`;
}

/* ---------- run ---------- */

const config = readConfig();
const offers = collectOffers(config);

/* "Updated" means the last time the shelf itself changed, not the last time
   this script ran: rebuilding on an unrelated push must not move the date. */
const latest = Math.max(0, ...offers.map((offer) => offer.published));
const updated = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC"
}).format(latest ? new Date(latest * 1000) : new Date());

writeFileSync(join(ROOT, "index.html"), renderPage(offers, config, updated));
console.log(`catalogue: ${offers.length} vehicles -> index.html`);
for (const offer of offers) console.log(`  ${offer.slug}  ${offer.title}`);
