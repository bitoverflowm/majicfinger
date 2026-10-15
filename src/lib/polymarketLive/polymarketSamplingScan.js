/**
 * Currently tradable markets.
 * The CLOB feed is cursor-paged and has no query filters, so attribute
 * filters walk pages until enough rows match.
 */

export const POLYMARKET_SAMPLING_SCAN_CAP = 10_000;
const PAGE_GAP_MS = 300;
const MAX_RATE_RETRIES = 6;
const DROP_SAMPLE = 8;

const EXTRA_FIELDS = [
  ["yes_price", "number"],
  ["no_price", "number"],
  ["token_ids", "string"],
  ["rewards_min_size", "number"],
  ["rewards_max_spread", "number"],
  ["rewards_daily_rate", "number"],
];

const FRONT = [
  "question",
  "volume24hr",
  "volume",
  "liquidity",
  "market_slug",
  "condition_id",
  "question_id",
  "tags",
  "active",
  "closed",
  "accepting_orders",
  "archived",
  "enable_order_book",
  "neg_risk",
  "is_50_50_outcome",
  "notifications_enabled",
  "end_date_iso",
  "game_start_time",
  "accepting_order_timestamp",
  "yes_price",
  "no_price",
  "minimum_order_size",
  "minimum_tick_size",
  "seconds_delay",
  "maker_base_fee",
  "taker_base_fee",
  "rewards_min_size",
  "rewards_max_spread",
  "rewards_daily_rate",
];

const DATE_IDS = new Set(["end_date_iso", "game_start_time", "accepting_order_timestamp"]);
const NUMBER_IDS = new Set([
  "volume24hr",
  "volume",
  "liquidity",
  "minimum_order_size",
  "minimum_tick_size",
  "seconds_delay",
  "maker_base_fee",
  "taker_base_fee",
  "yes_price",
  "no_price",
  "rewards_min_size",
  "rewards_max_spread",
  "rewards_daily_rate",
]);
const BOOLEAN_IDS = new Set([
  "enable_order_book",
  "active",
  "closed",
  "archived",
  "accepting_orders",
  "notifications_enabled",
  "neg_risk",
  "is_50_50_outcome",
]);

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (!signal) return;
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  });
}

function titleFor(id) {
  return String(id || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function tokenList(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}

function outcomePrice(tokens, name) {
  const token = tokens.find((item) => String(item.outcome || "").trim().toLowerCase() === name);
  const price = Number(token?.price);
  return Number.isFinite(price) ? price : "";
}

const STAT_BATCH = 80;

function marketStat(value) {
  if (value == null || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

async function lookupSamplingStats(ids, signal) {
  const search = new URLSearchParams({
    query: "listMarkets",
    skipFlatten: "true",
    limit: String(ids.length),
    condition_ids: ids.join(","),
  });
  const res = await fetch(`/api/integrations/polymarket?${search.toString()}`, {
    credentials: "same-origin",
    signal,
  });
  const json = await res.json().catch(() => []);
  if (res.status === 429) {
    const error = new Error(json.message || json.error || "Rate limited");
    error.rateLimited = true;
    throw error;
  }
  if (!res.ok) throw new Error(json.message || json.error || "Market stats failed");
  return Array.isArray(json) ? json : [];
}

/** Copy Gamma volume and liquidity onto CLOB sampling rows. The feed itself does not include them. */
export async function attachSamplingMarketStats(rows, { signal, lookup = lookupSamplingStats } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const ids = [...new Set(list.map((row) => String(row?.condition_id || "").trim()).filter(Boolean))];
  const byId = new Map();
  for (let index = 0; index < ids.length; index += STAT_BATCH) {
    if (index > 0) await sleep(PAGE_GAP_MS, signal);
    const batch = ids.slice(index, index + STAT_BATCH);
    let found = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        found = await lookup(batch, signal);
        break;
      } catch (error) {
        if (error?.name === "AbortError") throw error;
        if (error?.rateLimited && attempt < 3) {
          await sleep(1500 * (attempt + 1), signal);
          continue;
        }
        found = [];
        break;
      }
    }
    for (const market of found) {
      const id = String(market?.conditionId || market?.condition_id || "").trim().toLowerCase();
      if (id) byId.set(id, market);
    }
  }
  for (const row of list) {
    const market = byId.get(String(row?.condition_id || "").trim().toLowerCase());
    if (!market) continue;
    row.volume24hr = marketStat(market.volume24hr);
    row.volume = marketStat(market.volume);
    row.liquidity = marketStat(market.liquidity);
  }
  return list;
}

/** Flatten a CLOB sampling market onto the sheet column ids. */
export function flattenSamplingMarket(record) {
  const source = record && typeof record === "object" ? record : {};
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, value] of Object.entries(source)) {
    if (key === "tags" && Array.isArray(value)) {
      out.tags = value.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ");
      continue;
    }
    if (key === "tokens") {
      const tokens = tokenList(value);
      out.tokens = tokens
        .map((item) => {
          const outcome = String(item.outcome || "").trim();
          const price = item.price == null || item.price === "" ? "" : String(item.price);
          return [outcome, price].filter(Boolean).join(" ");
        })
        .filter(Boolean)
        .join(", ");
      out.token_ids = tokens.map((item) => String(item.token_id || "").trim()).filter(Boolean).join(", ");
      out.yes_price = outcomePrice(tokens, "yes");
      out.no_price = outcomePrice(tokens, "no");
      continue;
    }
    if (key === "rewards" && value && typeof value === "object") {
      const rewards = /** @type {Record<string, unknown>} */ (value);
      const rate = Array.isArray(rewards.rates) ? rewards.rates.find((item) => item && item.rewards_daily_rate != null) : null;
      out.rewards_min_size = rewards.min_size == null ? "" : rewards.min_size;
      out.rewards_max_spread = rewards.max_spread == null ? "" : rewards.max_spread;
      out.rewards_daily_rate = rate?.rewards_daily_rate == null ? "" : rate.rewards_daily_rate;
      const parts = [];
      if (out.rewards_min_size !== "") parts.push(`min ${out.rewards_min_size}`);
      if (out.rewards_max_spread !== "") parts.push(`spread ${out.rewards_max_spread}`);
      if (out.rewards_daily_rate !== "") parts.push(`daily ${out.rewards_daily_rate}`);
      out.rewards = parts.join(", ");
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = value.map((item) => (item == null ? "" : String(item))).filter(Boolean).join(", ");
      continue;
    }
    if (value && typeof value === "object") {
      out[key] = JSON.stringify(value);
      continue;
    }
    out[key] = value == null ? "" : value;
  }
  return out;
}

export function samplingMarketExtraColumns(existingIds) {
  const have = new Set(existingIds);
  return EXTRA_FIELDS.filter(([id]) => !have.has(id)).map(([id, type]) => ({
    id,
    title: titleFor(id),
    type,
    description: "",
    defaultOn: false,
  }));
}

/** Sheet columns plus the price and reward fields derived from each market. */
export function samplingMarketSheetColumns(columns) {
  const source = Array.isArray(columns) ? columns : [];
  return [...source, ...samplingMarketExtraColumns(source.map((column) => column.id))];
}

/** Filter controls sit first. Dates, booleans, and numbers use the shared attribute controls. */
export function samplingMarketAttributeColumns(columns) {
  const merged = samplingMarketSheetColumns(columns).map((column) => {
    const id = column.id;
    if (DATE_IDS.has(id)) return { ...column, control: "query-range", type: "date", description: "" };
    if (NUMBER_IDS.has(id)) return { ...column, type: "number" };
    if (BOOLEAN_IDS.has(id)) return { ...column, type: "boolean" };
    return column;
  });
  const rank = new Map(FRONT.map((id, index) => [id, index]));
  return merged.slice().sort((a, b) => (rank.get(a.id) ?? 1000) - (rank.get(b.id) ?? 1000));
}

export function samplingMarketFiltersActive(columns, filters) {
  return (columns || []).some((column) => {
    const filter = filters?.[column.id];
    if (!filter) return false;
    if (Array.isArray(filter.include) && filter.include.length) return true;
    if (Array.isArray(filter.containsTags) && filter.containsTags.some((term) => String(term || "").trim())) return true;
    if (String(filter.contains || "").trim() || String(filter.excludes || "").trim()) return true;
    if (Array.isArray(filter.excludesTags) && filter.excludesTags.some((term) => String(term || "").trim())) return true;
    if (String(filter.min || "").trim() || String(filter.max || "").trim()) return true;
    if (filter.from || filter.to) return true;
    return false;
  });
}

async function samplingGet(cursor, signal) {
  const search = new URLSearchParams({ query: "getSamplingMarkets", skipFlatten: "true" });
  if (cursor) search.set("next_cursor", cursor);
  const res = await fetch(`/api/integrations/polymarket?${search.toString()}`, {
    credentials: "same-origin",
    signal,
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 429) {
    const error = new Error(json.message || json.error || "Rate limited");
    error.rateLimited = true;
    throw error;
  }
  if (!res.ok) throw new Error(json.message || json.error || "Pull failed");
  const page = Array.isArray(json) ? json[0] : json;
  return {
    data: Array.isArray(page?.data) ? page.data : [],
    nextCursor: String(page?.next_cursor || "").trim(),
  };
}

/**
 * @param {{
 *   columns: Array<{ id: string; title?: string; queryOnly?: boolean }>;
 *   target: number;
 *   signal?: AbortSignal;
 *   match: (row: Record<string, unknown>) => boolean;
 *   explain: (row: Record<string, unknown>) => string;
 *   onProgress?: (info: Record<string, unknown>) => void;
 * }} spec
 */
export async function scanSamplingMarkets(spec) {
  const target = Math.max(1, Math.min(POLYMARKET_SAMPLING_SCAN_CAP, Number(spec.target) || 50));
  const kept = [];
  const seen = new Set();
  let scanned = 0;
  let removedCount = 0;
  const removed = [];
  let truncated = false;
  let exhausted = true;
  let cursor = "";
  let retries = 0;

  const publish = (extra) => {
    spec.onProgress?.({
      rows: kept.slice(),
      scanned,
      removed,
      removedCount,
      exhausted,
      truncated,
      waiting: false,
      request: "GET /sampling-markets",
      serverFilters: [],
      ...extra,
    });
  };

  for (;;) {
    if (spec.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (kept.length >= target || scanned >= POLYMARKET_SAMPLING_SCAN_CAP) {
      truncated = true;
      exhausted = false;
      break;
    }
    let page;
    try {
      page = await samplingGet(cursor, spec.signal);
      retries = 0;
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      if (error?.rateLimited && retries < MAX_RATE_RETRIES) {
        retries += 1;
        publish({ waiting: true, note: "Polymarket asked for a pause. Continuing in a moment." });
        await sleep(1500 * retries, spec.signal);
        continue;
      }
      throw error;
    }
    await attachSamplingMarketStats(page.data, { signal: spec.signal });
    for (const market of page.data) {
      const flat = flattenSamplingMarket(market);
      const id = String(flat.condition_id || flat.question_id || flat.market_slug || "").trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      scanned += 1;
      if (spec.match(flat)) {
        if (kept.length < target) kept.push(flat);
        else truncated = true;
      } else {
        removedCount += 1;
        if (removed.length < DROP_SAMPLE) {
          removed.push({
            ticker: id,
            label: String(flat.question || flat.market_slug || id),
            reason: spec.explain(flat),
          });
        }
      }
      if (scanned >= POLYMARKET_SAMPLING_SCAN_CAP) break;
    }
    const next = page.nextCursor;
    exhausted = !next || next === "LTE=" || page.data.length === 0;
    publish({});
    if (exhausted || kept.length >= target) break;
    cursor = next;
    await sleep(PAGE_GAP_MS, spec.signal);
  }

  return {
    rows: kept,
    scanned,
    removed,
    removedCount,
    exhausted,
    truncated: truncated || kept.length >= target,
    request: "GET /sampling-markets",
    serverFilters: [],
  };
}
