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
  SPECTRUM_HEAT_DEFAULTS,
} from "@/components/spectrumui/charts/chart-engine";
import {
  labelCopyForTier,
  tileLabelFontSize,
  wrapTileLabel,
} from "@/components/spectrumui/charts/heatmapTileLabel";
import { useHtmlDarkClass } from "@/hooks/use-html-dark-class";

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
  const htmlDark = useHtmlDarkClass();
  const [wrapRef, width] = useElementWidth();
  const [hovered, setHovered] = React.useState(null);

  const heatColors = React.useMemo(() => {
    const defaults = htmlDark ? SPECTRUM_HEAT_DEFAULTS.dark : SPECTRUM_HEAT_DEFAULTS.light;
    return {
      up: upColor || defaults.up,
      down: downColor || defaults.down,
      flat: defaults.flat,
    };
  }, [htmlDark, upColor, downColor]);

  const w = Math.max(width, 260);
  const gap = 2;
  const tiles = React.useMemo(() => layout(data, w, height, gap), [data, w, height, gap]);

  const weighted = React.useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.weight, 0) || 1;
    return data.reduce((sum, d) => sum + d.change * d.weight, 0) / total;
  }, [data]);

  const ready = width > 0;
  const labelFill = htmlDark ? "#f8fafc" : "#0a0a0a";

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
    "--spectrum-chart-up": heatColors.up,
    "--spectrum-chart-down": heatColors.down,
    "--spectrum-heat-flat": heatColors.flat,
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
                  style={{ background: changeColor(((i - 4) / 4) * cap, cap, heatColors) }}
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
                const labelSource = labelCopyForTier(tile.label, tier === "none" ? "ticker" : tier);
                const size = tileLabelFontSize(tw, th, labelSource, tier === "none" ? "ticker" : tier);
                const maxLines = tier === "ticker" ? 1 : 2;
                const textMaxWidth = Math.max(12, tw - 12);
                const { lines } = wrapTileLabel(labelSource, {
                  maxWidth: textMaxWidth,
                  fontSize: size,
                  maxLines,
                });
                const lineH = size * 1.2;
                const showChange = tier === "full" || tier === "compact";
                const changeSize = size * 0.72;
                const changeGap = showChange ? size * 0.35 : 0;
                const labelBlockH = lines.length * lineH;
                const totalTextH = labelBlockH + (showChange ? changeGap + changeSize : 0);
                const labelStartY = cy - totalTextH / 2 + lineH / 2;
                const changeY = labelStartY + Math.max(0, lines.length - 1) * lineH + changeGap + changeSize * 0.55;
                const clipId = `hm-clip-${index}`;

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
                      // Avoid opacity keyframe animations — html-to-image clones restart
                      // them with fill-mode both → tiles export as fully transparent.
                      opacity: reduce ? 1 : undefined,
                    }}
                  >
                    <defs>
                      <clipPath id={clipId}>
                        <rect x={tile.x} y={tile.y} width={tw} height={th} rx={4} />
                      </clipPath>
                    </defs>
                    <rect
                      x={tile.x}
                      y={tile.y}
                      width={tw}
                      height={th}
                      rx={4}
                      fill={changeColor(tile.change, cap, heatColors)}
                      stroke={active ? labelFill : "transparent"}
                      strokeWidth={1.5}
                      style={{
                        opacity: hovered && !active ? 0.55 : 1,
                        transition: reduce ? undefined : "opacity 160ms ease-out, stroke 160ms ease-out",
                      }}
                    />
                    {tier === "none" || !lines.length ? null : (
                      <g
                        pointerEvents="none"
                        textAnchor="middle"
                        clipPath={`url(#${clipId})`}
                        fill={labelFill}
                      >
                        {lines.map((line, lineIdx) => (
                          <text
                            key={`${tile.label}-line-${lineIdx}`}
                            x={cx}
                            y={labelStartY + lineIdx * lineH}
                            dominantBaseline="middle"
                            fontSize={size}
                            fontWeight={600}
                            className="font-mono"
                            fill={labelFill}
                          >
                            {line}
                          </text>
                        ))}
                        {showChange ? (
                          <text
                            x={cx}
                            y={changeY}
                            dominantBaseline="middle"
                            fontSize={changeSize}
                            className="font-mono tabular-nums"
                            fill={labelFill}
                            opacity={0.75}
                          >
                            {formatSignedPct(tile.change)}
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
