"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Search } from "lucide-react";

import {
  formatPolymarketVolume,
  isPolymarketPublicSearchEligible,
  isPolymarketSelectionMatch,
  polymarketSelectionTokenSet,
  polymarketSuggestionStatusTags,
} from "@/lib/polymarketLive/polymarketPublicSearch";
import { cn } from "@/lib/utils";

/** @typedef {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion} PolymarketPublicSearchSuggestion */

const suggestionListVariants = {
  hidden: { opacity: 0, y: -4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
};

const suggestionRowVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.16 } },
};

/**
 * @param {PolymarketPublicSearchSuggestion["entity"]} entity
 */
function entityTagClass(entity) {
  if (entity === "event") {
    return "bg-emerald-500/15 text-emerald-900 ring-1 ring-emerald-600/25 dark:bg-emerald-400/15 dark:text-emerald-100 dark:ring-emerald-400/35";
  }
  if (entity === "market") {
    return "bg-violet-500/15 text-violet-900 ring-1 ring-violet-600/25 dark:bg-violet-400/15 dark:text-violet-100 dark:ring-violet-400/35";
  }
  if (entity === "profile") {
    return "bg-sky-500/15 text-sky-900 ring-1 ring-sky-600/25 dark:bg-sky-400/15 dark:text-sky-100 dark:ring-sky-400/35";
  }
  return "bg-amber-500/15 text-amber-950 ring-1 ring-amber-600/25 dark:bg-amber-400/15 dark:text-amber-100 dark:ring-amber-400/35";
}

/**
 * @param {string} label
 */
function statusTagClass(label) {
  const l = label.toLowerCase();
  if (l === "live" || l === "active" || l === "orders open") {
    return "bg-emerald-500/10 text-emerald-800 ring-1 ring-emerald-600/20 dark:text-emerald-200";
  }
  if (l === "closed" || l === "orders closed" || l === "inactive" || l === "archived") {
    return "bg-rose-500/10 text-rose-800 ring-1 ring-rose-600/20 dark:text-rose-200";
  }
  return "bg-muted text-muted-foreground ring-1 ring-border/60";
}

/**
 * @param {PolymarketPublicSearchSuggestion} s
 */
function suggestionKey(s) {
  return `${s.entity}:${s.id || ""}:${s.slug || ""}:${s.conditionId || ""}:${s.proxyWallet || ""}`;
}

/**
 * Polymarket Gamma `/public-search` suggestions for Connect home.
 *
 * Default: Enter pulls all current matches; clicking a suggestion pulls that hit only.
 * `collectMode`: clicking / Enter adds matches as selections (parent shows chips + Go).
 *
 * @param {{
 *   onSelect: (suggestion: PolymarketPublicSearchSuggestion) => void | Promise<void>;
 *   onSubmitAll?: (suggestions: PolymarketPublicSearchSuggestion[]) => void | Promise<void>;
 *   disabled?: boolean;
 *   className?: string;
 *   onFocus?: () => void;
 *   entities?: Array<"event" | "market" | "profile" | "tag">;
 *   placeholder?: string;
 *   searchTags?: boolean;
 *   searchProfiles?: boolean;
 *   collectMode?: boolean;
 *   selectedItems?: Array<Record<string, unknown>>;
 * }} props
 */
export function PolymarketLiveSearch({
  onSelect,
  onSubmitAll,
  disabled = false,
  className,
  onFocus,
  entities,
  placeholder = "Search markets, events, profiles…",
  searchTags = true,
  searchProfiles = true,
  collectMode = false,
  selectedItems,
}) {
  const debounceRef = useRef(null);
  const suggestAbortRef = useRef(null);
  const suggestSeqRef = useRef(0);
  const containerRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState(
    /** @type {PolymarketPublicSearchSuggestion[]} */ ([]),
  );
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [selectLoading, setSelectLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const fetchSuggestions = useCallback(async (term) => {
    const mySeq = ++suggestSeqRef.current;
    suggestAbortRef.current?.abort();

    const trimmed = term.trim();
    if (!isPolymarketPublicSearchEligible(trimmed)) {
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
      const params = new URLSearchParams({
        query: "metadataSuggestions",
        q: trimmed,
        limit_per_type: "12",
        search_tags: searchTags ? "true" : "false",
        search_profiles: searchProfiles ? "true" : "false",
        keep_closed_markets: "1",
      });
      const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        signal: ac.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (mySeq !== suggestSeqRef.current) return;

      if (!res.ok) {
        setSuggestions([]);
        setSuggestOpen(false);
        setError(typeof data?.message === "string" ? data.message : "Search failed");
        return;
      }
      let list = Array.isArray(data?.suggestions) ? data.suggestions : [];
      if (Array.isArray(entities) && entities.length) {
        const allow = new Set(entities);
        list = list.filter((s) => allow.has(s?.entity));
      }
      setSuggestions(list);
      setSuggestOpen(true);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (mySeq !== suggestSeqRef.current) return;
      setSuggestions([]);
      setSuggestOpen(false);
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      if (mySeq === suggestSeqRef.current) setSuggestLoading(false);
    }
  }, [entities, searchProfiles, searchTags]);

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
    if (!suggestOpen) return undefined;
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setSuggestOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [suggestOpen]);

  const handleSelect = useCallback(
    async (s) => {
      setError(null);
      if (collectMode) {
        // Keep the list open so the row it just added shows as checked, and the
        // rest of the matches stay pickable.
        try {
          await onSelect(s);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to add selection");
        }
        return;
      }
      setSuggestOpen(false);
      setSelectLoading(true);
      try {
        await onSelect(s);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setSelectLoading(false);
      }
    },
    [collectMode, onSelect],
  );

  const handleSubmitAll = useCallback(async () => {
    if (!suggestions.length) return;
    setSuggestOpen(false);
    setError(null);
    if (collectMode) {
      try {
        if (onSubmitAll) await onSubmitAll(suggestions);
        else await onSelect(suggestions[0]);
        setQ("");
        setSuggestions([]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add selections");
      }
      return;
    }
    setSelectLoading(true);
    try {
      if (onSubmitAll) {
        await onSubmitAll(suggestions);
      } else {
        await onSelect(suggestions[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setSelectLoading(false);
    }
  }, [collectMode, onSelect, onSubmitAll, suggestions]);

  const busy = disabled || selectLoading;
  const eligible = isPolymarketPublicSearchEligible(q);
  const selectedTokens = useMemo(
    () => polymarketSelectionTokenSet(selectedItems),
    [selectedItems],
  );

  return (
    <div className={cn("space-y-2", className)} ref={containerRef}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 z-[1] flex h-4 w-4 -translate-y-1/2 items-center justify-center text-muted-foreground">
          {suggestLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
          ) : (
            <Search className="h-4 w-4" aria-hidden />
          )}
        </span>
        <input
          type="search"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            onFocus?.();
            if (suggestions.length > 0) setSuggestOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (eligible && suggestions.length > 0) {
                void handleSubmitAll();
              }
              return;
            }
            if (e.key === "Escape") setSuggestOpen(false);
          }}
          disabled={busy}
          autoComplete="off"
          className={cn(
            "flex h-9 w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-xs text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            busy && "opacity-70",
          )}
          aria-label="Polymarket natural language search"
        />

        <AnimatePresence>
          {suggestOpen && !suggestLoading && eligible && suggestions.length === 0 ? (
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
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-lg border border-border bg-popover py-1 shadow-md"
            >
              {suggestions.map((s) => {
                const statusTags = polymarketSuggestionStatusTags(s);
                const vol24 = formatPolymarketVolume(s.volume24hr);
                const vol = formatPolymarketVolume(s.volume);
                const topicTags = Array.isArray(s.tagLabels) ? s.tagLabels.slice(0, 3) : [];
                const alreadySelected = isPolymarketSelectionMatch(s, selectedTokens);
                return (
                  <motion.li
                    key={suggestionKey(s)}
                    role="option"
                    aria-selected={alreadySelected}
                    variants={suggestionRowVariants}
                  >
                    <button
                      type="button"
                      disabled={busy || alreadySelected}
                      className={cn(
                        "flex w-full flex-col gap-1 px-3 py-2 text-left text-sm disabled:cursor-not-allowed",
                        alreadySelected
                          ? "bg-emerald-500/5 opacity-70"
                          : "hover:bg-accent disabled:opacity-50",
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(s)}
                    >
                      <span className="flex w-full items-start gap-1.5">
                        {alreadySelected ? (
                          <Check
                            className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                            aria-hidden
                          />
                        ) : null}
                        <span className="min-w-0 font-medium text-foreground line-clamp-2">
                          {s.title || s.ticker || s.slug || s.id}
                        </span>
                        {alreadySelected ? (
                          <span className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[0.65rem] font-medium text-emerald-700 ring-1 ring-emerald-600/25 dark:text-emerald-300">
                            Selected
                          </span>
                        ) : null}
                      </span>
                      {s.subtitle ? (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {s.subtitle}
                        </span>
                      ) : null}
                      <span className="flex flex-wrap items-center gap-1">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono text-[0.65rem] font-medium capitalize tracking-wide",
                            entityTagClass(s.entity),
                          )}
                        >
                          {s.entity}
                        </span>
                        {statusTags.map((tag) => (
                          <span
                            key={tag}
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[0.65rem] font-medium tracking-wide",
                              statusTagClass(tag),
                            )}
                          >
                            {tag}
                          </span>
                        ))}
                        {topicTags.map((tag) => (
                          <span
                            key={`topic:${tag}`}
                            className="rounded bg-muted/80 px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground ring-1 ring-border/50"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                      <span className="text-[10px] leading-snug text-muted-foreground">
                        {s.ticker ? <span className="font-mono">{s.ticker}</span> : null}
                        {s.slug && s.slug !== s.ticker ? (
                          <span>
                            {s.ticker ? " · " : ""}
                            <span className="font-mono">{s.slug}</span>
                          </span>
                        ) : null}
                        {s.id ? (
                          <span>
                            {(s.ticker || s.slug) ? " · " : ""}
                            id {s.id}
                          </span>
                        ) : null}
                        {vol24 ? <span>{` · 24h ${vol24}`}</span> : null}
                        {!vol24 && vol ? <span>{` · vol ${vol}`}</span> : null}
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </div>

      {q.trim() && !eligible ? (
        <p className="text-[10px] leading-snug text-muted-foreground">
          Type at least 2 characters to search.
        </p>
      ) : null}

      {selectLoading ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {collectMode ? "Adding…" : "Loading into your sheet…"}
        </p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
