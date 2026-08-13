/**
 * Polymarket Live — Get Market/Markets compose (Search + Advanced / list markets).
 */

import { MARKETS_RESPONSE_FIELDS } from "@/components/integrationsView/integrationPlayground/integrations/polymarket/config";

/** @typedef {"search" | "advanced"} PolymarketMarketsComposeMode */

/**
 * @typedef {{
 *   id: string;
 *   slug?: string;
 *   conditionId?: string;
 *   tokenId?: string;
 *   title?: string;
 * }} PolymarketMarketRef
 */

/**
 * @typedef {{
 *   id: string;
 *   slug: string;
 *   label?: string;
 * }} PolymarketTagRef
 */

/**
 * @typedef {{
 *   mode: PolymarketMarketsComposeMode;
 *   limit: number;
 *   orderFields: string[];
 *   ascending: boolean;
 *   marketRefs: PolymarketMarketRef[];
 *   tags: PolymarketTagRef[];
 *   closed: boolean | null;
 *   cyom: boolean | null;
 *   relatedTags: boolean | null;
 *   includeTag: boolean | null;
 *   liquidityNumMin: string;
 *   liquidityNumMax: string;
 *   volumeNumMin: string;
 *   volumeNumMax: string;
 *   umaResolutionStatus: string;
 *   gameId: string;
 *   sportsMarketTypes: string;
 *   rewardsMinSize: string;
 *   marketMakerAddress: string;
 *   questionIds: string;
 *   startDateMin: string;
 *   startDateMax: string;
 *   endDateMin: string;
 *   endDateMax: string;
 * }} PolymarketMarketsComposeState
 */

export const POLYMARKET_MARKETS_COMPOSE_ENDPOINT_ID = "getMarkets";

export const POLYMARKET_MARKETS_SORT_OPTIONS = [
  { value: "id", label: "ID" },
  { value: "volumeNum", label: "Volume" },
  { value: "volume24hr", label: "Volume (24h)" },
  { value: "volume1wk", label: "Volume (1 wk)" },
  { value: "volume1mo", label: "Volume (1 mo)" },
  { value: "volume1yr", label: "Volume (1 yr)" },
  { value: "liquidityNum", label: "Liquidity" },
  { value: "startDate", label: "Start date" },
  { value: "endDate", label: "End date" },
  { value: "createdAt", label: "Created at" },
  { value: "updatedAt", label: "Updated at" },
  { value: "closedTime", label: "Closed time" },
  { value: "competitive", label: "Competitive" },
  { value: "spread", label: "Spread" },
  { value: "lastTradePrice", label: "Last trade price" },
  { value: "bestBid", label: "Best bid" },
  { value: "bestAsk", label: "Best ask" },
  { value: "acceptingOrdersTimestamp", label: "Accepting orders timestamp" },
];

/** Response columns for Get Market/Markets (list markets). */
export const POLYMARKET_MARKETS_COMPOSE_COLUMNS = MARKETS_RESPONSE_FIELDS.filter(
  (name) => !["marketId", "eventId", "outcome", "price", "winner"].includes(name),
).map((name) => ({
  name,
  type: "string",
  description: String(name || "")
    .replace(/([A-Z])/g, " $1")
    .trim(),
}));

/** Default selected columns for a useful first pull. */
export const POLYMARKET_MARKETS_COMPOSE_DEFAULT_COLUMNS = [
  "id",
  "question",
  "conditionId",
  "slug",
  "active",
  "closed",
  "volume",
  "volumeNum",
  "volume24hr",
  "liquidity",
  "liquidityNum",
  "bestBid",
  "bestAsk",
  "outcomes",
  "outcomePrices",
  "clobTokenIds",
  "endDate",
  "startDate",
];

/**
 * @param {unknown} v
 * @returns {string}
 */
function normalizeNumString(v) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const n = Number(s);
  return Number.isFinite(n) ? String(s) : "";
}

/**
 * @returns {PolymarketMarketsComposeState}
 */
export function emptyPolymarketMarketsComposeState() {
  return {
    mode: "search",
    limit: 20,
    orderFields: ["volume24hr"],
    ascending: false,
    marketRefs: [],
    tags: [],
    closed: null,
    cyom: null,
    relatedTags: null,
    includeTag: null,
    liquidityNumMin: "",
    liquidityNumMax: "",
    volumeNumMin: "",
    volumeNumMax: "",
    umaResolutionStatus: "",
    gameId: "",
    sportsMarketTypes: "",
    rewardsMinSize: "",
    marketMakerAddress: "",
    questionIds: "",
    startDateMin: "",
    startDateMax: "",
    endDateMin: "",
    endDateMax: "",
  };
}

/**
 * @param {unknown} raw
 * @returns {PolymarketMarketsComposeState}
 */
export function normalizePolymarketMarketsComposeState(raw) {
  const base = emptyPolymarketMarketsComposeState();
  if (!raw || typeof raw !== "object") return base;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const mode = o.mode === "advanced" ? "advanced" : "search";
  const limitNum = Number(o.limit);
  const limit = Number.isFinite(limitNum) && limitNum >= 0 ? Math.min(500, Math.floor(limitNum)) : 20;
  const orderFields = Array.isArray(o.orderFields)
    ? o.orderFields.map((f) => String(f || "").trim()).filter(Boolean)
    : base.orderFields;
  const marketRefs = Array.isArray(o.marketRefs)
    ? o.marketRefs
        .map((r) => {
          if (!r || typeof r !== "object") return null;
          const row = /** @type {Record<string, unknown>} */ (r);
          const id = String(row.id || "").trim();
          const slug = String(row.slug || "").trim();
          const conditionId = String(row.conditionId || "").trim();
          const tokenId = String(row.tokenId || "").trim();
          if (!id && !slug && !conditionId && !tokenId) return null;
          return {
            id,
            slug: slug || undefined,
            conditionId: conditionId || undefined,
            tokenId: tokenId || undefined,
            title: String(row.title || "").trim() || undefined,
          };
        })
        .filter(Boolean)
    : [];
  const tags = Array.isArray(o.tags)
    ? o.tags
        .map((t) => {
          if (!t || typeof t !== "object") return null;
          const row = /** @type {Record<string, unknown>} */ (t);
          const id = String(row.id || "").trim();
          const slug = String(row.slug || "").trim();
          if (!id && !slug) return null;
          return {
            id: id || slug,
            slug: slug || id,
            label: String(row.label || "").trim() || undefined,
          };
        })
        .filter(Boolean)
    : [];

  /** @param {unknown} v */
  const tri = (v) => (v === true ? true : v === false ? false : null);

  return {
    mode,
    limit,
    orderFields: orderFields.length ? orderFields : base.orderFields,
    ascending: o.ascending === true,
    marketRefs: /** @type {PolymarketMarketRef[]} */ (marketRefs),
    tags: /** @type {PolymarketTagRef[]} */ (tags),
    closed: tri(o.closed),
    cyom: tri(o.cyom),
    relatedTags: tri(o.relatedTags),
    includeTag: tri(o.includeTag),
    liquidityNumMin: normalizeNumString(o.liquidityNumMin),
    liquidityNumMax: normalizeNumString(o.liquidityNumMax),
    volumeNumMin: normalizeNumString(o.volumeNumMin),
    volumeNumMax: normalizeNumString(o.volumeNumMax),
    umaResolutionStatus: String(o.umaResolutionStatus || "").trim(),
    gameId: String(o.gameId || "").trim(),
    sportsMarketTypes: String(o.sportsMarketTypes || "").trim(),
    rewardsMinSize: normalizeNumString(o.rewardsMinSize),
    marketMakerAddress: String(o.marketMakerAddress || "").trim(),
    questionIds: String(o.questionIds || "").trim(),
    startDateMin: String(o.startDateMin || "").trim(),
    startDateMax: String(o.startDateMax || "").trim(),
    endDateMin: String(o.endDateMin || "").trim(),
    endDateMax: String(o.endDateMax || "").trim(),
  };
}

/**
 * Build query values for GET /markets (via our polymarket proxy as listMarkets).
 *
 * @param {PolymarketMarketsComposeState} state
 * @returns {Record<string, string>}
 */
export function buildPolymarketMarketsListQueryValues(state) {
  const s = normalizePolymarketMarketsComposeState(state);
  /** @type {Record<string, string>} */
  const values = {};
  values.limit = String(s.limit);
  if (s.orderFields.length) values.order = s.orderFields.join(",");
  values.ascending = s.ascending ? "true" : "false";

  const tokenIds = s.marketRefs.map((r) => r.tokenId).filter(Boolean);
  if (tokenIds.length) values.clob_token_ids = tokenIds.join(",");
  const tokenIdSet = new Set(tokenIds);
  // Only send Gamma market ids — skip values that were incorrectly stored as token ids.
  const ids = s.marketRefs
    .map((r) => r.id)
    .filter((id) => id && !tokenIdSet.has(id));
  if (ids.length) values.id = ids.join(",");
  const slugs = s.marketRefs.map((r) => r.slug).filter(Boolean);
  if (slugs.length) values.slug = slugs.join(",");
  const conditionIds = s.marketRefs.map((r) => r.conditionId).filter(Boolean);
  if (conditionIds.length) values.condition_ids = conditionIds.join(",");

  // List markets accepts a single tag filter — use the first selected tag's numeric id.
  const primaryTag = s.tags[0];
  if (primaryTag && /^\d+$/.test(String(primaryTag.id))) {
    values.tag_id = String(primaryTag.id);
  }

  /** @param {string} key @param {boolean | null} v */
  const setBool = (key, v) => {
    if (v === true) values[key] = "true";
    else if (v === false) values[key] = "false";
  };
  setBool("closed", s.closed);
  setBool("cyom", s.cyom);
  setBool("related_tags", s.relatedTags);
  setBool("include_tag", s.includeTag);

  if (s.liquidityNumMin) values.liquidity_num_min = s.liquidityNumMin;
  if (s.liquidityNumMax) values.liquidity_num_max = s.liquidityNumMax;
  if (s.volumeNumMin) values.volume_num_min = s.volumeNumMin;
  if (s.volumeNumMax) values.volume_num_max = s.volumeNumMax;

  if (s.startDateMin) values.start_date_min = s.startDateMin;
  if (s.startDateMax) values.start_date_max = s.startDateMax;
  if (s.endDateMin) values.end_date_min = s.endDateMin;
  if (s.endDateMax) values.end_date_max = s.endDateMax;

  if (s.umaResolutionStatus) values.uma_resolution_status = s.umaResolutionStatus;
  if (s.gameId) values.game_id = s.gameId;
  if (s.sportsMarketTypes) values.sports_market_types = s.sportsMarketTypes;
  if (s.rewardsMinSize) values.rewards_min_size = s.rewardsMinSize;
  if (s.marketMakerAddress) values.market_maker_address = s.marketMakerAddress;
  if (s.questionIds) values.question_ids = s.questionIds;

  return values;
}
