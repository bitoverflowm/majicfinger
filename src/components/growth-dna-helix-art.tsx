"use client";

import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type Cell = { ch: string; primary: boolean };

function buildHelixRow(r: number, frame: number, width: number): Cell[] {
  const cells: Cell[] = Array.from({ length: width }, () => ({ ch: " ", primary: false }));
  const phase = r * 0.62 + frame * 0.19;
  const amp = Math.min(9, Math.floor((width - 4) / 2));
  let x1 = Math.round(width / 2 + amp * Math.sin(phase));
  let x2 = Math.round(width / 2 - amp * Math.sin(phase));
  x1 = Math.max(1, Math.min(width - 2, x1));
  x2 = Math.max(1, Math.min(width - 2, x2));

  const lo = Math.min(x1, x2);
  const hi = Math.max(x1, x2);
  /** Which rungs read as “lit” — travels with rotation for a scanning highlight. */
  const pairHighlight =
    ((r * 4 + frame) % 13) < 4 || ((r * 7 + frame * 3) % 19) < 2;

  if (hi <= lo + 1) {
    const mid = Math.max(0, Math.min(width - 1, Math.round((x1 + x2) / 2)));
    cells[mid] = { ch: pairHighlight ? "X" : "x", primary: pairHighlight };
    return cells;
  }

  const rung = pairHighlight ? "=" : "-";
  for (let c = lo + 1; c < hi; c++) {
    cells[c] = { ch: rung, primary: pairHighlight };
  }
  cells[lo] = { ch: pairHighlight ? "O" : "o", primary: pairHighlight };
  cells[hi] = { ch: pairHighlight ? "O" : "o", primary: pairHighlight };
  return cells;
}

/** DNA double helix in ASCII: phase-advances each frame to read as rotation; highlighted pairs use theme blue (`secondary` — `--primary` is neutral in this design). */
export function GrowthDnaHelixArt() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setFrame((f) => f + 1), 70);
    return () => window.clearInterval(id);
  }, []);

  const width = 34;
  const rows = 18;

  const grid = useMemo(
    () => Array.from({ length: rows }, (_, r) => buildHelixRow(r, frame, width)),
    [frame, width, rows],
  );

  return (
    <div className="relative flex h-full min-h-[380px] w-full max-w-full min-w-0 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/25 p-4 dark:bg-muted/15">
      <pre
        className={cn(
          "relative z-10 mx-auto w-max max-w-full overflow-hidden text-left font-mono text-[7px] leading-[1.1] sm:text-[8px] md:text-[9px]",
        )}
      >
        {grid.map((line, r) => (
          <span key={r} className="block whitespace-pre">
            {line.map((cell, i) => (
              <span
                key={i}
                className={cn(
                  cell.primary ? "font-semibold text-secondary" : "text-muted-foreground/55",
                )}
                style={
                  cell.primary
                    ? {
                        textShadow:
                          "0 0 10px color-mix(in oklch, var(--secondary) 55%, transparent)",
                      }
                    : undefined
                }
              >
                {cell.ch}
              </span>
            ))}
          </span>
        ))}
      </pre>
    </div>
  );
}
