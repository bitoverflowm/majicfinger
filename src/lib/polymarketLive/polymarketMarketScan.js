/**
 * Find markets scan.
 * Keyset pages walk the Gamma catalog until enough rows match the attribute
 * filters. Exact id, slug, and token lookups run beside that walk.
 */

export const POLYMARKET_MARKET_SCAN_CAP = 20_000;
/** Open catalog size used when a filtered walk stops before the last page. */
export const POLYMARKET_MARKET_UNIVERSE = 10_000_000;
const ESTIMATE_MIN_SCAN = 200;

/**
 * Project how many markets could match.
 * A finished walk is exact. An early stop scales the observed hit rate to the catalog.
 * @param {{ scanned?: number, removedCount?: number, exhausted?: boolean }} sample
 * @returns {{ total: number, estimated: boolean } | null}
 */
export function polymarketMatchEstimate(sample = {}) {
  const seen = Math.max(0, Number(sample.scanned) || 0);
  const removed = Math.max(0, Number(sample.removedCount) || 0);
  const matches = Math.max(0, seen - removed);
  if (seen <= 0) return null;
  if (sample.exhausted) return { total: matches, estimated: false };
  if (seen < ESTIMATE_MIN_SCAN) return null;
  const projected = Math.round((matches / seen) * POLYMARKET_MARKET_UNIVERSE);
  const total = Math.max(matches, Math.min(POLYMARKET_MARKET_UNIVERSE, projected));
  return { total, estimated: true };
}

/** Compact label for the preview line. Estimates are rounded and marked. */
export function formatPolymarketMatchEstimate(estimate) {
  if (!estimate || !Number.isFinite(estimate.total)) return "";
  const { total, estimated } = estimate;
  if (!estimated) return total.toLocaleString();
  if (total >= POLYMARKET_MARKET_UNIVERSE) return "10M +";
  let rounded = total;
  if (total >= 1_000_000) rounded = Math.round(total / 100_000) * 100_000;
  else if (total >= 10_000) rounded = Math.round(total / 1_000) * 1_000;
  else if (total >= 1_000) rounded = Math.round(total / 100) * 100;
  return `~${rounded.toLocaleString()}`;
}
const PAGE_SIZE = 100;
const PAGE_GAP_MS = 400;
const MAX_RATE_RETRIES = 6;
const DROP_SAMPLE = 8;

const EXTRA_FIELDS = [
  ["version", "string"],
  ["positionIds", "string"],
  ["feesEnabled", "boolean"],
  ["feeSchedule_exponent", "number"],
  ["feeSchedule_rate", "number"],
  ["feeSchedule_takerOnly", "boolean"],
  ["feeSchedule_rebateRate", "number"],
  ["decimalized", "boolean"],
  ["locale", "string"],
  ["related_tags", "boolean"],
];

const NUMBER_IDS = new Set([
  "liquidityNum",
  "volumeNum",
  "volume",
  "volume24hr",
  "volume1wk",
  "volume1mo",
  "volume1yr",
  "liquidity",
  "bestBid",
  "bestAsk",
  "lastTradePrice",
  "spread",
  "line",
]);

const BOOLEAN_IDS = new Set([
  "closed",
  "active",
  "cyom",
  "rfqEnabled",
  "feesEnabled",
  "featured",
  "archived",
  "restricted",
  "acceptingOrders",
  "ready",
  "funded",
  "new",
  "decimalized",
  "related_tags",
]);

const FRONT = [
  "id",
  "slug",
  "closed",
  "conditionId",
  "clobTokenIds",
  "questionID",
  "tags",
  "liquidityNum",
  "volumeNum",
  "startDate",
  "endDate",
  "cyom",
  "rfqEnabled",
  "related_tags",
  "umaResolutionStatus",
  "gameId",
  "sportsMarketType",
  "decimalized",
  "locale",
];

const QUERY_ONLY = new Set(["decimalized", "locale", "related_tags"]);

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

function labelList(items, pick) {
  return items.map((item) => pick(item)).filter(Boolean).join(", ");
}

/** Flatten a Gamma market so nested fields land on the column ids the sheet already uses. */
export function flattenPolymarketMarket(record) {
  const source = record && typeof record === "object" ? record : {};
  /** @type {Record<string, unknown>} */
  const out = {};
  const walk = (value, prefix) => {
    if (Array.isArray(value)) {
      if (!prefix) return;
      if (prefix === "tags") {
        out.tags = labelList(value, (item) => item?.label || item?.slug || item?.id || "");
        return;
      }
      if (prefix === "events") {
        out.events = labelList(value, (item) => item?.title || item?.slug || item?.id || "");
        return;
      }
      if (prefix === "categories") {
        out.categories = labelList(value, (item) => item?.label || item?.name || item?.slug || item?.id || "");
        return;
      }
      if (value.every((item) => item == null || typeof item !== "object")) {
        out[prefix] = value.filter((item) => item != null && item !== "").join(", ");
        return;
      }
      out[prefix] = JSON.stringify(value);
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        const next = prefix ? `${prefix}_${key}` : key;
        if (child && typeof child === "object") walk(child, next);
        else out[next] = child == null ? "" : child;
      }
      return;
    }
    if (prefix) out[prefix] = value == null ? "" : value;
  };
  walk(source, "");
  return out;
}

export function polymarketMarketExtraColumns(existingIds) {
  const have = new Set(existingIds);
  return EXTRA_FIELDS.filter(([id]) => !have.has(id)).map(([id, type]) => ({
    id,
    title: id.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (char) => char.toUpperCase()),
    type: type === "boolean" ? "boolean" : type === "number" ? "number" : "text",
    description: "",
    defaultOn: false,
    queryOnly: QUERY_ONLY.has(id),
  }));
}

/** Query filters sit first. Response columns keep their values for the sheet. */
export function polymarketMarketAttributeColumns(columns) {
  const source = Array.isArray(columns) ? columns : [];
  const extras = polymarketMarketExtraColumns(source.map((column) => column.id));
  const merged = [...source, ...extras].map((column) => {
    const id = column.id;
    let next = column;
    if (id === "startDate" || id === "endDate") next = { ...next, control: "query-range", type: "date" };
    else if (id === "tags") next = { ...next, control: "tag-picker", description: "" };
    else if (NUMBER_IDS.has(id)) next = { ...next, type: "number" };
    else if (BOOLEAN_IDS.has(id)) next = { ...next, type: "boolean" };
    if (QUERY_ONLY.has(id)) next = { ...next, queryOnly: true };
    return next;
  });
  const rank = new Map(FRONT.map((id, index) => [id, index]));
  return merged.slice().sort((a, b) => (rank.get(a.id) ?? 1000) - (rank.get(b.id) ?? 1000));
}

function textTerms(filter) {
  const seen = new Set();
  const out = [];
  const list = Array.isArray(filter?.containsTags) ? filter.containsTags : [];
  for (const term of [...list, filter?.contains]) {
    const value = String(term || "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function oneBool(filter) {
  const include = Array.isArray(filter?.include) ? filter.include.filter((value) => value === "true" || value === "false") : [];
  if (include.length !== 1) return "";
  return include[0];
}

function isoEdge(day, edge) {
  const value = String(day || "").trim();
  if (!value) return "";
  return edge === "end" ? `${value}T23:59:59Z` : `${value}T00:00:00Z`;
}

function looksExact(kind, term) {
  const value = String(term || "").trim();
  if (kind === "id") return /^\d+$/.test(value);
  if (kind === "condition") return /^0x[a-fA-F0-9]{16,}$/.test(value);
  if (kind === "token") return /^\d{8,}$/.test(value);
  if (kind === "question") return value.length >= 8 && !/\s/.test(value);
  return false;
}

/**
 * @param {Record<string, any>} filters
 * @param {Array<{ id: string; slug?: string; label?: string }>} tags
 */
export function polymarketMarketServerParams(filters, tags = []) {
  const source = filters && typeof filters === "object" ? filters : {};
  /** @type {Record<string, string>} */
  const params = { include_tag: "true", closed: "false", limit: String(PAGE_SIZE), order: "volume24hr", ascending: "false" };
  const described = ["tags included"];

  const closed = oneBool(source.closed);
  if (closed) {
    params.closed = closed;
    described.push(closed === "true" ? "closed" : "open");
  } else if (Array.isArray(source.closed?.include) && source.closed.include.length > 1) {
    delete params.closed;
    described.push("open and closed");
  }

  const decimalized = oneBool(source.decimalized);
  if (decimalized) params.decimalized = decimalized;
  const cyom = oneBool(source.cyom);
  if (cyom) params.cyom = cyom;
  const rfq = oneBool(source.rfqEnabled);
  if (rfq) params.rfq_enabled = rfq;
  const related = oneBool(source.related_tags);
  if (related) params.related_tags = related;

  const liquidity = source.liquidityNum || {};
  if (String(liquidity.min || "").trim()) params.liquidity_num_min = String(liquidity.min).trim();
  if (String(liquidity.max || "").trim()) params.liquidity_num_max = String(liquidity.max).trim();
  const volume = source.volumeNum || {};
  if (String(volume.min || "").trim()) params.volume_num_min = String(volume.min).trim();
  if (String(volume.max || "").trim()) params.volume_num_max = String(volume.max).trim();

  const start = source.startDate || {};
  if (start.from) params.start_date_min = isoEdge(start.from, "start");
  if (start.to) params.start_date_max = isoEdge(start.to, "end");
  const end = source.endDate || {};
  if (end.from) params.end_date_min = isoEdge(end.from, "start");
  if (end.to) params.end_date_max = isoEdge(end.to, "end");

  const fromFilter = Array.isArray(source.tags?.selectedTags) ? source.tags.selectedTags : [];
  const tagIds = [...fromFilter, ...(Array.isArray(tags) ? tags : [])]
    .map((tag) => String(tag?.id || "").trim())
    .filter((id, index, list) => /^\d+$/.test(id) && list.indexOf(id) === index);
  if (tagIds.length) {
    params.tag_id = tagIds.join(",");
    described.push(`${tagIds.length} ${tagIds.length === 1 ? "tag" : "tags"}`);
  }

  const status = textTerms(source.umaResolutionStatus);
  if (status.length === 1) params.uma_resolution_status = status[0];
  const game = textTerms(source.gameId);
  if (game.length === 1 && !/\s/.test(game[0])) params.game_id = game[0];
  const sports = textTerms(source.sportsMarketType);
  if (sports.length) params.sports_market_types = sports.join(",");
  const locale = textTerms(source.locale);
  if (locale.length === 1) params.locale = locale[0];

  const conditions = textTerms(source.conditionId).filter((term) => looksExact("condition", term));
  if (conditions.length && conditions.length === textTerms(source.conditionId).length) params.condition_ids = conditions.join(",");
  const questions = textTerms(source.questionID).filter((term) => looksExact("question", term));
  if (questions.length && questions.length === textTerms(source.questionID).length) params.question_ids = questions.join(",");
  const tokens = textTerms(source.clobTokenIds).filter((term) => looksExact("token", term));
  if (tokens.length && tokens.length === textTerms(source.clobTokenIds).length) params.clob_token_ids = tokens.join(",");

  if (params.liquidity_num_min || params.liquidity_num_max) described.push("liquidity range");
  if (params.volume_num_min || params.volume_num_max) described.push("volume range");
  if (params.start_date_min || params.start_date_max) described.push("start date");
  if (params.end_date_min || params.end_date_max) described.push("end date");

  return { params, described };
}

export function polymarketMarketFiltersActive(columns, filters, tags) {
  const selected = filters?.tags?.selectedTags;
  if (Array.isArray(selected) && selected.length) return true;
  if (Array.isArray(tags) && tags.length) return true;
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

async function polymarketGet(query, params, signal) {
  const search = new URLSearchParams({ query, skipFlatten: "true" });
  for (const [key, value] of Object.entries(params || {})) {
    if (value != null && String(value).trim() !== "") search.set(key, String(value));
  }
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
  return json;
}

async function exactMarkets(filters, signal) {
  const jobs = [];
  for (const id of textTerms(filters?.id)) {
    if (!looksExact("id", id)) continue;
    jobs.push(polymarketGet("getMarket", { id }, signal).catch(() => null));
  }
  for (const slug of textTerms(filters?.slug)) {
    jobs.push(polymarketGet("getMarketBySlug", { slug }, signal).catch(() => null));
  }
  for (const token of textTerms(filters?.clobTokenIds)) {
    if (!looksExact("token", token)) continue;
    jobs.push(polymarketGet("getMarketByToken", { token_id: token }, signal).catch(() => null));
  }
  const found = await Promise.all(jobs);
  return found.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const rows = Array.isArray(item) ? item : Array.isArray(item.markets) ? item.markets : [item];
    return rows.filter((row) => row && (row.question || row.conditionId || row.condition_id));
  });
}

function marketId(row) {
  return String(row?.id || row?.conditionId || row?.slug || "").trim();
}

/**
 * @param {{
 *   filters: Record<string, any>;
 *   tags?: Array<{ id: string; slug?: string; label?: string }>;
 *   columns: Array<{ id: string; title?: string; queryOnly?: boolean }>;
 *   target: number;
 *   signal?: AbortSignal;
 *   match: (row: Record<string, unknown>) => boolean;
 *   explain: (row: Record<string, unknown>) => string;
 *   onProgress?: (info: Record<string, unknown>) => void;
 * }} spec
 */
export async function scanPolymarketMarkets(spec) {
  const target = Math.max(1, Math.min(POLYMARKET_MARKET_SCAN_CAP, Number(spec.target) || 50));
  const { params, described } = polymarketMarketServerParams(spec.filters, spec.tags);
  const bothClosed = Array.isArray(spec.filters?.closed?.include) && spec.filters.closed.include.length > 1;
  const passes = bothClosed ? ["false", "true"] : [params.closed];
  const kept = [];
  const seen = new Set();
  let scanned = 0;
  let removedCount = 0;
  const removed = [];
  let truncated = false;
  let exhausted = true;

  const take = (record) => {
    const flat = flattenPolymarketMarket(record);
    const id = marketId(flat);
    if (!id || seen.has(id)) return;
    seen.add(id);
    scanned += 1;
    if (spec.match(flat)) {
      if (kept.length < target) kept.push(flat);
      else truncated = true;
      return;
    }
    removedCount += 1;
    if (removed.length < DROP_SAMPLE) {
      removed.push({ ticker: id, label: String(flat.question || flat.slug || id), reason: spec.explain(flat) });
    }
  };

  const publish = (extra) => {
    spec.onProgress?.({
      rows: kept.slice(),
      scanned,
      removed,
      removedCount,
      exhausted,
      truncated,
      waiting: false,
      request: "GET /markets/keyset",
      serverFilters: described,
      ...extra,
    });
  };

  try {
    const exact = await exactMarkets(spec.filters, spec.signal);
    for (const market of exact) take(market);
    publish({});
  } catch (error) {
    if (error?.name === "AbortError") throw error;
  }

  let retries = 0;
  for (const closed of passes) {
    let cursor = "";
    const pageParams = { ...params };
    if (closed === "true" || closed === "false") pageParams.closed = closed;
    else delete pageParams.closed;
    for (;;) {
      if (spec.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      if (kept.length >= target || scanned >= POLYMARKET_MARKET_SCAN_CAP) {
        truncated = kept.length >= target || scanned >= POLYMARKET_MARKET_SCAN_CAP;
        exhausted = false;
        break;
      }
      let page;
      try {
        page = await polymarketGet("listMarketsKeyset", { ...pageParams, after_cursor: cursor }, spec.signal);
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
      const markets = Array.isArray(page?.markets) ? page.markets : [];
      for (const market of markets) take(market);
      cursor = String(page?.next_cursor || "").trim();
      exhausted = !cursor;
      publish({});
      if (!cursor || kept.length >= target) break;
      await sleep(PAGE_GAP_MS, spec.signal);
    }
    if (kept.length >= target) break;
  }

  return {
    rows: kept,
    scanned,
    removed,
    removedCount,
    exhausted,
    truncated: truncated || kept.length >= target,
    request: "GET /markets/keyset",
    serverFilters: described,
  };
}
