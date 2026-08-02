"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Radio, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  createLiveFeedConfig,
  discoverEventCandlesticksFeedGroup,
} from "@/lib/liveFeeds/feedConfig";
import { pollIntervalMsForPeriod } from "@/lib/liveFeeds/registry";

const PERIOD_OPTIONS = [
  { value: "1", label: "1 minute candles" },
  { value: "60", label: "1 hour candles" },
  { value: "1440", label: "1 day candles" },
];

/**
 * Conic ring that fills toward the next poll (same visual language as project rows ring).
 * @param {{
 *   lastPolledAt?: number | null;
 *   pollIntervalMs?: number;
 *   paused?: boolean;
 * }} props
 */
function LiveFeedNextPullRing({ lastPolledAt, pollIntervalMs, paused }) {
  const intervalMs = Math.max(1000, Math.floor(Number(pollIntervalMs)) || 60_000);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (paused) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [paused, lastPolledAt, intervalMs]);

  const anchor = Number(lastPolledAt);
  const hasAnchor = Number.isFinite(anchor) && anchor > 0;
  const elapsed = hasAnchor ? Math.max(0, now - anchor) : 0;
  const pct = paused
    ? 0
    : hasAnchor
      ? Math.max(0, Math.min(100, (elapsed / intervalMs) * 100))
      : 0;
  const secsLeft = paused
    ? null
    : hasAnchor
      ? Math.max(0, Math.ceil((intervalMs - elapsed) / 1000))
      : Math.ceil(intervalMs / 1000);

  const color = paused ? "rgb(148 163 184)" : "rgb(16 185 129)"; // emerald-500
  const track = "rgb(226 232 240)";

  return (
    <span
      className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(${color} ${pct}%, ${track} ${pct}% 100%)` }}
      title={
        paused
          ? "Live feed paused"
          : secsLeft != null
            ? `Next pull in ~${secsLeft}s`
            : "Waiting for next pull"
      }
      aria-label={
        paused
          ? "Live feed paused"
          : `Next live pull in about ${secsLeft ?? "—"} seconds`
      }
    >
      <span className="h-2.5 w-2.5 rounded-full bg-background" />
    </span>
  );
}

/**
 * Start / pause / stop live REST poll for Kalshi event candlesticks.
 */
export function EventCandlesticksLiveFeedControls() {
  const ctx = useMyStateV2();
  const dataSheets = ctx?.dataSheets || {};
  const liveFeedState = ctx?.liveFeedState;
  const liveFeedActions = ctx?.liveFeedActions;

  const group = useMemo(
    () => discoverEventCandlesticksFeedGroup(dataSheets),
    [dataSheets],
  );

  const activeFeed = useMemo(() => {
    const feeds = Object.values(liveFeedState?.feedsById || {});
    return (
      feeds.find(
        (f) =>
          f?.integration === "kalshi-live" &&
          f?.endpoint === "event_candlesticks" &&
          String(f?.params?.eventTicker || "").toUpperCase() ===
            String(group?.eventTicker || "").toUpperCase(),
      ) || null
    );
  }, [liveFeedState?.feedsById, group?.eventTicker]);

  const [periodInterval, setPeriodInterval] = useState(() =>
    String(group?.periodInterval || 1),
  );

  if (!group) return null;

  const isRunning = !!activeFeed?.isRunning;
  const isPaused = !!activeFeed?.isPaused;

  const handleStart = () => {
    const period = Math.floor(Number(periodInterval)) || 1;
    const cfg = createLiveFeedConfig({
      integration: "kalshi-live",
      endpoint: "event_candlesticks",
      status: "ephemeral",
      periodInterval: period,
      pollIntervalMs: pollIntervalMsForPeriod(period),
      params: {
        eventTicker: group.eventTicker,
        seriesTicker: group.seriesTicker,
        periodInterval: period,
      },
      sheets: group.sheets,
    });
    if (!cfg) {
      toast.error("Could not start live feed for this pull.");
      return;
    }
    const id = liveFeedActions?.start?.(cfg);
    if (id) {
      toast.success(
        `Live feed started · ${period === 1 ? "1m" : period === 60 ? "1h" : "1d"} candles`,
      );
    }
  };

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/10 p-2">
      <div className="flex items-center gap-1.5 px-0.5">
        <Radio
          className={`h-3.5 w-3.5 shrink-0 ${isRunning && !isPaused ? "text-emerald-500" : "text-muted-foreground"}`}
          aria-hidden
        />
        <span className="text-xs font-medium text-foreground">Live feed</span>
        {isRunning ? (
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <LiveFeedNextPullRing
              lastPolledAt={activeFeed?.lastPolledAt ?? activeFeed?.lastSuccessAt}
              pollIntervalMs={activeFeed?.pollIntervalMs}
              paused={isPaused}
            />
            <span>{isPaused ? "Paused" : activeFeed?.statusMessage || "Live"}</span>
          </span>
        ) : null}
      </div>

      {!isRunning ? (
        <>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Candle size &amp; poll</Label>
            <Select value={periodInterval} onValueChange={setPeriodInterval}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label} · poll every {o.value === "1" ? "1m" : o.value === "60" ? "1h" : "1d"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto w-full justify-start gap-2 whitespace-normal px-2.5 py-2 text-left text-xs"
            onClick={handleStart}
          >
            <Play className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
            <span className="min-w-0">Start live</span>
          </Button>
          <p className="px-1 text-[11px] leading-snug text-muted-foreground">
            Polls Kalshi while this tab is open. Stop or leave anytime — nothing is saved until you
            hit Save.
          </p>
        </>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {isPaused ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => liveFeedActions?.resume?.(activeFeed.id)}
            >
              <Play className="h-3.5 w-3.5" aria-hidden />
              Resume
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => liveFeedActions?.pause?.(activeFeed.id)}
            >
              <Pause className="h-3.5 w-3.5" aria-hidden />
              Pause
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              liveFeedActions?.stop?.(activeFeed.id);
              toast.message("Live feed stopped");
            }}
          >
            <Square className="h-3.5 w-3.5" aria-hidden />
            Stop
          </Button>
        </div>
      )}
      {activeFeed?.lastError ? (
        <p className="px-1 text-[11px] text-destructive">{activeFeed.lastError}</p>
      ) : null}
    </div>
  );
}
