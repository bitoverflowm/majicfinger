"use client";

import { cn } from "@/lib/utils";
import React from "react";

export default function Ripple({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  circleSizeStep = 70,
  className,
  circleClassName,
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 select-none bg-white/5 [mask-image:linear-gradient(to_bottom,white,transparent)]",
        className
      )}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * circleSizeStep;
        const opacity = mainCircleOpacity - i * 0.03;
        const borderOpacity = 5 + i * 5;

        return (
          <div
            key={i}
            className={cn(
              "absolute rounded-full border bg-foreground/25 shadow-xl animate-ripple",
              circleClassName
            )}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              opacity,
              animationDelay: `${i * 0.2}s`,
              borderStyle: i === numCircles - 1 ? "dashed" : "solid",
              borderWidth: "1px",
              borderColor: circleClassName
                ? undefined
                : `hsl(var(--foreground) / ${borderOpacity / 100})`,
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
