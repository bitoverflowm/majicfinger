"use client";

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export function ThemeToggle() {
  return (
    <AnimatedThemeToggler
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-input bg-background hover:bg-accent hover:text-accent-foreground"
      aria-label="Toggle theme"
    />
  );
}

