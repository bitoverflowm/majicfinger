"use client";

import { useMyStateV2 } from "@/context/stateContextV2";
import { useUser } from "@/lib/hooks";
import { siteConfig } from "@/lib/site";
import { findTerminal } from "@/lib/workspaceTerminals";
import { placeTerminalSubjects } from "./openTerminalTab";
import { HolderMarketBrowser } from "./holder/browse/holderMarketBrowser";
import { HolderMarketView } from "./holder/holderMarketView";
import { HolderTerminalSearch } from "./holder/holderTerminalSearch";
import { HolderTraderView } from "./holder/holderTraderView";

function HolderTerminal({ tab }) {
  const ctx = useMyStateV2();
  const user = useUser();
  const subject = tab?.terminalSubject || null;
  const pick = (subjects) => {
    if (!tab?.id) return;
    placeTerminalSubjects({ ctx, tabId: tab.id, subjects, accountId: user?.userId || "" });
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
        <header className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Lychee Holder Terminal: Polymarket
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Welcome to the terminal. Kash here (
            <a
              href={siteConfig.links.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              @misterrpink
            </a>
            ). I used all my technical, quant, data engineering and research methodology knowledge to answer one
            question: what would my dream whale-tracking research station look like? Lychee Holder Terminal is what I
            came up with. Hope you enjoy.
          </p>
        </header>
        <HolderTerminalSearch onPick={pick} className="mt-6 max-w-3xl" />
        {subject?.kind === "market" ? (
          <HolderMarketView key={subject.conditionId} subject={subject} />
        ) : subject?.kind === "trader" ? (
          <HolderTraderView
            key={subject.address}
            subject={subject}
            onProfileName={(title) => pick([{ ...subject, title }])}
          />
        ) : (
          <HolderMarketBrowser onPick={pick} className="mt-10" />
        )}
      </div>
    </div>
  );
}

const TERMINAL_VIEWS = {
  holder: HolderTerminal,
};

/** The body of a terminal tab. It covers the canvas, so a terminal never shows sheet blocks. */
export function TerminalSurface({ terminalId, tab }) {
  const terminal = findTerminal(terminalId);
  const View = TERMINAL_VIEWS[terminalId];
  if (!terminal || !View) return null;
  return (
    <section aria-label={terminal.title} className="flex min-h-0 flex-1 flex-col">
      <View key={tab?.id} tab={tab} />
    </section>
  );
}
