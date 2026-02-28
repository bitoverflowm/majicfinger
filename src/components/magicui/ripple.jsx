"use client";

import { cn } from "@/lib/utils";
import React from "react";

export default function Ripple({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  className,
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 bg-white/5 [mask-image:linear-gradient(to_bottom,white,transparent)]",
        className
      )}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 70;
        const opacity = mainCircleOpacity - i * 0.03;
        const borderOpacity = 5 + i * 5;

        return (
          <div
            key={i}
            className="absolute rounded-full bg-foreground/25 shadow-xl border animate-ripple"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              opacity,
              animationDelay: `${i * 0.2}s`,
              borderStyle: i === numCircles - 1 ? "dashed" : "solid",
              borderWidth: "1px",
              borderColor: `hsl(var(--foreground) / ${borderOpacity / 100})`,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) scale(1)",
              ["--i"]: i,
            }}
          />
        );
      })}
    </div>
  );
}
