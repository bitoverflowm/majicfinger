const POLYMARKET_GAMMA_BASE = "https://gamma-api.polymarket.com";

/** Allowed query params for GET /events per Polymarket API */
const EVENTS_PARAMS = [
  "limit",
  "offset",
  "order",
  "ascending",
  "tag_id",
  "tag_slug",
  "related_tags",
  "active",
  "archived",
  "featured",
  "cyom",
  "include_chat",
  "include_template",
  "recurrence",
  "closed",
  "liquidity_min",
  "liquidity_max",
  "volume_min",
  "volume_max",
  "start_date_min",
  "start_date_max",
  "end_date_min",
  "end_date_max",
];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ message: "Missing query parameter (e.g. query=listEvents)" });
  }

  switch (query) {
    case "listEvents":
      return listEvents(req, res);
    default:
      return res.status(400).json({ message: "Invalid query. Supported: listEvents" });
  }
}

async function listEvents(req, res) {
  const searchParams = new URLSearchParams();

  EVENTS_PARAMS.forEach((param) => {
    const value = req.query[param];
    if (value !== undefined && value !== "") {
      searchParams.set(param, value);
    }
  });

  const url = `${POLYMARKET_GAMMA_BASE}/events?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        message: "Polymarket events fetch failed",
        status: response.status,
        detail: text || response.statusText,
      });
    }

    const data = await response.json();
    return res.status(200).json(Array.isArray(data) ? data : [data]);
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({ message: "Polymarket API request timed out" });
    }
    console.error("[polymarket] listEvents error:", error.message);
    return res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
