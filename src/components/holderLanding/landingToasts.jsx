"use client";

import { useEffect, useRef } from "react";
import { Pause } from "lucide-react";
import { toast } from "sonner";
import { useHolderSession } from "@/components/terminals/holder/holderSession";
import { arrivalKey } from "@/components/terminals/holder/holderTradesTable";
import { cents, shares, tradeValue, usd } from "@/components/terminals/holder/traderTradesTable";

const TOAST_MS = 8000;
/** Live alerts on a busy market would never stop; at most one this often. */
const LIVE_GAP_MS = 6000;

function ago(ms) {
  const sec = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hours = Math.round(min / 60);
  if (hours < 48) return `${hours}h ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function LandingToast({ live, heading, title, detail, actionLabel, onAction, onPause }) {
  return (
    <div className="w-[356px] rounded-xl border border-border bg-background p-3.5 text-foreground shadow-lg">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#0b7fd4]">
        {live ? (
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#0d99ff] opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-[#0d99ff]" />
          </span>
        ) : (
          <span className="rounded bg-[#0d99ff]/10 px-1.5 py-px text-[10px] tracking-wide">Example</span>
        )}
        <span className="truncate">{heading}</span>
      </div>
      <p className="mt-2 text-[13.5px] font-semibold leading-snug">{title}</p>
      {detail ? <p className="mt-1 truncate text-[12px] text-muted-foreground">{detail}</p> : null}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPause}
          title="Stop these alerts and the automatic tour"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pause className="size-3.5" aria-hidden />
          Pause
        </button>
        {onAction ? (
          <button type="button" onClick={onAction} className="rounded-md bg-[#2f6fed] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#2f6fed]/90">
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function show(id, props, onPause) {
  toast.custom(
    (toastId) => (
      <LandingToast
        {...props}
        onPause={() => {
          toast.dismiss(toastId);
          onPause?.();
        }}
        onAction={
          props.onAction
            ? () => {
                toast.dismiss(toastId);
                props.onAction();
              }
            : null
        }
      />
    ),
    { id, duration: TOAST_MS },
  );
}

function tradeLine(row) {
  const sell = String(row.side || "").toUpperCase() === "SELL";
  return `${row.outcome || "Shares"} ${sell ? "sell" : "buy"} · ${shares(row.size)} shares at ${cents(row.price)}`;
}

function tradeDetail(row, extra) {
  const sec = Number(row.timestamp);
  return [usd(tradeValue(row)), Number.isFinite(sec) && sec ? ago(sec * 1000) : "", extra].filter(Boolean).join(" · ");
}

/**
 * Alerts for the step on screen: on arrival, the latest trade or headline as an example; then real
 * ones as they come in, while the visitor stays on the step. Nothing fires while `paused`.
 * `kind` is "trade" (market fills), "news" (matching headlines) or "trader" (the wallet's trades).
 */
export function useStepToasts({ kind, stepKey, paused, articles, onPause, onViewTrades, onShowArticle }) {
  const session = useHolderSession();
  const rows = kind === "trade" ? session?.rows : kind === "trader" ? session?.activity?.rows : null;
  const list = kind === "news" ? articles : rows;
  const seenRef = useRef(null);
  const lastLiveRef = useRef(0);
  const handlers = useRef({ onPause, onViewTrades, onShowArticle });
  handlers.current = { onPause, onViewTrades, onShowArticle };

  useEffect(() => {
    seenRef.current = null;
  }, [stepKey, kind]);

  useEffect(() => {
    if (!kind || paused || !list?.length) return;
    const keyOf = kind === "news" ? (article) => article.id : arrivalKey;
    const timeOf = kind === "news" ? (article) => Number(article.t) || 0 : (row) => (Number(row.timestamp) || 0) * 1000;
    const pause = () => handlers.current.onPause?.();
    if (!seenRef.current) {
      seenRef.current = new Set(list.map(keyOf));
      seenRef.current.newest = Math.max(0, ...list.slice(0, 200).map(timeOf));
      const first = list[0];
      if (kind === "news") {
        show(
          "holder-landing-news",
          {
            heading: "Latest headline",
            title: first.title,
            detail: [first.source || first.domain, first.t ? ago(first.t) : ""].filter(Boolean).join(" · "),
            actionLabel: "Show on chart",
            onAction: handlers.current.onShowArticle ? () => handlers.current.onShowArticle(first) : null,
          },
          pause,
        );
      } else {
        const name = kind === "trader" ? session?.displayName : "";
        show(
          "holder-landing-trade",
          {
            heading: kind === "trader" ? `Latest trade · ${name}` : "Latest trade",
            title: tradeLine(first),
            detail: tradeDetail(first, kind === "trader" ? first.title : "latest fill"),
            actionLabel: "View trades",
            onAction: handlers.current.onViewTrades || null,
          },
          pause,
        );
      }
      return;
    }
    const seen = seenRef.current;
    const newest = seen.newest;
    // History that finishes loading later is older than what was on screen, so it never counts as new.
    const fresh = [];
    for (const item of list) {
      if (timeOf(item) < newest) break;
      if (!seen.has(keyOf(item))) fresh.push(item);
    }
    fresh.forEach((item) => seen.add(keyOf(item)));
    seen.newest = Math.max(newest, ...fresh.map(timeOf));
    // The trader session raises its own live alerts; this only adds the example.
    if (!fresh.length || kind === "trader") return;
    const now = Date.now();
    if (now - lastLiveRef.current < LIVE_GAP_MS) return;
    lastLiveRef.current = now;
    const item = fresh[0];
    if (kind === "news") {
      show(
        "holder-landing-news",
        {
          live: true,
          heading: "Live · New headline",
          title: item.title,
          detail: [item.source || item.domain, fresh.length > 1 ? `and ${fresh.length - 1} more` : ""].filter(Boolean).join(" · "),
          actionLabel: "Show on chart",
          onAction: handlers.current.onShowArticle ? () => handlers.current.onShowArticle(item) : null,
        },
        pause,
      );
    } else {
      show(
        "holder-landing-trade",
        {
          live: true,
          heading: fresh.length > 1 ? `Live · ${fresh.length} new trades` : "Live · New trade",
          title: tradeLine(item),
          detail: tradeDetail(item),
          actionLabel: "View trades",
          onAction: handlers.current.onViewTrades || null,
        },
        pause,
      );
    }
  }, [kind, list, paused, session?.displayName]);

  useEffect(() => {
    if (!paused && kind) return;
    toast.dismiss("holder-landing-news");
    toast.dismiss("holder-landing-trade");
  }, [paused, kind]);

  useEffect(
    () => () => {
      toast.dismiss("holder-landing-news");
      toast.dismiss("holder-landing-trade");
    },
    [],
  );
}
