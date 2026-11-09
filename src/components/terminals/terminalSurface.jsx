"use client";

import { useCallback, useRef } from "react";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { useMyStateV2 } from "@/context/stateContextV2";
import { findTerminal } from "@/lib/workspaceTerminals";
import { HolderHost, HolderPanelStack } from "./holder/holderPanels";

function HolderTerminal({ tab }) {
  const ctx = useMyStateV2();
  const canvas = useWorkspaceCanvas();
  const scrollRef = useRef(null);
  const toTop = useCallback(() => scrollRef.current?.scrollTo({ top: 0 }), []);
  const selectTab = useCallback(
    (id) => {
      if (canvas?.requestTab) canvas.requestTab(id);
      else ctx?.setActiveWorkspaceStartTabId?.(id);
    },
    [canvas, ctx],
  );
  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
        <HolderHost tab={tab} onTop={toTop} selectTab={selectTab}>
          <HolderPanelStack />
        </HolderHost>
      </div>
    </div>
  );
}

const TERMINAL_VIEWS = {
  holder: HolderTerminal,
};

/**
 * A terminal tab as one page over the canvas. Only the landing demo shows terminals this way;
 * on a dashboard each panel is a canvas block (see terminalCanvas).
 */
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
