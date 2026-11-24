"use client";

import { useCallback, useMemo, useState } from "react";

import { terminalTab } from "@/components/terminals/openTerminalTab";
import { findTerminal } from "@/lib/workspaceTerminals";

import {
  marketSubjectFromNavigate,
  type WarRoomMarketSubject,
  type WarRoomNavigateRequest,
} from "./researchHandoff";

const BROWSE_MODE_KEY = "lychee:holderTerminal:browseMode";

export type WarRoomDemoTraderSubject = {
  kind: "trader";
  address: string;
  title?: string;
};

export type WarRoomDemoSubject = WarRoomMarketSubject | WarRoomDemoTraderSubject;

function preferBrowseMode(mode: "markets" | "holders") {
  try {
    window.localStorage.setItem(BROWSE_MODE_KEY, mode);
  } catch {
    /* storage blocked */
  }
}

export function holderWorkspace(subject: WarRoomDemoSubject | null) {
  const terminal = findTerminal("holder");
  if (!terminal) return null;
  const startTab = terminalTab(terminal, subject, []);
  return {
    workspaceStartTabs: [startTab],
    activeWorkspaceStartTabId: startTab.id,
  };
}

/**
 * Shared in-demo handoff: Research Holders / Research Market select the Explore
 * Holders or Markets top tab and expand that terminal with market context.
 */
export function useWarRoomResearchDemo() {
  const [marketSubject, setMarketSubject] = useState<WarRoomMarketSubject | null>(null);
  const [holdersSubject, setHoldersSubject] = useState<WarRoomDemoSubject | null>(null);

  const marketsStart = useMemo(() => holderWorkspace(marketSubject), [marketSubject]);
  const holdersStart = useMemo(() => holderWorkspace(holdersSubject), [holdersSubject]);

  const openMarketsTab = useCallback((subject: WarRoomMarketSubject | null = null) => {
    preferBrowseMode("markets");
    setMarketSubject(subject);
    return "markets" as const;
  }, []);

  const openHoldersTab = useCallback((subject: WarRoomDemoSubject | null = null) => {
    preferBrowseMode("holders");
    setHoldersSubject(subject);
    return "holders" as const;
  }, []);

  const applyResearchNavigate = useCallback(
    (request: WarRoomNavigateRequest): "markets" | "holders" | "war-room" | null => {
      if (request.type === "war-room-market") return "war-room";
      if (request.type !== "holders" && request.type !== "markets") return null;

      const subject = marketSubjectFromNavigate(request);
      if (request.type === "holders") {
        // Polymarket market → Holders tab expanded on that market’s holders.
        // Without a condition id, still switch to Holders browse.
        return openHoldersTab(subject);
      }
      // Research Market → Markets tab expanded on the same market when possible.
      return openMarketsTab(subject);
    },
    [openHoldersTab, openMarketsTab],
  );

  return {
    marketSubject,
    holdersSubject,
    marketsStart,
    holdersStart,
    openMarketsTab,
    openHoldersTab,
    applyResearchNavigate,
  };
}
