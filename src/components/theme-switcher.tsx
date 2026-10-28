"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

/** System / light / dark segmented control. "system" follows the OS appearance. */
export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const active = mounted ? theme ?? "system" : null;

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-black/[0.05] p-1 dark:bg-white/[0.06]",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = active === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "relative flex h-8 w-10 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "text-primary" : "text-muted-foreground hover:text-primary",
            )}
          >
            {selected ? (
              <motion.span
                layoutId="theme-switcher-pill"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                className="absolute inset-0 rounded-full bg-black/[0.08] dark:bg-white/[0.12]"
              />
            ) : null}
            <Icon className="relative size-4" strokeWidth={1.75} />
          </button>
        );
      })}
    </div>
  );
}
