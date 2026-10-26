"use client";

/* eslint-disable @next/next/no-img-element */
import { Check, Loader2, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { FeatureWindow, useInView, useReducedMotion } from "./feature-kit";

type Source = {
  id: string;
  name: string;
  detail: string;
  logo: string;
  tile: string;
  column: string;
  color: string;
  rows: number;
  values: readonly string[];
};

const SOURCES: readonly Source[] = [
  {
    id: "kalshi",
    name: "Kalshi",
    detail: "Markets, trades, order books",
    logo: "/kalshi.png",
    tile: "bg-[#28CC95]",
    column: "kalshi_yes",
    color: "#28CC95",
    rows: 24180,
    values: ["62¢", "63¢", "63¢", "65¢", "66¢", "66¢", "68¢"],
  },
  {
    id: "polymarket",
    name: "Polymarket",
    detail: "Prices and order books",
    logo: "/polymarket.png",
    tile: "bg-[#2E5CFF]",
    column: "poly_yes",
    color: "#2E5CFF",
    rows: 18412,
    values: ["61¢", "61¢", "62¢", "64¢", "64¢", "65¢", "67¢"],
  },
  {
    id: "chainlink",
    name: "Chainlink",
    detail: "On-chain price feeds",
    logo: "/chainlink.png",
    tile: "bg-[#375BD2]",
    column: "btc_usd",
    color: "#375BD2",
    rows: 8640,
    values: ["97,412", "97,380", "97,455", "97,610", "97,702", "97,688", "97,840"],
  },
  {
    id: "binance",
    name: "Binance",
    detail: "Live spot prices",
    logo: "/binance.jpeg",
    tile: "bg-black",
    column: "eth_usdt",
    color: "#F0B90B",
    rows: 86400,
    values: ["3,612", "3,609", "3,618", "3,627", "3,631", "3,629", "3,644"],
  },
  {
    id: "gecko",
    name: "GeckoTerminal",
    detail: "DEX pools and tokens",
    logo: "/geckoDex1.png",
    tile: "bg-black",
    column: "dex_vol",
    color: "#8B5CF6",
    rows: 4320,
    values: ["$1.2M", "$1.3M", "$1.1M", "$1.6M", "$1.9M", "$1.8M", "$2.2M"],
  },
  {
    id: "x",
    name: "X",
    detail: "Social mentions",
    logo: "/x.png",
    tile: "bg-black",
    column: "x_mentions",
    color: "#64748b",
    rows: 2210,
    values: ["412", "388", "540", "1,204", "1,880", "1,402", "2,316"],
  },
];

const TIMES = ["09:00", "09:05", "09:10", "09:15", "09:20", "09:25", "09:30"];

type Status = "off" | "connecting" | "on";

function useCountUp(target: number, durationMs = 700) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(origin + (target - origin) * eased);
      setValue(next);
      from.current = next;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return value;
}

export function ConnectDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const reduced = useReducedMotion();
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [manual, setManual] = useState(false);
  const timers = useRef<number[]>([]);

  const connect = (id: string, delay = 650) => {
    setStatus((s) => ({ ...s, [id]: "connecting" }));
    timers.current.push(window.setTimeout(() => setStatus((s) => ({ ...s, [id]: "on" })), delay));
  };

  useEffect(() => {
    if (reduced) {
      setStatus(Object.fromEntries(SOURCES.map((s) => [s.id, "on" as Status])));
      return;
    }
    if (!inView || manual) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      setStatus({});
      SOURCES.forEach((s, i) => {
        timers.current.push(window.setTimeout(() => !cancelled && connect(s.id), 900 + i * 1100));
      });
      timers.current.push(window.setTimeout(run, 900 + SOURCES.length * 1100 + 3600));
    };
    run();
    return () => {
      cancelled = true;
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
  }, [inView, manual, reduced]);

  const toggle = (id: string) => {
    if (!manual) {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
      setManual(true);
    }
    const current = status[id] ?? "off";
    if (current === "on") setStatus((s) => ({ ...s, [id]: "off" }));
    else if (current === "off") connect(id, 550);
  };

  const live = SOURCES.filter((s) => status[s.id] === "on");
  const rowCount = useCountUp(live.reduce((sum, s) => sum + s.rows, 0));
  const connectingCount = useMemo(
    () => SOURCES.filter((s) => status[s.id] === "connecting").length,
    [status],
  );

  return (
    <div ref={rootRef} className="size-full">
      <FeatureWindow title="Lychee Terminal" className="size-full">
        <div className="flex w-[36%] min-w-[10.5rem] shrink-0 flex-col border-r border-border">
          <div className="flex items-center justify-between px-3.5 pb-2 pt-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Sources</p>
            <span className="text-[11px] text-muted-foreground">
              {live.length}/{SOURCES.length}
            </span>
          </div>
          <ul className="flex flex-col gap-1 px-2 pb-3">
            {SOURCES.map((source) => {
              const s = status[source.id] ?? "off";
              return (
                <li key={source.id}>
                  <button
                    type="button"
                    onClick={() => toggle(source.id)}
                    className={cn(
                      "group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted",
                      s === "on" && "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md p-1 transition-[filter,opacity] duration-500",
                        source.tile,
                        s === "off" && "opacity-60 grayscale",
                      )}
                    >
                      <img src={source.logo} alt="" className="size-full rounded-sm object-contain" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-primary">{source.name}</span>
                      <span className="block truncate text-[10.5px] text-muted-foreground">{source.detail}</span>
                    </span>
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                        s === "on"
                          ? "border-transparent bg-[#10b981] text-white"
                          : "border-border text-muted-foreground group-hover:border-neutral-400",
                      )}
                    >
                      {s === "on" ? (
                        <Check className="size-3" strokeWidth={3} />
                      ) : s === "connecting" ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Plus className="size-3" />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-primary">fed-cut-december</p>
              <p className="text-[10.5px] text-muted-foreground">
                <span className="font-mono tabular-nums text-primary">{rowCount.toLocaleString()}</span> rows ·{" "}
                {live.length || "no"} source{live.length === 1 ? "" : "s"} joined on time
              </p>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium transition-colors",
                connectingCount
                  ? "bg-[#2f6fed]/10 text-[#2f6fed]"
                  : live.length
                    ? "bg-[#10b981]/10 text-[#0f9f6e]"
                    : "bg-muted text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  connectingCount ? "animate-pulse bg-[#2f6fed]" : live.length ? "bg-[#10b981]" : "bg-neutral-400",
                )}
              />
              {connectingCount ? "Syncing" : live.length ? "Live" : "Waiting"}
            </span>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div className="flex h-full text-[11px]">
              <Column header="time" color="#94a3b8" values={TIMES} open mono narrow />
              {SOURCES.map((source) => (
                <Column
                  key={source.id}
                  header={source.column}
                  color={source.color}
                  values={source.values}
                  open={status[source.id] === "on"}
                  loading={status[source.id] === "connecting"}
                  mono
                />
              ))}
            </div>
            {live.length === 0 && connectingCount === 0 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center pl-16">
                <p className="max-w-[12rem] text-center text-[11px] leading-relaxed text-muted-foreground">
                  Pick a source and its data lands here, lined up with everything else.
                </p>
              </div>
            ) : null}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />
          </div>
        </div>
      </FeatureWindow>
    </div>
  );
}

function Column({
  header,
  color,
  values,
  open,
  loading,
  mono,
  narrow,
}: {
  header: string;
  color: string;
  values: readonly string[];
  open: boolean;
  loading?: boolean;
  mono?: boolean;
  narrow?: boolean;
}) {
  const visible = open || loading;
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden border-r border-border transition-[max-width,opacity] duration-500 ease-landing-smooth",
        visible ? "max-w-[6rem] opacity-100" : "max-w-0 border-r-0 opacity-0",
      )}
    >
      <div className={narrow ? "w-[3.25rem]" : "w-[5.25rem]"}>
        <div className="flex h-7 items-center gap-1 border-b border-border bg-muted px-1.5">
          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate font-mono text-[9.5px] text-muted-foreground">{header}</span>
        </div>
        {values.map((value, i) => (
          <div key={i} className="flex h-7 items-center border-b border-border px-1.5">
            {loading ? (
              <span
                className="h-2 w-10 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ) : (
              <span
                className={cn(
                  "truncate text-primary transition-all duration-500",
                  mono && "font-mono tabular-nums",
                  open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
                )}
                style={{ transitionDelay: open ? `${120 + i * 55}ms` : "0ms" }}
              >
                {value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
