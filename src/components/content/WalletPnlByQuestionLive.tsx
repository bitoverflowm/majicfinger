"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";

import { TraderPnlByQuestion } from "@/components/terminals/holder/traderPnlByQuestion";
import { finishedBetList, useFinishedBets } from "@/components/terminals/holder/traderFinishedBets";
import { useTraderPositions } from "@/components/terminals/holder/traderPositionsTable";

const WALLET = "0xc301c1e034e71e1a6ce9684f029c4674a00466aa";

/** Live Holder Terminal “PnL by question” for Contestable-Parfait. Figures can differ from the article’s snapshot. */
export function WalletPnlByQuestionLive() {
  const finished = useFinishedBets(WALLET, "");
  const positions = useTraderPositions(WALLET, "");
  const bets = useMemo(
    () => (finished.status === "ready" ? finishedBetList(finished.rows, positions.rows, finished.done) : []),
    [finished.status, finished.rows, finished.done, positions.rows],
  );
  const ready = finished.status === "ready" && positions.status === "ready";
  const error = finished.status === "error" ? finished.error : positions.status === "error" ? positions.error : "";

  return (
    <figure data-article-bleed className="not-prose mx-auto my-8 w-full font-sans sm:my-10">
      <div className="rounded-xl border border-border bg-muted/40 p-2 sm:p-3">
        {ready ? (
          <TraderPnlByQuestion bets={bets} openRows={positions.rows} onPickMarket={undefined} />
        ) : error ? (
          <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">{error}</p>
        ) : (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-[13px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading Contestable-Parfait’s PnL by question
          </div>
        )}
      </div>
      <figcaption className="mx-auto mt-3 max-w-[42rem] text-center text-xs leading-relaxed text-muted-foreground">
        Live Holder Terminal view for Contestable-Parfait. Open prices and new fills can move these numbers away from the November 14 snapshot in the article.
      </figcaption>
    </figure>
  );
}
