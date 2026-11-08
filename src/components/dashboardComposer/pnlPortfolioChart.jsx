"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { PortfolioChart } from "@/components/spectrumui/charts/portfolio-chart";
import { pnlPortfolioPoints, pnlPortfolioRanges } from "@/lib/visualizations/pnlPortfolio";

const MIN_PLOT_HEIGHT = 200;

export function PnlPortfolioChart({ sheet }) {
  const data = useMemo(() => pnlPortfolioPoints(sheet), [sheet]);
  const ranges = useMemo(() => pnlPortfolioRanges(data), [data]);
  const frameRef = useRef(null);
  const [plotHeight, setPlotHeight] = useState(340);
  const plotHeightRef = useRef(plotHeight);
  plotHeightRef.current = plotHeight;
  useEffect(() => {
    const node = frameRef.current;
    if (!node) return undefined;
    // The header above the plot wraps with width, so measure it rather than assume its height.
    const measure = () => {
      const chart = node.firstElementChild;
      const style = getComputedStyle(node);
      const room = node.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const chrome = chart ? chart.offsetHeight - plotHeightRef.current : 128;
      const next = Math.max(MIN_PLOT_HEIGHT, Math.floor(room - chrome));
      setPlotHeight((prev) => (prev === next ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
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
