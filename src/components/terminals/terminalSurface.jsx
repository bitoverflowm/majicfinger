"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { FeatureTip } from "@/components/ui/feature-tip";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useUser } from "@/lib/hooks";
import { siteConfig } from "@/lib/site";
import { findTerminal } from "@/lib/workspaceTerminals";
import { exploreFromTerminal, placeTerminalSubjects } from "./openTerminalTab";
import { HolderMarketBrowser } from "./holder/browse/holderMarketBrowser";
import { HolderMarketView } from "./holder/holderMarketView";
import { HolderTerminalSearch } from "./holder/holderTerminalSearch";
import { HolderTraderView } from "./holder/holderTraderView";

/** Points at the tab the previous view moved to. The tab bar renders it a frame or two later. */
function MovedViewTip({ tabId, kind, onOpen, onClose }) {
  const anchorRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let frame = 0;
    let tries = 0;
    const find = () => {
      const el = document.querySelector(`[data-start-tab-id="${tabId}"]`);
      if (el) {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
        anchorRef.current = el;
        setReady(true);
        return;
      }
      tries += 1;
      if (tries < 30) frame = window.requestAnimationFrame(find);
    };
    find();
    return () => window.cancelAnimationFrame(frame);
  }, [tabId]);

  return (
    <FeatureTip
      open={ready}
      anchorRef={anchorRef}
      side="bottom"
      align="start"
      title="Moved to a new tab"
      description={`Your previous ${kind === "trader" ? "trader" : "market"} view is here.`}
      onDismiss={onClose}
      secondaryAction={{ label: "Got it", onClick: onClose }}
      action={{ label: "Open it", onClick: onOpen }}
    />
  );
}

function HolderTerminal({ tab }) {
  const ctx = useMyStateV2();
  const canvas = useWorkspaceCanvas();
  const user = useUser();
  const subject = tab?.terminalSubject || null;
  const [moved, setMoved] = useState(null);
  const scrollRef = useRef(null);
  const accountId = user?.userId || "";
  const pick = (subjects) => {
    if (!tab?.id) return;
    setMoved(null);
    placeTerminalSubjects({ ctx, tabId: tab.id, subjects, accountId });
  };
  const explore = () => {
    if (!tab?.id || !subject) return;
    const id = exploreFromTerminal({ ctx, tabId: tab.id, accountId });
    if (!id) return;
    setMoved({ id, kind: subject.kind });
    scrollRef.current?.scrollTo({ top: 0 });
  };
  const openTab = (id) => {
    setMoved(null);
    if (canvas?.requestTab) canvas.requestTab(id);
    else ctx?.setActiveWorkspaceStartTabId?.(id);
  };
  const closeTip = useRef(() => setMoved(null)).current;

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
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
        <HolderTerminalSearch onPick={pick} onExplore={subject ? explore : undefined} className="mt-6 max-w-3xl" />
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
      {moved ? <MovedViewTip tabId={moved.id} kind={moved.kind} onOpen={() => openTab(moved.id)} onClose={closeTip} /> : null}
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
