import { Suspense } from "react";

import { WarRoomTerminal } from "@/components/warRoom/WarRoomTerminal";
import { GlobePoster } from "@/components/warRoom/GlobePoster";

export const metadata = {
  title: "War Room",
  description:
    "Live prediction-market stories on a globe: weather, geopolitics, odds, and evidence in one terminal.",
};

function WarRoomFallback() {
  return (
    <div className="flex h-[100svh] flex-col bg-black">
      <div className="border-b border-white/10 px-4 py-2 text-sm text-slate-300">War Room</div>
      <GlobePoster className="min-h-0 flex-1" />
    </div>
  );
}

export default function WarRoomPage() {
  return (
    <Suspense fallback={<WarRoomFallback />}>
      <WarRoomTerminal />
    </Suspense>
  );
}
