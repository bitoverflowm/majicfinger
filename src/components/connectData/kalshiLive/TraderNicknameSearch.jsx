"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { formatKalshiLiveTraderMetricCompact } from "@/lib/kalshiLive/searchTradersColumns";
import { cn } from "@/lib/utils";

/**
 * @typedef {{
 *   nickname: string;
 *   profile_image_path?: string;
 *   volume?: number | null;
 *   pnl?: number | null;
 *   dollars_traded?: number | null;
 *   num_markets_traded?: number | null;
 *   social_id?: string;
 * }} TraderSuggestion
 */

/**
 * @param {TraderSuggestion} s
 */
function suggestionMeta(s) {
  /** @type {string[]} */
  const parts = [];
  const vol = formatKalshiLiveTraderMetricCompact(s.volume);
  const pnl = formatKalshiLiveTraderMetricCompact(s.pnl);
  const dollars = formatKalshiLiveTraderMetricCompact(s.dollars_traded);
  const markets = formatKalshiLiveTraderMetricCompact(s.num_markets_traded);
  if (vol) parts.push(`Vol ${vol}`);
  if (pnl) parts.push(`PnL ${pnl}`);
  if (!pnl && dollars) parts.push(`$ traded ${dollars}`);
  if (markets) parts.push(`${markets} mkts`);
  return parts.join(" · ");
}

/**
 * Typeahead for Kalshi trader nicknames (matches MarketTickerSearch interaction).
 *
 * @param {{
 *   value: string;
 *   onChange: (value: string) => void;
 *   selectedNickname?: string;
 *   onSelectNickname?: (nickname: string) => void;
 *   onClearSelection?: () => void;
 *   disabled?: boolean;
 *   className?: string;
 *   placeholder?: string;
 * }} props
 */
export function TraderNicknameSearch({
  value,
  onChange,
  selectedNickname = "",
  onSelectNickname,
  onClearSelection,
  disabled = false,
  className,
  placeholder = "e.g. citadel",
}) {
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(/** @type {TraderSuggestion[]} */ ([]));
  const debounceRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const abortRef = useRef(/** @type {AbortController | null} */ (null));
  const seqRef = useRef(0);
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  const selected = String(selectedNickname || "").trim();

  const fetchSuggestions = useCallback(async (q) => {
    const query = String(q || "").trim();
    if (query.length < 2 || /\s/.test(query)) {
      setSuggestions([]);
      setSuggestOpen(false);
      setSuggestLoading(false);
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const mySeq = ++seqRef.current;
    setSuggestLoading(true);

    try {
      const res = await fetch(
        `/api/integrations/kalshi-live/search/trader-suggestions?${new URLSearchParams({
          q: query,
        }).toString()}`,
        {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
          signal: ac.signal,
        },
      );
      const body = await res.json().catch(() => ({}));
      if (mySeq !== seqRef.current) return;
      const list = Array.isArray(body?.suggestions) ? body.suggestions : [];
      setSuggestions(list);
      setSuggestOpen(list.length > 0);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (mySeq !== seqRef.current) return;
      setSuggestions([]);
      setSuggestOpen(false);
    } finally {
      if (mySeq === seqRef.current) setSuggestLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected) {
      setSuggestions([]);
      setSuggestOpen(false);
      return undefined;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(value);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, selected, fetchSuggestions]);

  useEffect(() => {
    const onDoc = (e) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setSuggestOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  return (
    <div ref={rootRef} className={cn("relative max-w-md space-y-1.5", className)}>
      {selected ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-[11px] font-medium text-secondary">
            <span className="truncate">{selected}</span>
            <button
              type="button"
              disabled={disabled}
              aria-label={`Clear ${selected}`}
              className="rounded-full p-0.5 text-secondary/80 hover:bg-secondary/20 hover:text-secondary"
              onClick={() => {
                onClearSelection?.();
                onChange("");
              }}
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </span>
          <span className="text-[10px] text-muted-foreground">Exact trader selected</span>
        </div>
      ) : null}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="text"
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={selected ? selected : value}
          onChange={(e) => {
            const next = e.target.value;
            if (selected) onClearSelection?.();
            onChange(next);
          }}
          onFocus={() => {
            if (!selected && suggestions.length) setSuggestOpen(true);
          }}
          className={cn(
            "h-9 w-full rounded-md border border-input bg-background py-1 pl-8 pr-8 text-xs shadow-sm",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        {suggestLoading ? (
          <Loader2
            className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : null}
      </div>

      {suggestOpen && !selected && suggestions.length > 0 ? (
        <ul
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border/70 bg-popover p-1 shadow-md"
          role="listbox"
        >
          {suggestions.map((s) => {
            const meta = suggestionMeta(s);
            return (
              <li key={s.nickname}>
                <button
                  type="button"
                  role="option"
                  disabled={disabled}
                  className="flex w-full items-start justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-muted/70"
                  onClick={() => {
                    onSelectNickname?.(s.nickname);
                    onChange(s.nickname);
                    setSuggestOpen(false);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-foreground">
                      {s.nickname}
                    </span>
                    {meta ? (
                      <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground tabular-nums">
                        {meta}
                      </span>
                    ) : (
                      <span className="mt-0.5 block text-[10px] text-muted-foreground/70">
                        Metrics hidden / unavailable
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
