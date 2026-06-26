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
// When GITHUB_TOKEN is set the primary "פרסם לאינטרנט" button pushes
// index.html to the repo and Vercel deploys within seconds.
// Leave GITHUB_TOKEN = "" to use download-file mode only.
//
// Recommended: fine-grained PAT (Settings → Developer settings →
// Fine-grained tokens) with Contents: Read and Write on this repo only.
export const GITHUB_TOKEN  = "";              // ← paste your PAT here
export const GITHUB_OWNER  = "Nimi5334";      // GitHub username / org
export const GITHUB_REPO   = "website-cms";   // repo created for this
export const GITHUB_BRANCH = "main";
export const GITHUB_FILE   = "index.html";    // file path inside the repo
