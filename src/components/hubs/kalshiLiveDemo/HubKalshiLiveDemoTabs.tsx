"use client";

import { useEffect, useRef, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type HubKalshiLiveDemoTabId =
  | "search"
  | "metadata"
  | "trades"
  | "orderbook"
  | "candlesticks"
  | "event_forecast";

export type HubKalshiLiveDemoTabDef = {
  id: string;
  title: string;
  description: string;
  disabled?: boolean;
};

type HubKalshiLiveDemoTabsProps = {
  tabs: HubKalshiLiveDemoTabDef[];
  activeId: string;
  onChange: (id: string) => void;
  /** True while the active tab panel is still loading content. */
  contentLoading?: boolean;
  className?: string;
};

/** Slow crawl while panel content loads (matches homepage “fill while waiting” feel). */
const LOADING_FILL_MS = 8000;
/** Full fill when switching to already-ready content. */
const READY_FILL_MS = 700;
/** Quick finish once an in-flight load resolves. */
const FINISH_FILL_MS = 350;

const DISABLED_TAB_TOOLTIP =
  "Search or select a market to activate these capabilities";

/**
 * Static left-rail tabs matching the homepage feature accordion look.
 * Progress bar fills on user tab switches (no auto-rotate / scroll).
 */
export function HubKalshiLiveDemoTabs({
  tabs,
  activeId,
  onChange,
  contentLoading = false,
  className,
}: HubKalshiLiveDemoTabsProps) {
  const [fillArmed, setFillArmed] = useState(false);
  const sawLoadingRef = useRef(contentLoading);

  useEffect(() => {
    sawLoadingRef.current = contentLoading;
    setFillArmed(false);
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setFillArmed(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [activeId]);

  useEffect(() => {
    if (contentLoading) sawLoadingRef.current = true;
  }, [contentLoading]);

  const targetWidth = contentLoading ? "92%" : "100%";
  const durationMs = contentLoading
    ? LOADING_FILL_MS
    : sawLoadingRef.current
      ? FINISH_FILL_MS
      : READY_FILL_MS;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn("flex w-full flex-col gap-2 lg:gap-2.5", className)}
        role="tablist"
      >
        {tabs.map((tab) => {
          const open = tab.id === activeId;
          const disabled = Boolean(tab.disabled);

          const tabButton = (
            <button
              type="button"
              role="tab"
              aria-selected={open}
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => {
                if (!disabled) onChange(tab.id);
              }}
              className={cn(
                "relative w-full overflow-hidden rounded-md text-left transition-colors",
                open
                  ? "bg-white shadow-[0px_0px_1px_0px_rgba(0,0,0,0.16),0px_1px_2px_-0.5px_rgba(0,0,0,0.16)] dark:bg-[#27272A] dark:shadow-[0px_0px_0px_1px_rgba(249,250,251,0.06),0px_0px_0px_1px_var(--color-zinc-800,#27272A),0px_1px_2px_-0.5px_rgba(0,0,0,0.24),0px_2px_4px_-1px_rgba(0,0,0,0.24)]"
                  : "rounded-none",
                disabled
                  ? "pointer-events-none cursor-not-allowed opacity-45"
                  : open
                    ? ""
                    : "hover:bg-muted/40",
              )}
            >
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-md bg-neutral-300/50 transition-opacity dark:bg-neutral-300/30",
                  open ? "opacity-100" : "opacity-0",
                )}
                aria-hidden
              >
                <div
                  className="absolute left-0 top-0 h-full bg-secondary transition-all ease-linear"
                  style={{
                    width: open && fillArmed ? targetWidth : "0%",
                    transitionDuration:
                      open && fillArmed ? `${durationMs}ms` : "0s",
                  }}
                />
              </div>
              <div className="px-2.5 py-2">
                <p
                  className={cn(
                    "text-xs font-semibold tracking-tight sm:text-[13px]",
                    disabled ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {tab.title}
                </p>
                {open ? (
                  <p className="mt-1 text-[11px] font-medium leading-snug text-muted-foreground text-pretty">
                    {tab.description}
                  </p>
                ) : null}
              </div>
            </button>
          );

          if (!disabled) {
            return (
              <div key={tab.id} className="w-full">
                {tabButton}
              </div>
            );
          }

          return (
            <Tooltip key={tab.id}>
              <TooltipTrigger asChild>
                <span className="block w-full outline-none">{tabButton}</span>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                align="center"
                className="max-w-[14rem] text-pretty text-xs"
              >
                {DISABLED_TAB_TOOLTIP}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
