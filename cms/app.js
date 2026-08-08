/**
 * Truck Site Kit — CMS "Flight Deck" (vanilla JS, no backend).
 *
 * Layout: icon rail (right) · stage (stat strip + content + action bar) · live viewport (left).
 * Sections are a dense table; clicking a row opens a side drawer with that section's editor.
 * Everything autosaves to localStorage. Publish pushes a self-contained index.html to GitHub.
 */
import { SITE_ID, STORAGE_KEY, starterContentUrl, templateUrl } from "./config.js";
import {
  FONT_CHOICES, COLOR_LABELS, TAG_OPTIONS, SOCIAL_OPTIONS,
  SECTION_LABELS, ADDABLE_SECTIONS, DAY_NAMES, LABELS as L,
} from "./schema.js";
import {
  supabaseReady, getSession, onAuthChange, signUp, signIn, signOut, fetchSite, upsertSite, updatePassword,
} from "./supabase.js";

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
  undo:    "M8.5 4.5 4 9l4.5 4.5M4 9h8a5 5 0 0 1 0 10h-2",
  book:    "M10 5.5C8.5 4.3 6 4 3.5 4.5v10.5c2.5-.5 5-.2 6.5 1V5.5zM10 5.5c1.5-1.2 4-1.5 6.5-1v10.5c-2.5-.5-5-.2-6.5 1V5.5z",
  logout:  "M8 17.5H4.5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1H8M13 13.5l3.5-3.5-3.5-3.5M16.2 10H7.5",
  sun:     "M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM10 2v2M10 16v2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M2 10h2M16 10h2M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4",
  moon:    "M16.5 12.3A6.8 6.8 0 0 1 7.7 3.5a7 7 0 1 0 8.8 8.8z",
  check:   "M4 10.5l4 4 8-9",
  alert:   "M10 6.5v4.2M10 13.3h.01",
  edit:    "M4 16l.7-3.5L13.5 3.7a1.4 1.4 0 0 1 2 0l.8.8a1.4 1.4 0 0 1 0 2L7.5 15.3 4 16z M12 5.5l2.5 2.5",
  settings:"M3 6h6M12.5 6h4.5M3 10.5h11.5M3 15h8.5M15 15h2",
  chart:   "M4 16.5V9.5M9 16.5V4.5M14 16.5v-6M3 16.5h14",
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
  user: null, // { id, email } once signed in via Supabase
  view: "home",
  navOpen: false, // whether the nav drawer (hamburger menu) is currently open
  darkMode: false,
};

/* ---------------- theme (light/dark) ----------------
 * Applied as early as possible (module load, before boot()/first render)
 * so there's no flash of the wrong theme. Persisted per-browser — this is
 * a display preference, not site content, so it isn't synced to Supabase. */
const THEME_KEY = "cms-theme";
try { state.darkMode = localStorage.getItem(THEME_KEY) === "dark"; } catch {}
document.documentElement.classList.toggle("dark", state.darkMode);
function toggleTheme() {
  state.darkMode = !state.darkMode;
  try { localStorage.setItem(THEME_KEY, state.darkMode ? "dark" : "light"); } catch {}
  document.documentElement.classList.toggle("dark", state.darkMode);
  const btn = document.getElementById("themeToggleBtn");
  if (btn) {
    btn.replaceChildren(icon(state.darkMode ? "sun" : "moon"));
    btn.title = state.darkMode ? "מצב בהיר" : "מצב כהה";
  }
}

/* ---------------- persistence ----------------
 * The Supabase `sites` row (keyed by user_id) is the source of truth.
 * localStorage is only a local cache — namespaced per signed-in user so
 * two different accounts sharing one browser never collide. */
const localKey    = (userId) => `${STORAGE_KEY}:${userId}`;
const versionsKey = (userId) => localKey(userId) + ":versions";

function loadDraft(userId) {
  const s = localStorage.getItem(localKey(userId));
  if (s) { try { return JSON.parse(s); } catch {} }
  return null;
}
function saveDraft(userId, site) { localStorage.setItem(localKey(userId), JSON.stringify(site)); }
/** Local cache write (instant) + fire-and-forget sync to Supabase (source of truth). */
function persistNow(site) {
  try { saveDraft(state.user.id, site); } catch {}
  upsertSite(state.user.id, site).catch((err) => console.error("upsertSite error:", err));
}
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

/* ---------------- auth screen ---------------- */
let authMode = "signin"; // "signin" | "signup"
let pendingBrandName = null; // business name entered at signup, applied to the fresh starter site in boot()
function renderAuth(errMsg) {
  if (!supabaseReady) {
    $app.replaceChildren(el("div", { class: "login-wrap" },
      el("div", { class: "login-card" },
        el("h1", {}, "המערכת לא מוגדרת"),
        el("p", {}, "חסרים פרטי חיבור ל-Supabase (SUPABASE_URL / SUPABASE_ANON_KEY) בקובץ cms/config.js."))));
    return;
  }

  const email = el("input", { type: "email", autofocus: true, autocomplete: "email" });
  const pw = el("input", { type: "password", autocomplete: authMode === "signup" ? "new-password" : "current-password" });
  const bizName = el("input", { type: "text", autocomplete: "organization", placeholder: "לדוגמה: קפה הפינה" });
  const msg = el("p", { class: "chip err", style: "margin-top:8px" }, errMsg || "");

  const signinTab = el("button", { type: "button", class: authMode === "signin" ? "on" : "" }, L.signin);
  const signupTab = el("button", { type: "button", class: authMode === "signup" ? "on" : "" }, L.signup);
  signinTab.onclick = () => { authMode = "signin"; renderAuth(); };
  signupTab.onclick = () => { authMode = "signup"; renderAuth(); };
  const tabs = el("div", { class: "auth-tabs" }, signinTab, signupTab);

  const submitBtn = el("button", { class: "btn btn-primary", style: "width:100%" },
    authMode === "signup" ? L.signup : L.signin);

  const form = el("form", {
    onsubmit: async (e) => {
      e.preventDefault();
      msg.textContent = "";
      submitBtn.disabled = true;
      try {
        if (authMode === "signup" && !bizName.value.trim()) {
          msg.className = "chip err";
          msg.textContent = "נא למלא את שם העסק.";
          submitBtn.disabled = false;
          bizName.focus();
          return;
        }
        const fn = authMode === "signup" ? signUp : signIn;
        const { data, error } = await fn(email.value.trim(), pw.value);
        if (error) throw error;
        if (authMode === "signup" && !data.session) {
          // Shouldn't happen with "Confirm email" off, but handle gracefully.
          msg.className = "chip warn";
          msg.textContent = "נרשמתם! בדקו את תיבת המייל לאישור ההרשמה, ואז התחברו.";
          submitBtn.disabled = false;
          return;
        }
        if (authMode === "signup") pendingBrandName = bizName.value.trim();
        await boot();
      } catch (err) {
        msg.className = "chip err";
        msg.textContent = err.message || "משהו השתבש. נסו שוב.";
        submitBtn.disabled = false;
      }
    },
  },
    tabs,
    authMode === "signup"
      ? el("div", {},
          el("label", { style: "font-size:.78rem;color:var(--ink-2)" }, L.brand_name),
          bizName)
      : null,
    el("label", { style: "font-size:.78rem;color:var(--ink-2)" }, L.email),
    email,
    el("label", { style: "font-size:.78rem;color:var(--ink-2)" }, L.password),
    pw,
    submitBtn,
    msg);

  $app.replaceChildren(el("div", { class: "login-wrap" },
    el("div", { class: "login-card" },
      el("h1", {}, authMode === "signup" ? L.signup : L.open_title),
      el("p", {}, authMode === "signup" ? L.signup_sub : L.open_sub),
      form)));
  email.focus();
}

/* ---------------- boot ---------------- */
let authWatched = false;
async function boot() {
  if (!supabaseReady) { renderAuth(); return; }
  if (!authWatched) {
    authWatched = true;
    onAuthChange((session) => { if (!session && state.user) { state.user = null; renderAuth(); } });
  }

  const session = await getSession();
  if (!session) { state.user = null; renderAuth(); return; }
  state.user = session.user;

  try {
    let remote = null;
    try { remote = await fetchSite(state.user.id); }
    catch (err) {
      console.error("fetchSite error:", err);
      state.site = loadDraft(state.user.id) || await loadStarter();
      state.dirty = false;
      renderDeck();
      setStatus("לא ניתן להתחבר לשרת · עובדים במצב לא מקוון", "warn");
      return;
    }

    if (remote) {
      state.site = remote;
    } else {
      // First login for this account: no row yet — always seed the clean
      // generic starter. (Previously this offered to import a leftover
      // browser-local draft from before accounts existed; that meant a new
      // signup on a browser that had been used to edit a *different*
      // customer's site could pick up that customer's content by mistake.
      // Every new account must start from the same blank starter, full stop.)
      state.site = await loadStarter();
      if (pendingBrandName) {
        state.site.brand = state.site.brand || {};
        state.site.brand.name = pendingBrandName;
        pendingBrandName = null;
      }
      await upsertSite(state.user.id, state.site);
    }

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
  autosaveT = setTimeout(async () => {
    try { saveDraft(state.user.id, state.site); } catch {}
    try {
      await upsertSite(state.user.id, state.site);
      state.dirty = false;
      setStatus("נשמר ✓", "ok");
    } catch (err) {
      console.error("upsertSite error:", err);
      setStatus("נשמר מקומית · בעיה בסנכרון לענן", "warn");
    }
    sessionSnapshotTaken = false; // next field touched starts a fresh undo point
  }, 700);
  clearTimeout(previewDebounce);
  previewDebounce = setTimeout(() => { refreshStats(); if (state.view === "edit-site") refreshPreview(); }, 420);
}

/* Every ordinary field edit (text, color, select, checkbox…) goes through
 * bump()/markDirty() *after* the value has already been overwritten in
 * memory — too late to snapshot "before" from there. So instead we snapshot
 * on first focus of any field since the last save: this is still the
 * pre-edit state. Previously pushVersion() only ran before deletions and on
 * publish/download, so the "ביטול" (undo) button had nothing to restore to
 * after a plain text/color/image edit — this closes that gap. */
let sessionSnapshotTaken = false;
document.addEventListener("focusin", (e) => {
  if (sessionSnapshotTaken || !state.user || !state.site) return;
  const t = e.target;
  if (!t.matches || !t.matches("input, textarea, select")) return;
  pushVersion("לפני עריכה");
  sessionSnapshotTaken = true;
}, true);

/* ---------------- version history ----------------
 * Stays local to this browser/account (a "recent undo" convenience) — not
 * synced across devices. Namespaced per signed-in user. */
function versionsKeyFor() { return versionsKey(state.user.id); }
function loadVersions() {
  try { return JSON.parse(localStorage.getItem(versionsKeyFor())) || []; } catch { return []; }
}
function pushVersion(label) {
  try {
    const v = loadVersions();
    v.unshift({ t: Date.now(), label, site: clone(state.site) });
    if (v.length > 12) v.length = 12;
    localStorage.setItem(versionsKeyFor(), JSON.stringify(v));
  } catch {}
}
/** Quick one-click undo: restores the most recent snapshot in version
 * history (pushed automatically before every deletion — see rowMenu,
 * repeater, and imageField below — plus on every publish/download), without
 * needing to open the היסטוריה modal first. */
function undoLast() {
  const versions = loadVersions();
  if (!versions.length) { setStatus("אין שינויים לביטול", "warn"); return; }
  pushVersion("לפני ביטול");
  state.site = clone(versions[0].site);
  persistNow(state.site);
  sessionSnapshotTaken = false;
  renderDeck();
  setStatus("השינוי האחרון בוטל ✓", "ok");
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
        persistNow(state.site);
        sessionSnapshotTaken = false;
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

/* ---------------- user guide ---------------- */
const GUIDE_SECTIONS = [
  { icon: "home",    title: "בית", body: "דשבורד אמיתי: כמה אחוז מהאתר שלכם מוכן, מה כדאי לתקן קודם, אילו חלקים כבר גמורים, וקישור לנתוני מבקרים." },
  { icon: "layers",  title: "עריכת תוכן", body: "כאן בונים את הדף עצמו: לחצו על שורה כדי לפתוח עורך בצד ולערוך את התוכן שלה. \"הוספת אזור\" מוסיפה סוג תוכן חדש (תפריט, גלריה, סניפים ועוד). שכפול, מחיקה, הצגה/הסתרה והזזה למעלה/למטה זמינים דרך תפריט ⋯ שבכל שורה." },
  { icon: "edit",    title: "עריכת האתר", body: "תצוגה חיה של האתר האמיתי — לחצו על כל חלק בדף (כותרת, תמונה, טקסט) כדי לערוך אותו במקום. אפשר לעבור בין תצוגת מחשב לנייד בכפתורים שמעל התצוגה." },
  { icon: "settings",title: "הגדרות", body: "שם העסק, לוגו, כותרת הדף וה-favicon, צבעי המותג והגופנים, תפריט עליון ופוטר, וגם חשבון (סיסמה, יציאה), גיבוי/ייבוא, ומצב כהה." },
  { icon: "undo",    title: "ביטול והיסטוריה", body: "כל שינוי — כולל מחיקות — נשמר אוטומטית כגרסה. כפתור החץ מבטל מהר את הפעולה האחרונה, וכפתור \"היסטוריה\" (בהגדרות) מציג את כל הגרסאות השמורות לשחזור מלא." },
  { icon: "upload",  title: "פרסום ושמירה", body: "השינויים נשמרים אוטומטית לחשבון שלכם תוך כדי עריכה. \"פרסום לאינטרנט\" מעלה את הגרסה הנוכחית לאתר החי; \"הורדת קובץ\" (בהגדרות) שומרת עותק מקומי (HTML עצמאי) למחשב." },
];

function showGuide() {
  const scrim = el("div", { class: "scrim", onclick: close });
  function close() { scrim.remove(); modal.remove(); }
  const grid = el("div", { class: "guide-grid" });
  GUIDE_SECTIONS.forEach((g) => {
    grid.append(el("div", { class: "guide-item" },
      el("div", { class: "guide-ico" }, icon(g.icon)),
      el("div", {},
        el("div", { class: "guide-title" }, g.title),
        el("div", { class: "guide-body" }, g.body))));
  });
  const modal = el("div", { class: "modal modal-lg" },
    el("div", { class: "modal-head" }, el("span", {}, "מדריך למשתמש — איך בונים אתר"),
      el("button", { class: "btn btn-sm", onclick: close }, "סגירה")),
    el("div", { class: "guide-wrap" },
      el("p", { class: "guide-intro" }, "המערכת בנויה מ־4 מקומות בסרגל הצד: בית, עריכת תוכן, עריכת האתר והגדרות. כל שינוי נשמר אוטומטית ואפשר לבטל כל פעולה בכל שלב — אפשר להתנסות בלי חשש."),
      grid));
  document.body.append(scrim, modal);
}

/* ---------------- deck shell ---------------- */
const VIEWS = [
  { key: "home",      label: "בית",         icon: "home"     },
  { key: "sections",  label: "עריכת תוכן",  icon: "layers"   },
  { key: "edit-site", label: "עריכת האתר",  icon: "edit"     },
  { key: "settings",  label: "הגדרות",      icon: "settings" },
];

let $previewFrame = null, $content = null, $statsEl = null, $rail = null, $navScrim = null;

function renderDeck() {
  const site = state.site;
  $status = el("div", { class: "chip" });

  /* nav drawer (animated slide-out menu, not a persistent sidebar) + its scrim */
  $navScrim = el("div", { class: "nav-scrim", onclick: closeNav });
  $rail = el("aside", { class: "nav-drawer" });
  buildRail();

  /* topline */
  const search = el("input", { type: "text", placeholder: "חיפוש מהיר… (שם מנה, סניף, כותרת)" });
  const results = el("div", { class: "cmd-results hide" });
  search.addEventListener("input", () => runSearch(search.value, results));
  search.addEventListener("blur", () => setTimeout(() => results.classList.add("hide"), 180));
  search.addEventListener("focus", () => { if (search.value) runSearch(search.value, results); });
  const cmd = el("div", { class: "cmd" }, icon("search"), search, results);

  const currentViewLabel = VIEWS.find((v) => v.key === state.view)?.label || "";
  const topline = el("div", { class: "topline" },
    el("button", {
      class: "nav-open-btn", title: "תפריט", "aria-label": "פתיחת תפריט", onclick: openNav,
    }, icon("menu")),
    el("span", { class: "crumb" },
      el("span", { class: "crumb-root" }, site.brand?.name || SITE_ID),
      el("span", { class: "crumb-sep" }, "/"),
      el("span", { class: "crumb-leaf" }, currentViewLabel)),
    el("span", { class: "sp" }),
    cmd,
    el("span", { class: "sp" }),
    $status,
    el("button", {
      id: "themeToggleBtn", class: "btn btn-sm btn-icon", onclick: toggleTheme,
      title: state.darkMode ? "מצב בהיר" : "מצב כהה",
    }, icon(state.darkMode ? "sun" : "moon")),
    el("button", { class: "btn btn-sm", onclick: importFromFile, title: "טעינת אתר קיים" }, "ייבוא"),
    el("button", { class: "btn btn-sm", onclick: showVersions }, "היסטוריה"),
    el("button", { class: "btn btn-sm btn-icon", onclick: undoLast, title: "ביטול השינוי האחרון (מחיקות/עריכות)", "aria-label": "ביטול השינוי האחרון" }, icon("undo")));

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

  // $rail must be a flex CHILD of .deck (alongside stage), not a sibling of
  // .deck — .nav-drawer used to be position:fixed (an overlay, so sibling
  // placement didn't matter), but the V4 restructure made it a normal docked
  // flex item (position:relative, flex:0 0 auto). Left as a sibling of
  // .deck, it rendered as a full-width block AFTER all of .deck's (i.e.
  // stage's) content in normal document flow — pushed hundreds to
  // thousands of pixels below the fold on any page taller than one screen,
  // which is nearly always. That's the actual "menu doesn't open" bug:
  // the rail was never hidden, just rendered far off-screen.
  $app.replaceChildren(el("div", { class: "deck" }, $rail, stage), $navScrim);
  renderView();
  refreshStats();
}

/* ---------------- site-editing view (dedicated live preview + click-to-edit) ----
 * Was previously a togglable 46%-wide side panel next to every other view;
 * now it's its own destination — the iframe mounts full-bleed inside
 * $content only while state.view === "edit-site", and refreshPreview()/the
 * postMessage click-to-edit handlers below all key off the same module-level
 * $previewFrame regardless of where it's currently mounted. */
function editSiteView() {
  const vpBar = el("div", { class: "vp-bar" },
    el("span", { class: "lbl" }, "לחצו על כל חלק באתר כדי לערוך אותו"),
    el("button", { class: "dev-btn on", onclick: (e) => setDevice(e.currentTarget, false) }, "מחשב"),
    el("button", { class: "dev-btn", onclick: (e) => setDevice(e.currentTarget, true) }, "נייד"));
  const frame = el("div", { class: "edit-site-view" },
    vpBar, el("div", { class: "vp-frame" }, el("iframe", { title: "preview" })));
  $previewFrame = frame.querySelector("iframe");
  refreshPreview();
  return frame;
}

/* ---------------- nav drawer open/close + drag-to-close ----------------
 * The CMS's whole navigation lives in an animated slide-out drawer
 * (triggered by the hamburger button in the topline) rather than a
 * permanently-docked sidebar — opens over the content with a scrim,
 * supports drag-to-close, and staggers its items in on open. */
function openNav() {
  state.navOpen = true;
  $rail.classList.add("open");
  $navScrim.classList.add("open");
}
function closeNav() {
  state.navOpen = false;
  $rail.classList.remove("open");
  $navScrim.classList.remove("open");
}
function wireNavDrag() {
  const handle = $rail.querySelector(".nav-drag-handle");
  if (!handle) return;
  let startX = 0, dx = 0, dragging = false;
  const onMove = (e) => {
    dragging = true;
    dx = Math.max(0, e.clientX - startX); // RTL drawer: dragging further right closes it
    $rail.style.transition = "none";
    $rail.style.transform = `translateX(${dx}px)`;
  };
  const onUp = () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    $rail.style.transition = "";
    $rail.style.transform = "";
    if (dragging && dx > 90) closeNav();
    dragging = false; dx = 0;
  };
  handle.addEventListener("pointerdown", (e) => {
    startX = e.clientX;
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  });
}

function buildRail() {
  const site = state.site;
  $rail.replaceChildren();
  let stagger = 0; // per-item transition-delay index, for the staggered slide-in

  /* drag handle strip along the drawer's inner edge (drag toward the
     edge — i.e. further into the page — to close, mirroring the
     reference component's "drag to close" affordance) */
  $rail.append(el("div", { class: "nav-drag-handle", title: "גררו לסגירה" }));

  /* close button */
  $rail.append(el("button", { class: "nav-close-btn", "aria-label": "סגירת תפריט", onclick: closeNav }, "✕"));

  /* workspace header — brand avatar + name, mirrors a workspace switcher */
  const name = site?.brand?.name || SITE_ID || "האתר שלי";
  $rail.append(el("div", { class: "rail-header" },
    el("div", { class: "rail-avatar" }, (name || "?").trim().charAt(0) || "?"),
    el("div", { class: "rail-header-txt" },
      el("span", { class: "rail-header-name" }, name),
      el("span", { class: "rail-header-sub" }, "עריכת אתר"))));

  /* main nav group */
  const navGroup = el("div", { class: "rail-group" });
  navGroup.append(el("div", { class: "rail-heading" }, "עריכה"));
  for (const v of VIEWS) {
    navGroup.append(el("button", {
      class: "rail-btn" + (state.view === v.key ? " on" : ""),
      style: `--i:${stagger++}`,
      title: v.label,
      onclick: () => { state.view = v.key; buildRail(); renderView(); closeNav(); },
    }, icon(v.icon), el("span", {}, v.label)));
  }
  $rail.append(navGroup);

  $rail.append(el("div", { class: "rail-sep" }));

  /* bottom-pinned: guide + logout, mirrors settings/log-out convention */
  const bottom = el("div", { class: "rail-bottom" });
  bottom.append(el("button", {
    class: "rail-btn", style: `--i:${stagger++}`, title: "מדריך למשתמש",
    onclick: () => { showGuide(); closeNav(); },
  }, icon("book"), el("span", {}, "מדריך למשתמש")));
  bottom.append(el("button", {
    class: "rail-btn rail-btn-danger", style: `--i:${stagger++}`, title: state.user?.email || "",
    onclick: async () => { await signOut(); state.user = null; boot(); },
  }, icon("logout"), el("span", {}, L.logout)));
  $rail.append(bottom);

  wireNavDrag();
}

function setDevice(btn, mobile) {
  const vp = document.querySelector(".edit-site-view");
  if (!vp) return;
  vp.classList.toggle("mob", mobile);
  vp.querySelectorAll(".dev-btn").forEach((b) => b.classList.toggle("on", b === btn));
}

function renderView() {
  if (!$content) return;
  const site = state.site;
  $content.replaceChildren();
  // Stats strip + action bar only make sense for the content-editing view —
  // home has its own dashboard cards, edit-site is a full-bleed live preview,
  // settings is a plain field list.
  if ($statsEl) $statsEl.classList.toggle("hide", state.view !== "sections");
  document.querySelector(".actionbar")?.classList.toggle("hide", state.view === "edit-site");
  switch (state.view) {
    case "home":      $content.append(panelHome(site)); break;
    case "sections":  $content.append(sectionsTable(site)); break;
    case "edit-site": $content.append(editSiteView()); break;
    case "settings":  $content.append(el("div", { class: "pad settings-pad" }, ...panelSettings(site))); break;
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

/* ---------------- home dashboard (real completeness score, no fabricated numbers) ----
 * Every check below reads real state.site data — the same fields the owner
 * edits elsewhere in the app. Hidden sections (visible:false) are excluded
 * entirely rather than counted as gaps, since hiding a section is a
 * deliberate choice, not an incomplete one. */
function sectionGapReason(s) {
  switch (s.type) {
    case "hero":      return "הכותרת הראשית היא הדבר הראשון שלקוח רואה — בלעדיה האתר נראה לא גמור.";
    case "richtext":  return "הסיפור שלכם עוזר ללקוחות להכיר אתכם ולבחור בכם על פני המתחרים.";
    case "menu":      return "בלי תפריט, לקוחות לא יכולים לדעת מה אתם מוכרים.";
    case "gallery":   return "תמונות טובות הן המקום הראשון שלקוחות מסתכלים עליו.";
    case "media":     return "וידאו או תמונה גדולה עוזרים ללקוחות להרגיש את האווירה של העסק.";
    case "locations": return "בלי כתובת ושעות פתיחה, לקוחות לא יידעו איך ומתי להגיע.";
    case "social":    return "קישורים לרשתות חברתיות עוזרים ללקוחות לעקוב ולהמליץ עליכם.";
    default:          return "האזור הזה עדיין ריק.";
  }
}
const GAP_PRIORITY = { gallery: 5, hero: 5, menu: 4, locations: 4, social: 3, richtext: 2, media: 2 };

function computeSeoChecklist(site) {
  const meta = site.meta || {}, brand = site.brand || {}, footer = site.footer || {};
  const checks = [
    { id: "brand-name",  ok: !!brand.name?.trim(),  label: "שם העסק",
      why: "שם העסק מופיע בכל מקום באתר ובתוצאות החיפוש.", view: "settings", field: "name", pri: 1 },
    { id: "meta-title",  ok: !!meta.title?.trim(),  label: "כותרת הדף בגוגל",
      why: "זו הכותרת שמופיעה בתוצאות החיפוש וב-tab בדפדפן.", view: "settings", field: "title", pri: 2 },
    { id: "meta-desc",   ok: !!(meta.description && meta.description.trim().length >= 50), label: "תיאור לגוגל",
      why: "תיאור קצר מדי (או חסר) פוגע בסיכוי שלקוחות ילחצו על התוצאה שלכם בגוגל.", view: "settings", field: "description", pri: 3 },
    { id: "meta-favicon", ok: !!meta.favicon, label: "אייקון האתר (favicon)",
      why: "האייקון הקטן שמופיע בלשונית הדפדפן וברשימת המועדפים.", view: "settings", field: "favicon", pri: 1 },
    { id: "footer-copyright", ok: !!footer.copyright?.trim(), label: "זכויות יוצרים בפוטר",
      why: "שורת זכויות יוצרים היא תקן בסיסי לאתר עסקי אמין.", view: "settings", field: "copyright", pri: 1 },
  ];
  (site.sections || []).forEach((s) => {
    if (s.visible === false) return;
    checks.push({
      id: "section-" + s.id, ok: sectionStatus(s) === "ok", label: sectionName(s),
      why: sectionGapReason(s), view: "sections", sectionId: s.id,
      pri: GAP_PRIORITY[s.type] || 2,
    });
  });
  return checks;
}
function computeSeoScore(site) {
  const checks = computeSeoChecklist(site);
  const pct = checks.length ? Math.round((checks.filter((c) => c.ok).length / checks.length) * 100) : 0;
  return { pct, checks };
}

function panelHome(site) {
  const { pct, checks } = computeSeoScore(site);
  const gaps = checks.filter((c) => !c.ok).sort((a, b) => b.pri - a.pri);
  const done = checks.filter((c) => c.ok);
  const CIRC = 315; // 2*pi*50 (r=50)

  const gotoCheck = (c) => {
    state.view = c.view; buildRail(); renderView();
    if (c.sectionId) {
      const s = (site.sections || []).find((x) => x.id === c.sectionId);
      if (s) openSectionDrawer(s, () => renderView());
    } else if (c.field) {
      signalFieldSoon(c.field);
    }
  };

  const SVGNS = "http://www.w3.org/2000/svg";
  const svgTag = (tag, attrs) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };
  const ringSvg = svgTag("svg", { width: "116", height: "116", viewBox: "0 0 116 116", "aria-hidden": "true" });
  ringSvg.append(
    svgTag("circle", { class: "ring-bg", cx: "58", cy: "58", r: "50", fill: "none", "stroke-width": "9" }),
    svgTag("circle", {
      class: "ring-fg", cx: "58", cy: "58", r: "50", fill: "none", "stroke-width": "9",
      "stroke-dasharray": CIRC, "stroke-dashoffset": CIRC - (CIRC * pct) / 100,
    }));
  const ring = el("div", { class: "ring-wrap" },
    ringSvg,
    el("div", { class: "ring-num" }, el("span", { class: "n mono" }, pct + "%"), el("span", { class: "l" }, "הושלם")));

  const headline = pct >= 90
    ? "האתר שלכם מוכן!" : pct >= 60 ? "האתר שלכם כמעט מוכן" : "בואו נשלים את האתר שלכם";
  const topGap = gaps[0];
  const head = el("div", { class: "card headline" },
    ring,
    el("div", {},
      el("h1", {}, headline),
      el("p", { class: "sub" }, gaps.length
        ? `נשארו ${gaps.length} דברים שמשפיעים ישירות על כמה לקוחות פונים אליכם.`
        : "כל החלקים החשובים באתר מלאים. אפשר להמשיך לעדכן תוכן בכל זמן."),
      topGap ? el("div", { class: "next", onclick: () => gotoCheck(topGap) },
        el("b", {}, "הכי משתלם עכשיו: "), topGap.label) : null));

  const recCards = gaps.slice(0, 6).map((c, i) =>
    el("article", { class: "rec" + (i === 0 ? " wide" : "") },
      el("div", { class: "rec-head" },
        el("span", { class: "mark todo" }, icon("alert")),
        el("h3", {}, c.label)),
      el("p", { class: "why" }, c.why),
      el("div", { class: "rec-foot" }, el("span", { class: "sp" }),
        el("button", { class: "btn btn-primary", onclick: () => gotoCheck(c) }, "לתקן עכשיו"))));
  const recsGrid = el("div", { class: "recs" }, ...recCards);

  const doneSection = done.length ? el("div", {},
    el("div", { class: "sec-title" }, "כבר מוכן"),
    el("div", { class: "card done-list" },
      ...done.map((c) => el("div", { class: "done-row" },
        el("span", { class: "mark done" }, icon("check")),
        el("span", { class: "t" }, c.label))))) : null;

  const analyticsCard = el("div", { class: "card analytics-card" },
    el("div", { class: "rec-head" }, el("span", { class: "mark" }, icon("chart")), el("h3", {}, "מבקרים באתר")),
    el("p", { class: "why" },
      "כדי לראות כמה מבקרים יש באתר, מפעילים פעם אחת Web Analytics (חינמי) בפרויקט ה-Vercel שלכם — האתר כבר מוכן לזה."),
    el("div", { class: "rec-foot" }, el("span", { class: "sp" }),
      el("a", { class: "btn btn-primary", href: "https://vercel.com/docs/analytics/quickstart", target: "_blank", rel: "noopener" },
        "איך מפעילים")));

  return el("div", { class: "pad home-pad" }, head, recsGrid, analyticsCard, doneSection);
}

/* ---------------- sections table (V4 zone-card grid) ---------------- */
function sectionsTable(site) {
  site.sections = site.sections || [];
  const wrap = el("div", {});
  const table = el("div", { class: "recs" });

  function draw() {
    table.replaceChildren();
    if (!site.sections.length) table.append(el("div", { class: "empty" }, "אין עדיין אזורי תוכן. הוסיפו אזור למטה."));
    site.sections.forEach((s, i) => {
      const st = sectionStatus(s);
      const n = sectionCount(s);
      const markIcon = st === "ok" ? icon("check") : st === "warn" ? icon("alert") : null;
      const card = el("article", { class: "rec st-" + st },
        el("div", { class: "rec-head" },
          el("span", { class: "mark " + (st === "ok" ? "done" : st === "warn" ? "todo" : "") },
            markIcon || "–"),
          el("h3", {}, sectionName(s)),
          el("button", {
            class: "dots", "aria-label": "פעולות נוספות",
            onclick: (e) => { e.stopPropagation(); rowMenu(e.currentTarget, s, i, draw); },
          }, "⋯")),
        el("div", { class: "chips" },
          el("span", { class: "chip chip-mid" }, SECTION_LABELS[s.type] || s.type),
          n ? el("span", { class: "chip chip-time" }, String(n)) : null),
        el("div", { class: "rec-foot" },
          el("span", { class: "sp" }),
          el("button", { class: "btn btn-primary", onclick: () => openSectionDrawer(s, draw) }, "עריכה")));
      table.append(card);
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
    el("button", { class: "danger", onclick: () => { if (confirm("למחוק את האזור?")) { pushVersion("לפני מחיקת אזור"); sections.splice(i, 1); close(); redraw(); markDirty(); } } }, "מחיקה"));
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
    onDone: () => { persistNow(state.site); redraw(); refreshStats(); if (previewOn) refreshPreview(); setStatus("נשמר ✓", "ok"); },
    onCancel: () => {
      Object.keys(s).forEach((k) => delete s[k]);
      Object.assign(s, before);
      persistNow(state.site); redraw(); refreshStats(); if (state.view === "edit-site") refreshPreview();
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
  const fieldKey = fieldPath(key);
  return el("div", { class: "field" + (opts.mono ? " mono-field" : ""), "data-field-key": fieldKey },
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
    onclick: () => { pushVersion("לפני הסרת תמונה"); obj[key] = ""; setThumb(); bump(); } }, "✕");
  file.addEventListener("change", async () => {
    if (!file.files[0]) return;
    upBtn.disabled = true; upBtn.textContent = "מעלה…";
    try {
      obj[key] = await uploadImage(file.files[0]);
      setThumb(); bump(); setStatus("תמונה נטענה ✓", "ok");
    } catch (err) { setStatus("העלאה נכשלה", "err"); }
    finally { upBtn.disabled = false; upBtn.textContent = "העלאה"; }
  });
  const fieldKey = fieldPath(key);
  return el("div", { class: "field", "data-field-key": fieldKey },
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
// Stack (not a single slot) because menu items nest three repeaters deep
// (categories → groups → items) — each level pushes its own segment so a
// dish's field key ends up "categories[0].groups[0].items[2].name", letting
// signalField() find the exact nested field a live-preview click named.
let __repeaterStack = [];
function fieldPath(key) {
  if (!__repeaterStack.length) return key;
  return __repeaterStack.map((seg) => `${seg.arrayName}[${seg.index}]`).join(".") + "." + key;
}
function repeater(arr, { title, make, render, addLabel, arrayName = "" }) {
  const wrap = el("div", arrayName ? { "data-repeater-array": arrayName } : {});
  function draw() {
    wrap.replaceChildren();
    arr.forEach((item, i) => {
      if (arrayName) __repeaterStack.push({ arrayName, index: i });
      const body = render(item, i);
      if (arrayName) __repeaterStack.pop();
      wrap.append(el("div", { class: "rep-item" },
        el("div", { class: "rep-head" },
          el("span", { class: "grip" }, title ? title(item, i) : `#${i + 1}`),
          el("div", { class: "icon-btns" },
            el("button", { class: "btn btn-sm", type: "button", disabled: i === 0, onclick: () => { move(arr, i, -1); draw(); bump(); } }, "↑"),
            el("button", { class: "btn btn-sm", type: "button", disabled: i === arr.length - 1, onclick: () => { move(arr, i, 1); draw(); bump(); } }, "↓"),
            el("button", { class: "btn btn-sm btn-danger", type: "button", onclick: () => { pushVersion("לפני מחיקה"); arr.splice(i, 1); draw(); bump(); } }, "✕"))),
        el("div", { class: "rep-body" }, body)));
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
    ...group("רקע כללי לאתר",
      imageField(site.theme, "backgroundImage", "תמונת רקע לכל האתר", "ריק = רקע נקי בצבע הראשי שנבחר למעלה. התמונה תופיע מאחורי כל התוכן באתר.")),
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

/* ---------------- settings (everything CMS-related, not site content) ----
 * Composes the four existing content panels (brand/SEO, theme, nav, footer
 * — unchanged, still writing the exact same state.site paths render.mjs
 * reads) plus new groups for things that had no home anywhere before:
 * account, backup/import, and help. */
function panelAccount() {
  const email = state.user?.email || "";
  const pw1 = el("input", { type: "password", autocomplete: "new-password", placeholder: "סיסמה חדשה" });
  const pw2 = el("input", { type: "password", autocomplete: "new-password", placeholder: "אימות סיסמה" });
  const pwMsg = el("p", { class: "hint" }, "");
  const pwBtn = el("button", { class: "btn", type: "button" }, "עדכון סיסמה");
  pwBtn.addEventListener("click", async () => {
    pwMsg.textContent = "";
    if (pw1.value.length < 6) { pwMsg.textContent = "הסיסמה חייבת להיות באורך 6 תווים לפחות."; return; }
    if (pw1.value !== pw2.value) { pwMsg.textContent = "הסיסמאות לא תואמות."; return; }
    pwBtn.disabled = true;
    try {
      const { error } = await updatePassword(pw1.value);
      if (error) throw error;
      pw1.value = ""; pw2.value = "";
      pwMsg.textContent = "הסיסמה עודכנה ✓";
    } catch (err) {
      pwMsg.textContent = "שגיאה בעדכון הסיסמה: " + err.message;
    } finally {
      pwBtn.disabled = false;
    }
  });
  return [
    ...group("חשבון",
      el("div", { class: "field" }, el("label", {}, "כתובת אימייל"),
        el("input", { type: "text", value: email, disabled: true })),
      el("div", { class: "row" }, el("div", { class: "field" }, pw1), el("div", { class: "field" }, pw2)),
      pwBtn, pwMsg,
      el("button", {
        class: "btn btn-logout", type: "button", style: "margin-top:10px",
        onclick: async () => { await signOut(); state.user = null; boot(); },
      }, L.logout)),
  ];
}
function panelBackup() {
  return [
    ...group("גיבוי וייבוא",
      el("p", { class: "hint" }, "הורידו קובץ HTML עצמאי של האתר הנוכחי, או טענו אתר קיים לעריכה."),
      el("div", { class: "row" },
        el("button", { class: "btn", type: "button", onclick: downloadFile }, "הורדת קובץ"),
        el("button", { class: "btn", type: "button", onclick: importFromFile }, "ייבוא אתר קיים"))),
  ];
}
function panelHelp() {
  return [
    ...group("עזרה ותיעוד",
      el("div", { class: "row" },
        el("button", { class: "btn", type: "button", onclick: showGuide }, "מדריך למשתמש"),
        el("button", { class: "btn", type: "button", onclick: showVersions }, "היסטוריית גרסאות"))),
    ...group("תצוגה",
      el("label", { class: "toggle" },
        (() => {
          const cb = el("input", { type: "checkbox" });
          cb.checked = state.darkMode;
          cb.addEventListener("change", toggleTheme);
          return cb;
        })(),
        "מצב כהה")),
  ];
}
function panelSettings(site) {
  return [
    ...panelGeneral(site),
    ...panelTheme(site),
    ...panelNav(site),
    ...panelFooter(site),
    ...panelAccount(),
    ...panelBackup(),
    ...panelHelp(),
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
          arrayName: "ctas",
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
          arrayName: "images",
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
          arrayName: "links",
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
      arrayName: "categories",
      title: (c) => c.title || "קטגוריה",
      make: () => ({ id: rid("cat"), title: "קטגוריה חדשה", groups: [{ items: [] }] }),
      addLabel: "הוספת קטגוריה",
      render: (c) => {
        c.groups = c.groups || [];
        return el("div", {},
          el("div", { class: "row" }, textField(c, "title", "שם הקטגוריה"), textField(c, "navLabel", "שם בתפריט (אופציונלי)")),
          textField(c, "note", "הערה (אופציונלי)"),
          repeater(c.groups, {
            arrayName: "groups",
            title: (g) => g.subhead || "קבוצת מנות",
            make: () => ({ subhead: "", items: [] }),
            addLabel: "הוספת קבוצה",
            render: (g) => {
              g.items = g.items || [];
              return el("div", {},
                textField(g, "subhead", "כותרת קבוצה (אופציונלי)"),
                repeater(g.items, {
                  arrayName: "items",
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
      arrayName: "branches",
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
    persistNow(state.site);
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
    persistNow(state.site);
    const html = await buildHtml();
    const res = await fetch("/api/publish", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html, userId: state.user.id, siteJson: state.site }),
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
      state.site = site; persistNow(site); state.dirty = false;
      sessionSnapshotTaken = false;
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
// Manual per-account asset base (until publish-target provisioning is
// automated, see api/publish.js's USER_REPO_MAP). Some accounts' real media
// files live in a different deployment than the CMS itself — e.g. an
// imported site.json with relative paths like "assets/logo.png" only
// resolves correctly if the preview's <base href> points at THAT account's
// own hosted site, not at the CMS's own origin.
const ASSET_BASE_MAP = {
  // alonatruck@gmail.com — truck bamoshava (Vercel, deploying main/truck-bamoshava/)
  "b07e58c7-7bce-4b4b-a585-c590051ff9fa": "https://truck-bamoshava-website.vercel.app/",
};

/* Click-to-edit overlay injected ONLY into the CMS's own live-preview iframe
 * (never into the real published/downloaded HTML — buildHtml() is a
 * completely separate code path that never sees this). Lets the owner click
 * any section/header/footer directly in the preview and jump straight to
 * its editor. Elements render.mjs marks with data-field/data-field-label
 * (see render.mjs's renderHero/renderFooter/etc.) get a tighter highlight +
 * name badge and, once the drawer opens, the CMS scrolls to and glows that
 * *exact* field — not just the section it lives in. */
const PREVIEW_EDIT_OVERLAY = `
<style>
  main > section[id], .site-header, .site-footer { cursor: pointer; }
  main > section[id]:hover, .site-header:hover, .site-footer:hover {
    outline: 2px dashed rgba(61,139,255,.4); outline-offset: -2px;
  }
  [data-field] { position: relative; cursor: pointer; transition: background-color .12s, outline-color .12s; border-radius: 4px; }
  [data-field]:hover {
    outline: 2px solid #3D8BFF; outline-offset: 3px; background-color: rgba(61,139,255,.08);
  }
  [data-field]:hover::after {
    content: "✎ " attr(data-field-label); position: absolute; top: -28px; inset-inline-start: 0; z-index: 99999;
    background: #18181B; color: #fff; font: 600 11px/1 "Heebo",system-ui,sans-serif; padding: 6px 10px;
    border-radius: 999px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,.25); pointer-events: none;
  }
</style>
<script>
(function(){
  if (window.top === window) return; // safety: only activates when embedded in the CMS
  document.addEventListener("click", function(e){
    // The a11y widget and "back to top" button live outside <header>/<main>/
    // <footer> (loose children of <body>), so nothing below matches them —
    // left alone, clicking the a11y button pops its real settings panel open
    // right there in the preview iframe. There's no CMS field for either of
    // these (they're fixed site behavior, not editable content), so just
    // swallow the click instead of letting them activate during editing.
    if (e.target.closest("#a11yBtn, .a11y-panel, #toTop")) {
      e.preventDefault(); e.stopPropagation();
      return;
    }
    var fieldEl  = e.target.closest("[data-field]");
    var brandEl  = e.target.closest(".brand");
    var footerEl = e.target.closest(".site-footer");
    var headerEl = e.target.closest(".site-header");
    var secEl    = e.target.closest("main > section[id]");
    var field = fieldEl ? fieldEl.getAttribute("data-field") : null;
    var msg = null;
    if (brandEl)       msg = { type: "edit-general", field: field };
    else if (footerEl) msg = { type: "edit-footer",  field: field };
    else if (headerEl) msg = { type: "edit-nav" };
    else if (secEl)    msg = { type: "edit-section", id: secEl.id, field: field };
    if (!msg) return;
    e.preventDefault(); e.stopPropagation();
    window.parent.postMessage(Object.assign({ source: "cms-preview" }, msg), "*");
  }, true);
})();
<\/script>`;

window.addEventListener("message", (e) => {
  if (!$previewFrame || e.source !== $previewFrame.contentWindow) return;
  const d = e.data;
  if (!d || d.source !== "cms-preview") return;
  if (d.type === "edit-section") editSectionById(d.id, d.field);
  else if (d.type === "edit-nav" || d.type === "edit-footer" || d.type === "edit-general") {
    // Nav/footer/brand fields now live under Settings (no dedicated view of
    // their own anymore) — jump there, but keep the preview mounted where
    // it was so clicking a header link doesn't lose the live-preview context
    // more than necessary.
    state.view = "settings"; buildRail(); renderView();
    if (d.field) signalFieldSoon(d.field);
  }
});
function editSectionById(id, field) {
  const s = (state.site.sections || []).find((x) => x.id === id);
  if (!s) return;
  // Deliberately does NOT touch state.view: this fires from clicks inside
  // the live-preview iframe, which only exists while state.view is
  // "edit-site" — the drawer is a fixed-position overlay (see openDrawer()),
  // so it opens right on top of the preview without navigating away from it.
  openSectionDrawer(s, () => renderView());
  if (field) signalFieldSoon(field);
}
/* openDrawer()/renderView() insert their DOM synchronously (document.body.append,
 * not queued), so the target field genuinely exists the instant this is called -
 * no wait is actually needed. This used to double-requestAnimationFrame "to let
 * the drawer's slide-in transition settle first," but rAF only fires on the next
 * compositor frame, and the drawer's own opening CSS transition (plus whatever
 * else is competing for frames - the live-preview iframe reflowing, etc.) can
 * starve that frame indefinitely: confirmed via tracing that editSectionById()
 * and signalFieldSoon() both ran every time, but the rAF callback inside
 * signalFieldSoon sometimes never fired at all, silently dropping the glow.
 * That's the exact "works for some fields, not others" inconsistency reported -
 * general/footer fields (no drawer, no competing transition) worked reliably;
 * section-drawer fields (locations, menu, ctas - anything behind the sliding
 * drawer) didn't. A plain setTimeout doesn't have this failure mode: it's
 * scheduled on the task queue, not gated on an idle compositor frame. */
function signalFieldSoon(field) {
  if (!field) return;
  setTimeout(() => signalField(field), 0);
}
function signalField(field) {
  // textField/imageField stamp data-field-key with the exact same path
  // fieldPath() builds (e.g. "categories[0].groups[0].items[2].name"), so
  // this is a direct match — no stripping. (A prior version stripped this
  // down to the bare key, which silently broke every repeater-nested field:
  // nothing in the DOM carries the bare key anymore, so that query always
  // came back empty and the glow never fired.)
  const target = document.querySelector(`[data-field-key="${CSS.escape(field)}"]`);
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.remove("field-signal");
  void target.offsetWidth; // restart the CSS animation if it's already mid-run
  target.classList.add("field-signal");
  setTimeout(() => target.classList.remove("field-signal"), 2600);
  const input = target.querySelector("input, textarea, select");
  if (input) setTimeout(() => input.focus({ preventScroll: true }), 280);
}

async function refreshPreview() {
  if (!$previewFrame) return;
  try {
    const [{ render }, tplRes] = await Promise.all([import("../render.mjs"), fetch(templateUrl())]);
    if (!tplRes.ok) throw new Error("template " + tplRes.status);
    const template = await tplRes.text();
    // Strip the Vercel Web Analytics snippet from the CMS's own preview —
    // it shares template.html with the real published site, but a preview
    // reload on every keystroke must never send a real pageview beacon
    // (worse: with ASSET_BASE_MAP mapping the <base href> to the actual
    // customer domain below, an un-stripped script would attribute those
    // beacons to the owner's real analytics, not the CMS's).
    const noAnalytics = template.replace(
      /<script>window\.va[\s\S]*?<\/script>\s*<script defer src="\/_vercel\/insights\/script\.js"><\/script>\s*/,
      "");
    const html = render(state.site, noAnalytics).replace("</body>", PREVIEW_EDIT_OVERLAY + "</body>");
    const mapped = state.user && ASSET_BASE_MAP[state.user.id];
    const assetBase = mapped || (() => {
      const base = new URL(templateUrl());
      return base.origin + base.pathname.replace(/[^/]+$/, "");
    })();
    $previewFrame.srcdoc = html.replace("<head>", `<head><base href="${assetBase}">`);
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
