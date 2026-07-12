"use client";

import { useCallback } from "react";

import { scrollToHashSection } from "@/lib/scrollToHashSection";
import { cn } from "@/lib/utils";

export const KALSHI_GUIDED_WORKFLOWS_ANCHOR_ID = "kalshi-guided-workflows";

/**
 * Scroll to the hub explore demo and briefly emphasize the guided-workflow column.
 */
export function scrollToExploreAndHighlightGuidedWorkflows({
  exploreHash = "#explore-data",
  highlightId = KALSHI_GUIDED_WORKFLOWS_ANCHOR_ID,
  durationMs = 2400,
} = {}) {
  if (typeof window === "undefined") return;

  scrollToHashSection(exploreHash);

  let attempts = 0;
  const maxAttempts = 50;

  const flash = () => {
    const el = document.getElementById(highlightId);
    if (!el) {
      attempts += 1;
      if (attempts < maxAttempts) {
        window.setTimeout(flash, 80);
      }
      return;
    }

    el.setAttribute("data-guided-flash", "true");
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    window.setTimeout(() => {
      el.removeAttribute("data-guided-flash");
    }, durationMs);
  };

  window.setTimeout(flash, 350);
}

/**
 * Inline note CTA under hub cards (e.g. example workflows → explore demo).
 */
export function HubCardsNoteCta({
  label = "Try it now →",
  href = "#explore-data",
  highlightTargetId = KALSHI_GUIDED_WORKFLOWS_ANCHOR_ID,
  className,
}: {
  label?: string;
  href?: string;
  highlightTargetId?: string;
  className?: string;
}) {
  const onClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      scrollToExploreAndHighlightGuidedWorkflows({
        exploreHash: href,
        highlightId: highlightTargetId,
      });
    },
    [href, highlightTargetId],
  );

  return (
    <a
      href={href}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center text-sm font-medium text-foreground underline-offset-4",
        "transition-colors hover:text-secondary hover:underline md:text-base",
        className,
      )}
    >
      {label}
    </a>
  );
}
