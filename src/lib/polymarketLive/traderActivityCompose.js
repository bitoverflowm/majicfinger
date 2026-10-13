/**
 * Get trader's activity.
 * User-anchored /v2/activity. Pages follow next_cursor. Sort stays on the
 * sheet, because the feed only keyset-sorts by time.
 */
import { isPolymarketWalletAddress } from "@/lib/polymarketLive/publicProfilesCompose";

export const TRADER_ACTIVITY_ENDPOINT_ID = "getTraderActivity";

/** TIP is listed so a trader can opt in. It is not part of the feed's default set. */
export const TRADER_ACTIVITY_TYPES = [
  ["TRADE", "Trade"],
  ["SPLIT", "Split"],
  ["MERGE", "Merge"],
  ["REDEEM", "Redeem"],
  ["REWARD", "Reward"],
  ["CONVERSION", "Conversion"],
  ["YIELD", "Yield"],
  ["MAKER_REBATE", "Maker rebate"],
  ["TAKER_REBATE", "Taker rebate"],
  ["REFERRAL_REWARD", "Referral reward"],
  ["DEPOSIT", "Deposit"],
  ["WITHDRAWAL", "Withdrawal"],
  ["TIP", "Tip"],
];

const TYPE_VALUES = new Set(TRADER_ACTIVITY_TYPES.map(([value]) => value));

const SIDES = [
  ["", "Any"],
  ["BUY", "Buy"],
  ["SELL", "Sell"],
];

const QUERY_IDS = new Set([
  "type",
  "condition",
  "event_id",
  "side",
  "time_range",
  "exclude_deposits_withdrawals",
]);

export const TRADER_ACTIVITY_DEFAULT_COLUMNS = [
  "timestamp",
  "type",
  "title",
  "outcome",
  "side",
  "size",
  "usdc_size",
  "price",
];

/** @type {Array<{ name: string, type: string, description: string, title?: string, dateEpoch?: "unix", exact?: boolean }>} */
export const TRADER_ACTIVITY_COLUMNS = [
  { name: "timestamp", type: "date", dateEpoch: "unix", title: "Timestamp", description: "Block time of the action, in epoch seconds." },
  { name: "type", type: "text", title: "Type", description: "TRADE, SPLIT, MERGE, REDEEM, REWARD, CONVERSION, or another activity type." },
  { name: "title", type: "text", title: "Title", description: "Market question. Empty when Gamma has not enriched the row." },
  { name: "outcome", type: "text", title: "Outcome", description: "Label of the outcome, such as Yes." },
  { name: "side", type: "text", title: "Side", description: "Buy or sell on a trade, from this wallet's perspective. In or out on a tip. Empty when a side does not apply." },
  { name: "size", type: "number", title: "Size", description: "Share quantity of the action. Bare sizes are shares, never USD." },
  { name: "usdc_size", type: "number", title: "USDC size", description: "Cash value of the action, in USDC." },
  { name: "price", type: "number", title: "Price", description: "Price per share in USDC. Zero where no price applies." },
  { name: "outcome_index", type: "number", exact: true, title: "Outcome index", description: "Index of the outcome in the market. 999 means the outcome could not be labeled." },
  { name: "condition_id", type: "text", title: "Condition", description: "On-chain condition id of the market." },
  { name: "token_id", type: "text", title: "Token", description: "CLOB asset id of the outcome token the action touched." },
  { name: "slug", type: "text", title: "Slug", description: "Market slug, the URL segment on polymarket.com." },
  { name: "event_slug", type: "text", title: "Event slug", description: "Parent event slug." },
  { name: "icon", type: "text", title: "Icon", description: "Market icon URL." },
  { name: "transaction_hash", type: "text", title: "Transaction", description: "Hash of the settling transaction." },
  { name: "is_combo", type: "boolean", title: "Combo", description: "Whether the row is a combo trade. Combo detail lives on the combo endpoints." },
  { name: "name", type: "text", title: "Name", description: "Profile display name of the wallet." },
  { name: "pseudonym", type: "text", title: "Pseudonym", description: "Generated handle used when the profile has no display name." },
  { name: "bio", type: "text", title: "Bio", description: "Profile bio text." },
  { name: "proxy_wallet", type: "text", title: "Proxy wallet", description: "Proxy wallet the row belongs to." },
  { name: "profile_image", type: "text", title: "Profile image", description: "Profile image URL." },
  { name: "profile_image_optimized", type: "text", title: "Profile image (small)", description: "Resized profile image URL, when one exists." },
  { name: "user", type: "text", title: "User", description: "The wallet address this pull was anchored on." },
];

const CONDITION_ID = /^0x[a-fA-F0-9]{64}$/;
/** The activity route accepts this many condition ids on one call. */
export const POLYMARKET_ACTIVITY_CONDITION_BATCH = 20;

function text(value) {
  if (value == null) return "";
  return String(value);
}

function amount(value) {
  if (value == null || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
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

function normalizeEventIds(raw) {
  const ids = [...new Set(String(raw || "").split(",").map((part) => part.trim()).filter((part) => /^[1-9]\d*$/.test(part)))];
  return ids.slice(0, 20).join(",");
}

/** Selected activity types. Empty keeps the feed default, which leaves tips out. */
export function polymarketActivityTypes(filter) {
  const listed = Array.isArray(filter?.values)
    ? filter.values
    : String(filter?.value ?? "").split(",");
  const ids = [];
  for (const part of listed) {
    const value = String(part || "").trim().toUpperCase();
    if (!TYPE_VALUES.has(value) || ids.includes(value)) continue;
    ids.push(value);
  }
  return ids;
}

/** Distinct condition ids from a multi-market filter. The caller batches them. */
export function polymarketActivityConditionIds(filter) {
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

/**
 * @param {string[]} ids
 * @returns {string[][]}
 */
export function polymarketActivityConditionBatches(ids) {
  const list = Array.isArray(ids) ? ids : [];
  if (!list.length) return [[]];
  const batches = [];
  for (let offset = 0; offset < list.length; offset += POLYMARKET_ACTIVITY_CONDITION_BATCH) {
    batches.push(list.slice(offset, offset + POLYMARKET_ACTIVITY_CONDITION_BATCH));
  }
  return batches;
}

function normalizeSide(raw) {
  const value = String(raw || "").trim().toUpperCase();
  return value === "BUY" || value === "SELL" ? value : "";
}

/**
 * @param {Record<string, any>} [filters]
 */
export function polymarketActivityQuery(filters) {
  const range = filters?.time_range && typeof filters.time_range === "object" ? filters.time_range : {};
  const types = polymarketActivityTypes(filters?.type);
  const conditionIds = polymarketActivityConditionIds(filters?.condition);
  const eventId = normalizeEventIds(filterValue(filters, "event_id"));
  return {
    type: types.join(","),
    types,
    condition: conditionIds.join(","),
    conditionBatches: polymarketActivityConditionBatches(conditionIds).map((batch) => batch.join(",")),
    event_id: eventId,
    side: normalizeSide(filterValue(filters, "side")),
    start: dayUnix(range.from, "start"),
    end: dayUnix(range.to, "end"),
    exclude_deposits_withdrawals: filterValue(filters, "exclude_deposits_withdrawals") !== "false",
    conflict: Boolean(conditionIds.length && eventId),
  };
}

/**
 * One API walk per 20-market batch.
 * @param {ReturnType<typeof polymarketActivityQuery>} query
 */
export function polymarketActivityWalks(query) {
  const batches = query?.conditionBatches?.length ? query.conditionBatches : [""];
  return batches.map((condition) => ({ ...query, condition }));
}

function activityRowKey(row) {
  return [row?.user, row?.transaction_hash, row?.timestamp, row?.type, row?.condition_id, row?.token_id, row?.side, row?.outcome_index]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join("|");
}

/**
 * Keep every market batch in the merged sheet, up to the row target.
 * @param {Array<Array<Record<string, unknown>>>} cohorts
 * @param {number} target
 */
export function mergePolymarketActivityCohorts(cohorts, target) {
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
        const key = activityRowKey(row);
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
 * Every page re-sends the filters. The cursor only carries the seek point.
 * @param {string} user
 * @param {ReturnType<typeof polymarketActivityQuery>} query
 * @param {string} cursor
 * @param {number} limit
 */
export function polymarketActivityPageParams(user, query, cursor, limit) {
  /** @type {Record<string, string>} */
  const params = {
    user,
    exclude_deposits_withdrawals: query?.exclude_deposits_withdrawals ? "true" : "false",
    limit: String(Math.max(1, Math.min(1000, Math.floor(limit) || 1))),
  };
  if (query?.condition) params.condition = query.condition;
  if (query?.event_id) params.event_id = query.event_id;
  if (query?.type) params.type = query.type;
  if (query?.side) params.side = query.side;
  if (query?.start) params.start = String(query.start);
  if (query?.end) params.end = String(query.end);
  if (cursor) params.cursor = cursor;
  return params;
}

/**
 * Empty Limit previews 50. A set Limit is the total, capped by the plan.
 * A save with no Limit uses the plan ceiling.
 * @param {{ rowLimit?: unknown, planLimit?: unknown, preview?: boolean }} [options]
 */
export function polymarketActivityTarget(options = {}) {
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

/** @param {Record<string, any>} [filters] */
export function polymarketActivityRequestKey(filters) {
  return JSON.stringify(polymarketActivityQuery(filters));
}

export function defaultPolymarketActivityFilters() {
  return {
    type: { values: [] },
    condition: { values: [] },
    side: { value: "" },
    exclude_deposits_withdrawals: { value: "true" },
  };
}

/**
 * `{ data, pagination }` for one activity page.
 * @param {unknown} payload
 */
export function polymarketActivityPage(payload) {
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
export function activitySheetRow(source, user) {
  const wallet = isPolymarketWalletAddress(user) ? String(user).trim() : "";
  return {
    timestamp: amount(source.timestamp),
    type: text(source.type),
    title: text(source.title),
    outcome: text(source.outcome),
    side: text(source.side),
    size: amount(source.size),
    usdc_size: amount(source.usdc_size),
    price: amount(source.price),
    outcome_index: amount(source.outcome_index),
    condition_id: text(source.condition_id),
    token_id: text(source.token_id),
    slug: text(source.slug),
    event_slug: text(source.event_slug),
    icon: text(source.icon),
    transaction_hash: text(source.transaction_hash),
    is_combo: flag(source.is_combo),
    name: text(source.name),
    pseudonym: text(source.pseudonym),
    bio: text(source.bio),
    proxy_wallet: text(source.proxy_wallet),
    profile_image: text(source.profile_image),
    profile_image_optimized: text(source.profile_image_optimized),
    user: wallet,
  };
}

/**
 * Markets already seen for these wallets. The label shows the question and the condition id.
 * @param {Array<[string, string]>} current
 * @param {Array<Record<string, unknown>>} rows
 * @param {string[]} [addresses]
 */
export function mergePolymarketActivityMarkets(current, rows, addresses) {
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
export function polymarketActivityAttributeColumns(columns, markets = []) {
  const data = (Array.isArray(columns) ? columns : []).filter((column) => !QUERY_IDS.has(column?.id));
  return [
    {
      id: "type",
      title: "Type",
      type: "text",
      queryOnly: true,
      control: "multi-add",
      ariaLabel: "Add an activity type",
      enumOptions: TRADER_ACTIVITY_TYPES,
      description: "Add one or more. Empty uses the feed's default set. A tip is a user-to-user transfer, and it is included only when you add Tip.",
    },
    {
      id: "side",
      title: "Side",
      type: "text",
      queryOnly: true,
      control: "period",
      ariaLabel: "Side",
      enumOptions: SIDES,
      description: "Buy or sell, from this wallet's perspective. Any includes both.",
    },
    {
      id: "condition",
      title: "Market",
      type: "text",
      queryOnly: true,
      control: "multi-add",
      ariaLabel: "Add a market",
      enumOptions: markets,
      description: "Add one or more markets. Each option shows the market name and its condition id. Empty includes every market. This cannot be combined with an event id.",
    },
    {
      id: "event_id",
      title: "Event id",
      type: "text",
      queryOnly: true,
      control: "query-text",
      description: "Gamma event id, or a comma-separated list of up to 20. This cannot be combined with a market.",
    },
    {
      id: "time_range",
      title: "Date range",
      type: "date",
      queryOnly: true,
      control: "query-range",
      description: "Inclusive window on the action time. Empty uses the feed's window, about three years back through tomorrow.",
    },
    {
      id: "exclude_deposits_withdrawals",
      title: "Exclude deposits and withdrawals",
      type: "text",
      queryOnly: true,
      control: "period",
      ariaLabel: "Exclude deposits and withdrawals",
      enumOptions: [
        ["true", "Yes"],
        ["false", "No"],
      ],
      description: "Yes hides deposits and withdrawals. No includes them. Defaults to Yes.",
    },
    ...data,
  ];
}
