/**
 * CMS configuration.
 *
 * Drafts live in the browser (localStorage). The Publish button either pushes
 * index.html straight to GitHub (and Vercel picks it up automatically) or
 * falls back to a local file download if no token is configured.
 *
 * Per-site override via URL: ?site=<id> namespaces the localStorage draft so
 * one browser can hold drafts for several businesses without collisions.
 */
const params = new URLSearchParams(location.search);

export const SITE_ID     = params.get("site") || "site";
export const STORAGE_KEY = `truck-cms:${SITE_ID}`;

export const starterContentUrl = () => new URL("../starter/site.json", location.href).href;
export const templateUrl       = () => new URL("../template.html",     location.href).href;

// Optional soft gate. Leave "" to open straight into the editor.
export const EDIT_PASSWORD = "";

// ── GitHub publish → Vercel auto-deploy ──────────────────────────────────────
// "פרסם לאינטרנט" calls /api/publish (a Vercel serverless function).
// The function reads GITHUB_TOKEN from Vercel environment variables —
// the token is never stored in this file or in the git repo.
//
// To configure: Vercel dashboard → project → Settings → Environment Variables
// Add: GITHUB_TOKEN = <your fine-grained PAT with Contents: Read+Write>
