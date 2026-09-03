"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  ChartState,
  Stat,
  Keyframes,
  changeColor,
  formatSignedPct,
  marketVarsClassName,
  squarify,
  useElementWidth,
  usePrefersReducedMotion,
} from "@/components/spectrumui/charts/chart-engine";

function labelTier(w, h) {
  if (w >= 108 && h >= 66) return "full";
  if (w >= 64 && h >= 40) return "compact";
  if (w >= 34 && h >= 22) return "ticker";
  return "none";
}

const MIN_W = 34;
const MIN_H = 22;

function layout(items, width, height, gap) {
  let working = items;

  for (let pass = 0; pass < 3; pass += 1) {
    const tiles = squarify(working, width, height);
    const tooSmall = tiles.filter((t) => t.w - gap < MIN_W || t.h - gap < MIN_H);
    if (tooSmall.length < 2) return tiles;

    const small = new Set(tooSmall.map((t) => t.label));
    const kept = working.filter((i) => !small.has(i.label));
    const folded = working.filter((i) => small.has(i.label));
    const weight = folded.reduce((sum, i) => sum + i.weight, 0);
    if (!weight || !kept.length) return tiles;

    working = [
      ...kept,
      {
        label: "Other",
        name: `${folded.length} more`,
        weight,
        change: folded.reduce((sum, i) => sum + i.change * i.weight, 0) / weight,
        payload: null,
      },
    ];
  }

  return squarify(working, width, height);
}

/**
 * Spectrum Market Heatmap (squarified treemap).
 * Vendored from https://ui.spectrumhq.in/charts/heatmap with Lychee tooltip/color hooks.
 */
export function MarketHeatmap({
  className,
  data = [],
  height = 380,
  cap = 6,
  title = "Heatmap",
  subtitle = "",
  status = "ready",
  onRetry,
  upColor,
  downColor,
  onTileHover,
}) {
  const reduce = usePrefersReducedMotion();
  const [wrapRef, width] = useElementWidth();
  const [hovered, setHovered] = React.useState(null);

  const w = Math.max(width, 260);
  const gap = 2;
  const tiles = React.useMemo(() => layout(data, w, height, gap), [data, w, height, gap]);

  const weighted = React.useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.weight, 0) || 1;
    return data.reduce((sum, d) => sum + d.change * d.weight, 0) / total;
  }, [data]);

  const ready = width > 0;

  const setHover = React.useCallback(
    (tile, clientX, clientY) => {
      setHovered(tile?.label ?? null);
      if (typeof onTileHover === "function") {
        onTileHover(
          tile
            ? {
                tile,
                clientX: clientX ?? 0,
                clientY: clientY ?? 0,
              }
            : null,
        );
      }
    },
    [onTileHover],
  );

  const styleVars = {
    ...(upColor ? { "--spectrum-chart-up": upColor } : null),
    ...(downColor ? { "--spectrum-chart-down": downColor } : null),
  };

  return (
    <div
      ref={wrapRef}
      className={cn(
        "flex w-full flex-col",
        marketVarsClassName,
        "[--spectrum-heat-flat:#e7e7ea] dark:[--spectrum-heat-flat:#26262b]",
        className,
      )}
      style={styleVars}
    >
      <Keyframes />

      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          {title ? (
            <p className="font-mono text-[12px] font-medium tracking-wide text-neutral-950 dark:text-white">
              {title}
            </p>
          ) : null}
          {subtitle ? (
            <p className={cn("text-[12px] text-neutral-500 dark:text-neutral-400", title ? "mt-0.5" : null)}>
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
            Weighted{" "}
            <Stat ready={status === "ready"}>
              <span
                className="font-medium"
                style={{
                  color: weighted >= 0 ? "var(--spectrum-chart-up)" : "var(--spectrum-chart-down)",
                }}
              >
                {formatSignedPct(weighted)}
              </span>
            </Stat>
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9.5px] tabular-nums text-neutral-400">−{cap}%</span>
            <span className="flex h-2 w-24 overflow-hidden rounded-full">
              {Array.from({ length: 9 }, (_, i) => (
                <span
                  key={i}
                  className="h-full flex-1"
                  style={{ background: changeColor(((i - 4) / 4) * cap, cap) }}
                />
              ))}
            </span>
            <span className="font-mono text-[9.5px] tabular-nums text-neutral-400">+{cap}%</span>
          </div>
        </div>
      </div>

      <ChartState
        status={status}
        height={height}
        variant="grid"
        empty={{
          title: "No constituents",
          description: "Add rows with a label, weight, and change to draw the map.",
        }}
        onRetry={onRetry}
      >
        <div className="relative w-full" style={{ height }}>
          {!ready ? null : (
            <svg
              width={w}
              height={height}
              viewBox={`0 0 ${w} ${height}`}
              className="block w-full select-none"
              role="img"
              aria-label={`${title}. ${tiles.length} constituents, weighted change ${formatSignedPct(weighted)}.`}
              onPointerLeave={() => setHover(null)}
            >
              {tiles.map((tile, index) => {
                const tw = Math.max(0, tile.w - gap);
                const th = Math.max(0, tile.h - gap);
                const tier = labelTier(tw, th);
                const active = hovered === tile.label;
                const cx = tile.x + tw / 2;
                const cy = tile.y + th / 2;
                const size = Math.max(9, Math.min(19, Math.sqrt(tw * th) / 6.5));

                return (
                  <g
                    key={`${tile.label}-${index}`}
                    onPointerEnter={(event) => setHover(tile, event.clientX, event.clientY)}
                    onPointerMove={(event) => {
                      if (typeof onTileHover === "function") {
                        onTileHover({
                          tile,
                          clientX: event.clientX,
                          clientY: event.clientY,
                        });
                      }
                    }}
                    style={{
                      cursor: "default",
                      transformBox: "fill-box",
                      transformOrigin: "center",
                      animation: reduce
                        ? undefined
                        : `spectrum-mc-fade 420ms ease-out ${Math.min(index * 26, 420)}ms both`,
                    }}
                  >
                    <rect
                      x={tile.x}
                      y={tile.y}
                      width={tw}
                      height={th}
                      rx={4}
                      fill={changeColor(tile.change, cap)}
                      stroke={active ? "currentColor" : "transparent"}
                      strokeWidth={1.5}
                      className="text-neutral-900 dark:text-white"
                      style={{
                        opacity: hovered && !active ? 0.55 : 1,
                        transition: reduce ? undefined : "opacity 160ms ease-out, stroke 160ms ease-out",
                      }}
                    />
                    {tier === "none" ? null : (
                      <g className="pointer-events-none fill-neutral-950 dark:fill-white" textAnchor="middle">
                        <text
                          x={cx}
                          y={tier === "ticker" ? cy : cy - size * 0.34}
                          dominantBaseline="middle"
                          fontSize={size}
                          fontWeight={600}
                          className="font-mono"
                        >
                          {tile.label}
                        </text>
                        {tier === "ticker" ? null : (
                          <text
                            x={cx}
                            y={cy + size * 0.72}
                            dominantBaseline="middle"
                            fontSize={size * 0.72}
                            className="font-mono tabular-nums"
                            opacity={0.75}
                          >
                            {formatSignedPct(tile.change)}
                          </text>
                        )}
                        {tier === "full" && tile.name ? (
                          <text
                            x={cx}
                            y={cy + size * 1.72}
                            dominantBaseline="middle"
                            fontSize={size * 0.58}
                            className="font-sans"
                            opacity={0.5}
                          >
                            {tile.name}
                          </text>
                        ) : null}
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </ChartState>
    </div>
  );
}
