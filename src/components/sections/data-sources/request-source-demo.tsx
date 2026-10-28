"use client";

import { Gift } from "lucide-react";

import { DataCardFrame } from "./data-card-frame";
import { useDemoVisibility, useTick } from "./demo-hooks";
import { LetterTile } from "./letter-tile";
import { VoteGrid } from "./vote-controls";

const IDEAS = [
  { id: "pearProtocol", name: "Pear Protocol", short: "Pear", mark: "P", color: "#15803d" },
  { id: "crudeOil", name: "Crude oil", short: "Crude oil", mark: "O", color: "#334155" },
  { id: "weather", name: "Weather stations", short: "Weather", mark: "W", color: "#0284c7" },
  { id: "earningsCalls", name: "Earnings calls", short: "Earnings", mark: "E", color: "#9333ea" },
] as const;

const SHUFFLE = [...IDEAS.map((idea) => idea.name), "Your idea?"];

export function RequestSourceDemo() {
  const { ref, running } = useDemoVisibility();
  const tick = useTick(1100, running);
  const label = SHUFFLE[tick % SHUFFLE.length];

  return (
    <DataCardFrame title="Data requests" frameRef={ref} compact>
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-3.5 py-2.5">
        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#a855f7] to-[#2f6fed] text-white shadow-sm">
          <Gift className="size-5" />
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-background text-[10px] font-bold text-[#a855f7] shadow">
            ?
          </span>
        </span>
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground">What should we add next?</p>
          <p key={label} className="ds-row-in truncate text-sm font-medium text-primary">
            {label}
          </p>
        </div>
      </div>
      <div className="pt-2.5">
        <VoteGrid
          options={IDEAS.map((idea) => ({
            id: idea.id,
            name: idea.name,
            short: idea.short,
            tile: <LetterTile mark={idea.mark} color={idea.color} />,
          }))}
          suggestPlaceholder="Which dataset?"
          suggestLabel="Suggest an integration"
        />
      </div>
    </DataCardFrame>
  );
}
