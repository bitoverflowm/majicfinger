"use client";

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

/** Theme toggle for lychee_content article chrome (matches dashboard/nav styling). */
export function GuideArticleThemeToggle() {
  return (
    <AnimatedThemeToggler
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground sm:h-9 sm:w-9"
      aria-label="Toggle theme"
    />
  );
}
