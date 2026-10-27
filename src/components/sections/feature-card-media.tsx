"use client";

import dynamic from "next/dynamic";

import type { FeatureItem } from "@/components/ui/feature-slideshow";
import { FeatureWindow } from "./features/feature-kit";

const loading = () => <div className="size-full animate-pulse bg-muted" />;

const FeatureChainlinkBtcChart = dynamic(
  () => import("./feature-chainlink-btc-chart").then((m) => ({ default: m.FeatureChainlinkBtcChart })),
  { ssr: false, loading },
);
const FeatureExplorationProbabilityTable = dynamic(
  () =>
    import("./feature-exploration-probability-table").then((m) => ({
      default: m.FeatureExplorationProbabilityTable,
    })),
  { ssr: false, loading },
);
const FeatureSignalsTerminal = dynamic(
  () => import("./feature-signals-terminal").then((m) => ({ default: m.FeatureSignalsTerminal })),
  { ssr: false, loading },
);

const TITLES: Record<NonNullable<FeatureItem["liveMedia"]>, string> = {
  chainlinkBtc: "Lychee Terminal",
  explorationTable: "Live markets",
  signalsTerminal: "Signals",
};

/** Live preview window for a feature card, cropped by the bottom of its panel. */
export function FeatureCardMedia({ media }: { media: NonNullable<FeatureItem["liveMedia"]> }) {
  return (
    <div className="relative h-[21rem] overflow-hidden rounded-lg bg-black/[0.04] dark:bg-white/[0.04]">
      <FeatureWindow
        title={TITLES[media]}
        className="absolute inset-x-5 -bottom-px top-6 rounded-b-none sm:inset-x-7 sm:top-7"
      >
        {media === "chainlinkBtc" ? (
          <div className="relative flex size-full min-h-0 flex-col px-3 pb-2">
            <span
              className="pointer-events-none absolute right-3 top-2.5 z-10 inline-flex items-center gap-1 rounded-full bg-[#2f6fed]/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-[#2f6fed]"
              aria-hidden
            >
              <span className="size-1.5 animate-pulse rounded-full bg-[#2f6fed]" />
              Live
            </span>
            <FeatureChainlinkBtcChart />
          </div>
        ) : media === "explorationTable" ? (
          <FeatureExplorationProbabilityTable />
        ) : (
          <FeatureSignalsTerminal />
        )}
      </FeatureWindow>
    </div>
  );
}
