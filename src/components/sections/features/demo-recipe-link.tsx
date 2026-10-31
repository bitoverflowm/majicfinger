"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { interceptOnCompactScreen } from "@/lib/desktopOnly";
import { requestLandingDemoRecipeAfterScroll } from "@/lib/landingDemoSession";
import { resolveDemoSectionEl, scrollToDemoSection } from "@/lib/scrollToDemo";

/**
 * Scrolls up to the homepage demo and opens one of its recipes there.
 * Off the homepage it navigates to `/?recipe=<id>#demo`, which opens the recipe on arrival.
 */
export function DemoRecipeLink({
  recipeId,
  className,
  children,
}: {
  recipeId: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={`/?recipe=${encodeURIComponent(recipeId)}#demo`}
      className={className}
      onClick={(e) => {
        if (interceptOnCompactScreen(e)) return;
        if (!resolveDemoSectionEl()) return;
        e.preventDefault();
        scrollToDemoSection();
        requestLandingDemoRecipeAfterScroll(recipeId);
      }}
    >
      {children}
    </Link>
  );
}
