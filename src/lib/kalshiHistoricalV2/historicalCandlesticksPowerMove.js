/**
 * One-click "plot all historical candlesticks on dashboard" power move.
 *
 * Collects Kalshi Historical v2 market candlestick sheets (one per ticker) and
 * streams candlestick charts onto an unsaved dashboard draft — same UX as the
 * Live event-candlesticks power move, without event metadata / chance ranking.
 */

import {
  appendEventCandlestickChartToLayout,
  buildEventCandlestickChartSnapshot,
  describeCandleInterval,
  yieldToUi,
} from "@/lib/kalshiLive/eventCandlesticksPowerMove";
import { createEmptyDashboardLayout } from "@/lib/dashboardLayoutDefaults";
import { registerLocalDashboardChart } from "@/lib/localDashboardCharts";

/**
 * @param {Record<string, unknown> | null | undefined} dataSheets
 * @returns {{
 *   markets: { sheetId: string; marketTicker: string; rowCount: number }[];
 *   querySummary: string;
 * }}
 */
export function collectHistoricalV2CandlestickMarketSheets(dataSheets) {
  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
  /** @type {{ sheetId: string; marketTicker: string; rowCount: number; order: number }[]} */
  const markets = [];
  let querySummary = "";
  let order = 0;

  for (const [sheetId, sheet] of Object.entries(sheets)) {
    const prov = sheet?.provenance;
    if (!prov || typeof prov !== "object") continue;
    if (String(prov.source || "") !== "kalshi-historical-v2") continue;
    if (String(prov.endpoint || "") !== "candlesticks") continue;

    if (!querySummary && prov.querySummary) {
      querySummary = String(prov.querySummary).trim();
    }

    const kind = String(prov.sheetKind || "market_candlesticks");
    if (kind && kind !== "market_candlesticks") continue;

    const marketTicker =
      String(prov.marketTicker || prov.marketTickers || sheet?.name || "")
        .trim()
        .split(/[\s,]+/)[0] || sheetId;
    const rowCount = Array.isArray(sheet?.data) ? sheet.data.length : 0;
    if (rowCount <= 0) continue;

    markets.push({ sheetId, marketTicker, rowCount, order: order++ });
  }

  markets.sort((a, b) => a.order - b.order);

  return {
    markets: markets.map(({ sheetId, marketTicker, rowCount }) => ({
      sheetId,
      marketTicker,
      rowCount,
    })),
    querySummary,
  };
}

/**
 * @param {{
 *   dataSheets: Record<string, unknown>;
 *   tickerMeta?: Record<string, string> | null;
 *   signal?: AbortSignal;
 *   setChartDashboardDraft: Function;
 *   setActiveChartDashboardId?: Function;
 *   onProgress?: (info: { label: string; progress: number; done?: number; total?: number }) => void;
 * }} ctx
 */
export async function runHistoricalV2CandlesticksDashboardPowerMove(ctx) {
  const collected = collectHistoricalV2CandlestickMarketSheets(ctx.dataSheets);
  if (!collected.markets.length) {
    throw new Error(
      "No historical candlestick sheets found. Pull Kalshi Historical v2 Candlesticks first.",
    );
  }

  const marketCount = collected.markets.length;
  const tickerMeta =
    ctx.tickerMeta && typeof ctx.tickerMeta === "object" ? ctx.tickerMeta : {};
  const interval = describeCandleInterval(collected.querySummary);
  const pageTitle = "Historical candlesticks";
  const pageSubheading = [
    `${marketCount} market${marketCount === 1 ? "" : "s"}`,
    interval || "candlesticks",
    "Kalshi Historical v2",
  ]
    .filter(Boolean)
    .join(" · ");

  ctx.onProgress?.({
    label: "Preparing dashboard…",
    progress: 4,
    done: 0,
    total: marketCount,
  });

  if (ctx.signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const draftSeed = {
    dashboard_name: pageTitle.slice(0, 120),
    seo_title: pageTitle.slice(0, 120),
    tags: ["kalshi-historical-v2", "candlesticks"],
    keywords: collected.markets.map((m) => m.marketTicker).filter(Boolean).slice(0, 20),
    page_heading: pageTitle.slice(0, 160),
    page_subheading: pageSubheading.slice(0, 240),
    layout: createEmptyDashboardLayout(),
    theme: { background: "none", background_color: "" },
    data_set_id: "",
    public_slug: "",
    is_public: false,
  };

  ctx.setActiveChartDashboardId?.(null);
  ctx.setChartDashboardDraft?.(draftSeed);

  await yieldToUi();

  let layout = createEmptyDashboardLayout();

  for (let i = 0; i < marketCount; i++) {
    if (ctx.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const market = collected.markets[i];
    const titleRaw =
      tickerMeta[market.marketTicker] || tickerMeta[market.marketTicker.toUpperCase()] || "";
    const metaTitle = String(
      typeof titleRaw === "string"
        ? titleRaw
        : titleRaw && typeof titleRaw === "object"
          ? titleRaw.title || ""
          : "",
    ).trim();
    const title = metaTitle || market.marketTicker;
    const chartName = title.slice(0, 100);

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
      caption: market.marketTicker,
      microtext: [interval, `${market.rowCount.toLocaleString()} candles`]
        .filter(Boolean)
        .join(" · "),
    });

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
    title: pageTitle,
  };
}
