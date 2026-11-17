"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";

import { HolderEntryHistogram } from "@/components/terminals/holder/holderEntryHistogram";
import { HolderSupplyPanels } from "@/components/terminals/holder/holderSupplyPanels";
import { TraderMarketFocus } from "@/components/terminals/holder/traderMarketFocus";
import { useHolderSupply } from "@/components/terminals/holder/useHolderSupply";
import { useLiveMarketMeta, useLiveMarketStats } from "@/components/terminals/holder/useLiveMarketMeta";

const CONDITION_ID = "0xc98928904d91c44bdc4af3d70d0e08f1199aa8aae3e879e197ae38f0e93eab44";
const PURAVIDA = "0x80a4552cdcde3b861b8adc146ab1fbd4711022cc";
const NONE: any[] = [];

type MarketMeta = {
  title?: string;
  outcomes?: string[];
  tokenIds?: string[];
  conditionId?: string;
  prices?: number[];
  closed?: boolean;
  [key: string]: unknown;
};

function cents(price: number | null | undefined) {
  if (!Number.isFinite(price as number)) return "—";
  return `${Math.round((price as number) * 1000) / 10}¢`;
}

/** Live Profit/loss + Where the supply was bought for the three-hike Fed contract. */
export function FedHolderEntryPricesLive() {
  const live = useLiveMarketMeta(CONDITION_ID) as {
    meta: MarketMeta | null;
    error: string;
    quotes: Record<string, unknown>;
  };
  const meta = live.meta;
  const stats = useLiveMarketStats(meta, live.quotes, NONE) as { prices?: number[] } | null;
  const supply = useHolderSupply(meta, NONE, stats?.prices || [], null);
  const outcomes = useMemo(() => meta?.outcomes || ["Yes", "No"], [meta]);
  const ready = !!(supply.sides && meta);
  const error = live.error || supply.error;

  return (
    <figure data-article-bleed className="not-prose mx-auto my-8 w-full font-sans sm:my-10">
      <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-2 sm:p-3">
        {ready ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-1 pt-1">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-foreground">{meta?.title || "Fed rate hikes contract"}</p>
                <p className="text-[11px] text-muted-foreground">Live Holder Terminal · average entry vs now</p>
              </div>
              <dl className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                {(supply.sides || []).map((side: { outcome: string; avgEntry: number | null; price: number }, index: number) => (
                  <div key={side.outcome} className="flex items-baseline gap-1.5">
                    <dt className="text-muted-foreground">{outcomes[index]} entry</dt>
                    <dd className="font-mono font-semibold tabular-nums text-foreground">{cents(side.avgEntry)}</dd>
                    <dd className="font-mono text-[11px] tabular-nums text-muted-foreground">now {cents(side.price)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <HolderSupplyPanels sides={supply.sides} outcomes={outcomes} error="" />
            <HolderEntryHistogram sides={supply.sides} outcomes={outcomes} loading={false} />
          </>
        ) : error ? (
          <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">{error}</p>
        ) : (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-[13px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading holders and entry prices
          </div>
        )}
      </div>
      <figcaption className="mx-auto mt-3 max-w-[42rem] text-center text-xs leading-relaxed text-muted-foreground">
        Live “Profit, loss and ownership” and “Where the supply was bought” for this Fed contract. Figures can differ from the
        November 17 snapshot in the article.
      </figcaption>
    </figure>
  );
}

/** Puravida’s fills on the same Fed contract. */
export function PuravidaFedMarketFocus() {
  const market = {
    conditionId: CONDITION_ID,
    title: "Will the Fed hike rates at the December, January, and March meetings?",
    slug: "will-the-fed-hike-rates-at-all-three-of-its-december-january-and-march-meetings",
  };

  return (
    <figure data-article-bleed className="not-prose mx-auto my-8 w-full font-sans sm:my-10">
      <div className="rounded-xl border border-border bg-muted/40 p-2 sm:p-3">
        <TraderMarketFocus
          address={PURAVIDA}
          fromMarket={market}
          trades={NONE}
          positions={NONE}
          bets={NONE}
          lastTrade={null}
          onPickMarket={undefined}
        />
      </div>
      <figcaption className="mx-auto mt-3 max-w-[42rem] text-center text-xs leading-relaxed text-muted-foreground">
        Puravida on the three consecutive Fed rate-hike contract. Dots are this wallet’s orders in the market. Use them to
        separate a big fill from the position’s average entry.
      </figcaption>
    </figure>
  );
}
