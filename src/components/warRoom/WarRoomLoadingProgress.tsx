"use client";

import { cn } from "@/lib/utils";

function SkeletonRow({ wide }: { wide?: boolean }) {
  return (
    <div className="flex items-center gap-2 border-b border-white/[0.04] px-2.5 py-2" aria-hidden>
      <span className="size-5 shrink-0 animate-pulse rounded bg-white/10" />
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className={cn("block h-2.5 animate-pulse rounded bg-white/10", wide ? "w-[88%]" : "w-[72%]")} />
        <span className="block h-2 w-[42%] animate-pulse rounded bg-white/[0.06]" />
      </span>
      <span className="h-3 w-8 shrink-0 animate-pulse rounded bg-white/10" />
    </div>
  );
}

/** Right-rail placeholder only when there is no snapshot yet (initial cold start). */
export function WarRoomRailSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy="true" aria-label="Loading markets">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} wide={i % 3 === 0} />
      ))}
    </div>
  );
}

/** War Room step labels for DashboardLoadingProgress. */
export const WAR_ROOM_LOAD_STEPS = [
  "Switching view",
  "Fetching markets",
  "Placing globe pings",
  "Updating rails",
];
