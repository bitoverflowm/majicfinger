"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Search, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

/** @typedef {import("@/lib/dataLake/kalshiSearchSuggestions").KalshiSearchSuggestion} KalshiSearchSuggestion */

const suggestionListVariants = {
  hidden: { opacity: 0, y: -4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
};

const suggestionRowVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.16 } },
};

/** @param {KalshiSearchSuggestion} s */
function suggestionKey(s) {
  return `${s.entity}:${s.ticker}`;
}

/** @param {KalshiSearchSuggestion["entity"]} entity */
function entityTagClass(entity) {
  if (entity === "markets") {
    return "bg-emerald-500/15 text-emerald-900 ring-1 ring-emerald-600/25 dark:bg-emerald-400/15 dark:text-emerald-100 dark:ring-emerald-400/35";
  }
  return "bg-violet-500/15 text-violet-900 ring-1 ring-violet-600/25 dark:bg-violet-400/15 dark:text-violet-100 dark:ring-violet-400/35";
}

/** @typedef {"trade_search" | "market_search"} KalshiPowerToolsParameterMode */

/**
 * @param {{
 *   onSelect: (suggestion: KalshiSearchSuggestion) => void;
 *   disabled?: boolean;
 *   className?: string;
 *   /** When set, limits suggestions: markets only, or one row per market (trades pull). *\/
 *   parameterMode?: KalshiPowerToolsParameterMode;
 * }} props
 */
export function KalshiPowerToolsSearch({
  onSelect,
  disabled = false,
  className,
  parameterMode,
}) {
  const rootRef = useRef(null);
  const suggestAbortRef = useRef(null);
  const suggestSeqRef = useRef(0);
  const debounceRef = useRef(null);

  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [selectLoading, setSelectLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSuggestions = useCallback(async (term) => {
    const mySeq = ++suggestSeqRef.current;
    suggestAbortRef.current?.abort();

    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSuggestOpen(false);
      setSuggestLoading(false);
      return;
    }

    const ac = new AbortController();
    suggestAbortRef.current = ac;
    setSuggestLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ q: trimmed });
      if (parameterMode === "trade_search" || parameterMode === "market_search") {
        params.set("mode", parameterMode);
      }
      const res = await fetch(`/api/data-lake/kalshi-search/suggestions?${params.toString()}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        signal: ac.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (mySeq !== suggestSeqRef.current) return;

      if (!res.ok) {
        setSuggestions([]);
        setSuggestOpen(false);
        setError(typeof data?.error === "string" ? data.error : "Search failed");
        return;
      }

      const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
      setSuggestions(list);
      setSuggestOpen(list.length > 0 || trimmed.length >= 2);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (mySeq !== suggestSeqRef.current) return;
      setSuggestions([]);
      setSuggestOpen(false);
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      if (mySeq === suggestSeqRef.current) {
        setSuggestLoading(false);
      }
    }
  }, [parameterMode]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(q);
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, fetchSuggestions]);

  useEffect(() => {
    setQ("");
    setSuggestions([]);
    setSuggestOpen(false);
  }, [parameterMode]);

  useEffect(() => {
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setSuggestOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleSelect = useCallback(
    async (s) => {
      setSuggestOpen(false);
      setSelectLoading(true);
      setError(null);
      try {
        await onSelect(s);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setSelectLoading(false);
      }
    },
    [onSelect],
  );

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestOpen && suggestions.length > 0) {
        handleSelect(suggestions[0]);
      }
    }
  };

  const busy = disabled || selectLoading;
  const searchHint =
    parameterMode === "market_search"
      ? "Search Kalshi markets by ticker or title — select a market to load data."
      : parameterMode === "trade_search"
        ? "Search Kalshi markets by ticker or title — select a market to pull its trades."
        : "Search Kalshi markets and trades by ticker or title — select a result to load data.";

  return (
    <div className={cn("space-y-2", className)}>
      <motion.div className="flex items-center gap-2">
        <Zap className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Power Tools</h2>
      </motion.div>
      <p className="text-[11px] leading-snug text-muted-foreground">{searchHint}</p>

      <div ref={rootRef} className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 z-[1] flex h-4 w-4 -translate-y-1/2 items-center justify-center text-muted-foreground">
          <AnimatePresence mode="wait" initial={false}>
            {suggestLoading ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
                className="inline-flex"
              >
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              </motion.span>
            ) : (
              <motion.span
                key="search"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="inline-flex"
              >
                <Search className="h-4 w-4" aria-hidden />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <input
          type="search"
          placeholder="Search ticker, title, or event ticker…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => suggestions.length > 0 && setSuggestOpen(true)}
          onKeyDown={onKeyDown}
          disabled={busy}
          autoComplete="off"
          className={cn(
            "flex h-10 w-full rounded-md border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            suggestLoading && "shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]",
            busy && "opacity-70",
          )}
          aria-label="Kalshi historical search"
          aria-busy={suggestLoading || selectLoading}
          aria-autocomplete="list"
          aria-expanded={suggestOpen}
        />

        <AnimatePresence>
          {suggestOpen && !suggestLoading && suggestions.length === 0 && q.trim().length >= 2 ? (
            <motion.p
              key="no-matches"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-popover px-3 py-2 text-left text-xs text-muted-foreground shadow-md"
            >
              No matches found for &ldquo;{q.trim()}&rdquo;
            </motion.p>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {suggestOpen && suggestions.length > 0 ? (
            <motion.ul
              key="suggestions"
              role="listbox"
              variants={suggestionListVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-lg border border-border bg-popover py-1 text-left shadow-md"
            >
              {suggestions.map((s) => {
                const displayEntity =
                  parameterMode === "trade_search" ? "market" : s.entity;
                const displayEntityKind =
                  parameterMode === "trade_search" ? "markets" : s.entity;
                return (
                <motion.li key={suggestionKey(s)} role="option" variants={suggestionRowVariants}>
                  <button
                    type="button"
                    disabled={busy}
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(s)}
                  >
                    <span className="font-medium text-foreground line-clamp-2">{s.title}</span>
                    <span className="text-xs text-muted-foreground">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 font-mono text-[0.65rem] font-medium capitalize tracking-wide",
                          entityTagClass(displayEntityKind),
                        )}
                      >
                        {displayEntity}
                      </span>
                      {s.subtitle ? ` · ${s.subtitle}` : ""}
                    </span>
                  </button>
                </motion.li>
                );
              })}
            </motion.ul>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {suggestLoading ? (
            <motion.p
              key="searching-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full z-40 mt-1 text-center text-xs font-medium text-muted-foreground"
            >
              Searching Kalshi data…
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      {selectLoading ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Loading data into your sheet…
        </p>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
