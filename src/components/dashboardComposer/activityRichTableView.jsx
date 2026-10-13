"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { sheetRecords } from "@/lib/visualizations/datasetDescriptor";
import {
  activityTypeLabel,
  activityTypeTone,
  buildActivityRichTable,
} from "@/lib/visualizations/activityRichTable";
import { formatPositionSize, formatPositionUsd, marketMonogram } from "@/lib/visualizations/visualTable";
import { cn } from "@/lib/utils";

const TONE_BG = {
  sky: "bg-sky-500/10",
  violet: "bg-violet-500/10",
  amber: "bg-amber-500/10",
  emerald: "bg-emerald-500/10",
  teal: "bg-teal-500/10",
  orange: "bg-orange-500/10",
  lime: "bg-lime-500/15",
  cyan: "bg-cyan-500/10",
  rose: "bg-rose-500/10",
  fuchsia: "bg-fuchsia-500/10",
  neutral: "bg-muted",
};

const TONE_TEXT = {
  sky: "text-sky-800 dark:text-sky-200",
  violet: "text-violet-800 dark:text-violet-200",
  amber: "text-amber-800 dark:text-amber-200",
  emerald: "text-emerald-800 dark:text-emerald-200",
  teal: "text-teal-800 dark:text-teal-200",
  orange: "text-orange-800 dark:text-orange-200",
  lime: "text-lime-800 dark:text-lime-200",
  cyan: "text-cyan-800 dark:text-cyan-200",
  rose: "text-rose-800 dark:text-rose-200",
  fuchsia: "text-fuchsia-800 dark:text-fuchsia-200",
  neutral: "text-muted-foreground",
};

const PILL_SPRING = { type: "spring", stiffness: 520, damping: 38, mass: 0.75 };
const ROW_EASE = [0.22, 1, 0.36, 1];

const SIDE_CLASS = {
  BUY: "text-emerald-700 dark:text-emerald-300",
  SELL: "text-rose-700 dark:text-rose-300",
  IN: "text-emerald-700 dark:text-emerald-300",
  OUT: "text-rose-700 dark:text-rose-300",
};

function toneKey(type) {
  return activityTypeTone(type) || "neutral";
}

function toneClass(type) {
  const tone = toneKey(type);
  return cn(TONE_BG[tone] || TONE_BG.neutral, TONE_TEXT[tone] || TONE_TEXT.neutral);
}

function FilterBadge({ pressed, tone, onClick, title, children }) {
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      aria-pressed={pressed}
      title={title}
      onClick={onClick}
      className={cn(
        "relative inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] leading-none transition-colors duration-300",
        pressed
          ? tone
            ? TONE_TEXT[tone] || TONE_TEXT.neutral
            : "text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {pressed ? (
        <motion.span
          layoutId="activity-type-pill"
          className={cn("absolute inset-0 rounded-md", tone ? TONE_BG[tone] || TONE_BG.neutral : "bg-foreground")}
          transition={reduce ? { duration: 0 } : { layout: PILL_SPRING, backgroundColor: { duration: 0.28, ease: "easeOut" } }}
        />
      ) : null}
      <span className="relative z-[1] inline-flex items-center gap-1">{children}</span>
    </button>
  );
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

function columnTemplate(model) {
  const columns = ["max-content", "max-content", "max-content"];
  if (model.showSide) columns.push("max-content");
  if (model.showSize) columns.push("max-content");
  if (model.showUsdc) columns.push("max-content");
  if (model.showPrice) columns.push("max-content");
  return columns.join(" ");
}

export function ActivityRichTableView({ sheet, dataset }) {
  const model = buildActivityRichTable(sheetRecords(sheet), dataset);
  const reduce = useReducedMotion();
  const [active, setActive] = useState("");
  const selected = model.tags.some((tag) => tag.type === active) ? active : "";
  const shownCount = selected ? model.rows.filter((row) => row.type === selected).length : model.rows.length;

  if (!model.rows.length) {
    return <p className="px-3 text-[12px] text-muted-foreground">This log has no activity to show yet.</p>;
  }

  return (
    <div data-visual-table="" className="flex min-h-0 flex-1 flex-col px-3 pb-3">
      {model.caption ? (
        <p className="px-0.5 pb-2 pt-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{model.caption}</p>
      ) : null}
      {model.tags.length > 1 ? (
        <div className="flex flex-wrap gap-1 px-0.5 pb-2 pt-2" role="group" aria-label="Activity types">
          <FilterBadge pressed={selected === ""} onClick={() => setActive("")}>
            All
          </FilterBadge>
          {model.tags.map((tag) => (
            <FilterBadge
              key={tag.type}
              pressed={selected === tag.type}
              tone={toneKey(tag.type)}
              title={tag.label}
              onClick={() => setActive(tag.type)}
            >
              {tag.type}
              <span className="tabular-nums opacity-70">{tag.count}</span>
            </FilterBadge>
          ))}
        </div>
      ) : null}
      <div data-visual-scroll="" className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <div role="table" className="grid w-max min-w-full text-left text-[13px]" style={{ gridTemplateColumns: columnTemplate(model) }}>
          <div
            role="row"
            className="sticky top-0 z-[1] col-span-full grid grid-cols-subgrid bg-background text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            <div role="columnheader" className="px-2 py-1.5">Time</div>
            <div role="columnheader" className="px-2 py-1.5">Type</div>
            <div role="columnheader" className="px-2 py-1.5">Market</div>
            {model.showSide ? <div role="columnheader" className="px-2 py-1.5">Side</div> : null}
            {model.showSize ? <div role="columnheader" className="px-2 py-1.5 text-right">Size</div> : null}
            {model.showUsdc ? <div role="columnheader" className="px-2 py-1.5 text-right">USDC</div> : null}
            {model.showPrice ? <div role="columnheader" className="px-2 py-1.5 text-right">Price</div> : null}
          </div>
          {model.rows.map((row, index) => {
            const shown = !selected || row.type === selected;
            return (
              <motion.div
                key={`${index}-${row.type}-${row.ms || "t"}`}
                role="row"
                aria-hidden={shown ? undefined : true}
                initial={false}
                animate={{ opacity: shown ? 1 : 0, height: shown ? "auto" : 0 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : {
                        opacity: { duration: shown ? 0.28 : 0.2, ease: "easeOut" },
                        height: { duration: 0.38, ease: ROW_EASE },
                      }
                }
                className={cn(
                  "col-span-full grid min-h-0 grid-cols-subgrid overflow-hidden shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--border)_60%,transparent)]",
                  shown ? "" : "pointer-events-none",
                )}
              >
                <div role="cell" className="whitespace-nowrap px-2 py-1.5 font-mono text-[12px] tabular-nums text-muted-foreground">{row.time}</div>
                <div role="cell" className="px-2 py-1.5">
                  <span className="inline-flex items-center gap-1">
                    <TypeTag type={row.type} title={activityTypeLabel(row.type)} />
                    {row.combo ? <span className="text-[11px] text-muted-foreground">Combo</span> : null}
                  </span>
                </div>
                <div role="cell" className="px-2 py-1.5">
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
                </div>
                {model.showSide ? (
                  <div role="cell" className={cn("px-2 py-1.5 font-mono text-[12px]", SIDE_CLASS[row.side])}>{row.side}</div>
                ) : null}
                {model.showSize ? (
                  <div role="cell" className="px-2 py-1.5 text-right font-mono text-[12px] tabular-nums">{formatPositionSize(row.size)}</div>
                ) : null}
                {model.showUsdc ? (
                  <div role="cell" className="px-2 py-1.5 text-right font-mono text-[12px] tabular-nums">{money(row.usdc)}</div>
                ) : null}
                {model.showPrice ? (
                  <div role="cell" className="px-2 py-1.5 text-right font-mono text-[12px] tabular-nums">{price(row.price)}</div>
                ) : null}
              </motion.div>
            );
          })}
        </div>
        {shownCount ? null : (
          <p className="px-2 py-3 text-[12px] text-muted-foreground">No {selected} rows in this log.</p>
        )}
      </div>
    </div>
  );
}
