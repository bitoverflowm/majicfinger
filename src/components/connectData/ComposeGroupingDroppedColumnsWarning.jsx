"use client";

import { useMemo } from "react";

import { composeColumnsDroppedByExplicitGrouping } from "@/lib/composeColumnGrouping";
import { getKalshiColumnDisplayLabel } from "@/lib/kalshiConnectColumns";
import { cn } from "@/lib/utils";

function columnLabel(col) {
  return getKalshiColumnDisplayLabel({ name: col }) || col;
}

/**
 * Amber callout when GROUP BY (bucket) is active but pass-through columns lack Summarize.
 */
export function ComposeGroupingDroppedColumnsWarning({ columnComposeItems, className }) {
  const dropped = useMemo(
    () => composeColumnsDroppedByExplicitGrouping(columnComposeItems),
    [columnComposeItems],
  );

  if (!dropped.length) return null;

  const labels = dropped.map(columnLabel);

  return (
    <div
      role="status"
      className={cn(
        "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-900",
        "dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100",
        className,
      )}
    >
      <p className="font-medium">Some selected columns will be dropped</p>
      <p className="mt-1 text-amber-800/90 dark:text-amber-200/90">
        Grouping is active. Add{" "}
        <span className="font-medium text-amber-950 dark:text-amber-50">Summarize</span> (Sum, Count,
        etc.) for columns you want in results — otherwise they are omitted from the pull:
      </p>
      <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-amber-950/90 dark:text-amber-50/90">
        {labels.join(", ")}
      </p>
    </div>
  );
}
