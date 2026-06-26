# Truck Site Kit — sellable food-truck website + self-edit CMS

A reusable version of the Truck Ba'Moshava design that you can sell to other
food‑truck businesses. Each buyer gets:

1. **A website** — the same warm, animated, mobile‑first Hebrew/RTL design.
2. **A CMS** — a self‑edit panel where the owner personalizes *everything*
   (brand, colors, fonts, hero, story, menu, gallery, video, locations & hours,
   social, footer) and **publishes with one click**.

No backend. No API. No monthly cost. The original `truck-bamoshava/` site and the
`leverage-cms/` system are **not** touched by this kit — it's fully self‑contained.

---

## How it works

```
starter/site.json  ──┐
                     ├──►  render.mjs  ──►  a finished, self-contained index.html
template.html  ──────┘        (runs in Node AND in the browser)
```

- **`template.html`** — the static shell (CSS + JS) with `{{PLACEHOLDERS}}`.
- **`render.mjs`** — pure `render(site, template)` that fills the shell. Keyed by
  section `type`, HTML‑escapes everything, fixed icon vocabulary (no script
  injection). Runs at build time (Node CLI) and live in the browser (CMS preview
  + Publish).
- **`starter/site.json`** — neutral placeholder content a brand‑new business
  starts from. All placeholder images are inlined as data‑URIs, so a published
  site is **one file with nothing external**.
- **`cms/`** — the framework‑free editor (no build step, no dependencies).

### Why no API, and what "Publish" does
With no backend, a browser edit can't push itself to the public internet on its
own. So the roles split:

- **The owner** edits in `cms/` and clicks **„פרסום האתר” (Publish)**. The
  renderer runs *in their browser* and downloads a finished `index.html` —
  images and video baked in as data‑URIs, and the content model embedded in a
  `<script id="cms-data">` tag so the editor can re‑open the site later.
- **You (the seller)** host that one file on any free static host (Vercel,
  Netlify, Cloudflare Pages, GitHub Pages). ~60 seconds, no infrastructure.

> **Optional upgrade (not built):** if you later want edits to go live instantly
> without you hosting each time, that is the single place a tiny serverless
> save‑function (or the GitHub API) would slot in. The architecture is ready for
> it — the export already carries the full content model.

---

## Selling a site to a new business

1. **Copy the kit** (or just deploy a copy of it) for the customer.
2. **Seed their content** — either edit `starter/site.json` directly, or open the
   CMS and fill it in, then Publish once to create their first `index.html`.
3. **Host** the `index.html` on a free static host under their domain.
4. **Hand off the editor** — give them the link to `cms/?site=<their-id>`.
   - Optional: set `EDIT_PASSWORD` in `cms/config.js` for a soft local lock.
5. **Ongoing changes** — they edit and Publish; send you the file; you redeploy
   (or wire the optional save‑function for instant self‑publish).

The owner's entire job: **open link → edit → Publish.** No files, no dragging,
no hosting concepts.

---

## What the owner can edit (everything)

| Area | Controls |
|---|---|
| General | business name, logo, page title & description, favicon, browser theme color |
| Theme | all 10 colors (pickers), heading + body font, corner radius |
| Top nav | links (add/remove/reorder) + optional highlighted button |
| Sections | add / remove / reorder / show‑hide any of: **hero, story, menu, gallery, video, locations, social** |
| Hero | logo, **background image**, headline, sub‑headline, buttons |
| Menu | categories → groups → dishes (name, price, description, vegan/GF tags) |
| Gallery | upload any number of business photos |
| Video | poster image + optional uploaded video |
| Locations | branches with description, Waze pin, and a full weekly hours grid (drives the live „open now” signs) |
| Social | Instagram, Facebook, WhatsApp, TikTok, phone |
| Footer | logo, copyright, links |

Images are downscaled in‑browser (max 1600px, WebP/JPEG) and stored as data‑URIs,
so they travel inside the export — nothing to host separately.

---

## Files

```
truck-site-kit/
  template.html            static shell (hero bg is CMS-editable via --hero-bg)
  render.mjs               renderer — Node CLI + browser module (gallery added)
  starter/
    site.json              neutral starting content (built by tools/make-starter.mjs)
    assets/*.svg           placeholder art (inlined into site.json as data-URIs)
    index.html             a ready-to-host render of the starter (demo)
  cms/
    index.html             editor shell + styling
    app.js                 editor logic (no-API: localStorage + data-URI + Publish/Import)
    schema.js              labels, fonts, colors, section menu
    config.js              site id, storage key, optional EDIT_PASSWORD
  tools/
    make-starter.mjs       rebuilds starter/site.json from the placeholder SVGs
```

## Commands

```bash
# Rebuild the starter content after changing placeholder art:
node truck-site-kit/tools/make-starter.mjs

# Render a finished index.html from content (uses the kit template):
node truck-site-kit/render.mjs truck-site-kit/starter

# Preview locally (any static server). Example:
python -m http.server 8743 --directory truck-site-kit
#   site:   http://localhost:8743/starter/index.html
#   editor: http://localhost:8743/cms/index.html?site=demo
```

> The editor must be served over http(s), not opened as a `file://` path
> (it uses `fetch` and ES‑module imports). A published `index.html`, by contrast,
> is fully self‑contained and opens anywhere.
