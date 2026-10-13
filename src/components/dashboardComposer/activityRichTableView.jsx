"use client";

import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { sheetRecords } from "@/lib/visualizations/datasetDescriptor";
import {
  activityTypeLabel,
  activityTypeTone,
  buildActivityRichTable,
} from "@/lib/visualizations/activityRichTable";
import { formatPositionSize, formatPositionUsd, marketMonogram } from "@/lib/visualizations/visualTable";
import { cn } from "@/lib/utils";

const TONE_CLASS = {
  sky: "bg-sky-500/10 text-sky-800 dark:text-sky-200",
  violet: "bg-violet-500/10 text-violet-800 dark:text-violet-200",
  amber: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
  emerald: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  teal: "bg-teal-500/10 text-teal-800 dark:text-teal-200",
  orange: "bg-orange-500/10 text-orange-800 dark:text-orange-200",
  lime: "bg-lime-500/15 text-lime-800 dark:text-lime-200",
  cyan: "bg-cyan-500/10 text-cyan-800 dark:text-cyan-200",
  rose: "bg-rose-500/10 text-rose-800 dark:text-rose-200",
  fuchsia: "bg-fuchsia-500/10 text-fuchsia-800 dark:text-fuchsia-200",
  neutral: "bg-muted text-muted-foreground",
};

const SIDE_CLASS = {
  BUY: "text-emerald-700 dark:text-emerald-300",
  SELL: "text-rose-700 dark:text-rose-300",
  IN: "text-emerald-700 dark:text-emerald-300",
  OUT: "text-rose-700 dark:text-rose-300",
};

function toneClass(type) {
  return TONE_CLASS[activityTypeTone(type)] || TONE_CLASS.neutral;
}

function money(value) {
  if (!Number.isFinite(value)) return "—";
  return formatPositionUsd(value).replace(/^\+/, "");
}

function price(value) {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(value);
}

function TypeTag({ type, title }) {
  if (!type) return null;
  return (
    <span title={title || undefined} className={cn("inline-flex rounded-md px-1.5 py-0.5 font-mono text-[11px] leading-none", toneClass(type))}>
      {type}
    </span>
  );
}

export function ActivityRichTableView({ sheet, dataset }) {
  const model = buildActivityRichTable(sheetRecords(sheet), dataset);
  const [active, setActive] = useState("");
  const selected = model.tags.some((tag) => tag.type === active) ? active : "";
  const rows = selected ? model.rows.filter((row) => row.type === selected) : model.rows;

  if (!model.rows.length) {
    return <p className="px-3 text-[12px] text-muted-foreground">This log has no activity to show yet.</p>;
  }

  return (
    <div data-visual-table="" className="flex min-h-0 flex-1 flex-col px-3 pb-3">
      {model.caption ? (
        <p className="px-0.5 pb-2 pt-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{model.caption}</p>
      ) : null}
      {model.tags.length > 1 ? (
        <div className="flex flex-wrap gap-1 px-0.5 pb-2" role="group" aria-label="Activity types">
          <button
            type="button"
            aria-pressed={selected === ""}
            onClick={() => setActive("")}
            className={cn(
              "inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] leading-none",
              selected === "" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            All
          </button>
          {model.tags.map((tag) => (
            <button
              key={tag.type}
              type="button"
              aria-pressed={selected === tag.type}
              title={tag.label}
              onClick={() => setActive(tag.type)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] leading-none",
                selected === tag.type ? toneClass(tag.type) : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tag.type}
              <span className="tabular-nums opacity-70">{tag.count}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div data-visual-scroll="" className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <table className="w-max border-collapse text-left text-[13px]">
          <thead className="sticky top-0 z-[1] bg-background text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 font-medium">Time</th>
              <th className="px-2 py-1.5 font-medium">Type</th>
              <th className="px-2 py-1.5 font-medium">Market</th>
              {model.showSide ? <th className="px-2 py-1.5 font-medium">Side</th> : null}
              {model.showSize ? <th className="px-2 py-1.5 text-right font-medium">Size</th> : null}
              {model.showUsdc ? <th className="px-2 py-1.5 text-right font-medium">USDC</th> : null}
              {model.showPrice ? <th className="px-2 py-1.5 text-right font-medium">Price</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.ms || "t"}-${row.type}-${index}`} className="border-t border-border/60">
                <td className="whitespace-nowrap px-2 py-1.5 font-mono text-[12px] tabular-nums text-muted-foreground">{row.time}</td>
                <td className="px-2 py-1.5">
                  <span className="inline-flex items-center gap-1">
                    <TypeTag type={row.type} title={activityTypeLabel(row.type)} />
                    {row.combo ? <span className="text-[11px] text-muted-foreground">Combo</span> : null}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar className="size-5">
                      {row.icon ? <AvatarImage src={row.icon} alt="" /> : null}
                      <AvatarFallback className="text-[8px] font-medium">{marketMonogram(row.title || row.outcome)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="max-w-[16rem] truncate font-medium leading-tight" title={row.title}>{row.title || row.outcome || "Activity"}</p>
                      {row.outcome ? <p className="max-w-[16rem] truncate text-[11px] text-muted-foreground">{row.outcome}</p> : null}
                    </div>
                  </div>
                </td>
                {model.showSide ? (
                  <td className={cn("px-2 py-1.5 font-mono text-[12px]", SIDE_CLASS[row.side])}>{row.side}</td>
                ) : null}
                {model.showSize ? (
                  <td className="px-2 py-1.5 text-right font-mono text-[12px] tabular-nums">{formatPositionSize(row.size)}</td>
                ) : null}
                {model.showUsdc ? (
                  <td className="px-2 py-1.5 text-right font-mono text-[12px] tabular-nums">{money(row.usdc)}</td>
                ) : null}
                {model.showPrice ? (
                  <td className="px-2 py-1.5 text-right font-mono text-[12px] tabular-nums">{price(row.price)}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length ? null : (
          <p className="px-2 py-3 text-[12px] text-muted-foreground">No {selected} rows in this log.</p>
        )}
      </div>
    </div>
  );
}
