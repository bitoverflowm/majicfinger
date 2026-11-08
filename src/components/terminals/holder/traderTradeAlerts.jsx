"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { arrivalKey } from "./holderTradesTable";
import { MarketIcon, cents, shares, tradeValue, usd } from "./traderTradesTable";

const PAUSE_KEY = "lychee:holderTerminal:pauseTraderTradeAlerts";
/** Every open trader view shares one pause setting; this tells the others when it changes. */
const PAUSE_EVENT = "lychee:trader-trade-alerts-paused";
const TOAST_MS = 9000;

function TradeLine({ trade }) {
  const side = String(trade.side || "").toUpperCase();
  return (
    <p className="text-[13.5px] font-semibold leading-snug">
      <span className={side === "SELL" ? "text-rose-500" : "text-emerald-500"}>{side === "SELL" ? "Sold" : "Bought"}</span>{" "}
      {shares(trade.size)} {trade.outcome || "shares"} at {cents(trade.price)}
      <span className="font-normal text-muted-foreground"> · {usd(tradeValue(trade))}</span>
    </p>
  );
}

function TraderTradeToast({ name, trades, onPause, onView }) {
  const [first, ...rest] = trades;
  const more = rest.length;
  return (
    <div className="w-[356px] rounded-xl border border-border bg-background p-3.5 text-foreground shadow-lg">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#0b7fd4]">
        <span className="relative flex size-2" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#0d99ff] opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-[#0d99ff]" />
        </span>
        <span className="truncate">{more ? `${trades.length} new trades by ${name}` : `New trade by ${name}`}</span>
      </div>
      <div className="mt-2">
        <TradeLine trade={first} />
        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
          <MarketIcon src={first.icon} title={first.title} size={16} />
          <span className="truncate">{first.title}</span>
        </p>
      </div>
      {more ? (
        <ul className="mt-2 space-y-0.5 text-[12px] text-muted-foreground">
          {rest.slice(0, 2).map((trade) => (
            <li key={arrivalKey(trade)} className="truncate">
              {String(trade.side).toUpperCase() === "SELL" ? "Sold" : "Bought"} {shares(trade.size)} {trade.outcome} at {cents(trade.price)} · {trade.title}
            </li>
          ))}
          {more > 2 ? <li>and {more - 2} more</li> : null}
        </ul>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPause}
          title="Stop these alerts. New trades keep landing in the table."
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pause className="size-3.5" aria-hidden />
          Pause
        </button>
        <button type="button" onClick={onView} className="rounded-md bg-[#2f6fed] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#2f6fed]/90">
          View
        </button>
      </div>
    </div>
  );
}

/**
 * Alerts when the trader on screen places a trade. Trades already in the history never alert, and
 * nothing pops while the view is hidden (another tab, or the window in the background).
 *
 * @param {{ rows: object[], ready: boolean, name: string, address: string, viewRef: import("react").RefObject<HTMLElement>, onView: () => void }} props
 */
export function useTraderTradeAlerts({ rows, ready, name, address, viewRef, onView }) {
  const [paused, setPausedState] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const seenRef = useRef(null);
  const toastRef = useRef(null);
  const nameRef = useRef(name);
  nameRef.current = name;
  const onViewRef = useRef(onView);
  onViewRef.current = onView;

  useEffect(() => {
    try {
      setPausedState(window.localStorage.getItem(PAUSE_KEY) === "1");
    } catch {
      /* storage blocked */
    }
    const onPause = (event) => setPausedState(!!event.detail);
    const onStorage = (event) => {
      if (event.key === PAUSE_KEY) setPausedState(event.newValue === "1");
    };
    window.addEventListener(PAUSE_EVENT, onPause);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PAUSE_EVENT, onPause);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (paused && toastRef.current) toast.dismiss(toastRef.current.id);
  }, [paused]);

  const setPaused = useCallback((next) => {
    try {
      window.localStorage.setItem(PAUSE_KEY, next ? "1" : "0");
    } catch {
      /* storage blocked */
    }
    window.dispatchEvent(new CustomEvent(PAUSE_EVENT, { detail: next }));
  }, []);

  useEffect(() => {
    seenRef.current = null;
    if (toastRef.current) toast.dismiss(toastRef.current.id);
    toastRef.current = null;
  }, [address]);

  useEffect(() => {
    if (!ready) return;
    if (!seenRef.current) {
      seenRef.current = new Set(rows.map(arrivalKey));
      return;
    }
    const seen = seenRef.current;
    const fresh = [];
    for (const row of rows) {
      const key = arrivalKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      fresh.push(row);
    }
    if (!fresh.length || pausedRef.current) return;
    const onScreen = document.visibilityState === "visible" && viewRef.current?.offsetParent != null;
    if (!onScreen) return;
    const now = Date.now();
    // While an alert is up, later trades join it rather than stacking a second one.
    const shown = toastRef.current;
    const joining = shown && now - shown.at < TOAST_MS;
    const toastId = joining ? shown.id : `trader-trades-${address}-${now}`;
    const trades = joining ? [...fresh, ...shown.trades] : fresh;
    toastRef.current = { id: toastId, trades, at: now };
    toast.custom(
      (id) => (
        <TraderTradeToast
          name={nameRef.current}
          trades={trades}
          onPause={() => {
            toast.dismiss(id);
            setPaused(true);
          }}
          onView={() => {
            toast.dismiss(id);
            onViewRef.current?.();
          }}
        />
      ),
      { id: toastId, duration: TOAST_MS, onDismiss: () => (toastRef.current = null), onAutoClose: () => (toastRef.current = null) },
    );
  }, [address, ready, rows, setPaused, viewRef]);

  useEffect(
    () => () => {
      if (toastRef.current) toast.dismiss(toastRef.current.id);
    },
    [],
  );

  return { paused, setPaused };
}

/** Pause or resume the trade alerts, matching the market browser's control. */
export function TradeAlertsToggle({ paused, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!paused)}
      aria-pressed={paused}
      title={paused ? "Show an alert again when this trader places a trade." : "Stop the trade alerts. New trades still land in the table."}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] hover:bg-muted hover:text-foreground",
        paused ? "font-medium text-foreground" : "text-muted-foreground",
      )}
    >
      {paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
      {paused ? "Resume alerts" : "Pause alerts"}
    </button>
  );
}
