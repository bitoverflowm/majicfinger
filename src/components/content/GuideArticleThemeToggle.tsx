"use client";

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { THEME_TOGGLE_BUTTON_CLASS } from "@/components/theme-toggle";

/** Theme toggle for lychee_content article chrome (matches dashboard/nav styling). */
export function GuideArticleThemeToggle() {
  return (
    <AnimatedThemeToggler
      className={`${THEME_TOGGLE_BUTTON_CLASS} h-8 w-8 sm:h-9 sm:w-9`}
      aria-label="Toggle theme"
    />
  );
}
