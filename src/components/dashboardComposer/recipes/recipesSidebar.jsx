"use client";

import { useEffect, useState } from "react";
import { CircleArrowDown, SquareTerminal, Users } from "lucide-react";
import {
  KalshiTradeHistoryPreview,
  PolymarketTradeHistoryPreview,
} from "@/components/dashboardComposer/recipes/kalshiTradeHistoryPreview";
import { HolderTerminalPreview } from "@/components/dashboardComposer/recipes/holderTerminalPreview";
import { PolymarketHolderAnalysisPreview } from "@/components/dashboardComposer/recipes/polymarketHolderAnalysisPreview";
import { cn } from "@/lib/utils";
import { TERMINALS } from "@/lib/workspaceTerminals";

export const RECIPES = [
  {
    id: "kalshiTradeHistory",
    title: "Download Kalshi Trade History",
    description: "Search a market to view its trades and download a CSV.",
    tag: "CSV",
    icon: CircleArrowDown,
    preview: KalshiTradeHistoryPreview,
  },
  {
    id: "polymarketTradeHistory",
    title: "Download Polymarket Trade History",
    description: "Search a market to view its trades and download a CSV.",
    tag: "CSV",
    icon: CircleArrowDown,
    preview: PolymarketTradeHistoryPreview,
  },
  {
    id: "polymarketHolderAnalysis",
    title: "Polymarket Holder Analysis",
    description: "See who holds each side of a market, then open a tab for each of the top 5 traders.",
    tag: "Top 5",
    icon: Users,
    preview: PolymarketHolderAnalysisPreview,
  },
];

const TERMINAL_PREVIEWS = { holder: HolderTerminalPreview };

const PANEL_MS = 500;

function SectionHeader({ title, count, children, className }) {
  return (
    <div className={cn("px-5 pb-3", className)}>
      <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
        <span className="tabular-nums">{count}</span>
      </h2>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function SidebarRow({ item, icon: Icon, active = false, onClick, hoverProps }) {
  return (
    <li>
      <button
        type="button"
        aria-current={active || undefined}
        onClick={onClick}
        {...hoverProps}
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
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "min-w-0 truncate text-[13px] font-medium text-foreground opacity-80 transition-opacity group-hover:opacity-100",
                active && "opacity-100",
              )}
            >
              {item.title}
            </span>
            {item.badge ? (
              <span className="inline-flex h-4 shrink-0 items-center rounded-full bg-gradient-to-r from-secondary to-violet-500 px-1.5 text-[9px] font-semibold uppercase leading-none tracking-[0.08em] text-white">
                {item.badge}
              </span>
            ) : null}
            <span className="flex-1" />
            {item.tag ? <span className="shrink-0 text-[11px] text-muted-foreground">{item.tag}</span> : null}
          </span>
          <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">{item.description}</span>
        </span>
      </button>
    </li>
  );
}

/**
 * Terminals and quick actions beside the integration picker. A terminal opens as a new tab;
 * a recipe opens a full-window tool.
 */
export function RecipesSidebar({ onOpen, onOpenTerminal, onHover, activeId = null, expanded = false, className }) {
  const hoverProps = (id) => ({
    onMouseEnter: () => onHover?.(id),
    onMouseLeave: () => onHover?.(null),
    onFocus: (event) => {
      // Keyboard focus only: a dialog's open autofocus must not slide the preview out.
      if (event.currentTarget.matches(":focus-visible")) onHover?.(id);
    },
    onBlur: () => onHover?.(null),
  });
  return (
    <aside
      className={cn(
        "relative z-10 flex min-h-0 flex-col border-r bg-background transition-colors duration-500",
        expanded ? "border-transparent" : "border-border",
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-black/[0.015] pb-4 dark:bg-white/[0.02]">
        <SectionHeader title="Terminals" count={TERMINALS.length} className="pt-6">
          Out-of-the-box terminals to supercharge your research.
        </SectionHeader>
        <ul>
          {TERMINALS.map((terminal) => (
            <SidebarRow
              key={terminal.id}
              item={terminal}
              icon={SquareTerminal}
              onClick={() => onOpenTerminal?.(terminal.id)}
              hoverProps={TERMINAL_PREVIEWS[terminal.id] ? hoverProps(terminal.id) : undefined}
            />
          ))}
        </ul>
        <SectionHeader title="Recipes" count={RECIPES.length} className="pt-5">
          A list of quick actions requested by our quants. Click one to get started right away.
        </SectionHeader>
        <ul>
          {RECIPES.map((recipe) => (
            <SidebarRow
              key={recipe.id}
              item={recipe}
              icon={recipe.icon}
              active={recipe.id === activeId}
              onClick={() => onOpen?.(recipe.id)}
              hoverProps={hoverProps(recipe.id)}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}

/**
 * The hovered recipe's or terminal's walkthrough. It slides out of the sidebar over the picker
 * and its preview, inside the same dialog box. Clicking it opens the recipe or terminal.
 */
export function RecipePreviewPanel({ recipeId, onOpen, onOpenTerminal, onHover }) {
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

  const Preview = RECIPES.find((recipe) => recipe.id === shownId)?.preview || TERMINAL_PREVIEWS[shownId];
  const openShown = () => {
    if (!open) return;
    if (TERMINAL_PREVIEWS[recipeId]) onOpenTerminal?.(recipeId);
    else onOpen?.(recipeId);
  };
  return (
    <div
      aria-hidden
      onMouseEnter={() => open && onHover?.(recipeId)}
      onMouseLeave={() => onHover?.(null)}
      onClick={openShown}
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
