"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, X } from "lucide-react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { KalshiLiveTimestampPicker } from "@/components/connectData/kalshiLive/KalshiLiveTimestampPicker";
import { cellMatchesTextTerm, columnUsesWholeTerm } from "@/lib/textTermMatch";
import { DATE_RANGE_PRESETS, activeDateRangePreset, dateRangePreset } from "@/components/dashboardComposer/dateRangePresets";
import { KALSHI_LIVE_CANDLESTICK_PERIOD_OPTIONS } from "@/lib/kalshiLive/candlesticksColumns";
import { cn } from "@/lib/utils";

/**
 * Fixed choices for Kalshi Historical markets.
 * Category buckets are the taxonomy groups emitted by kalshiPatterns.json.
 * Market type, status, and result are the distinct values from one Athena
 * GROUP BY over the markets table (7,682,445 rows): market type is only
 * binary; status is finalized, active, initialized, closed, inactive,
 * determined, disputed; result is yes, no, or empty.
 */
const ENUM_OPTIONS = {
  kalshi_taxonomy_category: [
    ["Sports", "Sports"],
    ["Crypto", "Crypto"],
    ["Finance", "Finance"],
    ["Esports", "Esports"],
    ["Entertainment", "Entertainment"],
    ["Weather", "Weather"],
    ["Other", "Other"],
    ["Media", "Media"],
    ["Politics", "Politics"],
    ["Science/Tech", "Science/Tech"],
    ["World Events", "World Events"],
  ],
  market_type: [["binary", "Binary"]],
  status: [
    ["finalized", "Finalized"],
    ["active", "Active"],
    ["initialized", "Initialized"],
    ["closed", "Closed"],
    ["inactive", "Inactive"],
    ["determined", "Determined"],
    ["disputed", "Disputed"],
  ],
  result: [
    ["yes", "Yes"],
    ["no", "No"],
    ["", "Unresolved"],
  ],
  taker_side: [
    ["yes", "Yes"],
    ["no", "No"],
  ],
};

const CENTS_COLUMNS = new Set(["yes_bid", "yes_ask", "no_bid", "no_ask", "last_price", "yes_price", "no_price"]);

const BOOLEAN_OPTIONS = [
  ["true", "Yes"],
  ["false", "No"],
];

export function kalshiHistoricalAttributeSpec(column) {
  if (column?.control === "query-range") return { kind: "query-range" };
  if (column?.control === "period") return { kind: "period", options: column.enumOptions || [] };
  if (column?.control === "depth") return { kind: "depth" };
  if (column?.control === "updated-after") return { kind: "updated-after" };
  if (column?.control === "category") {
    return { kind: "enum", options: column.enumOptions || [], loading: Boolean(column.enumLoading) };
  }
  if (Array.isArray(column?.enumOptions) && column.enumOptions.length) {
    return { kind: "enum", options: column.enumOptions };
  }
  if (ENUM_OPTIONS[column?.id]) return { kind: "enum", options: ENUM_OPTIONS[column.id] };
  if (column?.type === "boolean") return { kind: "boolean", options: BOOLEAN_OPTIONS };
  if (column?.type === "number") return { kind: "number", cents: column.scale === "cents" || CENTS_COLUMNS.has(column.id) };
  if (column?.type === "date") return { kind: "date", epoch: column.dateEpoch || "ns" };
  return { kind: "text" };
}

function booleanValue(raw) {
  if (raw === true || raw === false) return raw;
  const text = String(raw ?? "").trim().toLowerCase();
  if (text === "true" || text === "1") return true;
  if (text === "false" || text === "0") return false;
  return null;
}

function readFilter(filters, column) {
  return filters?.[column.id] || null;
}

function textTerms(tags, draft) {
  const seen = new Set();
  const terms = [];
  const list = Array.isArray(tags) ? tags : [];
  for (const term of [...list, draft]) {
    const value = String(term || "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(value);
  }
  return terms;
}

function isMissingValue(raw) {
  if (raw == null) return true;
  return typeof raw === "string" && raw.trim() === "";
}

function isActive(spec, filter) {
  if (!filter) return false;
  if (filter.excludeNull) return true;
  if (spec.kind === "enum" || spec.kind === "boolean") return Array.isArray(filter.include) && filter.include.length > 0;
  if (spec.kind === "number") return String(filter.min || "").trim() !== "" || String(filter.max || "").trim() !== "";
  if (spec.kind === "updated-after") return Number(filter.minUpdatedTs) > 0;
  if (spec.kind === "query-range" || spec.kind === "date") return Boolean(filter.from) || Boolean(filter.to);
  if (spec.kind === "period" || spec.kind === "depth") return String(filter.value ?? "").trim() !== "";
  return textTerms(filter.containsTags, filter.contains).length > 0 || textTerms(filter.excludesTags, filter.excludes).length > 0;
}

function lakeTimeMs(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (Number.isFinite(n) && n > 1e9) {
    return n > 1e16 ? n / 1e6 : n > 1e12 ? n : n * 1000;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function dateBound(ms, epoch, edge) {
  if (epoch === "unix" || epoch === "iso") return edge === "start" ? ms - 1 : ms + 1;
  return edge === "start" ? ms * 1e6 - 1e6 : ms * 1e6 + 1e6;
}

function dateFromIso(iso) {
  const [year, month, day] = String(iso || "").split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function isoFromDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatAttributeDate(iso) {
  const date = dateFromIso(iso);
  return date ? format(date, "LLL dd, y") : "";
}

function formatAttributeRange(from, to) {
  const start = formatAttributeDate(from);
  const end = formatAttributeDate(to);
  if (start && end) return `${start} – ${end}`;
  return start || end || "Pick a date range";
}

function dayBounds(isoDate) {
  const [year, month, day] = String(isoDate).split("-").map(Number);
  if (!year || !month || !day) return null;
  return {
    start: new Date(year, month - 1, day).getTime(),
    end: new Date(year, month - 1, day, 23, 59, 59, 999).getTime(),
  };
}

function quoteInList(values) {
  return values.map((value) => `"${String(value).replace(/"/g, "")}"`).join(", ");
}

export function attributeSummary(column, filters) {
  const spec = kalshiHistoricalAttributeSpec(column);
  const filter = readFilter(filters, column);
  if (!isActive(spec, filter)) return "";
  const parts = [];
  if ((spec.kind === "enum" || spec.kind === "boolean") && filter.include?.length && !(spec.kind === "boolean" && filter.include.length >= spec.options.length)) {
    parts.push(
      filter.include
        .map((value) => spec.options.find((option) => option[0] === value)?.[1] || value || "Unresolved")
        .join(", "),
    );
  } else if (spec.kind === "number") {
    const min = String(filter.min || "").trim();
    const max = String(filter.max || "").trim();
    const unit = spec.cents ? "¢" : "";
    if (min && max) parts.push(`${min}${unit}–${max}${unit}`);
    else if (min) parts.push(`≥ ${min}${unit}`);
    else if (max) parts.push(`≤ ${max}${unit}`);
  } else if (spec.kind === "updated-after") {
    const seconds = Number(filter.minUpdatedTs);
    if (Number.isFinite(seconds) && seconds > 0) parts.push(format(new Date(seconds * 1000), "LLL dd, y h:mm a"));
  } else if (spec.kind === "query-range" || spec.kind === "date") {
    const preset = filter.from && filter.to ? activeDateRangePreset(filter.from, filter.to, filter.preset) : null;
    if (filter.from && filter.to) parts.push(preset ? `${preset.short} · ${formatAttributeRange(filter.from, filter.to)}` : formatAttributeRange(filter.from, filter.to));
    else if (filter.from) parts.push(`From ${formatAttributeDate(filter.from)}`);
    else if (filter.to) parts.push(`Until ${formatAttributeDate(filter.to)}`);
  } else if (spec.kind === "period") {
    const label = spec.options.find((option) => option[0] === String(filter.value))?.[1] || filter.value;
    if (label) parts.push(String(label));
  } else if (spec.kind === "depth") {
    if (String(filter.value ?? "").trim() !== "") parts.push(String(filter.value));
  } else if (spec.kind === "text") {
    const include = textTerms(filter.containsTags, filter.contains);
    const exclude = textTerms(filter.excludesTags, filter.excludes);
    if (include.length) parts.push(include.map((term) => `“${term}”`).join(", "));
    if (exclude.length) parts.push(exclude.map((term) => `not “${term}”`).join(", "));
  }
  if (filter.excludeNull) parts.push("Exclude null");
  return parts.join(" · ");
}

function formatFilterNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "");
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function dateWindowLabel(filter) {
  if (filter?.from && filter?.to) return formatAttributeRange(filter.from, filter.to);
  if (filter?.from) return `after ${formatAttributeDate(filter.from)}`;
  if (filter?.to) return `before ${formatAttributeDate(filter.to)}`;
  return "the selected range";
}

/** Empty string when the row matches. Otherwise the first filter it fails. */
export function attributeMismatchReason(row, columns, filters) {
  for (const column of columns || []) {
    if (column.queryOnly) continue;
    const spec = kalshiHistoricalAttributeSpec(column);
    const filter = readFilter(filters, column);
    if (!isActive(spec, filter)) continue;
    const raw = row?.[column.id];
    const title = column.title || column.id;
    if (filter.excludeNull && isMissingValue(raw)) return `${title} is empty`;
    if (spec.kind === "enum") {
      if (filter.include?.length && !filter.include.includes(String(raw ?? ""))) {
        return `${title} is ${raw == null || raw === "" ? "empty" : String(raw)}`;
      }
      continue;
    }
    if (spec.kind === "boolean") {
      if (filter.include?.length === 1 && booleanValue(raw) !== (filter.include[0] === "true")) return `${title} does not match`;
      continue;
    }
    if (spec.kind === "text") {
      const include = textTerms(filter.containsTags, filter.contains);
      const exclude = textTerms(filter.excludesTags, filter.excludes);
      if (include.length && !include.some((term) => cellMatchesTextTerm(column.id, raw, term))) return `${title} does not match`;
      if (exclude.some((term) => cellMatchesTextTerm(column.id, raw, term))) return `${title} is excluded`;
      continue;
    }
    if (spec.kind === "number") {
      const n = Number(raw);
      const min = String(filter.min || "").trim();
      const max = String(filter.max || "").trim();
      if (!Number.isFinite(n)) return `${title} is empty`;
      if (min !== "" && n < Number(min)) return `${title} is ${formatFilterNumber(n)}, under ${formatFilterNumber(min)}`;
      if (max !== "" && n > Number(max)) return `${title} is ${formatFilterNumber(n)}, over ${formatFilterNumber(max)}`;
      continue;
    }
    if (spec.kind === "updated-after") {
      const min = Number(filter.minUpdatedTs) * 1000;
      const updatedMs = lakeTimeMs(raw);
      if (updatedMs == null || updatedMs < min) return `${title} is before the selected time`;
      continue;
    }
    const ms = lakeTimeMs(raw);
    if (ms == null) return `${title} is empty`;
    const outside =
      (filter.from && dayBounds(filter.from) && ms < dayBounds(filter.from).start) ||
      (filter.to && dayBounds(filter.to) && ms > dayBounds(filter.to).end);
    if (outside) {
      const when = format(new Date(ms), "LLL dd, y");
      return `${title} is ${when}, outside ${dateWindowLabel(filter)}`;
    }
  }
  return "";
}

export function rowMatchesKalshiHistoricalFilters(row, columns, filters) {
  return !attributeMismatchReason(row, columns, filters);
}

export function buildKalshiHistoricalFilterPredicates(columns, filters) {
  const and = [];
  const includeGroups = [];
  for (const column of columns || []) {
    if (column.queryOnly) continue;
    const spec = kalshiHistoricalAttributeSpec(column);
    const filter = readFilter(filters, column);
    if (!isActive(spec, filter)) continue;
    if (filter.excludeNull) {
      const kind =
        spec.kind === "number" ? "number" : spec.kind === "date" ? "date" : spec.kind === "boolean" ? "boolean" : "string";
      and.push({ column: column.id, kind, op: "is_not_null", value: null });
      if (kind === "string") and.push({ column: column.id, kind: "string", op: "neq", value: "" });
    }
    if (spec.kind === "enum") {
      if (filter.include?.length) {
        and.push({ column: column.id, kind: "string", op: "in", value: quoteInList(filter.include) });
      }
      continue;
    }
    if (spec.kind === "boolean") {
      if (filter.include?.length === 1) {
        and.push({ column: column.id, kind: "boolean", op: "eq", value: filter.include[0] === "true" });
      }
      continue;
    }
    if (spec.kind === "text") {
      const include = textTerms(filter.containsTags, filter.contains);
      const exclude = textTerms(filter.excludesTags, filter.excludes);
      const includeOp = columnUsesWholeTerm(column.id) ? "contains_word" : "contains";
      const excludeOp = columnUsesWholeTerm(column.id) ? "not_contains_word" : "not_contains";
      if (include.length === 1) {
        and.push({ column: column.id, kind: "string", op: includeOp, value: include[0] });
      } else if (include.length > 1) {
        includeGroups.push(
          include.map((value) => ({ column: column.id, kind: "string", op: includeOp, value })),
        );
      }
      for (const value of exclude) {
        and.push({ column: column.id, kind: "string", op: excludeOp, value });
      }
      continue;
    }
    if (spec.kind === "updated-after") continue;
    if (spec.kind === "number") {
      const min = String(filter.min || "").trim();
      const max = String(filter.max || "").trim();
      if (min !== "" && Number.isFinite(Number(min))) {
        and.push({ column: column.id, kind: "number", op: "gt", value: Number(min) - 1e-6 });
      }
      if (max !== "" && Number.isFinite(Number(max))) {
        and.push({ column: column.id, kind: "number", op: "lt", value: Number(max) + 1e-6 });
      }
      continue;
    }
    if (filter.from) {
      const bounds = dayBounds(filter.from);
      if (bounds) and.push({ column: column.id, kind: "date", op: "gt", value: dateBound(bounds.start, spec.epoch, "start") });
    }
    if (filter.to) {
      const bounds = dayBounds(filter.to);
      if (bounds) and.push({ column: column.id, kind: "date", op: "lt", value: dateBound(bounds.end, spec.epoch, "end") });
    }
  }
  // Compose filters can OR one group. One column with several contains tags
  // uses that group. Several columns each needing their own OR become one
  // combined OR, which is a wider sample; the sheet still matches per column.
  const or = includeGroups.length === 1 ? includeGroups[0] : includeGroups.flat();
  return { and, or };
}

function patchFilter(filters, column, patch) {
  return { ...filters, [column.id]: { ...(filters?.[column.id] || {}), ...patch } };
}

function compareSortValue(left, right, spec) {
  if (spec?.kind === "number") return Number(left) - Number(right);
  if (spec?.kind === "date" || spec?.kind === "updated-after") return (lakeTimeMs(left) || 0) - (lakeTimeMs(right) || 0);
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
}

export function sortKalshiHistoricalRows(rows, columns, sorts) {
  if (!Array.isArray(sorts) || !sorts.length) return rows;
  const specs = new Map((columns || []).map((column) => [column.id, kalshiHistoricalAttributeSpec(column)]));
  return rows.slice().sort((leftRow, rightRow) => {
    for (const sort of sorts) {
      const left = leftRow?.[sort.columnId];
      const right = rightRow?.[sort.columnId];
      const leftMissing = left == null || left === "";
      const rightMissing = right == null || right === "";
      if (leftMissing || rightMissing) {
        if (leftMissing && rightMissing) continue;
        return leftMissing ? 1 : -1;
      }
      const compared = compareSortValue(left, right, specs.get(sort.columnId));
      if (compared) return sort.direction === "asc" ? compared : -compared;
    }
    return 0;
  });
}

export function sortSummary(columns, sorts) {
  if (!Array.isArray(sorts) || !sorts.length) return "";
  return sorts
    .map((sort) => {
      const title = (columns || []).find((column) => column.id === sort.columnId)?.title || sort.columnId;
      return `${title} ${sort.direction === "asc" ? "↑" : "↓"}`;
    })
    .join(", ");
}

function KeywordField({ label, placeholder, tags, draft, onChange }) {
  const [clearArmed, setClearArmed] = useState(false);
  const list = Array.isArray(tags) ? tags : [];
  const trimmed = String(draft || "").trim();
  const duplicate = list.some((tag) => tag.toLowerCase() === trimmed.toLowerCase());
  const canCreate = Boolean(trimmed) && !duplicate;
  const hasValue = list.length > 0 || Boolean(trimmed);

  function commit() {
    if (!canCreate) return;
    onChange({ tags: [...list, trimmed], draft: "" });
    setClearArmed(false);
  }

  return (
    <div>
      <p className="mb-1 text-[11px] text-muted-foreground">{label}</p>
      <div className="flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-foreground shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-background">
        {list.map((tag) => (
          <span
            key={tag}
            className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-border/70 bg-background py-0.5 pl-2 pr-1 text-[12px] text-foreground"
          >
            <span className="max-w-[12rem] truncate">{tag}</span>
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange({ tags: list.filter((item) => item !== tag), draft });
                setClearArmed(false);
              }}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft || ""}
          placeholder={list.length ? "" : placeholder}
          onChange={(event) => {
            onChange({ tags: list, draft: event.target.value });
            setClearArmed(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
              return;
            }
            if (event.key !== "Backspace" || draft || !list.length) return;
            event.preventDefault();
            onChange({ tags: list.slice(0, -1), draft: "" });
            setClearArmed(false);
          }}
          className="min-w-[5rem] flex-1 bg-transparent py-0.5 text-[13px] outline-none placeholder:text-muted-foreground"
        />
        {hasValue ? (
          <button
            type="button"
            aria-label={clearArmed ? "Confirm clear all" : "Clear all"}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (!clearArmed) {
                setClearArmed(true);
                return;
              }
              onChange({ tags: [], draft: "" });
              setClearArmed(false);
            }}
            className={cn(
              "inline-flex shrink-0 items-center rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground",
              clearArmed && "gap-px bg-red-500/10 text-red-500 hover:bg-red-500/15 hover:text-red-500",
            )}
          >
            <X className="size-3.5" />
            {clearArmed ? <X className="size-3.5" /> : null}
          </button>
        ) : null}
      </div>
      {canCreate ? (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={commit}
          className="mt-1 flex w-full items-center rounded-lg border border-border/70 bg-background px-3 py-2 text-left text-[13px] text-foreground shadow-sm hover:bg-muted/50"
        >
          Create &quot;{trimmed}&quot;
        </button>
      ) : null}
    </div>
  );
}

function IncludeField({ options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const label = selected.length
    ? selected.map((value) => options.find((option) => option[0] === value)?.[1] || "Unresolved").join(", ")
    : "Any";
  return (
    <div>
      <p className="mb-1 text-[11px] text-muted-foreground">Including</p>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 w-full items-center gap-2 rounded-lg border border-border/70 bg-background px-2 text-left text-[13px]"
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="mt-1 max-h-48 space-y-0.5 overflow-y-auto rounded-lg border border-border/70 bg-background p-1">
          {options.map(([value, optionLabel]) => {
            const checked = selected.includes(value);
            return (
              <label key={optionLabel} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[13px] hover:bg-muted/60">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) => {
                    onChange(next ? [...selected, value] : selected.filter((item) => item !== value));
                  }}
                />
                <span>{optionLabel}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ExcludeNullField({ checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px]">
      <Checkbox checked={Boolean(checked)} onCheckedChange={(next) => onChange(next === true)} />
      <span>Exclude null</span>
    </label>
  );
}

function DateRangeField({ from, to, presetId, onChange }) {
  const start = dateFromIso(from);
  const end = dateFromIso(to);
  const selected = start || end ? { from: start, to: end } : undefined;
  const preset = activeDateRangePreset(from, to, presetId);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 w-full justify-start rounded-lg px-2.5 text-left text-[13px] font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="size-3.5 shrink-0 opacity-70" />
          <span className="min-w-0 flex-1 truncate">{formatAttributeRange(from, to)}</span>
          {preset ? <span className="shrink-0 text-[11px] font-medium text-muted-foreground">{preset.short}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[620] w-auto p-0">
        <div className="flex items-start gap-1 border-b border-border/70 p-2">
          <div className="flex max-w-[32rem] flex-wrap gap-1.5">
          {DATE_RANGE_PRESETS.map((item) => {
            const active = preset?.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "rounded-full border px-2 py-1 text-[11px]",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/70 bg-background text-foreground hover:bg-muted",
                )}
                onClick={() => onChange({ ...dateRangePreset(item.id), preset: item.id })}
              >
                {item.label}
              </button>
            );
          })}
          </div>
          <PopoverClose
            type="button"
            aria-label="Close"
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </PopoverClose>
        </div>
        <Calendar
          key={`${from || ""}|${to || ""}`}
          mode="range"
          numberOfMonths={2}
          selected={selected}
          defaultMonth={end || start}
          onSelect={(range) => onChange({ from: isoFromDate(range?.from), to: isoFromDate(range?.to), preset: "" })}
        />
        {selected ? (
          <div className="border-t border-border/70 p-2">
            <Button
              type="button"
              variant="ghost"
              className="h-7 w-full text-[11px]"
              onClick={() => onChange({ from: "", to: "", preset: "" })}
            >
              Clear dates
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/** Date range, period, and depth for a trades, order book, or candlestick join. */
export function JoinSourceFields({ tableId, filters, onChange }) {
  const current = filters || {};
  const range = current.time_range || {};
  const setRange = ({ from, to, preset }) => onChange({ ...current, time_range: { from, to, preset: preset || "" } });
  if (tableId === "orderbook") {
    return (
      <label className="block text-[11px] text-muted-foreground">
        Depth
        <Input
          aria-label="Depth"
          value={current.depth?.value ?? ""}
          inputMode="numeric"
          placeholder="Depth"
          onChange={(event) => onChange({ ...current, depth: { value: event.target.value.replace(/[^\d]/g, "") } })}
          className="mt-1 h-9"
        />
      </label>
    );
  }
  if (tableId !== "trades" && tableId !== "candlesticks") return null;
  return (
    <div className="space-y-2">
      <div>
        <p className="mb-1 text-[11px] text-muted-foreground">Date range</p>
        <DateRangeField from={range.from || ""} to={range.to || ""} presetId={range.preset || ""} onChange={setRange} />
      </div>
      {tableId === "candlesticks" ? (
        <label className="block text-[11px] text-muted-foreground">
          Period
          <select
            aria-label="Period"
            value={String(current.period_interval?.value ?? "60")}
            onChange={(event) => onChange({ ...current, period_interval: { value: event.target.value } })}
            className="mt-1 h-9 w-full rounded-lg border border-border/70 bg-background px-2 text-[13px] text-foreground"
          >
            {KALSHI_LIVE_CANDLESTICK_PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

function AttributeFields({ column, filters, onChange }) {
  const spec = kalshiHistoricalAttributeSpec(column);
  const filter = readFilter(filters, column) || {};
  const excludeNull = (
    <ExcludeNullField
      checked={filter.excludeNull}
      onChange={(next) => onChange(patchFilter(filters, column, { excludeNull: next }))}
    />
  );
  if (spec.kind === "enum" && column.control === "category") {
    if (spec.loading && !spec.options.length) {
      return <p className="text-[11px] text-muted-foreground">Loading categories…</p>;
    }
    return (
      <IncludeField
        options={spec.options}
        selected={filter.include || []}
        onChange={(include) => onChange(patchFilter(filters, column, { include }))}
      />
    );
  }
  if (spec.kind === "updated-after") {
    return (
      <KalshiLiveTimestampPicker
        value={filter.minUpdatedTs ?? ""}
        onChange={(minUpdatedTs) => onChange(patchFilter(filters, column, { minUpdatedTs }))}
      />
    );
  }
  if (spec.kind === "query-range") {
    return (
      <DateRangeField
        from={filter.from || ""}
        to={filter.to || ""}
        presetId={filter.preset || ""}
        onChange={({ from, to, preset }) => onChange(patchFilter(filters, column, { from, to, preset: preset || "" }))}
      />
    );
  }
  if (spec.kind === "period") {
    return (
      <select
        aria-label="Period"
        value={String(filter.value ?? "")}
        onChange={(event) => onChange(patchFilter(filters, column, { value: event.target.value }))}
        className="h-9 w-full rounded-lg border border-border/70 bg-background px-2 text-[13px]"
      >
        {spec.options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    );
  }
  if (spec.kind === "depth") {
    return (
      <Input
        aria-label="Depth"
        value={filter.value ?? ""}
        inputMode="numeric"
        placeholder="Depth"
        onChange={(event) => onChange(patchFilter(filters, column, { value: event.target.value.replace(/[^\d]/g, "") }))}
        className="h-9"
      />
    );
  }
  if (spec.kind === "enum" || spec.kind === "boolean") {
    return (
      <div className="space-y-2">
        <IncludeField
          options={spec.options}
          selected={filter.include || []}
          onChange={(include) => onChange(patchFilter(filters, column, { include }))}
        />
        {excludeNull}
      </div>
    );
  }
  if (spec.kind === "number") {
    const unit = spec.cents ? "¢" : "";
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
        <label className="block text-[11px] text-muted-foreground">
          Min{unit ? ` (${unit})` : ""}
          <Input
            value={filter.min || ""}
            inputMode="decimal"
            placeholder={unit || "Min"}
            onChange={(event) => onChange(patchFilter(filters, column, { min: event.target.value }))}
            className="mt-1 h-9"
          />
        </label>
        <label className="block text-[11px] text-muted-foreground">
          Max{unit ? ` (${unit})` : ""}
          <Input
            value={filter.max || ""}
            inputMode="decimal"
            placeholder={unit || "Max"}
            onChange={(event) => onChange(patchFilter(filters, column, { max: event.target.value }))}
            className="mt-1 h-9"
          />
        </label>
        </div>
        {excludeNull}
      </div>
    );
  }
  if (spec.kind === "date") {
    return (
      <div className="space-y-2">
        <DateRangeField
          from={filter.from || ""}
          to={filter.to || ""}
          presetId={filter.preset || ""}
          onChange={({ from, to, preset }) => onChange(patchFilter(filters, column, { from, to, preset: preset || "" }))}
        />
        {excludeNull}
      </div>
    );
  }
  if (column.exactTickers) {
    return (
      <KeywordField
        label="Exact match"
        placeholder="Add a market ticker"
        tags={filter.containsTags}
        draft={filter.contains || ""}
        onChange={({ tags, draft }) =>
          onChange(patchFilter(filters, column, { containsTags: tags, contains: draft }))
        }
      />
    );
  }
  return (
    <div className="space-y-2">
      <KeywordField
        label="Containing"
        placeholder="Contains…"
        tags={filter.containsTags}
        draft={filter.contains || ""}
        onChange={({ tags, draft }) =>
          onChange(patchFilter(filters, column, { containsTags: tags, contains: draft }))
        }
      />
      <KeywordField
        label="Excluding"
        placeholder="Excludes…"
        tags={filter.excludesTags}
        draft={filter.excludes || ""}
        onChange={({ tags, draft }) =>
          onChange(patchFilter(filters, column, { excludesTags: tags, excludes: draft }))
        }
      />
      {excludeNull}
    </div>
  );
}

const parentTriggerClass =
  "flex w-full items-center gap-2 rounded-lg bg-zinc-200/80 px-2.5 py-1.5 text-left text-[12px] font-semibold text-foreground dark:bg-zinc-800 [&[data-state=open]>svg]:rotate-180";

function ParentSection({ value, title, summary, children }) {
  return (
    <AccordionItem value={value} className="border-0">
      <AccordionPrimitive.Header className="flex">
        <AccordionPrimitive.Trigger className={parentTriggerClass}>
          <span className="min-w-0 truncate">{title}</span>
          {summary ? (
            <span className="ml-auto max-w-[42%] truncate text-[11px] font-normal text-[#0d99ff]">{summary}</span>
          ) : null}
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", !summary && "ml-auto")} />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionContent className="pb-0 pt-2">
        <div className="rounded-lg border border-border/70 px-2 py-2">{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
}

function SortField({ columns, sorts, onChange }) {
  const [clearArmed, setClearArmed] = useState(false);
  const list = Array.isArray(sorts) ? sorts : [];
  const taken = new Set(list.map((sort) => sort.columnId));
  const available = (columns || []).filter((column) => !column.queryOnly && !taken.has(column.id));

  function add(columnId) {
    if (!columnId || taken.has(columnId)) return;
    onChange([...list, { columnId, direction: "desc" }]);
    setClearArmed(false);
  }

  return (
    <div>
      <p className="mb-1 text-[11px] text-muted-foreground">
        First attribute is the main sort. Each next attribute sorts within that.
      </p>
      {list.length ? (
        <div className="mb-2 flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-foreground shadow-sm">
          {list.map((sort, index) => {
            const title = (columns || []).find((column) => column.id === sort.columnId)?.title || sort.columnId;
            const descending = sort.direction !== "asc";
            return (
              <span
                key={sort.columnId}
                className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-border/70 bg-background py-0.5 pl-2 pr-1 text-[12px] text-foreground"
              >
                <span className="text-muted-foreground">{index + 1}</span>
                <span className="max-w-[8rem] truncate">{title}</span>
                <button
                  type="button"
                  aria-label={descending ? `Sort ${title} descending` : `Sort ${title} ascending`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() =>
                    onChange(list.map((item) => (item.columnId === sort.columnId ? { ...item, direction: descending ? "asc" : "desc" } : item)))
                  }
                  className="rounded-full px-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {descending ? "↓" : "↑"}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${title}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(list.filter((item) => item.columnId !== sort.columnId));
                    setClearArmed(false);
                  }}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
          <button
            type="button"
            aria-label={clearArmed ? "Confirm clear all" : "Clear all"}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (!clearArmed) {
                setClearArmed(true);
                return;
              }
              onChange([]);
              setClearArmed(false);
            }}
            className={cn(
              "ml-auto inline-flex shrink-0 items-center rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground",
              clearArmed && "gap-px bg-red-500/10 text-red-500 hover:bg-red-500/15 hover:text-red-500",
            )}
          >
            <X className="size-3.5" />
            {clearArmed ? <X className="size-3.5" /> : null}
          </button>
        </div>
      ) : null}
      <select
        aria-label="Add sort attribute"
        value=""
        disabled={!available.length}
        onChange={(event) => add(event.target.value)}
        className="h-9 w-full rounded-lg border border-border/70 bg-background px-2 text-[13px] disabled:opacity-60"
      >
        <option value="">{available.length ? "Add attribute" : "Every attribute is in the sort"}</option>
        {available.map((column) => (
          <option key={column.id} value={column.id}>
            {column.title}
          </option>
        ))}
      </select>
    </div>
  );
}

function attributePanels(columns) {
  const panels = [];
  for (const column of columns || []) {
    const previous = panels[panels.length - 1];
    if (column.panel && previous?.panel === column.panel) {
      previous.columns.push(column);
      continue;
    }
    panels.push({
      panel: column.panel || "",
      id: column.panel || column.id,
      title: column.panelTitle || column.title,
      columns: [column],
    });
  }
  return panels;
}

export function KalshiHistoricalAttributeFilters({
  columns,
  filters,
  onChange,
  sorts,
  onSorts,
  rowLimit,
  onRowLimit,
  sectionTitle = "Market attributes",
}) {
  return (
    <>
      <ParentSection value="attributes" title={sectionTitle}>
            <Accordion type="single" collapsible className="space-y-2">
              {attributePanels(columns).map((panel) => {
                const summary = panel.columns.map((column) => attributeSummary(column, filters)).filter(Boolean).join(" · ");
                return (
                  <AccordionItem key={panel.id} value={panel.id} className="border-0">
                    <AccordionPrimitive.Header className="flex">
                      <AccordionPrimitive.Trigger className="flex w-full items-center gap-2 rounded-lg bg-zinc-200/80 px-2.5 py-1.5 text-left text-[12px] font-semibold text-foreground dark:bg-zinc-800 [&[data-state=open]>svg]:rotate-180">
                        <span className="min-w-0 truncate">{panel.title}</span>
                        <span className="ml-auto max-w-[42%] truncate text-[11px] font-normal text-[#0d99ff]">{summary}</span>
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                      </AccordionPrimitive.Trigger>
                    </AccordionPrimitive.Header>
                    <AccordionContent className="pb-0 pt-2">
                      <div className="space-y-3 rounded-lg border border-border/70 px-2 py-2">
                        {panel.columns.map((column, index) => (
                          <div key={column.id} className={index > 0 ? "border-t border-border/70 pt-3" : undefined}>
                            {column.description ? (
                              <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">{column.description}</p>
                            ) : null}
                            <AttributeFields column={column} filters={filters} onChange={onChange} />
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
      </ParentSection>
      <ParentSection value="sort" title="Sort" summary={sortSummary(columns, sorts)}>
        <SortField columns={columns} sorts={sorts} onChange={onSorts} />
      </ParentSection>
      <ParentSection value="limit" title="Limit" summary={rowLimit ? Number(rowLimit).toLocaleString() : ""}>
        <label className="block text-[11px] text-muted-foreground">
          Rows
          <Input
            value={rowLimit || ""}
            inputMode="numeric"
            placeholder="Rows"
            onChange={(event) => onRowLimit(event.target.value.replace(/[^\d]/g, ""))}
            className="mt-1 h-9"
          />
        </label>
      </ParentSection>
    </>
  );
}
