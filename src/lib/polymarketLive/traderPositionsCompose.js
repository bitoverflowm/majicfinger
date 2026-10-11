/**
 * Get trader's positions.
 * User-anchored /v2/positions. A market narrows that book through the
 * condition attribute. Sort uses the builder Sort control.
 */
import { isPolymarketWalletAddress } from "@/lib/polymarketLive/publicProfilesCompose";

export const TRADER_POSITIONS_ENDPOINT_ID = "getTraderPositions";

const STATUSES = [
  ["OPEN", "Open"],
  ["REDEEMABLE", "Redeemable"],
  ["REDEEMABLE_LOST", "Redeemable lost"],
  ["MERGEABLE", "Mergeable"],
  ["CLOSED", "Closed"],
];

const FILTER_TYPES = [
  ["TOKENS", "Tokens"],
  ["CASH", "Cash"],
];

/** First builder sort whose column the positions route can rank on. */
const API_SORTS = {
  current_value: "CURRENT_VALUE",
  current_price: "PRICE",
  current_size: "TOKENS",
  unrealized_pnl: "UNREALIZED_PNL",
  realized_pnl: "REALIZED_PNL",
  total_pnl: "TOTAL_PNL",
  last_event_at: "TIMESTAMP",
};

const QUERY_IDS = new Set([
  "status",
  "condition",
  "event_id",
  "title",
  "filter_type",
  "filter_amount",
  "include_archived",
  "time_range",
]);

export const TRADER_POSITIONS_DEFAULT_COLUMNS = [
  "title",
  "outcome",
  "status",
  "current_size",
  "avg_price",
  "current_price",
  "current_value",
  "realized_pnl",
  "unrealized_pnl",
  "total_pnl",
  "name",
];

/** @type {Array<{ name: string, type: string, description: string, title?: string, dateEpoch?: "iso" | "unix", exact?: boolean }>} */
export const TRADER_POSITIONS_COLUMNS = [
  { name: "title", type: "text", description: "Market question title. Empty when Gamma has not enriched the row." },
  { name: "outcome", type: "text", description: "Label of the held outcome, such as Yes." },
  { name: "outcome_index", type: "number", exact: true, description: "Index of the held outcome. 999 means the outcome could not be labeled." },
  { name: "status", type: "text", description: "The row's actual state. An Open request can still return Redeemable rows." },
  { name: "condition_id", type: "text", description: "The on-chain condition id." },
  { name: "slug", type: "text", description: "Market slug, the URL segment on polymarket.com." },
  { name: "event_id", type: "text", description: "Gamma event id of the parent event." },
  { name: "event_slug", type: "text", description: "Parent event slug." },
  { name: "end_date", type: "date", description: "Market end date, YYYY-MM-DD. 1970-01-01 when Gamma has none." },
  { name: "icon", type: "text", description: "Market icon URL." },
  { name: "negative_risk", type: "boolean", description: "Whether the market belongs to a neg-risk group." },
  { name: "archived", type: "boolean", description: "Whether the market is archived." },
  { name: "current_size", type: "number", description: "The current holding, in shares. About zero on a closed position." },
  { name: "avg_price", type: "number", description: "Weighted-average entry price per share, in USDC." },
  { name: "current_price", type: "number", description: "Live mark per share, in USDC." },
  { name: "current_value", type: "number", description: "Current size times current price, in USDC." },
  { name: "entry_cost_usdc", type: "number", description: "Fee-exclusive entry basis, in USDC." },
  { name: "entry_fees_usdc", type: "number", description: "Attributed buy-fee total. Disclosure only: entry cost is already fee-exclusive." },
  { name: "total_cost_usdc", type: "number", description: "Gross fee-inclusive basis. Always entry cost plus entry fees." },
  { name: "total_size", type: "number", description: "Lifetime bought shares, not the current balance." },
  { name: "realized_pnl", type: "number", description: "Realized PnL in USDC, cumulative for the position." },
  { name: "unrealized_pnl", type: "number", description: "Mark-to-market PnL: current value minus entry cost." },
  { name: "total_pnl", type: "number", description: "Realized PnL plus unrealized PnL." },
  { name: "percent_pnl", type: "number", description: "Unrealized PnL over the fee-exclusive entry cost, as a percent." },
  { name: "percent_realized_pnl", type: "number", description: "A compatibility percent. It is not realized PnL over a basis." },
  { name: "redeemable", type: "boolean", description: "Whether the position can be redeemed now. Redeemable does not mean the position won." },
  { name: "mergeable", type: "boolean", description: "Whether the wallet also holds the opposite outcome, so the pair can merge." },
  { name: "opposite_outcome", type: "text", description: "Label of the market's other outcome." },
  { name: "opposite_token_id", type: "text", description: "Token id of the market's other outcome." },
  { name: "first_entry_at", type: "date", dateEpoch: "unix", description: "First acquisition of the position, in epoch seconds. Blank when none is recorded." },
  { name: "last_event_at", type: "date", dateEpoch: "unix", description: "The row's last economics event, in epoch seconds. Blank when the position has no clock." },
  { name: "token_id", type: "text", description: "The outcome token id." },
  { name: "name", type: "text", description: "Profile display name of the wallet." },
  { name: "proxy_wallet", type: "text", description: "Proxy wallet holding the position." },
  { name: "profile_image", type: "text", description: "Profile image URL." },
  { name: "verified", type: "boolean", description: "Whether the profile has a verified badge." },
  { name: "user", type: "text", description: "The wallet address this pull was anchored on." },
];

function text(value) {
  if (value == null) return "";
  return String(value);
}

function amount(value) {
  if (value == null || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

function clock(value) {
  const n = amount(value);
  return n === "" || n === 0 ? "" : n;
}

function flag(value) {
  return value === true;
}

function filterValue(filters, id) {
  const filter = filters?.[id];
  if (!filter || typeof filter !== "object") return "";
  return String(filter.value ?? "").trim();
}

function dayUnix(iso, edge) {
  const [year, month, day] = String(iso || "").split("-").map(Number);
  if (!year || !month || !day) return 0;
  const date = edge === "end" ? new Date(year, month - 1, day, 23, 59, 59) : new Date(year, month - 1, day, 0, 0, 0);
  const seconds = Math.floor(date.getTime() / 1000);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}

const CONDITION_ID = /^0x[a-fA-F0-9]{64}$/;
/** The positions route accepts this many condition ids on one call. */
export const POLYMARKET_POSITION_CONDITION_BATCH = 20;

/** Distinct condition ids from a multi-market filter. The caller batches them. */
export function polymarketPositionConditionIds(filter) {
  const listed = Array.isArray(filter?.values)
    ? filter.values
    : String(filter?.value ?? "").split(",");
  const ids = [];
  const seen = new Set();
  for (const part of listed) {
    const value = String(part || "").trim();
    if (!CONDITION_ID.test(value)) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ids.push(value);
  }
  return ids;
}

/** One status per call. Empty means the API default, Open. */
export function polymarketPositionStatuses(filter) {
  const listed = Array.isArray(filter?.values)
    ? filter.values
    : String(filter?.value ?? "").split(",");
  const allowed = new Set(STATUSES.map(([status]) => status));
  const ids = [];
  for (const part of listed) {
    const value = String(part || "").trim().toUpperCase();
    if (!allowed.has(value) || ids.includes(value)) continue;
    ids.push(value);
  }
  return ids.length ? ids : ["OPEN"];
}

/**
 * @param {string[]} ids
 * @returns {string[][]}
 */
export function polymarketPositionConditionBatches(ids) {
  const list = Array.isArray(ids) ? ids : [];
  if (!list.length) return [[]];
  const batches = [];
  for (let offset = 0; offset < list.length; offset += POLYMARKET_POSITION_CONDITION_BATCH) {
    batches.push(list.slice(offset, offset + POLYMARKET_POSITION_CONDITION_BATCH));
  }
  return batches;
}

function normalizeEventIds(raw) {
  const ids = [...new Set(String(raw || "").split(",").map((part) => part.trim()).filter((part) => /^[1-9]\d*$/.test(part)))];
  return ids.slice(0, 20).join(",");
}

function normalizeTitle(raw) {
  return String(raw || "").trim().slice(0, 200);
}

function normalizeFilterType(raw) {
  const value = String(raw || "").trim().toUpperCase();
  return value === "CASH" || value === "TOKENS" ? value : "";
}

function normalizeAmount(raw) {
  if (raw == null || String(raw).trim() === "") return "";
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : "";
}

/**
 * @param {Array<{ columnId?: string, direction?: string }> | null | undefined} sorts
 */
export function polymarketPositionSort(sorts) {
  const list = Array.isArray(sorts) ? sorts : [];
  const first = list.find((sort) => API_SORTS[String(sort?.columnId || "")]);
  if (!first) return { sort_by: "", sort_direction: "" };
  return {
    sort_by: API_SORTS[String(first.columnId)],
    sort_direction: first.direction === "asc" ? "ASC" : "DESC",
  };
}

/**
 * @param {Record<string, any>} [filters]
 * @param {Array<{ columnId?: string, direction?: string }>} [sorts]
 */
export function polymarketPositionQuery(filters, sorts) {
  const range = filters?.time_range && typeof filters.time_range === "object" ? filters.time_range : {};
  const statuses = polymarketPositionStatuses(filters?.status);
  const conditionIds = polymarketPositionConditionIds(filters?.condition);
  const archiveRequested = filterValue(filters, "include_archived") === "true";
  return {
    statuses,
    status: statuses[0] || "OPEN",
    condition: conditionIds.join(","),
    conditionBatches: polymarketPositionConditionBatches(conditionIds).map((batch) => batch.join(",")),
    event_id: normalizeEventIds(filterValue(filters, "event_id")),
    title: normalizeTitle(filterValue(filters, "title")),
    filter_type: normalizeFilterType(filterValue(filters, "filter_type")),
    filter_amount: normalizeAmount(filterValue(filters, "filter_amount")),
    include_archived: archiveRequested && statuses.some((status) => status !== "CLOSED"),
    archiveRequested,
    start: dayUnix(range.from, "start"),
    end: dayUnix(range.to, "end"),
    ...polymarketPositionSort(sorts),
  };
}

/**
 * One API walk per status and per 20-market batch. Closed walks omit include_archived.
 * @param {ReturnType<typeof polymarketPositionQuery>} query
 */
export function polymarketPositionWalks(query) {
  const statuses = query?.statuses?.length ? query.statuses : ["OPEN"];
  const batches = query?.conditionBatches?.length ? query.conditionBatches : [""];
  return statuses.flatMap((status) =>
    batches.map((condition) => ({
      ...query,
      status,
      condition,
      include_archived: Boolean(query?.archiveRequested) && status !== "CLOSED",
    })),
  );
}

function positionRowKey(row) {
  return [row?.user, row?.condition_id, row?.token_id, row?.outcome].map((value) => String(value || "").trim().toLowerCase()).join("|");
}

/**
 * Keep every cohort in the merged sheet, up to the row target.
 * A position returned by more than one status is kept once.
 * @param {Array<Array<Record<string, unknown>>>} cohorts
 * @param {number} target
 */
export function mergePolymarketPositionCohorts(cohorts, target) {
  const lists = (Array.isArray(cohorts) ? cohorts : []).map((list) => (Array.isArray(list) ? list : []));
  const available = lists.reduce((count, list) => count + list.length, 0);
  const cap = Math.max(1, Math.floor(Number(target)) || available || 1);
  const out = [];
  const seen = new Set();
  const cursors = lists.map(() => 0);
  let progressed = true;
  while (out.length < cap && progressed) {
    progressed = false;
    for (let index = 0; index < lists.length; index += 1) {
      while (cursors[index] < lists[index].length) {
        const row = lists[index][cursors[index]];
        cursors[index] += 1;
        const key = positionRowKey(row);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(row);
        progressed = true;
        break;
      }
      if (out.length >= cap) break;
    }
  }
  return out;
}

/**
 * Cursor pages must re-send the filters the cursor does not carry.
 * Status and sort stay on the first page, because the cursor binds them.
 * @param {string} user
 * @param {ReturnType<typeof polymarketPositionQuery>} query
 * @param {string} cursor
 * @param {number} limit
 */
export function polymarketPositionPageParams(user, query, cursor, limit) {
  /** @type {Record<string, string>} */
  const params = { user };
  if (query.condition) params.condition = query.condition;
  if (query.event_id) params.event_id = query.event_id;
  if (query.title) params.title = query.title;
  if (query.filter_type) params.filter_type = query.filter_type;
  if (query.filter_amount !== "") params.filter_amount = String(query.filter_amount);
  if (query.include_archived) params.include_archived = "true";
  if (query.start) params.start = String(query.start);
  if (query.end) params.end = String(query.end);
  if (cursor) {
    params.cursor = cursor;
    return params;
  }
  params.status = query.status;
  if (query.sort_by) params.sort_by = query.sort_by;
  if (query.sort_direction) params.sort_direction = query.sort_direction;
  params.limit = String(Math.max(1, Math.min(1000, Math.floor(limit) || 1)));
  return params;
}

/**
 * Empty Limit previews 50. A set Limit is the total, capped by the plan.
 * A save with no Limit uses the plan ceiling.
 * @param {{ rowLimit?: unknown, planLimit?: unknown, preview?: boolean }} [options]
 */
export function polymarketPositionTarget(options = {}) {
  const asked = Number(options.rowLimit);
  const plan = Number(options.planLimit);
  const planCap = Number.isFinite(plan) && plan > 0 ? Math.floor(plan) : 0;
  if (Number.isFinite(asked) && asked > 0) {
    const desired = Math.floor(asked);
    return Math.max(1, planCap ? Math.min(desired, planCap) : desired);
  }
  if (options.preview) return Math.max(1, planCap ? Math.min(50, planCap) : 50);
  return Math.max(1, planCap || 50);
}

/** @param {Record<string, any>} [filters] @param {Array<{ columnId?: string, direction?: string }>} [sorts] */
export function polymarketPositionRequestKey(filters, sorts) {
  return JSON.stringify(polymarketPositionQuery(filters, sorts));
}

export function defaultPolymarketPositionFilters() {
  return {
    status: { values: ["OPEN"] },
    condition: { values: [] },
    filter_type: { value: "TOKENS" },
    include_archived: { value: "false" },
  };
}

/**
 * `{ data, pagination }` for one positions page.
 * @param {unknown} payload
 */
export function polymarketPositionPage(payload) {
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

/**
 * @param {Record<string, unknown>} source
 * @param {string} user
 */
export function positionSheetRow(source, user) {
  const wallet = isPolymarketWalletAddress(user) ? String(user).trim() : "";
  return {
    title: text(source.title),
    outcome: text(source.outcome),
    outcome_index: amount(source.outcome_index),
    status: text(source.status),
    condition_id: text(source.condition_id),
    slug: text(source.slug),
    event_id: text(source.event_id),
    event_slug: text(source.event_slug),
    end_date: text(source.end_date),
    icon: text(source.icon),
    negative_risk: flag(source.negative_risk),
    archived: flag(source.archived),
    current_size: amount(source.current_size),
    avg_price: amount(source.avg_price),
    current_price: amount(source.current_price),
    current_value: amount(source.current_value),
    entry_cost_usdc: amount(source.entry_cost_usdc),
    entry_fees_usdc: amount(source.entry_fees_usdc),
    total_cost_usdc: amount(source.total_cost_usdc),
    total_size: amount(source.total_size),
    realized_pnl: amount(source.realized_pnl),
    unrealized_pnl: amount(source.unrealized_pnl),
    total_pnl: amount(source.total_pnl),
    percent_pnl: amount(source.percent_pnl),
    percent_realized_pnl: amount(source.percent_realized_pnl),
    redeemable: flag(source.redeemable),
    mergeable: flag(source.mergeable),
    opposite_outcome: text(source.opposite_outcome),
    opposite_token_id: text(source.opposite_token_id),
    first_entry_at: clock(source.first_entry_at),
    last_event_at: clock(source.last_event_at),
    token_id: text(source.token_id),
    name: text(source.name),
    proxy_wallet: text(source.proxy_wallet),
    profile_image: text(source.profile_image),
    verified: flag(source.verified),
    user: wallet,
  };
}

/**
 * Markets already seen for these wallets. The label shows the question and the condition id.
 * @param {Array<[string, string]>} current
 * @param {Array<Record<string, unknown>>} rows
 * @param {string[]} [addresses]
 */
export function mergePolymarketPositionMarkets(current, rows, addresses) {
  const allowed = new Set((addresses || []).map((address) => String(address || "").trim().toLowerCase()).filter(Boolean));
  const map = new Map(current);
  let changed = false;
  for (const row of rows || []) {
    const asked = String(row?.user || "").trim().toLowerCase();
    if (allowed.size && asked && !allowed.has(asked)) continue;
    const id = String(row?.condition_id || "").trim();
    if (!CONDITION_ID.test(id) || map.has(id)) continue;
    const title = String(row?.title || "").trim();
    map.set(id, title ? `${title} · ${id}` : id);
    changed = true;
  }
  return changed ? [...map.entries()] : current;
}

/**
 * Query controls first. Response columns stay available as filters after the pull.
 * @param {Array<Record<string, unknown>>} columns
 * @param {Array<[string, string]>} [markets]
 */
export function polymarketPositionAttributeColumns(columns, markets = []) {
  const data = (Array.isArray(columns) ? columns : []).filter((column) => !QUERY_IDS.has(column?.id));
  return [
    {
      id: "status",
      title: "Status",
      type: "text",
      queryOnly: true,
      control: "multi-add",
      ariaLabel: "Add a status",
      enumOptions: STATUSES,
      description: "Add one or more. Open includes settled-but-unredeemed winners. Closed is exited positions. Defaults to Open.",
    },
    {
      id: "condition",
      title: "Market",
      type: "text",
      queryOnly: true,
      control: "multi-add",
      ariaLabel: "Add a market",
      enumOptions: markets,
      description: "Add one or more markets. Each option shows the market name and its condition id. Empty includes every market.",
    },
    {
      id: "event_id",
      title: "Event id",
      type: "text",
      queryOnly: true,
      control: "query-text",
      description: "Gamma event id, or a comma-separated list of up to 20. Applies to a trader's book.",
    },
    {
      id: "title",
      title: "Title",
      type: "text",
      queryOnly: true,
      control: "query-text",
      description: "Case-insensitive market-title substring. Empty is ignored. At most 200 characters.",
    },
    {
      id: "filter_type",
      title: "Size filter",
      type: "text",
      queryOnly: true,
      control: "period",
      ariaLabel: "Size filter",
      enumOptions: FILTER_TYPES,
      description: "Tokens is a minimum current holding in shares. Cash is a minimum current value in USDC. Defaults to Tokens.",
    },
    {
      id: "filter_amount",
      title: "Minimum size",
      type: "number",
      queryOnly: true,
      control: "query-number",
      description: "The floor for the size filter. Tokens defaults to the 0.1 dust floor. Closed positions are not narrowed by a token floor.",
    },
    {
      id: "include_archived",
      title: "Include archived",
      type: "text",
      queryOnly: true,
      control: "period",
      ariaLabel: "Include archived",
      enumOptions: [
        ["false", "No"],
        ["true", "Yes"],
      ],
      description: "Also include positions on archived markets. Closed positions cannot be combined with this. Defaults to No.",
    },
    {
      id: "time_range",
      title: "Date range",
      type: "date",
      queryOnly: true,
      control: "query-range",
      description: "Inclusive window on the position's last event. A position with no clock is left out of any window.",
    },
    ...data,
  ];
}
