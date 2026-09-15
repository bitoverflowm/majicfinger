"use client";

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export const THEME_TOGGLE_BUTTON_CLASS =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-input bg-background text-foreground transition-shadow hover:bg-accent hover:text-accent-foreground shadow-[inset_2px_3px_6px_rgba(15,23,42,0.16),inset_-1px_-1px_3px_rgba(255,255,255,0.85)] dark:border-white/10 dark:shadow-[3px_3px_0_0_rgba(0,0,0,0.55),6px_6px_14px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] dark:active:translate-x-px dark:active:translate-y-px";

export function ThemeToggle() {
  return (
    <AnimatedThemeToggler
      className={THEME_TOGGLE_BUTTON_CLASS}
      aria-label="Toggle theme"
    />
  );
}

