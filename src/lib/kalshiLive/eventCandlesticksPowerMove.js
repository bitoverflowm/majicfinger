/**
 * One-click "plot all event candlesticks on dashboard" power move.
 *
 * Design goals:
 * - O(n) sheet/market indexing (no nested scans per chart)
 * - Waterfall chart creation so the UI can paint between cards
 * - 3-across (colSpan 4) master grid without cloning candle row payloads
 * - Charts reference sheet ids in snapshots — data stays in workspace sheets
 * - Nothing is written to the database until the user saves the dashboard
 */

import {
  createEmptyDashboardLayout,
  DEFAULT_CHART_CARD_ROW_SPAN,
} from "@/lib/dashboardLayoutDefaults";
import { registerLocalDashboardChart } from "@/lib/localDashboardCharts";

/** Three charts per row on the 12-col dashboard grid. */
export const EVENT_CANDLES_DASH_COL_SPAN = 4;

/** Slightly shorter than default so a 3×N master view stays scannable. */
export const EVENT_CANDLES_DASH_ROW_SPAN = Math.min(2, DEFAULT_CHART_CARD_ROW_SPAN);

/** Compact card text so three-across headings don't dominate the grid. */
const EVENT_CANDLES_CARD_TEXT_THEME = {
  chartHeadingTheme: { fontSize: "sm" },
  chartSubheadingTheme: { fontSize: "xs" },
  chartMicrotextTheme: { fontSize: "xs" },
};

/**
 * @param {unknown} v
 * @returns {number | null}
 */
function num(v) {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Implied probability (%) the market assigns to YES. Prefers the last trade,
 * falling back to the bid/ask midpoint, then whichever side is quoted.
 *
 * @param {Record<string, unknown>} row
 * @returns {number | null}
 */
export function impliedChancePctFromMarketRow(row) {
  const last = num(row?.last_price_dollars);
  const bid = num(row?.yes_bid_dollars);
  const ask = num(row?.yes_ask_dollars);
  let price = null;
  if (last != null && last > 0) price = last;
  else if (bid != null && bid > 0 && ask != null && ask > 0) price = (bid + ask) / 2;
  else if (bid != null && bid > 0) price = bid;
  else if (ask != null && ask > 0) price = ask;
  if (price == null) return null;
  // Binary contracts settle at $1, so dollars map directly to probability.
  // Scalar markets can quote outside [0,1] — treat those as "no percentage".
  if (price < 0 || price > 1) return null;
  return price * 100;
}

/**
 * @param {number | null} n
 * @returns {string}
 */
function compactNumber(n) {
  if (n == null || !Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

/**
 * @param {number | null} pct
 * @returns {string}
 */
function formatChancePct(pct) {
  if (pct == null || !Number.isFinite(pct)) return "";
  // Keep one decimal so live ticks (e.g. 9.6% → 10.2%) are visible; whole
  // numbers stay clean (10 → 10%).
  const rounded1 = Math.round(pct * 10) / 10;
  if (Number.isInteger(rounded1)) return `${rounded1}%`;
  return `${rounded1.toFixed(1)}%`;
}

/**
 * Yield to the browser so React can paint newly-added dashboard cards.
 * Double-rAF + microtask timeout keeps Big-O sequential work without freezing the main thread.
 * @returns {Promise<void>}
 */
export function yieldToUi() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 0);
        });
      });
      return;
    }
    setTimeout(resolve, 16);
  });
}

/**
 * @param {string} [prefix]
 * @returns {string}
 */
function rid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * @param {Record<string, unknown> | null | undefined} dataSheets
 * @returns {{
 *   metaSheetId: string | null;
 *   markets: { sheetId: string; marketTicker: string; rowCount: number }[];
 *   eventTicker: string;
 *   seriesTicker: string;
 *   eventTitle: string;
 *   eventSubTitle: string;
 *   querySummary: string;
 * }}
 */
export function collectEventCandlestickMarketSheets(dataSheets) {
  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
  /** @type {{ sheetId: string; marketTicker: string; rowCount: number; order: number }[]} */
  const markets = [];
  let metaSheetId = null;
  let eventTicker = "";
  let seriesTicker = "";
  let eventTitle = "";
  let eventSubTitle = "";
  let querySummary = "";
  let order = 0;

  for (const [sheetId, sheet] of Object.entries(sheets)) {
    const prov = sheet?.provenance;
    if (!prov || typeof prov !== "object") continue;
    if (String(prov.source || "") !== "kalshi-live") continue;
    if (String(prov.endpoint || "") !== "event_candlesticks") continue;

    if (!eventTicker && prov.eventTicker) eventTicker = String(prov.eventTicker).trim();
    if (!seriesTicker && prov.seriesTicker) seriesTicker = String(prov.seriesTicker).trim();
    if (!eventTitle && prov.eventTitle) eventTitle = String(prov.eventTitle).trim();
    if (!eventSubTitle && prov.eventSubTitle) eventSubTitle = String(prov.eventSubTitle).trim();
    if (!querySummary && prov.querySummary) querySummary = String(prov.querySummary).trim();

    const kind = String(prov.sheetKind || "");
    if (kind === "markets_metadata") {
      metaSheetId = sheetId;
      continue;
    }
    if (kind !== "market_candlesticks") continue;

    const marketTicker =
      String(prov.marketTicker || sheet?.name || "").trim() || sheetId;
    const rowCount = Array.isArray(sheet?.data) ? sheet.data.length : 0;
    if (rowCount <= 0) continue;

    markets.push({ sheetId, marketTicker, rowCount, order: order++ });
  }

  markets.sort((a, b) => a.order - b.order);

  return {
    metaSheetId,
    markets: markets.map(({ sheetId, marketTicker, rowCount }) => ({
      sheetId,
      marketTicker,
      rowCount,
    })),
    eventTicker,
    seriesTicker,
    eventTitle,
    eventSubTitle,
    querySummary,
  };
}

/**
 * @typedef {{
 *   title: string;
 *   noSubTitle: string;
 *   chancePct: number | null;
 *   volume: number | null;
 *   volume24h: number | null;
 *   openInterest: number | null;
 *   status: string;
 *   closeTime: string;
 *   lastPrice: number | null;
 * }} MarketMetaEntry
 */

/**
 * Index market metadata from the metadata sheet in one pass — O(m).
 * Carries the implied chance and volume stats used for ranking and captions.
 *
 * @param {Record<string, unknown> | null | undefined} metaSheet
 * @returns {Map<string, MarketMetaEntry>}
 */
export function indexMarketLabelsFromMetaSheet(metaSheet) {
  /** @type {Map<string, MarketMetaEntry>} */
  const map = new Map();
  const rows = Array.isArray(metaSheet?.data) ? metaSheet.data : [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const ticker = String(row.ticker || "").trim();
    if (!ticker) continue;
    const yes = String(row.yes_sub_title || "").trim();
    map.set(ticker.toUpperCase(), {
      title: yes || ticker,
      noSubTitle: String(row.no_sub_title || "").trim(),
      chancePct: impliedChancePctFromMarketRow(row),
      volume: num(row.volume_fp),
      volume24h: num(row.volume_24h_fp),
      openInterest: num(row.open_interest_fp),
      status: String(row.status || "").trim(),
      closeTime: String(row.close_time || "").trim(),
      lastPrice: num(row.last_price_dollars),
    });
  }
  return map;
}

/**
 * Rank markets most-likely-to-win first so cell 1 holds the favourite.
 * Markets without a quoted price keep their pull order at the end.
 *
 * @template {{ marketTicker: string }} T
 * @param {T[]} markets
 * @param {Map<string, MarketMetaEntry>} labelIndex
 * @returns {(T & { chancePct: number | null })[]}
 */
export function rankMarketsByChance(markets, labelIndex) {
  const list = (Array.isArray(markets) ? markets : []).map((m, idx) => ({
    ...m,
    chancePct: labelIndex.get(String(m.marketTicker || "").toUpperCase())?.chancePct ?? null,
    __order: idx,
  }));
  list.sort((a, b) => {
    if (a.chancePct == null && b.chancePct == null) return a.__order - b.__order;
    if (a.chancePct == null) return 1;
    if (b.chancePct == null) return -1;
    if (b.chancePct !== a.chancePct) return b.chancePct - a.chancePct;
    return a.__order - b.__order;
  });
  return list.map(({ __order, ...rest }) => rest);
}

/**
 * Card sub-heading: implied chance plus whatever liquidity metadata exists.
 *
 * @param {MarketMetaEntry | undefined} meta
 * @param {number | null} chancePct
 * @returns {string}
 */
export function buildMarketCardCaption(meta, chancePct) {
  const parts = [];
  const pct = formatChancePct(chancePct ?? meta?.chancePct ?? null);
  if (pct) parts.push(`${pct} chance`);
  const vol = compactNumber(meta?.volume ?? null);
  if (vol) parts.push(`Vol ${vol}`);
  const vol24 = compactNumber(meta?.volume24h ?? null);
  if (vol24) parts.push(`24h ${vol24}`);
  const oi = compactNumber(meta?.openInterest ?? null);
  if (oi) parts.push(`OI ${oi}`);
  if (meta?.status) parts.push(meta.status);
  return parts.join(" · ");
}

/**
 * Aggregate liquidity across every market in the event for the page subheading.
 *
 * @param {Map<string, MarketMetaEntry>} labelIndex
 * @returns {{ volume: number | null; volume24h: number | null; openInterest: number | null }}
 */
export function aggregateEventMetadata(labelIndex) {
  let volume = null;
  let volume24h = null;
  let openInterest = null;
  for (const meta of labelIndex.values()) {
    if (meta.volume != null) volume = (volume ?? 0) + meta.volume;
    if (meta.volume24h != null) volume24h = (volume24h ?? 0) + meta.volume24h;
    if (meta.openInterest != null) openInterest = (openInterest ?? 0) + meta.openInterest;
  }
  return { volume, volume24h, openInterest };
}

/**
 * Human-readable candle interval from the pull's query summary
 * (e.g. "period_interval=60" → "1h candles").
 *
 * @param {string} querySummary
 * @returns {string}
 */
export function describeCandleInterval(querySummary) {
  const m = /period_interval=(\d+)/.exec(String(querySummary || ""));
  const minutes = m ? Number(m[1]) : NaN;
  if (!Number.isFinite(minutes)) return "";
  if (minutes === 1) return "1m candles";
  if (minutes === 60) return "1h candles";
  if (minutes === 1440) return "1d candles";
  return `${minutes}m candles`;
}

/**
 * Minimal candlestick builder snapshot — references sheet id only (no row cloning).
 *
 * @param {{ sheetId: string; title: string }} opts
 */
export function buildEventCandlestickChartSnapshot({ sheetId, title }) {
  return {
    v: 1,
    selChartType: "candlestick",
    candlestickSheetId: String(sheetId || ""),
    candlestickOhlcSetId: "auto",
    title: String(title || "Candlesticks").slice(0, 120),
    // The dashboard card heading already names the market — a second title
    // inside the chart just eats plot height in a 3-across grid.
    titleHidden: true,
    subTitleHidden: true,
    selX: null,
    selY: [],
  };
}

/**
 * @param {object} [overrides]
 */
export function emptyDashboardChartColumn(overrides = {}) {
  return {
    id: rid("col"),
    chart_id: null,
    colSpan: EVENT_CANDLES_DASH_COL_SPAN,
    rowSpan: EVENT_CANDLES_DASH_ROW_SPAN,
    h2: "",
    caption: "",
    microtext: "",
    link: { mode: "none", url: "" },
    ...EVENT_CANDLES_CARD_TEXT_THEME,
    ...overrides,
  };
}

/**
 * Append one chart card into a 3-across (colSpan 4) cards layout. Mutates a
 * shallow-copied layout tree; returns a new layout object. O(1) amortized per
 * append (only touches the last cards row).
 *
 * @param {{ version?: number; rows?: object[] } | null | undefined} layout
 * @param {{
 *   chartId: string;
 *   h2?: string;
 *   caption?: string;
 *   microtext?: string;
 *   liveMetaTicker?: string;
 *   liveMetaSheetId?: string;
 * }} card
 * @returns {{ version: 1; rows: object[] }}
 */
export function appendEventCandlestickChartToLayout(layout, card) {
  const base = layout && typeof layout === "object" ? layout : createEmptyDashboardLayout();
  const rows = Array.isArray(base.rows) ? base.rows.map((r) => ({ ...r })) : [];
  const colSpan = EVENT_CANDLES_DASH_COL_SPAN;

  let lastCardsIdx = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i]?.type === "cards" && Array.isArray(rows[i].columns)) {
      lastCardsIdx = i;
      break;
    }
  }

  const liveMetaTicker = String(card.liveMetaTicker || "").trim();
  const liveMetaSheetId = String(card.liveMetaSheetId || "").trim();
  const nextCol = emptyDashboardChartColumn({
    chart_id: card.chartId,
    h2: String(card.h2 || "").slice(0, 160),
    caption: String(card.caption || "").slice(0, 240),
    microtext: String(card.microtext || "").slice(0, 160),
    colSpan,
    ...(liveMetaTicker
      ? {
          liveMetaTicker,
          ...(liveMetaSheetId ? { liveMetaSheetId } : {}),
          liveMetaLocked: false,
        }
      : {}),
  });

  if (lastCardsIdx < 0) {
    rows.push({ id: rid("row"), type: "cards", columns: [nextCol] });
    return { version: 1, rows };
  }

  const row = rows[lastCardsIdx];
  const cols = Array.isArray(row.columns) ? [...row.columns] : [];
  const sum = cols.reduce((acc, c) => acc + (Number(c?.colSpan) || 0), 0);

  if (sum + colSpan <= 12) {
    rows[lastCardsIdx] = { ...row, columns: [...cols, nextCol] };
  } else {
    rows.push({ id: rid("row"), type: "cards", columns: [nextCol] });
  }

  return { version: 1, rows };
}

/**
 * Infer market ticker for live caption binding (explicit field or microtext prefix).
 * @param {{ liveMetaTicker?: string; microtext?: string } | null | undefined} col
 * @returns {string} uppercase ticker or ""
 */
export function inferLiveMetaTickerFromColumn(col) {
  const explicit = String(col?.liveMetaTicker || "").trim();
  if (explicit) return explicit.toUpperCase();
  const micro = String(col?.microtext || "").trim();
  if (!micro) return "";
  const first = micro.split("·")[0]?.trim() || "";
  if (/^[A-Z0-9][A-Z0-9_-]{2,}$/i.test(first)) return first.toUpperCase();
  return "";
}

/**
 * Live h2 / caption / microtext for a chart card from markets metadata.
 *
 * @param {{
 *   ticker: string;
 *   meta: MarketMetaEntry | undefined;
 *   fallback?: { h2?: string; caption?: string; microtext?: string };
 * }} opts
 */
export function resolveLiveMarketCardCopy(opts) {
  const ticker = String(opts.ticker || "").trim();
  const meta = opts.meta;
  const fallback = opts.fallback || {};
  if (!meta) {
    return {
      h2: String(fallback.h2 || ticker || "").slice(0, 160),
      caption: String(fallback.caption || "").slice(0, 240),
      microtext: String(fallback.microtext || ticker || "").slice(0, 160),
    };
  }
  const title = meta.title || ticker;
  const pct = formatChancePct(meta.chancePct);
  const h2 = (pct ? `${title} — ${pct}` : title).slice(0, 160);
  const caption = (buildMarketCardCaption(meta, meta.chancePct) || ticker || "").slice(0, 240);
  const microtext = [ticker, meta.noSubTitle ? `No: ${meta.noSubTitle}` : ""]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 160);
  return { h2, caption, microtext };
}

/**
 * Rebuild event page subheading from live meta sheet aggregates.
 *
 * @param {Record<string, object> | null | undefined} dataSheets
 * @param {{
 *   metaSheetId?: string;
 *   seriesTicker?: string;
 *   eventSubTitle?: string;
 *   querySummary?: string;
 *   marketCount?: number;
 * } | null | undefined} liveEventMeta
 * @returns {string | null}
 */
export function resolveLiveEventPageSubheading(dataSheets, liveEventMeta) {
  const collected = collectEventCandlestickMarketSheets(dataSheets || {});
  const metaSheetId =
    String(liveEventMeta?.metaSheetId || collected?.metaSheetId || "").trim() || "";
  const metaSheet = metaSheetId ? dataSheets?.[metaSheetId] : null;
  if (!metaSheet) return null;
  const labelIndex = indexMarketLabelsFromMetaSheet(metaSheet);
  if (!labelIndex.size) return null;
  const seriesTicker = String(
    liveEventMeta?.seriesTicker || collected?.seriesTicker || "",
  ).trim();
  const eventSubTitle = String(
    liveEventMeta?.eventSubTitle || collected?.eventSubTitle || "",
  ).trim();
  const querySummary = String(
    liveEventMeta?.querySummary || collected?.querySummary || "",
  ).trim();
  const marketCount =
    Math.floor(Number(liveEventMeta?.marketCount)) ||
    collected?.markets?.length ||
    labelIndex.size;
  return buildEventPageSubheading({
    seriesTicker,
    marketCount,
    querySummary,
    totals: aggregateEventMetadata(labelIndex),
    eventSubTitle,
  }).slice(0, 240);
}

/**
 * Dashboard sub-heading: series, market count, candle interval and aggregate
 * liquidity for the whole event.
 *
 * @param {{
 *   seriesTicker: string;
 *   marketCount: number;
 *   querySummary: string;
 *   totals: { volume: number | null; volume24h: number | null; openInterest: number | null };
 *   eventSubTitle?: string;
 * }} opts
 * @returns {string}
 */
export function buildEventPageSubheading(opts) {
  const parts = [];
  if (opts.eventSubTitle) parts.push(opts.eventSubTitle);
  if (opts.seriesTicker) parts.push(opts.seriesTicker);
  parts.push(`${opts.marketCount} market${opts.marketCount === 1 ? "" : "s"}`);
  const interval = describeCandleInterval(opts.querySummary);
  parts.push(interval || "candlesticks");
  const vol = compactNumber(opts.totals.volume);
  if (vol) parts.push(`Volume ${vol}`);
  const vol24 = compactNumber(opts.totals.volume24h);
  if (vol24) parts.push(`24h volume ${vol24}`);
  const oi = compactNumber(opts.totals.openInterest);
  if (oi) parts.push(`Open interest ${oi}`);
  return parts.join(" · ");
}

/**
 * Waterfall: seed the dashboard draft → navigate → plot each market chart and
 * stream cards onto the layout so the user sees the master view populate live.
 *
 * Nothing is written to the database here. Charts live in the in-memory local
 * registry (`local:` ids) and the candle rows stay in workspace sheets; the
 * first real dashboard save materializes both. Markets are ordered by implied
 * chance so the favourite lands in the first cell.
 *
 * @param {{
 *   dataSheets: Record<string, unknown>;
 *   tickerMetaTitle?: string | null;
 *   signal?: AbortSignal;
 *   setChartDashboardDraft: Function;
 *   setActiveChartDashboardId?: Function;
 *   onProgress?: (info: { label: string; progress: number; done?: number; total?: number }) => void;
 * }} ctx
 */
export async function runEventCandlesticksDashboardPowerMove(ctx) {
  const collected = collectEventCandlestickMarketSheets(ctx.dataSheets);
  if (!collected.markets.length) {
    throw new Error("No event candlestick market sheets found. Pull Events Candlesticks first.");
  }

  const eventTitle =
    collected.eventTitle ||
    String(ctx.tickerMetaTitle || "").trim() ||
    collected.eventTicker ||
    "Event candlesticks";
  const eventTicker = collected.eventTicker || "event";
  const seriesTicker = collected.seriesTicker;
  const marketCount = collected.markets.length;

  const labelIndex = indexMarketLabelsFromMetaSheet(
    collected.metaSheetId ? ctx.dataSheets?.[collected.metaSheetId] : null,
  );
  const rankedMarkets = rankMarketsByChance(collected.markets, labelIndex);

  ctx.onProgress?.({
    label: "Preparing dashboard…",
    progress: 4,
    done: 0,
    total: marketCount,
  });

  if (ctx.signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const pageSubheading = buildEventPageSubheading({
    seriesTicker,
    marketCount,
    querySummary: collected.querySummary,
    totals: aggregateEventMetadata(labelIndex),
    eventSubTitle: collected.eventSubTitle,
  });

  const draftSeed = {
    dashboard_name: eventTitle.slice(0, 120),
    seo_title: eventTitle.slice(0, 120),
    tags: ["kalshi-live", "event-candlesticks", eventTicker].filter(Boolean),
    keywords: [eventTicker, seriesTicker].filter(Boolean),
    page_heading: eventTitle.slice(0, 160),
    page_subheading: pageSubheading.slice(0, 240),
    layout: createEmptyDashboardLayout(),
    theme: { background: "none", background_color: "" },
    // Left blank on purpose: autosave stays inert until the user picks a
    // project, which is what turns this preview into a saved dashboard.
    data_set_id: "",
    public_slug: "",
    is_public: false,
    liveEventMeta: {
      metaSheetId: collected.metaSheetId || "",
      seriesTicker,
      eventTicker,
      eventSubTitle: collected.eventSubTitle || "",
      querySummary: collected.querySummary || "",
      marketCount,
    },
    liveEventMetaLocked: false,
  };

  ctx.setActiveChartDashboardId?.(null);
  ctx.setChartDashboardDraft?.(draftSeed);

  await yieldToUi();

  let layout = createEmptyDashboardLayout();

  for (let i = 0; i < marketCount; i++) {
    if (ctx.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const market = rankedMarkets[i];
    const meta = labelIndex.get(market.marketTicker.toUpperCase());
    const title = meta?.title || market.marketTicker;
    const pct = formatChancePct(market.chancePct);
    const caption = buildMarketCardCaption(meta, market.chancePct) || market.marketTicker;
    const chartName = (pct ? `${title} — ${pct}` : title).slice(0, 100);

    ctx.onProgress?.({
      label: `Plotting ${title} (${i + 1}/${marketCount})…`,
      progress: Math.min(96, 8 + Math.round(((i + 0.5) / marketCount) * 88)),
      done: i,
      total: marketCount,
    });

    const snapshot = buildEventCandlestickChartSnapshot({
      sheetId: market.sheetId,
      title: chartName,
    });

    const cardChartId = registerLocalDashboardChart({ chartName, snapshot });

    layout = appendEventCandlestickChartToLayout(layout, {
      chartId: cardChartId,
      h2: chartName,
      caption,
      microtext: [market.marketTicker, meta?.noSubTitle ? `No: ${meta.noSubTitle}` : ""]
        .filter(Boolean)
        .join(" · "),
      liveMetaTicker: market.marketTicker,
      liveMetaSheetId: collected.metaSheetId || "",
    });

    // Stream the card into the live draft so the dashboard paints as we go.
    ctx.setChartDashboardDraft?.((prev) => {
      if (!prev) return prev;
      return { ...prev, layout };
    });

    await yieldToUi();
  }

  await new Promise((resolve) => {
    if (typeof ctx.setChartDashboardDraft !== "function") {
      resolve(null);
      return;
    }
    ctx.setChartDashboardDraft((prev) => {
      const base = prev || draftSeed;
      resolve(null);
      return {
        ...base,
        layout,
        dashboard_name: base.dashboard_name || draftSeed.dashboard_name,
        page_heading: base.page_heading || draftSeed.page_heading,
        page_subheading: base.page_subheading || draftSeed.page_subheading,
        liveEventMeta: base.liveEventMeta || draftSeed.liveEventMeta,
        liveEventMetaLocked: base.liveEventMetaLocked ?? false,
      };
    });
  });

  ctx.onProgress?.({
    label: `Dashboard ready — ${marketCount} charts (not saved yet)`,
    progress: 100,
    done: marketCount,
    total: marketCount,
  });

  return {
    marketCount,
    eventTitle,
    eventTicker,
  };
}
