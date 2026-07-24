"use client";

import { useMemo } from "react";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { KalshiLiveTimestampPicker } from "@/components/connectData/kalshiLive/KalshiLiveTimestampPicker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KALSHI_LIVE_EVENT_STATUS_OPTIONS } from "@/lib/kalshiLive/eventsColumns";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   value: import("@/lib/kalshiLive/eventDiscovery").KalshiLiveEventsDiscoveryParams;
 *   onChange: (next: import("@/lib/kalshiLive/eventDiscovery").KalshiLiveEventsDiscoveryParams) => void;
 *   disabled?: boolean;
 *   className?: string;
 * }} props
 */
export function KalshiLiveEventsDiscoveryFields({ value, onChange, disabled, className }) {
  const patch = (partial) => onChange({ ...value, ...partial });

  const statusOptions = useMemo(() => KALSHI_LIVE_EVENT_STATUS_OPTIONS, []);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col space-y-1.5">
          <Label className="text-[11px] font-medium text-foreground">Status</Label>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Filter by event status.
          </p>
          <Select
            value={value.status || "__any__"}
            disabled={disabled}
            onValueChange={(v) => patch({ status: v === "__any__" ? "" : v })}
          >
            <SelectTrigger className="h-8 w-full text-[11px]">
              <SelectValue placeholder="Any status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__any__" className="text-[11px]">
                Any status
              </SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s} className="text-[11px]">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-1.5">
          <Label className="text-[11px] font-medium text-foreground">Series Ticker</Label>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Filter events belonging to a series. Use semantic search to find a series ticker.
          </p>
          <MarketTickerSearch
            value={value.seriesTicker || ""}
            onChange={(v) => patch({ seriesTicker: v })}
            disabled={disabled}
            dataSource="live"
            searchScope="series"
            showCutoffNotes={false}
            maxTickers={1}
            required={false}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium text-foreground">Event Tickers</Label>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Filter by specific event tickers. Type tickers and press Enter (comma-separated
          supported).
        </p>
        <MarketTickerSearch
          value={value.tickers || ""}
          onChange={(v) => patch({ tickers: v })}
          disabled={disabled}
          dataSource="live"
          searchScope="events"
          showCutoffNotes={false}
          required={false}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex h-full flex-col gap-1">
          <Label className="text-[11px] font-medium text-foreground">Min Close Time</Label>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Events with at least one market closing after this time.
          </p>
          <KalshiLiveTimestampPicker
            value={value.minCloseTs ?? ""}
            onChange={(v) => patch({ minCloseTs: v })}
            disabled={disabled}
            placeholder="Pick a date"
            className="h-8 w-full"
          />
        </div>
        <div className="flex h-full flex-col gap-1">
          <Label className="text-[11px] font-medium text-foreground">Updated After</Label>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Events with metadata updated after this time.
          </p>
          <KalshiLiveTimestampPicker
            value={value.minUpdatedTs ?? ""}
            onChange={(v) => patch({ minUpdatedTs: v })}
            disabled={disabled}
            placeholder="Pick a date"
            className="h-8 w-full"
          />
        </div>
      </div>
    </div>
  );
}
