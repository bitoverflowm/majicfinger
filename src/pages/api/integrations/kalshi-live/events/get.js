import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

function queryParam(req, name) {
  const raw = req.query[name];
  return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
}

/**
 * Proxy GET /events/{event_ticker} — Get Event by ticker.
 * @see https://docs.kalshi.com/api-reference/events/get-event
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ticker = queryParam(req, "ticker") || queryParam(req, "event_ticker");
  if (!ticker) {
    return res.status(400).json({ error: "ticker is required", code: "BAD_REQUEST" });
  }

  const withNested =
    queryParam(req, "with_nested_markets") === "1" ||
    queryParam(req, "with_nested_markets") === "true";

  const qs = new URLSearchParams();
  if (withNested) qs.set("with_nested_markets", "true");
  const url = `${kalshiLiveUrl(`events/${encodeURIComponent(ticker)}`)}${
    qs.toString() ? `?${qs.toString()}` : ""
  }`;

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
      return res.status(upstream.status >= 400 ? upstream.status : 502).json({
        error:
          typeof body?.message === "string"
            ? body.message
            : typeof body?.error === "string"
              ? body.error
              : upstream.statusText || "Kalshi event request failed",
        ...body,
      });
    }
    return res.status(200).json(body);
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi event API",
    });
  }
}
