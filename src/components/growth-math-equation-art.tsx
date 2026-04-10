"use client";

import { useMemo, useRef } from "react";
import { motion, useInView } from "framer-motion";

import { cn, colorWithOpacity, getRGBA } from "@/lib/utils";

function createSmoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";
  const smoothing = 0.18;
  return points.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = arr[i - 1]!;
    const next = arr[i + 1];
    if (!next) return `${acc} L ${point.x} ${point.y}`;
    const cp1x = prev.x + (point.x - prev.x) * smoothing;
    const cp1y = prev.y + (point.y - prev.y) * smoothing;
    const cp2x = point.x - (next.x - prev.x) * smoothing;
    const cp2y = point.y - (next.y - prev.y) * smoothing;
    return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${point.x},${point.y}`;
  }, "");
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/**
 * Replaces the old maze animation with the same "squiggly" aesthetic as the CTA line chart:
 * smooth stroke + subtle gradient fill + a math-y curve.
 */
export function GrowthMathEquationArt({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-20% 0px -20% 0px", once: true });

  const width = 720;
  const height = 260;

  const accent = useMemo(() => getRGBA("hsl(var(--secondary))"), []);
  const fillTop = useMemo(() => colorWithOpacity(accent, 0.22), [accent]);
  const fillBottom = useMemo(() => colorWithOpacity(accent, 0.0), [accent]);

  const { path, underFillPath, glowPath, eqLabel, mid } = useMemo(() => {
    // A "mathy" squiggle: sum of sines with a gentle envelope.
    // y = sin(x) + 0.35 sin(3x + φ) + 0.15 sin(7x - 0.3)
    const n = 140;
    const padX = 18;
    const padY = 18;
    const usableW = width - padX * 2;
    const usableH = height - padY * 2;
    const cx = padX;

    const points: { x: number; y: number }[] = [];
    const phi = 0.9;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1); // 0..1
      const x = cx + t * usableW;

      const xx = t * Math.PI * 2.2;
      const yRaw =
        Math.sin(xx) +
        0.35 * Math.sin(3 * xx + phi) +
        0.15 * Math.sin(7 * xx - 0.3);

      // Soft envelope to keep ends calmer (looks more "designed" in a card).
      const env = 0.6 + 0.4 * Math.sin(t * Math.PI);
      const yNorm = yRaw * env;

      // Map -1.6..1.6-ish → pixel space
      const y = padY + usableH * (0.5 - clamp01((yNorm + 1.35) / (2.7)));
      points.push({ x, y });
    }

    const p = createSmoothPath(points);
    const under = `${p} L ${width - padX},${height - padY} L ${padX},${height - padY} Z`;
    const glow = p;
    const midIdx = Math.floor(points.length / 2);
    const mid = points[midIdx]!;

    return {
      path: p,
      underFillPath: under,
      glowPath: glow,
      mid,
      eqLabel: "y = sin(x) + 0.35·sin(3x + φ) + 0.15·sin(7x − 0.3)",
    };
  }, [width, height]);

  return (
    <div
      ref={ref}
      className={cn(
        "relative w-full max-w-full overflow-hidden rounded-xl border border-border/60 bg-background/40",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_40%,hsl(var(--secondary)/0.12),transparent_60%)]" />

      <svg
        className="block h-[220px] w-full max-w-full"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="mathLineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillTop} />
            <stop offset="100%" stopColor={fillBottom} />
          </linearGradient>
          <filter id="mathGlow" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 0.65 0"
              result="glow"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Under-fill */}
        <motion.path
          d={underFillPath}
          fill="url(#mathLineFill)"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: inView ? 1 : 0, scale: inView ? 1 : 0.98 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />

        {/* Soft glow stroke behind */}
        <motion.path
          d={glowPath}
          stroke={accent}
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.18"
          filter="url(#mathGlow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: inView ? 1 : 0 }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />

        {/* Foreground stroke */}
        <motion.path
          d={path}
          stroke={accent}
          strokeWidth="2.4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: inView ? 1 : 0 }}
          transition={{ duration: 1.55, ease: "easeInOut", delay: 0.08 }}
        />

        {/* Anchor dot */}
        <motion.circle
          cx={mid.x}
          cy={mid.y}
          r="4"
          fill={accent}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: inView ? 1 : 0, opacity: inView ? 1 : 0 }}
          transition={{ delay: 0.35, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        />

        {/* Equation label */}
        <motion.text
          x={28}
          y={36}
          fill={colorWithOpacity(getRGBA("hsl(var(--foreground))"), 0.72)}
          fontSize="14"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 30 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        >
          {eqLabel}
        </motion.text>
      </svg>
    </div>
  );
}

