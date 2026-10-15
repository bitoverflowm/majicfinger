import { projectCatalogRow } from "@/lib/integrations/columnPayload";
import { POLYMARKET_MARKET_CATEGORIES } from "@/lib/polymarketLive/polymarketMarketScan";

export const POLYMARKET_TRADER_LEADERBOARD_ENDPOINT_ID = "getTraderLeaderboard";

const PERIODS = [
  ["day", "Day"],
  ["week", "Week"],
  ["month", "Month"],
  ["all", "All"],
];

const SORTS = [
  ["PNL", "PnL"],
  ["VOLUME", "Volume"],
];

/**
 * overall, every Gamma browse category, then the board's synthetic categories.
 * Values are the slugs `/v2/leaderboard` accepts.
 */
export function polymarketLeaderboardCategoryOptions() {
  const options = [["overall", "Overall"]];
  const seen = new Set(["overall"]);
  for (const item of POLYMARKET_MARKET_CATEGORIES) {
    const slug = String(item?.slug || "").trim().toLowerCase();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    options.push([slug, item.label || slug]);
  }
  for (const [slug, label] of [
    ["combos", "Combos"],
    ["esports", "Esports"],
  ]) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    options.push([slug, label]);
  }
  return options;
}

export const POLYMARKET_TRADER_LEADERBOARD_CATEGORY_OPTIONS = polymarketLeaderboardCategoryOptions().map(
  ([value]) => value,
);

export const POLYMARKET_TRADER_LEADERBOARD_TIME_PERIOD_OPTIONS = PERIODS.map(([value]) => value);

export const POLYMARKET_TRADER_LEADERBOARD_ORDER_OPTIONS = SORTS.map(([value]) => value);

export const POLYMARKET_TRADER_LEADERBOARD_COLUMNS = [
  { name: "rank", type: "number", description: "Rank on the requested board. Ties share a rank and the next rank skips. A wallet lookup uses that board's rank; 0 means unranked." },
  { name: "user_id", type: "string", description: "The ranked wallet." },
  { name: "user_name", type: "string", description: "Profile display name of the wallet." },
  { name: "pnl", type: "number", description: "Window PnL in USDC. Day, week, and month are marked equity change net of flows. All is the realized-only lifetime ledger." },
  { name: "volume", type: "number", description: "Both-sides traded volume in shares, never USD." },
  { name: "verified", type: "boolean", description: "Profile verification badge." },
  { name: "profile_image", type: "string", description: "Profile image URL." },
  { name: "x_username", type: "string", description: "Linked X handle, when one exists." },
  { name: "user", type: "string", description: "Wallet looked up, when the pull asked for one standing instead of the board." },
  { name: "time_period", type: "string", description: "Window this row was ranked in: day, week, month, or all." },
  { name: "category", type: "string", description: "Category this row was ranked in." },
  { name: "sort_by", type: "string", description: "Board this row was ranked on: PNL or VOLUME." },
];

export const POLYMARKET_TRADER_LEADERBOARD_DEFAULT_COLUMNS = [
  "rank",
  "user_name",
  "pnl",
  "volume",
  "time_period",
  "category",
  "sort_by",
];

const QUERY_IDS = new Set(["time_period", "category", "sort_by", "user", "limit"]);

export function emptyPolymarketTraderLeaderboardComposeState() {
  return {
    category: "overall",
    time_period: "day",
    sort_by: "PNL",
    limit: 25,
    user: "",
  };
}

function normalizePeriod(raw) {
  const value = String(raw || "").trim().toLowerCase();
  return PERIODS.some(([period]) => period === value) ? value : "day";
}

function normalizeSort(raw) {
  const value = String(raw || "").trim().toUpperCase();
  if (value === "VOL" || value === "VOLUME") return "VOLUME";
  return "PNL";
}

function normalizeCategory(raw) {
  const value = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  if (!value) return "overall";
  if (polymarketLeaderboardCategoryOptions().some(([slug]) => slug === value)) return value;
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 64) return value;
  return "overall";
}

function normalizeInteger(raw, fallback, min, max) {
  const value = Math.floor(Number(raw));
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** @param {unknown} raw */
export function normalizePolymarketTraderLeaderboardComposeState(raw) {
  const source = raw && typeof raw === "object" ? /** @type {Record<string, unknown>} */ (raw) : {};
  return {
    category: normalizeCategory(source.category),
    time_period: normalizePeriod(source.time_period || source.timePeriod),
    sort_by: normalizeSort(source.sort_by || source.orderBy),
    limit: normalizeInteger(source.limit, 25, 1, 1000),
    user: String(source.user || "").trim(),
  };
}

/** @param {unknown} raw */
export function buildPolymarketTraderLeaderboardQueryValues(raw) {
  const state = normalizePolymarketTraderLeaderboardComposeState(raw);
  if (state.user) {
    return {
      time_period: state.time_period,
      category: state.category,
      user: state.user,
    };
  }
  return {
    time_period: state.time_period,
    category: state.category,
    sort_by: state.sort_by,
    limit: String(state.limit),
  };
}

function asNumber(value) {
  if (value == null || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

/**
 * One board row, or one wallet standing, plus the query that produced it.
 * @param {unknown} entry
 * @param {{ time_period?: string, category?: string, sort_by?: string, user?: string }} [query]
 */
export function leaderboardSheetRow(entry, query = {}) {
  const source = entry && typeof entry === "object" ? /** @type {Record<string, unknown>} */ (entry) : {};
  const sortBy = normalizeSort(query.sort_by);
  const ranked = source.rank != null && source.rank !== ""
    ? source.rank
    : sortBy === "VOLUME"
      ? source.rank_volume
      : source.rank_pnl;
  return {
    time_period: normalizePeriod(query.time_period),
    category: normalizeCategory(query.category),
    sort_by: sortBy,
    user: String(query.user || "").trim(),
    rank: ranked == null || ranked === "" ? "" : asNumber(ranked),
    user_id: String(source.user_id || source.proxyWallet || "").trim(),
    user_name: String(source.user_name || source.userName || "").trim(),
    pnl: asNumber(source.pnl),
    volume: asNumber(source.volume != null ? source.volume : source.vol),
    verified: source.verified == null && source.verifiedBadge == null ? "" : Boolean(source.verified ?? source.verifiedBadge),
    profile_image: String(source.profile_image || source.profileImage || "").trim(),
    x_username: String(source.x_username || source.xUsername || "").trim(),
  };
}

/**
 * `{ data, pagination }` for a board page, or `{ data }` for one wallet.
 * @param {unknown} payload
 */
export function polymarketLeaderboardPage(payload) {
  const unwrapped = Array.isArray(payload) && payload.length === 1 ? payload[0] : payload;
  const root = unwrapped && typeof unwrapped === "object" ? /** @type {Record<string, unknown>} */ (unwrapped) : {};
  const data = root.data;
  if (Array.isArray(data)) {
    const cursor = root.pagination && typeof root.pagination === "object"
      ? String(/** @type {{ next_cursor?: unknown }} */ (root.pagination).next_cursor || "").trim()
      : "";
    return {
      rows: data.filter((item) => item && typeof item === "object"),
      cursor,
      single: false,
    };
  }
  if (data && typeof data === "object") return { rows: [data], cursor: "", single: true };
  return { rows: [], cursor: "", single: false };
}

/**
 * @param {unknown} payload
 * @param {string[]} selectedColumns
 * @param {{ time_period?: string, category?: string, sort_by?: string, user?: string }} [query]
 */
export function projectPolymarketTraderLeaderboardEntry(payload, selectedColumns, query) {
  void selectedColumns;
  return projectCatalogRow(leaderboardSheetRow(payload, query), POLYMARKET_TRADER_LEADERBOARD_COLUMNS);
}

export function defaultPolymarketLeaderboardFilters() {
  return {
    time_period: { value: "day" },
    category: { value: "overall" },
    sort_by: { value: "PNL" },
    user: { value: "" },
    limit: { value: "" },
  };
}

function filterValue(filters, id) {
  return String(filters?.[id]?.value ?? "").trim();
}

/** Query controls first. Response columns stay available as filters after the pull. */
export function polymarketLeaderboardAttributeColumns(columns) {
  const data = (Array.isArray(columns) ? columns : []).filter((column) => !QUERY_IDS.has(column?.id));
  return [
    {
      id: "time_period",
      title: "Time period",
      type: "text",
      queryOnly: true,
      control: "period",
      ariaLabel: "Time period",
      enumOptions: PERIODS,
      description: "Window: day, week, month, or all. Defaults to day.",
    },
    {
      id: "category",
      title: "Category",
      type: "text",
      queryOnly: true,
      control: "period",
      ariaLabel: "Category",
      enumOptions: polymarketLeaderboardCategoryOptions(),
      description: "Overall, a Polymarket category, Combos, or Esports. Defaults to overall.",
    },
    {
      id: "sort_by",
      title: "Sort by",
      type: "text",
      queryOnly: true,
      control: "period",
      ariaLabel: "Sort by",
      enumOptions: SORTS,
      description: "Which board: PnL or volume. Defaults to PnL.",
    },
    {
      id: "user",
      title: "User",
      type: "text",
      queryOnly: true,
      control: "query-text",
      ariaLabel: "User wallet",
      placeholder: "0x…",
      description: "Look up one wallet's standing instead of the board. Returns that wallet, not a page.",
    },
    {
      id: "limit",
      title: "Limit",
      type: "number",
      queryOnly: true,
      control: "query-number",
      ariaLabel: "Limit",
      description: "How many ranked traders to pull. Preview shows 50. Save and run pages through the board until this many, up to 1,000 per page.",
    },
    ...data,
  ];
}

/** @param {Record<string, any>} [filters] */
export function polymarketLeaderboardQuery(filters) {
  return {
    time_period: normalizePeriod(filterValue(filters, "time_period")),
    category: normalizeCategory(filterValue(filters, "category")),
    sort_by: normalizeSort(filterValue(filters, "sort_by")),
    user: filterValue(filters, "user"),
    limit: filterValue(filters, "limit"),
  };
}

/**
 * Preview stays at 50. Save and run uses the limit control, then the sheet row limit.
 * @param {Record<string, any>} [filters]
 * @param {{ rowLimit?: unknown, planLimit?: unknown, preview?: boolean }} [options]
 */
export function polymarketLeaderboardTarget(filters, options = {}) {
  const asked = normalizeInteger(polymarketLeaderboardQuery(filters).limit, 0, 0, 1000000);
  if (options.preview) return Math.min(50, asked || 50);
  const rowCap = normalizeInteger(options.rowLimit, 0, 0, 1000000);
  const plan = normalizeInteger(options.planLimit, 0, 0, 1000000);
  const desired = asked || rowCap || 50;
  const caps = [desired];
  if (rowCap) caps.push(rowCap);
  if (plan) caps.push(plan);
  return Math.max(1, Math.min(...caps));
}

/** @param {Record<string, any>} [filters] */
export function polymarketLeaderboardRequestKey(filters) {
  return JSON.stringify(polymarketLeaderboardQuery(filters));
}
