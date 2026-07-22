import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

function parseBool(raw) {
  const v = String(Array.isArray(raw) ? raw[0] : raw || "")
    .trim()
    .toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawTicker = req.query.series_ticker;
  const seriesTicker = String(Array.isArray(rawTicker) ? rawTicker[0] : rawTicker || "").trim();
  if (!seriesTicker) {
    return res.status(400).json({ error: "series_ticker is required", code: "BAD_REQUEST" });
  }

  const includeVolume = parseBool(req.query.include_volume);
  const qs = new URLSearchParams();
  // Always forward include_volume so Kalshi gets an explicit true/false.
  qs.set("include_volume", includeVolume ? "true" : "false");
  const suffix = `?${qs.toString()}`;
  const encoded = encodeURIComponent(seriesTicker);
  const url = `${kalshiLiveUrl(`series/${encoded}`)}${suffix}`;

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status >= 400 ? upstream.status : 502).json(body);
    }
    return res.status(200).json(body);
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi series API",
    });
  }
}
