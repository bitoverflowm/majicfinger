"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { squarify } from "@/components/spectrumui/charts/chart-engine";
import { formatUsd } from "@/lib/visualizations/visualTable";
import { volumeTreemapModel } from "@/lib/visualizations/volumeTreemap";

const LYCHEE_RED = "#E63946";

function shortLabel(label, width) {
  const text = String(label || "");
  const max = Math.max(4, Math.floor((width - 12) / 6.2));
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

function tileFill(value, max) {
  const share = max > 0 ? value / max : 0;
  const alpha = 0.28 + share * 0.72;
  return `color-mix(in srgb, ${LYCHEE_RED} ${Math.round(alpha * 100)}%, white)`;
}

export function VolumeTreemap({ sheet, dataset, onOpenRow }) {
  const frameRef = useRef(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [hover, setHover] = useState(null);
  const model = useMemo(() => volumeTreemapModel(sheet, dataset), [dataset, sheet]);
  const noun = dataset?.datasetType === "events" ? "events" : "markets";

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
    const items = model.tiles.map((tile) => ({ ...tile, weight: tile.value, name: tile.label }));
    return squarify(items, Math.max(0, box.width), Math.max(0, box.height));
  }, [box.height, box.width, model.tiles]);

  if (!model.tiles.length) {
    return <p className="px-3 text-[12px] text-muted-foreground">This list has no 24h volume to chart yet.</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col px-2 pb-2">
      <p className="px-1 pb-1 text-[11px] text-muted-foreground">24h volume · {model.tiles.length.toLocaleString()} {noun}</p>
      <div ref={frameRef} className="relative min-h-0 min-w-0 flex-1" onMouseLeave={() => setHover(null)}>
        {tiles.length ? (
          <svg width={box.width} height={box.height} className="block" role="img" aria-label="24h volume treemap">
            {tiles.map((tile) => {
              const fill = tileFill(tile.value, model.max);
              const show = tile.w > 48 && tile.h > 28;
              return (
                <g
                  key={`${tile.row}-${tile.label}`}
                  onClick={() => onOpenRow?.(tile.row)}
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
                  <rect x={tile.x} y={tile.y} width={Math.max(0, tile.w - 1)} height={Math.max(0, tile.h - 1)} rx={3} fill={fill} />
                  {show ? (
                    <text x={tile.x + 6} y={tile.y + 16} fontSize={11} fill="#1f2937">
                      {shortLabel(tile.label, tile.w)}
                    </text>
                  ) : null}
                  {show && tile.h > 36 ? (
                    <text x={tile.x + 6} y={tile.y + 32} fontSize={11} fill="#1f2937">
                      {formatUsd(tile.value)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        ) : null}
        {hover ? (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-border/70 bg-background px-2 py-1 text-[12px] shadow-sm"
            style={{ left: Math.min(hover.x + 8, Math.max(0, box.width - 180)), top: Math.max(0, hover.y - 36) }}
          >
            <p className="max-w-[220px] truncate font-medium">{hover.tile.label}</p>
            <p className="font-mono tabular-nums text-muted-foreground">{formatUsd(hover.tile.value)} 24h</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
