/**
 * Polymarket Live — Get Open Interest (Data API GET /v2/oi).
 * Pass condition ids as `condition` (at most 20 per request). Omit them for the global figure.
 */

/** @typedef {"search" | "advanced"} PolymarketOpenInterestComposeMode */

/**
 * @typedef {{
 *   id: string;
 *   slug?: string;
 *   conditionId?: string;
 *   title?: string;
 * }} PolymarketOpenInterestMarketRef
 */

/**
 * @typedef {{
 *   mode: PolymarketOpenInterestComposeMode;
 *   marketRefs: PolymarketOpenInterestMarketRef[];
 * }} PolymarketOpenInterestComposeState
 */

export const POLYMARKET_OPEN_INTEREST_COMPOSE_ENDPOINT_ID = "getOpenInterestCompose";

export const POLYMARKET_OPEN_INTEREST_COMPOSE_COLUMNS = [
  { name: "market", type: "string", description: "Condition id this row answers for. GLOBAL is the market-wide figure." },
  { name: "value", type: "number", description: "Priced gross open interest in USDC. Zero when nothing is held." },
  { name: "market_id", type: "string", description: "Gamma market id (when known)" },
  { name: "market_slug", type: "string", description: "Market slug (when known)" },
  { name: "market_title", type: "string", description: "Market question / title (when known)" },
];

export const POLYMARKET_OPEN_INTEREST_DEFAULT_COLUMNS = [
  "market",
  "value",
  "market_title",
  "market_slug",
];

/**
 * @returns {PolymarketOpenInterestComposeState}
 */
export function emptyPolymarketOpenInterestComposeState() {
  return {
    mode: "search",
    marketRefs: [],
  };
}

/**
 * @param {unknown} raw
 * @returns {PolymarketOpenInterestComposeState}
 */
export function normalizePolymarketOpenInterestComposeState(raw) {
  const base = emptyPolymarketOpenInterestComposeState();
  if (!raw || typeof raw !== "object") return base;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const mode = o.mode === "advanced" ? "advanced" : "search";
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
    marketRefs: /** @type {PolymarketOpenInterestMarketRef[]} */ (marketRefs),
  };
}

/**
 * Data API `/v2/oi` rows. Accepts the `{ data }` envelope, a skip-flatten wrapper, or a flat list.
 * `condition_id` is also copied to `market` so older sheets keep the condition id column.
 * @param {unknown} payload
 * @returns {Record<string, unknown>[]}
 */
export function openInterestRowsFromPayload(payload) {
  const wrapped = Array.isArray(payload) && payload.length === 1 ? payload[0] : payload;
  const list = Array.isArray(wrapped?.data)
    ? wrapped.data
    : Array.isArray(payload)
      ? payload
      : wrapped && typeof wrapped === "object"
        ? [wrapped]
        : [];
  return list
    .filter((row) => row && typeof row === "object")
    .map((row) => {
      const conditionId = String(row.condition_id || row.conditionId || row.market || "").trim();
      return {
        condition_id: conditionId,
        market: conditionId,
        value: row.value ?? "",
      };
    })
    .filter((row) => row.condition_id || row.value !== "");
}

export function conditionIdsFromOpenInterestCompose(state) {
  const s = normalizePolymarketOpenInterestComposeState(state);
  return [
    ...new Set(s.marketRefs.map((r) => String(r.conditionId || "").trim()).filter(Boolean)),
  ];
}

/**
 * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion | null | undefined} suggestion
 * @returns {PolymarketOpenInterestMarketRef | null}
 */
export function openInterestMarketRefFromSuggestion(suggestion) {
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
