"use client";

import { cn } from "@/lib/utils";

/** The dock's hand tool icon. `closed` curls the fingers into a grab. */
export function HandToolIcon({ closed, className }) {
  const curl = (degrees) => ({
    transformBox: "fill-box",
    transformOrigin: "50% 100%",
    transform: closed ? `translateY(1.5px) rotate(${degrees}deg) scaleY(0.72)` : "none",
    transition: "transform 150ms cubic-bezier(0.22, 1, 0.36, 1)",
  });
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-[18px] origin-center transition-transform duration-150 ease-out", closed && "scale-[0.9]", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8.2 11.4V7a1.35 1.35 0 0 1 2.7 0v4.4" style={curl(18)} />
      <path d="M10.9 10.8V4.8a1.35 1.35 0 0 1 2.7 0V11" style={curl(6)} />
      <path d="M13.6 11V6.2a1.35 1.35 0 0 1 2.7 0V11.3" style={curl(-8)} />
      <path d="M16.3 12.2V8.4a1.3 1.3 0 0 1 2.6 0v3.8c0 3.6-2.1 6.6-5.8 6.6h-1.4c-2.2 0-3.5-.8-4.7-2.2L5.2 14.2a1.45 1.45 0 0 1 2.15-1.95L9.2 14" />
    </svg>
  );
}
