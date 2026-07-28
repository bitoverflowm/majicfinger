import { normalizeKalshiLiveHolderProfileNickname } from "@/lib/kalshiLive/holderProfileColumns";
import { kalshiLiveSocialUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

function queryParam(req, name) {
  const raw = req.query[name];
  return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
}

/**
 * Proxy GET /v1/social/profile/metrics
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const nickname = normalizeKalshiLiveHolderProfileNickname(queryParam(req, "nickname"));
  if (!nickname) {
    return res.status(400).json({ error: "nickname is required" });
  }

  const qs = new URLSearchParams({ nickname });
  const url = `${kalshiLiveSocialUrl("social/profile/metrics")}?${qs.toString()}`;

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const retryAfter = upstream.headers.get("retry-after");
      if (retryAfter) res.setHeader("Retry-After", retryAfter);
      const nested =
        body?.error && typeof body.error === "object" ? body.error.message : null;
      const details =
        body?.error && typeof body.error === "object" ? body.error.details : null;
      return res.status(upstream.status >= 400 ? upstream.status : 502).json({
        error:
          typeof nested === "string"
            ? nested
            : typeof body?.message === "string"
              ? body.message
              : typeof body?.error === "string"
                ? body.error
                : upstream.statusText || "Kalshi trader metrics request failed",
        details: typeof details === "string" ? details : undefined,
        nickname,
      });
    }

    return res.status(200).json({
      metrics: body?.metrics && typeof body.metrics === "object" ? body.metrics : {},
      social_id: typeof body?.social_id === "string" ? body.social_id : "",
      nickname,
    });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi trader metrics API",
    });
  }
}
