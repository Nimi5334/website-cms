/**
 * Truck Site Kit — CMS "Flight Deck" (vanilla JS, no backend).
 *
 * Layout: icon rail (right) · stage (stat strip + content + action bar) · live viewport (left).
 * Sections are a dense table; clicking a row opens a side drawer with that section's editor.
 * Everything autosaves to localStorage. Publish pushes a self-contained index.html to GitHub.
 */
import { SITE_ID, STORAGE_KEY, starterContentUrl, templateUrl, EDIT_PASSWORD } from "./config.js";
import {
  FONT_CHOICES, COLOR_LABELS, TAG_OPTIONS, SOCIAL_OPTIONS,
  SECTION_LABELS, ADDABLE_SECTIONS, DAY_NAMES, LABELS as L,
} from "./schema.js";

/* ---------------- DOM helper ---------------- */
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (v === true) n.setAttribute(k, "");
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return n;
}
const $app = document.getElementById("app");
const rid = (p) => p + "-" + Math.random().toString(36).slice(2, 7);
const clone = (o) => JSON.parse(JSON.stringify(o));

/* ---------------- icons (1.6 stroke, one family) ---------------- */
const ICON = {
  home:    "M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3v-5H7v5H4a1 1 0 0 1-1-1z",
  palette: "M10 17a7 7 0 1 1 7-7c0 1.7-1.3 2-2.5 2H13a1.5 1.5 0 0 0-1 2.6A1.5 1.5 0 0 1 10 17zM6.5 8.5h.01M9.5 6h.01M13.5 7.5h.01",
  menu:    "M3 5.5h14M3 10h14M3 14.5h9",
  layers:  "m10 2.5 7.5 4-7.5 4-7.5-4zM2.5 11l7.5 4 7.5-4M2.5 14.5l7.5 4 7.5-4",
  anchor:  "M10 6.5v11M10 6.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM3.5 12a6.5 6.5 0 0 0 13 0M3.5 12H6M16.5 12H14",
  eye:     "M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10z M10 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z",
  clock:   "M10 17.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM10 5.8V10l2.8 1.7",
  upload:  "M10 13V3.5M6.5 7 10 3.5 13.5 7M3.5 13v2.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V13",
  search:  "M9 15A6 6 0 1 0 9 3a6 6 0 0 0 0 12zM17 17l-3.7-3.7",
};
function icon(name, cls = "") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.6");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  if (cls) svg.setAttribute("class", cls);
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", ICON[name] || "");
  svg.append(p);
  return svg;
}

/* ---------------- state ---------------- */
const state = {
  site: null,
  dirty: false,
  busy: false,
  unlocked: !EDIT_PASSWORD,
  view: "sections",
};

/* ---------------- persistence ---------------- */
function loadDraft() {
  const s = localStorage.getItem(STORAGE_KEY);
  if (s) { try { return JSON.parse(s); } catch {} }
  return null;
}
function saveDraft(site) { localStorage.setItem(STORAGE_KEY, JSON.stringify(site)); }
async function loadStarter() {
  const res = await fetch(starterContentUrl() + "?bust=" + Date.now());
  if (!res.ok) throw new Error("starter " + res.status);
  return res.json();
}

/* ---------------- status chip ---------------- */
let $status;
function setStatus(msg, kind = "") {
  if ($status) { $status.textContent = msg || ""; $status.className = "chip " + kind; }
}

/* ---------------- soft lock ---------------- */
function renderLogin(errMsg) {
  const pw = el("input", { type: "password", autofocus: true });
  const msg = el("p", { class: "chip err", style: "margin-top:8px" }, errMsg || "");
  const form = el("form", {
    onsubmit: (e) => {
      e.preventDefault();
      if (pw.value === EDIT_PASSWORD) { state.unlocked = true; boot(); }
      else { msg.textContent = "סיסמה שגויה."; }
    },
  },
    el("label", { style: "font-size:.78rem;color:var(--ink-2)" }, L.password),
    pw,
    el("button", { class: "btn btn-primary", style: "width:100%" }, L.signin),
    msg);
  $app.replaceChildren(el("div", { class: "login-wrap" },
    el("div", { class: "login-card" }, el("h1", {}, L.open_title), el("p", {}, L.open_sub), form)));
  pw.focus();
}

/* ---------------- boot ---------------- */
async function boot() {
  if (!state.unlocked) { renderLogin(); return; }
  try {
    state.site = loadDraft() || await loadStarter();
    state.dirty = false;
    renderDeck();
  } catch (err) {
    console.error("Boot error:", err);
    $app.replaceChildren(el("div", { class: "login-wrap" },
      el("div", { class: "login-card" },
        el("p", {}, "שגיאה בטעינת התוכן: " + err.message),
        el("p", { style: "color:var(--ink-3);font-size:.8rem;margin-top:8px" },
          "ודאו שהקובץ starter/site.json קיים ושהעורך מוגש משרת (לא file://)."))));
  }
}

/* ---------------- autosave + dirty ---------------- */
let previewDebounce, autosaveT;
function markDirty() {
  state.dirty = true;
  setStatus("שומר…", "warn");
  clearTimeout(autosaveT);
  autosaveT = setTimeout(() => {
    try { saveDraft(state.site); state.dirty = false; setStatus("נשמר ✓", "ok"); }
    catch (err) { setStatus("שמירה נכשלה", "err"); }
  }, 700);
  clearTimeout(previewDebounce);
  previewDebounce = setTimeout(() => { refreshStats(); if (previewOn) refreshPreview(); }, 420);
}

/* ---------------- version history ---------------- */
const VERSIONS_KEY = STORAGE_KEY + ":versions";
function loadVersions() {
  try { return JSON.parse(localStorage.getItem(VERSIONS_KEY)) || []; } catch { return []; }
}
function pushVersion(label) {
  try {
    const v = loadVersions();
    v.unshift({ t: Date.now(), label, site: clone(state.site) });
    if (v.length > 12) v.length = 12;
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(v));
  } catch {}
}
function showVersions() {
  const versions = loadVersions();
  const scrim = el("div", { class: "scrim", onclick: close });
  const list = el("div", { class: "vlist" });
  function close() { scrim.remove(); modal.remove(); }
  if (!versions.length) list.append(el("div", { class: "empty" }, "אין עדיין גרסאות. גרסה נשמרת בכל פרסום."));
  versions.forEach((v) => {
    const d = new Date(v.t);
    list.append(el("div", { class: "vitem" },
      el("div", {},
        el("div", { class: "vt" }, v.label || "גרסה"),
        el("div", { class: "vd" }, d.toLocaleDateString("he-IL") + " · " + d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }))),
      el("button", { class: "btn btn-sm", onclick: () => {
        if (!confirm("לשחזר את הגרסה הזו? המצב הנוכחי יישמר גם הוא כגרסה.")) return;
        pushVersion("לפני שחזור");
        state.site = clone(v.site);
        saveDraft(state.site);
        close(); renderDeck();
        setStatus("שוחזר ✓", "ok");
      } }, "שחזור")));
  });
  const modal = el("div", { class: "modal" },
    el("div", { class: "modal-head" }, el("span", {}, "היסטוריית גרסאות"),
      el("button", { class: "btn btn-sm", onclick: close }, "סגירה")),
    list);
  document.body.append(scrim, modal);
}

/* ---------------- deck shell ---------------- */
const VIEWS = [
  { key: "sections", label: "אזורים",  icon: "layers"  },
  { key: "general",  label: "כללי",    icon: "home"    },
  { key: "theme",    label: "עיצוב",   icon: "palette" },
  { key: "nav",      label: "תפריט",   icon: "menu"    },
  { key: "footer",   label: "פוטר",    icon: "anchor"  },
];

let $previewFrame = null, $content = null, $statsEl = null, $rail = null;

function renderDeck() {
  const site = state.site;
  $status = el("div", { class: "chip" });

  /* rail */
  $rail = el("aside", { class: "rail" });
  buildRail();

  /* topline */
  const search = el("input", { type: "text", placeholder: "חיפוש מהיר… (שם מנה, סניף, כותרת)" });
  const results = el("div", { class: "cmd-results hide" });
  search.addEventListener("input", () => runSearch(search.value, results));
  search.addEventListener("blur", () => setTimeout(() => results.classList.add("hide"), 180));
  search.addEventListener("focus", () => { if (search.value) runSearch(search.value, results); });
  const cmd = el("div", { class: "cmd" }, icon("search"), search, results);

  const topline = el("div", { class: "topline" },
    el("span", { class: "brandline" }, el("b", {}, "•"), " ", site.brand?.name || SITE_ID),
    el("span", { class: "sp" }),
    cmd,
    el("span", { class: "sp" }),
    $status,
    el("button", { class: "btn btn-sm", onclick: importFromFile, title: "טעינת אתר קיים" }, "ייבוא"),
    el("button", { class: "btn btn-sm", onclick: showVersions }, "היסטוריה"));

  /* stats */
  $statsEl = el("div", { class: "stats" });

  /* content */
  $content = el("div", { class: "content" });

  /* action bar */
  const actionbar = el("div", { class: "actionbar" },
    el("button", { class: "btn btn-primary", onclick: publishToGitHub }, "פרסום לאינטרנט"),
    el("button", { class: "btn", onclick: downloadFile }, "הורדת קובץ"),
    el("span", { class: "note" }, "השינויים נשמרים אוטומטית · פרסום מעדכן את האתר החי"));

  const stage = el("main", { class: "stage" }, topline, $statsEl, $content, actionbar);

  /* viewport */
  const vpBar = el("div", { class: "vp-bar" },
    el("span", { class: "lbl" }, "תצוגה חיה"),
    el("button", { class: "dev-btn on", onclick: (e) => setDevice(e.currentTarget, false) }, "מחשב"),
    el("button", { class: "dev-btn", onclick: (e) => setDevice(e.currentTarget, true) }, "נייד"));
  const viewport = el("section", { class: "viewport" + (previewOn ? "" : " hide") },
    vpBar, el("div", { class: "vp-frame" }, el("iframe", { title: "preview" })));
  $previewFrame = viewport.querySelector("iframe");

  $app.replaceChildren(el("div", { class: "deck" }, $rail, stage, viewport));
  renderView();
  refreshStats();
  if (previewOn) refreshPreview();
}

function buildRail() {
  $rail.replaceChildren(el("div", { class: "rail-mark" }, "ניהול"));
  for (const v of VIEWS) {
    $rail.append(el("button", {
      class: "rail-btn" + (state.view === v.key ? " on" : ""),
      onclick: () => { state.view = v.key; buildRail(); renderView(); },
    }, icon(v.icon), el("span", {}, v.label)));
  }
  $rail.append(el("div", { class: "rail-sep" }));
  $rail.append(el("button", {
    class: "rail-btn" + (previewOn ? " on" : ""),
    onclick: togglePreview,
  }, icon("eye"), el("span", {}, "תצוגה")));
}

function setDevice(btn, mobile) {
  const vp = document.querySelector(".viewport");
  if (!vp) return;
  vp.classList.toggle("mob", mobile);
  vp.querySelectorAll(".dev-btn").forEach((b) => b.classList.toggle("on", b === btn));
}

function renderView() {
  if (!$content) return;
  const site = state.site;
  $content.replaceChildren();
  switch (state.view) {
    case "sections": $content.append(sectionsTable(site)); break;
    case "general":  $content.append(el("div", { class: "pad" }, ...panelGeneral(site))); break;
    case "theme":    $content.append(el("div", { class: "pad" }, ...panelTheme(site)));   break;
    case "nav":      $content.append(el("div", { class: "pad" }, ...panelNav(site)));     break;
    case "footer":   $content.append(el("div", { class: "pad" }, ...panelFooter(site)));  break;
  }
}

/* ---------------- stat strip ---------------- */
function countImages(o, seen = 0) {
  if (typeof o === "string") return /^data:image/.test(o) ? seen + 1 : seen;
  if (Array.isArray(o)) return o.reduce((n, v) => countImages(v, n), seen);
  if (o && typeof o === "object") return Object.values(o).reduce((n, v) => countImages(v, n), seen);
  return seen;
}
function sectionStatus(s) {
  if (s.visible === false) return "off";
  const d = s.data || {};
  const empty =
    (s.type === "hero"      && !d.headline) ||
    (s.type === "richtext"  && !(d.paragraphs || []).filter(Boolean).length) ||
    (s.type === "menu"      && !(d.categories || []).length) ||
    (s.type === "gallery"   && !(d.images || []).length) ||
    (s.type === "media"     && !d.poster && !d.video) ||
    (s.type === "locations" && !(d.branches || []).length) ||
    (s.type === "social"    && !(d.links || []).length);
  return empty ? "warn" : "ok";
}
function sectionCount(s) {
  const d = s.data || {};
  switch (s.type) {
    case "menu":      return (d.categories || []).reduce((n, c) => n + (c.groups || []).reduce((m, g) => m + (g.items || []).length, 0), 0);
    case "gallery":   return (d.images || []).length;
    case "locations": return (d.branches || []).length;
    case "social":    return (d.links || []).length;
    case "richtext":  return (d.paragraphs || []).length;
    case "hero":      return (d.ctas || []).length;
    default:          return 0;
  }
}
function sectionName(s) {
  const d = s.data || {};
  return (d.heading || d.headline || SECTION_LABELS[s.type] || s.type).split("\n")[0];
}

function refreshStats() {
  if (!$statsEl) return;
  const secs = state.site.sections || [];
  const needs = secs.filter((s) => sectionStatus(s) === "warn").length;
  const imgs = countImages(state.site);

  // Sparkline built from real content volume per section — not decoration.
  const vals = secs.map(sectionCount);
  const max = Math.max(1, ...vals);
  const w = 108, h = 26;
  const pts = vals.length > 1
    ? vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(" ")
    : `0,${h - 2} ${w},${h - 2}`;
  const spark = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">
    <polyline points="${pts}" stroke="#3D8BFF" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;

  $statsEl.replaceChildren(
    el("div", { class: "stat" }, el("span", { class: "k" }, "אזורי תוכן"), el("span", { class: "v blue" }, String(secs.length))),
    el("div", { class: "stat" }, el("span", { class: "k" }, "תמונות"), el("span", { class: "v" }, String(imgs))),
    el("div", { class: "stat" }, el("span", { class: "k" }, "דורש השלמה"), el("span", { class: "v" + (needs ? " amber" : "") }, String(needs))),
    el("div", { class: "spark", html: spark }));
}

/* ---------------- sections table ---------------- */
function sectionsTable(site) {
  site.sections = site.sections || [];
  const wrap = el("div", {});
  const table = el("div", { class: "dtable" });

  function draw() {
    table.replaceChildren();
    if (!site.sections.length) table.append(el("div", { class: "empty" }, "אין עדיין אזורי תוכן. הוסיפו אזור למטה."));
    site.sections.forEach((s, i) => {
      const st = sectionStatus(s);
      const n = sectionCount(s);
      const row = el("div", {
        class: "drow st-" + st,
        onclick: (e) => { if (!e.target.closest(".dots")) openSectionDrawer(s, draw); },
      },
        el("span", { class: "nm" }, sectionName(s)),
        el("span", { class: "tag" }, SECTION_LABELS[s.type] || s.type),
        el("span", { class: "num" }, n ? String(n) : "—"),
        el("button", { class: "dots", onclick: (e) => { e.stopPropagation(); rowMenu(e.currentTarget, s, i, draw); } }, "⋯"));
      table.append(row);
    });
  }
  draw();

  const sel = el("select", {});
  ADDABLE_SECTIONS.forEach((t) => sel.append(el("option", { value: t }, SECTION_LABELS[t] || t)));
  const adder = el("div", { class: "pad" },
    el("div", { class: "row", style: "align-items:center" },
      el("div", { class: "field", style: "margin:0" }, sel),
      el("button", { class: "btn btn-primary", style: "flex:0 0 auto", onclick: () => {
        const s = defaultSection(sel.value);
        site.sections.push(s); draw(); markDirty(); openSectionDrawer(s, draw);
      } }, "הוספת אזור")));

  wrap.append(el("div", { class: "sec-title" }, "אזורי התוכן של האתר — לחצו על שורה לעריכה"), table, adder);
  return wrap;
}

function rowMenu(anchor, s, i, redraw) {
  document.querySelector(".rowmenu")?.remove();
  const r = anchor.getBoundingClientRect();
  const sections = state.site.sections;
  const menu = el("div", { class: "rowmenu", style: `top:${r.bottom + 4}px; left:${r.left}px` },
    el("button", { onclick: () => { s.visible = s.visible === false; close(); redraw(); markDirty(); } },
      s.visible === false ? "הצגה באתר" : "הסתרה מהאתר"),
    el("button", { disabled: i === 0, onclick: () => { move(sections, i, -1); close(); redraw(); markDirty(); } }, "העלאה למעלה"),
    el("button", { disabled: i === sections.length - 1, onclick: () => { move(sections, i, 1); close(); redraw(); markDirty(); } }, "הורדה למטה"),
    el("button", { onclick: () => { const c = clone(s); c.id = rid(s.type); sections.splice(i + 1, 0, c); close(); redraw(); markDirty(); } }, "שכפול"),
    el("button", { class: "danger", onclick: () => { if (confirm("למחוק את האזור?")) { sections.splice(i, 1); close(); redraw(); markDirty(); } } }, "מחיקה"));
  function close() { menu.remove(); document.removeEventListener("click", onDoc, true); }
  function onDoc(e) { if (!menu.contains(e.target)) close(); }
  document.body.append(menu);
  setTimeout(() => document.addEventListener("click", onDoc, true), 0);
}

/* ---------------- drawer ---------------- */
function openDrawer({ title, body, onCancel, onDone }) {
  const scrim = el("div", { class: "scrim", onclick: () => cancel() });
  const pill = el("span", { class: "chip", style: "display:none" }, "שינויים שלא נשמרו");

  // While the drawer is open, dirty marks light the amber pill.
  const prevMark = window.__cmsMark;
  window.__cmsMark = () => { pill.className = "chip warn"; pill.style.display = ""; };

  const drawer = el("aside", { class: "drawer" },
    el("div", { class: "dw-head" }, el("h2", {}, title), pill),
    el("div", { class: "dw-body" }, body),
    el("div", { class: "dw-foot" },
      el("button", { class: "btn btn-primary", onclick: () => done() }, "שמירה"),
      el("button", { class: "btn btn-ghost", onclick: () => cancel() }, "ביטול")));

  function teardown() {
    window.__cmsMark = prevMark;
    scrim.remove(); drawer.remove();
    document.removeEventListener("keydown", onKey);
  }
  function done()   { teardown(); onDone && onDone(); }
  function cancel() { teardown(); onCancel && onCancel(); }
  function onKey(e) { if (e.key === "Escape") cancel(); }

  document.addEventListener("keydown", onKey);
  document.body.append(scrim, drawer);
}

function openSectionDrawer(s, redraw) {
  const before = clone(s);
  openDrawer({
    title: sectionName(s),
    body: el("div", {}, sectionEditor(s)),
    onDone: () => { saveDraft(state.site); redraw(); refreshStats(); if (previewOn) refreshPreview(); setStatus("נשמר ✓", "ok"); },
    onCancel: () => {
      Object.keys(s).forEach((k) => delete s[k]);
      Object.assign(s, before);
      saveDraft(state.site); redraw(); refreshStats(); if (previewOn) refreshPreview();
      setStatus("השינויים בוטלו", "");
    },
  });
}

/* ---------------- quick search ---------------- */
function collectIndex() {
  const out = [];
  const site = state.site;
  (site.sections || []).forEach((s) => {
    const d = s.data || {};
    const push = (label, ctx) => out.push({ label, ctx, section: s });
    push(sectionName(s), SECTION_LABELS[s.type] || s.type);
    (d.categories || []).forEach((c) => {
      push(c.title || "קטגוריה", "קטגוריה בתפריט");
      (c.groups || []).forEach((g) => (g.items || []).forEach((it) => push(it.name || "מנה", "מנה · " + (c.title || ""))));
    });
    (d.branches || []).forEach((b) => push(b.name || "סניף", "סניף"));
    (d.links || []).forEach((l) => push(l.label || l.network || "קישור", "רשת חברתית"));
    (d.images || []).forEach((im, i) => push(im.alt || `תמונה ${i + 1}`, "גלריה"));
  });
  return out;
}
function runSearch(q, box) {
  q = (q || "").trim();
  if (q.length < 2) { box.classList.add("hide"); return; }
  const hits = collectIndex().filter((h) => h.label.includes(q)).slice(0, 8);
  box.replaceChildren();
  if (!hits.length) { box.append(el("div", { class: "empty", style: "padding:16px" }, "לא נמצאו תוצאות")); }
  hits.forEach((h) => box.append(el("button", {
    class: "cmd-hit",
    onclick: () => {
      box.classList.add("hide");
      state.view = "sections"; buildRail(); renderView();
      openSectionDrawer(h.section, () => renderView());
    },
  }, el("span", {}, h.label), el("em", {}, h.ctx))));
  box.classList.remove("hide");
}

/* ---------------- field builders ---------------- */
function bump() { markDirty(); if (window.__cmsMark) window.__cmsMark(); }

function textField(obj, key, label, opts = {}) {
  const id = "f_" + Math.random().toString(36).slice(2);
  const input = opts.area ? el("textarea", { id, rows: opts.rows || 3 }) : el("input", { type: "text", id });
  input.value = obj[key] ?? "";
  if (opts.placeholder) input.setAttribute("placeholder", opts.placeholder);
  input.addEventListener("input", () => { obj[key] = input.value; bump(); if (opts.onInput) opts.onInput(); });
  return el("div", { class: "field" + (opts.mono ? " mono-field" : "") },
    el("label", { for: id }, label), input,
    opts.hint ? el("div", { class: "hint" }, opts.hint) : null);
}
function selectField(obj, key, label, options) {
  const sel = el("select", {});
  for (const o of options) {
    const opt = el("option", { value: o.value }, o.label);
    if (obj[key] === o.value) opt.selected = true;
    sel.append(opt);
  }
  sel.addEventListener("change", () => { obj[key] = sel.value; bump(); });
  return el("div", { class: "field" }, el("label", {}, label), sel);
}
function colorField(obj, key, label) {
  const input = el("input", { type: "color", value: toHex6(obj[key] || "#ffffff") });
  input.style.cssText = "width:40px;height:32px;border:none;background:none;padding:0;border-radius:6px;cursor:pointer";
  input.addEventListener("input", () => { obj[key] = input.value; bump(); });
  return el("div", { class: "field" }, el("label", {}, label), input);
}
function numField(obj, key, label) {
  const input = el("input", { type: "text", value: obj[key] ?? "" });
  input.addEventListener("input", () => {
    const v = input.value.trim();
    obj[key] = v === "" ? null : parseFloat(v);
    bump();
  });
  return el("div", { class: "field mono-field" }, el("label", {}, label), input);
}
function checkbox(obj, key, defaultTrue = false) {
  const cb = el("input", { type: "checkbox" });
  cb.checked = obj[key] == null ? defaultTrue : !!obj[key];
  cb.addEventListener("change", () => { obj[key] = cb.checked; bump(); });
  return cb;
}
function imageField(obj, key, label, hint) {
  const thumb = el("img", { class: "thumb", alt: "" });
  const setThumb = () => { thumb.src = obj[key] ? resolveAssetForPreview(obj[key]) : ""; };
  setThumb();
  const file = el("input", { type: "file", accept: "image/*", style: "display:none" });
  const upBtn = el("button", { class: "btn btn-sm", type: "button", onclick: () => file.click() }, "העלאה");
  const clr = el("button", { class: "btn btn-sm btn-danger", type: "button", title: "הסרה",
    onclick: () => { obj[key] = ""; setThumb(); bump(); } }, "✕");
  file.addEventListener("change", async () => {
    if (!file.files[0]) return;
    upBtn.disabled = true; upBtn.textContent = "מעלה…";
    try {
      obj[key] = await uploadImage(file.files[0]);
      setThumb(); bump(); setStatus("תמונה נטענה ✓", "ok");
    } catch (err) { setStatus("העלאה נכשלה", "err"); }
    finally { upBtn.disabled = false; upBtn.textContent = "העלאה"; }
  });
  return el("div", { class: "field" },
    el("label", {}, label),
    el("div", { style: "display:flex;gap:8px;align-items:center" }, thumb, upBtn, obj[key] ? clr : null, file),
    hint ? el("div", { class: "hint" }, hint) : null);
}
function videoField(obj, key, label) {
  const file = el("input", { type: "file", accept: "video/*", style: "display:none" });
  const upBtn = el("button", { class: "btn btn-sm", type: "button", onclick: () => file.click() }, "העלאת וידאו");
  const st = el("div", { class: "hint" }, obj[key] ? "וידאו הוטמע ✓" : "אין וידאו");
  file.addEventListener("change", async () => {
    const f = file.files[0];
    if (!f) return;
    upBtn.disabled = true; upBtn.textContent = "טוען…";
    try {
      obj[key] = await fileToDataURL(f);
      st.textContent = "וידאו הוטמע ✓" + (f.size > 8e6 ? ` (${Math.round(f.size / 1048576)}MB — כבד, מומלץ עד 8MB)` : "");
      bump();
    } catch { setStatus("טעינת וידאו נכשלה", "err"); }
    finally { upBtn.disabled = false; upBtn.textContent = "העלאת וידאו"; }
  });
  return el("div", { class: "field" }, el("label", {}, label),
    el("div", { style: "display:flex;gap:8px;align-items:center" }, upBtn, file), st);
}

/* ---------------- repeater ---------------- */
function repeater(arr, { title, make, render, addLabel }) {
  const wrap = el("div", {});
  function draw() {
    wrap.replaceChildren();
    arr.forEach((item, i) => {
      wrap.append(el("div", { class: "rep-item" },
        el("div", { class: "rep-head" },
          el("span", { class: "grip" }, title ? title(item, i) : `#${i + 1}`),
          el("div", { class: "icon-btns" },
            el("button", { class: "btn btn-sm", type: "button", disabled: i === 0, onclick: () => { move(arr, i, -1); draw(); bump(); } }, "↑"),
            el("button", { class: "btn btn-sm", type: "button", disabled: i === arr.length - 1, onclick: () => { move(arr, i, 1); draw(); bump(); } }, "↓"),
            el("button", { class: "btn btn-sm btn-danger", type: "button", onclick: () => { arr.splice(i, 1); draw(); bump(); } }, "✕"))),
        el("div", { class: "rep-body" }, render(item, i))));
    });
    wrap.append(el("button", { class: "btn btn-add", type: "button", onclick: () => { arr.push(make()); draw(); bump(); } }, "+ " + (addLabel || L.add)));
  }
  draw();
  return wrap;
}
function move(arr, i, dir) { const j = i + dir; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }

/* ---------------- panels (return arrays of nodes) ---------------- */
function group(titleText, ...body) {
  return [el("div", { class: "sec-title", style: "padding:0;margin:0 0 10px" }, titleText), ...body];
}

function panelGeneral(site) {
  site.brand = site.brand || {}; site.meta = site.meta || {};
  return [
    ...group("זהות העסק",
      textField(site.brand, "name", "שם העסק"),
      imageField(site.brand, "logo", "לוגו")),
    ...group("איך האתר מופיע בגוגל ובלשונית",
      textField(site.meta, "title", "כותרת הדף"),
      textField(site.meta, "description", "תיאור לגוגל", { area: true, rows: 2 }),
      el("div", { class: "row" },
        imageField(site.meta, "favicon", "אייקון האתר", "קובץ קטן, רצוי SVG או PNG"),
        colorField(site.meta, "themeColor", "צבע דפדפן"))),
  ];
}

function panelTheme(site) {
  site.theme = site.theme || { colors: {}, fonts: {} };
  const colors = site.theme.colors || (site.theme.colors = {});
  const swatches = el("div", { class: "swatch-grid" },
    ...Object.keys(COLOR_LABELS).map((key) => {
      const input = el("input", { type: "color", value: toHex6(colors[key] || "#000000") });
      input.addEventListener("input", () => { colors[key] = input.value; bump(); });
      return el("div", { class: "swatch" }, input, el("span", { class: "sw-label" }, COLOR_LABELS[key]));
    }));
  const fontOpts = FONT_CHOICES.map((f) => ({ value: f.family, label: f.label }));
  site.theme.fonts = site.theme.fonts || {};
  const headSel = selectField(site.theme.fonts, "head", "גופן כותרות", fontOpts);
  const bodySel = selectField(site.theme.fonts, "body", "גופן טקסט", fontOpts);
  const sync = () => { site.meta.fontsHref = buildFontsHref(site.theme.fonts); bump(); };
  headSel.querySelector("select").addEventListener("change", sync);
  bodySel.querySelector("select").addEventListener("change", sync);
  return [
    ...group("צבעי האתר", swatches),
    ...group("גופנים", el("div", { class: "row" }, headSel, bodySel),
      textField(site.theme, "radius", "עיגול פינות", { hint: "לדוגמה 14px", mono: true })),
  ];
}

function panelNav(site) {
  site.nav = site.nav || { links: [] };
  site.nav.links = site.nav.links || [];
  site.nav.cta = site.nav.cta || { label: "", href: "#" };
  return [
    ...group("קישורים בתפריט העליון",
      repeater(site.nav.links, {
        title: (l) => l.label || "קישור",
        make: () => ({ label: "קישור חדש", href: "#" }),
        render: (l) => el("div", { class: "row" }, textField(l, "label", "טקסט"), textField(l, "href", "יעד")),
      })),
    ...group("כפתור בולט (לא חובה)",
      el("div", { class: "row" }, textField(site.nav.cta, "label", "טקסט"), textField(site.nav.cta, "href", "יעד"))),
  ];
}

function panelFooter(site) {
  site.footer = site.footer || { links: [] };
  site.footer.links = site.footer.links || [];
  return [
    ...group("תחתית האתר",
      imageField(site.footer, "logo", "לוגו בתחתית"),
      textField(site.footer, "copyright", "זכויות יוצרים"),
      textField(site.footer, "regions", "טקסט נוסף")),
    ...group("קישורים בתחתית",
      repeater(site.footer.links, {
        title: (l) => l.label || "קישור",
        make: () => ({ label: "קישור", href: "#" }),
        render: (l) => el("div", {},
          el("div", { class: "row" }, textField(l, "label", "טקסט"), textField(l, "href", "יעד")),
          el("label", { class: "toggle" }, checkbox(l, "external"), "נפתח בלשונית חדשה")),
      })),
  ];
}

/* ---------------- section editors ---------------- */
function sectionEditor(s) {
  const d = s.data = s.data || {};
  const visRow = el("label", { class: "toggle", style: "margin-bottom:14px" }, checkbox(s, "visible", true), "האזור מוצג באתר");

  switch (s.type) {
    case "hero":
      d.ctas = d.ctas || [];
      return el("div", {}, visRow,
        textField(d, "headline", "כותרת ראשית", { area: true, rows: 2, hint: "שורה חדשה = מעבר שורה" }),
        textField(d, "lead", "תת-כותרת", { area: true, rows: 2 }),
        imageField(d, "background", "תמונת רקע", "ריק = רקע נקי בצבע"),
        imageField(d, "logo", "לוגו"),
        el("div", { class: "sec-title", style: "padding:0;margin:16px 0 8px" }, "כפתורים"),
        repeater(d.ctas, {
          title: (c) => c.label || "כפתור",
          make: () => ({ label: "כפתור", href: "#", style: "primary" }),
          render: (c) => el("div", {},
            el("div", { class: "row" }, textField(c, "label", "טקסט"), textField(c, "href", "יעד")),
            selectField(c, "style", "סגנון", [{ value: "primary", label: "בולט" }, { value: "ghost", label: "מתאר" }])),
        }));

    case "richtext":
      d.paragraphs = d.paragraphs || [];
      return el("div", {}, visRow,
        textField(d, "heading", "כותרת"),
        el("div", { class: "sec-title", style: "padding:0;margin:16px 0 8px" }, "פסקאות"),
        repeater(d.paragraphs, {
          title: (_p, i) => `פסקה ${i + 1}`,
          make: () => "",
          render: (_p, i) => {
            const ta = el("textarea", { rows: 3 });
            ta.value = d.paragraphs[i];
            ta.addEventListener("input", () => { d.paragraphs[i] = ta.value; bump(); });
            return el("div", { class: "field" }, ta);
          },
        }));

    case "menu":      return el("div", {}, visRow, menuEditor(d));
    case "locations": return el("div", {}, visRow, locationsEditor(d));

    case "gallery":
      d.images = d.images || [];
      return el("div", {}, visRow,
        textField(d, "heading", "כותרת"),
        textField(d, "intro", "טקסט פתיחה", { area: true, rows: 2 }),
        el("div", { class: "sec-title", style: "padding:0;margin:16px 0 8px" }, "תמונות"),
        repeater(d.images, {
          title: (im, i) => im.alt || `תמונה ${i + 1}`,
          make: () => ({ src: "", alt: "" }),
          addLabel: "הוספת תמונה",
          render: (im) => el("div", {}, imageField(im, "src", "תמונה"), textField(im, "alt", "תיאור (נגישות)")),
        }));

    case "media":
      return el("div", {}, visRow,
        imageField(d, "poster", "תמונת פתיחה"),
        videoField(d, "video", "וידאו (לא חובה)"),
        textField(d, "sectionLabel", "תיאור האזור (נגישות)"),
        textField(d, "videoLabel", "תיאור הוידאו (נגישות)"));

    case "social":
      d.links = d.links || [];
      return el("div", {}, visRow,
        textField(d, "heading", "כותרת"),
        textField(d, "intro", "טקסט", { area: true, rows: 2 }),
        repeater(d.links, {
          title: (l) => l.label || l.network,
          make: () => ({ network: "instagram", label: "", url: "https://" }),
          render: (l) => el("div", {},
            selectField(l, "network", "רשת", SOCIAL_OPTIONS),
            el("div", { class: "row" }, textField(l, "label", "טקסט"), textField(l, "url", "קישור"))),
        }));

    default:
      return el("div", { class: "empty" }, "אזור מסוג זה אינו נתמך לעריכה.");
  }
}

function menuEditor(d) {
  d.categories = d.categories || [];
  return el("div", {},
    textField(d, "heading", "כותרת התפריט"),
    textField(d, "intro", "טקסט פתיחה", { area: true, rows: 2 }),
    textField(d, "currency", "מטבע", { hint: "₪", mono: true }),
    el("div", { class: "sec-title", style: "padding:0;margin:16px 0 8px" }, "קטגוריות ומנות"),
    repeater(d.categories, {
      title: (c) => c.title || "קטגוריה",
      make: () => ({ id: rid("cat"), title: "קטגוריה חדשה", groups: [{ items: [] }] }),
      addLabel: "הוספת קטגוריה",
      render: (c) => {
        c.groups = c.groups || [];
        return el("div", {},
          el("div", { class: "row" }, textField(c, "title", "שם הקטגוריה"), textField(c, "navLabel", "שם בתפריט (אופציונלי)")),
          textField(c, "note", "הערה (אופציונלי)"),
          repeater(c.groups, {
            title: (g) => g.subhead || "קבוצת מנות",
            make: () => ({ subhead: "", items: [] }),
            addLabel: "הוספת קבוצה",
            render: (g) => {
              g.items = g.items || [];
              return el("div", {},
                textField(g, "subhead", "כותרת קבוצה (אופציונלי)"),
                repeater(g.items, {
                  title: (it) => it.name || "מנה",
                  make: () => ({ name: "מנה חדשה", price: "", desc: "", tags: [] }),
                  addLabel: "הוספת מנה",
                  render: (it) => el("div", {},
                    el("div", { class: "row" },
                      textField(it, "name", "שם המנה"),
                      textField(it, "price", "מחיר", { mono: true, hint: "מספר בלבד" })),
                    textField(it, "desc", "תיאור", { area: true, rows: 2 }),
                    tagPicker(it)),
                }));
            },
          }));
      },
    }));
}

function locationsEditor(d) {
  d.branches = d.branches || [];
  return el("div", {},
    textField(d, "heading", "כותרת"),
    textField(d, "intro", "טקסט פתיחה", { area: true, rows: 2 }),
    textField(d, "footnote", "הערת שוליים", { area: true, rows: 2 }),
    el("div", { class: "sec-title", style: "padding:0;margin:16px 0 8px" }, "סניפים"),
    repeater(d.branches, {
      title: (b) => b.name || "סניף",
      make: () => ({ id: rid("branch"), name: "סניף חדש", desc: "", waze: { lat: 32.0853, lng: 34.7818 }, hours: defaultHours() }),
      addLabel: "הוספת סניף",
      render: (b) => {
        b.waze = b.waze || { lat: 0, lng: 0 };
        b.hours = b.hours || defaultHours();
        return el("div", {},
          textField(b, "name", "שם הסניף"),
          textField(b, "desc", "תיאור", { area: true, rows: 2 }),
          el("div", { class: "row" }, numField(b.waze, "lat", "קו רוחב (Waze)"), numField(b.waze, "lng", "קו אורך (Waze)")),
          el("div", { class: "hint", style: "margin:-8px 0 12px" }, "מ-Google Maps: לחיצה ימנית על המיקום מעתיקה את שתי הנקודות."),
          el("label", { style: "display:block;font-size:.76rem;color:var(--ink-2);margin-bottom:8px" }, "שעות פתיחה — ריק = סגור"),
          hoursGrid(b.hours));
      },
    }));
}

function hoursGrid(hours) {
  const grid = el("div", { class: "hours-grid" });
  for (let day = 0; day < 7; day++) {
    const cur = hours[String(day)] ?? hours[day] ?? null;
    const open = el("input", { type: "text", placeholder: "פתיחה", value: cur ? cur[0] : "" });
    const close = el("input", { type: "text", placeholder: "סגירה", value: cur ? cur[1] : "" });
    const sync = () => {
      const o = open.value.trim() === "" ? null : parseFloat(open.value);
      const c = close.value.trim() === "" ? null : parseFloat(close.value);
      hours[String(day)] = (o == null || c == null || isNaN(o) || isNaN(c)) ? null : [o, c];
      bump();
    };
    open.addEventListener("input", sync);
    close.addEventListener("input", sync);
    grid.append(el("span", { class: "day" }, DAY_NAMES[day]), open, close);
  }
  return grid;
}

function tagPicker(item) {
  item.tags = item.tags || [];
  const pick = el("div", { class: "tag-pick" });
  for (const t of TAG_OPTIONS) {
    const cb = el("input", { type: "checkbox" });
    cb.checked = item.tags.includes(t.value);
    cb.addEventListener("change", () => {
      const i = item.tags.indexOf(t.value);
      if (cb.checked && i < 0) item.tags.push(t.value);
      else if (!cb.checked && i >= 0) item.tags.splice(i, 1);
      bump();
    });
    pick.append(el("label", { class: "toggle" }, cb, t.label));
  }
  return el("div", { class: "field" }, el("label", {}, "סימונים"), pick);
}

/* ---------------- default sections ---------------- */
function defaultSection(type) {
  const base = { id: rid(type), type, visible: true };
  switch (type) {
    case "hero":
      return { ...base, data: { logo: "", background: "", headline: "כותרת ראשית", lead: "תת-כותרת קצרה על העסק.", ctas: [{ label: "לתפריט", href: "#menu", style: "primary" }, { label: "איך מגיעים", href: "#locations", style: "ghost" }] } };
    case "richtext":
      return { ...base, data: { heading: "הסיפור שלנו", paragraphs: ["כתבו כאן את הסיפור של העסק."] } };
    case "menu":
      return { ...base, data: { heading: "התפריט", intro: "", currency: "₪", categories: [{ id: rid("cat"), title: "קטגוריה", groups: [{ items: [{ name: "מנה", price: "0", desc: "", tags: [] }] }] }] } };
    case "gallery":
      return { ...base, data: { heading: "גלריה", intro: "", images: [] } };
    case "media":
      return { ...base, data: { poster: "", video: "", sectionLabel: "", videoLabel: "" } };
    case "locations":
      return { ...base, data: { heading: "איפה אנחנו", intro: "", footnote: "", branches: [{ id: rid("branch"), name: "סניף", desc: "", waze: { lat: 32.0853, lng: 34.7818 }, hours: defaultHours() }] } };
    case "social":
      return { ...base, data: { heading: "עקבו אחרינו", intro: "", links: [{ network: "instagram", label: "@username", url: "https://instagram.com/" }] } };
    default:
      return { ...base, data: {} };
  }
}

/* ---------------- publish ---------------- */
async function buildHtml() {
  const [{ render }, tplRes] = await Promise.all([import("../render.mjs"), fetch(templateUrl())]);
  if (!tplRes.ok) throw new Error("template " + tplRes.status);
  const template = await tplRes.text();
  let html = render(state.site, template);
  const json = JSON.stringify(state.site).replace(/</g, "\\u003c");
  return html.replace("</body>", `<script type="application/json" id="cms-data">${json}</script>\n</body>`);
}

async function downloadFile() {
  if (state.busy) return;
  state.busy = true;
  setStatus("מייצר קובץ…", "");
  try {
    saveDraft(state.site);
    download((SITE_ID || "site") + "-index.html", await buildHtml(), "text/html");
    pushVersion("הורדת קובץ");
    setStatus("הקובץ ירד ✓", "ok");
  } catch (err) { setStatus("נכשל: " + err.message, "err"); }
  finally { state.busy = false; }
}

async function publishToGitHub() {
  if (state.busy) return;
  state.busy = true;
  setStatus("מפרסם…", "");
  try {
    saveDraft(state.site);
    const html = await buildHtml();
    const res = await fetch("/api/publish", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ html }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || "HTTP " + res.status);
    }
    pushVersion("פורסם לאינטרנט");
    setStatus("פורסם ✓ — האתר מתעדכן תוך שניות", "ok");
  } catch (err) { setStatus("פרסום נכשל: " + err.message, "err"); }
  finally { state.busy = false; }
}

function importFromFile() {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = ".html,.json,text/html,application/json";
  inp.style.display = "none";
  inp.addEventListener("change", async () => {
    inp.remove(); // only after change fires — Chrome won't fire it on a detached input
    const f = inp.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      let site;
      if (/\.json$/i.test(f.name) || text.trim().startsWith("{")) site = JSON.parse(text);
      else {
        site = extractEmbedded(text);
        if (!site) throw new Error('הקובץ אינו מכיל נתוני CMS. ייבאו קובץ שיוצא מהמערכת.');
      }
      if (!site.sections) throw new Error("מבנה הקובץ שגוי — חסר שדה sections.");
      state.site = site; saveDraft(site); state.dirty = false;
      renderDeck();
      setStatus("האתר נטען ✓", "ok");
    } catch (err) { setStatus("טעינה נכשלה: " + err.message, "err"); }
  });
  document.body.appendChild(inp);
  inp.click();
}

function extractEmbedded(html) {
  const m = html.match(/<script[^>]*id=["']cms-data["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  return JSON.parse(m[1].replace(/\\u003c/g, "<"));
}

function download(name, text, type) {
  const blob = new Blob([text], { type: type + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------------- media → data-URI ---------------- */
function fileToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("קריאת הקובץ נכשלה"));
    r.readAsDataURL(blob);
  });
}
async function uploadImage(file) {
  let blob = file;
  if (file.type !== "image/svg+xml" && file.type !== "image/gif") blob = (await downscale(file, 1600)).blob;
  return fileToDataURL(blob);
}
function downscale(file, maxDim) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      w = Math.round(w * scale); h = Math.round(h * scale);
      const canvas = el("canvas"); canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      const type = canvas.toDataURL("image/webp").startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
      canvas.toBlob((b) => b ? resolve({ blob: b, type }) : reject(new Error("encode failed")), type, 0.85);
    };
    img.onerror = () => reject(new Error("invalid image"));
    img.src = URL.createObjectURL(file);
  });
}

/* ---------------- preview ---------------- */
let previewOn = window.innerWidth > 1100;
async function togglePreview() {
  previewOn = !previewOn;
  document.querySelector(".viewport")?.classList.toggle("hide", !previewOn);
  buildRail();
  if (previewOn) await refreshPreview();
}
async function refreshPreview() {
  if (!$previewFrame) return;
  try {
    const [{ render }, tplRes] = await Promise.all([import("../render.mjs"), fetch(templateUrl())]);
    if (!tplRes.ok) throw new Error("template " + tplRes.status);
    const template = await tplRes.text();
    const html = render(state.site, template);
    const base = new URL(templateUrl());
    $previewFrame.srcdoc = html.replace("<head>", `<head><base href="${base.origin}${base.pathname.replace(/[^/]+$/, "")}">`);
  } catch (err) {
    $previewFrame.srcdoc = `<!doctype html><meta charset=utf-8><body style="font-family:sans-serif;padding:24px;color:#666">תצוגה מקדימה נכשלה: ${err.message}</body>`;
  }
}

/* ---------------- helpers ---------------- */
function toHex6(v) {
  if (typeof v !== "string") return "#000000";
  const s = v.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) return "#" + s.slice(1).split("").map((c) => c + c).join("");
  if (/^#[0-9a-fA-F]{8}$/.test(s)) return s.slice(0, 7);
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
  return "#000000";
}
function buildFontsHref(fonts) {
  const fams = new Set();
  for (const v of Object.values(fonts || {})) {
    const f = FONT_CHOICES.find((c) => c.family === v);
    if (f) fams.add(f.href.match(/family=([^&]+)/)?.[1]);
  }
  fams.add("Amatic+SC:wght@700");
  return "https://fonts.googleapis.com/css2?" + [...fams].filter(Boolean).map((f) => "family=" + f).join("&") + "&display=swap";
}
function resolveAssetForPreview(p) {
  if (/^https?:|^data:|^blob:/.test(p)) return p;
  const base = new URL(templateUrl());
  return base.origin + base.pathname.replace(/[^/]+$/, "") + p;
}
function defaultHours() { const h = {}; for (let i = 0; i < 7; i++) h[String(i)] = [9, 17]; return h; }

/* ---------------- start ---------------- */
boot();
