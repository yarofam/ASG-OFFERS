#!/usr/bin/env node
/* Builds the catalogue page at the site root from the offers published in o/.
 *
 * The design is not generated: templates/catalog/index.html is the page as the
 * design system delivered it, and this script only replaces what sits between
 * its ASG:FILTERS and ASG:CARDS markers, fills {{COUNT}} and {{UPDATED}}, and
 * renders one card photograph per vehicle. {{SITE_URL}} is left for the
 * workflow to bake, the same way offers get {{OFFER_URL}}.
 *
 * Offer folders are read, never written. catalog.json carries the editorial
 * choices (headline copy lives in the template; order, hidden offers, price
 * visibility and per-offer photo overrides live here).
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createContext, runInContext } from "node:vm";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE = join(ROOT, "templates", "catalog", "index.html");
const PHOTO_DIR = join(ROOT, "assets", "media");
const PHOTO = { width: 900, height: 563, quality: [85, 76, 68], maxBytes: 100 * 1024 };

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
const SYMBOLS = { "£": "GBP", "€": "EUR", "$": "USD", "¥": "JPY", "₣": "CHF" };

const DEFAULTS = { showPrices: true, order: [], hidden: [], images: {} };

/* ---------- small helpers ---------- */

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const unesc = (s) => String(s ?? "")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

const pad = (n) => String(n).padStart(2, "0");

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
  return `${amount[0].trim()}${currency ? ` ${currency}` : ""}`;
}

/* Newest offer first: the catalogue is a stock list, so what arrived last is
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

/* The card shows the offer's own hero. Some packages carry leftover thumbnails
   from the template under a name the offer itself never renders (o/8sq511 has
   a Ferrari thumbs/hero.webp), so a thumbnail is only trusted when the offer's
   gallery actually uses that file. A better frame can be named per offer under
   "images" in catalog.json; the offer package itself is never edited. */
function photoSource(slug, data, overrides) {
  const override = overrides && overrides[slug];
  if (override && existsSync(join(ROOT, "o", slug, override))) return join(ROOT, "o", slug, override);

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
  return found ? join(ROOT, "o", slug, found) : "";
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
        price: config.showPrices ? parsePrice(data.price) : "",
        status: (data.availabilityStatus || data.locationStatus || "").trim(),
        source: photoSource(slug, data, config.images),
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

/* ---------- photographs ---------- */

/* One 900px 16:10 WebP per vehicle at assets/media/<slug>.webp, so the shelf
   does not pull the offers' full-size heroes. sharp is only needed when a
   photograph is missing or its source changed; if it cannot be loaded at all,
   existing files are kept and anything missing falls back to the offer's own
   image, which is heavier but correct. */
async function renderPhotos(offers) {
  mkdirSync(PHOTO_DIR, { recursive: true });

  let sharp = null;
  try {
    ({ default: sharp } = await import("sharp"));
  } catch {
    console.warn("sharp unavailable — keeping the card photographs already in assets/media");
  }

  for (const offer of offers) {
    const target = join(PHOTO_DIR, `${offer.slug}.webp`);
    if (sharp && offer.source) {
      try {
        /* Studio renders compress to a fraction of a live photograph, so the
           quality steps down until the file lands inside the design's budget. */
        let rendered;
        for (const quality of PHOTO.quality) {
          rendered = await sharp(offer.source)
            .resize(PHOTO.width, PHOTO.height, { fit: "cover", position: "centre" })
            .webp({ quality })
            .toBuffer();
          if (rendered.length <= PHOTO.maxBytes) break;
        }
        /* Write only on change: an identical rebuild must not show up as a diff. */
        if (!existsSync(target) || !readFileSync(target).equals(rendered)) {
          writeFileSync(target, rendered);
          console.log(`  photo ${offer.slug}.webp ${(rendered.length / 1024).toFixed(0)} kB`);
        }
      } catch (error) {
        console.warn(`  photo ${offer.slug} failed (${error.message})`);
      }
    }
    offer.photo = existsSync(target)
      ? `assets/media/${offer.slug}.webp`
      : (offer.source ? offer.source.slice(ROOT.length + 1) : "");
  }

  /* A removed offer must not leave its photograph behind. */
  const live = new Set(offers.map((offer) => `${offer.slug}.webp`));
  for (const file of readdirSync(PHOTO_DIR)) {
    if (file.endsWith(".webp") && !live.has(file)) {
      unlinkSync(join(PHOTO_DIR, file));
      console.log(`  removed stale ${file}`);
    }
  }
}

/* ---------- render ---------- */

function replaceBlock(html, name, body) {
  const pattern = new RegExp(`(<!-- ASG:${name}:START -->)[\\s\\S]*?(<!-- ASG:${name}:END -->)`);
  if (!pattern.test(html)) throw new Error(`marker ASG:${name} missing from templates/catalog/index.html`);
  return html.replace(pattern, `$1\n${body}\n$2`);
}

/* The link icon is the only icon on the page; take it from the template rather
   than keeping a second copy here. */
function copyIcon(template) {
  const icon = template.match(/<button class="card__copy"[\s\S]*?(<svg[\s\S]*?<\/svg>)/);
  return icon ? icon[1] : "";
}

function renderCards(offers, icon) {
  return offers.map((offer, index) => {
    const name = `${offer.brand} ${offer.model}`.trim();
    const href = `o/${offer.slug}/`;
    const photo = offer.photo
      ? `<img class="card__photo" src="${esc(offer.photo)}" alt="${esc(name)}" width="${PHOTO.width}" height="${PHOTO.height}" loading="lazy" decoding="async">`
      : "";
    const price = offer.price
      ? `<p class="card__price asg-data"><span>Net</span><strong>${esc(offer.price)}</strong></p>`
      : `<p class="card__price card__price--request"><span>Net</span><strong>On request</strong></p>`;
    const status = offer.status ? `\n<p class="card__status">${esc(offer.status)}</p>` : "";

    return `<article class="card" data-brand="${esc(offer.brand)}">
<div class="card__frame">
${photo}
<span class="card__index asg-data" aria-hidden="true">${pad(index + 1)}</span>
<button class="card__copy" type="button" data-copy="${esc(href)}" aria-label="Copy link to ${esc(name)}">${icon}<span>Copy link</span></button>
<i class="card__rule" aria-hidden="true"></i>
</div>
<div class="card__body">
<p class="card__brand">${esc(offer.brand)}</p>
<h3 class="card__model"><a class="card__link" href="${esc(href)}">${esc(offer.model)}</a></h3>
${offer.spec ? `<p class="card__spec">${esc(offer.spec)}</p>` : ""}
</div>
<div class="card__foot">
${price}${status}
</div>
</article>`;
  }).join("\n");
}

function renderFilters(offers) {
  const brands = [...new Set(offers.map((offer) => offer.brand))].sort((a, b) => a.localeCompare(b));
  const chips = brands.map((brand) =>
    `<button class="chip" type="button" data-filter="${esc(brand)}">${esc(brand)}</button>`
  );
  return [`<button class="chip is-active" type="button" data-filter="all">All vehicles</button>`, ...chips].join("\n");
}

/* ---------- run ---------- */

const config = readConfig();
const offers = collectOffers(config);
await renderPhotos(offers);

/* "Updated" means the last time the shelf itself changed, not the last time
   this script ran: rebuilding on an unrelated push must not move the date. */
const latest = Math.max(0, ...offers.map((offer) => offer.published));
const updated = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC"
}).format(latest ? new Date(latest * 1000) : new Date());

const template = readFileSync(TEMPLATE, "utf8");
let page = replaceBlock(template, "FILTERS", renderFilters(offers));
page = replaceBlock(page, "CARDS", renderCards(offers, copyIcon(template)));
page = page.replace(/\{\{COUNT\}\}/g, pad(offers.length)).replace(/\{\{UPDATED\}\}/g, updated);

writeFileSync(join(ROOT, "index.html"), page);
console.log(`catalogue: ${offers.length} vehicles, updated ${updated} -> index.html`);
for (const offer of offers) console.log(`  ${offer.slug}  ${offer.title}`);
