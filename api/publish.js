/**
 * Vercel serverless function — /api/publish
 *
 * Proxies the GitHub Contents API so the token never touches the browser.
 * The CMS "פרסם לאינטרנט" button POSTs { html, userId, siteJson } here; this
 * function pushes index.html (and, for mapped accounts, content/site.json
 * too) to the target repo, and Vercel/GitHub Pages picks it up automatically.
 *
 * Required env var (set in Vercel dashboard → Settings → Environment Variables):
 *   GITHUB_TOKEN  — PAT with Contents: Read+Write on every repo this
 *                   function may need to push to (the default repo below,
 *                   plus every repo listed in USER_REPO_MAP).
 *
 * Optional env vars (default/fallback target when a user has no explicit
 * mapping below):
 *   GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_FILE
 *
 * ── Per-user publish targets (manual, until provisioning is automated) ──────
 * Each real customer account gets one entry here, keyed by their Supabase
 * auth `user_id` (Dashboard → Authentication → Users → copy the UUID).
 * Not in this map → falls back to the shared default repo above.
 */
const USER_REPO_MAP = {
  // alonatruck@gmail.com — truck bamoshava. Repo's "main" is a shared
  // mono-repo; the site itself lives under the truck-bamoshava/ subfolder
  // there (this matches the Vercel project's own Root Directory setting).
  "b07e58c7-7bce-4b4b-a585-c590051ff9fa": {
    owner: "Nimi5334",
    repo: "truck-bamoshava-website",
    branch: "main",
    file: "truck-bamoshava/index.html",
    siteJsonFile: "truck-bamoshava/content/site.json",
  },
};

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "GITHUB_TOKEN לא מוגדר ב-Vercel Environment Variables" });
  }

  const { html, userId, siteJson } = req.body || {};
  if (!html) return res.status(400).json({ error: "Missing html in request body" });

  const target = (userId && USER_REPO_MAP[userId]) || {
    owner: process.env.GITHUB_OWNER  || "Nimi5334",
    repo: process.env.GITHUB_REPO   || "website-cms",
    branch: process.env.GITHUB_BRANCH || "main",
    file: process.env.GITHUB_FILE   || "index.html",
    siteJsonFile: null,
  };

  const ghHeaders = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  async function putFile(path, rawContent) {
    const apiUrl = `https://api.github.com/repos/${target.owner}/${target.repo}/contents/${path}`;
    let sha;
    // Must check the SAME branch we're about to write to — without ?ref=,
    // GitHub looks at the repo's default branch, which may not be where
    // this file lives (e.g. default is "main" but the site is on "gh-pages").
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(target.branch)}`, { headers: ghHeaders });
    if (getRes.ok) sha = (await getRes.json()).sha;

    const content = Buffer.from(rawContent, "utf-8").toString("base64");
    const body = { message: "עדכון תוכן האתר", content, branch: target.branch };
    if (sha) body.sha = sha;

    const putRes = await fetch(apiUrl, { method: "PUT", headers: ghHeaders, body: JSON.stringify(body) });
    const data = await putRes.json();
    return { ok: putRes.ok, status: putRes.status, data };
  }

  const htmlResult = await putFile(target.file, html);
  if (!htmlResult.ok) return res.status(htmlResult.status).json(htmlResult.data);

  // For accounts with a mapped repo that also tracks its own site.json
  // source (so a future re-import/edit stays in sync with what's live).
  if (target.siteJsonFile && siteJson) {
    const jsonResult = await putFile(target.siteJsonFile, JSON.stringify(siteJson, null, 2));
    if (!jsonResult.ok) return res.status(jsonResult.status).json(jsonResult.data);
  }

  return res.status(htmlResult.status).json(htmlResult.data);
};
