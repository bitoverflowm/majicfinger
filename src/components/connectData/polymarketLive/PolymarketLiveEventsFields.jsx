"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, Loader2, X } from "lucide-react";

import { PolymarketLiveSearch } from "@/components/connectData/polymarketLive/PolymarketLiveSearch";
import { PolymarketDateTimeField } from "@/components/connectData/polymarketLive/PolymarketDateTimeField";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  emptyPolymarketEventsComposeState,
  normalizePolymarketEventsComposeState,
  POLYMARKET_EVENTS_RECURRENCE_OPTIONS,
  POLYMARKET_EVENTS_SORT_OPTIONS,
} from "@/lib/polymarketLive/eventsCompose";
import {
  emptyPolymarketMarketsByEventsComposeState,
  normalizePolymarketMarketsByEventsComposeState,
  POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_OPTIONS,
  normalizePolymarketMarketsByEventsSheetLayout,
} from "@/lib/polymarketLive/marketsByEventsCompose";
import { cn } from "@/lib/utils";

/** @typedef {{ id: string; slug: string; label?: string }} PolymarketTagOption */

const TAG_PAGE_SIZE = 40;

/**
 * @param {unknown} t
 * @returns {PolymarketTagOption | null}
 */
function normalizePolymarketTag(t) {
  if (!t || typeof t !== "object") return null;
  const row = /** @type {Record<string, unknown>} */ (t);
  const id = String(row.id ?? "").trim();
  const slug = String(row.slug ?? "").trim();
  const label = String(row.label || row.slug || "").trim() || undefined;
  if (!id && !slug) return null;
  return { id: id || slug, slug: slug || id, label };
}

/**
 * @param {...(PolymarketTagOption | null | undefined)[]} lists
 * @returns {PolymarketTagOption[]}
 */
function mergeTagOptions(...lists) {
  /** @type {Map<string, PolymarketTagOption>} */
  const map = new Map();
  for (const list of lists) {
    for (const tag of list || []) {
      if (!tag) continue;
      const key = tag.slug || tag.id;
      if (!key || map.has(key)) continue;
      map.set(key, tag);
    }
  }
  return [...map.values()];
}

/**
 * @param {{
 *   className?: string;
 *   disabled?: boolean;
 *   variant?: "events" | "marketsByEvents";
 *   onSearchSelect?: (suggestion: import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion) => void;
 *   onSearchSubmitAll?: (suggestions: import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]) => void;
 * }} props
 */
export function PolymarketLiveEventsFields({
  className,
  disabled = false,
  variant = "events",
  onSearchSelect,
  onSearchSubmitAll,
}) {
  const isMarketsByEvents = variant === "marketsByEvents";
  const ctx = useMyStateV2() ?? {};
  const {
    connectPolymarketLiveEventsCompose,
    setConnectPolymarketLiveEventsCompose,
    connectPolymarketLiveMarketsByEventsCompose,
    setConnectPolymarketLiveMarketsByEventsCompose,
  } = ctx;

  const composeRaw = isMarketsByEvents
    ? connectPolymarketLiveMarketsByEventsCompose
    : connectPolymarketLiveEventsCompose;
  const setCompose = isMarketsByEvents
    ? setConnectPolymarketLiveMarketsByEventsCompose
    : setConnectPolymarketLiveEventsCompose;

  const state = useMemo(
    () =>
      isMarketsByEvents
        ? normalizePolymarketMarketsByEventsComposeState(
            composeRaw || emptyPolymarketMarketsByEventsComposeState(),
          )
        : normalizePolymarketEventsComposeState(
            composeRaw || emptyPolymarketEventsComposeState(),
          ),
    [composeRaw, isMarketsByEvents],
  );

  const patch = useCallback(
    (partial) => {
      setCompose?.((prev) => {
        if (isMarketsByEvents) {
          const cur = normalizePolymarketMarketsByEventsComposeState(
            prev || emptyPolymarketMarketsByEventsComposeState(),
          );
          return normalizePolymarketMarketsByEventsComposeState({ ...cur, ...partial });
        }
        const cur = normalizePolymarketEventsComposeState(
          prev || emptyPolymarketEventsComposeState(),
        );
        return normalizePolymarketEventsComposeState({ ...cur, ...partial });
      });
    },
    [isMarketsByEvents, setCompose],
  );

  useEffect(() => {
    if (composeRaw == null) {
      setCompose?.(
        isMarketsByEvents
          ? emptyPolymarketMarketsByEventsComposeState()
          : emptyPolymarketEventsComposeState(),
      );
    }
  }, [composeRaw, isMarketsByEvents, setCompose]);

  const [tagCatalog, setTagCatalog] = useState(/** @type {PolymarketTagOption[]} */ ([]));
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsLoadingMore, setTagsLoadingMore] = useState(false);
  const [tagsHasMore, setTagsHasMore] = useState(true);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [tagSearchMatches, setTagSearchMatches] = useState(/** @type {PolymarketTagOption[]} */ ([]));
  const [tagSearchRelated, setTagSearchRelated] = useState(/** @type {PolymarketTagOption[]} */ ([]));
  const [tagSearchLoading, setTagSearchLoading] = useState(false);
  const [relatedTags, setRelatedTags] = useState(/** @type {PolymarketTagOption[]} */ ([]));
  const [relatedLoading, setRelatedLoading] = useState(false);

  const tagOffsetRef = useRef(0);
  const tagsLoadingMoreRef = useRef(false);
  const tagSearchSeqRef = useRef(0);
  const tagSearchAbortRef = useRef(/** @type {AbortController | null} */ (null));
  const tagSearchPrefetchPagesRef = useRef(0);

  const selectedTagKeys = useMemo(
    () => new Set(state.tags.flatMap((t) => [t.slug, t.id].filter(Boolean))),
    [state.tags],
  );

  const filterOutSelected = useCallback(
    (tags) => (tags || []).filter((t) => !selectedTagKeys.has(t.slug) && !selectedTagKeys.has(t.id)),
    [selectedTagKeys],
  );

  const loadTagPage = useCallback(async ({ reset = false } = {}) => {
    if (tagsLoadingMoreRef.current) return;
    tagsLoadingMoreRef.current = true;
    if (reset) {
      setTagsLoading(true);
      setTagsHasMore(true);
      tagOffsetRef.current = 0;
    } else {
      setTagsLoadingMore(true);
    }
    const offset = reset ? 0 : tagOffsetRef.current;
    try {
      const params = new URLSearchParams({
        query: "listTags",
        limit: String(TAG_PAGE_SIZE),
        offset: String(offset),
        order: "id",
        ascending: "true",
      });
      const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => []);
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      const page = list.map(normalizePolymarketTag).filter(Boolean);
      setTagCatalog((prev) => {
        if (reset) return /** @type {PolymarketTagOption[]} */ (page);
        return mergeTagOptions(prev, page);
      });
      tagOffsetRef.current = offset + page.length;
      setTagsHasMore(page.length >= TAG_PAGE_SIZE);
    } catch {
      if (reset) {
        setTagCatalog([]);
        setTagsHasMore(false);
      }
    } finally {
      tagsLoadingMoreRef.current = false;
      setTagsLoading(false);
      setTagsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!tagPickerOpen) return;
    if (tagCatalog.length === 0 && !tagsLoading && !tagsLoadingMoreRef.current) {
      void loadTagPage({ reset: true });
    }
  }, [tagPickerOpen, tagCatalog.length, tagsLoading, loadTagPage]);

  useEffect(() => {
    const q = tagSearch.trim();
    tagSearchPrefetchPagesRef.current = 0;
    if (!tagPickerOpen || !q) {
      tagSearchAbortRef.current?.abort();
      setTagSearchMatches([]);
      setTagSearchRelated([]);
      setTagSearchLoading(false);
      return;
    }

    const mySeq = ++tagSearchSeqRef.current;
    const handle = setTimeout(() => {
      tagSearchAbortRef.current?.abort();
      const ac = new AbortController();
      tagSearchAbortRef.current = ac;
      setTagSearchLoading(true);
      void (async () => {
        try {
          const params = new URLSearchParams({
            query: "searchTags",
            q,
          });
          const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
            headers: { Accept: "application/json" },
            credentials: "same-origin",
            signal: ac.signal,
          });
          const data = await res.json().catch(() => ({}));
          if (mySeq !== tagSearchSeqRef.current) return;
          const matches = (Array.isArray(data?.matches) ? data.matches : [])
            .map(normalizePolymarketTag)
            .filter(Boolean);
          const related = (Array.isArray(data?.related) ? data.related : [])
            .map(normalizePolymarketTag)
            .filter(Boolean);
          setTagSearchMatches(/** @type {PolymarketTagOption[]} */ (matches));
          setTagSearchRelated(/** @type {PolymarketTagOption[]} */ (related));
          setTagSearchLoading(false);

          // Enrich with Polymarket public-search tags (slower; does not block first paint).
          try {
            const fuzzyParams = new URLSearchParams({
              query: "metadataSuggestions",
              q,
              limit_per_type: "12",
              search_tags: "true",
              search_profiles: "false",
              keep_closed_markets: "0",
            });
            const fuzzyRes = await fetch(`/api/integrations/polymarket?${fuzzyParams.toString()}`, {
              headers: { Accept: "application/json" },
              credentials: "same-origin",
              signal: ac.signal,
            });
            const fuzzyData = await fuzzyRes.json().catch(() => ({}));
            if (mySeq !== tagSearchSeqRef.current) return;
            const fuzzyTags = (Array.isArray(fuzzyData?.suggestions) ? fuzzyData.suggestions : [])
              .filter((s) => s?.entity === "tag")
              .map((s) =>
                normalizePolymarketTag({
                  id: s.id,
                  slug: s.slug,
                  label: s.title || s.label,
                }),
              )
              .filter(Boolean);
            if (fuzzyTags.length) {
              setTagSearchMatches((prev) =>
                mergeTagOptions(prev, /** @type {PolymarketTagOption[]} */ (fuzzyTags)),
              );
            }
          } catch (fuzzyErr) {
            if (fuzzyErr instanceof DOMException && fuzzyErr.name === "AbortError") return;
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
          if (mySeq !== tagSearchSeqRef.current) return;
          setTagSearchMatches([]);
          setTagSearchRelated([]);
          setTagSearchLoading(false);
        }
      })();
    }, 280);

    return () => clearTimeout(handle);
  }, [tagPickerOpen, tagSearch]);

  // While searching, keep paging listTags so substring matches can surface beyond the first page.
  useEffect(() => {
    const q = tagSearch.trim().toLowerCase();
    if (!tagPickerOpen || !q || !tagsHasMore || tagsLoading || tagsLoadingMore) return;
    if (tagSearchPrefetchPagesRef.current >= 8) return;
    const localHits = tagCatalog.filter((t) => {
      const hay = `${t.slug} ${t.label || ""} ${t.id}`.toLowerCase();
      return hay.includes(q);
    }).length;
    if (localHits >= 12) return;
    const t = setTimeout(() => {
      tagSearchPrefetchPagesRef.current += 1;
      void loadTagPage({ reset: false });
    }, 120);
    return () => clearTimeout(t);
  }, [
    tagPickerOpen,
    tagSearch,
    tagsHasMore,
    tagsLoading,
    tagsLoadingMore,
    tagCatalog,
    loadTagPage,
  ]);

  const browseTags = useMemo(() => filterOutSelected(tagCatalog), [filterOutSelected, tagCatalog]);

  const localSearchHits = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    if (!q) return /** @type {PolymarketTagOption[]} */ ([]);
    return filterOutSelected(
      tagCatalog.filter((t) => {
        const hay = `${t.slug} ${t.label || ""} ${t.id}`.toLowerCase();
        return hay.includes(q);
      }),
    );
  }, [filterOutSelected, tagCatalog, tagSearch]);

  const suggestedMatches = useMemo(() => {
    const q = tagSearch.trim();
    if (!q) return /** @type {PolymarketTagOption[]} */ ([]);
    return filterOutSelected(mergeTagOptions(tagSearchMatches, localSearchHits));
  }, [filterOutSelected, localSearchHits, tagSearch, tagSearchMatches]);

  const suggestedRelated = useMemo(() => {
    const q = tagSearch.trim();
    if (!q) return /** @type {PolymarketTagOption[]} */ ([]);
    const matchKeys = new Set(suggestedMatches.map((t) => t.slug || t.id));
    return filterOutSelected(tagSearchRelated).filter((t) => !matchKeys.has(t.slug || t.id));
  }, [filterOutSelected, suggestedMatches, tagSearch, tagSearchRelated]);

  const primaryTagSlug = state.tags[0]?.slug || "";

  useEffect(() => {
    if (!primaryTagSlug) {
      setRelatedTags([]);
      return;
    }
    let alive = true;
    setRelatedLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/integrations/polymarket?query=relatedTagsBySlug&slug=${encodeURIComponent(primaryTagSlug)}`,
          { headers: { Accept: "application/json" }, credentials: "same-origin" },
        );
        const data = await res.json().catch(() => []);
        if (!alive) return;
        const list = Array.isArray(data) ? data : [];
        setRelatedTags(
          filterOutSelected(
            list.map(normalizePolymarketTag).filter(Boolean),
          ).slice(0, 12),
        );
      } catch {
        if (alive) setRelatedTags([]);
      } finally {
        if (alive) setRelatedLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [filterOutSelected, primaryTagSlug, state.tags]);

  const onTagListScroll = useCallback(
    (e) => {
      if (tagSearch.trim()) return;
      const el = e.currentTarget;
      if (el.scrollTop + el.clientHeight < el.scrollHeight - 40) return;
      if (!tagsHasMore || tagsLoading || tagsLoadingMore) return;
      void loadTagPage({ reset: false });
    },
    [loadTagPage, tagSearch, tagsHasMore, tagsLoading, tagsLoadingMore],
  );

  const handleTagPickerOpenChange = useCallback((open) => {
    setTagPickerOpen(open);
    if (!open) {
      setTagSearch("");
      setTagSearchMatches([]);
      setTagSearchRelated([]);
    }
  }, []);
  const addEventRef = useCallback(
    (suggestion) => {
      const id = String(suggestion?.id || "").trim();
      const slug = String(suggestion?.slug || "").trim();
      const title = String(suggestion?.title || "").trim();
      if (!id && !slug) return;
      const next = [...state.eventRefs];
      const existingIdx = next.findIndex(
        (r) => (id && r.id === id) || (slug && r.slug === slug),
      );
      const row = {
        id: id || next[existingIdx]?.id || "",
        slug: slug || next[existingIdx]?.slug || undefined,
        title: title || next[existingIdx]?.title || undefined,
      };
      if (!row.id && row.slug) row.id = row.slug;
      if (existingIdx >= 0) next[existingIdx] = { ...next[existingIdx], ...row };
      else next.push(row);
      patch({ eventRefs: next });
    },
    [patch, state.eventRefs],
  );

  const removeEventRef = useCallback(
    (id) => {
      patch({ eventRefs: state.eventRefs.filter((r) => r.id !== id) });
    },
    [patch, state.eventRefs],
  );

  const addTag = useCallback(
    (tag) => {
      const id = String(tag?.id || "").trim();
      const slug = String(tag?.slug || "").trim();
      if (!id && !slug) return;
      if (state.tags.some((t) => t.slug === slug || t.id === id)) return;
      patch({
        tags: [
          ...state.tags,
          {
            id: id || slug,
            slug: slug || id,
            label: String(tag?.label || slug || id).trim() || undefined,
          },
        ],
      });
    },
    [patch, state.tags],
  );

  const removeTag = useCallback(
    (slug) => {
      patch({ tags: state.tags.filter((t) => t.slug !== slug) });
    },
    [patch, state.tags],
  );

  const addOrderField = useCallback(
    (value) => {
      const v = String(value || "").trim();
      if (!v || state.orderFields.includes(v)) return;
      patch({ orderFields: [...state.orderFields, v] });
    },
    [patch, state.orderFields],
  );

  const removeOrderField = useCallback(
    (value) => {
      patch({ orderFields: state.orderFields.filter((f) => f !== value) });
    },
    [patch, state.orderFields],
  );

  const availableSortOptions = POLYMARKET_EVENTS_SORT_OPTIONS.filter(
    (o) => !state.orderFields.includes(o.value),
  );

  const [searchPicks, setSearchPicks] = useState(
    /** @type {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]} */ (
      []
    ),
  );
  const [searchGoLoading, setSearchGoLoading] = useState(false);

  /**
   * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion} s
   */
  const addSearchPick = useCallback((s) => {
    if (!s) return;
    setSearchPicks((prev) => {
      const key = `${s.entity}:${s.id || ""}:${s.slug || ""}`;
      if (prev.some((p) => `${p.entity}:${p.id || ""}:${p.slug || ""}` === key)) return prev;
      return [...prev, s];
    });
  }, []);

  /**
   * @param {string} key
   */
  const removeSearchPick = useCallback((key) => {
    setSearchPicks((prev) =>
      prev.filter((p) => `${p.entity}:${p.id || ""}:${p.slug || ""}` !== key),
    );
  }, []);

  const handleSearchGo = useCallback(async () => {
    if (!searchPicks.length || !onSearchSubmitAll) return;
    setSearchGoLoading(true);
    try {
      await onSearchSubmitAll(searchPicks);
    } finally {
      setSearchGoLoading(false);
    }
  }, [onSearchSubmitAll, searchPicks]);

  /** @param {string} key @param {boolean} checked */
  const setTriBool = (key, checked) => {
    patch({ [key]: checked ? true : null });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground dark:text-slate-400">
          Mode
        </Label>
        <ToggleGroup
          type="single"
          value={state.mode}
          onValueChange={(v) => {
            if (v === "search" || v === "advanced") {
              patch({ mode: v });
              if (v === "advanced") setSearchPicks([]);
            }
          }}
          className="justify-start"
          disabled={disabled}
        >
          <ToggleGroupItem value="search" className="h-8 px-3 text-xs">
            Search
          </ToggleGroupItem>
          <ToggleGroupItem value="advanced" className="h-8 px-3 text-xs">
            Advanced search
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {state.mode === "search" ? (
        <div className="space-y-3">
          <p className="text-[11px] leading-snug text-muted-foreground dark:text-slate-400">
            {isMarketsByEvents
              ? "Search and add one or more events, then press Go to pull markets from those events into your sheet(s)."
              : "Search and add one or more events, then press Go to load them into your sheet."}
          </p>
          {isMarketsByEvents ? (
            <div className="space-y-2">
              <Label className="text-[11px] text-foreground">How should markets be organized?</Label>
              <div className="space-y-2">
                {POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_OPTIONS.map((opt) => {
                  const selected =
                    normalizePolymarketMarketsByEventsSheetLayout(state.sheetLayout) === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => patch({ sheetLayout: opt.value })}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                        selected
                          ? "border-ring bg-background shadow-sm"
                          : "border-border/60 bg-muted/20 hover:border-border hover:bg-background/80",
                      )}
                    >
                      <span className="block text-xs font-medium text-foreground">{opt.label}</span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
                        {opt.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <PolymarketLiveSearch
            entities={["event"]}
            searchTags={false}
            searchProfiles={false}
            placeholder="Search events…"
            disabled={disabled || searchGoLoading}
            collectMode
            onSelect={(s) => addSearchPick(s)}
            onSubmitAll={(list) => {
              for (const s of list || []) addSearchPick(s);
            }}
          />
          {searchPicks.length ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {searchPicks.map((s) => {
                  const key = `${s.entity}:${s.id || ""}:${s.slug || ""}`;
                  const label = String(s.title || s.slug || s.ticker || s.id || "Event").trim();
                  return (
                    <span
                      key={key}
                      className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-emerald-600/25 bg-emerald-500/10 py-px pl-1.5 pr-0.5 text-[10px] font-medium leading-4 text-emerald-900 dark:text-emerald-100"
                    >
                      <span className="truncate">{label}</span>
                      <button
                        type="button"
                        disabled={disabled || searchGoLoading}
                        aria-label={`Remove ${label}`}
                        className="rounded-full p-0.5 text-emerald-800/70 hover:bg-emerald-500/20 hover:text-emerald-950 dark:text-emerald-100/80"
                        onClick={() => removeSearchPick(key)}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={disabled || searchGoLoading || !searchPicks.length}
                  onClick={() => void handleSearchGo()}
                >
                  {searchGoLoading ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      Pulling…
                    </>
                  ) : (
                    `Go (${searchPicks.length})`
                  )}
                </Button>
                <button
                  type="button"
                  disabled={disabled || searchGoLoading}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchPicks([])}
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
              Select events from search to build your list, then press Go.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-3 text-foreground">
          <p className="text-[11px] leading-snug text-muted-foreground dark:text-slate-400">
            {isMarketsByEvents ? (
              <>
                Find events with Polymarket{" "}
                <span className="font-mono text-[10px]">GET /events</span>, then extract each
                event&apos;s markets into your sheet(s).
              </>
            ) : (
              <>
                Query options for Polymarket{" "}
                <span className="font-mono text-[10px]">GET /events</span>. Then pick return fields
                below and run pull.
              </>
            )}
          </p>

          {isMarketsByEvents ? (
            <div className="space-y-2">
              <Label className="text-[11px] text-foreground">How should markets be organized?</Label>
              <div className="space-y-2">
                {POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_OPTIONS.map((opt) => {
                  const selected =
                    normalizePolymarketMarketsByEventsSheetLayout(state.sheetLayout) === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => patch({ sheetLayout: opt.value })}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                        selected
                          ? "border-ring bg-background shadow-sm"
                          : "border-border/60 bg-muted/20 hover:border-border hover:bg-background/80",
                      )}
                    >
                      <span className="block text-xs font-medium text-foreground">{opt.label}</span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
                        {opt.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-foreground">Limit</Label>
              <p className="text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
                Max number of events to return in this pull.
              </p>
              <Input
                type="number"
                min={0}
                max={500}
                className="h-8 text-xs"
                disabled={disabled}
                value={state.limit}
                onChange={(e) => patch({ limit: Number(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-[11px] text-foreground">Sort</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground dark:text-slate-400">Ascending</span>
                  <Switch
                    checked={state.ascending}
                    disabled={disabled}
                    onCheckedChange={(v) => patch({ ascending: !!v })}
                    className="scale-90"
                  />
                </div>
              </div>
              <p className="text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
                Order results by one or more fields; earlier fields take priority.
              </p>
              <Select
                key={`sort:${state.orderFields.join(",")}`}
                disabled={disabled || availableSortOptions.length === 0}
                onValueChange={addOrderField}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Add sort field…" />
                </SelectTrigger>
                <SelectContent>
                  {availableSortOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.orderFields.length ? (
                <div className="flex flex-wrap gap-1 pt-1">
                  {state.orderFields.map((field, idx) => {
                    const label =
                      POLYMARKET_EVENTS_SORT_OPTIONS.find((o) => o.value === field)?.label ||
                      field;
                    return (
                      <span
                        key={`${field}:${idx}`}
                        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px] text-foreground"
                      >
                        <span className="text-muted-foreground">{idx + 1}.</span>
                        {label}
                        <button
                          type="button"
                          disabled={disabled}
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => removeOrderField(field)}
                          aria-label={`Remove sort ${label}`}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-foreground">Event id / slug</Label>
            <p className="text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
              Search events and keep adding. Selecting fills both id and slug when available.
            </p>
            <PolymarketLiveSearch
              entities={["event"]}
              searchTags={false}
              searchProfiles={false}
              placeholder="Search events to add id + slug…"
              disabled={disabled}
              onSelect={(s) => addEventRef(s)}
              onSubmitAll={(list) => list.forEach((s) => addEventRef(s))}
            />
            {state.eventRefs.length ? (
              <ul className="mt-1 space-y-1">
                {state.eventRefs.map((ref) => (
                  <li
                    key={ref.id}
                    className="flex items-start justify-between gap-2 rounded-md border border-border/50 bg-background/80 px-2 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">
                        {ref.title || ref.slug || ref.id}
                      </p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        id {ref.id}
                        {ref.slug ? ` · ${ref.slug}` : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      disabled={disabled}
                      onClick={() => removeEventRef(ref.id)}
                      aria-label="Remove event"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-foreground">Tags</Label>
            <Popover open={tagPickerOpen} onOpenChange={handleTagPickerOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={tagPickerOpen}
                  disabled={disabled}
                  className="h-8 w-full justify-between px-3 text-xs font-normal text-muted-foreground shadow-sm"
                >
                  Search tags…
                  <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Type a tag slug or keyword…"
                    className="h-9 text-xs"
                    value={tagSearch}
                    onValueChange={setTagSearch}
                  />
                  <CommandList
                    className="max-h-[min(20rem,50vh)]"
                    onScroll={onTagListScroll}
                  >
                    <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                      {tagSearchLoading || tagsLoading
                        ? "Searching tags…"
                        : tagSearch.trim()
                          ? "No tags found."
                          : "No tags yet."}
                    </CommandEmpty>

                    {tagSearch.trim() ? (
                      <>
                        {suggestedMatches.length ? (
                          <CommandGroup heading="Matches">
                            {suggestedMatches.map((tag) => (
                              <CommandItem
                                key={`match:${tag.slug || tag.id}`}
                                value={`match ${tag.slug} ${tag.label || ""} ${tag.id}`}
                                className="text-xs"
                                onSelect={() => {
                                  addTag(tag);
                                  handleTagPickerOpenChange(false);
                                }}
                              >
                                <span className="font-mono">{tag.slug}</span>
                                {tag.label && tag.label !== tag.slug ? (
                                  <span className="text-muted-foreground"> · {tag.label}</span>
                                ) : null}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ) : null}
                        {suggestedRelated.length ? (
                          <CommandGroup heading="Related">
                            {suggestedRelated.map((tag) => (
                              <CommandItem
                                key={`related:${tag.slug || tag.id}`}
                                value={`related ${tag.slug} ${tag.label || ""} ${tag.id}`}
                                className="text-xs"
                                onSelect={() => {
                                  addTag(tag);
                                  handleTagPickerOpenChange(false);
                                }}
                              >
                                <span className="font-mono">{tag.slug}</span>
                                {tag.label && tag.label !== tag.slug ? (
                                  <span className="text-muted-foreground"> · {tag.label}</span>
                                ) : null}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ) : null}
                        {tagSearchLoading || tagsLoadingMore ? (
                          <div className="flex items-center justify-center gap-1.5 py-2 text-[10px] text-muted-foreground">
                            <Loader2 className="size-3 animate-spin" />
                            Loading more suggestions…
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <CommandGroup heading="Browse tags">
                        {browseTags.map((tag) => (
                          <CommandItem
                            key={`browse:${tag.slug || tag.id}`}
                            value={`browse ${tag.slug} ${tag.label || ""} ${tag.id}`}
                            className="text-xs"
                            onSelect={() => {
                              addTag(tag);
                              handleTagPickerOpenChange(false);
                            }}
                          >
                            <span className="font-mono">{tag.slug}</span>
                            {tag.label && tag.label !== tag.slug ? (
                              <span className="text-muted-foreground"> · {tag.label}</span>
                            ) : null}
                          </CommandItem>
                        ))}
                        {tagsLoading || tagsLoadingMore ? (
                          <div className="flex items-center justify-center gap-1.5 py-2 text-[10px] text-muted-foreground">
                            <Loader2 className="size-3 animate-spin" />
                            Loading tags…
                          </div>
                        ) : tagsHasMore ? (
                          <div className="py-2 text-center text-[10px] text-muted-foreground">
                            Scroll for more
                          </div>
                        ) : tagCatalog.length ? (
                          <div className="py-2 text-center text-[10px] text-muted-foreground">
                            End of list
                          </div>
                        ) : null}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {state.tags.length ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {state.tags.map((tag) => (
                  <span
                    key={tag.slug}
                    className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-0.5 font-mono text-[10px] text-foreground"
                  >
                    {tag.slug}
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => removeTag(tag.slug)}
                      aria-label={`Remove tag ${tag.slug}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            {primaryTagSlug ? (
              <div className="pt-1">
                <p className="mb-1 flex items-center gap-1.5 text-[10px] text-muted-foreground dark:text-slate-400">
                  Related tags
                  {relatedLoading ? <Loader2 className="size-3 animate-spin" /> : null}
                </p>
                <div className="flex flex-wrap gap-1">
                  {relatedTags.map((tag) => (
                    <button
                      key={tag.slug}
                      type="button"
                      disabled={disabled}
                      onClick={() => addTag(tag)}
                      className="rounded-full border border-dashed border-border/70 bg-muted/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground hover:border-border hover:text-foreground"
                    >
                      {tag.slug}
                    </button>
                  ))}
                  {!relatedLoading && relatedTags.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground">No related tags</span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-foreground">Date filters</Label>
            <p className="text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
              Optional start/end date bounds for list events (
              <span className="font-mono">start_date_*</span> /{" "}
              <span className="font-mono">end_date_*</span>).
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <PolymarketDateTimeField
                label="Start date min"
                value={state.startDateMin || ""}
                onChange={(iso) => patch({ startDateMin: iso })}
                disabled={disabled}
                placeholder="Start ≥"
              />
              <PolymarketDateTimeField
                label="Start date max"
                value={state.startDateMax || ""}
                onChange={(iso) => patch({ startDateMax: iso })}
                disabled={disabled}
                placeholder="Start ≤"
              />
              <PolymarketDateTimeField
                label="End date min"
                value={state.endDateMin || ""}
                onChange={(iso) => patch({ endDateMin: iso })}
                disabled={disabled}
                placeholder="End ≥"
              />
              <PolymarketDateTimeField
                label="End date max"
                value={state.endDateMax || ""}
                onChange={(iso) => patch({ endDateMax: iso })}
                disabled={disabled}
                placeholder="End ≤"
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { key: "active", label: "Active" },
              { key: "closed", label: "Closed" },
              { key: "archived", label: "Archived" },
              { key: "featured", label: "Featured" },
              {
                key: "cyom",
                label: "CYOM",
                hint: "CYOM markets are events created through Polymarket’s user/community market-creation workflow",
              },
              { key: "includeChat", label: "Include chat" },
              { key: "includeTemplate", label: "Include template" },
            ].map((row) => (
              <label
                key={row.key}
                className="flex items-start justify-between gap-2 rounded-md border border-border/40 bg-background/60 px-2 py-1.5"
              >
                <span className="min-w-0">
                  <span className="block text-[11px] font-medium text-foreground">{row.label}</span>
                  {row.hint ? (
                    <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
                      {row.hint}
                    </span>
                  ) : null}
                </span>
                <Switch
                  checked={state[row.key] === true}
                  disabled={disabled}
                  onCheckedChange={(v) => setTriBool(row.key, !!v)}
                  className="mt-0.5 scale-90"
                />
              </label>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-foreground">Recurrence</Label>
            <p className="text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
              Filters events according to how frequently their associated series repeats.
            </p>
            <Select
              disabled={disabled}
              value={state.recurrence || "__any__"}
              onValueChange={(v) => patch({ recurrence: v === "__any__" ? "" : v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                {POLYMARKET_EVENTS_RECURRENCE_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value || "__any__"}
                    value={opt.value || "__any__"}
                    className="text-xs"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
