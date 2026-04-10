"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const VIEW_W = 1000;
const VIEW_H = 200;
const MID = VIEW_H / 2;
const AMP = 52;

function buildPath(t: number): string {
  const n = 96;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = u * VIEW_W;
    const nx = u * Math.PI * 5;
    const y =
      MID +
      AMP *
        (0.52 * Math.sin(nx + t) +
          0.28 * Math.sin(nx * 2.17 - t * 1.1) +
          0.14 * Math.sin(nx * 0.61 + t * 0.85) +
          0.06 * Math.sin(nx * 3.4 + t * 0.4));
    d += (i === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2);
  }
  return d;
}

type CtaLycheeAsciiArtProps = {
  className?: string;
};

export function CtaLycheeAsciiArt({ className }: CtaLycheeAsciiArtProps) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    let raf = 0;
    const loop = (time: number) => {
      path.setAttribute("d", buildPath(time * 0.00055));
      raf = requestAnimationFrame(loop);
    };
    path.setAttribute("d", buildPath(0));
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none flex w-full select-none items-center justify-center overflow-hidden text-secondary",
        className,
      )}
    >
      <svg
        className="h-28 w-full min-h-[5.5rem] max-w-none sm:h-32 md:h-36"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          ref={pathRef}
          stroke="currentColor"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
