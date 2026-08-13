/**
 * Polymarket Gamma public-search helpers for Connect home (suggestion → sheet).
 */

/**
 * @typedef {{
 *   entity: "event" | "market" | "profile" | "tag";
 *   id?: string;
 *   slug?: string;
 *   ticker?: string;
 *   title: string;
 *   subtitle?: string;
 *   conditionId?: string;
 *   parentEventId?: string;
 *   parentEventSlug?: string;
 *   proxyWallet?: string;
 *   pseudonym?: string;
 *   volume?: number | string | null;
 *   volume24hr?: number | string | null;
 *   active?: boolean | null;
 *   closed?: boolean | null;
 *   live?: boolean | null;
 *   archived?: boolean | null;
 *   featured?: boolean | null;
 *   new?: boolean | null;
 *   acceptingOrders?: boolean | null;
 *   eventCount?: number | null;
 *   tagLabels?: string[];
 *   raw?: Record<string, unknown>;
 * }} PolymarketPublicSearchSuggestion
 */

/**
 * @param {string} raw
 * @returns {boolean}
 */
export function isPolymarketPublicSearchEligible(raw) {
  return String(raw || "").trim().length >= 2;
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function formatPolymarketVolume(value) {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return `$${Math.round(n).toLocaleString()}`;
  return null;
}

/**
 * Status chips for suggestion rows (live / closed / active / etc.).
 * @param {PolymarketPublicSearchSuggestion} s
 * @returns {string[]}
 */
export function polymarketSuggestionStatusTags(s) {
  /** @type {string[]} */
  const tags = [];
  if (s?.live === true) tags.push("Live");
  if (s?.closed === true) tags.push("Closed");
  else if (s?.active === true) tags.push("Active");
  else if (s?.active === false && s?.closed !== true) tags.push("Inactive");
  if (s?.archived === true) tags.push("Archived");
  if (s?.featured === true) tags.push("Featured");
  if (s?.new === true) tags.push("New");
  if (s?.acceptingOrders === true) tags.push("Orders open");
  if (s?.acceptingOrders === false && s?.entity === "market") tags.push("Orders closed");
  return tags;
}

/**
 * Flatten nested objects lightly for sheet cells (JSON for arrays/objects).
 * @param {Record<string, unknown>} obj
 * @param {string} [prefix]
 * @returns {Record<string, unknown>}
 */
function flattenForSheet(obj, prefix = "") {
  /** @type {Record<string, unknown>} */
  const out = {};
  if (!obj || typeof obj !== "object") return out;
  for (const [key, value] of Object.entries(obj)) {
    if (key === "imageOptimized" || key === "iconOptimized" || key === "featuredImageOptimized") {
      continue;
    }
    const path = prefix ? `${prefix}_${key}` : key;
    if (value == null) {
      out[path] = "";
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        out[path] = "";
      } else if (value.every((v) => v == null || ["string", "number", "boolean"].includes(typeof v))) {
        out[path] = value.map((v) => (v == null ? "" : String(v))).join(", ");
      } else {
        out[path] = JSON.stringify(value);
      }
      continue;
    }
    if (typeof value === "object") {
      Object.assign(out, flattenForSheet(/** @type {Record<string, unknown>} */ (value), path));
      continue;
    }
    out[path] = value;
  }
  return out;
}

/**
 * @param {PolymarketPublicSearchSuggestion} suggestion
 * @returns {Record<string, unknown>[]}
 */
export function flattenPolymarketPublicSearchToRows(suggestion) {
  if (!suggestion) return [];
  const entity = String(suggestion.entity || "").trim() || "unknown";
  const raw =
    suggestion.raw && typeof suggestion.raw === "object"
      ? /** @type {Record<string, unknown>} */ (suggestion.raw)
      : {};

  if (entity === "event") {
    const markets = Array.isArray(raw.markets) ? raw.markets : [];
    if (markets.length) {
      return markets
        .filter((m) => m && typeof m === "object")
        .map((m) => {
          const market = /** @type {Record<string, unknown>} */ (m);
          return {
            entity: "market",
            parent_entity: "event",
            event_id: suggestion.id || raw.id || "",
            event_ticker: suggestion.ticker || raw.ticker || "",
            event_slug: suggestion.slug || raw.slug || "",
            event_title: suggestion.title || raw.title || "",
            event_closed: raw.closed ?? suggestion.closed ?? "",
            event_live: raw.live ?? suggestion.live ?? "",
            event_volume: raw.volume ?? suggestion.volume ?? "",
            event_volume24hr: raw.volume24hr ?? suggestion.volume24hr ?? "",
            ...flattenForSheet(market),
          };
        });
    }
    return [
      {
        entity: "event",
        id: suggestion.id || "",
        ticker: suggestion.ticker || "",
        slug: suggestion.slug || "",
        title: suggestion.title || "",
        closed: suggestion.closed ?? "",
        live: suggestion.live ?? "",
        active: suggestion.active ?? "",
        volume: suggestion.volume ?? "",
        volume24hr: suggestion.volume24hr ?? "",
        tags: Array.isArray(suggestion.tagLabels) ? suggestion.tagLabels.join(", ") : "",
        ...flattenForSheet(raw),
      },
    ];
  }

  if (entity === "market") {
    return [
      {
        entity: "market",
        id: suggestion.id || "",
        slug: suggestion.slug || "",
        title: suggestion.title || "",
        conditionId: suggestion.conditionId || "",
        parent_event_id: suggestion.parentEventId || "",
        parent_event_slug: suggestion.parentEventSlug || "",
        closed: suggestion.closed ?? "",
        active: suggestion.active ?? "",
        volume: suggestion.volume ?? "",
        volume24hr: suggestion.volume24hr ?? "",
        tags: Array.isArray(suggestion.tagLabels) ? suggestion.tagLabels.join(", ") : "",
        ...flattenForSheet(raw),
      },
    ];
  }

  if (entity === "profile") {
    return [
      {
        entity: "profile",
        id: suggestion.id || "",
        name: suggestion.title || "",
        pseudonym: suggestion.pseudonym || "",
        proxyWallet: suggestion.proxyWallet || "",
        ...flattenForSheet(raw),
      },
    ];
  }

  if (entity === "tag") {
    return [
      {
        entity: "tag",
        id: suggestion.id || "",
        label: suggestion.title || "",
        slug: suggestion.slug || "",
        event_count: suggestion.eventCount ?? "",
        ...flattenForSheet(raw),
      },
    ];
  }

  return [
    {
      entity,
      id: suggestion.id || "",
      title: suggestion.title || "",
      ...flattenForSheet(raw),
    },
  ];
}

/**
 * @param {PolymarketPublicSearchSuggestion[]} suggestions
 * @returns {Record<string, unknown>[]}
 */
export function flattenPolymarketPublicSearchSuggestionsToRows(suggestions) {
  const list = Array.isArray(suggestions) ? suggestions : [];
  /** @type {Record<string, unknown>[]} */
  const rows = [];
  for (const s of list) {
    rows.push(...flattenPolymarketPublicSearchToRows(s));
  }
  return rows;
}
