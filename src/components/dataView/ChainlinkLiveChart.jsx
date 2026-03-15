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

  const chartData = useMemo(() => {
    if (!chainlinkSheets.length) return [];
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

  if (chainlinkSheets.length === 0) return null;

  if (chainlinkSheets.length === 1) {
    const sheetId = chainlinkSheets[0];
    const rows = (dataSheets[sheetId]?.data ?? [])
      .map((row) => ({ time: toTimeSec(row), value: toValue(row) }))
      .filter((r) => r.time != null && r.value != null)
      .sort((a, b) => a.time - b.time);
    if (rows.length === 0) return null;
    return (
      <div className="mt-4 overflow-visible rounded-lg border border-border bg-card p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Price vs time (live)</p>
        <div style={{ height: 360, minHeight: 360 }} className="w-full overflow-visible">
          <Liveline
            data={rows}
            value={rows[rows.length - 1]?.value ?? 0}
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
        </div>
      </div>
    );
  }

  if (chartData.length === 0) return null;

  return (
    <div className="mt-4 overflow-visible rounded-lg border border-border bg-card p-3 pb-10">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Price vs time (live)</p>
      <ChartContainer config={config} className="!aspect-auto h-[360px] min-h-[360px] w-full overflow-visible">
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
      </ChartContainer>
    </div>
  );
}
