/**
 * One-click "plot all event candlesticks on dashboard" power move.
 *
 * Design goals:
 * - O(n) sheet/market indexing (no nested scans per chart)
 * - Waterfall chart creation so the UI can paint between cards
 * - 3-across (colSpan 4) master grid without cloning candle row payloads
 * - Charts reference sheet ids in snapshots — data stays in workspace sheets
 */

import {
  createEmptyDashboardLayout,
  DEFAULT_CHART_CARD_ROW_SPAN,
} from "@/lib/dashboardLayoutDefaults";
import {
  mergeCreatedChartDashboardDraft,
  persistChartDashboardDraft,
} from "@/lib/persistChartDashboardDraft";
import {
  isDevLocalDashboardChartsEnabled,
  registerLocalDashboardChart,
} from "@/lib/localDashboardCharts";

/** Three charts per row on the 12-col dashboard grid. */
export const EVENT_CANDLES_DASH_COL_SPAN = 4;

/** Slightly shorter than default so a 3×N master view stays scannable. */
export const EVENT_CANDLES_DASH_ROW_SPAN = Math.min(2, DEFAULT_CHART_CARD_ROW_SPAN);

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
  };
}

/**
 * Index market display labels from the metadata sheet in one pass — O(m).
 * Prefers yes_sub_title, then ticker.
 *
 * @param {Record<string, unknown> | null | undefined} metaSheet
 * @returns {Map<string, { title: string; caption: string }>}
 */
export function indexMarketLabelsFromMetaSheet(metaSheet) {
  /** @type {Map<string, { title: string; caption: string }>} */
  const map = new Map();
  const rows = Array.isArray(metaSheet?.data) ? metaSheet.data : [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const ticker = String(row.ticker || "").trim();
    if (!ticker) continue;
    const yes = String(row.yes_sub_title || "").trim();
    const no = String(row.no_sub_title || "").trim();
    const title = yes || ticker;
    const caption = [ticker, no && no !== yes ? `No: ${no}` : ""].filter(Boolean).join(" · ");
    map.set(ticker.toUpperCase(), { title, caption });
  }
  return map;
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
    titleHidden: false,
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
    ...overrides,
  };
}

/**
 * Append one chart card into a 3-across (colSpan 4) cards layout. Mutates a
 * shallow-copied layout tree; returns a new layout object. O(1) amortized per
 * append (only touches the last cards row).
 *
 * @param {{ version?: number; rows?: object[] } | null | undefined} layout
 * @param {{ chartId: string; h2?: string; caption?: string; microtext?: string }} card
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

  const nextCol = emptyDashboardChartColumn({
    chart_id: card.chartId,
    h2: String(card.h2 || "").slice(0, 160),
    caption: String(card.caption || "").slice(0, 240),
    microtext: String(card.microtext || "").slice(0, 160),
    colSpan,
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
 * Ensure a project exists to hang charts / dashboard under. Prefer the loaded
 * project; otherwise create a lightweight named DataSet (no candle row upload).
 *
 * @param {{
 *   dataSetId?: string | null;
 *   userId: string;
 *   projectName: string;
 * }} opts
 * @returns {Promise<{ dataSetId: string; created?: object }>}
 */
export async function ensurePowerMoveDataSetId(opts) {
  const existing = String(opts.dataSetId || "").trim();
  if (existing) return { dataSetId: existing };

  const name = String(opts.projectName || "Event candlesticks").trim().slice(0, 120);
  const res = await fetch("/api/dataSets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      data_set_name: name,
      data: [],
      data_sheets: {},
      created_date: new Date(),
      last_saved_date: new Date(),
      labels: ["power-move", "kalshi-live", "event-candlesticks"],
      source: "kalshi-live-power-move",
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!json?.success || !json?.data?._id) {
    throw new Error(json?.message || "Could not create a project for this dashboard.");
  }
  return { dataSetId: String(json.data._id), created: json.data };
}

/**
 * Persist one candlestick chart document. Snapshot only — no row payload.
 *
 * @param {{
 *   chartName: string;
 *   snapshot: object;
 *   userId: string;
 *   dataSetId: string;
 * }} opts
 */
export async function createEventCandlestickChart(opts) {
  const res = await fetch("/api/charts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      chart_name: opts.chartName,
      chart_properties: [{ title: opts.chartName, rechartsBuilder: opts.snapshot }],
      created_date: new Date(),
      last_saved_date: new Date(),
      labels: ["power-move", "kalshi-live", "event-candlesticks", "candlestick"],
      user_id: opts.userId,
      data_set_id: opts.dataSetId,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!json?.success || !json?.data?._id) {
    throw new Error(json?.message || "Failed to save candlestick chart.");
  }
  return json.data;
}

/**
 * Waterfall: create dashboard → navigate → plot each market chart and stream
 * cards onto the layout so the user sees the master view populate live.
 *
 * `localOnly` (dev builds only): no sign-in and zero DB writes — charts are
 * registered in the in-memory local registry (`local:` ids) and the dashboard
 * draft stays a client-side draft that is never persisted.
 *
 * @param {{
 *   dataSheets: Record<string, unknown>;
 *   userId: string;
 *   dataSetId?: string | null;
 *   tickerMetaTitle?: string | null;
 *   localOnly?: boolean;
 *   signal?: AbortSignal;
 *   setChartDashboardDraft: Function;
 *   setActiveChartDashboardId?: Function;
 *   setChartSheets?: Function;
 *   setSavedCharts?: Function;
 *   setSavedDataSets?: Function;
 *   setLoadedDataMeta?: Function;
 *   setLoadedDataId?: Function;
 *   onProgress?: (info: { label: string; progress: number; done?: number; total?: number }) => void;
 * }} ctx
 */
export async function runEventCandlesticksDashboardPowerMove(ctx) {
  // Hard gate: local mode never runs in production builds.
  const localOnly = !!ctx.localOnly && isDevLocalDashboardChartsEnabled();
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

  ctx.onProgress?.({
    label: "Preparing dashboard…",
    progress: 4,
    done: 0,
    total: marketCount,
  });

  /** @type {string} */
  let dataSetId = "";
  if (localOnly) {
    // Dev local mode: no project, nothing persisted.
    dataSetId = "";
  } else {
    const ensured = await ensurePowerMoveDataSetId({
      dataSetId: ctx.dataSetId,
      userId: ctx.userId,
      projectName: eventTitle,
    });
    dataSetId = ensured.dataSetId;
    const createdProject = ensured.created;

    if (createdProject) {
      ctx.setSavedDataSets?.((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        if (list.some((d) => String(d?._id) === dataSetId)) return list;
        return [createdProject, ...list];
      });
      ctx.setLoadedDataMeta?.(createdProject);
      ctx.setLoadedDataId?.(dataSetId);
    }
  }

  if (ctx.signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const pageSubheading = [
    seriesTicker || null,
    `${marketCount} market${marketCount === 1 ? "" : "s"}`,
    "candlesticks",
  ]
    .filter(Boolean)
    .join(" · ");

  const draftSeed = {
    dashboard_name: eventTitle.slice(0, 120),
    seo_title: eventTitle.slice(0, 120),
    tags: ["kalshi-live", "event-candlesticks", eventTicker].filter(Boolean),
    keywords: [eventTicker, seriesTicker].filter(Boolean),
    page_heading: eventTitle.slice(0, 160),
    page_subheading: pageSubheading.slice(0, 240),
    layout: createEmptyDashboardLayout(),
    theme: { background: "none", background_color: "" },
    data_set_id: dataSetId,
    public_slug: "",
    is_public: false,
  };

  ctx.setActiveChartDashboardId?.(null);
  ctx.setChartDashboardDraft?.(draftSeed);

  if (!localOnly) {
    // Persist early so autosave has an _id; layout grows via waterfall updates.
    const initialPersist = await persistChartDashboardDraft({
      draft: draftSeed,
      userId: ctx.userId,
    });
    if (!initialPersist.ok) {
      throw new Error(initialPersist.message || "Could not create dashboard.");
    }
    if (initialPersist.created) {
      // Stamp `_id` on the draft for subsequent PUTs, but do NOT set
      // `activeChartDashboardId` yet — that triggers a full dashboard/project
      // reload which would clobber the live waterfall layout and workspace sheets.
      ctx.setChartDashboardDraft?.((prev) =>
        mergeCreatedChartDashboardDraft(prev || draftSeed, initialPersist.created),
      );
    }
  }

  await yieldToUi();

  let layout = createEmptyDashboardLayout();
  /** @type {object[]} */
  const createdCharts = [];

  for (let i = 0; i < marketCount; i++) {
    if (ctx.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const market = collected.markets[i];
    const labels = labelIndex.get(market.marketTicker.toUpperCase());
    const title = labels?.title || market.marketTicker;
    const caption = labels?.caption || market.marketTicker;
    const chartName = `${title}`.slice(0, 100);

    ctx.onProgress?.({
      label: `Plotting ${title} (${i + 1}/${marketCount})…`,
      progress: Math.min(96, 8 + Math.round(((i + 0.5) / marketCount) * 88)),
      done: i,
      total: marketCount,
    });

    const snapshot = buildEventCandlestickChartSnapshot({
      sheetId: market.sheetId,
      title,
    });

    /** @type {string} */
    let cardChartId;
    if (localOnly) {
      // In-memory only — IsolatedChartPreview resolves `local:` ids from the registry.
      cardChartId = registerLocalDashboardChart({ chartName, snapshot });
      ctx.setChartSheets?.((prev) => {
        const sheets = { ...(prev || {}) };
        let n = Object.keys(sheets).length + 1;
        let localId = `chart-${n}`;
        while (sheets[localId]) {
          n += 1;
          localId = `chart-${n}`;
        }
        // chartMeta stays null so a later Save Project creates real charts
        // instead of PUTting to a non-Mongo `local:` id.
        sheets[localId] = {
          name: chartName,
          snapshot,
          chartMeta: null,
          userCreated: true,
        };
        return sheets;
      });
    } else {
      const saved = await createEventCandlestickChart({
        chartName,
        snapshot,
        userId: ctx.userId,
        dataSetId,
      });
      createdCharts.push(saved);
      cardChartId = String(saved._id);

      // Local workspace chart tab (optional) — keep snapshots for Save Project.
      ctx.setChartSheets?.((prev) => {
        const sheets = { ...(prev || {}) };
        let n = Object.keys(sheets).length + 1;
        let localId = `chart-${n}`;
        while (sheets[localId]) {
          n += 1;
          localId = `chart-${n}`;
        }
        sheets[localId] = {
          name: chartName,
          snapshot,
          chartMeta: saved,
          userCreated: true,
        };
        return sheets;
      });
    }

    layout = appendEventCandlestickChartToLayout(layout, {
      chartId: cardChartId,
      h2: title,
      caption,
      microtext: market.marketTicker,
    });

    // Stream the card into the live draft so the dashboard paints as we go.
    ctx.setChartDashboardDraft?.((prev) => {
      if (!prev) return prev;
      return { ...prev, layout };
    });

    await yieldToUi();
  }

  if (createdCharts.length) {
    ctx.setSavedCharts?.((prev) => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const seen = new Set(list.map((c) => String(c?._id || "")));
      for (const c of createdCharts) {
        const id = String(c?._id || "");
        if (!id || seen.has(id)) continue;
        seen.add(id);
        list.unshift({
          _id: c._id,
          chart_name: c.chart_name,
          last_saved_date: c.last_saved_date,
          labels: c.labels,
          user_id: c.user_id,
          data_set_id: c.data_set_id,
        });
      }
      return list;
    });
  }

  ctx.onProgress?.({
    label: localOnly ? "Finishing dashboard (dev, not saved)…" : "Saving dashboard…",
    progress: 98,
    done: marketCount,
    total: marketCount,
  });

  /** @type {object | null} */
  let draftForPersist = null;
  await new Promise((resolve) => {
    if (typeof ctx.setChartDashboardDraft !== "function") {
      resolve(null);
      return;
    }
    ctx.setChartDashboardDraft((prev) => {
      const base = prev || draftSeed;
      const next = {
        ...base,
        layout,
        dashboard_name: base.dashboard_name || draftSeed.dashboard_name,
        page_heading: base.page_heading || draftSeed.page_heading,
        page_subheading: base.page_subheading || draftSeed.page_subheading,
        data_set_id: base.data_set_id || dataSetId,
      };
      draftForPersist = next;
      resolve(null);
      return next;
    });
  });

  if (!localOnly && draftForPersist) {
    const result = await persistChartDashboardDraft({
      draft: draftForPersist,
      userId: ctx.userId,
    });
    if (result.ok && result.created) {
      ctx.setChartDashboardDraft?.((p) =>
        mergeCreatedChartDashboardDraft(p || draftForPersist, result.created),
      );
    }
    // Activate only after the complete layout is on the server. Skip
    // `setActiveChartDashboardId` so DashboardComposerPage does not re-fetch
    // and call `loadFullProjectFromApi` (which would replace live candle sheets).
    // The draft already carries `_id` for autosave / further edits.
  }

  ctx.onProgress?.({
    label: localOnly
      ? `Dashboard ready — ${marketCount} charts (dev preview, not saved)`
      : `Dashboard ready — ${marketCount} charts`,
    progress: 100,
    done: marketCount,
    total: marketCount,
  });

  return {
    marketCount,
    eventTitle,
    eventTicker,
    dataSetId,
    localOnly,
  };
}
