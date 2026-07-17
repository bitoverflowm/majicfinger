"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Search, Zap } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** @typedef {"markets" | "series"} KalshiLiveSearchScope */

/** @typedef {{ entity: string; ticker: string; title?: string; subtitle?: string; status?: string }} KalshiLiveSearchSuggestion */

const suggestionListVariants = {
  hidden: { opacity: 0, y: -4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
};

const suggestionRowVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.16 } },
};

/** @param {KalshiLiveSearchSuggestion} s */
function suggestionKey(s) {
  return `${s.entity}:${s.ticker}`;
}

function entityTagClass(entity) {
  if (entity === "series") {
    return "bg-sky-500/15 text-sky-900 ring-1 ring-sky-600/25 dark:bg-sky-400/15 dark:text-sky-100 dark:ring-sky-400/35";
  }
  return "bg-emerald-500/15 text-emerald-900 ring-1 ring-emerald-600/25 dark:bg-emerald-400/15 dark:text-emerald-100 dark:ring-emerald-400/35";
}

const SCOPE_HINT = {
  markets:
    "Search by any word, market ticker, or event ticker — pick a result to load markets data.",
  series:
    "Search by title, category, tags, or series ticker — we query Kalshi’s series list and show matches.",
};

const SCOPE_PLACEHOLDER = {
  markets: "Search title, market ticker, event ticker…",
  series: "Search series title, category, tags, ticker…",
};

/**
 * @param {{
 *   onSelectMarket: (suggestion: KalshiLiveSearchSuggestion) => void | Promise<void>;
 *   onSelectSeries: (suggestion: KalshiLiveSearchSuggestion) => void | Promise<void>;
 *   disabled?: boolean;
 *   className?: string;
 *   scope?: KalshiLiveSearchScope;
 *   onScopeChange?: (scope: KalshiLiveSearchScope) => void;
 *   variant?: "default" | "embedded";
 *   initialQuery?: string;
 *   inputClassName?: string;
 *   autoFocus?: boolean;
 *   onFocus?: () => void;
 * }} props
 */
export function KalshiLivePowerToolsSearch({
  onSelectMarket,
  onSelectSeries,
  disabled = false,
  className,
  scope: controlledScope,
  onScopeChange,
  variant = "default",
  initialQuery = "",
  inputClassName,
  autoFocus = false,
  onFocus,
}) {
  const [internalScope, setInternalScope] = useState(/** @type {KalshiLiveSearchScope} */ ("markets"));
  const scope = controlledScope ?? internalScope;

  const setScope = useCallback(
    (next) => {
      if (onScopeChange) onScopeChange(next);
      else setInternalScope(next);
    },
    [onScopeChange],
  );

  const debounceRef = useRef(null);
  const suggestAbortRef = useRef(null);
  const suggestSeqRef = useRef(0);
  const inputRef = useRef(null);

  const [q, setQ] = useState(() => (typeof initialQuery === "string" ? initialQuery : ""));
  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [selectLoading, setSelectLoading] = useState(false);
  const [error, setError] = useState(null);

  const minQueryLen = 2;
  const suggestionsPath =
    scope === "series"
      ? "/api/integrations/kalshi-live/search/series-suggestions"
      : "/api/integrations/kalshi-live/search/suggestions";

  const fetchSuggestions = useCallback(
    async (term) => {
      const mySeq = ++suggestSeqRef.current;
      suggestAbortRef.current?.abort();

      const trimmed = term.trim();
      if (trimmed.length < minQueryLen) {
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
        if (scope === "markets") params.set("mode", "market_search");
        const res = await fetch(`${suggestionsPath}?${params.toString()}`, {
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
        setSuggestOpen(list.length > 0 || trimmed.length >= minQueryLen);
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
    },
    [minQueryLen, scope, suggestionsPath],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(q);
    }, scope === "series" ? 400 : 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, fetchSuggestions, scope]);

  const handleScopeChange = (value) => {
    const next = value === "series" ? "series" : "markets";
    setScope(next);
    setQ("");
    setSuggestions([]);
    setSuggestOpen(false);
    setError(null);
  };

  const handleSelect = useCallback(
    async (s) => {
      setSuggestOpen(false);
      setSelectLoading(true);
      setError(null);
      try {
        if (s.entity === "series") await onSelectSeries(s);
        else await onSelectMarket(s);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setSelectLoading(false);
      }
    },
    [onSelectMarket, onSelectSeries],
  );

  useEffect(() => {
    if (!autoFocus) return;
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [autoFocus]);

  const busy = disabled || selectLoading;
  const entityTagLabel = scope === "series" ? "Series" : "Market";
  const isEmbedded = variant === "embedded";

  return (
    <div className={cn("space-y-2", className)}>
      {isEmbedded ? null : (
        <>
          <motion.div className="flex items-center gap-2">
            <Zap className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Power Tools</h2>
          </motion.div>
          <p className="text-[11px] leading-snug text-muted-foreground">{SCOPE_HINT[scope]}</p>
        </>
      )}

      <div className="relative flex gap-2">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 z-[1] flex h-4 w-4 -translate-y-1/2 items-center justify-center text-muted-foreground">
            {suggestLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
          </span>
          <input
            ref={inputRef}
            type="search"
            placeholder={
              isEmbedded
                ? "Search by ticker, title, or event…"
                : SCOPE_PLACEHOLDER[scope]
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => {
              onFocus?.();
              if (suggestions.length > 0) setSuggestOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (suggestOpen && suggestions.length > 0) handleSelect(suggestions[0]);
              }
            }}
            disabled={busy}
            autoComplete="off"
            className={cn(
              "flex h-10 w-full rounded-md border border-border bg-background py-2 pl-10 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isEmbedded ? "h-11 rounded-xl pr-12" : "pr-3",
              busy && "opacity-70",
              inputClassName,
            )}
            aria-label={scope === "series" ? "Kalshi Live series search" : "Kalshi Live market search"}
          />

          <AnimatePresence>
            {suggestOpen && !suggestLoading && suggestions.length === 0 && q.trim().length >= minQueryLen ? (
              <motion.p
                key="no-matches"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-md"
              >
                No matches for &ldquo;{q.trim()}&rdquo;
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
                className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-lg border border-border bg-popover py-1 shadow-md"
              >
                {suggestions.map((s) => (
                  <motion.li key={suggestionKey(s)} role="option" variants={suggestionRowVariants}>
                    <button
                      type="button"
                      disabled={busy}
                      className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(s)}
                    >
                      <span className="font-medium text-foreground line-clamp-2">{s.title || s.ticker}</span>
                      {s.subtitle ? (
                        <span className="text-xs text-muted-foreground line-clamp-1">{s.subtitle}</span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono text-[0.65rem] font-medium tracking-wide",
                            entityTagClass(s.entity),
                          )}
                        >
                          {entityTagLabel}
                        </span>
                        {s.ticker ? ` · ${s.ticker}` : ""}
                      </span>
                    </button>
                  </motion.li>
                ))}
              </motion.ul>
            ) : null}
          </AnimatePresence>
        </div>

        <Select value={scope} onValueChange={handleScopeChange} disabled={busy}>
          <SelectTrigger
            className={cn(
              "w-[7.25rem] shrink-0 text-xs",
              isEmbedded ? "h-9" : "h-10",
            )}
            aria-label="Search scope"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="markets" className="text-xs">
              Markets
            </SelectItem>
            <SelectItem value="series" className="text-xs">
              Series
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectLoading ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Loading into your sheet…
        </p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
