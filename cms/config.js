/**
 * CMS configuration.
 *
 * Each customer signs in with their own Supabase account (email + password).
 * Their site content is the source of truth in Supabase (table `sites`,
 * one row per user, protected by row-level security). A local copy is kept
 * in localStorage (namespaced per signed-in user, see app.js) purely as an
 * instant-load cache and an offline fallback — it is never authoritative.
 *
 * The Publish button pushes the rendered index.html straight to GitHub (and
 * Vercel picks it up automatically) via the /api/publish serverless function.
 *
 * Per-site override via URL: ?site=<id> namespaces the local cache key
 * further, in case one browser/account ever needs to hold more than one
 * draft locally.
 */
const params = new URLSearchParams(location.search);

export const SITE_ID     = params.get("site") || "site";
export const STORAGE_KEY = `truck-cms:${SITE_ID}`;

export const starterContentUrl = () => new URL("../starter/site.json", location.href).href;
export const templateUrl       = () => new URL("../template.html",     location.href).href;

// ── Supabase (accounts + per-user site storage) ──────────────────────────────
// The anon/public key is safe to ship in client code by design — Supabase's
// Row Level Security policies (not key secrecy) are what keep each user's
// `sites` row private. Never put the service_role key here.
export const SUPABASE_URL      = "";
export const SUPABASE_ANON_KEY = "";

// ── GitHub publish → Vercel auto-deploy ──────────────────────────────────────
// "פרסם לאינטרנט" calls /api/publish (a Vercel serverless function).
// The function reads GITHUB_TOKEN from Vercel environment variables —
// the token is never stored in this file or in the git repo.
//
// To configure: Vercel dashboard → project → Settings → Environment Variables
// Add: GITHUB_TOKEN = <your fine-grained PAT with Contents: Read+Write>
