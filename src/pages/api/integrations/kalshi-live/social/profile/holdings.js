import { normalizeKalshiLiveHolderProfileNickname } from "@/lib/kalshiLive/holderProfileColumns";
import { kalshiLiveSocialUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

function queryParam(req, name) {
  const raw = req.query[name];
  return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
}

/**
 * Proxy GET /v1/social/profile/holdings
 * One page per request — client follows cursor.
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

  const cursor = queryParam(req, "cursor");
  const closedRaw = queryParam(req, "closed_positions").toLowerCase();
  const closedPositions = closedRaw === "1" || closedRaw === "true" || closedRaw === "yes";
  const limitRaw = Number(queryParam(req, "limit"));
  const limit = Math.min(
    100,
    Math.max(1, Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.floor(limitRaw) : 25),
  );

  const qs = new URLSearchParams({
    nickname,
    limit: String(limit),
  });
  if (closedPositions) qs.set("closed_positions", "true");
  if (cursor) qs.set("cursor", cursor);

  const url = `${kalshiLiveSocialUrl("social/profile/holdings")}?${qs.toString()}`;

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
                : upstream.statusText || "Kalshi trader holdings request failed",
        details: typeof details === "string" ? details : undefined,
        nickname,
      });
    }

    return res.status(200).json({
      holdings: Array.isArray(body?.holdings) ? body.holdings : [],
      cursor: typeof body?.cursor === "string" ? body.cursor : "",
      social_id: typeof body?.social_id === "string" ? body.social_id : "",
      visibility_state:
        typeof body?.visibility_state === "string" ? body.visibility_state : "",
      nickname,
      closed_positions: closedPositions,
      limit,
    });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi trader holdings API",
    });
  }
}
