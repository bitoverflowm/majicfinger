"use client";

import { useMemo } from "react";
import { Liveline } from "liveline";
import { IndicatorChart } from "@/components/spectrumui/charts/indicator-chart";
import { seriesVarsClassName } from "@/components/spectrumui/charts/chart-engine";
import { rangesForCandles } from "@/components/dashboardComposer/tradeMarketCandles";
import { useHtmlDarkClass } from "@/hooks/use-html-dark-class";
import { chainlinkPairTitle, chainlinkStreamSymbol } from "@/lib/chainlinkFeeds";
import { parseVisualNumber } from "@/lib/visualizations/visualTable";
import { cn } from "@/lib/utils";

const LIVELINE_COLOR = "#3b82f6";
const LIVELINE_WINDOWS = [
  { label: "1m", secs: 60 },
  { label: "5m", secs: 300 },
  { label: "15m", secs: 900 },
];

function timeMs(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (Number.isFinite(n) && n > 1e9) return n > 1e12 ? n : n * 1000;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Price points of a pair sheet, oldest first. Run sheets keep records; older sheets only have cells. */
export function chainlinkSheetPoints(sheet) {
  const columns = Array.isArray(sheet?.columns) ? sheet.columns : [];
  const timeIndex = columns.findIndex((column) => column?.id === "time");
  const priceIndex = columns.findIndex((column) => column?.id === "price");
  const points = [];
  if (Array.isArray(sheet?.records) && sheet.records.length) {
    for (const row of sheet.records) {
      const t = timeMs(row?.time);
      const price = Number(row?.price);
      if (t != null && Number.isFinite(price)) points.push({ t, price });
    }
  } else if (timeIndex >= 0 && priceIndex >= 0) {
    const cells = sheet?.cells || {};
    const rows = new Set(Object.keys(cells).map((key) => Number(String(key).split(",")[1])).filter(Number.isFinite));
    for (const row of rows) {
      const t = timeMs(cells[`${timeIndex},${row}`]);
      const price = parseVisualNumber(cells[`${priceIndex},${row}`]);
      if (t != null && price != null) points.push({ t, price });
    }
  }
  points.sort((a, b) => a.t - b.t);
  return points.filter((point, index) => !index || point.t !== points[index - 1].t);
}

function formatPrice(value) {
  if (!Number.isFinite(value)) return "—";
  const digits = Math.abs(value) < 1 ? 5 : Math.abs(value) < 100 ? 4 : 2;
  return value.toLocaleString("en", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/**
 * Liveline while the feed streams. A stopped feed shows every price the sheet has collected,
 * not Liveline's paused view.
 */
export function ChainlinkLivelineChart({ sheet, live = false }) {
  const dark = useHtmlDarkClass();
  const points = useMemo(() => chainlinkSheetPoints(sheet), [sheet]);
  const symbol = chainlinkStreamSymbol(sheet);
  const pair = symbol ? chainlinkPairTitle(symbol) : "";
  const liveData = useMemo(() => (live ? points.map((point) => ({ time: point.t / 1000, value: point.price })) : []), [live, points]);
  const ranges = useMemo(() => rangesForCandles(points), [points]);

  if (live) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-2 pb-3">
        <Liveline
          data={liveData}
          value={liveData[liveData.length - 1]?.value ?? 0}
          theme={dark ? "dark" : "light"}
          color={LIVELINE_COLOR}
          momentum
          showValue
          valueMomentumColor
          windows={LIVELINE_WINDOWS}
          windowStyle="rounded"
          exaggerate
          scrub
          degen
          badge
          badgeVariant="default"
          loading={!liveData.length}
          emptyText="Waiting for prices"
          formatValue={formatPrice}
          className="min-h-0 min-w-0 flex-1 basis-0"
          style={{ backgroundColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 min-w-0 flex-1 flex-col", seriesVarsClassName)}>
      <IndicatorChart
        points={points}
        symbol={pair}
        name={String(sheet?.title || pair || "Price").trim()}
        ranges={ranges}
        defaultRange="All"
        status={points.length ? "ready" : "empty"}
        emptyLabel="No prices yet. Hit play to start your feed."
        units="number"
        curve="linear"
      />
    </div>
  );
}
