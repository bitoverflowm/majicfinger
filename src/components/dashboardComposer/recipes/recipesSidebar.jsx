"use client";

import { CircleArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const RECIPES = [
  {
    id: "kalshiTradeHistory",
    title: "Download Kalshi Trade History",
    description: "Search a market to view its trades and download a CSV.",
    tag: "CSV",
    icon: CircleArrowDown,
  },
];

/** Quick actions beside the integration picker. Each one opens a full-window tool. */
export function RecipesSidebar({ onOpen, className }) {
  return (
    <aside className={cn("flex min-h-0 flex-col border-r border-border bg-muted/30", className)}>
      <div className="px-5 pb-3 pt-6">
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recipes
          <span className="tabular-nums">{RECIPES.length}</span>
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
          A list of quick actions requested by our quants. Click one to get started right away.
        </p>
      </div>
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {RECIPES.map((recipe) => {
          const Icon = recipe.icon;
          return (
            <li key={recipe.id}>
              <button
                type="button"
                onClick={() => onOpen?.(recipe.id)}
                className="group flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.05] focus-visible:bg-foreground/[0.05] focus-visible:outline-none"
              >
                <Icon className="mt-px size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{recipe.title}</span>
                    {recipe.tag ? <span className="shrink-0 text-[11px] text-muted-foreground">{recipe.tag}</span> : null}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">{recipe.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
