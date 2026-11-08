"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { FeatureTip, useFeatureTipDismissal } from "@/components/ui/feature-tip";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useUser } from "@/lib/hooks";
import { siteConfig } from "@/lib/site";
import { findTerminal } from "@/lib/workspaceTerminals";
import { exploreFromTerminal, placeTerminalSubjects } from "./openTerminalTab";
import { HolderBrowse } from "./holder/browse/holderBrowse";
import { HolderMarketView } from "./holder/holderMarketView";
import { HolderTerminalSearch } from "./holder/holderTerminalSearch";
import { HolderTraderView } from "./holder/holderTraderView";

/**
 * The "your previous view is here" tip, shared across tabs: Explore can send the user to a
 * different tab than the one they clicked it in. `{ hostId, tabId, kind, moved }`.
 */
let viewTip = null;
const viewTipListeners = new Set();

function setViewTip(next) {
  viewTip = next;
  viewTipListeners.forEach((listener) => listener());
}

function subscribeViewTip(listener) {
  viewTipListeners.add(listener);
  return () => viewTipListeners.delete(listener);
}

function useViewTip() {
  return useSyncExternalStore(subscribeViewTip, () => viewTip, () => null);
}

/** Points at the tab showing the previous view. The tab bar renders a new tab a frame or two later. */
function MovedViewTip({ tabId, kind, moved, onOpen, onClose, onSpent }) {
  const anchorRef = useRef(null);
  const [ready, setReady] = useState(false);
  const onSpentRef = useRef(onSpent);
  onSpentRef.current = onSpent;

  // Shown once: however the tip goes away after appearing (closed, another pick, leaving the tab), it's spent.
  useEffect(() => {
    if (!ready) return undefined;
    return () => onSpentRef.current?.();
  }, [ready]);

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
      title={moved ? "Moved to a new tab" : "Still open in its tab"}
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
  const sharedTip = useViewTip();
  const tip = tab?.id && sharedTip?.hostId === tab.id ? sharedTip : null;
  const movedTip = useFeatureTipDismissal("holder-terminal-moved-tab");
  const scrollRef = useRef(null);
  const accountId = user?.userId || "";
  const selectTab = (id) => {
    if (canvas?.requestTab) canvas.requestTab(id);
    else ctx?.setActiveWorkspaceStartTabId?.(id);
  };
  const pick = (subjects) => {
    if (!tab?.id) return;
    if (tip) setViewTip(null);
    placeTerminalSubjects({ ctx, tabId: tab.id, subjects, accountId });
  };
  const explore = () => {
    if (!tab?.id || !subject) return;
    const result = exploreFromTerminal({ ctx, tabId: tab.id, accountId });
    if (!result) return;
    const moved = result.exploreId === tab.id;
    setViewTip({ hostId: result.exploreId, tabId: result.viewId, kind: subject.kind, moved });
    if (moved) scrollRef.current?.scrollTo({ top: 0 });
    else selectTab(result.exploreId);
  };
  const openTab = (id) => {
    setViewTip(null);
    selectTab(id);
  };
  const closeTip = useRef(() => setViewTip(null)).current;
  const spendTip = () => {
    movedTip.dismiss();
    if (viewTip === tip) setViewTip(null);
  };

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
          <HolderMarketView
            key={subject.conditionId}
            subject={subject}
            onPickTrader={({ address, title }) => {
              pick([{ kind: "trader", address, title }]);
              scrollRef.current?.scrollTo({ top: 0 });
            }}
          />
        ) : subject?.kind === "trader" ? (
          <HolderTraderView
            key={subject.address}
            subject={subject}
            onProfileName={(title) => pick([{ ...subject, title }])}
          />
        ) : (
          <HolderBrowse onPick={pick} className="mt-10" />
        )}
      </div>
      {tip && movedTip.dismissed === false ? (
        <MovedViewTip tabId={tip.tabId} kind={tip.kind} moved={tip.moved} onOpen={() => openTab(tip.tabId)} onClose={closeTip} onSpent={spendTip} />
      ) : null}
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
