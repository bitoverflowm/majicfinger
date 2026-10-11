"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { squarify } from "@/components/spectrumui/charts/chart-engine";
import { SPECTRUM_HEAT_DEFAULTS, parseHexColor } from "@/components/spectrumui/charts/heatmapColors";
import { useHtmlDarkClass } from "@/hooks/use-html-dark-class";
import { formatPnl4, pnlFill, positionTreemapModel } from "@/lib/visualizations/portfolioTreemap";

function textOn(fill) {
  const rgb = parseHexColor(fill);
  if (!rgb) return "#1f2937";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.62 ? "#1f2937" : "#f8fafc";
}

function shortLabel(label, width) {
  const text = String(label || "");
  const max = Math.max(4, Math.floor((width - 12) / 6.2));
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

export function PortfolioTreemap({ sheet, dataset, onOpenRow }) {
  const dark = useHtmlDarkClass();
  const frameRef = useRef(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [hover, setHover] = useState(null);
  const model = useMemo(() => positionTreemapModel(sheet, dataset), [dataset, sheet]);
  const palette = dark ? SPECTRUM_HEAT_DEFAULTS.dark : SPECTRUM_HEAT_DEFAULTS.light;

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return undefined;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      setBox((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const tiles = useMemo(() => {
    const items = model.tiles.map((tile) => ({
      ...tile,
      weight: tile.value,
      name: tile.label,
    }));
    return squarify(items, Math.max(0, box.width), Math.max(0, box.height));
  }, [box.height, box.width, model.tiles]);

  const openRow = (row) => {
    if (!Number.isFinite(row)) return;
    onOpenRow?.(row);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 gap-2 px-2 pb-2">
      <div
        ref={frameRef}
        className="relative min-h-0 min-w-0 flex-1"
        onMouseLeave={() => setHover(null)}
      >
        {tiles.length ? (
          <svg width={box.width} height={box.height} className="block" role="img" aria-label="Position treemap">
            {tiles.map((tile) => {
              const fill = pnlFill(tile.pnl, model.cap, palette);
              const ink = textOn(fill);
              const show = tile.w > 36 && tile.h > 22;
              return (
                <g
                  key={`${tile.row}-${tile.label}`}
                  onClick={() => openRow(tile.row)}
                  onMouseMove={(event) => {
                    const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                    setHover({
                      tile,
                      x: rect ? event.clientX - rect.left : tile.x,
                      y: rect ? event.clientY - rect.top : tile.y,
                    });
                  }}
                  className="cursor-pointer"
                >
                  <rect
                    x={tile.x}
                    y={tile.y}
                    width={Math.max(0, tile.w - 1)}
                    height={Math.max(0, tile.h - 1)}
                    rx={3}
                    fill={fill}
                  />
                  {show ? (
                    <text x={tile.x + 6} y={tile.y + 16} fontSize={11} fill={ink}>
                      {shortLabel(tile.label, tile.w)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        ) : (
          <p className="px-1 pt-2 text-[12px] text-muted-foreground">No current value to size yet.</p>
        )}
        {hover ? (
          <div
            className="pointer-events-none absolute z-10 max-w-[16rem] rounded-md border border-border bg-popover px-2 py-1.5 text-[11px] leading-snug text-popover-foreground shadow-sm"
            style={{
              left: Math.min(hover.x + 12, Math.max(0, box.width - 180)),
              top: Math.min(hover.y + 12, Math.max(0, box.height - 64)),
            }}
          >
            <p className="font-medium">{hover.tile.label}</p>
            <p className="mt-0.5 font-mono tabular-nums">Current value {formatPnl4(hover.tile.value).replace(/^\+/, "")}</p>
            <p className="font-mono tabular-nums">Unrealized P&L {formatPnl4(hover.tile.pnl)}</p>
          </div>
        ) : null}
      </div>
      {model.zeros.length ? (
        <aside className="flex w-40 shrink-0 flex-col gap-1 overflow-auto py-1">
          {model.zeros.length === 1 ? (
            <button
              type="button"
              onClick={() => openRow(model.zeros[0].row)}
              className="text-left text-[11px] leading-snug text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {model.summary}
            </button>
          ) : (
            <>
              <p className="text-[11px] leading-snug text-muted-foreground">{model.summary}</p>
              {model.zeros.map((item) => (
                <button
                  key={item.row}
                  type="button"
                  onClick={() => openRow(item.row)}
                  className="text-left text-[11px] leading-snug text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  {item.label} · {formatPnl4(item.pnl)}
                </button>
              ))}
            </>
          )}
        </aside>
      ) : null}
    </div>
  );
}
