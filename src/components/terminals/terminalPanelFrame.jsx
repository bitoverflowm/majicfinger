"use client";

import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

/**
 * How a terminal panel is sized. `fit`: the panel grows to its content, so tables and charts
 * keep their own heights. Otherwise the user sized the panel and its content fills it.
 */
const PanelSizingContext = createContext({ fit: true });

export function PanelSizing({ fit, children }) {
  return <PanelSizingContext.Provider value={fit ? FIT : FILL}>{children}</PanelSizingContext.Provider>;
}

const FIT = { fit: true };
const FILL = { fit: false };

export function usePanelSizing() {
  return useContext(PanelSizingContext);
}

/** `fixed` (a height class) when the panel fits its content, otherwise whatever room the panel has. */
export function usePanelFill(fixed) {
  const { fit } = usePanelSizing();
  return fit ? fixed : "min-h-0 flex-1";
}

/**
 * Title, description and controls over a panel's content. `flush` drops the body padding for
 * tables that run edge to edge.
 */
export function TerminalPanelFrame({ title, description, aside, flush = false, className, bodyClassName, children }) {
  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}>
      {title || description || aside ? (
        <header className="flex items-start justify-between gap-3 px-4 pb-2.5 pt-3 pr-9">
          <div className="min-w-0 max-w-3xl">
            {title ? <h3 className="text-[14px] font-semibold text-foreground">{title}</h3> : null}
            {description ? <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{description}</p> : null}
          </div>
          {aside ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">{aside}</div> : null}
        </header>
      ) : null}
      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", flush ? "" : "px-3 pb-3", bodyClassName)}>{children}</div>
    </div>
  );
}
