import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";
import { parseKalshiLiveOrderbookTickerInput } from "@/lib/kalshiLive/orderbookColumns";

function queryParam(req, name) {
  const raw = req.query[name];
  return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
}

function parseIntParam(req, name) {
  const raw = req.query[name];
  if (raw == null || raw === "") return NaN;
  const n = Math.floor(Number(Array.isArray(raw) ? raw[0] : raw));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Proxy GET /markets/{ticker}/orderbook — no Kalshi auth headers.
 * Docs list API keys as required; public trade API often still returns orderbooks without them.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ticker = parseKalshiLiveOrderbookTickerInput(queryParam(req, "ticker"));
  const depthRaw = parseIntParam(req, "depth");

  if (!ticker) {
    return res.status(400).json({ error: "ticker is required", code: "BAD_REQUEST" });
  }

  const qs = new URLSearchParams();
  if (Number.isFinite(depthRaw) && depthRaw >= 0 && depthRaw <= 100) {
    qs.set("depth", String(depthRaw));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const url = `${kalshiLiveUrl(`markets/${encodeURIComponent(ticker)}/orderbook`)}${suffix}`;

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
              : upstream.statusText || "Kalshi orderbook request failed",
        ...body,
      });
    }
    return res.status(200).json({
      orderbook_fp: body?.orderbook_fp ?? { yes_dollars: [], no_dollars: [] },
      ticker,
    });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi orderbook API",
    });
  }
}
