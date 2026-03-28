"use client";

import { Rectangle } from "recharts";
import { kalshiColorForSheetCategoryLabel } from "@/lib/kalshi/kalshiCategoryTaxonomy";
import { contrastStrokeForBackground, contrastTextForBackground } from "@/components/chartView/paletteExtrapolation";

/**
 * Custom Treemap cell: only leaf tiles (no inner group rects). Fills from extrapolated design palette when provided.
 * @param {Record<string, unknown>} props — Recharts treemap node props; `children` is nested data children, not React children.
 */
export function TreemapCategoryRect(props) {
  const {
    x,
    y,
    width,
    height,
    name,
    value,
    index,
    children: dataChildren,
    leafColors,
  } = props;
  const isLeaf =
    dataChildren == null || (Array.isArray(dataChildren) && dataChildren.length === 0);
  if (!isLeaf) {
    return <g />;
  }
  if (width < 1 || height < 1) {
    return <g />;
  }
  const label = String(name ?? "");
  const fromPalette = Array.isArray(leafColors) && leafColors[Number(index)] != null;
  const fill = fromPalette ? leafColors[Number(index)] : kalshiColorForSheetCategoryLabel(label);
  const textFill = fromPalette ? contrastTextForBackground(fill) : "rgba(255,255,255,0.95)";
  const stroke = fromPalette ? contrastStrokeForBackground(fill) : "rgba(255,255,255,0.85)";
  const showText = width > 28 && height > 18;
  const short = label.length > 22 ? `${label.slice(0, 20)}…` : label;
  const subText =
    textFill === "rgba(17,24,39,0.92)" ? "rgba(17,24,39,0.78)" : "rgba(255,255,255,0.88)";
  return (
    <g>
      <Rectangle x={x} y={y} width={width} height={height} fill={fill} stroke={stroke} strokeWidth={1} />
      {showText && (
        <text
          x={Number(x) + 6}
          y={Number(y) + Math.min(Number(height) / 2 + 4, 16)}
          fontSize={11}
          fill={textFill}
          style={{
            paintOrder: "stroke",
            stroke: textFill === "rgba(17,24,39,0.92)" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)",
            strokeWidth: 2,
          }}
        >
          {short}
        </text>
      )}
      {showText && Number(width) > 70 && Number(height) > 36 && value != null && (
        <text x={Number(x) + 6} y={Number(y) + Number(height) - 8} fontSize={10} fill={subText}>
          {typeof value === "number" ? value.toLocaleString() : String(value)}
        </text>
      )}
    </g>
  );
}
