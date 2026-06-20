"use client";

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

/** Theme toggle for lychee_content article chrome (matches dashboard/nav styling). */
export function GuideArticleThemeToggle() {
  return (
    <AnimatedThemeToggler
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
      aria-label="Toggle theme"
    />
  );
}
