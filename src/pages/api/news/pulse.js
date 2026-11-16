import { getNewsPulseFeed } from "@/lib/newsPulse";

/**
 * GET /api/news/pulse
 *
 * Reverse-chronological lychee_news preview: `{ items, as_of, demo? }`.
 * Each item: headline, source, url, t, markets[{ venue, title, url, … }].
 */

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Use GET" });
  }

  const feed = await getNewsPulseFeed();
  const hasItems = Array.isArray(feed.items) && feed.items.length > 0;
  res.setHeader(
    "Cache-Control",
    hasItems ? "public, s-maxage=600, stale-while-revalidate=1800" : "no-store",
  );
  return res.status(200).json(feed);
}
