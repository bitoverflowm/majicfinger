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
  bucketShortLabel,
  composeBucketSelectValue,
  composeFormatSelectValue,
  formatShortLabel,
  getBucketOptionsForKind,
  getFormatOptionsForKind,
  patchesForBucket,
  patchesForFormat,
} from "@/lib/composeColumnGrouping";
import { cn } from "@/lib/utils";

const SCALE_SHORT_LABELS = {
  none: "×1",
  ten: "÷10",
  hundred: "÷100",
  thousand: "÷1K",
  million: "÷1M",
  billion: "÷1B",
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

function BucketFormatSelects({
  item,
  kind,
  updateComposeItem,
  labelClass,
  triggerClass,
  compact,
}) {
  const bucketVal = composeBucketSelectValue(item, kind);
  const formatVal = composeFormatSelectValue(item);
  const bucketOptions = getBucketOptionsForKind(kind);
  const formatOptions = getFormatOptionsForKind(kind);
  const showFormat = kind === "date" || item.treatAsDate;

  const onBucket = (v) => {
    updateComposeItem(item.id, { aggregate: null, ...patchesForBucket(v, kind) });
  };
  const onFormat = (v) => {
    updateComposeItem(item.id, { aggregate: null, ...patchesForFormat(v) });
  };

  if (compact) {
    return (
      <>
        <Select value={bucketVal} onValueChange={onBucket}>
          <CompactSelectTrigger aria-label="Bucket" className="max-w-[2.5rem]">
            <span className="truncate">{bucketShortLabel(bucketVal, kind)}</span>
          </CompactSelectTrigger>
          <SelectContent align="end">
            {bucketOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showFormat ? (
          <Select value={formatVal} onValueChange={onFormat}>
            <CompactSelectTrigger aria-label="Format" className="max-w-[2.25rem]">
              <span className="truncate">{formatShortLabel(formatVal)}</span>
            </CompactSelectTrigger>
            <SelectContent align="end">
              {formatOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="min-w-0 space-y-1">
        <Label className={labelClass}>Bucket</Label>
        <Select value={bucketVal} onValueChange={onBucket}>
          <SelectTrigger className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {bucketOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {showFormat ? (
        <div className="min-w-0 space-y-1">
          <Label className={labelClass}>Format</Label>
          <Select value={formatVal} onValueChange={onFormat}>
            <SelectTrigger className={triggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formatOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </>
  );
}

/**
 * Bucket, format, number scale, and decimal places for compose column rows.
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
  const isNumericCol = k === "number";
  const canNumberFormat =
    isNumericCol && !["count", "count_distinct"].includes(String(item.aggregate || ""));
  const showGrouping = !item.aggregate && !item.sumCase?.enabled;

  if (!showGrouping && !canNumberFormat) return null;

  const labelClass = cn("text-xs", inline && "text-[10px]");
  const triggerClass = cn("h-8 text-xs", inline && "h-7 text-[11px]");
  const scaleVal = item.numberScale || "none";
  const decVal = item.decimals == null ? "default" : String(item.decimals);

  if (compact) {
    const stop = (e) => e.stopPropagation();
    const hasControls = showGrouping || canNumberFormat;
    if (!hasControls) return null;

    return (
      <div
        className={cn("flex shrink-0 items-center gap-0", className)}
        onClick={stop}
        onPointerDown={stop}
      >
        {showGrouping ? (
          <BucketFormatSelects
            compact
            item={item}
            kind={k}
            updateComposeItem={updateComposeItem}
            labelClass={labelClass}
            triggerClass={triggerClass}
          />
        ) : null}
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
      </div>
    );
  }

  if (showGrouping && !canNumberFormat) {
    return (
      <div
        className={cn(
          "grid min-w-0 gap-3",
          inline ? "grid-cols-1 gap-2 sm:grid-cols-2" : "sm:grid-cols-2",
          className,
        )}
      >
        <BucketFormatSelects
          item={item}
          kind={k}
          updateComposeItem={updateComposeItem}
          labelClass={labelClass}
          triggerClass={triggerClass}
        />
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
        {showGrouping ? (
          <BucketFormatSelects
            item={item}
            kind={k}
            updateComposeItem={updateComposeItem}
            labelClass={labelClass}
            triggerClass={triggerClass}
          />
        ) : null}
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
      </div>
    );
  }

  return null;
}
