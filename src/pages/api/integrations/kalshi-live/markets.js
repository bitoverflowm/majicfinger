import { buildKalshiLiveMarketsQueryParams } from "@/lib/kalshiLive/marketFilterRules";
import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

function parseFiltersParam(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawFilters = req.query.filters;
  const filtersJson = Array.isArray(rawFilters) ? rawFilters[0] : rawFilters;
  const filters = parseFiltersParam(filtersJson);

  const rawLimit = req.query.limit;
  const limit = rawLimit != null ? Number(Array.isArray(rawLimit) ? rawLimit[0] : rawLimit) : undefined;

  const rawCursor = req.query.cursor;
  const cursor = String(Array.isArray(rawCursor) ? rawCursor[0] : rawCursor || "").trim();

  const rawTickers = req.query.tickers;
  const tickers = String(Array.isArray(rawTickers) ? rawTickers[0] : rawTickers || "").trim();

  let params;
  try {
    params = buildKalshiLiveMarketsQueryParams(filters, { limit, tickers });
  } catch (e) {
    return res.status(400).json({
      error: e instanceof Error ? e.message : "Invalid filters",
    });
  }

  if (cursor) params.cursor = cursor;

  const qs = new URLSearchParams(params);
  const url = `${kalshiLiveUrl("markets")}?${qs.toString()}`;

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status >= 400 ? upstream.status : 502).json({
        error: body?.message || body?.error || upstream.statusText || "Kalshi markets request failed",
        ...body,
      });
    }
    return res.status(200).json(body);
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi markets API",
    });
  }
}
