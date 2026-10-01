"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
};

const CENTS_COLUMNS = new Set(["yes_bid", "yes_ask", "no_bid", "no_ask", "last_price"]);

export function kalshiHistoricalAttributeSpec(column) {
  if (ENUM_OPTIONS[column?.id]) return { kind: "enum", options: ENUM_OPTIONS[column.id] };
  if (column?.type === "number") return { kind: "number", cents: CENTS_COLUMNS.has(column.id) };
  if (column?.type === "date") return { kind: "date" };
  return { kind: "text" };
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
  if (spec.kind === "enum") return Array.isArray(filter.include) && filter.include.length > 0;
  if (spec.kind === "number") return String(filter.min || "").trim() !== "" || String(filter.max || "").trim() !== "";
  if (spec.kind === "date") return Boolean(filter.from) || Boolean(filter.to);
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
  if (spec.kind === "enum" && filter.include?.length) {
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
  } else if (spec.kind === "date") {
    if (filter.from && filter.to) parts.push(`${filter.from} – ${filter.to}`);
    else if (filter.from) parts.push(`From ${filter.from}`);
    else if (filter.to) parts.push(`Until ${filter.to}`);
  } else if (spec.kind === "text") {
    const include = textTerms(filter.containsTags, filter.contains);
    const exclude = textTerms(filter.excludesTags, filter.excludes);
    if (include.length) parts.push(include.map((term) => `“${term}”`).join(", "));
    if (exclude.length) parts.push(exclude.map((term) => `not “${term}”`).join(", "));
  }
  if (filter.excludeNull) parts.push("Exclude null");
  return parts.join(" · ");
}

export function rowMatchesKalshiHistoricalFilters(row, columns, filters) {
  for (const column of columns || []) {
    const spec = kalshiHistoricalAttributeSpec(column);
    const filter = readFilter(filters, column);
    if (!isActive(spec, filter)) continue;
    const raw = row?.[column.id];
    if (filter.excludeNull && isMissingValue(raw)) return false;
    if (spec.kind === "enum") {
      if (filter.include?.length && !filter.include.includes(String(raw ?? ""))) return false;
      continue;
    }
    if (spec.kind === "text") {
      const text = String(raw ?? "").toLowerCase();
      const include = textTerms(filter.containsTags, filter.contains).map((term) => term.toLowerCase());
      const exclude = textTerms(filter.excludesTags, filter.excludes).map((term) => term.toLowerCase());
      if (include.length && !include.some((term) => text.includes(term))) return false;
      if (exclude.some((term) => text.includes(term))) return false;
      continue;
    }
    if (spec.kind === "number") {
      const n = Number(raw);
      const min = String(filter.min || "").trim();
      const max = String(filter.max || "").trim();
      if (!Number.isFinite(n)) return false;
      if (min !== "" && n < Number(min)) return false;
      if (max !== "" && n > Number(max)) return false;
      continue;
    }
    const ms = lakeTimeMs(raw);
    if (ms == null) return false;
    if (filter.from) {
      const bounds = dayBounds(filter.from);
      if (bounds && ms < bounds.start) return false;
    }
    if (filter.to) {
      const bounds = dayBounds(filter.to);
      if (bounds && ms > bounds.end) return false;
    }
  }
  return true;
}

export function buildKalshiHistoricalFilterPredicates(columns, filters) {
  const and = [];
  const includeGroups = [];
  for (const column of columns || []) {
    const spec = kalshiHistoricalAttributeSpec(column);
    const filter = readFilter(filters, column);
    if (!isActive(spec, filter)) continue;
    if (filter.excludeNull) {
      const kind = spec.kind === "number" ? "number" : spec.kind === "date" ? "date" : "string";
      and.push({ column: column.id, kind, op: "is_not_null", value: null });
      if (kind === "string") and.push({ column: column.id, kind: "string", op: "neq", value: "" });
    }
    if (spec.kind === "enum") {
      if (filter.include?.length) {
        and.push({ column: column.id, kind: "string", op: "in", value: quoteInList(filter.include) });
      }
      continue;
    }
    if (spec.kind === "text") {
      const include = textTerms(filter.containsTags, filter.contains);
      const exclude = textTerms(filter.excludesTags, filter.excludes);
      if (include.length === 1) {
        and.push({ column: column.id, kind: "string", op: "contains", value: include[0] });
      } else if (include.length > 1) {
        includeGroups.push(
          include.map((value) => ({ column: column.id, kind: "string", op: "contains", value })),
        );
      }
      for (const value of exclude) {
        and.push({ column: column.id, kind: "string", op: "not_contains", value });
      }
      continue;
    }
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
      if (bounds) and.push({ column: column.id, kind: "date", op: "gt", value: bounds.start * 1e6 - 1e6 });
    }
    if (filter.to) {
      const bounds = dayBounds(filter.to);
      if (bounds) and.push({ column: column.id, kind: "date", op: "lt", value: bounds.end * 1e6 + 1e6 });
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
  if (spec?.kind === "date") return (lakeTimeMs(left) || 0) - (lakeTimeMs(right) || 0);
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

function AttributeFields({ column, filters, onChange }) {
  const spec = kalshiHistoricalAttributeSpec(column);
  const filter = readFilter(filters, column) || {};
  const excludeNull = (
    <ExcludeNullField
      checked={filter.excludeNull}
      onChange={(next) => onChange(patchFilter(filters, column, { excludeNull: next }))}
    />
  );
  if (spec.kind === "enum") {
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
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-[11px] text-muted-foreground">
          From
          <Input
            type="date"
            value={filter.from || ""}
            onChange={(event) => onChange(patchFilter(filters, column, { from: event.target.value }))}
            className="mt-1 h-9"
          />
        </label>
        <label className="block text-[11px] text-muted-foreground">
          To
          <Input
            type="date"
            value={filter.to || ""}
            onChange={(event) => onChange(patchFilter(filters, column, { to: event.target.value }))}
            className="mt-1 h-9"
          />
        </label>
      </div>
        {excludeNull}
      </div>
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
  const [draft, setDraft] = useState("");
  const [clearArmed, setClearArmed] = useState(false);
  const list = Array.isArray(sorts) ? sorts : [];
  const trimmed = draft.trim().toLowerCase();
  const taken = new Set(list.map((sort) => sort.columnId));
  const matches = trimmed
    ? (columns || [])
        .filter((column) => !taken.has(column.id))
        .filter((column) => column.title.toLowerCase().includes(trimmed) || column.id.toLowerCase().includes(trimmed))
        .sort((left, right) => {
          const leftExact = left.title.toLowerCase() === trimmed;
          const rightExact = right.title.toLowerCase() === trimmed;
          if (leftExact !== rightExact) return leftExact ? -1 : 1;
          return left.title.localeCompare(right.title);
        })
        .slice(0, 6)
    : [];

  function add(column) {
    onChange([...list, { columnId: column.id, direction: "desc" }]);
    setDraft("");
    setClearArmed(false);
  }

  return (
    <div>
      <p className="mb-1 text-[11px] text-muted-foreground">First tag is the main sort. Each next tag sorts within that.</p>
      <div className="flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-foreground shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-background">
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
        <input
          value={draft}
          placeholder={list.length ? "" : "Sort by…"}
          onChange={(event) => {
            setDraft(event.target.value);
            setClearArmed(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (matches[0]) add(matches[0]);
              return;
            }
            if (event.key !== "Backspace" || draft || !list.length) return;
            event.preventDefault();
            onChange(list.slice(0, -1));
            setClearArmed(false);
          }}
          className="min-w-[5rem] flex-1 bg-transparent py-0.5 text-[13px] outline-none placeholder:text-muted-foreground"
        />
        {list.length || draft ? (
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
              setDraft("");
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
      {matches.length ? (
        <div className="mt-1 overflow-hidden rounded-lg border border-border/70 bg-background shadow-sm">
          {matches.map((column) => (
            <button
              key={column.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => add(column)}
              className="flex w-full items-center px-3 py-2 text-left text-[13px] text-foreground hover:bg-muted/50"
            >
              Create &quot;{column.title}&quot;
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function KalshiHistoricalAttributeFilters({ columns, filters, onChange, sorts, onSorts, rowLimit, onRowLimit }) {
  return (
    <Accordion type="single" collapsible defaultValue="market" className="space-y-2">
      <ParentSection value="market" title="Market attributes">
            <Accordion type="single" collapsible className="space-y-2">
              {(columns || []).map((column) => {
                const summary = attributeSummary(column, filters);
                return (
                  <AccordionItem key={column.id} value={column.id} className="border-0">
                    <AccordionPrimitive.Header className="flex">
                      <AccordionPrimitive.Trigger className="flex w-full items-center gap-2 rounded-lg bg-zinc-200/80 px-2.5 py-1.5 text-left text-[12px] font-semibold text-foreground dark:bg-zinc-800 [&[data-state=open]>svg]:rotate-180">
                        <span className="min-w-0 truncate">{column.title}</span>
                        <span className="ml-auto max-w-[42%] truncate text-[11px] font-normal text-[#0d99ff]">{summary}</span>
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                      </AccordionPrimitive.Trigger>
                    </AccordionPrimitive.Header>
                    <AccordionContent className="pb-0 pt-2">
                      <div className="rounded-lg border border-border/70 px-2 py-2">
                        <AttributeFields column={column} filters={filters} onChange={onChange} />
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
    </Accordion>
  );
}
