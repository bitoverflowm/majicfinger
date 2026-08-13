"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
 *   tags: PolymarketTagOption[];
 *   onChange: (tags: PolymarketTagOption[]) => void;
 *   disabled?: boolean;
 *   className?: string;
 * }} props
 */
export function PolymarketTagPicker({ tags, onChange, disabled = false, className }) {
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

  const selectedTags = Array.isArray(tags) ? tags : [];

  const selectedTagKeys = useMemo(
    () => new Set(selectedTags.flatMap((t) => [t.slug, t.id].filter(Boolean))),
    [selectedTags],
  );

  const filterOutSelected = useCallback(
    (list) => (list || []).filter((t) => !selectedTagKeys.has(t.slug) && !selectedTagKeys.has(t.id)),
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

  const primaryTagSlug = selectedTags[0]?.slug || "";

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
          filterOutSelected(list.map(normalizePolymarketTag).filter(Boolean)).slice(0, 12),
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
  }, [filterOutSelected, primaryTagSlug, selectedTags]);

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

  const addTag = useCallback(
    (tag) => {
      const id = String(tag?.id || "").trim();
      const slug = String(tag?.slug || "").trim();
      if (!id && !slug) return;
      if (selectedTags.some((t) => t.slug === slug || t.id === id)) return;
      onChange([
        ...selectedTags,
        {
          id: id || slug,
          slug: slug || id,
          label: String(tag?.label || slug || id).trim() || undefined,
        },
      ]);
    },
    [onChange, selectedTags],
  );

  const removeTag = useCallback(
    (slug) => {
      onChange(selectedTags.filter((t) => t.slug !== slug));
    },
    [onChange, selectedTags],
  );

  return (
    <div className={cn("space-y-1.5", className)}>
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
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type a tag slug or keyword…"
              className="h-9 text-xs"
              value={tagSearch}
              onValueChange={setTagSearch}
            />
            <CommandList className="max-h-[min(20rem,50vh)]" onScroll={onTagListScroll}>
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
      {selectedTags.length ? (
        <div className="flex flex-wrap gap-1 pt-1">
          {selectedTags.map((tag) => (
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
  );
}
