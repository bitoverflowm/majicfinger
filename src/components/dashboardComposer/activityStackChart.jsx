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

function ActivityTooltip(props) {
  const payload = (props.payload || []).filter((item) => Number(item?.value) > 0);
  if (!payload.length) return null;
  return <ChartTooltipContent {...props} payload={payload} />;
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
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col px-2 pb-2">
      <ChartContainer config={config} className="aspect-auto h-full min-h-[200px] w-full">
        <BarChart accessibilityLayer data={model.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} tickMargin={8} axisLine={false} interval={0} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
          <ChartTooltip content={<ActivityTooltip />} />
          <ChartLegend content={<ChartLegendContent />} />
          {model.series.map((series, index) => (
            <Bar
              key={series.id}
              dataKey={series.id}
              stackId="activity"
              fill={`var(--color-${series.id})`}
              radius={index === 0 && last === 0 ? [4, 4, 4, 4] : index === 0 ? [0, 0, 4, 4] : index === last ? [4, 4, 0, 0] : 0}
            />
          ))}
        </BarChart>
      </ChartContainer>
      <p className="px-1 pt-1 text-[11px] text-muted-foreground">
        Actions by type, split into buy and sell.
      </p>
    </div>
  );
}
