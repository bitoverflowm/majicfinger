/**
 * Pure X payload formatters for @lychee_news threads.
 * Main post = headline + publisher source/link.
 * Replies = impacted markets (name, price, volume if present, link).
 */
import { formatPulsePrice, formatPulsePriceChange } from "@/lib/newsPulseFormat";

export const X_CHAR_LIMIT = 280;
export const MAX_MARKET_REPLIES = 4;
export const CTA = "lycheedata.com/news";

/** Compact USD volume (24h or total) for tweet lines. */
export function formatVolume(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  if (v >= 1_000_000_000) return `$${trimNum(v / 1_000_000_000)}B`;
  if (v >= 1_000_000) return `$${trimNum(v / 1_000_000)}M`;
  if (v >= 1_000) return `$${trimNum(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}

function trimNum(n) {
  const s = n >= 10 ? n.toFixed(0) : n.toFixed(1);
  return s.replace(/\.0$/, "");
}

function venueLabel(venue) {
  if (venue === "kalshi") return "Kalshi";
  if (venue === "polymarket") return "Polymarket";
  return String(venue || "Market").trim() || "Market";
}

function cleanHeadline(raw) {
  return String(raw || "")
    .replace(/\s+/g, " ")
    .replace(/\s+[-–—]\s+[A-Za-z0-9 .,&'+-]{2,40}\s*$/, "")
    .trim();
}

function publisherSource(item) {
  const source = String(item?.source || "").trim();
  if (source) return source;
  try {
    const host = new URL(String(item?.url || "")).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

/** Truncate to limit without breaking mid-URL when possible. */
export function clipTweet(text, limit = X_CHAR_LIMIT) {
  const s = String(text || "").trim();
  if (s.length <= limit) return s;
  const cut = s.slice(0, Math.max(0, limit - 1));
  const lastSpace = cut.lastIndexOf(" ");
  const body = lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${body.trimEnd()}…`;
}

/**
 * Root tweet: headline + real publisher attribution (+ URL when it fits).
 * @param {Record<string, unknown>} item pulse item
 */
export function formatMainPost(item) {
  const headline = cleanHeadline(item?.headline);
  if (!headline) return "";
  const source = publisherSource(item);
  const url = String(item?.url || "").trim() || null;
  // Prefer publisher origin URLs only (pulse already strips Google News).
  const via = source ? `via ${source}` : null;

  const candidates = [
    [headline, via, url].filter(Boolean).join("\n"),
    [headline, via].filter(Boolean).join("\n"),
    headline,
  ];
  for (const c of candidates) {
    if (c.length <= X_CHAR_LIMIT) return c;
  }
  return clipTweet(headline);
}

/**
 * One thread reply for an impacted market.
 * @param {Record<string, unknown>} market
 */
export function formatMarketReply(market) {
  const title = String(market?.title || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!title) return "";
  const venue = venueLabel(market?.venue);
  const price = formatPulsePrice(market?.price);
  const change = formatPulsePriceChange(market?.price_change ?? NaN);
  const vol = formatVolume(market?.volume_24h ?? market?.volume24h ?? market?.volume);
  const url = String(market?.url || market?.lychee_href || "").trim() || null;

  const head = `${venue} · ${title}`.slice(0, 160);
  const stats = [price, change, vol ? `vol ${vol}` : null].filter(Boolean).join(" · ");
  const lines = [head, stats || null, url].filter(Boolean);
  return clipTweet(lines.join("\n"));
}

/**
 * Full thread payload from one pulse item (no network).
 * @param {Record<string, unknown>} item
 * @returns {{ main: string, replies: string[], markets_included: number, skipped: boolean, reason?: string }}
 */
export function formatNewsThread(item) {
  const main = formatMainPost(item);
  if (!main) {
    return { main: "", replies: [], markets_included: 0, skipped: true, reason: "empty_headline" };
  }
  const markets = (item?.markets || []).filter((m) => m?.title && (m.url || m.lychee_href));
  if (!markets.length) {
    return { main, replies: [], markets_included: 0, skipped: true, reason: "no_markets" };
  }
  const replies = markets
    .slice(0, MAX_MARKET_REPLIES)
    .map(formatMarketReply)
    .filter(Boolean);
  // Soft CTA as final reply only when we have room and at least one market.
  if (replies.length && replies.length < MAX_MARKET_REPLIES) {
    const cta = clipTweet(`More on the pulse → ${CTA}`);
    if (cta) replies.push(cta);
  }
  return {
    main,
    replies,
    markets_included: Math.min(markets.length, MAX_MARKET_REPLIES),
    skipped: false,
  };
}

/**
 * @param {Array<Record<string, unknown>>} items
 */
export function formatNewsThreads(items, { limit = 12 } = {}) {
  const out = [];
  for (const item of items || []) {
    if (out.length >= limit) break;
    const thread = formatNewsThread(item);
    if (thread.skipped && !thread.main) continue;
    out.push({
      id: item?.id || null,
      t: item?.t ?? null,
      source: publisherSource(item),
      url: item?.url || null,
      headline: item?.headline || null,
      thread,
    });
  }
  return out;
}
