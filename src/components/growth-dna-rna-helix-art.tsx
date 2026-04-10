"use client";

import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type Cell = { ch: string; primary: boolean };

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/**
 * A helix that "unzips" into two RNA strands, then re-zips.
 * We keep the same ASCII language as `GrowthDnaHelixArt`, but switch accent to red.
 */
function buildRow(r: number, frame: number, width: number, split: number): Cell[] {
  const cells: Cell[] = Array.from({ length: width }, () => ({ ch: " ", primary: false }));

  const phase = r * 0.62 + frame * 0.19;
  const amp = Math.min(9, Math.floor((width - 4) / 2));

  // Base helix x positions
  let x1 = Math.round(width / 2 + amp * Math.sin(phase));
  let x2 = Math.round(width / 2 - amp * Math.sin(phase));

  // As we "split", push strands outward a bit.
  const push = Math.round(3 * split);
  x1 += push;
  x2 -= push;

  x1 = Math.max(1, Math.min(width - 2, x1));
  x2 = Math.max(1, Math.min(width - 2, x2));

  const lo = Math.min(x1, x2);
  const hi = Math.max(x1, x2);

  const highlight =
    ((r * 4 + frame) % 13) < 4 || ((r * 7 + frame * 3) % 19) < 2;

  // When split is high, remove the rungs and show two RNA strands.
  const showRungs = split < 0.45;

  if (showRungs) {
    if (hi <= lo + 1) {
      const mid = Math.max(0, Math.min(width - 1, Math.round((x1 + x2) / 2)));
      cells[mid] = { ch: highlight ? "X" : "x", primary: highlight };
      return cells;
    }

    const rung = highlight ? "=" : "-";
    for (let c = lo + 1; c < hi; c++) {
      cells[c] = { ch: rung, primary: highlight };
    }
    cells[lo] = { ch: highlight ? "O" : "o", primary: highlight };
    cells[hi] = { ch: highlight ? "O" : "o", primary: highlight };
    return cells;
  }

  // RNA strands: use a slightly different alphabet so it reads as "not DNA".
  // Keep it subtle: U is the "signature" nucleotide.
  const leftCh = highlight ? "U" : "u";
  const rightCh = highlight ? "U" : "u";
  cells[lo] = { ch: leftCh, primary: highlight };
  cells[hi] = { ch: rightCh, primary: highlight };

  // Add faint "tails" to make the strands feel continuous.
  if (lo - 1 >= 0) cells[lo - 1] = { ch: "~", primary: false };
  if (hi + 1 < width) cells[hi + 1] = { ch: "~", primary: false };

  // A brief "recombine" hint when coming back together.
  if (split < 0.9 && hi > lo + 2) {
    const mid = Math.round((lo + hi) / 2);
    cells[mid] = { ch: highlight ? "·" : ".", primary: highlight };
  }

  return cells;
}

export function GrowthDnaRnaHelixArt() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setFrame((f) => f + 1), 70);
    return () => window.clearInterval(id);
  }, []);

  const width = 34;
  const rows = 18;

  const split = useMemo(() => {
    // 0 → (split) → hold (no merge)
    const splitFrames = 22;
    const holdFrames = 14;
    const cycle = splitFrames + holdFrames;
    const t = frame % cycle;

    if (t < splitFrames) return clamp01(t / splitFrames);
    return 1;
  }, [frame]);

  const grid = useMemo(
    () =>
      Array.from({ length: rows }, (_, r) => buildRow(r, frame, width, split)),
    [frame, split, width, rows],
  );

  return (
    <div className="relative flex h-full min-h-[380px] w-full max-w-full min-w-0 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/25 p-4 dark:bg-muted/15">
      <pre className="relative z-10 mx-auto w-max max-w-full overflow-hidden text-left font-mono text-[7px] leading-[1.1] sm:text-[8px] md:text-[9px]">
        {grid.map((line, r) => (
          <span key={r} className="block whitespace-pre">
            {line.map((cell, i) => (
              <span
                key={i}
                className={cn(
                  cell.primary ? "font-semibold text-red-500" : "text-muted-foreground/55",
                )}
                style={
                  cell.primary
                    ? { textShadow: "0 0 10px rgb(239 68 68 / 0.45)" }
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

