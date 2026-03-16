"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Liveline } from "liveline";

const SHEET_COLORS = [
  "#3b82f6", // shadcn blue
  "#22c55e", // green
  "#a855f7", // purple
  "#f97316", // orange
];

const LIVELINE_WINDOWS = [
  { label: "1m", secs: 60 },
  { label: "5m", secs: 300 },
  { label: "15m", secs: 900 },
];

function toTimeSec(row) {
  const t = row?.time ?? row?.timestamp;
  if (t == null) return null;
  if (typeof t === "number") return t > 1e12 ? t / 1000 : t;
  const parsed = Date.parse(String(t));
  return Number.isFinite(parsed) ? parsed / 1000 : null;
}

function toValue(row) {
  const v = row?.value ?? row?.price;
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function ChainlinkLiveChart({ dataSheets = {}, streamsBySheetId = {} }) {
  const chainlinkSheets = useMemo(() => {
    return Object.entries(streamsBySheetId)
      .filter(([, s]) => s?.type === "chainlink")
      .map(([sheetId]) => sheetId)
      .sort();
  }, [streamsBySheetId]);

  if (!chainlinkSheets.length) {
    return null;
  }

  const chartData = useMemo(() => {
    const timeToRow = {};
    for (const sheetId of chainlinkSheets) {
      const rows = dataSheets[sheetId]?.data ?? [];
      for (const row of rows) {
        const t = toTimeSec(row);
        const v = toValue(row);
        if (t == null || v == null) continue;
        if (!timeToRow[t]) timeToRow[t] = { time: t };
        timeToRow[t][sheetId] = v;
      }
    }
    return Object.values(timeToRow).sort((a, b) => a.time - b.time);
  }, [dataSheets, chainlinkSheets]);

  const config = useMemo(() => {
    const c = {};
    chainlinkSheets.forEach((sheetId, i) => {
      const name = dataSheets[sheetId]?.name ?? sheetId;
      c[sheetId] = { label: name, color: SHEET_COLORS[i % SHEET_COLORS.length] };
    });
    return c;
  }, [chainlinkSheets, dataSheets]);

  // Single-stream Liveline mode
  if (chainlinkSheets.length === 1) {
    const sheetId = chainlinkSheets[0];
    const stream = streamsBySheetId[sheetId] || {};
    const rawRows = (dataSheets[sheetId]?.data ?? [])
      .map((row) => ({ time: toTimeSec(row), value: toValue(row) }))
      .filter((r) => r.time != null && r.value != null)
      .sort((a, b) => a.time - b.time);
    const hasData = rawRows.length > 0;
    const loading = !hasData && (stream.connecting || (stream.isRunning && !stream.hasReceivedFirstData));
    const paused = !!stream.isPaused && hasData && !loading;
    const empty = !hasData && !loading;
    return (
      <div className="h-[520px] pb-10 mb-20 mt-4 rounded-lg border border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">Price vs time (live)</p>
          {paused && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
              Feed paused
            </span>
          )}
        </div>
        <div style={{ height: 360, minHeight: 360 }} className=" w-full">
          {loading && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2">
              <div className="h-0.5 w-3/4 animate-pulse rounded-full bg-slate-300/70 dark:bg-slate-700/70" />
              <p className="text-[11px] text-muted-foreground">Waiting for live data…</p>
            </div>
          )}
          {empty && !loading && (
            <div className="flex h-full w-full flex-col items-center justify-center">
              <p className="text-[11px] text-muted-foreground">waiting for data to load in</p>
            </div>
          )}
          {hasData && (
            <Liveline
              data={rawRows}
              value={rawRows[rawRows.length - 1]?.value ?? 0}
              theme="light"
              color={SHEET_COLORS[0]}
              momentum={true}
              showValue={true}
              valueMomentumColor={true}
              windows={LIVELINE_WINDOWS}
              windowStyle="rounded"
              exaggerate={true}
              scrub={true}
              degen={true}
              badge={true}
              badgeVariant="default"
            />
          )}
        </div>
      </div>
    );
  }

  // Multi-stream Recharts mode
  const anyData = chartData.length > 0;
  const anyStream = chainlinkSheets.some((id) => streamsBySheetId[id]);
  const anyConnecting = chainlinkSheets.some((id) => streamsBySheetId[id]?.connecting);
  const anyRunning = chainlinkSheets.some(
    (id) => streamsBySheetId[id]?.isRunning && !streamsBySheetId[id]?.hasReceivedFirstData
  );
  const loading = !anyData && (anyConnecting || anyRunning);
  const anyPaused = chainlinkSheets.some((id) => streamsBySheetId[id]?.isPaused);
  const paused = anyPaused && anyData && !loading;
  const empty = !anyData && !loading && anyStream;

  return (
    <div className="overflow-visible rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Price vs time (live)</p>
        {paused && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
            Feed paused
          </span>
        )}
      </div>
      <ChartContainer config={config} className="!aspect-auto h-[400px] min-h-[360px] w-full overflow-visible">
        {loading && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <div className="h-0.5 w-3/4 animate-pulse rounded-full bg-slate-300/70 dark:bg-slate-700/70" />
            <p className="text-[11px] text-muted-foreground">Waiting for live data…</p>
          </div>
        )}
        {empty && !loading && (
          <div className="flex h-full w-full flex-col items-center justify-center">
            <p className="text-[11px] text-muted-foreground">waiting for data to load in</p>
          </div>
        )}
        {anyData && (
          <LineChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) => new Date(t * 1000).toLocaleTimeString()}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            type="number"
            domain={["auto", "auto"]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
            width={48}
          />
          <ChartTooltip
            content={<ChartTooltipContent indicator="line" />}
            labelFormatter={(t) => new Date(Number(t) * 1000).toLocaleString()}
          />
          {chainlinkSheets.map((sheetId, i) => (
            <Line
              key={sheetId}
              dataKey={sheetId}
              type="monotone"
              stroke={SHEET_COLORS[i % SHEET_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
          <ChartLegend content={<ChartLegendContent />} />
        </LineChart>
        )}
      </ChartContainer>
    </div>
  );
}
