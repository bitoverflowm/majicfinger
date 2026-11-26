"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { VenueTag } from "@/components/warRoom/VenueTag";
import { priceStreamPairs } from "@/lib/priceStreams";
import { cn } from "@/lib/utils";
import { warRoomHref } from "@/lib/warRoom/href";
import { warRoomMarketId } from "@/lib/warRoom/ids";
import { requestWarRoomMarketPick } from "@/lib/warRoom/pickMarket";

const JARVIS_LIVE_FEED_TAGS: Array<{ venue: string; label?: string }> = [
  { venue: "all-trades", label: "All trades & whales" },
  { venue: "kalshi" },
  { venue: "polymarket" },
  { venue: "equities" },
  { venue: "news" },
  { venue: "weather" },
  { venue: "flight-patterns", label: "Flight patterns" },
  { venue: "satellite", label: "Satellite & incidents" },
  { venue: "binance" },
  { venue: "chainlink" },
  { venue: "holders" },
];

const PLACEHOLDERS = [
  "Search Kalshi markets…",
  "Find Polymarket holders…",
  "Look up a wallet…",
  "Search Binance or Chainlink…",
  "Search the news…",
];

type Hit = {
  id: string;
  label: string;
  detail?: string;
  href: string;
  source: string;
  /** When set, pick scrolls to homepage `#demo` War Room (or `/war-room`) and reveals the market. */
  marketId?: string;
};

function isWallet(q: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(q.trim());
}

function matchesPair(term: string, pair: { id: string; name: string; title: string; description?: string }) {
  const needle = term.toLowerCase();
  return [pair.id, pair.name, pair.title, pair.description || ""].some((part) =>
    String(part).toLowerCase().includes(needle),
  );
}

function kalshiMarketHit(ticker: string | null | undefined) {
  const raw = String(ticker || "").trim();
  if (!raw) return { href: "/war-room" as const, marketId: undefined as string | undefined };
  const marketId = warRoomMarketId("kalshi", raw);
  return { href: warRoomHref({ market: marketId }), marketId };
}

function polyMarketHit(conditionId: string | null | undefined) {
  const raw = String(conditionId || "").trim();
  if (!raw || !/^0x[a-fA-F0-9]{64}$/i.test(raw)) {
    return { href: "/war-room" as const, marketId: undefined as string | undefined };
  }
  const marketId = warRoomMarketId("polymarket", raw);
  return { href: warRoomHref({ market: marketId }), marketId };
}

function pushHit(list: Hit[], hit: Hit, seen: Set<string>) {
  if (seen.has(hit.id)) return;
  seen.add(hit.id);
  list.push(hit);
}

/** Round-robin by source so Kalshi embeddings can't fill the whole list. */
function interleaveHits(hits: Hit[], limit = 12): Hit[] {
  const buckets = new Map<string, Hit[]>();
  for (const hit of hits) {
    const key = hit.source || "Other";
    const list = buckets.get(key);
    if (list) list.push(hit);
    else buckets.set(key, [hit]);
  }
  // Prefer a stable, mixed order: markets first, then holders/traders, feeds, news.
  const preferred = [
    "Kalshi",
    "Polymarket",
    "News",
    "Holders",
    "Kalshi Trader",
    "Binance",
    "Chainlink",
  ];
  const keys = [
    ...preferred.filter((k) => buckets.has(k)),
    ...[...buckets.keys()].filter((k) => !preferred.includes(k)),
  ];
  const queues = keys.map((k) => [...(buckets.get(k) || [])]);
  const out: Hit[] = [];
  while (out.length < limit) {
    let added = false;
    for (const q of queues) {
      if (!q.length || out.length >= limit) continue;
      out.push(q.shift()!);
      added = true;
    }
    if (!added) break;
  }
  return out;
}

/** Spectrum “Loading State Drive”–inspired pixel grid — secondary/muted only. */
function JarvisSearchLoader({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsed(Math.max(0, (Date.now() - startedAt) / 1000));
    }, 100);
    return () => window.clearInterval(id);
  }, [startedAt]);

  return (
    <div className="flex items-center gap-3 px-3 py-3" aria-live="polite" aria-busy="true">
      <div className="grid size-7 shrink-0 grid-cols-4 gap-0.5" aria-hidden>
        {Array.from({ length: 16 }).map((_, i) => (
          <motion.span
            key={i}
            className="block size-1.5 rounded-[1px] bg-secondary"
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.85, 1, 0.85] }}
            transition={{
              duration: 1.05,
              repeat: Infinity,
              ease: "easeInOut",
              delay: (i % 4) * 0.08 + Math.floor(i / 4) * 0.05,
            }}
          />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <motion.p
          className="text-xs font-medium text-muted-foreground"
          animate={{ opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          Searching markets, holders, news, and feeds…
        </motion.p>
        <p className="mt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground/80">
          {elapsed.toFixed(1)}s
        </p>
      </div>
    </div>
  );
}

export function JarvisNavSearch({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStartedAt, setLoadingStartedAt] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (query || focused) return;
    const id = window.setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [query, focused]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    const my = ++seq.current;
    const ac = new AbortController();
    setLoading(true);
    setLoadingStartedAt(Date.now());
    const t = window.setTimeout(async () => {
      try {
        const next: Hit[] = [];
        const seen = new Set<string>();

        if (isWallet(term)) {
          pushHit(
            next,
            {
              id: `wallet-${term.toLowerCase()}`,
              label: `Polymarket wallet ${term.slice(0, 6)}…${term.slice(-4)}`,
              detail: term,
              href: "/polymarket-wallet-tracker",
              source: "Holders",
            },
            seen,
          );
        }

        for (const pair of priceStreamPairs("binance")) {
          if (!matchesPair(term, pair)) continue;
          pushHit(
            next,
            {
              id: `binance-${pair.id}`,
              label: pair.title,
              detail: pair.description || "Binance spot",
              href: "/#data-sources",
              source: "Binance",
            },
            seen,
          );
        }
        for (const pair of priceStreamPairs("chainlink")) {
          if (!matchesPair(term, pair)) continue;
          pushHit(
            next,
            {
              id: `chainlink-${pair.id}`,
              label: pair.title,
              detail: pair.description || "Chainlink feed",
              href: "/#data-sources",
              source: "Chainlink",
            },
            seen,
          );
        }

        const traderEligible = !/\s/.test(term);
        const [kalshiEmbedRes, kalshiSuggestRes, kalshiTraderRes, polyRes] = await Promise.allSettled([
          fetch(
            `/api/integrations/kalshi-live/search/embedding-suggestions?${new URLSearchParams({ q: term })}`,
            { signal: ac.signal, credentials: "same-origin" },
          ),
          fetch(
            `/api/integrations/kalshi-live/search/suggestions?${new URLSearchParams({
              q: term,
              limit: "8",
            })}`,
            { signal: ac.signal, credentials: "same-origin" },
          ),
          traderEligible
            ? fetch(
                `/api/integrations/kalshi-live/search/trader-suggestions?${new URLSearchParams({ q: term })}`,
                { signal: ac.signal, credentials: "same-origin" },
              )
            : Promise.resolve(null),
          fetch(
            `/api/integrations/polymarket?${new URLSearchParams({
              query: "metadataSuggestions",
              q: term,
              limit_per_type: "6",
              search_profiles: "true",
              keep_closed_markets: "1",
            })}`,
            { signal: ac.signal, credentials: "same-origin" },
          ),
        ]);
        if (my !== seq.current) return;

        if (kalshiEmbedRes.status === "fulfilled" && kalshiEmbedRes.value.ok) {
          const body = await kalshiEmbedRes.value.json().catch(() => ({}));
          for (const row of body.suggestions || []) {
            const markets = Array.isArray(row.markets) ? row.markets : [];
            const nestedTicker = String(markets[0]?.ticker || "").trim();
            const ticker = nestedTicker || String(row.ticker || "").trim();
            if (!ticker && !row.title) continue;
            const pick = kalshiMarketHit(ticker);
            pushHit(
              next,
              {
                id: `kalshi-embed-${ticker || row.title}`,
                label: String(row.title || ticker),
                detail: nestedTicker && nestedTicker !== ticker ? nestedTicker : row.subtitle || ticker,
                href: pick.href,
                marketId: pick.marketId,
                source: "Kalshi",
              },
              seen,
            );
          }
        }

        if (kalshiSuggestRes.status === "fulfilled" && kalshiSuggestRes.value.ok) {
          const body = await kalshiSuggestRes.value.json().catch(() => ({}));
          for (const row of body.suggestions || []) {
            const ticker = String(row.ticker || "").trim();
            if (!ticker) continue;
            const pick = kalshiMarketHit(ticker);
            pushHit(
              next,
              {
                id: `kalshi-${ticker}`,
                label: String(row.title || ticker),
                detail: row.subtitle || ticker,
                href: pick.href,
                marketId: pick.marketId,
                source: "Kalshi",
              },
              seen,
            );
          }
        }

        if (
          kalshiTraderRes.status === "fulfilled" &&
          kalshiTraderRes.value &&
          kalshiTraderRes.value.ok
        ) {
          const body = await kalshiTraderRes.value.json().catch(() => ({}));
          for (const row of body.suggestions || []) {
            const nickname = String(row.nickname || "").trim();
            if (!nickname) continue;
            pushHit(
              next,
              {
                id: `kalshi-trader-${nickname}`,
                label: nickname,
                detail: "Kalshi trader",
                href: "/kalshi-live-data",
                source: "Kalshi Trader",
              },
              seen,
            );
          }
        }

        if (polyRes.status === "fulfilled" && polyRes.value.ok) {
          const body = await polyRes.value.json().catch(() => ({}));
          for (const row of body.suggestions || []) {
            const entity = String(row.entity || "market");
            if (entity === "tag") continue;
            if (entity === "profile") {
              const wallet = String(row.proxyWallet || row.id || "").trim();
              pushHit(
                next,
                {
                  id: `poly-profile-${wallet || row.title}`,
                  label: String(row.title || row.pseudonym || wallet || "Polymarket trader"),
                  detail: wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Holder profile",
                  href: "/polymarket-holder-terminal",
                  source: "Holders",
                },
                seen,
              );
              continue;
            }
            const conditionId = String(row.conditionId || (entity === "market" ? row.id : "") || "").trim();
            const pick = polyMarketHit(conditionId);
            pushHit(
              next,
              {
                id: `poly-${conditionId || row.id || row.slug || row.title}`,
                label: String(row.title || row.slug || "Polymarket market"),
                detail: row.subtitle || (row.closed ? "Closed" : undefined),
                href: pick.href,
                marketId: pick.marketId,
                source: "Polymarket",
              },
              seen,
            );
          }
        }

        pushHit(
          next,
          {
            id: `news-${term.toLowerCase()}`,
            label: `News for “${term}”`,
            detail: "Open news archive",
            href: `/news-archive?q=${encodeURIComponent(term)}`,
            source: "News",
          },
          seen,
        );

        setHits(interleaveHits(next, 12));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      } finally {
        if (my === seq.current) setLoading(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [query]);

  const open = focused;
  const term = query.trim();
  const searching = term.length >= 2;
  const placeholder = PLACEHOLDERS[placeholderIndex];
  const newsHref = useMemo(
    () => (term ? `/news-archive?q=${encodeURIComponent(term)}` : "/news"),
    [term],
  );

  return (
    <div ref={wrapRef} className={cn("relative w-full max-w-[28rem]", className)}>
      <div className="flex h-9 items-center gap-2 rounded-full border border-border bg-muted/60 px-3 text-sm shadow-none">
        <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="relative min-w-0 flex-1">
          {!query && !focused ? (
            <AnimatePresence mode="wait">
              <motion.span
                key={placeholder}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                className="pointer-events-none absolute inset-0 truncate text-muted-foreground"
              >
                {placeholder}
              </motion.span>
            </AnimatePresence>
          ) : null}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const top = hits[0];
                if (
                  top?.marketId &&
                  requestWarRoomMarketPick(top.marketId, {
                    title: top.label,
                    venue: top.source,
                    detail: top.detail,
                  })
                ) {
                  window.setTimeout(() => setFocused(false), 0);
                  return;
                }
                window.location.assign(top?.href || newsHref);
              }
              if (e.key === "Escape") {
                setFocused(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
            aria-label="Search markets, holders, news, and price feeds"
            className="relative z-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-transparent"
            autoComplete="off"
          />
        </div>
      </div>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          {searching ? (
            loading && hits.length === 0 ? (
              <JarvisSearchLoader startedAt={loadingStartedAt || Date.now()} />
            ) : hits.length === 0 ? (
              <Link
                href={newsHref}
                className="block px-3 py-2.5 text-sm hover:bg-accent"
                onClick={() => setFocused(false)}
              >
                Search news for “{term}”
              </Link>
            ) : (
              <ul className="max-h-80 overflow-y-auto py-1">
                {hits.map((hit) => (
                  <li key={hit.id}>
                    <Link
                      href={hit.href}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-accent"
                      onClick={(e) => {
                        if (
                          hit.marketId &&
                          requestWarRoomMarketPick(hit.marketId, {
                            title: hit.label,
                            venue: hit.source,
                            detail: hit.detail,
                          })
                        ) {
                          e.preventDefault();
                          // Defer blur/close so React teardown cannot block the first scroll frame.
                          window.setTimeout(() => setFocused(false), 0);
                          return;
                        }
                        setFocused(false);
                      }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{hit.label}</span>
                        {hit.detail ? (
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                            {hit.detail}
                          </span>
                        ) : null}
                      </span>
                      <VenueTag venue={hit.source} />
                    </Link>
                  </li>
                ))}
              </ul>
            )
          ) : null}
          <div
            className={cn(
              "bg-muted/40 text-[12px] leading-snug text-muted-foreground",
              searching ? "border-t border-border" : "",
            )}
          >
            <p className="px-3 py-2.5">
              Search anything, we will find the right market, ticker, news, data feed, and Jarvis will do the rest
            </p>
            <div className="flex items-start gap-2 border-t border-border px-3 py-2.5">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-secondary" aria-hidden />
              <div className="min-w-0 space-y-1.5">
                <p className="font-semibold text-foreground">Jarvis AI — Coming Soon</p>
                <p>Zero-prompt intelligence that learns your markets and brings you moving signals before you even ask.</p>
                <div className="space-y-1">
                  <p>Live feeds:</p>
                  <div className="flex flex-wrap gap-1">
                    {JARVIS_LIVE_FEED_TAGS.map((tag) => (
                      <VenueTag key={tag.venue} venue={tag.venue} label={tag.label} />
                    ))}
                  </div>
                </div>
                <p>Available in-browser or via MCP for your favorite agent.</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
