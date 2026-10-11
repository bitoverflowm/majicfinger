import { polymarketLeaderboardCategoryOptions } from "@/lib/polymarketLive/traderLeaderboardCompose";

export const POLYMARKET_BIGGEST_WINNERS_ENDPOINT_ID = "getBiggestWinners";

const PERIODS = [
  ["day", "Day"],
  ["week", "Week"],
  ["month", "Month"],
  ["all", "All"],
];

const QUERY_IDS = new Set(["time_period", "category"]);

export const POLYMARKET_BIGGEST_WINNERS_COLUMNS = [
  { name: "win_rank", type: "number", description: "Unique 1-based place in this window and category. Equal PnL does not share a rank." },
  { name: "kind", type: "string", description: "market or combo. Combo wins have no Gamma event, so the event link stays blank." },
  { name: "user_name", type: "string", description: "Profile display name of the winning wallet." },
  { name: "user_id", type: "string", description: "The winning wallet." },
  { name: "pnl", type: "number", description: "final_value minus initial_value, in USDC." },
  { name: "initial_value", type: "number", description: "Cost basis of the winning position, in USDC." },
  { name: "final_value", type: "number", description: "Value at resolution, in USDC." },
  { name: "resolved_at", type: "number", description: "When the position resolved, as Unix seconds." },
  { name: "event_title", type: "string", description: "Parent event title. Combo rows already join their leg questions with ' / '." },
  { name: "event_link", type: "string", description: "Polymarket event page. Blank on combo wins, which have no Gamma event." },
  { name: "condition_id", type: "string", description: "On-chain condition id. Combo rows use the combo condition." },
  { name: "position_id", type: "string", description: "Token id of the winning position." },
  { name: "event_id", type: "number", description: "Gamma event id. 0 on combo rows." },
  { name: "event_slug", type: "string", description: "Parent event slug. Empty on combo rows." },
  { name: "profile_image", type: "string", description: "Profile image URL." },
  { name: "time_period", type: "string", description: "Window this row was ranked in: day, week, month, or all." },
  { name: "category", type: "string", description: "Category this row was ranked in, including combos and esports." },
];

export const POLYMARKET_BIGGEST_WINNERS_DEFAULT_COLUMNS = [
  "win_rank",
  "kind",
  "user_name",
  "pnl",
  "event_title",
  "resolved_at",
  "time_period",
  "category",
];

function normalizePeriod(raw) {
  const value = String(raw || "").trim().toLowerCase();
  return PERIODS.some(([period]) => period === value) ? value : "day";
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

function asNumber(value) {
  if (value == null || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

function filterValue(filters, id) {
  return String(filters?.[id]?.value ?? "").trim();
}

/**
 * Combo rows have no Gamma event. Branch on kind before building a link.
 * @param {Record<string, unknown>} source
 */
export function biggestWinnerEventLink(source) {
  const kind = String(source?.kind || "").trim().toLowerCase();
  if (kind !== "market") return "";
  const eventId = Number(source?.event_id);
  const slug = String(source?.event_slug || "").trim();
  if (!slug || !Number.isFinite(eventId) || eventId <= 0) return "";
  const safe = /^[a-z0-9-]+$/i.test(slug) ? slug : encodeURIComponent(slug);
  return `https://polymarket.com/event/${safe}`;
}

/**
 * One winning position, plus the window and category that produced it.
 * Combo titles stay as the API sent them.
 * @param {unknown} entry
 * @param {{ time_period?: string, category?: string }} [query]
 */
export function biggestWinnerSheetRow(entry, query = {}) {
  const source = entry && typeof entry === "object" ? /** @type {Record<string, unknown>} */ (entry) : {};
  const kind = String(source.kind || "").trim().toLowerCase();
  const row = {
    win_rank: asNumber(source.win_rank),
    kind,
    user_id: String(source.user_id || "").trim(),
    user_name: String(source.user_name || "").trim(),
    pnl: asNumber(source.pnl),
    initial_value: asNumber(source.initial_value),
    final_value: asNumber(source.final_value),
    resolved_at: asNumber(source.resolved_at),
    event_title: String(source.event_title || "").trim(),
    condition_id: String(source.condition_id || "").trim(),
    position_id: String(source.position_id || "").trim(),
    event_id: asNumber(source.event_id),
    event_slug: String(source.event_slug || "").trim(),
    profile_image: String(source.profile_image || "").trim(),
    time_period: normalizePeriod(query.time_period),
    category: normalizeCategory(query.category),
  };
  row.event_link = biggestWinnerEventLink(row);
  return row;
}

/**
 * `{ data, pagination }` for a biggest-wins page.
 * @param {unknown} payload
 */
export function polymarketBiggestWinnersPage(payload) {
  const unwrapped = Array.isArray(payload) && payload.length === 1 ? payload[0] : payload;
  const root = unwrapped && typeof unwrapped === "object" ? /** @type {Record<string, unknown>} */ (unwrapped) : {};
  const data = root.data;
  if (!Array.isArray(data)) return { rows: [], cursor: "" };
  const cursor = root.pagination && typeof root.pagination === "object"
    ? String(/** @type {{ next_cursor?: unknown }} */ (root.pagination).next_cursor || "").trim()
    : "";
  return {
    rows: data.filter((item) => item && typeof item === "object"),
    cursor,
  };
}

export function defaultPolymarketBiggestWinnersFilters() {
  return {
    time_period: { value: "day" },
    category: { value: "overall" },
  };
}

/** Query controls first. Response columns stay available as filters after the pull. */
export function polymarketBiggestWinnersAttributeColumns(columns) {
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
      description: "Window on when the position resolved: day, week, month, or all. Defaults to day.",
    },
    {
      id: "category",
      title: "Category",
      type: "text",
      queryOnly: true,
      control: "period",
      ariaLabel: "Category",
      enumOptions: polymarketLeaderboardCategoryOptions(),
      description: "Overall, a Polymarket category, Combos, or Esports. Combos is its own board of combinatorial wins. Defaults to overall.",
    },
    ...data,
  ];
}

/** @param {Record<string, any>} [filters] */
export function polymarketBiggestWinnersQuery(filters) {
  return {
    time_period: normalizePeriod(filterValue(filters, "time_period")),
    category: normalizeCategory(filterValue(filters, "category")),
  };
}

/**
 * The builder Limit under Sort is the total rows to pull.
 * An empty Limit previews 50. A Limit above one page keeps following the cursor.
 * @param {{ rowLimit?: unknown, planLimit?: unknown, preview?: boolean }} [options]
 */
export function polymarketBiggestWinnersTarget(options = {}) {
  const asked = normalizeInteger(options.rowLimit, 0, 0, 1000000);
  const plan = normalizeInteger(options.planLimit, 0, 0, 1000000);
  if (!asked && options.preview) return Math.min(50, plan || 50);
  const desired = asked || plan || 50;
  const caps = [desired];
  if (plan) caps.push(plan);
  return Math.max(1, Math.min(...caps));
}

/** @param {Record<string, any>} [filters] */
export function polymarketBiggestWinnersRequestKey(filters) {
  return JSON.stringify(polymarketBiggestWinnersQuery(filters));
}
