"use client";

import { useMemo } from "react";

import { CalendarHeatmap, LYCHEE_RED } from "@/components/spectrumui/charts/calendar-heatmap";
import { activityChartRows, activityDailyCounts } from "@/lib/visualizations/activityCharts";

export function ActivityCalendarChart({ sheet }) {
  const days = useMemo(() => activityDailyCounts(activityChartRows(sheet)), [sheet]);
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-auto px-3 pb-2">
      <CalendarHeatmap
        data={days}
        label="actions"
        hue={LYCHEE_RED}
        status={days.length ? "ready" : "empty"}
      />
    </div>
  );
}
