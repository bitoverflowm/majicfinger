"use client";

import { X } from "lucide-react";
import { PolymarketLiveSearch } from "@/components/connectData/polymarketLive/PolymarketLiveSearch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
        <TooltipProvider>
          <div className="flex flex-wrap gap-1 pt-0.5">
            {picks.map((pick) => {
              const label = pick.label || pick.title || pick.id;
              return (
                <Tooltip key={pick.id}>
                  <TooltipTrigger asChild>
                    <span className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-emerald-600/25 bg-emerald-500/10 py-px pl-1.5 pr-0.5 text-[10px] font-medium leading-4 text-emerald-900 dark:text-emerald-100">
                      <span className="truncate font-mono">{label}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${label}`}
                        className="rounded-full p-0.5 text-emerald-800/70 hover:bg-emerald-500/20 hover:text-emerald-950 dark:text-emerald-100/80"
                        onClick={() => onRemove?.(pick.id)}
                      >
                        <X className="h-2.5 w-2.5" aria-hidden />
                      </button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="z-[620] max-w-xs text-pretty">
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      ) : null}
    </div>
  );
}
