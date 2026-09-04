"use client";

import { cn } from "@/lib/utils";

/**
 * Legend for scatter Color-by encoding (categories list or sequential/diverging ramp).
 */
export function ScatterColorByLegend({ model, title, className }) {
  if (!model) return null;
  const titleText =
    (typeof title === "string" && title.trim()) || model.title || "Color";

  if (model.kind === "categories") {
    const items = Array.isArray(model.items) ? model.items : [];
    if (!items.length) return null;
    return (
      <div className={cn("flex flex-col items-center gap-1.5 pt-3", className)}>
        <p className="text-center text-[10px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
          {titleText}
        </p>
        <div className="flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
          {items.map((item) => (
            <div key={item.key} className="flex items-center gap-1.5 text-[11px]">
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: item.color }}
              />
              <span className="max-w-[7rem] truncate">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex w-full max-w-xs flex-col items-center gap-1.5 pt-3", className)}>
      <p className="text-center text-[10px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
        {titleText}
      </p>
      <div
        className="h-2.5 w-full max-w-[14rem] rounded-sm border border-border/60"
        style={{ backgroundImage: model.gradientCss }}
        aria-hidden
      />
      <div className="flex w-full max-w-[14rem] items-center justify-between gap-2 text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
        <span className="min-w-0 truncate">{model.minLabel}</span>
        {model.kind === "diverging" && model.midLabel ? (
          <span className="min-w-0 truncate text-center">{model.midLabel}</span>
        ) : (
          <span />
        )}
        <span className="min-w-0 truncate text-right">{model.maxLabel}</span>
      </div>
    </div>
  );
}
