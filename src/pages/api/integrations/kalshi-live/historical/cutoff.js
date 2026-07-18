import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

/**
 * GET /api/integrations/kalshi-live/historical/cutoff
 * Proxies Kalshi GET /historical/cutoff (live vs historical data boundary).
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const upstream = await fetch(kalshiLiveUrl("historical/cutoff"), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error:
          typeof body?.message === "string"
            ? body.message
            : typeof body?.error === "string"
              ? body.error
              : "Failed to fetch historical cutoff",
      });
    }
    return res.status(200).json(body);
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi historical cutoff",
    });
  }
}
