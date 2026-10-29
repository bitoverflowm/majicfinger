"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { interceptOnCompactScreen } from "@/lib/desktopOnly";
import { requestLandingDemoRecipeAfterScroll } from "@/lib/landingDemoSession";
import { resolveDemoSectionEl, scrollToDemoSection } from "@/lib/scrollToDemo";

/** Scrolls up to the homepage demo and opens one of its recipes there. */
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
      href="/#demo"
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
