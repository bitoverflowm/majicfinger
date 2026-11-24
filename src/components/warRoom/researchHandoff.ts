import { parseWarRoomMarketId } from "@/lib/warRoom/ids";

import type { MarketRow } from "./MarketsPane";

/** Where a Research Holders / Research Market action was triggered. */
export type WarRoomResearchOrigin = "detail" | "news" | "trade" | "market";

/**
 * In-demo research handoff. Parents switch the Explore top tab (Holders / Markets)
 * and expand that terminal with market context — never leave the demo.
 */
export type WarRoomNavigateRequest =
  | {
      type: "holders" | "markets";
      marketId: string;
      title?: string | null;
      slug?: string | null;
      venue?: string | null;
      conditionId?: string | null;
      origin?: WarRoomResearchOrigin;
    }
  | { type: "war-room-market"; marketId: string };

export type WarRoomMarketSubject = {
  kind: "market";
  conditionId: string;
  title: string;
  slug?: string;
};

const CONDITION_ID = /^0x[a-fA-F0-9]{64}$/;

type MarketLike = Pick<MarketRow, "id" | "title" | "slug" | "venue" | "venueMarketId">;

/** Polymarket condition id for a War Room market row, if any. */
export function polymarketConditionId(market: MarketLike | null | undefined): string | null {
  if (!market) return null;
  const parsed = parseWarRoomMarketId(market.id);
  const candidate =
    (parsed?.venue === "polymarket" ? parsed.venueMarketId : null) ||
    (String(market.venue || "").toLowerCase() === "polymarket" ? market.venueMarketId : null) ||
    null;
  const id = String(candidate || "").trim();
  return CONDITION_ID.test(id) ? id : null;
}

/** Build a Holder Terminal market subject from a navigate request, when Polymarket. */
export function marketSubjectFromNavigate(
  request: Extract<WarRoomNavigateRequest, { type: "holders" | "markets" }>,
): WarRoomMarketSubject | null {
  const parsed = parseWarRoomMarketId(request.marketId);
  const conditionId = String(
    request.conditionId ||
      (parsed?.venue === "polymarket" ? parsed.venueMarketId : "") ||
      "",
  ).trim();
  if (!CONDITION_ID.test(conditionId)) return null;
  return {
    kind: "market",
    conditionId,
    title: request.title || request.marketId,
    slug: request.slug || undefined,
  };
}

/** Shared Research Holders / Research Market payload from a selected market. */
export function researchNavigateFromMarket({
  target,
  market,
  origin,
}: {
  target: "holders" | "markets";
  market: MarketLike;
  origin?: WarRoomResearchOrigin;
}): WarRoomNavigateRequest {
  const parsed = parseWarRoomMarketId(market.id);
  const venue = parsed?.venue || market.venue || null;
  return {
    type: target,
    marketId: market.id,
    title: market.title || null,
    slug: market.slug || null,
    venue,
    conditionId: polymarketConditionId(market),
    origin,
  };
}
