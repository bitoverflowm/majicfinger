"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { PortfolioChart } from "@/components/spectrumui/charts/portfolio-chart";
import { pnlPortfolioPoints, pnlPortfolioRanges } from "@/lib/visualizations/pnlPortfolio";

export function PnlPortfolioChart({ sheet }) {
  const data = useMemo(() => pnlPortfolioPoints(sheet), [sheet]);
  const ranges = useMemo(() => pnlPortfolioRanges(data), [data]);
  const frameRef = useRef(null);
  const [plotHeight, setPlotHeight] = useState(340);
  useEffect(() => {
    const node = frameRef.current;
    if (!node) return undefined;
    const measure = () => {
      const next = Math.max(340, Math.floor(node.getBoundingClientRect().height) - 128);
      setPlotHeight((prev) => (prev === next ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={frameRef} className="flex h-full min-h-0 flex-1 flex-col overflow-auto px-3 pb-2">
      <PortfolioChart
        data={data}
        label="PnL"
        ranges={ranges}
        defaultRange="ALL"
        showDrawdown
        height={plotHeight}
        status={data.length ? "ready" : "empty"}
      />
    </div>
  );
}
