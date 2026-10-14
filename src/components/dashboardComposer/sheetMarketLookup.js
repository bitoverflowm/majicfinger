import { loadKalshiLiveEventsByTickers, loadKalshiLiveMarketByTicker, loadKalshiLiveSeriesByTickers } from "@/components/dashboardComposer/integrationBuildCatalog";
import { polymarketMarketMetaLookup } from "@/components/dashboardComposer/polymarketLiveBuild";
import { fetchKalshiHistoricalV2Market } from "@/lib/kalshiHistoricalV2/fetchKalshiHistoricalV2Market";
import { normalizeKalshiLiveMarketRow } from "@/lib/kalshiLive/normalizeMarketRow";
import { lifeOfMarket, uniformColumnValue } from "@/lib/markets/marketLife";
import { sheetAssetIds } from "@/lib/realtime/sheetRealtime";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)+$/;
const KALSHI_MARKET = /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/;
const KALSHI_SERIES = /^[A-Z][A-Z0-9]{1,30}$/;
const CONDITION = /^0x[a-fA-F0-9]{8,}$/;
const TOKEN = /^\d{15,}$/;

/** The sheet already remembers the market question and whether it is still open. */
export function marketMetaComplete(block) {
  const pull = block?.pull;
  if (!pull || !String(pull.marketTitle || "").trim()) return false;
  if ((pull.seriesTicker || pull.eventTicker) && !pull.ticker) return true;
  return pull.closed === true || pull.closed === false || Number(pull.openAt) > 0 || Number(pull.closeAt) > 0;
}

function titledCells(block, title) {
  const name = String(title || "").trim();
  if (!name) return null;
  const columns = Array.isArray(block?.columns) ? block.columns : [];
  const index = columns.findIndex((column) => column?.id === "market_title" || column?.id === "question" || column?.id === "yes_sub_title");
  if (index < 0) return null;
  const sheetTitle = String(block?.title || "").trim();
  const cells = { ...(block?.cells || {}) };
  let changed = false;
  for (const key of Object.keys(cells)) {
    if (Number(String(key).split(",")[0]) !== index) continue;
    const value = String(cells[key] || "").trim();
    if (value && value !== sheetTitle && value !== name) continue;
    if (value === name) continue;
    cells[key] = name;
    changed = true;
  }
  return changed ? cells : null;
}

function titleTail(block) {
  const parts = String(block?.title || "").split("·");
  if (parts.length < 2) return "";
  return parts.slice(1).join("·").trim();
}

function slugFromId(id) {
  const parts = String(id || "").split("-");
  const tail = [];
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    if (!/^[a-z0-9]+$/.test(parts[index])) break;
    tail.unshift(parts[index]);
  }
  const slug = tail.join("-");
  return SLUG.test(slug) ? slug : "";
}

function familyOf(block) {
  const id = String(block?.integrationId || block?.provenance?.integrationId || block?.provenance?.lake || "").toLowerCase();
  if (id.includes("polymarket")) return "polymarket";
  if (id.includes("kalshi")) return "kalshi";
  return "";
}

/**
 * What a sheet is about: one market, one series, or one event.
 * A list of unrelated markets has no single subject.
 * @param {object | null | undefined} block
 */
export function sheetMarketSubject(block) {
  const table = String(block?.table || block?.pull?.table || "").toLowerCase();
  const tail = titleTail(block);
  const token = sheetAssetIds(block).find((id) => TOKEN.test(id)) || "";
  const slugCell = uniformColumnValue(block, ["market_slug", "slug"]);
  const conditionCell = uniformColumnValue(block, ["condition_id", "conditionId"]);
  const tickerCell = uniformColumnValue(block, ["ticker", "market_ticker"]) || String(block?.pull?.ticker || "").trim();
  const seriesCell = uniformColumnValue(block, ["series_ticker"]) || String(block?.pull?.seriesTicker || "").trim();
  const eventCell = uniformColumnValue(block, ["event_ticker"]) || String(block?.pull?.eventTicker || "").trim();
  let family = familyOf(block);
  const slug = SLUG.test(slugCell) ? slugCell : SLUG.test(tail) ? tail : SLUG.test(String(block?.pull?.ticker || "")) ? String(block.pull.ticker) : slugFromId(block?.id);
  const condition = CONDITION.test(conditionCell) ? conditionCell : CONDITION.test(String(block?.pull?.ticker || "")) ? String(block.pull.ticker) : "";
  const kalshiMarket = KALSHI_MARKET.test(tickerCell) ? tickerCell : KALSHI_MARKET.test(tail) ? tail : "";
  const seriesTicker = KALSHI_SERIES.test(seriesCell) ? seriesCell : KALSHI_SERIES.test(tail) ? tail : "";
  if (!family) {
    if (token || slug || condition) family = "polymarket";
    else if (kalshiMarket || seriesTicker) family = "kalshi";
  }
  const seriesSheet = table === "series" || table === "parent-series" || /parent-series/.test(String(block?.id || ""));
  const eventSheet = table === "events" || table === "event_forecast" || table === "event_candlesticks";
  const marketList = table === "markets" || table === "fanout-markets" || /fanout-markets/.test(String(block?.id || ""));
  if (family === "kalshi" && (seriesSheet || (marketList && seriesTicker && !kalshiMarket))) {
    return { family, kind: "series", token: "", slug: "", conditionId: "", ticker: "", seriesTicker, eventTicker: "" };
  }
  if (family === "kalshi" && eventSheet && (eventCell || KALSHI_MARKET.test(tail))) {
    return { family, kind: "event", token: "", slug: "", conditionId: "", ticker: "", seriesTicker: "", eventTicker: eventCell || tail };
  }
  if (family === "polymarket" && (token || slug || condition)) {
    return { family, kind: "market", token, slug, conditionId: condition, ticker: "", seriesTicker: "", eventTicker: "" };
  }
  if (family === "kalshi" && kalshiMarket) {
    return { family, kind: "market", token: "", slug: "", conditionId: "", ticker: kalshiMarket, seriesTicker: "", eventTicker: "" };
  }
  return { family, kind: "", token: "", slug: "", conditionId: "", ticker: "", seriesTicker: "", eventTicker: "" };
}

function metaFromKalshiRow(row, { eventTitle = "", seriesTicker = "", eventTicker = "" } = {}) {
  const life = lifeOfMarket({
    openTime: row?.open_time,
    closeTime: row?.close_time || row?.latest_expiration_time,
    status: row?.status,
    result: row?.result,
  });
  const outcome = String(row?.yes_sub_title || "").trim();
  const question = String(eventTitle || "").trim();
  const marketTitle = question || outcome || String(row?.ticker || "").trim();
  if (!marketTitle) return null;
  return {
    marketTitle,
    ticker: String(row?.ticker || ""),
    side: question && outcome && outcome.toLowerCase() !== question.toLowerCase() ? outcome : "",
    openAt: life?.openMs || 0,
    closeAt: life?.closeMs || 0,
    closed: !!life?.stopped,
    outcome: life?.stopped ? life.outcome : "",
    status: String(row?.status || ""),
    ...(seriesTicker ? { seriesTicker } : {}),
    ...(eventTicker ? { eventTicker } : {}),
  };
}

async function kalshiMarketMeta(ticker) {
  let row = null;
  try {
    row = await loadKalshiLiveMarketByTicker(ticker);
  } catch {
    row = null;
  }
  if (!row?.ticker) {
    try {
      const raw = await fetchKalshiHistoricalV2Market({ marketTicker: ticker });
      row = normalizeKalshiLiveMarketRow(raw);
      if (!row?.ticker) row = { ...row, ticker: String(raw?.ticker || ticker) };
    } catch {
      row = null;
    }
  }
  if (!row?.ticker && !row?.yes_sub_title) return null;
  const eventTicker = String(row.event_ticker || "").trim();
  let eventTitle = "";
  if (eventTicker) {
    try {
      const events = await loadKalshiLiveEventsByTickers([eventTicker]);
      eventTitle = String(events?.rows?.[0]?.title || "").trim();
    } catch {
      eventTitle = "";
    }
  }
  return metaFromKalshiRow(row, { eventTitle, eventTicker });
}

async function kalshiSeriesMeta(ticker) {
  try {
    const loaded = await loadKalshiLiveSeriesByTickers([ticker]);
    const row = loaded?.rows?.[0];
    const marketTitle = String(row?.title || "").trim();
    if (!marketTitle) return null;
    return {
      marketTitle,
      ticker: "",
      seriesTicker: String(row?.ticker || ticker),
      side: String(row?.category || "").trim(),
      openAt: 0,
      closeAt: 0,
      closed: false,
      status: "",
    };
  } catch {
    return null;
  }
}

async function kalshiEventMeta(ticker) {
  try {
    const loaded = await loadKalshiLiveEventsByTickers([ticker]);
    const row = loaded?.rows?.[0];
    const marketTitle = String(row?.title || "").trim();
    if (!marketTitle) return null;
    const life = lifeOfMarket({ closeTime: row?.strike_date });
    const side = String(row?.sub_title || "").trim();
    return {
      marketTitle,
      ticker: "",
      eventTicker: String(row?.event_ticker || ticker),
      seriesTicker: String(row?.series_ticker || "").trim(),
      side: side && side.toLowerCase() !== marketTitle.toLowerCase() ? side : "",
      openAt: life?.openMs || 0,
      closeAt: life?.closeMs || 0,
      closed: !!life?.stopped,
      status: "",
    };
  } catch {
    return null;
  }
}

const lookupQueue = [];
let lookupActive = 0;

function pumpLookups() {
  while (lookupActive < 3 && lookupQueue.length) {
    const job = lookupQueue.shift();
    lookupActive += 1;
    Promise.resolve()
      .then(job.task)
      .then(job.resolve, job.reject)
      .finally(() => {
        lookupActive -= 1;
        pumpLookups();
      });
  }
}

/** Keep market lookups to a few at a time so a tab of sheets does not burst the APIs. */
export function enqueueMarketLookup(task) {
  return new Promise((resolve, reject) => {
    lookupQueue.push({ task, resolve, reject });
    pumpLookups();
  });
}

/**
 * @param {object} block
 * @returns {Promise<{ marketTitle: string, ticker?: string, side?: string, openAt?: number, closeAt?: number, closed: boolean, outcome?: string, status?: string, seriesTicker?: string, eventTicker?: string } | null>}
 */
export async function lookupSheetMarket(block) {
  const subject = sheetMarketSubject(block);
  if (subject.family === "polymarket" && subject.kind === "market") {
    const meta = await polymarketMarketMetaLookup({
      token: subject.token,
      slug: subject.slug,
      conditionId: subject.conditionId,
    });
    return meta?.marketTitle ? meta : null;
  }
  if (subject.family === "kalshi" && subject.kind === "market") return kalshiMarketMeta(subject.ticker);
  if (subject.family === "kalshi" && subject.kind === "series") return kalshiSeriesMeta(subject.seriesTicker);
  if (subject.family === "kalshi" && subject.kind === "event") return kalshiEventMeta(subject.eventTicker);
  return null;
}

/** Pull fields, plus a market-title column that still says the sheet's own name. */
export function marketMetaPatch(block, meta) {
  const table = block?.table || block?.pull?.table || "";
  const pull = {
    ...(block?.pull || {}),
    ...(table ? { table } : {}),
    marketTitle: meta.marketTitle,
    ...(meta.ticker && !block?.pull?.ticker ? { ticker: meta.ticker } : {}),
    ...(meta.seriesTicker && !block?.pull?.seriesTicker ? { seriesTicker: meta.seriesTicker } : {}),
    ...(meta.eventTicker && !block?.pull?.eventTicker ? { eventTicker: meta.eventTicker } : {}),
    ...(meta.side ? { side: meta.side } : {}),
    ...(meta.openAt ? { openAt: meta.openAt } : {}),
    ...(meta.closeAt ? { closeAt: meta.closeAt } : {}),
    closed: !!meta.closed,
    ...(meta.outcome ? { outcome: meta.outcome } : {}),
    ...(meta.status ? { status: meta.status } : {}),
  };
  const cells = titledCells(block, meta.marketTitle);
  const records = titledRecords(block, meta.marketTitle);
  return {
    pull,
    ...(cells ? { cells } : {}),
    ...(records ? { records } : {}),
  };
}

function titledRecords(block, title) {
  const name = String(title || "").trim();
  if (!name || !Array.isArray(block?.records) || !block.records.length) return null;
  const ids = (Array.isArray(block.columns) ? block.columns : [])
    .map((column) => String(column?.id || ""))
    .filter((id) => id === "market_title" || id === "question" || id === "yes_sub_title");
  if (!ids.length) return null;
  const sheetTitle = String(block?.title || "").trim();
  let changed = false;
  const records = block.records.map((row) => {
    const next = { ...(row || {}) };
    for (const id of ids) {
      const value = String(next[id] || "").trim();
      if (value && value !== sheetTitle && value !== name) continue;
      if (value === name) continue;
      next[id] = name;
      changed = true;
    }
    return next;
  });
  return changed ? records : null;
}
