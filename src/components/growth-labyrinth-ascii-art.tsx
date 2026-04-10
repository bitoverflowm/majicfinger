"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

/** Same accent as DNA helix: `text-secondary` + `var(--secondary)` glow via color-mix. */
const GLOW_VISITED: CSSProperties = {
  textShadow:
    "0 0 8px color-mix(in oklch, var(--secondary) 50%, transparent), 0 0 16px color-mix(in oklch, var(--secondary) 32%, transparent)",
};

const GLOW_FRONTIER: CSSProperties = {
  textShadow:
    "0 0 10px color-mix(in oklch, var(--secondary) 65%, transparent), 0 0 22px color-mix(in oklch, var(--secondary) 42%, transparent), 0 0 34px color-mix(in oklch, var(--secondary) 22%, transparent)",
};

const GLOW_FILLED: CSSProperties = {
  textShadow:
    "0 0 6px color-mix(in oklch, var(--secondary) 55%, transparent), 0 0 14px color-mix(in oklch, var(--secondary) 38%, transparent)",
};

const WALL_GLYPHS = ["█", "▓", "▒"] as const;

function wallGlyph(r: number, c: number): string {
  return WALL_GLYPHS[(r * 5 + c * 3) % 3]!;
}

function inDisk(
  r: number,
  c: number,
  cx: number,
  cy: number,
  r2Max: number,
): boolean {
  const dr = r - cx;
  const dc = c - cy;
  return dr * dr + dc * dc <= r2Max;
}

/** Recursive backtracker from center; only cells inside the disk participate. */
function generateCircularMaze(size: number, seed: number): string[] {
  let s = seed >>> 0;
  const rnd = (n: number) => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return n <= 1 ? 0 : s % n;
  };

  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const radius = Math.min(cx, cy) - 0.5;
  const r2Max = radius * radius;

  const g: string[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) =>
      inDisk(r, c, cx, cy, r2Max) ? "#" : " ",
    ),
  );

  const sr = Math.round(cx);
  const sc = Math.round(cy);
  if (g[sr]?.[sc] === "#") g[sr][sc] = ".";

  const stack: [number, number][] = [[sr, sc]];
  const dirs = [
    [0, 2],
    [0, -2],
    [2, 0],
    [-2, 0],
  ] as const;

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1]!;
    const opts: [number, number][] = [];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inDisk(nr, nc, cx, cy, r2Max)) continue;
      const mr = r + dr / 2;
      const mc = c + dc / 2;
      if (!inDisk(mr, mc, cx, cy, r2Max)) continue;
      if (g[nr]?.[nc] !== "#") continue;
      opts.push([nr, nc]);
    }
    if (opts.length === 0) {
      stack.pop();
      continue;
    }
    const pick = opts[rnd(opts.length)]!;
    const [nr, nc] = pick;
    const dr = nr - r;
    const dc = nc - c;
    g[r + dr / 2][c + dc / 2] = ".";
    g[nr][nc] = ".";
    stack.push([nr, nc]);
  }

  const openN = (r: number, c: number) => {
    let n = 0;
    if (g[r - 1]?.[c] === ".") n++;
    if (g[r + 1]?.[c] === ".") n++;
    if (g[r][c - 1] === ".") n++;
    if (g[r][c + 1] === ".") n++;
    return n;
  };

  const carveExtra = Math.floor((size * size) / 14);
  for (let k = 0; k < carveExtra; k++) {
    const r = rnd(size);
    const c = rnd(size);
    if (g[r]?.[c] !== "#") continue;
    if (!inDisk(r, c, cx, cy, r2Max * 0.92)) continue;
    if (openN(r, c) >= 2) g[r][c] = ".";
  }

  return g.map((row) => row.join(""));
}

function bfsDistances(
  rows: readonly string[],
  start: [number, number],
): { dist: number[][]; maxDist: number } {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const dist: number[][] = Array.from({ length: h }, () => Array(w).fill(-1));
  const [sr, sc] = start;
  if (rows[sr]?.[sc] !== ".") {
    return { dist, maxDist: 0 };
  }
  const q: [number, number][] = [[sr, sc]];
  dist[sr][sc] = 0;
  const dirs = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ] as const;
  let head = 0;
  while (head < q.length) {
    const [r, c] = q[head++]!;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= h || nc < 0 || nc >= w) continue;
      if (rows[nr]![nc] !== ".") continue;
      if (dist[nr][nc] !== -1) continue;
      dist[nr][nc] = dist[r][c] + 1;
      q.push([nr, nc]);
    }
  }
  let maxD = 0;
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const d = dist[r][c];
      if (d > maxD) maxD = d;
    }
  }
  return { dist, maxDist: maxD };
}

type PathState = "ahead" | "visited" | "frontier" | "filled";

function pathState(d: number, wave: number, phase: "wave" | "hold"): PathState {
  if (d < 0) return "ahead";
  if (phase === "hold") return "filled";
  if (d === wave) return "frontier";
  if (d < wave) return "visited";
  return "ahead";
}

const SIZE = 37;
const SEED = 71_311;
const START: [number, number] = [Math.round((SIZE - 1) / 2), Math.round((SIZE - 1) / 2)];

const MAZE = generateCircularMaze(SIZE, SEED);

export function GrowthLabyrinthAsciiArt() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setFrame((f) => f + 1), 78);
    return () => window.clearInterval(id);
  }, []);

  const { dist, maxDist } = useMemo(() => bfsDistances(MAZE, START), []);
  const hold = 38;
  const cycle = maxDist + 1 + hold;
  const t = frame % Math.max(cycle, 1);
  const wave = Math.min(t, maxDist);
  const phase: "wave" | "hold" = t > maxDist ? "hold" : "wave";

  const rendered = useMemo(() => {
    const blocks: { ch: string; className: string; style?: CSSProperties }[][] = [];

    for (let r = 0; r < MAZE.length; r++) {
      const row = MAZE[r]!;
      const line: { ch: string; className: string; style?: CSSProperties }[] = [];
      for (let c = 0; c < row.length; c++) {
        const raw = row[c]!;
        if (raw === " ") {
          line.push({ ch: " ", className: "text-transparent select-none" });
          continue;
        }
        if (raw === "#") {
          line.push({
            ch: wallGlyph(r, c),
            className: "text-muted-foreground/40",
          });
          continue;
        }

        const d = dist[r][c];
        const st = pathState(d, wave, phase);

        if (st === "ahead") {
          line.push({
            ch: "\u00A0",
            className: "select-none",
          });
        } else if (st === "visited") {
          line.push({
            ch: "░",
            className: "font-medium text-secondary",
            style: GLOW_VISITED,
          });
        } else if (st === "frontier") {
          line.push({
            ch: "▒",
            className: "font-semibold text-secondary",
            style: GLOW_FRONTIER,
          });
        } else {
          line.push({
            ch: "█",
            className: "font-bold text-secondary",
            style: GLOW_FILLED,
          });
        }
      }
      blocks.push(line);
    }

    return blocks;
  }, [dist, wave, phase]);

  return (
    <div className="relative mx-auto flex h-full min-h-[420px] w-full max-w-full min-w-0 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/25 p-3 dark:bg-muted/15 sm:min-h-[460px] sm:p-4">
      <pre
        className={cn(
          "mx-auto block w-full max-w-full overflow-hidden text-center font-mono",
          "text-[6px] leading-[1.05] sm:text-[7px] md:text-[8px]",
        )}
      >
        {rendered.map((line, r) => (
          <span key={r} className="block whitespace-pre">
            {line.map((cell, i) => (
              <span key={i} className={cell.className} style={cell.style}>
                {cell.ch}
              </span>
            ))}
          </span>
        ))}
      </pre>
    </div>
  );
}
