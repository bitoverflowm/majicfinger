"use client";

import { useEffect, useState } from "react";
import { CircleArrowDown } from "lucide-react";
import { KalshiTradeHistoryPreview } from "@/components/dashboardComposer/recipes/kalshiTradeHistoryPreview";
import { cn } from "@/lib/utils";

export const RECIPES = [
  {
    id: "kalshiTradeHistory",
    title: "Download Kalshi Trade History",
    description: "Search a market to view its trades and download a CSV.",
    tag: "CSV",
    icon: CircleArrowDown,
    preview: KalshiTradeHistoryPreview,
  },
];

const PANEL_MS = 500;

/** Quick actions beside the integration picker. Each one opens a full-window tool. */
export function RecipesSidebar({ onOpen, onHover, activeId = null, expanded = false, className }) {
  return (
    <aside
      className={cn(
        "relative z-10 flex min-h-0 flex-col border-r bg-background transition-colors duration-500",
        expanded ? "border-transparent" : "border-border",
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col bg-black/[0.015] dark:bg-white/[0.02]">
        <div className="px-5 pb-3 pt-6">
          <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recipes
            <span className="tabular-nums">{RECIPES.length}</span>
          </h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
            A list of quick actions requested by our quants. Click one to get started right away.
          </p>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto pb-4">
          {RECIPES.map((recipe) => {
            const Icon = recipe.icon;
            const active = recipe.id === activeId;
            return (
              <li key={recipe.id}>
                <button
                  type="button"
                  aria-current={active || undefined}
                  onClick={() => onOpen?.(recipe.id)}
                  onMouseEnter={() => onHover?.(recipe.id)}
                  onMouseLeave={() => onHover?.(null)}
                  onFocus={() => onHover?.(recipe.id)}
                  onBlur={() => onHover?.(null)}
                  className={cn(
                    "group flex w-full items-start gap-2.5 px-5 py-3 text-left transition-colors hover:bg-black/[0.06] focus-visible:bg-black/[0.06] focus-visible:outline-none dark:hover:bg-white/[0.07] dark:focus-visible:bg-white/[0.07]",
                    active && "bg-black/[0.06] dark:bg-white/[0.07]",
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-px size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground",
                      active && "text-foreground",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-[13px] font-medium text-foreground opacity-80 transition-opacity group-hover:opacity-100",
                          active && "opacity-100",
                        )}
                      >
                        {recipe.title}
                      </span>
                      {recipe.tag ? <span className="shrink-0 text-[11px] text-muted-foreground">{recipe.tag}</span> : null}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">{recipe.description}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

/**
 * The hovered recipe's walkthrough. It slides out of the sidebar over the picker and its
 * preview, inside the same dialog box. Clicking it opens the recipe.
 */
export function RecipePreviewPanel({ recipeId, onOpen, onHover }) {
  const open = Boolean(recipeId);
  const [shownId, setShownId] = useState(recipeId);

  useEffect(() => {
    if (recipeId) {
      setShownId(recipeId);
      return undefined;
    }
    const timer = window.setTimeout(() => setShownId(null), PANEL_MS);
    return () => window.clearTimeout(timer);
  }, [recipeId]);

  const Preview = RECIPES.find((recipe) => recipe.id === shownId)?.preview;
  return (
    <div
      aria-hidden
      onMouseEnter={() => open && onHover?.(recipeId)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => open && onOpen?.(recipeId)}
      className={cn(
        "absolute inset-y-0 left-1/4 right-0 z-[5] hidden bg-background transition-[clip-path] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:block",
        open ? "cursor-pointer [clip-path:inset(0_0_0_0)]" : "pointer-events-none [clip-path:inset(0_100%_0_0)]",
      )}
    >
      <div
        className={cn(
          "h-full bg-black/[0.015] px-8 py-7 transition-opacity duration-300 dark:bg-white/[0.02]",
          open ? "opacity-100 delay-100" : "opacity-0",
        )}
      >
        {Preview ? <Preview /> : null}
      </div>
    </div>
  );
}
