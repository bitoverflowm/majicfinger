"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Resolved light/dark for War Room chrome. Follows next-themes (system / light / dark)
 * so the nav/footer ThemeSwitcher applies here too.
 */
export function useWarRoomTheme() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = !mounted || resolvedTheme !== "light";
  return {
    mounted,
    dark,
    /** Liveline / chart theme prop */
    chartTheme: (dark ? "dark" : "light") as "dark" | "light",
    /** Loading progress tone */
    loadTone: (dark ? "dark" : "light") as "dark" | "light",
  };
}
