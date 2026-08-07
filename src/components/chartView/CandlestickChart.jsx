"use client";

import { useEffect, useRef } from "react";
import { CandlestickSeries, ColorType, createChart } from "lightweight-charts";

import { cn } from "@/lib/utils";

/**
 * @param {boolean} dark
 */
function themeOptions(dark) {
  return {
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
  };
}

/**
 * True when `next` looks like a live refresh of `prev` (same series, bars appended/updated)
 * rather than a different sheet / full replace — used to keep zoom/pan.
 *
 * @param {{ time: number }[] | null | undefined} prev
 * @param {{ time: number }[] | null | undefined} next
 */
function isSameSeriesLiveUpdate(prev, next) {
  if (!Array.isArray(prev) || !Array.isArray(next) || !prev.length || !next.length) return false;
  if (prev[0]?.time !== next[0]?.time) return false;
  const prevLast = prev[prev.length - 1]?.time;
  if (prevLast == null) return false;
  if (next.some((b) => b?.time === prevLast)) return true;
  const nextLast = next[next.length - 1]?.time;
  return nextLast != null && nextLast > prevLast && next.length >= prev.length;
}

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
  const darkRef = useRef(dark);
  const prevDataRef = useRef(
    /** @type {{ time: number; open: number; high: number; low: number; close: number }[]} */ ([]),
  );
  darkRef.current = dark;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const chart = createChart(el, {
      autoSize: true,
      ...themeOptions(!!darkRef.current),
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
      prevDataRef.current = [];
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions(themeOptions(!!dark));
  }, [dark]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    const list = Array.isArray(data) ? data : [];
    const timeScale = chart.timeScale();
    const prev = prevDataRef.current;
    const preserveZoom = isSameSeriesLiveUpdate(prev, list);
    const prevLast = prev.length ? prev[prev.length - 1]?.time : null;
    const nextLast = list.length ? list[list.length - 1]?.time : null;
    const tipAdvanced =
      prevLast != null && nextLast != null && nextLast > prevLast;

    /** @type {{ from: number; to: number } | null} */
    let savedLogical = null;
    if (preserveZoom && !tipAdvanced) {
      try {
        const range = timeScale.getVisibleLogicalRange();
        if (range && Number.isFinite(range.from) && Number.isFinite(range.to)) {
          savedLogical = { from: range.from, to: range.to };
        }
      } catch {
        savedLogical = null;
      }
    }

    series.setData(list);
    prevDataRef.current = list;

    if (!list.length) return;

    if (preserveZoom && tipAdvanced) {
      // Keep the same window width but pin to the newest bar (public live embeds).
      try {
        const range = timeScale.getVisibleLogicalRange();
        if (range && Number.isFinite(range.from) && Number.isFinite(range.to)) {
          const width = Math.max(10, range.to - range.from);
          const to = list.length - 1 + 0.5;
          timeScale.setVisibleLogicalRange({ from: to - width, to });
          return;
        }
      } catch {
        // fall through
      }
      try {
        timeScale.scrollToRealTime();
        return;
      } catch {
        // fall through to fit
      }
    }

    if (savedLogical) {
      try {
        timeScale.setVisibleLogicalRange(savedLogical);
        return;
      } catch {
        // fall through to fit
      }
    }
    timeScale.fitContent();
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
