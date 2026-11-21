import { relevanceScore } from "@/lib/mcp/research/relevance";
import { warRoomMarketId } from "@/lib/warRoom/ids";

import type { MarketRow } from "./MarketsPane";

type PulseMarket = {
  venue?: string | null;
  title?: string | null;
  ticker?: string | null;
  condition_id?: string | null;
  conditionId?: string | null;
  slug?: string | null;
  yes_token_id?: string | null;
  price?: number | null;
  price_change?: number | null;
  volume_24h?: number | null;
  url?: string | null;
  lychee_href?: string | null;
  imageUrl?: string | null;
  avatarUrl?: string | null;
};

function pulseVenueId(item: PulseMarket): string | null {
  const venue = String(item.venue || "").toLowerCase();
  if (venue === "kalshi" && item.ticker) return warRoomMarketId("kalshi", String(item.ticker));
  const condition = item.condition_id || item.conditionId;
  if (venue === "polymarket" && condition) return warRoomMarketId("polymarket", String(condition));
  return null;
}

/** Map a lychee_news / pulse market into a War Room feed row (desk enrich when present). */
export function pulseMarketToRow(
  item: PulseMarket,
  deskById?: Map<string, MarketRow>,
  index = 0,
): MarketRow | null {
  const title = String(item.title || "").trim();
  if (!title) return null;
  const venue = String(item.venue || "").toLowerCase() || "polymarket";
  const id = pulseVenueId(item) || `pulse:${venue}:${index}:${title.slice(0, 48)}`;
  const desk = deskById?.get(id);
  if (desk) {
    return {
      ...desk,
      price: desk.price ?? (typeof item.price === "number" ? item.price : null),
      move: desk.move ?? (typeof item.price_change === "number" ? item.price_change : null),
      volume24h: desk.volume24h ?? (typeof item.volume_24h === "number" ? item.volume_24h : null),
    };
  }
  const tokenId = item.yes_token_id ? String(item.yes_token_id) : undefined;
  return {
    id,
    title,
    venue: venue === "kalshi" ? "kalshi" : "polymarket",
    region: "",
    price: typeof item.price === "number" ? item.price : null,
    move: typeof item.price_change === "number" ? item.price_change : null,
    volume24h: typeof item.volume_24h === "number" ? item.volume_24h : null,
    slug: item.slug || null,
    venueMarketId:
      venue === "kalshi" && item.ticker
        ? String(item.ticker)
        : item.condition_id || item.conditionId || null,
    tokenIds: tokenId ? [tokenId] : undefined,
    imageUrl: item.imageUrl || null,
    avatarUrl: item.avatarUrl || null,
  };
}

/**
 * Related markets for a headline: pulse links first (newsPulse / jarvis path),
 * then lexical desk matches so the section is never empty when the desk has cousins.
 */
export function relatedMarketsForHeadline({
  pulseMarkets,
  linkedMarketId,
  headline,
  deskById,
  deskRows,
  limit = 6,
}: {
  pulseMarkets?: Array<Record<string, unknown>> | null;
  linkedMarketId?: string | null;
  headline?: string | null;
  deskById: Map<string, MarketRow>;
  deskRows: MarketRow[];
  limit?: number;
}): MarketRow[] {
  const out: MarketRow[] = [];
  const seen = new Set<string>();

  const push = (row: MarketRow | null | undefined) => {
    if (!row?.id || seen.has(row.id)) return;
    seen.add(row.id);
    out.push(row);
  };

  if (linkedMarketId) push(deskById.get(linkedMarketId));

  (pulseMarkets || []).forEach((raw, index) => {
    push(pulseMarketToRow(raw as PulseMarket, deskById, index));
  });

  if (out.length < limit && headline) {
    const scored = deskRows
      .map((row) => ({ row, score: relevanceScore(headline, row.title) }))
      .filter((x) => x.score >= 0.28)
      .sort((a, b) => b.score - a.score);
    for (const { row } of scored) {
      if (out.length >= limit) break;
      push(row);
    }
  }

  return out.slice(0, limit);
}
