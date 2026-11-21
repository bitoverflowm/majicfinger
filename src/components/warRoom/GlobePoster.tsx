import { cn } from "@/lib/utils";

/** Static LCP globe. Same box as the MapLibre canvas so swapping does not shift layout. */
export function GlobePoster({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-black",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 800 800" className="h-full w-full" role="presentation">
        <defs>
          <radialGradient id="wr-globe-fill" cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#1c3a5c" />
            <stop offset="55%" stopColor="#102033" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
          <radialGradient id="wr-globe-shade" cx="70%" cy="78%" r="55%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
          </radialGradient>
          <filter id="wr-globe-glow">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="800" height="800" fill="#000000" />
        <circle cx="400" cy="400" r="248" fill="#0a1628" />
        <circle cx="400" cy="400" r="236" fill="url(#wr-globe-fill)" />
        {Array.from({ length: 9 }).map((_, i) => {
          const y = 180 + i * 55;
          const k = Math.abs(i - 4) / 4;
          const rx = 232 * Math.sqrt(1 - k * k * 0.92);
          return (
            <ellipse
              key={`lat-${i}`}
              cx="400"
              cy={y}
              rx={rx}
              ry={18 + (1 - k) * 6}
              fill="none"
              stroke="#8fb4d9"
              strokeOpacity="0.18"
              strokeWidth="0.8"
            />
          );
        })}
        {Array.from({ length: 12 }).map((_, i) => {
          const t = ((i - 5.5) / 5.5) * 0.95;
          return (
            <path
              key={`lon-${i}`}
              d={`M400 164 C ${400 + t * 220} 300, ${400 + t * 220} 500, 400 636`}
              fill="none"
              stroke="#8fb4d9"
              strokeOpacity="0.16"
              strokeWidth="0.8"
            />
          );
        })}
        <path
          d="M250 330 C280 300 330 290 360 320 C390 350 410 300 460 310 C510 322 530 360 500 400 C470 430 430 450 390 430 C340 408 300 430 270 400 C245 375 230 350 250 330Z"
          fill="#3d6d8c"
          fillOpacity="0.55"
        />
        <path
          d="M470 250 C510 240 560 270 555 310 C548 345 500 350 470 330 C445 314 440 262 470 250Z"
          fill="#3d6d8c"
          fillOpacity="0.45"
        />
        <path
          d="M300 470 C340 455 390 480 385 520 C380 555 330 560 305 535 C280 512 275 482 300 470Z"
          fill="#3d6d8c"
          fillOpacity="0.4"
        />
        <circle cx="400" cy="400" r="236" fill="url(#wr-globe-shade)" />
        <circle
          cx="400"
          cy="400"
          r="236"
          fill="none"
          stroke="#9ec4e6"
          strokeOpacity="0.28"
          strokeWidth="1.2"
          filter="url(#wr-globe-glow)"
        />
        <circle cx="526" cy="318" r="5" fill="#7dd3fc" fillOpacity="0.95" />
        <circle cx="526" cy="318" r="11" fill="none" stroke="#7dd3fc" strokeOpacity="0.45" />
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
    </div>
  );
}
