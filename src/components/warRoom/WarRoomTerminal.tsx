"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { DashboardDemoSectionLazy } from "@/components/sections/dashboard-demo-section-lazy";
import { warRoomHref } from "@/lib/warRoom/href";
import { cn } from "@/lib/utils";

import { useWarRoomResearchDemo } from "./useWarRoomResearchDemo";
import { WarRoomView, type WarRoomNavigateRequest } from "./WarRoomView";

const TABS = [
  { id: "war-room", label: "War Room" },
  { id: "markets", label: "Markets" },
  { id: "holders", label: "Holders" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const BARE_DEMO_SECTION_CLASS = "relative z-30 m-0 h-full w-full p-0";

/**
 * Full-page War Room. Same Research Holders / Research Market handoff as the
 * homepage demo: stay on this screen, select Holders or Markets, expand with context.
 */
export function WarRoomTerminal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const market = searchParams?.get("market") || "";
  const fixture = ["1", "true", "yes"].includes(String(searchParams?.get("fixture") || "").toLowerCase());
  const [tab, setTab] = useState<TabId>("war-room");
  const {
    marketSubject,
    holdersSubject,
    marketsStart,
    holdersStart,
    openMarketsTab,
    openHoldersTab,
    applyResearchNavigate,
  } = useWarRoomResearchDemo();

  const onMarketChange = useCallback(
    (id: string | null) => {
      const href = warRoomHref({ market: id });
      const suffix = fixture ? `${href.includes("?") ? "&" : "?"}fixture=1` : "";
      router.replace(`${href}${suffix}`, { scroll: false });
    },
    [fixture, router],
  );

  const onNavigate = useCallback(
    (request: WarRoomNavigateRequest) => {
      const next = applyResearchNavigate(request);
      if (next === "markets" || next === "holders" || next === "war-room") setTab(next);
    },
    [applyResearchNavigate],
  );

  const onSelectTab = useCallback(
    (id: TabId) => {
      if (id === "markets") {
        openMarketsTab(marketSubject);
        setTab("markets");
        return;
      }
      if (id === "holders") {
        openHoldersTab(holdersSubject);
        setTab("holders");
        return;
      }
      setTab("war-room");
    },
    [holdersSubject, marketSubject, openHoldersTab, openMarketsTab],
  );

  const showMarkets = tab === "markets" && marketsStart;
  const showHolders = tab === "holders" && holdersStart;
  const holdersKey =
    holdersSubject?.kind === "market"
      ? holdersSubject.conditionId
      : holdersSubject?.kind === "trader"
        ? holdersSubject.address
        : "browse";

  return (
    <div className="flex h-[100svh] min-h-[100svh] flex-col bg-black text-slate-100">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link href="/" className="font-medium text-white">
            Lychee
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-slate-300">War Room</span>
        </div>
        <div role="tablist" aria-label="War Room research" className="flex flex-wrap justify-end gap-1.5">
          {TABS.map((item) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onSelectTab(item.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-medium transition",
                  selected ? "bg-white text-slate-950" : "text-slate-400 hover:bg-white/10 hover:text-white",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {tab === "war-room" ? (
          <WarRoomView
            fixture={fixture}
            embedded
            market={market}
            onMarketChange={onMarketChange}
            onNavigate={onNavigate}
            className="h-full"
          />
        ) : null}

        {showMarkets ? (
          <div className="h-full w-full bg-background">
            <DashboardDemoSectionLazy
              key={`markets-${marketSubject?.conditionId || "explore"}`}
              force
              bare
              sectionId="war-room-markets"
              className={BARE_DEMO_SECTION_CLASS}
              landingDemoSurface="markets"
              workspaceStartTabs={marketsStart.workspaceStartTabs}
              activeWorkspaceStartTabId={marketsStart.activeWorkspaceStartTabId}
            />
          </div>
        ) : null}

        {showHolders ? (
          <div className="h-full w-full bg-background">
            <DashboardDemoSectionLazy
              key={`holders-${holdersKey}`}
              force
              bare
              sectionId="war-room-holders"
              className={BARE_DEMO_SECTION_CLASS}
              landingDemoSurface="holders"
              workspaceStartTabs={holdersStart.workspaceStartTabs}
              activeWorkspaceStartTabId={holdersStart.activeWorkspaceStartTabId}
            />
          </div>
        ) : null}
      </div>

      <p className="sr-only">{pathname}</p>
    </div>
  );
}
