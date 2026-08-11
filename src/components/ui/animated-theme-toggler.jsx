"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { flushSync } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Theme toggle that stays in sync with next-themes.
 * Default theme is system (see ThemeProvider); toggling sets an explicit light/dark
 * preference based on the currently resolved appearance.
 */
export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  ...props
}) => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  const toggleTheme = useCallback(async () => {
    if (!buttonRef.current) return;

    const next = resolvedTheme === "dark" ? "light" : "dark";

    const applyTheme = () => {
      // Update the class immediately so view transitions capture the change,
      // then persist via next-themes (storage + React state).
      flushSync(() => {
        document.documentElement.classList.toggle("dark", next === "dark");
        setTheme(next);
      });
    };

    if (typeof document.startViewTransition === "function") {
      await document.startViewTransition(applyTheme).ready;

      const { top, left, width, height } =
        buttonRef.current.getBoundingClientRect();
      const x = left + width / 2;
      const y = top + height / 2;
      const maxRadius = Math.hypot(
        Math.max(left, window.innerWidth - left),
        Math.max(top, window.innerHeight - top),
      );

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    } else {
      applyTheme();
    }
  }, [duration, resolvedTheme, setTheme]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggleTheme}
      className={cn(className)}
      aria-label="Toggle theme"
      {...props}
    >
      {isDark ? <Sun /> : <Moon />}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
};
