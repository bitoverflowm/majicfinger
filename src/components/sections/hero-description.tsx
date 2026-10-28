"use client";

import { cn } from "@/lib/utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Fragment, type ReactNode } from "react";
import { VenueMark, type Venue } from "./venue-mark";

export type TermColor = "green" | "blue" | "fuchsia" | "orange";

type Term = { text: string; color: TermColor; sources: readonly Venue[] };

const UNDERLINE_COLORS: Record<TermColor, string> = {
  green: "decoration-emerald-500",
  blue: "decoration-blue-500",
  fuchsia: "decoration-fuchsia-500",
  orange: "decoration-orange-500",
};

function SourceRow({ source }: { source: Venue }) {
  const href = source.links?.[0]?.href;
  const content = (
    <>
      <VenueMark venue={source} className="size-8 rounded-lg p-1 text-sm" />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{source.name}</p>
          {source.badge ? (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {source.badge}
            </span>
          ) : null}
        </div>
        {source.description ? (
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{source.description}</p>
        ) : null}
      </div>
    </>
  );
  const rowClass = "flex items-start gap-3 rounded-lg px-2.5 py-2";
  return href ? (
    <a href={href} className={`${rowClass} transition-colors hover:bg-muted/60`}>
      {content}
    </a>
  ) : (
    <div className={rowClass}>{content}</div>
  );
}

function TermTooltip({ term }: { term: Term }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "cursor-default text-foreground/80 underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50",
            UNDERLINE_COLORS[term.color],
          )}
        >
          {term.text}
        </button>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          aria-label={term.sources.map((source) => source.name).join(", ")}
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-80 origin-[--radix-tooltip-content-transform-origin] overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-[0_18px_40px_-14px_rgba(16,24,40,0.3)] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1"
        >
          {term.sources.map((source) => (
            <SourceRow key={source.name} source={source} />
          ))}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/** Renders `text` with each term's first occurrence as a dotted-underline trigger listing its sources. */
export function HeroDescription({ text, terms }: { text: string; terms: readonly Term[] }) {
  const parts: ReactNode[] = [];
  let rest = text;
  for (const term of terms) {
    const index = rest.indexOf(term.text);
    if (index === -1) continue;
    parts.push(rest.slice(0, index), <TermTooltip key={term.text} term={term} />);
    rest = rest.slice(index + term.text.length);
  }
  parts.push(rest);

  return (
    <TooltipPrimitive.Provider delayDuration={120} skipDelayDuration={400}>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </TooltipPrimitive.Provider>
  );
}
