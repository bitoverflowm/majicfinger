import { getNewsPulseFeed, newsPulseEtag } from "@/lib/newsPulse";

/**
 * GET /api/news/pulse
 *
 * Reverse-chronological lychee_news preview: `{ items, as_of, demo?, price_window? }`.
 * Each item: headline, source, url, t, markets[{ venue, title, url, price, price_change, … }].
 *
 * Query:
 * - refresh=1 | force=1 — bypass soft memo (server still coalesces within ~45s)
 * - since=<unix_ms> — adds `new_items` (rows with t > since); full `items` still returned
 *                         so open tabs can refresh prices on existing rows
 *
 * Caching: short s-maxage when idle; no-store when refresh/since so open tabs stay fresh.
 * ETag / If-None-Match → 304 when the feed fingerprint is unchanged.
 */

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Use GET" });
  }

  const refresh =
    req.query.refresh === "1" ||
    req.query.force === "1" ||
    String(req.query.refresh || "").toLowerCase() === "true";
  const sinceRaw = Number(req.query.since);
  const since = Number.isFinite(sinceRaw) && sinceRaw > 0 ? sinceRaw : null;

  const feed = await getNewsPulseFeed({ force: refresh });
  const etag = newsPulseEtag(feed);
  res.setHeader("ETag", etag);
  res.setHeader("Vary", "If-None-Match");

  if (req.headers["if-none-match"] === etag) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(304).end();
  }

  const hasItems = Array.isArray(feed.items) && feed.items.length > 0;
  const live = refresh || since != null;
  res.setHeader(
    "Cache-Control",
    live ? "no-store" : hasItems ? "public, s-maxage=90, stale-while-revalidate=300" : "no-store",
  );

  const body = { ...feed };
  if (since != null) {
    body.new_items = (feed.items || []).filter((item) => Number(item.t) > since);
    body.since = since;
  }

  return res.status(200).json(body);
}
