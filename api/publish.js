/**
 * Vercel serverless function — /api/publish
 *
 * Proxies the GitHub Contents API so the token never touches the browser.
 * The CMS "פרסם לאינטרנט" button POSTs { html: "..." } here; this function
 * pushes index.html to the repo and Vercel auto-deploys the result.
 *
 * Required env var (set in Vercel dashboard → Settings → Environment Variables):
 *   GITHUB_TOKEN  — fine-grained PAT, Contents: Read+Write on this repo
 *
 * Optional env vars (defaults to this project's values):
 *   GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_FILE
 */
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token  = process.env.GITHUB_TOKEN;
  const owner  = process.env.GITHUB_OWNER  || "Nimi5334";
  const repo   = process.env.GITHUB_REPO   || "website-cms";
  const branch = process.env.GITHUB_BRANCH || "main";
  const file   = process.env.GITHUB_FILE   || "index.html";

  if (!token) {
    return res.status(500).json({ error: "GITHUB_TOKEN לא מוגדר ב-Vercel Environment Variables" });
  }

  const { html } = req.body || {};
  if (!html) return res.status(400).json({ error: "Missing html in request body" });

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${file}`;
  const ghHeaders = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  // Fetch existing file SHA — required by GitHub API when updating.
  let sha;
  const getRes = await fetch(apiUrl, { headers: ghHeaders });
  if (getRes.ok) sha = (await getRes.json()).sha;

  // Node's Buffer handles UTF-8 → base64 correctly for Hebrew content.
  const content = Buffer.from(html, "utf-8").toString("base64");

  const body = { message: "עדכון תוכן האתר", content, branch };
  if (sha) body.sha = sha;

  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers: ghHeaders,
    body: JSON.stringify(body),
  });
  const data = await putRes.json();

  return res.status(putRes.status).json(data);
};
