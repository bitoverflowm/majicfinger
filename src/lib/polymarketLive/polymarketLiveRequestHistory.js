/**
 * Request history metadata for Polymarket Live compose pulls.
 * Sheets get provenance + requestCards so ConnectHomeRequestHistory can show
 * integration, category, endpoint, search mode, markets, and query params.
 */

import {
  POLYMARKET_LIVE_ENDPOINT_CATEGORIES,
  POLYMARKET_LIVE_CONNECT_ENDPOINTS,
} from "@/config/polymarketLiveConnect";
import { buildPolymarketMarketsListQueryValues } from "@/lib/polymarketLive/marketsCompose";
import {
  parseTokenIdList,
  POLYMARKET_ORDERBOOKS_ENDPOINT_ID,
} from "@/lib/polymarketLive/orderbooksCompose";
import { POLYMARKET_MARKET_PRICES_ENDPOINT_ID } from "@/lib/polymarketLive/marketPricesCompose";
import { POLYMARKET_MIDPOINT_PRICES_ENDPOINT_ID } from "@/lib/polymarketLive/midpointPricesCompose";
import { POLYMARKET_SPREADS_ENDPOINT_ID } from "@/lib/polymarketLive/spreadsCompose";
import { POLYMARKET_LAST_TRADE_PRICES_ENDPOINT_ID } from "@/lib/polymarketLive/lastTradePricesCompose";
import { POLYMARKET_PRICES_HISTORY_ENDPOINT_ID } from "@/lib/polymarketLive/pricesHistoryCompose";

export const POLYMARKET_LIVE_LAKE = "polymarket-live";

/** @type {Record<string, string>} */
const ENDPOINT_TITLE_FALLBACKS = {
  [POLYMARKET_MARKET_PRICES_ENDPOINT_ID]: "Market Price",
  [POLYMARKET_MIDPOINT_PRICES_ENDPOINT_ID]: "Midpoint Prices",
  [POLYMARKET_SPREADS_ENDPOINT_ID]: "Spreads",
  [POLYMARKET_LAST_TRADE_PRICES_ENDPOINT_ID]: "Last Trade Prices",
  [POLYMARKET_PRICES_HISTORY_ENDPOINT_ID]: "Trade History",
  [POLYMARKET_ORDERBOOKS_ENDPOINT_ID]: "Orderbook(s)",
  getPublicProfiles: "Get public profile(s)",
  getCurrentPositions: "Current Holder Positions",
  getClosedPositions: "Holder's Closed Positions",
  getUserActivity: "User Activity",
  getHolderPositionValue: "Total Value of Holder's Positions",
  getHolderTrades: "Holder Trades",
  getHolderTradedMarkets: "Total Markets Traded",
  getTraderLeaderboard: "Trader Leaderboard Rankings",
};

export function genPolymarketLiveRequestCardId() {
  return `req-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

/**
 * @param {string} endpointId
 * @returns {{ categoryId: string; categoryLabel: string; endpointTitle: string }}
 */
export function resolvePolymarketLiveEndpointPresentation(endpointId) {
  const id = String(endpointId || "").trim();
  const ep = POLYMARKET_LIVE_CONNECT_ENDPOINTS.find((row) => row.id === id);
  const categoryId = String(ep?.category || "markets").trim() || "markets";
  const category =
    POLYMARKET_LIVE_ENDPOINT_CATEGORIES.find((c) => c.id === categoryId) || null;
  return {
    categoryId,
    categoryLabel: category?.label || categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
    endpointTitle:
      String(ep?.title || "").trim() || ENDPOINT_TITLE_FALLBACKS[id] || id || "Endpoint",
  };
}

/**
 * @param {unknown} refs
 * @returns {{
 *   marketNames: string[];
 *   marketSlugs: string[];
 *   marketIds: string[];
 *   tokenIds: string[];
 *   marketScope: "single" | "multi";
 * }}
 */
export function summarizePolymarketLiveMarketRefs(refs) {
  const list = Array.isArray(refs) ? refs : [];
  const marketNames = [];
  const marketSlugs = [];
  const marketIds = [];
  const tokenIds = [];
  const seenNames = new Set();
  const seenSlugs = new Set();
  const seenIds = new Set();
  const seenTokens = new Set();

  for (const ref of list) {
    if (!ref || typeof ref !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (ref);
    const title = String(row.title || row.question || row.market_title || "").trim();
    const slug = String(row.slug || row.market_slug || "").trim();
    const id = String(row.id || row.market_id || "").trim();
    const tokenId = parseTokenIdList(row.tokenIds || row.token_id || row.clobTokenIds)[0] || "";
    if (title && !seenNames.has(title)) {
      seenNames.add(title);
      marketNames.push(title);
    }
    if (slug && !seenSlugs.has(slug)) {
      seenSlugs.add(slug);
      marketSlugs.push(slug);
    }
    if (id && !seenIds.has(id)) {
      seenIds.add(id);
      marketIds.push(id);
    }
    if (tokenId && !seenTokens.has(tokenId)) {
      seenTokens.add(tokenId);
      tokenIds.push(tokenId);
    }
  }

  const count = Math.max(marketNames.length, marketSlugs.length, marketIds.length, tokenIds.length, list.length);
  return {
    marketNames,
    marketSlugs,
    marketIds,
    tokenIds,
    marketCount: count,
    marketScope: count > 1 ? "multi" : "single",
  };
}

/**
 * @param {Record<string, string> | null | undefined} values
 * @returns {{ key: string; value: string }[]}
 */
export function compactPolymarketLiveQueryParams(values) {
  if (!values || typeof values !== "object") return [];
  /** @type {{ key: string; value: string }[]} */
  const out = [];
  for (const [key, raw] of Object.entries(values)) {
    const value = String(raw ?? "").trim();
    if (!value) continue;
    // Default paging/order noise stays in expanded detail only when other filters exist.
    out.push({ key, value });
  }
  return out;
}

/**
 * @param {{ key: string; value: string }[]} params
 * @param {{ max?: number }} [opts]
 */
export function formatPolymarketLiveQueryParamsCompact(params, opts = {}) {
  const list = Array.isArray(params) ? params : [];
  if (!list.length) return "";
  const max = Number.isFinite(opts.max) ? Math.max(1, Number(opts.max)) : 4;
  const shown = list.slice(0, max).map((p) => `${p.key}=${p.value}`);
  const extra = list.length - shown.length;
  return extra > 0 ? `${shown.join(" · ")} · +${extra} more` : shown.join(" · ");
}

/**
 * @param {object} input
 * @param {string} input.endpointId
 * @param {"search" | "advanced"} [input.mode]
 * @param {unknown[]} [input.marketRefs]
 * @param {unknown} [input.marketsFilters]
 * @param {string[]} [input.selectedColumns]
 * @param {string[]} [input.tokenIds]
 * @param {string[]} [input.addresses]
 * @param {Record<string, string>} [input.requestParams]
 * @param {string} [input.outcomeSelection]
 * @param {boolean} [input.separateSheetPerOutcome]
 * @param {string} [input.startTs]
 * @param {string} [input.endTs]
 * @param {string} [input.interval]
 * @param {number|string} [input.fidelity]
 */
export function buildPolymarketLiveQueryMeta(input) {
  const endpointId = String(input?.endpointId || "").trim();
  const presentation = resolvePolymarketLiveEndpointPresentation(endpointId);
  const mode = input?.mode === "advanced" ? "advanced" : "search";
  const marketSummary = summarizePolymarketLiveMarketRefs(input?.marketRefs);
  const tokenIds =
    Array.isArray(input?.tokenIds) && input.tokenIds.length
      ? input.tokenIds.map((t) => String(t || "").trim()).filter(Boolean)
      : marketSummary.tokenIds;
  const addresses = Array.isArray(input?.addresses)
    ? input.addresses.map((a) => String(a || "").trim()).filter(Boolean)
    : [];

  /** @type {Record<string, string>} */
  const queryValues = {};
  if (mode === "advanced" && input?.marketsFilters) {
    Object.assign(queryValues, buildPolymarketMarketsListQueryValues(input.marketsFilters));
  }
  if (input?.outcomeSelection) {
    queryValues.outcome = String(input.outcomeSelection).toUpperCase();
  }
  if (input?.separateSheetPerOutcome) {
    queryValues.separate_sheet_per_outcome = "true";
  }
  if (input?.startTs) queryValues.start_ts = String(input.startTs);
  if (input?.endTs) queryValues.end_ts = String(input.endTs);
  if (input?.interval) queryValues.interval = String(input.interval);
  if (input?.fidelity != null && String(input.fidelity).trim() !== "") {
    queryValues.fidelity = String(input.fidelity);
  }
  if (tokenIds.length) queryValues.token_ids = tokenIds.join(",");
  if (marketSummary.marketIds.length) queryValues.market_ids = marketSummary.marketIds.join(",");
  if (marketSummary.marketSlugs.length) queryValues.market_slugs = marketSummary.marketSlugs.join(",");
  if (addresses.length) queryValues.addresses = addresses.join(",");
  if (input?.requestParams && typeof input.requestParams === "object") {
    Object.assign(queryValues, input.requestParams);
  }
  if (Array.isArray(input?.selectedColumns) && input.selectedColumns.length) {
    queryValues.fields = input.selectedColumns.map((c) => String(c || "").trim()).filter(Boolean).join(",");
  }

  const queryParams = compactPolymarketLiveQueryParams(queryValues);
  const searchModeLabel = mode === "advanced" ? "Advanced search" : "NL search";
  const marketScopeLabel =
    addresses.length > 1
      ? `Multiple addresses (${addresses.length})`
      : addresses.length === 1
        ? "Single address"
        : marketSummary.marketScope === "multi"
          ? `Multiple markets (${Math.max(marketSummary.marketCount, 2)})`
          : "Single market";
  const marketNameLabel =
    addresses.length === 1
      ? addresses[0]
      : addresses.length > 1
        ? `${addresses[0]} +${addresses.length - 1} more`
        : marketSummary.marketNames.length === 0
          ? marketSummary.marketSlugs[0] || marketSummary.marketIds[0] || "—"
          : marketSummary.marketNames.length === 1
            ? marketSummary.marketNames[0]
            : `${marketSummary.marketNames[0]} +${marketSummary.marketNames.length - 1} more`;

  const headlineParts = [
    "Polymarket Live",
    presentation.categoryLabel,
    presentation.endpointTitle,
    searchModeLabel,
    marketScopeLabel,
  ];
  const querySummary = `${headlineParts.join(" · ")} · ${marketNameLabel}`;
  const queryDetailLines = [
    `Integration · Polymarket Live`,
    `Category · ${presentation.categoryLabel}`,
    `Endpoint · ${presentation.endpointTitle}`,
    `Search · ${searchModeLabel}`,
    addresses.length
      ? `Addresses · ${addresses.join(", ")}`
      : `Markets · ${marketScopeLabel}`,
    ...(addresses.length
      ? []
      : [
          `Market · ${
            marketSummary.marketNames.length
              ? marketSummary.marketNames.join(", ")
              : marketNameLabel
          }`,
        ]),
    ...(queryParams.length
      ? [`Params · ${formatPolymarketLiveQueryParamsCompact(queryParams, { max: 8 })}`]
      : []),
    ...queryParams.map((p) => `${p.key} = ${p.value}`),
  ];

  return {
    lake: POLYMARKET_LIVE_LAKE,
    table: presentation.categoryId,
    categoryId: presentation.categoryId,
    categoryLabel: presentation.categoryLabel,
    endpointId,
    endpointTitle: presentation.endpointTitle,
    searchMode: mode,
    searchModeLabel,
    marketScope: addresses.length > 1 || marketSummary.marketScope === "multi" ? "multi" : "single",
    marketScopeLabel,
    marketNames: addresses.length ? addresses : marketSummary.marketNames,
    marketSlugs: marketSummary.marketSlugs,
    marketIds: marketSummary.marketIds,
    tokenIds,
    addresses,
    queryParams,
    queryParamsCompact: formatPolymarketLiveQueryParamsCompact(queryParams),
    querySummary,
    queryDetailLines,
  };
}

/**
 * @param {object} input
 * @param {string} [input.sheetId]
 * @param {number} [input.elapsedMs]
 * @param {number} [input.loadedRowCount]
 * @param {string} input.endpointId
 * @param {"search" | "advanced"} [input.mode]
 * @param {unknown[]} [input.marketRefs]
 * @param {unknown} [input.marketsFilters]
 * @param {string[]} [input.selectedColumns]
 * @param {string[]} [input.tokenIds]
 * @param {string} [input.outcomeSelection]
 * @param {boolean} [input.separateSheetPerOutcome]
 */
export function buildPolymarketLiveRequestCard(input) {
  const meta = buildPolymarketLiveQueryMeta(input);
  return {
    id: genPolymarketLiveRequestCardId(),
    createdAt: Date.now(),
    elapsedMs: Number.isFinite(input?.elapsedMs) ? Number(input.elapsedMs) : undefined,
    lake: meta.lake,
    table: meta.table,
    sheetId: input?.sheetId || null,
    endpoint: meta.endpointId,
    endpointTitle: meta.endpointTitle,
    categoryLabel: meta.categoryLabel,
    searchMode: meta.searchMode,
    searchModeLabel: meta.searchModeLabel,
    marketScope: meta.marketScope,
    marketScopeLabel: meta.marketScopeLabel,
    marketNames: meta.marketNames,
    marketSlugs: meta.marketSlugs,
    marketIds: meta.marketIds,
    tokenIds: meta.tokenIds,
    queryParams: meta.queryParams,
    queryParamsCompact: meta.queryParamsCompact,
    queryDetailLines: meta.queryDetailLines,
    querySummary: meta.querySummary,
    loadedRowCount: Number.isFinite(input?.loadedRowCount)
      ? Number(input.loadedRowCount)
      : undefined,
  };
}

/**
 * @param {object} input
 * @param {string} input.endpointId
 * @param {"search" | "advanced"} [input.mode]
 * @param {unknown[]} [input.marketRefs]
 * @param {unknown} [input.marketsFilters]
 * @param {string[]} [input.selectedColumns]
 * @param {string[]} [input.tokenIds]
 * @param {string} [input.outcomeSelection]
 * @param {boolean} [input.separateSheetPerOutcome]
 */
export function buildPolymarketLiveProvenance(input) {
  const meta = buildPolymarketLiveQueryMeta(input);
  return {
    source: POLYMARKET_LIVE_LAKE,
    lake: POLYMARKET_LIVE_LAKE,
    table: meta.table,
    endpoint: meta.endpointId,
    endpointTitle: meta.endpointTitle,
    category: meta.categoryId,
    categoryLabel: meta.categoryLabel,
    mode: meta.searchMode,
    marketRefs: Array.isArray(input?.marketRefs) ? input.marketRefs : [],
    marketsFilters:
      meta.searchMode === "advanced" && input?.marketsFilters
        ? input.marketsFilters
        : undefined,
    selectedColumns: Array.isArray(input?.selectedColumns) ? input.selectedColumns : [],
    outcomeSelection: input?.outcomeSelection || undefined,
    separateSheetPerOutcome: input?.separateSheetPerOutcome === true,
    startTs: input?.startTs || undefined,
    endTs: input?.endTs || undefined,
    interval: input?.interval || undefined,
    fidelity: input?.fidelity != null ? input.fidelity : undefined,
    tokenIds: meta.tokenIds,
    addresses: meta.addresses,
    marketNames: meta.marketNames,
    queryParams: meta.queryParams,
    querySummary: meta.querySummary,
  };
}

/**
 * Attach provenance + request card to the sheet that received the pull.
 *
 * @param {Record<string, unknown>} ctx
 * @param {Parameters<typeof buildPolymarketLiveRequestCard>[0] & { loadedRowCount?: number }} input
 */
export function attachPolymarketLiveRequestMetadata(ctx, input) {
  const setDataSheets = ctx?.setDataSheets;
  if (typeof setDataSheets !== "function") return null;

  const preferredSheetId = String(input?.sheetId || ctx?.activeSheetId || "").trim();
  const loadedRowCount = Number.isFinite(input?.loadedRowCount)
    ? Number(input.loadedRowCount)
    : undefined;

  let attachedCard = null;
  setDataSheets((prev) => {
    const sheets = prev || {};
    let sheetId = preferredSheetId;
    if (!sheetId || !sheets[sheetId]) {
      const match = Object.entries(sheets).find(([, sheet]) => {
        const rows = Array.isArray(sheet?.data) ? sheet.data.length : 0;
        if (loadedRowCount != null && rows !== loadedRowCount) return false;
        const lake = String(sheet?.provenance?.lake || sheet?.provenance?.source || "").toLowerCase();
        return !lake || lake === POLYMARKET_LIVE_LAKE;
      });
      sheetId = match?.[0] || Object.keys(sheets).sort().at(-1) || "";
    }
    if (!sheetId || !sheets[sheetId]) return prev;

    const card = buildPolymarketLiveRequestCard({ ...input, sheetId });
    const provenance = buildPolymarketLiveProvenance(input);
    attachedCard = card;
    const cur = sheets[sheetId];
    const prior = Array.isArray(cur.requestCards) ? cur.requestCards : [];
    return {
      ...sheets,
      [sheetId]: {
        ...cur,
        provenance,
        requestCards: [card, ...prior.filter((c) => c?.id && c.id !== card.id)],
      },
    };
  });

  return attachedCard;
}

/**
 * Display helpers for ConnectHomeRequestHistory.
 * @param {object | null | undefined} card
 * @param {object | null | undefined} sheet
 */
export function describePolymarketLiveRequestCard(card, sheet) {
  const prov = sheet?.provenance;
  const lake = String(card?.lake || prov?.lake || prov?.source || "").toLowerCase();
  if (lake !== POLYMARKET_LIVE_LAKE && lake !== "polymarket live") {
    return null;
  }

  const endpointTitle =
    String(card?.endpointTitle || prov?.endpointTitle || "").trim() ||
    resolvePolymarketLiveEndpointPresentation(card?.endpoint || prov?.endpoint).endpointTitle;
  const categoryLabel =
    String(card?.categoryLabel || prov?.categoryLabel || "").trim() ||
    resolvePolymarketLiveEndpointPresentation(card?.endpoint || prov?.endpoint).categoryLabel;
  const searchMode = card?.searchMode || prov?.mode;
  const searchModeLabel =
    String(card?.searchModeLabel || "").trim() ||
    (searchMode === "advanced" ? "Advanced search" : searchMode === "search" ? "NL search" : "");
  const marketScopeLabel =
    String(card?.marketScopeLabel || "").trim() ||
    (card?.marketScope === "multi" || (Array.isArray(card?.marketNames) && card.marketNames.length > 1)
      ? "Multiple markets"
      : Array.isArray(card?.marketNames) && card.marketNames.length === 1
        ? "Single market"
        : "");
  const marketNames = Array.isArray(card?.marketNames)
    ? card.marketNames
    : Array.isArray(prov?.marketNames)
      ? prov.marketNames
      : [];
  const marketLabel =
    marketNames.length === 0
      ? "—"
      : marketNames.length === 1
        ? marketNames[0]
        : `${marketNames[0]} +${marketNames.length - 1} more`;
  const queryParams = Array.isArray(card?.queryParams)
    ? card.queryParams
    : Array.isArray(prov?.queryParams)
      ? prov.queryParams
      : [];
  const queryParamsCompact =
    String(card?.queryParamsCompact || "").trim() ||
    formatPolymarketLiveQueryParamsCompact(queryParams);
  const detailLines = Array.isArray(card?.queryDetailLines) ? card.queryDetailLines : [];

  return {
    integrationLabel: "Polymarket Live",
    categoryLabel,
    endpointTitle,
    searchModeLabel,
    marketScopeLabel,
    marketLabel,
    marketNames,
    queryParams,
    queryParamsCompact,
    detailLines,
    querySummary: String(card?.querySummary || prov?.querySummary || "").trim(),
  };
}
