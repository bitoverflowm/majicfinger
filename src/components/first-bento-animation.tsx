"use client";

import Image from "next/image";
import React, { forwardRef, useRef } from "react";

import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/ui/animated-beam";

/** Matches integration card header colors in `integrationsConfig.js` (API_INTEGRATIONS). */
const INTEGRATION_BEAM_COLORS = {
  polymarket: "#2E5CFF",
  kalshi: "#28CC95",
  chainlink: "#375BD2",
  binance: "#000000",
} as const;

/** Don’t lower whole-SVG opacity — it washes out the animated gradient stroke. */
const beamClassName =
  "text-muted-foreground [&>path:first-of-type]:stroke-current";

const Circle = forwardRef<
  HTMLDivElement,
  {
    className?: string;
    children?: React.ReactNode;
    /** Integration card header color (hex), or "lychee" for brand red. */
    variant?: keyof typeof INTEGRATION_BEAM_COLORS | "lychee";
  }
>(({ className, children, variant }, ref) => {
  const bgStyle =
    variant === "lychee"
      ? undefined
      : variant
        ? { backgroundColor: INTEGRATION_BEAM_COLORS[variant] }
        : undefined;

  return (
    <div
      ref={ref}
      style={bgStyle}
      className={cn(
        "z-10 flex size-12 items-center justify-center rounded-full border-2 border-white/25 p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.45)] dark:border-white/20 dark:shadow-[0_0_24px_-10px_rgba(0,0,0,0.65)]",
        variant === "lychee" && "bg-lychee-red border-white/30",
        className,
      )}
    >
      {children}
    </div>
  );
});

Circle.displayName = "Circle";

export function FirstBentoAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const polymarketRef = useRef<HTMLDivElement>(null);
  const kalshiRef = useRef<HTMLDivElement>(null);
  const chainlinkRef = useRef<HTMLDivElement>(null);
  const binanceRef = useRef<HTMLDivElement>(null);
  const lycheeRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative flex h-[300px] w-full items-center justify-center overflow-hidden p-10" ref={containerRef}>
      {/* Beams: own layer behind logos so they stay visible in gaps (flex items stack above z-0). */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <AnimatedBeam
          className={beamClassName}
          containerRef={containerRef}
          fromRef={polymarketRef}
          toRef={lycheeRef}
          curvature={-75}
          pathWidth={2.5}
          endYOffset={-10}
          pathColor="currentColor"
          gradientStartColor="var(--secondary)"
          gradientStopColor="var(--primary)"
          duration={2.8}
          delay={0}
        />
        <AnimatedBeam
          className={beamClassName}
          containerRef={containerRef}
          fromRef={kalshiRef}
          toRef={lycheeRef}
          curvature={75}
          pathWidth={2.5}
          endYOffset={-10}
          pathColor="currentColor"
          gradientStartColor="var(--secondary)"
          gradientStopColor="var(--primary)"
          duration={2.8}
          delay={0.35}
        />
        <AnimatedBeam
          className={beamClassName}
          containerRef={containerRef}
          fromRef={chainlinkRef}
          toRef={lycheeRef}
          curvature={-75}
          pathWidth={2.5}
          endYOffset={10}
          pathColor="currentColor"
          gradientStartColor="var(--secondary)"
          gradientStopColor="var(--primary)"
          duration={2.8}
          delay={0.7}
        />
        <AnimatedBeam
          className={beamClassName}
          containerRef={containerRef}
          fromRef={binanceRef}
          toRef={lycheeRef}
          curvature={75}
          pathWidth={2.5}
          endYOffset={10}
          pathColor="currentColor"
          gradientStartColor="var(--secondary)"
          gradientStopColor="var(--primary)"
          duration={2.8}
          delay={1.05}
        />
      </div>

      <div className="relative z-10 flex size-full max-h-[220px] max-w-lg flex-col items-stretch justify-between gap-10">
        <div className="flex flex-row items-center justify-between">
          <Circle ref={polymarketRef} variant="polymarket">
            <Image src="/polymarket.png" alt="Polymarket" width={32} height={32} className="object-contain drop-shadow-sm" />
          </Circle>
          <Circle ref={kalshiRef} variant="kalshi">
            <Image src="/kalshi.png" alt="Kalshi" width={32} height={32} className="object-contain drop-shadow-sm" />
          </Circle>
        </div>

        <div className="flex flex-row items-center justify-center">
          <Circle ref={lycheeRef} variant="lychee" className="size-16 p-2.5 ring-2 ring-white/35 dark:ring-white/25">
            <Image
              src="/logo.png"
              alt="Lychee"
              width={40}
              height={40}
              className="block size-10 rounded-full object-contain grayscale"
            />
          </Circle>
        </div>

        <div className="flex flex-row items-center justify-between">
          <Circle ref={chainlinkRef} variant="chainlink">
            <Image src="/chainlink.png" alt="Chainlink" width={32} height={32} className="object-contain drop-shadow-sm" />
          </Circle>
          <Circle ref={binanceRef} variant="binance">
            <Image src="/binance.jpeg" alt="Binance" width={32} height={32} className="object-contain rounded-full ring-1 ring-white/20" />
          </Circle>
        </div>
      </div>
    </div>
  );
}

