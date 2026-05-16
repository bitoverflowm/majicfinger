"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  composeDateShapeSelectValue,
  patchesForDateShape,
} from "@/lib/dataLakeComposeSummarize";
import { cn } from "@/lib/utils";

const SCALE_SHORT_LABELS = {
  none: "×1",
  ten: "÷10",
  hundred: "÷100",
  thousand: "÷1K",
  million: "÷1M",
  billion: "÷1B",
};

const DATE_SHAPE_SHORT_LABELS = {
  raw: "Raw",
  "bucket:day": "Day",
  "bucket:week": "Week",
  "bucket:month": "Month",
  "bucket:quarter": "Qtr",
  "bucket:year": "Year",
  "fmt:dmy": "D-M-Y",
  "fmt:ym": "Y-M",
  "fmt:dm": "D-M",
};

function CompactSelectTrigger({ className, children, "aria-label": ariaLabel, ...props }) {
  return (
    <SelectTrigger
      aria-label={ariaLabel}
      className={cn(
        "h-5 gap-0 border-0 bg-transparent px-1 py-0 text-[9px] leading-none shadow-none ring-0",
        "focus:ring-0 focus:ring-offset-0 data-[placeholder]:text-muted-foreground",
        "[&>span]:line-clamp-1 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </SelectTrigger>
  );
}

/**
 * Number scale, decimal places, and date/time shape — shared by Connect column rows
 * and summarize cards (matches integrations DataLakeParquetPanel).
 */
export function ComposeColumnFormatFields({
  item,
  updateComposeItem,
  kindForColumn,
  className,
  inline = false,
  compact = false,
}) {
  const k = kindForColumn(item.column);
  const isDateCol = k === "date" || !!item.treatAsDate;
  const isNumericCol = k === "number";
  const canNumberFormat =
    isNumericCol && !["count", "count_distinct"].includes(String(item.aggregate || ""));
  const showDateShape =
    isDateCol && !item.aggregate && !item.sumCase?.enabled;
  const scaleVal = item.numberScale || "none";
  const decVal = item.decimals == null ? "default" : String(item.decimals);
  const dateShapeVal = composeDateShapeSelectValue(item);

  if (!showDateShape && !canNumberFormat) return null;

  const labelClass = cn("text-xs", inline && "text-[10px]");
  const triggerClass = cn("h-8 text-xs", inline && "h-7 text-[11px]");

  if (compact) {
    const stop = (e) => e.stopPropagation();

    if (!showDateShape && !canNumberFormat) return null;

    return (
      <div
        className={cn("flex shrink-0 items-center gap-0", className)}
        onClick={stop}
        onPointerDown={stop}
      >
        {canNumberFormat ? (
          <>
            <Select
              value={scaleVal}
              onValueChange={(v) => updateComposeItem(item.id, { numberScale: v })}
            >
              <CompactSelectTrigger aria-label="Number scale" className="max-w-[2.75rem]">
                <span className="truncate">{SCALE_SHORT_LABELS[scaleVal] || "×1"}</span>
              </CompactSelectTrigger>
              <SelectContent align="end">
                <SelectItem value="none" className="text-xs">
                  No scaling
                </SelectItem>
                <SelectItem value="ten" className="text-xs">
                  Divide by 10
                </SelectItem>
                <SelectItem value="hundred" className="text-xs">
                  Divide by 100
                </SelectItem>
                <SelectItem value="thousand" className="text-xs">
                  Divide by 1,000
                </SelectItem>
                <SelectItem value="million" className="text-xs">
                  Divide by 1,000,000
                </SelectItem>
                <SelectItem value="billion" className="text-xs">
                  Divide by 1,000,000,000
                </SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={decVal}
              onValueChange={(v) =>
                updateComposeItem(item.id, {
                  decimals: v === "default" ? null : Number(v),
                })
              }
            >
              <CompactSelectTrigger aria-label="Decimal places" className="max-w-[2rem]">
                <span className="truncate">{decVal === "default" ? "Def" : decVal}</span>
              </CompactSelectTrigger>
              <SelectContent align="end">
                <SelectItem value="default" className="text-xs">
                  Default
                </SelectItem>
                {[0, 1, 2, 3, 4].map((d) => (
                  <SelectItem key={d} value={String(d)} className="text-xs">
                    {d} decimal{d === 1 ? "" : "s"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : null}
        {showDateShape ? (
          <Select
            value={dateShapeVal}
            onValueChange={(shape) => {
              updateComposeItem(item.id, { aggregate: null, ...patchesForDateShape(shape) });
            }}
          >
            <CompactSelectTrigger
              aria-label="Date / time shape"
              className={cn(canNumberFormat ? "max-w-[2.5rem]" : "max-w-[3.25rem]")}
            >
              <span className="truncate">
                {DATE_SHAPE_SHORT_LABELS[dateShapeVal] || "Raw"}
              </span>
            </CompactSelectTrigger>
            <SelectContent align="end">
              <SelectItem value="raw" className="text-xs">
                Keep as stored (epoch number)
              </SelectItem>
              <SelectItem value="bucket:day" className="text-xs">
                Bucket by day
              </SelectItem>
              <SelectItem value="bucket:week" className="text-xs">
                Bucket by week
              </SelectItem>
              <SelectItem value="bucket:month" className="text-xs">
                Bucket by month
              </SelectItem>
              <SelectItem value="bucket:quarter" className="text-xs">
                Bucket by quarter
              </SelectItem>
              <SelectItem value="bucket:year" className="text-xs">
                Bucket by year
              </SelectItem>
              <SelectItem value="fmt:dmy" className="text-xs">
                Text: day-month-year
              </SelectItem>
              <SelectItem value="fmt:ym" className="text-xs">
                Text: year-month
              </SelectItem>
              <SelectItem value="fmt:dm" className="text-xs">
                Text: day-month
              </SelectItem>
            </SelectContent>
          </Select>
        ) : null}
      </div>
    );
  }

  if (showDateShape && !canNumberFormat) {
    return (
      <div className={cn("min-w-0 space-y-1", className)}>
        <Label className={labelClass}>Date / time shape</Label>
        <Select
          value={dateShapeVal}
          onValueChange={(shape) => {
            updateComposeItem(item.id, { aggregate: null, ...patchesForDateShape(shape) });
          }}
        >
          <SelectTrigger className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="raw" className="text-xs">
              Keep as stored (epoch number)
            </SelectItem>
            <SelectItem value="bucket:day" className="text-xs">
              Bucket by day
            </SelectItem>
            <SelectItem value="bucket:week" className="text-xs">
              Bucket by week
            </SelectItem>
            <SelectItem value="bucket:month" className="text-xs">
              Bucket by month
            </SelectItem>
            <SelectItem value="bucket:quarter" className="text-xs">
              Bucket by quarter
            </SelectItem>
            <SelectItem value="bucket:year" className="text-xs">
              Bucket by year
            </SelectItem>
            <SelectItem value="fmt:dmy" className="text-xs">
              Text: day-month-year
            </SelectItem>
            <SelectItem value="fmt:ym" className="text-xs">
              Text: year-month
            </SelectItem>
            <SelectItem value="fmt:dm" className="text-xs">
              Text: day-month
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (canNumberFormat) {
    return (
      <div
        className={cn(
          "grid min-w-0 gap-3",
          inline ? "grid-cols-1 gap-2 sm:grid-cols-2" : "sm:grid-cols-2",
          className,
        )}
      >
        <div className="min-w-0 space-y-1">
          <Label className={labelClass}>Number scale</Label>
          <Select
            value={scaleVal}
            onValueChange={(v) => updateComposeItem(item.id, { numberScale: v })}
          >
            <SelectTrigger className={triggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">
                No scaling
              </SelectItem>
              <SelectItem value="ten" className="text-xs">
                Divide by 10
              </SelectItem>
              <SelectItem value="hundred" className="text-xs">
                Divide by 100
              </SelectItem>
              <SelectItem value="thousand" className="text-xs">
                Divide by 1,000
              </SelectItem>
              <SelectItem value="million" className="text-xs">
                Divide by 1,000,000
              </SelectItem>
              <SelectItem value="billion" className="text-xs">
                Divide by 1,000,000,000
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-1">
          <Label className={labelClass}>Decimal places</Label>
          <Select
            value={decVal}
            onValueChange={(v) =>
              updateComposeItem(item.id, {
                decimals: v === "default" ? null : Number(v),
              })
            }
          >
            <SelectTrigger className={triggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default" className="text-xs">
                Default
              </SelectItem>
              {[0, 1, 2, 3, 4].map((d) => (
                <SelectItem key={d} value={String(d)} className="text-xs">
                  {d} decimal{d === 1 ? "" : "s"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showDateShape ? (
          <div className="min-w-0 space-y-1 sm:col-span-2">
            <Label className={labelClass}>Date / time shape</Label>
            <Select
              value={dateShapeVal}
              onValueChange={(shape) => {
                updateComposeItem(item.id, { aggregate: null, ...patchesForDateShape(shape) });
              }}
            >
              <SelectTrigger className={triggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw" className="text-xs">
                  Keep as stored (epoch number)
                </SelectItem>
                <SelectItem value="bucket:day" className="text-xs">
                  Bucket by day
                </SelectItem>
                <SelectItem value="bucket:week" className="text-xs">
                  Bucket by week
                </SelectItem>
                <SelectItem value="bucket:month" className="text-xs">
                  Bucket by month
                </SelectItem>
                <SelectItem value="bucket:quarter" className="text-xs">
                  Bucket by quarter
                </SelectItem>
                <SelectItem value="bucket:year" className="text-xs">
                  Bucket by year
                </SelectItem>
                <SelectItem value="fmt:dmy" className="text-xs">
                  Text: day-month-year
                </SelectItem>
                <SelectItem value="fmt:ym" className="text-xs">
                  Text: year-month
                </SelectItem>
                <SelectItem value="fmt:dm" className="text-xs">
                  Text: day-month
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}
