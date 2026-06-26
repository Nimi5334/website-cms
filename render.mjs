#!/usr/bin/env node
/**
 * Truck Site Kit — renderer (shared by the build, the live preview, and Publish).
 *
 * Usage (Node):  node truck-site-kit/render.mjs <siteDir>
 *   Reads   <siteDir>/template.html   (static shell with {{PLACEHOLDERS}})
 *           <siteDir>/content/site.json  (or <siteDir>/site.json) — the content model
 *   Writes  <siteDir>/index.html
 *
 * The same pure render(site, template) runs in the browser (CMS preview + the
 * "Publish" button that bakes a finished, self-contained index.html). It is keyed
 * by section `type`, so a new business is "edit content", not "write code".
 * Every client-supplied string is HTML-escaped here, and icon/tag vocabularies are
 * fixed (never raw client HTML), so the content model can never inject script.
 *
 * Adapted from leverage-cms/templates/render.mjs, with three additions for the
 * resale product: a `gallery` section, a CMS-editable hero background image, and a
 * media section that degrades to its poster when no video is set.
 */

/* ------------------------------------------------------------------ */
/* escaping helpers                                                    */
/* ------------------------------------------------------------------ */
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escAttr = (s) => esc(s).replace(/"/g, "&quot;");

// Multiline text -> escaped HTML with <br> for newlines.
const escMultiline = (s) => esc(s).replace(/\n/g, "<br>");

// A CSS url() value for a background image. Data-URIs and our asset paths never
// contain a single quote, so wrapping in '...' is safe inside a style attribute.
const cssUrl = (s) => `url('${String(s ?? "").replace(/'/g, "%27")}')`;

/* ------------------------------------------------------------------ */
/* theme tokens                                                        */
/* ------------------------------------------------------------------ */
function renderTokens(theme) {
  const c = theme.colors || {};
  return [
    `  --bg:${c.bg};`,
    `  --bg-deep:${c.bgDeep};`,
    `  --surface:${c.surface};`,
    `  --ink:${c.ink};`,
    `  --ink-soft:${c.inkSoft};`,
    `  --sage:${c.sage};`,
    `  --sage-deep:${c.sageDeep};`,
    `  --sage-dark:${c.sageDark};`,
    `  --olive:${c.olive};`,
    `  --line:${c.line};`,
    `  --shadow-1:0 1px 3px rgba(38,49,43,.06),0 4px 14px rgba(38,49,43,.06);`,
    `  --shadow-2:0 6px 24px rgba(38,49,43,.10),0 2px 6px rgba(38,49,43,.06);`,
    `  --radius:${theme.radius};`,
    `  --font-head:${theme.fonts.head};`,
    `  --font-body:${theme.fonts.body};`,
    `  --dur-1:200ms; --dur-2:320ms; --dur-3:600ms;`,
    `  --ease-out:cubic-bezier(.22,1,.36,1);`,
    `  --wrap:1120px;`,
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* icon vocabulary (fixed — never client-supplied)                     */
/* ------------------------------------------------------------------ */
const SVG_VEGAN =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 20A7 7 0 0 1 4 13c0-4 3-8 8-10 5 2 8 6 8 10a7 7 0 0 1-7 7h-2z"/></svg>';
const SVG_GF =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 3v18M8 7c0 2 1.8 3.5 4 3.5S16 9 16 7M8 13c0 2 1.8 3.5 4 3.5s4-1.5 4-3.5M4 4l16 16"/></svg>';
const SVG_WAZE =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l19-8-8 19-2.5-7.5L3 11z"/></svg>';
const SVG_INSTAGRAM =
  '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".9" fill="currentColor" stroke="none"/></svg>';
const SVG_FACEBOOK =
  '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>';
const SVG_WHATSAPP =
  '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21l1.7-5A8 8 0 1 1 9 19.5L3 21z"/><path d="M9 9c0 4 2 6 6 6"/></svg>';
const SVG_PHONE =
  '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L20 13l1 4v3a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/></svg>';
const SVG_TIKTOK =
  '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 4c.5 2.5 2 4 4.5 4.2V11c-1.8 0-3.4-.6-4.5-1.5V15a5 5 0 1 1-5-5v2.6A2.4 2.4 0 1 0 12 15V4h3z"/></svg>';

// tag enum -> {cls, label, svg}. Closed set; unknown tags are dropped.
const DIET_TAGS = {
  vegan: { cls: "diet-vegan", label: "טבעוני", svg: SVG_VEGAN },
  "vegan-option": { cls: "diet-vegan", label: "אפשרות טבעונית", svg: SVG_VEGAN },
  gf: { cls: "diet-gf", label: "ללא גלוטן", svg: SVG_GF },
};

const SOCIAL_ICONS = {
  instagram: SVG_INSTAGRAM,
  facebook: SVG_FACEBOOK,
  whatsapp: SVG_WHATSAPP,
  phone: SVG_PHONE,
  tiktok: SVG_TIKTOK,
};

/* ------------------------------------------------------------------ */
/* hours helpers (display table + live-status data are derived)        */
/* ------------------------------------------------------------------ */
const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const pad2 = (n) => (n < 10 ? "0" : "") + n;
const fmtTime = (n) => {
  const h = Math.floor(n);
  const m = Math.round((n - h) * 60);
  return pad2(h) + ":" + pad2(m);
};
const hoursFor = (hours, d) => hours[String(d)] ?? hours[d] ?? null;

function groupHours(hours) {
  const rows = [];
  let i = 0;
  const label = (a, b) => (a === b ? DAY_NAMES[a] : DAY_NAMES[a] + "-" + DAY_NAMES[b]);
  while (i < 7) {
    const h = hoursFor(hours, i);
    let j = i;
    if (!h) {
      while (j + 1 < 7 && !hoursFor(hours, j + 1)) j++;
      rows.push({ label: label(i, j), time: "סגור" });
    } else {
      while (j + 1 < 7) {
        const n = hoursFor(hours, j + 1);
        if (n && n[0] === h[0] && n[1] === h[1]) j++;
        else break;
      }
      rows.push({ label: label(i, j), time: fmtTime(h[0]) + "-" + fmtTime(h[1]) });
    }
    i = j + 1;
  }
  return rows;
}

function hoursLiteral(branches) {
  return (
    "{" +
    branches
      .map((b) => {
        const days = [0, 1, 2, 3, 4, 5, 6]
          .map((d) => {
            const h = hoursFor(b.hours || {}, d);
            return d + ":" + (h ? "[" + h[0] + "," + h[1] + "]" : "null");
          })
          .join(",");
        return JSON.stringify(b.id) + ":{" + days + "}";
      })
      .join(",") +
    "}"
  );
}

/* ------------------------------------------------------------------ */
/* shared fragments                                                    */
/* ------------------------------------------------------------------ */
function dietBadges(tags) {
  if (!Array.isArray(tags)) return "";
  return tags
    .filter((t) => DIET_TAGS[t])
    .map((t) => {
      const d = DIET_TAGS[t];
      return ` <span class="diet ${d.cls}">${d.svg}${esc(d.label)}</span>`;
    })
    .join("");
}

function statusChip(branch) {
  return `<span class="status-chip" data-branch="${escAttr(branch.id)}"><strong>${esc(
    branch.name
  )}</strong><span class="chip-text">בודק שעות…</span></span>`;
}

/* ------------------------------------------------------------------ */
/* section renderers (keyed by type)                                   */
/* ------------------------------------------------------------------ */
function renderHero(s, site) {
  const d = s.data;
  const branches = locationBranches(site);
  const ctas = (d.ctas || [])
    .map(
      (c) =>
        `      <a class="btn btn-${c.style === "ghost" ? "ghost" : "primary"}" href="${escAttr(
          c.href
        )}">${esc(c.label)}</a>`
    )
    .join("\n");
  const chips = branches.map((b) => "      " + statusChip(b)).join("\n");
  // The hero background is now CMS-editable: it rides on a --hero-bg custom
  // property the .hero::before layer reads. No background = a clean color hero.
  const bgStyle = d.background ? ` style="--hero-bg:${cssUrl(d.background)}"` : "";
  return `<section class="hero${d.background ? " has-bg" : ""}" id="${escAttr(
    s.id
  )}" aria-label="${escAttr(site.brand.name)}"${bgStyle}>
  <div class="hero-inner">
    <div class="reveal"><img class="hero-logo" src="${escAttr(d.logo)}" alt="${escAttr(
    d.logoAlt || ""
  )}" width="440" height="220" fetchpriority="high"></div>
    <h1 class="reveal" data-d="1">${escMultiline(d.headline)}</h1>
    <p class="lead reveal" data-d="2">${esc(d.lead)}</p>
    <div class="hero-ctas reveal" data-d="3">
${ctas}
    </div>
    <div class="hero-status reveal" data-d="4" id="statusChips" aria-live="polite">
${chips}
    </div>
    <svg class="sign-string" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"></svg>
  </div>
</section>`;
}

function renderRichtext(s) {
  const d = s.data;
  const paras = (d.paragraphs || []).map((p) => `      <p>${esc(p)}</p>`).join("\n");
  return `<section class="story" id="${escAttr(s.id)}">
  <div class="wrap">
    <div class="story-inner reveal">
      <h2>${esc(d.heading)}</h2>
${paras}
    </div>
  </div>
</section>`;
}

function renderMenu(s) {
  const d = s.data;
  const currency = d.currency || "";
  const pills = (d.categories || [])
    .map(
      (c) =>
        `      <a class="menu-pill" href="#${escAttr(c.id)}">${esc(c.navLabel || c.title)}</a>`
    )
    .join("\n");

  const cats = (d.categories || [])
    .map((c) => {
      const note = c.note ? `\n      <p class="menu-note">${esc(c.note)}</p>` : "";
      const groups = (c.groups || [])
        .map((g) => {
          const sub = g.subhead ? `\n      <p class="menu-sub">${esc(g.subhead)}</p>` : "";
          const items = (g.items || [])
            .map((it) => {
              const name = `<span class="dish-name">${esc(it.name)}${dietBadges(it.tags)}</span>`;
              const price = `<span class="dish-price">${esc(it.price)}${
                currency ? " " + esc(currency) : ""
              }</span>`;
              const top = `<div class="dish-top">${name}<span class="dish-dots" aria-hidden="true"></span>${price}</div>`;
              const desc = it.desc ? `<p class="dish-desc">${esc(it.desc)}</p>` : "";
              return `        <article class="dish">${top}${desc}</article>`;
            })
            .join("\n");
          return `${sub}\n      <div class="menu-grid">\n${items}\n      </div>`;
        })
        .join("\n");
      return `    <div class="menu-cat reveal" id="${escAttr(c.id)}">
      <div class="menu-cat-head"><h3>${esc(c.title)}</h3><span class="rule" aria-hidden="true"></span></div>${note}
${groups}
    </div>`;
    })
    .join("\n\n");

  return `<section id="${escAttr(s.id)}" style="padding-top:clamp(64px,9vw,110px)">
  <div class="wrap section-head reveal">
    <h2>${esc(d.heading)}</h2>
    <p>${esc(d.intro)}</p>
  </div>

  <nav class="menu-nav" aria-label="קטגוריות תפריט">
    <div class="menu-nav-inner" id="menuPills">
${pills}
    </div>
  </nav>

  <div class="wrap">

${cats}

  </div>
</section>`;
}

function renderGallery(s) {
  const d = s.data;
  const figs = (d.images || [])
    .filter((im) => im && im.src)
    .map(
      (im) =>
        `      <figure class="gallery-item reveal"><img src="${escAttr(im.src)}" alt="${escAttr(
          im.alt || ""
        )}" loading="lazy"></figure>`
    )
    .join("\n");
  const head =
    d.heading || d.intro
      ? `    <div class="section-head reveal">
      <h2>${esc(d.heading || "")}</h2>
      ${d.intro ? `<p>${esc(d.intro)}</p>` : ""}
    </div>
`
      : "";
  return `<section class="gallery" id="${escAttr(s.id)}">
  <div class="wrap">
${head}    <div class="gallery-grid">
${figs}
    </div>
  </div>
</section>`;
}

function renderMedia(s) {
  const d = s.data;
  // Degrades gracefully: with a video it autoplays; with only a poster it shows
  // the still image; with neither it renders nothing.
  if (!d.video && !d.poster) return "";
  const source = d.video ? `\n    <source src="${escAttr(d.video)}" type="video/mp4">` : "";
  return `<section class="photo-band reveal" aria-label="${escAttr(d.sectionLabel || "")}">
  <video id="farmScene" autoplay loop muted playsinline preload="auto"
         poster="${escAttr(d.poster || "")}" width="1920" height="1080"
         aria-label="${escAttr(d.videoLabel || "")}" disablepictureinpicture>${source}
  </video>
</section>`;
}

function renderLocations(s) {
  const d = s.data;
  const cards = (d.branches || [])
    .map((b) => {
      const rows = groupHours(b.hours || {})
        .map((r) => `            <tr><td>${esc(r.label)}</td><td>${esc(r.time)}</td></tr>`)
        .join("\n");
      const waze = `https://waze.com/ul?ll=${(b.waze || {}).lat},${(b.waze || {}).lng}&navigate=yes`;
      return `      <article class="loc-card reveal">
        <div class="loc-head">
          <h3>${esc(b.name)}</h3>
          <span class="status-chip" data-branch="${escAttr(b.id)}"><span class="chip-text">…</span></span>
        </div>
        <p class="loc-desc">${esc(b.desc)}</p>
        <table class="hours">
          <caption style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">שעות פעילות ${esc(
            b.name
          )}</caption>
          <tbody>
${rows}
          </tbody>
        </table>
        <div class="loc-actions">
          <a class="btn btn-primary" href="${escAttr(waze)}" target="_blank" rel="noopener">
            ${SVG_WAZE}
            ניווט בוויז ל${esc(b.name)}
          </a>
        </div>
      </article>`;
    })
    .join("\n");

  return `<section class="locations" id="${escAttr(s.id)}">
  <div class="wrap">
    <div class="section-head start reveal">
      <h2>${esc(d.heading)}</h2>
      <p>${esc(d.intro)}</p>
    </div>
    <div class="loc-grid">
${cards}
    </div>
    <p class="hours-note reveal">${esc(d.footnote || "")}</p>
  </div>
</section>`;
}

function renderSocial(s) {
  const d = s.data;
  const links = (d.links || [])
    .map((l) => {
      const icon = SOCIAL_ICONS[l.network] || "";
      return `      <a href="${escAttr(l.url)}" target="_blank" rel="noopener">
        ${icon}
        ${esc(l.label)}
      </a>`;
    })
    .join("\n");
  return `<section id="${escAttr(s.id)}">
  <div class="wrap">
    <div class="section-head reveal">
      <h2>${esc(d.heading)}</h2>
      <p>${esc(d.intro)}</p>
    </div>
    <div class="social-row reveal">
${links}
    </div>
  </div>
</section>`;
}

const RENDERERS = {
  hero: renderHero,
  richtext: renderRichtext,
  menu: renderMenu,
  gallery: renderGallery,
  media: renderMedia,
  locations: renderLocations,
  social: renderSocial,
};

/* ------------------------------------------------------------------ */
/* header / footer                                                     */
/* ------------------------------------------------------------------ */
const NAV_TOGGLE = `    <button class="nav-toggle" id="navToggle" aria-expanded="false" aria-controls="mainNav" aria-label="פתיחת תפריט ניווט">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>`;

function renderHeader(site) {
  const nav = site.nav || { links: [] };
  const links = (nav.links || [])
    .map((l) => `      <a href="${escAttr(l.href)}">${esc(l.label)}</a>`)
    .join("\n");
  const cta = nav.cta && nav.cta.label
    ? `\n      <a class="nav-cta" href="${escAttr(nav.cta.href)}">${esc(nav.cta.label)}</a>`
    : "";
  return `  <div class="wrap header-inner">
    <a class="brand" href="#top" aria-label="${escAttr(site.brand.name)}. חזרה לראש הדף">
      <img src="${escAttr(site.brand.logo)}" alt="" width="120" height="60">
      <span>${esc(site.brand.name)}</span>
    </a>
${NAV_TOGGLE}
    <nav class="main-nav" id="mainNav" aria-label="ניווט ראשי">
${links}${cta}
    </nav>
  </div>`;
}

function renderFooter(site) {
  const f = site.footer || {};
  const links = (f.links || [])
    .map((l) => {
      const ext = l.external ? ' target="_blank" rel="noopener"' : "";
      return `        <a href="${escAttr(l.href)}"${ext}>${esc(l.label)}</a>`;
    })
    .join("\n");
  return `  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <img src="${escAttr(f.logo)}" alt="${escAttr(f.logoAlt || "")}" width="160" height="80" loading="lazy">
      </div>
      <nav class="footer-links" aria-label="קישורי תחתית">
${links}
      </nav>
    </div>
    <div class="footer-bottom">
      <span>© <span id="year">2026</span> ${esc(f.copyright)}</span>
      <span>${esc(f.regions || "")}</span>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* helpers to locate well-known section data                          */
/* ------------------------------------------------------------------ */
function locationBranches(site) {
  const loc = (site.sections || []).find((s) => s.type === "locations");
  return loc ? loc.data.branches || [] : [];
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */
function render(site, template) {
  const visible = (site.sections || []).filter((s) => s.visible !== false);
  const sectionsHtml = visible
    .map((s) => {
      const fn = RENDERERS[s.type];
      if (!fn) {
        console.warn(`[render] unknown section type: ${s.type} (id=${s.id}) — skipped`);
        return "";
      }
      return fn(s, site);
    })
    .filter(Boolean)
    .join("\n\n");

  const branches = locationBranches(site);

  return template
    .replace(/\{\{LANG\}\}/g, escAttr(site.meta.lang || "he"))
    .replace(/\{\{DIR\}\}/g, escAttr(site.meta.dir || "rtl"))
    .replace(/\{\{THEME_COLOR\}\}/g, escAttr(site.meta.themeColor || "#ffffff"))
    .replace(/\{\{TITLE\}\}/g, esc(site.meta.title))
    .replace(/\{\{DESCRIPTION\}\}/g, escAttr(site.meta.description || ""))
    .replace(/\{\{FAVICON\}\}/g, escAttr(site.meta.favicon || ""))
    .replace(/\{\{FONTS_HREF\}\}/g, escAttr(site.meta.fontsHref || ""))
    .replace("{{TOKENS}}", renderTokens(site.theme))
    .replace("{{HEADER}}", renderHeader(site))
    .replace("{{SECTIONS}}", sectionsHtml)
    .replace("{{FOOTER}}", renderFooter(site))
    .replace("{{HOURS_JSON}}", hoursLiteral(branches));
}

async function main() {
  const { readFileSync, writeFileSync, existsSync } = await import("node:fs");
  const { join, resolve, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const siteDir = process.argv[2];
  if (!siteDir) {
    console.error("Usage: node render.mjs <siteDir>");
    process.exit(1);
  }
  const dir = resolve(process.cwd(), siteDir);
  // template.html may live in the site dir (per-customer copy) or, in this kit,
  // be the shared one next to render.mjs at the kit root.
  const kitRoot = dirname(fileURLToPath(import.meta.url));
  const templatePath = existsSync(join(dir, "template.html"))
    ? join(dir, "template.html")
    : join(kitRoot, "template.html");
  const template = readFileSync(templatePath, "utf8");
  const contentPath = existsSync(join(dir, "content", "site.json"))
    ? join(dir, "content", "site.json")
    : join(dir, "site.json");
  const site = JSON.parse(readFileSync(contentPath, "utf8"));
  const html = render(site, template);
  writeFileSync(join(dir, "index.html"), html, "utf8");
  console.log(`[render] wrote ${join(siteDir, "index.html")} (${html.length} bytes, template: ${templatePath === join(dir, "template.html") ? "local" : "kit"})`);
}

// Run main() only under Node CLI; stay inert when imported in the browser.
if (typeof process !== "undefined" && process.argv && process.argv[1]?.endsWith("render.mjs")) {
  main();
}

export { render, renderTokens, groupHours, hoursLiteral };
