"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/** Drive-pattern delays from the Spectrum loading state, reading order. */
const PIXEL_DELAYS_MS = [90, 180, 270, 0, 90, 180, 90, 180, 270];

/** Generic wait: distinct lychee reds so the grid is not one flat color. */
const LYCHEE_RED_SHADES = [
  "#9f1239",
  "#be123c",
  "#E63946",
  "#e11d48",
  "#f43f5e",
  "#fb7185",
  "#fda4af",
  "#ff8fa3",
  "#c81e3a",
];

/** Kalshi green and Polymarket blue, matching the compare bento. */
const VENUE_SHADES = [
  "#28CC95",
  "#2E5CFF",
  "#1fa87a",
  "#5b7cff",
  "#28CC95",
  "#2E5CFF",
  "#7dffe0",
  "#8aa4ff",
  "#14956c",
];

function formatElapsed(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Spectrum UI loading state: a 3×3 pixel grid, a shimmering label, and a live elapsed timer.
 * Use this for the wait before a skeleton or the real screen. Pass palette="venues" on Kalshi vs Polymarket.
 */
export function SpectrumLoadingState({ label = "Loading", palette = "lychee", className }) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const shades = palette === "venues" ? VENUE_SHADES : LYCHEE_RED_SHADES;

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - started), 100);
    return () => clearInterval(id);
  }, []);

  const elapsed = formatElapsed(elapsedMs);

  return (
    <div role="status" className={cn("flex w-fit items-center gap-2.5 text-foreground", className)}>
      <span aria-hidden className="grid grid-cols-3 gap-[1.5px]">
        {PIXEL_DELAYS_MS.map((delay, index) => (
          <span
            key={index}
            className="lychee-pixel size-[4px] rounded-[1px]"
            style={{
              backgroundColor: shades[index],
              opacity: 0.15,
              animation: `lychee-pixel-on 650ms ease-in-out ${delay}ms infinite`,
            }}
          />
        ))}
      </span>
      <span
        className="bg-clip-text text-[13px] font-medium text-transparent motion-reduce:animate-none motion-reduce:text-current"
        style={{
          backgroundImage: "linear-gradient(90deg, #a3a3a3 35%, currentColor 50%, #a3a3a3 65%)",
          backgroundSize: "200% 100%",
          animation: "lychee-shimmer-text 1.4s linear infinite",
        }}
      >
        {label}
      </span>
      <span role="timer" aria-label={`Elapsed time ${elapsed}`} className="font-mono text-[12px] tabular-nums text-neutral-400 dark:text-neutral-500">
        {elapsed}
      </span>
    </div>
  );
}
