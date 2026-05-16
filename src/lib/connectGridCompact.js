import { cn } from "@/lib/utils";

/** Denser AG Grid (Connect home Step 2 — `fillViewport` on DataView / GridView). */
export const connectGridAgCompactClass = cn(
  "[--ag-grid-size:3px]",
  "[--ag-font-size:11px]",
  "[--ag-row-height:22px]",
  "[--ag-header-height:24px]",
  "[--ag-cell-horizontal-padding:6px]",
  "[--ag-icon-size:14px]",
  "[--ag-list-item-height:22px]",
);

/** Toolbar above the grid on Connect analyze. */
export const connectGridToolbarCompactClass = "gap-1.5 py-1.5";

/** Compact toolbar buttons only — not the clear-sheet dot (`data-destructive-dot`). */
export const connectGridToolbarButtonCompactClass =
  "[&_button:not([data-destructive-dot])]:h-7 [&_button:not([data-destructive-dot])]:min-h-7 [&_button:not([data-destructive-dot])]:text-[11px]";
