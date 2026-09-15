"use client";

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export const THEME_TOGGLE_BUTTON_CLASS =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-input bg-background text-foreground transition-[box-shadow,transform] hover:bg-accent hover:text-accent-foreground shadow-[1px_1px_0_0_rgba(15,23,42,0.16),1px_2px_4px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.75)] active:translate-x-px active:translate-y-px dark:border-white/10 dark:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4),inset_-1px_-1px_1px_rgba(255,255,255,0.08)] dark:active:translate-x-0 dark:active:translate-y-0";

export function ThemeToggle() {
  return (
    <AnimatedThemeToggler
      className={THEME_TOGGLE_BUTTON_CLASS}
      aria-label="Toggle theme"
    />
  );
}

