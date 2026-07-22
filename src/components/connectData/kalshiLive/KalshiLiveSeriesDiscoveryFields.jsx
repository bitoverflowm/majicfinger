"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { KalshiLiveTimestampPicker } from "@/components/connectData/kalshiLive/KalshiLiveTimestampPicker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fetchKalshiLiveTagsByCategories } from "@/lib/kalshiLive/seriesDiscovery";
import { cn } from "@/lib/utils";

/**
 * Series discovery filters: category → tag, plus list query params.
 *
 * @param {{
 *   category: string;
 *   onCategoryChange: (value: string) => void;
 *   tag: string;
 *   onTagChange: (value: string) => void;
 *   includeProductMetadata: boolean;
 *   onIncludeProductMetadataChange: (value: boolean) => void;
 *   minUpdatedTs: number | "";
 *   onMinUpdatedTsChange: (value: number | "") => void;
 *   includeVolumeFromColumns: boolean;
 *   disabled?: boolean;
 *   className?: string;
 * }} props
 */
export function KalshiLiveSeriesDiscoveryFields({
  category,
  onCategoryChange,
  tag,
  onTagChange,
  includeProductMetadata,
  onIncludeProductMetadataChange,
  minUpdatedTs,
  onMinUpdatedTsChange,
  includeVolumeFromColumns,
  disabled = false,
  className,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [categories, setCategories] = useState(/** @type {string[]} */ ([]));
  const [tagsByCategory, setTagsByCategory] = useState(
    /** @type {Record<string, string[]>} */ ({}),
  );

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetchKalshiLiveTagsByCategories({ signal: ac.signal })
      .then((data) => {
        if (ac.signal.aborted) return;
        setCategories(data.categories);
        setTagsByCategory(data.tagsByCategory);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load categories");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, []);

  const tagsForCategory = useMemo(() => {
    const key = String(category || "").trim();
    if (!key) return [];
    return Array.isArray(tagsByCategory[key]) ? tagsByCategory[key] : [];
  }, [category, tagsByCategory]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1 space-y-1.5">
          <Label className="text-[11px] font-medium text-muted-foreground">Category</Label>
          <Select
            value={category || "__none__"}
            disabled={disabled || loading}
            onValueChange={(v) => {
              const next = v === "__none__" ? "" : v;
              onCategoryChange(next);
              onTagChange("");
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder={loading ? "Loading categories…" : "Select a category"} />
            </SelectTrigger>
            <SelectContent className="max-h-[min(20rem,50vh)]">
              <SelectItem value="__none__" className="text-xs text-muted-foreground">
                Select a category
              </SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {category ? (
          <div className="min-w-[12rem] flex-1 space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">Tag</Label>
            <Select
              value={tag || "__none__"}
              disabled={disabled || loading || !tagsForCategory.length}
              onValueChange={(v) => onTagChange(v === "__none__" ? "" : v)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue
                  placeholder={
                    tagsForCategory.length ? "Optional — select one tag" : "No tags for this category"
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-[min(20rem,50vh)]">
                <SelectItem value="__none__" className="text-xs text-muted-foreground">
                  No tag filter
                </SelectItem>
                {tagsForCategory.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          Loading Kalshi series categories…
        </p>
      ) : null}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}

      <div className="space-y-2 rounded-md border border-border/50 bg-background/60 p-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Query parameters
        </p>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor="series-discovery-product-meta" className="text-[11px] text-foreground">
              Include product metadata
            </Label>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Sends <code className="text-[10px]">include_product_metadata</code> on the series list
              request.
            </p>
          </div>
          <Switch
            id="series-discovery-product-meta"
            checked={!!includeProductMetadata}
            disabled={disabled}
            onCheckedChange={(checked) => onIncludeProductMetadataChange(!!checked)}
          />
        </div>

        <div className="space-y-0.5 border-t border-border/40 pt-2">
          <p className="text-[11px] text-foreground">Include volume</p>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Controlled by the <span className="font-medium">Volume</span> column below. Currently{" "}
            <code className="text-[10px]">
              include_volume={includeVolumeFromColumns ? "true" : "false"}
            </code>
            .
          </p>
        </div>

        <div className="space-y-1.5 border-t border-border/40 pt-2">
          <Label className="text-[11px] font-medium text-foreground">Last updated after</Label>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Optional filter — only series whose metadata was updated after this time (
            <code className="text-[10px]">min_updated_ts</code>).
          </p>
          <KalshiLiveTimestampPicker
            value={minUpdatedTs}
            onChange={onMinUpdatedTsChange}
            className="w-full max-w-xs"
          />
        </div>
      </div>
    </div>
  );
}
