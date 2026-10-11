"use client";

import { useMemo } from "react";

import { PortfolioChart } from "@/components/spectrumui/charts/portfolio-chart";
import { pnlPortfolioPoints, pnlPortfolioRanges } from "@/lib/visualizations/pnlPortfolio";

export function PnlPortfolioChart({ sheet }) {
  const data = useMemo(() => pnlPortfolioPoints(sheet), [sheet]);
  const ranges = useMemo(() => pnlPortfolioRanges(data), [data]);
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-auto px-3 pb-2">
      <PortfolioChart
        data={data}
        label="PnL"
        ranges={ranges}
        defaultRange="ALL"
        showDrawdown
        height={340}
        status={data.length ? "ready" : "empty"}
      />
    </div>
  );
}
