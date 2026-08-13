/**
 * Polymarket Live — Get holders by market(s) (Data API GET /holders).
 */

/** @typedef {"search" | "advanced"} PolymarketHoldersByMarketsComposeMode */

/**
 * @typedef {{
 *   id: string;
 *   slug?: string;
 *   conditionId?: string;
 *   title?: string;
 * }} PolymarketHoldersMarketRef
 */

/**
 * @typedef {{
 *   mode: PolymarketHoldersByMarketsComposeMode;
 *   limit: number;
 *   minBalance: number;
 *   marketRefs: PolymarketHoldersMarketRef[];
 * }} PolymarketHoldersByMarketsComposeState
 */

export const POLYMARKET_HOLDERS_BY_MARKETS_ENDPOINT_ID = "getHoldersByMarkets";

/** Max holders per token (Polymarket Data API cap). */
export const POLYMARKET_HOLDERS_BY_MARKETS_LIMIT_MAX = 20;

export const POLYMARKET_HOLDERS_BY_MARKETS_COMPOSE_COLUMNS = [
  { name: "token", type: "string", description: "Outcome token / asset id" },
  { name: "proxyWallet", type: "string", description: "Holder wallet" },
  { name: "amount", type: "number", description: "Position size" },
  { name: "name", type: "string", description: "Display name" },
  { name: "pseudonym", type: "string", description: "Pseudonym" },
  { name: "bio", type: "string", description: "Profile bio" },
  { name: "profileImage", type: "string", description: "Profile image URL" },
  { name: "profileImageOptimized", type: "string", description: "Optimized profile image" },
  { name: "asset", type: "string", description: "Asset id" },
  { name: "outcomeIndex", type: "number", description: "Outcome index" },
  { name: "displayUsernamePublic", type: "boolean", description: "Display username publicly" },
  { name: "conditionId", type: "string", description: "Market condition id (when known)" },
  { name: "market_id", type: "string", description: "Gamma market id (when known)" },
  { name: "market_slug", type: "string", description: "Market slug (when known)" },
  { name: "market_title", type: "string", description: "Market question / title (when known)" },
];

export const POLYMARKET_HOLDERS_BY_MARKETS_DEFAULT_COLUMNS = [
  "token",
  "proxyWallet",
  "amount",
  "name",
  "pseudonym",
  "outcomeIndex",
  "conditionId",
  "market_title",
];

/**
 * @returns {PolymarketHoldersByMarketsComposeState}
 */
export function emptyPolymarketHoldersByMarketsComposeState() {
  return {
    mode: "search",
    limit: 20,
    minBalance: 1,
    marketRefs: [],
  };
}

/**
 * @param {unknown} raw
 * @returns {PolymarketHoldersByMarketsComposeState}
 */
export function normalizePolymarketHoldersByMarketsComposeState(raw) {
  const base = emptyPolymarketHoldersByMarketsComposeState();
  if (!raw || typeof raw !== "object") return base;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const mode = o.mode === "advanced" ? "advanced" : "search";
  const limitNum = Number(o.limit);
  const limit =
    Number.isFinite(limitNum) && limitNum >= 0
      ? Math.min(POLYMARKET_HOLDERS_BY_MARKETS_LIMIT_MAX, Math.floor(limitNum))
      : 20;
  const minBalNum = Number(o.minBalance);
  const minBalance =
    Number.isFinite(minBalNum) && minBalNum >= 0 ? Math.min(999999, Math.floor(minBalNum)) : 1;
  const marketRefs = Array.isArray(o.marketRefs)
    ? o.marketRefs
        .map((r) => {
          if (!r || typeof r !== "object") return null;
          const row = /** @type {Record<string, unknown>} */ (r);
          const id = String(row.id || "").trim();
          const slug = String(row.slug || "").trim();
          const conditionId = String(row.conditionId || "").trim();
          if (!id && !slug && !conditionId) return null;
          return {
            id,
            slug: slug || undefined,
            conditionId: conditionId || undefined,
            title: String(row.title || "").trim() || undefined,
          };
        })
        .filter(Boolean)
    : [];

  return {
    mode,
    limit,
    minBalance,
    marketRefs: /** @type {PolymarketHoldersMarketRef[]} */ (marketRefs),
  };
}

/**
 * Build query values for GET /holders (via our polymarket proxy as getTopHolders).
 *
 * @param {PolymarketHoldersByMarketsComposeState} state
 * @returns {Record<string, string> | null} null when no condition ids
 */
export function buildPolymarketHoldersByMarketsQueryValues(state) {
  const s = normalizePolymarketHoldersByMarketsComposeState(state);
  const conditionIds = [
    ...new Set(s.marketRefs.map((r) => String(r.conditionId || "").trim()).filter(Boolean)),
  ];
  if (!conditionIds.length) return null;
  return {
    market: conditionIds.join(","),
    limit: String(s.limit),
    minBalance: String(s.minBalance),
  };
}

/**
 * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion | null | undefined} suggestion
 * @returns {PolymarketHoldersMarketRef | null}
 */
export function marketRefFromPublicSearchSuggestion(suggestion) {
  if (!suggestion) return null;
  const raw =
    suggestion.raw && typeof suggestion.raw === "object"
      ? /** @type {Record<string, unknown>} */ (suggestion.raw)
      : {};
  const id = String(suggestion.id || raw.id || "").trim();
  const slug = String(suggestion.slug || raw.slug || "").trim();
  const conditionId = String(
    suggestion.conditionId || raw.conditionId || raw.condition_id || "",
  ).trim();
  const title = String(suggestion.title || raw.question || raw.groupItemTitle || "").trim();
  if (!id && !slug && !conditionId) return null;
  return {
    id,
    slug: slug || undefined,
    conditionId: conditionId || undefined,
    title: title || undefined,
  };
}
