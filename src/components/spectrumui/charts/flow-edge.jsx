"use client";

import * as React from "react";

const GLIDE_MS = 1100;

function useGlide(target, from, ready) {
  const [value, setValue] = React.useState(from);
  const current = React.useRef(from);
  if (!ready) current.current = from;
  React.useEffect(() => {
    if (!ready) return undefined;
    const start = current.current;
    const began = performance.now();
    let frame = 0;
    const step = (now) => {
      const p = Math.min(1, (now - began) / GLIDE_MS);
      const e = 1 - Math.pow(1 - p, 4);
      const next = { x: start.x + (target.x - start.x) * e, y: start.y + (target.y - start.y) * e };
      current.current = next;
      setValue(next);
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [ready, target.x, target.y]);
  return ready ? value : from;
}

/**
 * Trade history flows in from now back to the market's open. Content clipped by `#${id}` shows
 * only to the right of an edge that starts at `right` and glides left to `point`, the oldest
 * point drawn so far. Once the history is complete (`filling` false) the edge glides past `left`.
 */
export function FlowEdge({ id, point, left, right, filling, ready, top, bottom, width, height, color }) {
  const target = filling && point ? { x: point.x - 2, y: point.y } : { x: left - 8, y: point?.y ?? top };
  const edge = useGlide(target, { x: right + 4, y: point?.y ?? top }, ready);
  const showFront = filling && ready && point;
  return (
    <>
      <clipPath id={id}>
        <rect x={edge.x} y={-4} width={Math.max(0, width - edge.x + 8)} height={height + 8} />
      </clipPath>
      {showFront ? (
        <g pointerEvents="none">
          <defs>
            <linearGradient id={`${id}-front`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0" />
              <stop offset="50%" stopColor={color} stopOpacity="0.55" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${id}-wash`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity="0" />
              <stop offset="100%" stopColor={color} stopOpacity="0.08" />
            </linearGradient>
          </defs>
          <rect x={edge.x - 36} y={top} width={36} height={Math.max(0, bottom - top)} fill={`url(#${id}-wash)`} />
          <line x1={edge.x} x2={edge.x} y1={top} y2={bottom} stroke={`url(#${id}-front)`} strokeWidth="1" />
          <circle cx={edge.x + 2} cy={edge.y} r="7" fill={color} opacity="0.18">
            <animate attributeName="r" values="4;9;4" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.28;0.05;0.28" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <circle cx={edge.x + 2} cy={edge.y} r="3" fill={color} stroke="var(--spectrum-chart-surface, #fff)" strokeWidth="1.5" />
        </g>
      ) : null}
    </>
  );
}

export function FlowLabel({ label, reduce }) {
  return (
    <span className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] tabular-nums text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
      <span className="relative flex h-1.5 w-1.5">
        {reduce ? null : <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60" />}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" />
      </span>
      {label}
    </span>
  );
}
