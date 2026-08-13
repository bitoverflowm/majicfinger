"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * @param {Date | undefined} date
 * @param {string} timeStr
 * @returns {string}
 */
function wallTimeToIso(date, timeStr) {
  if (!date) return "";
  const [hh = "0", mm = "0"] = String(timeStr || "00:00").split(":");
  const d = new Date(date);
  d.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString();
}

/**
 * @param {string} iso
 * @returns {{ date: Date | undefined; time: string }}
 */
function isoToDateAndTime(iso) {
  const raw = String(iso || "").trim();
  if (!raw) return { date: undefined, time: "00:00" };
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return { date: undefined, time: "00:00" };
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { date: d, time };
}

/**
 * @param {{
 *   label?: string;
 *   value: string;
 *   onChange: (iso: string) => void;
 *   disabled?: boolean;
 *   placeholder?: string;
 *   className?: string;
 * }} props
 */
export function PolymarketDateTimeField({
  label,
  value,
  onChange,
  disabled = false,
  placeholder = "Pick date & time",
  className,
}) {
  const parsed = useMemo(() => isoToDateAndTime(value), [value]);
  const [date, setDate] = useState(parsed.date);
  const [time, setTime] = useState(parsed.time);

  useEffect(() => {
    setDate(parsed.date);
    setTime(parsed.time);
  }, [parsed.date, parsed.time]);

  const hasValue = Boolean(String(value || "").trim());

  const displayLabel = useMemo(() => {
    if (!hasValue) return placeholder;
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return placeholder;
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }, [hasValue, placeholder, value]);

  const commit = (nextDate, nextTime) => {
    onChange(wallTimeToIso(nextDate, nextTime));
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? <Label className="text-[11px] text-foreground">{label}</Label> : null}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-8 w-full min-w-[10rem] justify-start px-2 text-left text-xs font-normal"
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className={hasValue ? "truncate" : "truncate text-muted-foreground"}>
              {displayLabel}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              setDate(d);
              commit(d, time);
            }}
          />
          <div className="mt-2 flex items-center gap-2 border-t border-border/50 pt-2">
            <span className="text-[10px] text-muted-foreground">Time</span>
            <Input
              type="time"
              className="h-8 flex-1 text-xs"
              value={time}
              disabled={disabled}
              onChange={(e) => {
                const t = e.target.value;
                setTime(t);
                commit(date, t);
              }}
            />
            {hasValue ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-[10px]"
                disabled={disabled}
                onClick={() => {
                  setDate(undefined);
                  setTime("00:00");
                  onChange("");
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
