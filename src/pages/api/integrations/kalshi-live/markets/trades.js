import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";
import { parseKalshiLiveTradesTickerInput } from "@/lib/kalshiLive/tradesColumns";

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

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ticker = parseKalshiLiveTradesTickerInput(queryParam(req, "ticker"));
  const cursor = queryParam(req, "cursor");
  const limitRaw = parseIntParam(req, "limit");
  const minTs = parseIntParam(req, "min_ts");
  const maxTs = parseIntParam(req, "max_ts");

  if (!ticker) {
    return res.status(400).json({ error: "ticker is required", code: "BAD_REQUEST" });
  }

  const limit = Number.isFinite(limitRaw) ? Math.min(1000, Math.max(1, limitRaw)) : 100;

  const qs = new URLSearchParams({ limit: String(limit), ticker });
  if (cursor) qs.set("cursor", cursor);
  if (Number.isFinite(minTs)) qs.set("min_ts", String(minTs));
  if (Number.isFinite(maxTs)) qs.set("max_ts", String(maxTs));

  const url = `${kalshiLiveUrl("markets/trades")}?${qs.toString()}`;

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status >= 400 ? upstream.status : 502).json({
        error:
          typeof body?.message === "string"
            ? body.message
            : typeof body?.error === "string"
              ? body.error
              : upstream.statusText || "Kalshi trades request failed",
        ...body,
      });
    }
    return res.status(200).json({
      trades: Array.isArray(body?.trades) ? body.trades : [],
      cursor: String(body?.cursor || ""),
    });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi trades API",
    });
  }
}
