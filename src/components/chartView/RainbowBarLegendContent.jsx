"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { rainbowBarFillFromPalette } from "@/components/chartView/rainbowBarFill";

/**
 * Legend for rainbow bar mode: one swatch per distinct fill color, with labels for the rows
 * whose bars use that color (matches Bar + Cell coloring). Labels default to the X axis; pass
 * `legendLabelColumn` to use another sheet column instead.
 */
export const RainbowBarLegendContent = React.forwardRef(function RainbowBarLegendContent(
  {
    className,
    verticalAlign = "bottom",
    rows,
    xKey,
    yKeys,
    shuffleNonce,
    xTickFormatter,
    legendLabelColumn,
    /** `"center"` — wrapped row, centered. `"columns"` — equal-width CSS columns, top-to-bottom fill. */
    layout = "center",
  },
  ref,
) {
  const labelKey = legendLabelColumn || xKey;
  const useXTickFormatter = !legendLabelColumn || legendLabelColumn === xKey;

  const entries = React.useMemo(() => {
    if (!Array.isArray(rows) || !rows.length || !Array.isArray(yKeys) || !yKeys.length) return [];

    const list = [];
    const colorIndex = new Map();

    const formatLegendLabel = (row) => {
      const raw = row?.[labelKey];
      let text;
      if (useXTickFormatter && typeof xTickFormatter === "function") {
        try {
          text = xTickFormatter(raw);
        } catch {
          text = String(raw ?? "");
        }
      } else if (raw == null || raw === "") {
        text = "";
      } else {
        text = String(raw);
        if (text.length > 160) text = `${text.slice(0, 157)}…`;
      }
      if (text == null || text === "") return "—";
      return text;
    };

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      for (let idx = 0; idx < yKeys.length; idx += 1) {
        const color = rainbowBarFillFromPalette(null, i, idx, row?.[xKey], shuffleNonce, yKeys.length);
        if (!color) continue;
        const legendText = formatLegendLabel(row);

        let j = colorIndex.get(color);
        if (j === undefined) {
          j = list.length;
          colorIndex.set(color, j);
          list.push({ color, legendTexts: new Set([legendText]) });
        } else {
          list[j].legendTexts.add(legendText);
        }
      }
    }
    return list.map((e) => ({
      color: e.color,
      legendTexts: Array.from(e.legendTexts),
    }));
  }, [rows, xKey, yKeys, shuffleNonce, xTickFormatter, labelKey, useXTickFormatter]);

  if (!entries.length) return null;

  const columnar = layout === "columns";

  return (
    <div
      ref={ref}
      className={cn(
        "flex min-w-0 flex-col items-stretch gap-2",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className,
      )}
    >
      <p className="text-center text-[10px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
        Legend
      </p>
      <div
        className={cn(
          "w-full min-w-0",
          columnar
            ? "columns-1 gap-y-0 [column-gap:1.5rem] sm:columns-2 lg:columns-3"
            : "flex flex-wrap items-start justify-center gap-x-5 gap-y-2",
        )}
      >
        {entries.map(({ color, legendTexts }) => (
          <div
            key={color}
            className={cn(
              "flex items-start gap-2",
              columnar
                ? "mb-2 w-full min-w-0 break-inside-avoid"
                : "min-w-0 max-w-[min(100%,18rem)]",
            )}
          >
            <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />
            <span className="text-xs leading-snug text-slate-700 dark:text-slate-200">{legendTexts.join(", ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
RainbowBarLegendContent.displayName = "RainbowBarLegendContent";
