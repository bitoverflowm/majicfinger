import { BarChart3 } from "lucide-react";
import {
  CHART_CARDS_GRID_STYLE,
  chartCardResponsiveSpanStyle,
  clampChartCardRowSpan,
  DASH_CARD_CELL_CLASS,
  DASH_CARDS_GRID_CLASS,
} from "@/lib/dashboardLayoutDefaults";
import { cn } from "@/lib/utils";

/** Card chrome shared with the workspace canvas blocks. */
export const VIEWER_CARD_CLASS =
  "flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm";

const BARS = [42, 68, 50, 84, 58, 74, 46, 62];

export function ChartPaneSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("mx-3 mb-3 mt-1 flex min-h-16 flex-1 items-end gap-2", className)} aria-hidden>
      {BARS.map((height, index) => (
        <span
          key={index}
          className="flex-1 animate-pulse rounded-t bg-muted"
          style={{ height: `${height}%`, animationDelay: `${index * 80}ms` }}
        />
      ))}
    </div>
  );
}

export function ViewerCardSkeleton({ title }: { title?: string }) {
  return (
    <div className={VIEWER_CARD_CLASS} aria-hidden>
      <div className="flex items-center gap-2 px-3 py-2">
        <BarChart3 className="size-3.5 text-muted-foreground/60" aria-hidden />
        {title ? (
          <span className="truncate text-[13px] font-semibold text-foreground/70">{title}</span>
        ) : (
          <span className="h-3 w-32 animate-pulse rounded bg-muted" />
        )}
      </div>
      <ChartPaneSkeleton />
    </div>
  );
}

type SkeletonLayout = {
  rows?: Array<
    | { type?: string; body?: string; textVariant?: string; columns?: Array<{ id?: string; h2?: string; colSpan?: number; rowSpan?: number }> }
    | null
  >;
} | null | undefined;

/**
 * Body placeholder shaped like the real dashboard (same rows, spans and titles), so the page
 * does not jump when charts arrive. Without a layout it falls back to a generic grid.
 */
export function DashboardBodySkeleton({ layout }: { layout?: SkeletonLayout }) {
  const rows = Array.isArray(layout?.rows) ? layout.rows : null;
  if (!rows) {
    return (
      <div className={cn("grid gap-4", DASH_CARDS_GRID_CLASS)} style={CHART_CARDS_GRID_STYLE}>
        {[6, 6, 12].map((span, i) => (
          <div
            key={i}
            className={DASH_CARD_CELL_CLASS}
            style={{ ...chartCardResponsiveSpanStyle(span), gridRow: "span 2" }}
          >
            <ViewerCardSkeleton />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {rows.slice(0, 8).map((row, i) => {
        if (!row) return null;
        if (row.type === "text") {
          return row.textVariant === "heading" ? (
            <h2 key={i} className="text-lg font-semibold tracking-tight text-foreground/80">
              {row.body}
            </h2>
          ) : (
            <div key={i} className="space-y-2" aria-hidden>
              <span className="block h-3 w-[72%] animate-pulse rounded bg-muted" />
              <span className="block h-3 w-[54%] animate-pulse rounded bg-muted" />
            </div>
          );
        }
        if (row.type !== "cards" || !Array.isArray(row.columns)) return null;
        return (
          <div key={i} className={cn("grid gap-4", DASH_CARDS_GRID_CLASS)} style={CHART_CARDS_GRID_STYLE}>
            {row.columns.map((col, j) => (
              <div
                key={col.id || j}
                className={DASH_CARD_CELL_CLASS}
                style={{ ...chartCardResponsiveSpanStyle(col.colSpan), gridRow: `span ${clampChartCardRowSpan(col.rowSpan)}` }}
              >
                <ViewerCardSkeleton title={col.h2} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
