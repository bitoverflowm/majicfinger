import { runXJarvisCronTick } from "@/lib/mcp/xJarvis/cronTick";
import { xJarvisEnvStatus } from "@/lib/mcp/xJarvis/xClient";

/**
 * Cron / manual tick for @lychee_data Jarvis.
 *
 * Auth (any one):
 *   Authorization: Bearer ${X_JARVIS_CRON_SECRET}
 *   Authorization: Bearer ${CRON_SECRET}   (Vercel Cron)
 *   Header x-vercel-cron: 1
 *
 * Query/body:
 *   live=1     — post replies when X_JARVIS_LIVE=1 and OAuth is set
 *   max=10     — max mentions to process
 *   status=1   — env/status only (no fetch)
 */
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, message: "GET or POST" });
  }

  const secret =
    String(process.env.X_JARVIS_CRON_SECRET || "").trim() ||
    String(process.env.CRON_SECRET || "").trim();
  const auth = String(req.headers.authorization || "");
  const vercelCron = String(req.headers["x-vercel-cron"] || "") === "1";
  const okAuth =
    vercelCron ||
    (secret && (auth === `Bearer ${secret}` || auth === `bearer ${secret}`));
  if (!okAuth) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const q = req.method === "GET" ? req.query : { ...req.query, ...(req.body || {}) };
  if (q.status === "1" || q.status === "true") {
    return res.status(200).json({ success: true, data: { env: xJarvisEnvStatus() } });
  }

  // Vercel Cron ticks default to live intent; posting still requires X_JARVIS_LIVE=1 + OAuth.
  const live =
    q.live === "1" ||
    q.live === "true" ||
    q.live === true ||
    process.env.X_JARVIS_CRON_LIVE === "1" ||
    vercelCron;
  const max = Number(q.max) || 10;
  const force_since_id = String(q.since_id || "").trim();

  try {
    const data = await runXJarvisCronTick({ live, max, force_since_id });
    return res.status(data.ok ? 200 : 502).json({ success: data.ok, data });
  } catch (err) {
    console.error("[x-jarvis/cron]", err);
    return res.status(500).json({ success: false, message: err?.message || "cron failed" });
  }
}
