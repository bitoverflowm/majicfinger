"use client";

import { PolymarketLiveSearch } from "@/components/connectData/polymarketLive/PolymarketLiveSearch";

/**
 * Builder search for Polymarket Live. A required token, event, or wallet
 * keeps this in the preview until one selection exists.
 */
export function PolymarketLiveBuildSearch({
  picks = [],
  onAdd,
  onRemove,
  entities = ["market"],
  placeholder = "Search for a market",
  required = false,
}) {
  return (
    <div className="space-y-2">
      <div className="relative">
        {required ? (
          <span className="pointer-events-none absolute right-3 top-2.5 z-10 text-[13px] font-medium text-destructive" aria-hidden>
            *
          </span>
        ) : null}
        <PolymarketLiveSearch
          entities={entities}
          placeholder={placeholder}
          searchTags={false}
          searchProfiles={entities.includes("profile")}
          keepClosedMarkets
          dismissAfterSelect
          selectedItems={picks}
          onSelect={(suggestion) => onAdd?.(suggestion)}
        />
      </div>
      {picks.length ? (
        <div className="flex flex-wrap gap-1.5">
          {picks.map((pick) => (
            <button
              key={pick.id}
              type="button"
              onClick={() => onRemove?.(pick.id)}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2 py-1 text-left text-[11px] text-foreground"
            >
              <span className="truncate">{pick.label || pick.title || pick.id}</span>
              <span className="text-muted-foreground">Remove</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
