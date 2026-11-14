"use client";

import { TraderMarketFocus } from "@/components/terminals/holder/traderMarketFocus";

const NONE: never[] = [];

const MARKET = {
  conditionId: "0x6e2ec84614f1f22ee36640cd9a1f21d0e95d885bd0559961d4a7fe92b8ba0a30",
  title: "Will the Knesset elect a new Speaker by November 13?",
  slug: "will-the-knesset-elect-a-new-speaker-by-november-13",
};

const WALLET = "0xc301c1e034e71e1a6ce9684f029c4674a00466aa";

/** Holder Terminal chart for the November 13 speaker contract and Contestable-Parfait's fills. */
export function KnessetTradeNewsChart() {
  return (
    <figure data-article-bleed className="not-prose mx-auto my-8 w-full font-sans sm:my-10">
      <div className="rounded-xl border border-border bg-muted/40 p-2 sm:p-3">
        <TraderMarketFocus
          address={WALLET}
          fromMarket={MARKET}
          trades={NONE}
          positions={NONE}
          bets={NONE}
          lastTrade={null}
        />
      </div>
      <figcaption className="mx-auto mt-3 max-w-[42rem] text-center text-xs leading-relaxed text-muted-foreground">
        Contestable-Parfait on “Will the Knesset elect a new Speaker by November 13?” Dots are this wallet’s orders.
        Amber marks are headlines that mention every word in the search. Starts on Around their moves.
      </figcaption>
    </figure>
  );
}
