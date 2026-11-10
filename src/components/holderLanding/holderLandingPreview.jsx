"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { chosenName, shortWallet, useHolderSession } from "@/components/terminals/holder/holderSession";
import { arrivalKey } from "@/components/terminals/holder/holderTradesTable";
import { cents, shares, tradeValue, usd } from "@/components/terminals/holder/traderTradesTable";
import { cn } from "@/lib/utils";
import exploreBackdrop from "../../../public/landing/feature-explore-lake.jpg";
import insightsBackdrop from "../../../public/landing/feature-insights.jpg";

const TRADE_ROWS = 5;
const OUTCOME_TEXT = ["text-emerald-600 dark:text-emerald-400", "text-rose-600 dark:text-rose-400"];
const OUTCOME_BAR = ["bg-emerald-500", "bg-rose-500"];

function compactUsd(value) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function signedUsd(value) {
  if (!Number.isFinite(value)) return "—";
  return `${value < 0 ? "−" : "+"}${compactUsd(Math.abs(value))}`;
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function useNow(everyMs = 10_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(timer);
  }, [everyMs]);
  return now;
}

function ago(sec, now) {
  const s = Math.max(0, Math.round(now / 1000 - Number(sec)));
  if (!Number.isFinite(s)) return "";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 172_800) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86_400)}d ago`;
}

function traderLabel(row) {
  const label = chosenName(row.name) || String(row.pseudonym || "").trim() || String(row.proxy_wallet || "");
  return /^0x[0-9a-f]{40}/i.test(label) ? shortWallet(label) : label;
}

function SideChip({ side }) {
  const sell = String(side || "").toUpperCase() === "SELL";
  return (
    <span
      className={cn(
        "inline-flex w-10 justify-center rounded px-1 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
        sell ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      )}
    >
      {sell ? "Sell" : "Buy"}
    </span>
  );
}

function Bone({ className }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

function SectionLabel({ children, aside }) {
  return (
    <div className="flex items-baseline justify-between gap-3 pb-1.5">
      <span className="text-[12px] font-medium text-foreground">{children}</span>
      {aside ? <span className="truncate text-[11px] text-muted-foreground">{aside}</span> : null}
    </div>
  );
}

/** Rows that rise in as they arrive; a fixed number of slots so the window never changes height. */
function TradeList({ rows, render }) {
  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/70">
      {Array.from({ length: TRADE_ROWS }, (_, index) => {
        const row = rows[index];
        return row ? (
          <li
            key={arrivalKey(row)}
            className="flex h-11 items-center gap-2.5 px-2.5 text-[12px] animate-in fade-in-0 slide-in-from-top-2 duration-500 motion-reduce:animate-none"
          >
            {render(row)}
          </li>
        ) : (
          <li key={`empty-${index}`} className="flex h-11 items-center gap-2.5 px-2.5">
            <Bone className="h-4 w-10" />
            <Bone className="h-3 flex-1" />
            <Bone className="h-3 w-12" />
          </li>
        );
      })}
    </ul>
  );
}

function MarketBody({ now, holdersFirst }) {
  const session = useHolderSession();
  const { meta, stats, outcomes } = session;
  const prices = stats?.prices || [];
  const sides = session.holders?.sides;
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      <p className="line-clamp-2 text-[15px] font-medium leading-snug text-foreground">{meta.title}</p>
      <div className="grid grid-cols-2 gap-2.5">
        {outcomes.map((outcome, index) => {
          const price = prices[index];
          const count = sides?.[index]?.count;
          return (
            <div key={outcome} className="rounded-lg border border-border/70 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn("text-[12px] font-semibold", OUTCOME_TEXT[index])}>{outcome}</span>
                {count != null ? <span className="text-[11px] tabular-nums text-muted-foreground">{count.toLocaleString()} holders</span> : null}
              </div>
              <div className="mt-1 font-mono text-[1.65rem] leading-none tabular-nums text-foreground">{Number.isFinite(price) ? cents(price) : "—"}</div>
              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-700", OUTCOME_BAR[index])}
                  style={{ width: `${Math.round((Number.isFinite(price) ? price : 0) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className={cn(holdersFirst && "order-last")}>
        <SectionLabel aside={meta.volume24h ? `${compactUsd(meta.volume24h)} traded in 24h` : null}>Live trades</SectionLabel>
        <TradeList
          rows={session.rows || []}
          render={(row) => {
            const index = row.outcome === outcomes[1] ? 1 : 0;
            return (
              <>
                <SideChip side={row.side} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-foreground">
                    {shares(row.size)} <span className={OUTCOME_TEXT[index]}>{row.outcome || outcomes[index]}</span> at {cents(row.price)}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">{traderLabel(row) || "Confirming trader…"}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-[11.5px] tabular-nums text-foreground">{usd(tradeValue(row))}</span>
                  <span className="block text-[10.5px] text-muted-foreground">{ago(row.timestamp, now)}</span>
                </span>
              </>
            );
          }}
        />
      </div>
      <div>
        <SectionLabel>Largest holders</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5">
          {outcomes.map((outcome, index) => (
            <ul key={outcome} className="space-y-1.5 rounded-lg border border-border/70 p-2.5">
              {(sides?.[index]?.rows || []).slice(0, 3).map((row) => (
                <li key={row.wallet} className="flex items-center gap-2 text-[12px]">
                  {row.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.image} alt="" className="size-5 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="size-5 shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-violet-500" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 truncate text-foreground">{chosenName(row.name) || row.pseudonym || shortWallet(row.wallet)}</span>
                  {row.supplyPct != null ? (
                    <span className={cn("shrink-0 font-mono text-[11px] tabular-nums", OUTCOME_TEXT[index])}>{row.supplyPct.toFixed(1)}%</span>
                  ) : null}
                </li>
              ))}
              {!sides ? <Bone className="h-12 w-full" /> : null}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}

function TraderBody({ now }) {
  const session = useHolderSession();
  const profile = session.profile?.rows?.[0];
  const image = String(profile?.profile_image_optimized || profile?.profile_image || "").trim();
  const realized = num(profile?.realized_pnl);
  const unrealized = num(profile?.unrealized_pnl);
  const positions = [...(session.positions?.rows || [])].sort((a, b) => (num(b.current_value) ?? 0) - (num(a.current_value) ?? 0)).slice(0, 3);
  const stats = [
    ["Realized P&L", signedUsd(realized), realized == null ? "" : realized < 0 ? "text-rose-600" : "text-emerald-600"],
    ["Open P&L", signedUsd(unrealized), unrealized == null ? "" : unrealized < 0 ? "text-rose-600" : "text-emerald-600"],
    ["Portfolio", compactUsd(num(profile?.portfolio_value)), "text-foreground"],
  ];
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="size-9 rounded-full object-cover" />
        ) : (
          <span className="size-9 rounded-full bg-gradient-to-br from-sky-400 to-violet-500" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-foreground">{session.displayName}</p>
          <p className="text-[11.5px] text-muted-foreground">Polymarket trader</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {stats.map(([label, value, tone]) => (
          <div key={label} className="rounded-lg border border-border/70 p-3">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            {profile ? <p className={cn("mt-1 font-mono text-[1.15rem] leading-none tabular-nums", tone)}>{value}</p> : <Bone className="mt-1 h-5 w-16" />}
          </div>
        ))}
      </div>
      <div>
        <SectionLabel>Latest trades</SectionLabel>
        <TradeList
          rows={session.activity?.rows || []}
          render={(row) => (
            <>
              <SideChip side={row.side} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-foreground">{row.title}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {shares(row.size)} {row.outcome} at {cents(row.price)}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-[11.5px] tabular-nums text-foreground">{usd(tradeValue(row))}</span>
                <span className="block text-[10.5px] text-muted-foreground">{ago(row.timestamp, now)}</span>
              </span>
            </>
          )}
        />
      </div>
      <div>
        <SectionLabel>Largest open positions</SectionLabel>
        <ul className="divide-y divide-border/60 rounded-lg border border-border/70">
          {positions.length
            ? positions.map((row) => {
                const pnl = num(row.unrealized_pnl);
                return (
                  <li key={row.token_id || `${row.condition_id}:${row.outcome_index}`} className="flex items-center gap-2.5 px-2.5 py-2 text-[12px]">
                    <span className="min-w-0 flex-1 truncate text-foreground">{row.title}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{row.outcome}</span>
                    <span className="w-14 shrink-0 text-right font-mono text-[11.5px] tabular-nums text-foreground">{compactUsd(num(row.current_value))}</span>
                    <span className={cn("w-14 shrink-0 text-right font-mono text-[11px] tabular-nums", pnl != null && pnl < 0 ? "text-rose-600" : "text-emerald-600")}>
                      {signedUsd(pnl)}
                    </span>
                  </li>
                );
              })
            : [0, 1, 2].map((index) => (
                <li key={index} className="flex h-9 items-center px-2.5">
                  <Bone className="h-3 w-full" />
                </li>
              ))}
        </ul>
      </div>
    </div>
  );
}

/** The newest trade as an alert card; it says "New trade" once one arrives after the page opened. */
function TradeAlert({ kind }) {
  const session = useHolderSession();
  const rows = kind === "trader" ? session?.activity?.rows : session?.rows;
  const latest = rows?.[0];
  const key = latest ? arrivalKey(latest) : "";
  const firstRef = useRef("");
  if (key && !firstRef.current) firstRef.current = key;
  const now = useNow();
  if (!latest) return null;
  const fresh = key !== firstRef.current;
  const sell = String(latest.side || "").toUpperCase() === "SELL";
  const who = kind === "trader" ? session.displayName : traderLabel(latest);
  return (
    <div
      key={key}
      role="status"
      className="absolute -bottom-5 left-4 z-10 hidden w-[19rem] rounded-xl border border-border bg-background p-3 shadow-[0_18px_40px_-12px_rgba(15,23,42,0.35)] animate-in fade-in-0 slide-in-from-bottom-3 duration-500 motion-reduce:animate-none sm:block lg:-left-6"
    >
      <p className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wide text-[#0b7fd4]">
        <span className="relative flex size-2" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#0d99ff] opacity-75 motion-reduce:hidden" />
          <span className="relative inline-flex size-2 rounded-full bg-[#0d99ff]" />
        </span>
        <span className="shrink-0 whitespace-nowrap">{fresh ? "New trade" : "Latest trade"}</span>
        {who ? <span className="min-w-0 truncate font-medium normal-case tracking-normal text-muted-foreground">· {who}</span> : null}
      </p>
      <p className="mt-1.5 text-[13px] font-semibold leading-snug text-foreground">
        {latest.outcome} {sell ? "sell" : "buy"} · {shares(latest.size)} shares at {cents(latest.price)}
      </p>
      <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
        {[usd(tradeValue(latest)), ago(latest.timestamp, now), kind === "trader" ? latest.title : ""].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-5">
      <Bone className="h-5 w-4/5" />
      <div className="grid grid-cols-2 gap-2.5">
        <Bone className="h-20" />
        <Bone className="h-20" />
      </div>
      <Bone className="h-56" />
      <Bone className="h-20" />
    </div>
  );
}

/**
 * The hero's live window on the subject below: prices, trades streaming in and the largest holders
 * for a market; record, latest trades and open positions for a trader.
 */
export function HeroPreview({ kind, holdersFirst = false }) {
  const session = useHolderSession();
  const now = useNow();
  const ready = kind === "trader" ? session?.view === "trader" : session?.view === "market" && !!session.meta;
  const label = kind === "trader" ? session?.displayName : session?.meta?.title;
  const live = kind === "trader" ? session?.activity?.status === "ready" : !!session?.live;

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-xl bg-muted p-2 sm:p-3">
        <div className="relative overflow-hidden rounded-lg">
          <Image
            src={kind === "trader" ? insightsBackdrop : exploreBackdrop}
            alt=""
            fill
            priority
            placeholder="blur"
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="pointer-events-none select-none object-cover"
          />
          <div className="relative p-3 sm:p-6 xl:p-8">
            <div className="overflow-hidden rounded-xl border border-black/10 bg-background shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)] dark:border-white/10">
              <div className="flex h-9 items-center gap-3 border-b border-border bg-muted px-3.5">
                <div className="flex gap-1.5" aria-hidden>
                  <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                  <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                  <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                </div>
                <span className="min-w-0 flex-1 truncate text-center text-[11px] font-medium text-muted-foreground">
                  Holder Terminal{label ? ` · ${label}` : ""}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <span className={cn("relative flex size-2", !live && "opacity-60")} aria-hidden>
                    {live ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/60 motion-reduce:hidden" /> : null}
                    <span className={cn("relative inline-flex size-2 rounded-full", live ? "bg-emerald-500" : "bg-neutral-400")} />
                  </span>
                  {live ? "Live" : "Connecting"}
                </span>
              </div>
              {ready ? kind === "trader" ? <TraderBody now={now} /> : <MarketBody now={now} holdersFirst={holdersFirst} /> : <PreviewSkeleton />}
            </div>
          </div>
        </div>
      </div>
      {ready ? <TradeAlert kind={kind} /> : null}
    </div>
  );
}
