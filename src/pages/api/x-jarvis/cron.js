import { runXJarvisCronTick } from "@/lib/mcp/xJarvis/cronTick";
import { xJarvisEnvStatus } from "@/lib/mcp/xJarvis/xClient";
import { authorizeJarvisCron } from "@/lib/mcp/xJarvis/cronAuth";

// Each mention runs several model calls (~20s), so a tick needs well over the default function limit.
export const config = { maxDuration: 300 };

/**
 * Cron / manual tick for @lychee_data Jarvis.
 *
 * Auth (any one):
 *   Authorization: Bearer ${X_JARVIS_CRON_SECRET}  (manual)
 *   Authorization: Bearer ${CRON_SECRET}           (Vercel auto; must accept even if Jarvis secret is set)
 *   Header x-vercel-cron: 1
 *
 * Query/body:
 *   live=1     — post replies when X_JARVIS_LIVE=1 and OAuth is set
 *   max=5      — max mentions to process
 *   status=1   — env/status only (no fetch)
 */
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, message: "GET or POST" });
  }

  const gate = authorizeJarvisCron(req);
  if (!gate.ok) {
    console.warn("[x-jarvis/cron] 401", {
      host: gate.host,
      vercelCron: gate.vercelCron,
      bearerOk: gate.bearerOk,
      vercelUa: gate.vercelUa,
      platformCron: gate.platformCron,
      hasSecret: gate.hasSecret,
    });
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
    gate.vercelCron ||
    gate.vercelUa;
  const max = Number(q.max) || 5;
  const force_since_id = String(q.since_id || "").trim();

  try {
    const data = await runXJarvisCronTick({ live, max, force_since_id });
    console.log("[x-jarvis/cron] tick", {
      host: gate.host,
      live: data.live,
      ok: data.ok,
      fetched: data.fetched ?? 0,
      results: (data.results || []).map((r) => r.status),
      error: data.error || null,
    });
    return res.status(data.ok ? 200 : 502).json({ success: data.ok, data });
  } catch (err) {
    console.error("[x-jarvis/cron]", err);
    return res.status(500).json({ success: false, message: err?.message || "cron failed" });
  }
}
