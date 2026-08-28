"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isNullaryWhereOp, parseBooleanish } from "@/lib/composeWhereFilterUi";
import { cn } from "@/lib/utils";

/**
 * Type-aware WHERE value control. Uses constrained inputs only for known kinds
 * (boolean / number / date). Strings and unknown stay free-form text.
 * Nullary ops (is null / is not null) render no value control.
 *
 * @param {{
 *   kind: string;
 *   op: string;
 *   value: unknown;
 *   onChange: (value: unknown) => void;
 *   className?: string;
 *   inputClassName?: string;
 *   guidedAttrs?: Record<string, string>;
 *   invalid?: boolean;
 *   onInListFocus?: () => void;
 * }} props
 */
export function ComposeWhereValueField({
  kind,
  op,
  value,
  onChange,
  className,
  inputClassName,
  guidedAttrs,
  invalid = false,
  onInListFocus,
}) {
  const k = String(kind || "string").toLowerCase();
  const isInList = op === "in" || op === "not_in";
  const invalidClass = invalid ? "border-destructive focus-visible:ring-destructive" : "";

  if (isNullaryWhereOp(op)) {
    return (
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[10px] leading-snug text-muted-foreground",
          className,
        )}
        title={
          op === "is_not_null"
            ? "Keeps real values including 0. Only missing/null rows are dropped."
            : "Matches only missing/null. 0 is a real value and is not null."
        }
      >
        {op === "is_not_null"
          ? "Keeps values including 0 — only drops missing/null"
          : "Only missing/null — 0 is not null"}
      </span>
    );
  }

  if (k === "boolean" && !isInList) {
    const boolStr = parseBooleanish(value) === false ? "false" : "true";
    return (
      <Select value={boolStr} onValueChange={(v) => onChange(v === "true")}>
        <SelectTrigger
          className={cn("h-7 min-w-[5rem] flex-1 text-[11px]", inputClassName, className)}
          {...(guidedAttrs || {})}
        >
          <SelectValue placeholder="Value" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true" className="text-xs">
            true
          </SelectItem>
          <SelectItem value="false" className="text-xs">
            false
          </SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (k === "date" && !isInList) {
    return (
      <Input
        type="datetime-local"
        className={cn("h-7 min-w-[3rem] flex-1 text-[11px]", inputClassName, invalidClass, className)}
        value={
          Number.isFinite(Number(value)) ? new Date(Number(value)).toISOString().slice(0, 16) : ""
        }
        onChange={(e) => {
          const ms = new Date(String(e.target.value)).getTime();
          onChange(Number.isFinite(ms) ? ms : "");
        }}
        {...(guidedAttrs || {})}
      />
    );
  }

  if (isInList) {
    return (
      <Input
        type="text"
        className={cn("h-7 min-w-[3rem] flex-1 text-[11px]", inputClassName, invalidClass, className)}
        value={String(value ?? "")}
        onFocus={onInListFocus}
        onClick={onInListFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={k === "string" ? '"yes", "no"' : "1, 2, 3"}
        {...(guidedAttrs || {})}
      />
    );
  }

  if (k === "number") {
    return (
      <Input
        type="number"
        step="any"
        className={cn("h-7 min-w-[3rem] flex-1 text-[11px]", inputClassName, invalidClass, className)}
        value={value === "" || value == null ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        placeholder="Value"
        {...(guidedAttrs || {})}
      />
    );
  }

  // string / unknown — free-form
  return (
    <Input
      type="text"
      className={cn("h-7 min-w-[3rem] flex-1 text-[11px]", inputClassName, invalidClass, className)}
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Value"
      {...(guidedAttrs || {})}
    />
  );
}
