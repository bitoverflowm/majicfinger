"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";

const PLACEHOLDERS = [
  "Search Kalshi markets…",
  "Find Polymarket holders…",
  "Look up a wallet…",
  "Search the news…",
  "Ask Jarvis about Fed rates…",
];

type Hit = {
  id: string;
  label: string;
  href: string;
  source: string;
};

function isWallet(q: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(q.trim());
}

export function JarvisNavSearch({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
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
    const t = window.setTimeout(async () => {
      try {
        const next: Hit[] = [];
        if (isWallet(term)) {
          next.push({
            id: `wallet-${term}`,
            label: `Polymarket wallet ${term.slice(0, 6)}…${term.slice(-4)}`,
            href: `/polymarket-wallet-tracker`,
            source: "Holders",
          });
        }
        const [kalshiRes, polyRes] = await Promise.allSettled([
          fetch(
            `/api/integrations/kalshi-live/search/embedding-suggestions?${new URLSearchParams({ q: term })}`,
            { signal: ac.signal, credentials: "same-origin" },
          ),
          fetch(
            `/api/integrations/polymarket?${new URLSearchParams({
              query: "metadataSuggestions",
              q: term,
              limit_per_type: "5",
              search_profiles: "true",
            })}`,
            { signal: ac.signal, credentials: "same-origin" },
          ),
        ]);
        if (my !== seq.current) return;
        if (kalshiRes.status === "fulfilled" && kalshiRes.value.ok) {
          const body = await kalshiRes.value.json().catch(() => ({}));
          for (const row of body.suggestions || []) {
            next.push({
              id: `kalshi-${row.ticker || row.title}`,
              label: row.title || row.ticker,
              href: "/kalshi-live-data",
              source: "Kalshi",
            });
          }
        }
        if (polyRes.status === "fulfilled" && polyRes.value.ok) {
          const body = await polyRes.value.json().catch(() => ({}));
          for (const row of body.suggestions || []) {
            const entity = String(row.entity || "market");
            const href =
              entity === "profile"
                ? "/polymarket-holder-terminal"
                : "/polymarket-live-data";
            next.push({
              id: `poly-${row.id || row.slug || row.title}`,
              label: row.title || row.slug || "Polymarket market",
              href,
              source: entity === "profile" ? "Holders" : "Polymarket",
            });
          }
        }
        next.push({
          id: `news-${term}`,
          label: `News for “${term}”`,
          href: `/news-archive?q=${encodeURIComponent(term)}`,
          source: "News",
        });
        const seen = new Set<string>();
        setHits(next.filter((hit) => (seen.has(hit.id) ? false : (seen.add(hit.id), true))).slice(0, 10));
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

  const open = focused && (loading || hits.length > 0 || query.trim().length >= 2);
  const placeholder = PLACEHOLDERS[placeholderIndex];
  const newsHref = useMemo(
    () => (query.trim() ? `/news-archive?q=${encodeURIComponent(query.trim())}` : "/news"),
    [query],
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
                window.location.assign(hits[0]?.href || newsHref);
              }
              if (e.key === "Escape") {
                setFocused(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
            aria-label="Search markets, holders, and news"
            className="relative z-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-transparent"
            autoComplete="off"
          />
        </div>
      </div>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          {loading && hits.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">Searching Kalshi, Polymarket, and news…</p>
          ) : hits.length === 0 ? (
            <Link href={newsHref} className="block px-3 py-2.5 text-sm hover:bg-accent" onClick={() => setFocused(false)}>
              Search news for “{query.trim()}”
            </Link>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <Link
                    href={hit.href}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => setFocused(false)}
                  >
                    <span className="min-w-0 truncate">{hit.label}</span>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      {hit.source}
                    </span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/jarvis"
                  className="block border-t border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => setFocused(false)}
                >
                  Jarvis research is next — this search already covers markets, holders, and news.
                </Link>
              </li>
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
