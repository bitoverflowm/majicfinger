"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { HubKalshiLiveDemoMockup } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoMockup";
import { cn } from "@/lib/utils";

const DEMO_MAX_TICKERS = 2;

type HubKalshiLiveDemoProps = {
  className?: string;
};

/**
 * Contained Kalshi Live hub demo: MarketTickerSearch (max 2) → live market metadata JSON.
 * Local state only — does not mount dashboard connect/sheets.
 */
export function HubKalshiLiveDemo({ className }: HubKalshiLiveDemoProps) {
  const [tickersValue, setTickersValue] = useState("");
  const [markets, setMarkets] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  const tickersKey = useMemo(
    () =>
      tickersValue
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, DEMO_MAX_TICKERS)
        .join(","),
    [tickersValue],
  );

  const tickers = useMemo(
    () => (tickersKey ? tickersKey.split(",") : []),
    [tickersKey],
  );

  useEffect(() => {
    abortRef.current?.abort();
    const mySeq = ++seqRef.current;

    if (tickers.length === 0) {
      setMarkets(null);
      setError(null);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      tickers: tickersKey,
      limit: String(tickers.length),
    });

    fetch(`/api/integrations/kalshi-live/markets?${params.toString()}`, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      signal: ac.signal,
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (mySeq !== seqRef.current) return;
        if (!res.ok) {
          setMarkets(null);
          setError(
            typeof body?.error === "string"
              ? body.error
              : res.status === 429
                ? "Too many requests — slow down and try again."
                : "Failed to load market metadata",
          );
          return;
        }
        const list = Array.isArray(body?.markets) ? body.markets : [];
        setMarkets(list);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (mySeq !== seqRef.current) return;
        setMarkets(null);
        setError(e instanceof Error ? e.message : "Failed to load market metadata");
      })
      .finally(() => {
        if (mySeq === seqRef.current) setLoading(false);
      });

    return () => {
      ac.abort();
    };
  }, [tickers, tickersKey]);

  const jsonText = useMemo(() => {
    if (!markets) return "";
    return JSON.stringify(markets, null, 2);
  }, [markets]);

  return (
    <div className={cn("w-full", className)}>
      <HubKalshiLiveDemoMockup>
        <div className="flex w-full flex-col gap-5 p-4 sm:p-6">
          <div className="space-y-1.5">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span>Live demo · up to {DEMO_MAX_TICKERS} markets</span>
              <Link
                href="/#pricing"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Sign up for unlimited markets
              </Link>
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              Search by ticker or natural language. Select a series to pick markets. Metadata
              loads as JSON — no filters or column pickers in this preview.
            </p>
          </div>

          <MarketTickerSearch
            value={tickersValue}
            onChange={setTickersValue}
            maxTickers={DEMO_MAX_TICKERS}
            dataSource="live"
            searchScope="markets"
            showCutoffNotes={false}
            required={false}
            className="w-full"
          />

          <div className="min-h-[12rem] overflow-hidden rounded-xl border border-border/70 bg-muted/20">
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">Market metadata</p>
              {loading ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Loading…
                </span>
              ) : markets ? (
                <span className="text-xs text-muted-foreground">
                  {markets.length} market{markets.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>

            {error ? (
              <p className="px-3 py-4 text-sm text-destructive">{error}</p>
            ) : !tickers.length ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Select a market to preview its Kalshi metadata JSON.
              </p>
            ) : loading && !markets ? (
              <div className="flex items-center justify-center gap-2 px-3 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Fetching market metadata…
              </div>
            ) : (
              <pre className="max-h-[22rem] overflow-auto px-3 py-3 font-mono text-[11px] leading-relaxed text-foreground sm:text-xs">
                {jsonText}
              </pre>
            )}
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
            This preview is limited to search and raw market metadata.{" "}
            <Link
              href="/#pricing"
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              Register for full access
            </Link>{" "}
            to pull trades, order books, candlesticks, charts, exports, and dashboards.
          </p>
        </div>
      </HubKalshiLiveDemoMockup>
    </div>
  );
}
