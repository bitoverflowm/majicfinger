"use client";

import { useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function wallTimeToUnixSeconds(date, timeStr) {
  if (!date) return null;
  const [hh = "0", mm = "0"] = String(timeStr || "00:00").split(":");
  const d = new Date(date);
  d.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
  const sec = Math.floor(d.getTime() / 1000);
  return Number.isFinite(sec) ? sec : null;
}

function unixToDateAndTime(unix) {
  const n = Number(unix);
  if (!Number.isFinite(n) || n <= 0) return { date: undefined, time: "00:00" };
  const d = new Date(n * 1000);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { date: d, time };
}

/**
 * @param {{
 *   value: number | string;
 *   onChange: (unixSeconds: number | "") => void;
 *   className?: string;
 *   disabled?: boolean;
 *   fromDate?: Date;
 *   placeholder?: string;
 * }} props
 */
export function KalshiLiveTimestampPicker({
  value,
  onChange,
  className,
  disabled = false,
  fromDate,
  placeholder = "Pick date & time",
}) {
  const parsed = useMemo(() => unixToDateAndTime(value), [value]);
  const [date, setDate] = useState(parsed.date);
  const [time, setTime] = useState(parsed.time);

  const label = useMemo(() => {
    const sec = Number(value);
    if (!Number.isFinite(sec) || sec <= 0) return placeholder;
    return new Date(sec * 1000).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }, [value, placeholder]);

  const commit = (nextDate, nextTime) => {
    const sec = wallTimeToUnixSeconds(nextDate, nextTime);
    onChange(sec != null ? sec : "");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-8 w-full min-w-[10rem] justify-start px-2 text-left text-[11px] font-normal",
            className,
          )}
        >
          <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-70" />
          <span className={Number(value) > 0 ? "truncate" : "truncate text-muted-foreground"}>
            {label}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <Calendar
          mode="single"
          selected={date}
          fromDate={fromDate}
          disabled={fromDate ? [{ before: fromDate }] : undefined}
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
          {Number(value) > 0 ? (
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
  );
}
