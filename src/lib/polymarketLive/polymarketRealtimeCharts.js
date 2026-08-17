import { POLYMARKET_REALTIME_FEED_OPTIONS } from "@/lib/polymarketLive/polymarketRealtimeCompose";
import { polymarketRealtimeMarketKey } from "@/lib/polymarketLive/polymarketRealtimeCompose";

const FEED_LABELS = Object.fromEntries(
  POLYMARKET_REALTIME_FEED_OPTIONS.map((option) => [option.id, option.label]),
);

function scoped(sheetId, column) {
  return `${sheetId}::${column}`;
}

function marketTitle(market) {
  return String(market?.title || market?.slug || market?.id || "Polymarket market").trim();
}

function outcomeLabel(market, tokenId) {
  return (
    market?.outcomePairs?.find((pair) => String(pair?.tokenId) === String(tokenId))?.outcome ||
    String(tokenId).slice(0, 8)
  );
}

function lineSnapshot({ sheetId, market, feedType, title }) {
  const tokens = (market?.selectedTokenIds || []).map(String).filter(Boolean);
  const fields =
    feedType === "best_bid_ask" || feedType === "book"
      ? ["best_bid", "best_ask"]
      : feedType === "tick_size_change"
        ? ["new_tick_size"]
        : ["price"];
  const selY = [];
  const chartLineFilters = [];
  const lineLabelOverrides = {};
  let index = 0;
  for (const tokenId of tokens) {
    for (const field of fields) {
      selY.push(scoped(sheetId, field));
      chartLineFilters.push({
        id: `polymarket-live-${index}`,
        seriesKey: `line:${index}`,
        column: scoped(sheetId, "asset_id"),
        operator: "=",
        value: tokenId,
      });
      const suffix =
        fields.length > 1 ? ` ${field === "best_bid" ? "bid" : "ask"}` : "";
      lineLabelOverrides[`line:${index}`] = `${outcomeLabel(market, tokenId)}${suffix}`;
      index += 1;
    }
  }
  return {
    v: 1,
    selChartType: "line",
    selX: scoped(sheetId, "time"),
    selY,
    chartLineFilters,
    lineLabelOverrides,
    title,
    titleHidden: false,
    subTitleHidden: true,
    legendVisible: selY.length > 1,
  };
}

export function buildPolymarketRealtimeChartSnapshot({
  sheetId,
  market,
  feedType,
  title,
}) {
  if (feedType === "candlesticks") {
    return {
      v: 1,
      selChartType: "candlestick",
      candlestickSheetId: String(sheetId || ""),
      candlestickOhlcSetId: "price",
      candlestickAssetId: String(market?.selectedTokenIds?.[0] || ""),
      title,
      titleHidden: false,
      subTitleHidden: true,
      selX: null,
      selY: [],
    };
  }
  return lineSnapshot({ sheetId, market, feedType, title });
}

export function buildPolymarketRealtimeChartEntries(session) {
  const entries = {};
  const sessionId = String(session?.sessionId || "");
  for (const market of session?.markets || []) {
    const marketKey = polymarketRealtimeMarketKey(market);
    if (!marketKey) continue;
    for (const feedType of session?.feedTypes || []) {
      const sheetId = session?.sheetsByFeed?.[feedType];
      if (!sheetId) continue;
      const feedLabel = FEED_LABELS[feedType] || feedType;
      const title = `${marketTitle(market)} — ${feedLabel}`;
      const id = `polymarket-live:${marketKey}:${feedType}`;
      entries[id] = {
        name: title,
        snapshot: buildPolymarketRealtimeChartSnapshot({
          sheetId,
          market,
          feedType,
          title,
        }),
        chartMeta: null,
        userCreated: true,
        source: "polymarket-live",
        liveSessionId: sessionId,
        marketKey,
        feedType,
      };
    }
  }
  return entries;
}

export function reconcilePolymarketRealtimeChartSheets(previous, entries) {
  const next = Object.fromEntries(
    Object.entries(previous || {}).filter(([, chart]) => chart?.source !== "polymarket-live"),
  );
  return { ...next, ...(entries || {}) };
}
