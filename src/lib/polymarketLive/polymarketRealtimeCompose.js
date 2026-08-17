import {
  orderbooksMarketRefFromListMarketsRow,
  orderbooksMarketRefFromSuggestion,
  parseOutcomeList,
  parseTokenIdList,
} from "@/lib/polymarketLive/orderbooksCompose";

export const POLYMARKET_REALTIME_FEED_OPTIONS = [
  {
    id: "book",
    label: "Orderbook snapshot",
    description: "Full bid and ask depth snapshots for the selected outcomes.",
  },
  {
    id: "price_change",
    label: "Price change",
    description: "Live price, size, best-bid, and best-ask updates.",
  },
  {
    id: "last_trade_price",
    label: "Last trade price",
    description: "Executed trade prices as they happen.",
  },
  {
    id: "tick_size_change",
    label: "Tick size change",
    description: "Updates when a market's minimum price increment changes.",
  },
  {
    id: "best_bid_ask",
    label: "Best bid / ask",
    description: "Top-of-book bid, ask, and spread updates.",
  },
];

export const POLYMARKET_REALTIME_FEED_IDS = POLYMARKET_REALTIME_FEED_OPTIONS.map(
  (option) => option.id,
);

/** @param {Record<string, unknown>} market */
export function polymarketRealtimeMarketKey(market) {
  return String(
    market?.conditionId || market?.id || market?.slug || market?.tokenIds?.[0] || "",
  ).trim();
}

/** @param {unknown} raw */
function marketWithOutcomePairs(raw) {
  if (!raw || typeof raw !== "object") return null;
  const source = /** @type {Record<string, unknown>} */ (raw);
  const tokenIds = parseTokenIdList(
    source.tokenIds || source.clobTokenIds || source.clob_token_ids || source.tokenId,
  );
  const outcomes = parseOutcomeList(source.outcomes || source.outcome);
  const pairs = tokenIds.map((tokenId, index) => ({
    tokenId,
    outcome: outcomes[index] || `Outcome ${index + 1}`,
  }));
  const key = polymarketRealtimeMarketKey({ ...source, tokenIds });
  if (!key || !pairs.length) return null;
  return {
    ...source,
    tokenIds,
    outcomes,
    outcomePairs: pairs,
    selectedTokenIds: pairs.map((pair) => pair.tokenId),
  };
}

/** @param {Record<string, unknown>} suggestion */
export function polymarketRealtimeMarketFromSuggestion(suggestion) {
  const ref = orderbooksMarketRefFromSuggestion(suggestion);
  if (!ref) return null;
  const raw =
    suggestion?.raw && typeof suggestion.raw === "object"
      ? /** @type {Record<string, unknown>} */ (suggestion.raw)
      : {};
  return marketWithOutcomePairs({
    ...raw,
    ...ref,
    title: ref.title || suggestion.title || raw.question || "Market",
    eventId: suggestion.parentEventId || "",
    eventSlug: suggestion.parentEventSlug || "",
    eventTitle: suggestion.subtitle || "",
  });
}

/** @param {Record<string, unknown>} suggestion */
export function polymarketRealtimeMarketsFromEventSuggestion(suggestion) {
  const raw =
    suggestion?.raw && typeof suggestion.raw === "object"
      ? /** @type {Record<string, unknown>} */ (suggestion.raw)
      : {};
  const markets = Array.isArray(raw.markets) ? raw.markets : [];
  return markets
    .filter((market) => market?.closed !== true && market?.closed !== "true")
    .map((market) => {
      const ref = orderbooksMarketRefFromListMarketsRow(market);
      if (!ref) return null;
      return marketWithOutcomePairs({
        ...market,
        ...ref,
        title: ref.title || market.question || market.groupItemTitle || "Market",
        eventId: suggestion.id || raw.id || "",
        eventSlug: suggestion.slug || raw.slug || "",
        eventTitle: suggestion.title || raw.title || "Event",
      });
    })
    .filter(Boolean);
}

/**
 * @param {Array<Record<string, unknown>>} current
 * @param {Array<Record<string, unknown>>} incoming
 */
export function mergePolymarketRealtimeMarkets(current, incoming) {
  const byKey = new Map();
  for (const market of [...(current || []), ...(incoming || [])]) {
    const key = polymarketRealtimeMarketKey(market);
    if (!key) continue;
    const previous = byKey.get(key);
    byKey.set(key, previous ? { ...market, selectedTokenIds: previous.selectedTokenIds } : market);
  }
  return [...byKey.values()];
}

/**
 * @param {{
 *   markets?: Array<Record<string, unknown>>;
 *   feedTypes?: string[];
 * }} input
 */
export function buildPolymarketRealtimeConnection(input) {
  const feedTypes = [...new Set((input.feedTypes || []).filter((id) =>
    POLYMARKET_REALTIME_FEED_IDS.includes(id),
  ))];
  const markets = (input.markets || [])
    .map((market) => {
      const selected = new Set(
        parseTokenIdList(market.selectedTokenIds).filter((tokenId) =>
          parseTokenIdList(market.tokenIds).includes(tokenId),
        ),
      );
      const outcomePairs = Array.isArray(market.outcomePairs) ? market.outcomePairs : [];
      return {
        ...market,
        selectedTokenIds: [...selected],
        selectedOutcomes: outcomePairs
          .filter((pair) => selected.has(String(pair?.tokenId || "")))
          .map((pair) => String(pair?.outcome || "")),
      };
    })
    .filter((market) => market.selectedTokenIds.length > 0);
  const assetIds = [...new Set(markets.flatMap((market) => market.selectedTokenIds))];

  if (!markets.length || !assetIds.length) {
    throw new Error("Select at least one market outcome to track.");
  }
  if (!feedTypes.length) {
    throw new Error("Select at least one real-time feed.");
  }
  return { markets, feedTypes, assetIds };
}
