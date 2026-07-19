"use client";

import { useEffect, useRef } from "react";
import { CandlestickSeries, ColorType, createChart } from "lightweight-charts";

import { cn } from "@/lib/utils";

/**
 * Lightweight Charts candlestick pane (open-source library; no on-chart TV logo).
 *
 * @param {{
 *   data: { time: number; open: number; high: number; low: number; close: number }[];
 *   dark?: boolean;
 *   className?: string;
 * }} props
 */
export function CandlestickChartView({ data, dark = false, className }) {
  const containerRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const chartRef = useRef(/** @type {import("lightweight-charts").IChartApi | null} */ (null));
  const seriesRef = useRef(/** @type {import("lightweight-charts").ISeriesApi<"Candlestick"> | null} */ (null));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: dark ? "#020617" : "#ffffff" },
        textColor: dark ? "#e2e8f0" : "#0f172a",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: dark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.25)" },
        horzLines: { color: dark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.25)" },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: true,
      },
      crosshair: {
        mode: 0,
      },
    });

    // Belt-and-suspenders: some Fast Refresh paths keep a prior chart instance.
    chart.applyOptions({ layout: { attributionLogo: false } });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const hideLogo = () => {
      el.querySelectorAll("a#tv-attr-logo").forEach((node) => {
        node.setAttribute("hidden", "true");
        /** @type {HTMLElement} */ (node).style.display = "none";
      });
    };
    hideLogo();
    const mo =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => hideLogo())
        : null;
    mo?.observe(el, { childList: true, subtree: true });

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
          })
        : null;
    ro?.observe(el);

    return () => {
      mo?.disconnect();
      ro?.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [dark]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    const list = Array.isArray(data) ? data : [];
    series.setData(list);
    if (list.length) chart.timeScale().fitContent();
  }, [data]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full min-h-[220px] w-full [&_a#tv-attr-logo]:hidden",
        className,
      )}
      role="img"
      aria-label="Candlestick chart"
    />
  );
}
