import { loadPolymarketHistoricalTradesForTokens } from "@/components/dashboardComposer/integrationBuildCatalog";
import { describeComposePhase } from "@/components/dashboardComposer/integrationRunFeed";
import { polymarketLiveBuildColumns, tradeSheetRow } from "@/components/dashboardComposer/polymarketLiveBuild";
import { RECIPE_POLYMARKET_TRADE_HISTORY, RECIPE_TRADE_ROW_LIMIT } from "@/lib/dataLake/recipeLakeAccess";
import { parseOutcomeList, parseTokenIdList } from "@/lib/polymarketLive/orderbooksCompose";

/** Polymarket Historical is the lake: Polymarket's launch through Dec 2025. Polymarket Live carries everything after. */
export const POLYMARKET_LAKE_END_MS = Date.UTC(2026, 0, 1);

export const SOURCE_LABELS = {
  polymarket: "Polymarket Live",
  polymarketHistorical: "Polymarket Historical",
};

const SEARCH_LIMIT = 30;
const LIVE_PAGE_SIZE = 1000;
const CONDITION_ID = /^0x[a-fA-F0-9]{64}$/;
const TOKEN_ID = /^\d{20,}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)+$/i;

/** Gamma dates come as ISO, `2024-11-06 15:17:41+00`, or epoch seconds. */
export function toMs(value) {
  if (value == null || value === "") return 0;
  const n = Number(value);
  if (Number.isFinite(n) && n > 1e9) return n > 1e12 ? n : n * 1000;
  const text = String(value).trim().replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function num(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

async function polymarketGet(query, params, signal, { retries = 0, onWait } = {}) {
  const search = new URLSearchParams({ query, skipFlatten: "true" });
  for (const [key, value] of Object.entries(params || {})) {
    if (value != null && String(value).trim() !== "") search.set(key, String(value));
  }
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(`/api/integrations/polymarket?${search}`, {
      signal,
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return body;
    if (attempt < retries) {
      const seconds = Math.min(30, 2 ** Math.min(attempt + 1, 5));
      onWait?.(seconds);
      await wait(seconds * 1000, signal);
      continue;
    }
    const err = new Error(body?.message || body?.error || "Polymarket request failed");
    err.status = res.status;
    throw err;
  }
}

function list(payload) {
  if (Array.isArray(payload)) return payload.filter((item) => item && typeof item === "object");
  return payload && typeof payload === "object" ? [payload] : [];
}

function rethrowAbort(err) {
  if (err?.name === "AbortError") throw err;
}

function isClosed(raw) {
  return raw?.closed === true || raw?.closed === "true";
}

function marketStatus(raw) {
  if (isClosed(raw)) return "closed";
  if (raw?.acceptingOrders === false && toMs(raw?.startDate) > Date.now()) return "upcoming";
  return "open";
}

function resultFromGamma(raw, eventTitle = "") {
  const conditionId = String(raw?.conditionId || raw?.condition_id || "").trim();
  if (!conditionId) return null;
  const title = String(raw?.question || raw?.groupItemTitle || raw?.slug || conditionId).trim();
  const parent = String(eventTitle || raw?.events?.[0]?.title || "").trim();
  return {
    conditionId,
    slug: String(raw?.slug || "").trim(),
    title,
    subtitle: parent && parent !== title ? parent : "",
    status: marketStatus(raw),
    closeMs: toMs(raw?.closedTime) || toMs(raw?.endDate),
    volume: num(raw?.volumeNum ?? raw?.volume),
  };
}

/** A slug, condition id, or token id from a pasted polymarket.com link or typed on its own. */
export function lookupFromQuery(query) {
  const text = String(query || "").trim();
  if (!text) return null;
  if (/polymarket\.com\//i.test(text)) {
    try {
      const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
      const parts = url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
      const last = parts[parts.length - 1] || "";
      if (CONDITION_ID.test(last)) return { conditionId: last };
      if (TOKEN_ID.test(last)) return { tokenId: last };
      if (parts[0] === "event" && parts.length >= 3) return { marketSlug: last, eventSlug: parts[1] };
      if (parts[0] === "event") return { eventSlug: last };
      return last ? { marketSlug: last, eventSlug: last } : null;
    } catch {
      return null;
    }
  }
  if (CONDITION_ID.test(text)) return { conditionId: text };
  if (TOKEN_ID.test(text)) return { tokenId: text };
  if (SLUG.test(text)) return { marketSlug: text.toLowerCase(), eventSlug: text.toLowerCase() };
  return null;
}

/** Gamma's market list hides closed markets unless asked, so each lookup tries open first, then closed. */
async function listMarketsEither(params, signal) {
  const open = list(await polymarketGet("listMarkets", { ...params, limit: params.limit || "10" }, signal));
  if (open.length) return open;
  return list(await polymarketGet("listMarkets", { ...params, limit: params.limit || "10", closed: "true" }, signal));
}

function directLookups(lookup, signal) {
  const tasks = [];
  if (lookup.conditionId) {
    tasks.push(listMarketsEither({ condition_ids: lookup.conditionId }, signal).then((rows) => rows.map((row) => resultFromGamma(row))));
  }
  if (lookup.tokenId) {
    tasks.push(listMarketsEither({ clob_token_ids: lookup.tokenId }, signal).then((rows) => rows.map((row) => resultFromGamma(row))));
  }
  if (lookup.marketSlug) {
    tasks.push(polymarketGet("getMarketBySlug", { slug: lookup.marketSlug }, signal).then((body) => list(body).map((row) => resultFromGamma(row))));
  }
  if (lookup.eventSlug) {
    tasks.push(
      polymarketGet("getEventBySlug", { slug: lookup.eventSlug }, signal).then((body) =>
        list(body).flatMap((event) => (Array.isArray(event.markets) ? event.markets : []).map((row) => resultFromGamma(row, event.title))),
      ),
    );
  }
  return tasks.map((task) => task.then((items) => ({ rank: 0, items })));
}

/** How many of the query's words appear in a result. The search lists closed markets after every open one. */
function matchScore(query, item) {
  const words = new Set(String(query).toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 1));
  const haystack = new Set(`${item.title} ${item.subtitle}`.toLowerCase().split(/[^a-z0-9]+/));
  let score = 0;
  for (const word of words) if (haystack.has(word)) score += 1;
  return score;
}

function textLookup(query, signal) {
  return polymarketGet(
    "metadataSuggestions",
    { q: query, limit_per_type: "20", keep_closed_markets: "1", search_tags: "false", search_profiles: "false" },
    signal,
  ).then((body) => ({
    rank: 1,
    items: (Array.isArray(body?.suggestions) ? body.suggestions : [])
      .filter((hit) => hit?.entity === "market")
      .map((hit) => {
        const result = resultFromGamma({ ...(hit.raw || {}), conditionId: hit.conditionId || hit.raw?.conditionId }, String(hit.subtitle || "").replace(/^Event:\s*/, ""));
        return result ? { ...result, volume: num(hit.volume) ?? result.volume } : null;
      })
      .filter(Boolean)
      .map((item) => ({ ...item, match: matchScore(query, item) })),
  }));
}

/**
 * Plain-English search, plus direct lookups when the query is a Polymarket link, slug, condition
 * id, or token id. `onUpdate` gets the merged list each time a lookup lands.
 */
export async function searchPolymarketMarkets(query, signal, onUpdate) {
  const text = String(query || "").trim();
  const lookup = lookupFromQuery(text);
  const tasks = [...(lookup ? directLookups(lookup, signal) : []), ...(/polymarket\.com\//i.test(text) ? [] : [textLookup(text, signal)])];
  const markets = new Map();
  const merged = () =>
    [...markets.values()]
      .sort((a, b) => a.rank - b.rank || (b.match || 0) - (a.match || 0) || (b.volume || 0) - (a.volume || 0))
      .slice(0, SEARCH_LIMIT);
  await Promise.allSettled(
    tasks.map((task) =>
      task.then(({ rank, items }) => {
        if (signal?.aborted) return;
        for (const item of items) {
          if (!item?.conditionId) continue;
          const prior = markets.get(item.conditionId);
          if (!prior || rank < prior.rank) markets.set(item.conditionId, { ...prior, ...item, rank });
        }
        if (markets.size) onUpdate?.(merged());
      }),
    ),
  );
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  return merged();
}

function winnerOf(outcomes, prices) {
  let best = -1;
  let index = -1;
  prices.forEach((price, at) => {
    const n = Number(price);
    if (Number.isFinite(n) && n > best) {
      best = n;
      index = at;
    }
  });
  return best >= 0.99 && outcomes[index] ? outcomes[index] : "";
}

/** One Gamma market with its outcome tokens, prices, and trading window. */
export async function resolvePolymarketMarket(conditionId, signal) {
  const id = String(conditionId || "").trim();
  const [raw] = await listMarketsEither({ condition_ids: id, limit: "1" }, signal);
  if (!raw) throw new Error("Polymarket has no market with this condition id.");
  const tokenIds = parseTokenIdList(raw.clobTokenIds || raw.clob_token_ids);
  if (!tokenIds.length) throw new Error("This market has no outcome tokens to trade.");
  const outcomes = parseOutcomeList(raw.outcomes);
  const prices = parseOutcomeList(raw.outcomePrices);
  const closed = isClosed(raw);
  const event = raw.events?.[0] || {};
  const title = String(raw.question || raw.groupItemTitle || raw.slug || id).trim();
  const eventTitle = String(event.title || "").trim();
  return {
    conditionId: String(raw.conditionId || id),
    marketId: String(raw.id || ""),
    slug: String(raw.slug || "").trim(),
    title,
    subtitle: eventTitle && eventTitle !== title ? eventTitle : "",
    eventSlug: String(event.slug || "").trim(),
    tokenIds,
    outcomes,
    prices: prices.map((price) => num(price)),
    status: marketStatus(raw),
    winner: closed ? winnerOf(outcomes, prices) : "",
    openMs: toMs(raw.startDate) || toMs(raw.createdAt),
    closeMs: toMs(raw.closedTime) || toMs(raw.endDate),
    closed,
    lastPrice: num(raw.lastTradePrice),
    bestBid: num(raw.bestBid),
    bestAsk: num(raw.bestAsk),
    volume: num(raw.volumeNum ?? raw.volume),
    volume24h: num(raw.volume24hr),
    liquidity: num(raw.liquidityNum ?? raw.liquidity),
  };
}

/**
 * Which source holds the market's trades. Markets that opened after the lake ends trade only on
 * Polymarket Live. Markets that closed before it ends sit in Polymarket Historical. A market that
 * spans the boundary takes newer trades from Live and older ones from Historical.
 */
export function planTradeSources(meta) {
  const split = POLYMARKET_LAKE_END_MS;
  if (meta?.openMs && meta.openMs >= split) return { kind: "live", sources: ["polymarket"], split };
  if (meta?.closed && meta.closeMs && meta.closeMs < split) {
    return { kind: "historical", sources: ["polymarketHistorical", "polymarket"], split };
  }
  return { kind: "live+historical", sources: ["polymarket", "polymarketHistorical"], split };
}

export function formatDay(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function describePlan(plan) {
  const cutoff = formatDay(plan?.split) || "Jan 1, 2026";
  if (plan?.kind === "live") {
    return { label: SOURCE_LABELS.polymarket, detail: `Opened after Polymarket Historical ends on ${cutoff}, so every trade is on Polymarket Live.` };
  }
  if (plan?.kind === "historical") {
    return {
      label: SOURCE_LABELS.polymarketHistorical,
      detail: "Closed before 2026, so Lychee reads Polymarket Historical first and falls back to Polymarket Live if the lake has no trades.",
    };
  }
  return {
    label: `${SOURCE_LABELS.polymarket} + Historical`,
    detail: `Trades since ${cutoff} come from Polymarket Live. Older trades come from Polymarket Historical.`,
  };
}

function marketRef(meta) {
  return { entityId: meta.marketId, title: meta.title, slug: meta.slug, conditionId: meta.conditionId };
}

/** Newest first. With `since`, paging stops at the first trade older than it. */
async function liveTrades(meta, limit, onProgress, { since = 0 } = {}) {
  const rows = [];
  let cursor = "";
  let reachedSince = false;
  while (rows.length < limit) {
    const body = await polymarketGet(
      "getTradesByMarket",
      { condition: meta.conditionId, limit: String(LIVE_PAGE_SIZE), ...(cursor ? { cursor } : {}) },
      undefined,
      {
        retries: 6,
        onWait: (seconds) => onProgress?.(`Read ${rows.length.toLocaleString()} trades from Polymarket Live · retrying in ${seconds}s`),
      },
    );
    const root = Array.isArray(body) ? body[0] : body;
    const page = Array.isArray(root?.data) ? root.data.filter((row) => row && typeof row === "object") : [];
    for (const row of page) {
      if (since && Number(row.timestamp) * 1000 < since) {
        reachedSince = true;
        break;
      }
      rows.push(tradeSheetRow(row, marketRef(meta)));
      if (rows.length >= limit) break;
    }
    onProgress?.(`Read ${rows.length.toLocaleString()} trades from Polymarket Live`);
    cursor = String(root?.pagination?.next_cursor || "").trim();
    if (reachedSince || !cursor || !page.length) break;
  }
  return { rows: rows.slice(0, limit), truncated: rows.length >= limit && Boolean(cursor) && !reachedSince };
}

function lakeTrades(meta, limit, onProgress) {
  return loadPolymarketHistoricalTradesForTokens(meta.tokenIds, limit, {
    outcomes: meta.outcomes,
    recipe: RECIPE_POLYMARKET_TRADE_HISTORY,
    // A full history downloads 1,000 rows per page, and a slow link can take over 20s for one.
    pageTimeoutMs: 90000,
    onPhase: (info) => onProgress?.(describeComposePhase(info, { table: "polymarket.trades", limit })),
  });
}

/**
 * Lake fills in the Live trade columns. The lake logs each maker order a taker filled, and Live
 * logs the taker's whole fill once, so fills that share a transaction, taker, and outcome merge
 * into one row priced at their combined USDC per share.
 */
function liveRowsFromFills(fills, meta, before) {
  const tokenOf = new Map(meta.outcomes.map((outcome, index) => [outcome, meta.tokenIds[index]]));
  const groups = new Map();
  for (const fill of fills) {
    const ms = Date.parse(String(fill.timestamp || ""));
    if (!Number.isFinite(ms) || ms >= before) continue;
    if (fill.price == null || !fill.size) continue;
    const key = `${fill.transaction_hash}|${fill.taker}|${fill.outcome}|${fill.side}`;
    const group = groups.get(key);
    if (group) {
      group.size += Number(fill.size) || 0;
      group.usdc += Number(fill.usdc_amount) || 0;
    } else {
      groups.set(key, { fill, ms, size: Number(fill.size) || 0, usdc: Number(fill.usdc_amount) || 0 });
    }
  }
  return [...groups.values()].map(({ fill, ms, size, usdc }) => {
    const index = meta.outcomes.indexOf(fill.outcome);
    const hash = String(fill.transaction_hash || "").trim();
    return tradeSheetRow(
      {
        title: meta.title,
        slug: meta.slug,
        event_slug: meta.eventSlug,
        token_id: tokenOf.get(fill.outcome) || "",
        outcome: fill.outcome,
        outcome_index: index >= 0 ? index : "",
        side: fill.side,
        price: size ? Math.round((usdc / size) * 1e4) / 1e4 : fill.price,
        size: Math.round(size * 1e6) / 1e6,
        timestamp: Math.floor(ms / 1000),
        proxy_wallet: String(fill.taker || "").toLowerCase(),
        transaction_hash: hash && !hash.startsWith("0x") ? `0x${hash}` : hash,
      },
      marketRef(meta),
    );
  });
}

function dedupeTrades(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.transaction_hash}|${row.proxy_wallet}|${row.token_id}|${row.side}`;
    if (!row.transaction_hash) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Every trade for one market, from the source the plan picked. When the picked source comes back
 * empty, the other one is tried. Recipes skip the plan's row cap and stop only at
 * `RECIPE_TRADE_ROW_LIMIT`.
 */
export async function pullPolymarketTradeHistory(meta, plan, { onProgress } = {}) {
  const cap = RECIPE_TRADE_ROW_LIMIT;
  const liveColumns = polymarketLiveBuildColumns("getTradesByMarket");
  const asLive = (pulled, label = SOURCE_LABELS.polymarket) => ({
    integrationId: "polymarket",
    table: "getTradesByMarket",
    columns: liveColumns,
    rows: pulled.rows,
    truncated: pulled.truncated,
    label,
  });

  if (plan.kind === "historical") {
    const lake = await lakeTrades(meta, cap, onProgress);
    if (lake.rows.length) {
      return {
        integrationId: "polymarketHistorical",
        table: "trades",
        columns: lake.columns,
        rows: lake.rows,
        truncated: lake.rows.length >= cap,
        label: SOURCE_LABELS.polymarketHistorical,
        composeRequest: lake.request,
      };
    }
    onProgress?.("No trades in Polymarket Historical. Trying Polymarket Live");
    return asLive(await liveTrades(meta, cap, onProgress));
  }

  if (plan.kind === "live") return asLive(await liveTrades(meta, cap, onProgress));

  const live = await liveTrades(meta, cap, onProgress, { since: plan.split });
  if (live.rows.length >= cap) return asLive(live);
  const lake = await lakeTrades(meta, cap, onProgress);
  const older = liveRowsFromFills(lake.rows, meta, plan.split);
  if (!older.length) {
    onProgress?.("No older trades in Polymarket Historical. Reading them from Polymarket Live");
    return asLive(await liveTrades(meta, cap, onProgress));
  }
  const rows = dedupeTrades([...live.rows, ...older]).slice(0, cap);
  return asLive({ rows, truncated: rows.length >= cap }, describePlan(plan).label);
}
