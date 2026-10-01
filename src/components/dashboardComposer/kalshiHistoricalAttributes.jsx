"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
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

function isActive(spec, filter) {
  if (!filter) return false;
  if (spec.kind === "enum") return Array.isArray(filter.include) && filter.include.length > 0;
  if (spec.kind === "number") return String(filter.min || "").trim() !== "" || String(filter.max || "").trim() !== "";
  if (spec.kind === "date") return Boolean(filter.from) || Boolean(filter.to);
  return String(filter.contains || "").trim() !== "" || String(filter.excludes || "").trim() !== "";
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
  if (spec.kind === "enum") {
    return filter.include
      .map((value) => spec.options.find((option) => option[0] === value)?.[1] || value || "Unresolved")
      .join(", ");
  }
  if (spec.kind === "number") {
    const min = String(filter.min || "").trim();
    const max = String(filter.max || "").trim();
    const unit = spec.cents ? "¢" : "";
    if (min && max) return `${min}${unit}–${max}${unit}`;
    if (min) return `≥ ${min}${unit}`;
    return `≤ ${max}${unit}`;
  }
  if (spec.kind === "date") {
    if (filter.from && filter.to) return `${filter.from} – ${filter.to}`;
    if (filter.from) return `From ${filter.from}`;
    return `Until ${filter.to}`;
  }
  const parts = [];
  if (String(filter.contains || "").trim()) parts.push(`“${filter.contains.trim()}”`);
  if (String(filter.excludes || "").trim()) parts.push(`not “${filter.excludes.trim()}”`);
  return parts.join(" · ");
}

export function rowMatchesKalshiHistoricalFilters(row, columns, filters) {
  for (const column of columns || []) {
    const spec = kalshiHistoricalAttributeSpec(column);
    const filter = readFilter(filters, column);
    if (!isActive(spec, filter)) continue;
    const raw = row?.[column.id];
    if (spec.kind === "enum") {
      if (!filter.include.includes(String(raw ?? ""))) return false;
      continue;
    }
    if (spec.kind === "text") {
      const text = String(raw ?? "").toLowerCase();
      const contains = String(filter.contains || "").trim().toLowerCase();
      const excludes = String(filter.excludes || "").trim().toLowerCase();
      if (contains && !text.includes(contains)) return false;
      if (excludes && text.includes(excludes)) return false;
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
  for (const column of columns || []) {
    const spec = kalshiHistoricalAttributeSpec(column);
    const filter = readFilter(filters, column);
    if (!isActive(spec, filter)) continue;
    if (spec.kind === "enum") {
      and.push({ column: column.id, kind: "string", op: "in", value: quoteInList(filter.include) });
      continue;
    }
    if (spec.kind === "text") {
      const contains = String(filter.contains || "").trim();
      const excludes = String(filter.excludes || "").trim();
      if (contains) and.push({ column: column.id, kind: "string", op: "contains", value: contains });
      if (excludes) and.push({ column: column.id, kind: "string", op: "not_contains", value: excludes });
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
  return and;
}

function patchFilter(filters, column, patch) {
  return { ...filters, [column.id]: { ...(filters?.[column.id] || {}), ...patch } };
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

function AttributeFields({ column, filters, onChange }) {
  const spec = kalshiHistoricalAttributeSpec(column);
  const filter = readFilter(filters, column) || {};
  if (spec.kind === "enum") {
    return (
      <IncludeField
        options={spec.options}
        selected={filter.include || []}
        onChange={(include) => onChange(patchFilter(filters, column, { include }))}
      />
    );
  }
  if (spec.kind === "number") {
    const unit = spec.cents ? "¢" : "";
    return (
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
    );
  }
  if (spec.kind === "date") {
    return (
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
    );
  }
  return (
    <div className="space-y-2">
      <label className="block text-[11px] text-muted-foreground">
        Containing
        <Input
          value={filter.contains || ""}
          placeholder="Contains…"
          onChange={(event) => onChange(patchFilter(filters, column, { contains: event.target.value }))}
          className="mt-1 h-9"
        />
      </label>
      <label className="block text-[11px] text-muted-foreground">
        Excluding
        <Input
          value={filter.excludes || ""}
          placeholder="Excludes…"
          onChange={(event) => onChange(patchFilter(filters, column, { excludes: event.target.value }))}
          className="mt-1 h-9"
        />
      </label>
    </div>
  );
}

export function KalshiHistoricalAttributeFilters({ columns, filters, onChange }) {
  return (
    <Accordion type="single" collapsible className="space-y-2">
      {(columns || []).map((column) => {
        const summary = attributeSummary(column, filters);
        return (
          <AccordionItem key={column.id} value={column.id} className="border-0">
            <AccordionPrimitive.Header className="flex">
              <AccordionPrimitive.Trigger
                className="flex w-full items-center gap-2 rounded-lg bg-zinc-200/80 px-2.5 py-1.5 text-left text-[12px] font-semibold text-foreground dark:bg-zinc-800 [&[data-state=open]>svg]:rotate-180"
              >
                <span className="min-w-0 truncate">{column.title} Attributes</span>
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
  );
}
