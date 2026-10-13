"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { activityChartRows, activityStackModel } from "@/lib/visualizations/activityCharts";

function formatUsd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  const body = abs >= 1000
    ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(abs)
    : abs >= 100
      ? String(Math.round(abs))
      : String(Math.round(abs * 100) / 100);
  return n < 0 ? `−$${body}` : `$${body}`;
}

function ActivityTooltip(props) {
  const payload = (props.payload || []).filter((item) => Number(item?.value) > 0);
  if (!payload.length) return null;
  return (
    <ChartTooltipContent
      {...props}
      payload={payload}
      formatter={(value, name, item) => (
        <>
          <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: item?.color || item?.fill }} />
          <div className="flex min-w-[8rem] flex-1 items-center justify-between gap-3">
            <span className="text-slate-500 dark:text-slate-400">{name}</span>
            <span className="font-mono font-medium tabular-nums text-slate-950 dark:text-slate-50">{formatUsd(value)}</span>
          </div>
        </>
      )}
    />
  );
}

export function ActivityStackChart({ sheet }) {
  const model = useMemo(() => activityStackModel(activityChartRows(sheet)), [sheet]);
  const config = useMemo(() => {
    const next = {};
    for (const series of model.series) {
      next[series.id] = { label: series.label, color: series.color };
    }
    return next;
  }, [model.series]);

  if (!model.data.length) {
    return (
      <p className="px-3 text-[12px] text-muted-foreground">This activity sheet has no dated actions to chart yet.</p>
    );
  }

  const last = model.series.length - 1;
  const firstDay = model.data[0]?.t || 0;
  const lastDay = model.data[model.data.length - 1]?.t || firstDay;
  const dayPad = 2 * 86_400_000;
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col px-2 pb-2">
      <ChartContainer config={config} className="aspect-auto h-full min-h-[200px] w-full">
        <BarChart accessibilityLayer data={model.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[firstDay - dayPad, lastDay + dayPad]}
            tickFormatter={(value) =>
              new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(value)
            }
            tickLine={false}
            tickMargin={8}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={formatUsd}
          />
          <ChartTooltip content={<ActivityTooltip />} />
          <ChartLegend content={<ChartLegendContent />} />
          {model.series.map((series, index) => (
            <Bar
              key={series.id}
              dataKey={series.id}
              name={series.label}
              stackId="activity"
              barSize={18}
              fill={`var(--color-${series.id})`}
              radius={index === 0 && last === 0 ? [4, 4, 4, 4] : index === 0 ? [0, 0, 4, 4] : index === last ? [4, 4, 0, 0] : 0}
            />
          ))}
        </BarChart>
      </ChartContainer>
      <p className="px-1 pt-1 text-[11px] text-muted-foreground">
        USDC per day, stacked by activity type and by buy or sell.
      </p>
    </div>
  );
}
