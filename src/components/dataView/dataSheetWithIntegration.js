"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useMyStateV2 } from "@/context/stateContextV2";
import DataView from "@/components/dataView";
import { ChartBuilderProvider, ChartCanvas } from "@/components/chartView";
import ChartControls from "@/components/chartView/ChartControls";
import Polymarket from "@/components/integrationsView/integrationPlayground/integrations/polymarket";
import PolymarketHistorical from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical";
import KalshiHistorical from "@/components/integrationsView/integrationPlayground/integrations/kalshiHistorical";
import CoinGecko from "@/components/integrationsView/integrationPlayground/integrations/coinGecko";
import Twitter from "@/components/integrationsView/integrationPlayground/integrations/twitter";
import WallStreetBets from "@/components/integrationsView/integrationPlayground/integrations/wallStreetBets";
import GeckoDex from "@/components/integrationsView/integrationPlayground/integrations/geckoDex";
import Binance from "@/components/integrationsView/integrationPlayground/integrations/binance";
import Chainlink from "@/components/integrationsView/integrationPlayground/integrations/chainlink";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import OpenApiPanelTab from "@/components/dataView/OpenApiPanelTab";
import ExportPanel from "@/components/dataView/ExportPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoSignUpBadge } from "@/components/demo/DemoSignUpBadge";
import { ATHENA_DEMO_ROW_LIMIT } from "@/config/dataLakeParquetSamples";
import { ReplaceOrNewSheetDialog } from "@/components/dataView/replaceOrNewSheetDialog";

/** In embedded demo, only these integrations are selectable; others are disabled with a Pro badge. */
const DEMO_ACTIVE_INTEGRATION_VALUES = new Set(["polymarket", "coinGecko"]);

const INTEGRATION_OPTIONS = [
  { value: "binance", label: "Binance", logo: "/binance.jpeg" },
  { value: "chainlink", label: "Chainlink", logo: "/chainlink.png" },
  { value: "coinGecko", label: "CoinGecko", logo: "/coinGecko.png" },
  { value: "geckoDex", label: "GeckoTerminal", logo: "/geckoDex1.png" },
  { value: "polymarket", label: "Polymarket", logo: "/polymarket.png" },
  { value: "polymarketHistorical", label: "Polymarket Historical", logo: "/polymarket.png" },
  {
    value: "kalshiHistorical",
    label: "Kalshi Historical",
    logo: "/kalshi.png",
    avatarBgClass: "bg-black",
    avatarImageClass: "object-contain p-0.5",
  },
  { value: "twitter", label: "Twitter", logo: "/x.png" },
  { value: "wallStreetBets", label: "Wall Street Bets", logo: "/wallStreetBets.png" },
].sort((a, b) => a.label.localeCompare(b.label));

const PANEL_CLOSE_MS = 300;

export default function DataSheetWithIntegration({ user, startNew, setStartNew, chartMode }) {
  const contextStateV2 = useMyStateV2();
  const isDemo = !!contextStateV2?.isDemo;
  const viewing = contextStateV2?.viewing;
  const setViewing = contextStateV2?.setViewing;
  const integrationSidebar = contextStateV2?.integrationSidebar;
  const setIntegrationSidebar = contextStateV2?.setIntegrationSidebar;
  const connectedData = contextStateV2?.connectedData ?? [];
  const setConnectedDataRaw = contextStateV2?.setConnectedData;
  const dataSheets = contextStateV2?.dataSheets || {};
  const addNewSheetAndActivate = contextStateV2?.addNewSheetAndActivate;
  const setSheetData = contextStateV2?.setSheetData;
  const loadedChartBuilderSnapshot = contextStateV2?.loadedChartBuilderSnapshot;
  const rightPanelOpen = contextStateV2?.rightPanelOpen;
  const setRightPanelOpen = contextStateV2?.setRightPanelOpen;
  const rightPanelTab = contextStateV2?.rightPanelTab;
  const setRightPanelTab = contextStateV2?.setRightPanelTab;

  const [isPanelClosing, setIsPanelClosing] = useState(false);
  const [replaceOrNewSheetOpen, setReplaceOrNewSheetOpen] = useState(false);
  /** Sync with context on mount so remounts (or SSR) don’t replay the slide-in while the panel is already open. */
  const [isPanelOpen, setIsPanelOpen] = useState(() => !!rightPanelOpen);
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const closeTimeoutRef = useRef(null);
  const wasOpenRef = useRef(!!rightPanelOpen);
  const autoExpandedEmptySheetRef = useRef(false);

  const anySheetHasData = Object.values(dataSheets).some(
    (sheet) => Array.isArray(sheet?.data) && sheet.data.length > 0,
  );
  const resolveDestinationRef = useRef(null);

  const requestSheetDestination = useCallback(async () => {
    if (!anySheetHasData) return "replace";
    return new Promise((resolve) => {
      resolveDestinationRef.current = resolve;
      setReplaceOrNewSheetOpen(true);
    });
  }, [anySheetHasData]);

  const resolveSheetDestination = useCallback((decision) => {
    if (resolveDestinationRef.current) {
      const resolve = resolveDestinationRef.current;
      resolveDestinationRef.current = null;
      resolve(decision);
    }
    setReplaceOrNewSheetOpen(false);
  }, []);

  // When arriving to charts view, default the panel tab to charts (don't override if user chose Export)
  useEffect(() => {
    if (chartMode && setRightPanelTab && rightPanelTab !== "charts" && rightPanelTab !== "export") {
      setRightPanelTab("charts");
    }
  }, [chartMode, rightPanelTab, setRightPanelTab]);

  const beginPanelClose = useCallback((onAfterClose) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsPanelOpen(false); // animate to off-screen
    setIsPanelClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      onAfterClose?.();
      setIsPanelClosing(false);
      closeTimeoutRef.current = null;
    }, PANEL_CLOSE_MS);
  }, []);

  // Slide-in when panel opens and ensure externally-triggered closes animate out.
  useEffect(() => {
    const isOpen = !!rightPanelOpen;
    if (isOpen && !wasOpenRef.current) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setIsPanelClosing(false);
      setIsPanelOpen(false); // start off-screen so we can animate in
      const id = requestAnimationFrame(() => {
        setIsPanelOpen(true); // trigger slide-open animation; panel ends in "open" state
        wasOpenRef.current = true;
      });
      return () => cancelAnimationFrame(id);
    }
    if (!isOpen && wasOpenRef.current && !isPanelClosing) {
      beginPanelClose();
      wasOpenRef.current = false;
    }
  }, [rightPanelOpen, isPanelClosing, beginPanelClose]);

  useEffect(() => {
    if (!rightPanelOpen) setDrawerExpanded(false);
  }, [rightPanelOpen]);

  // If there is no data loaded into the active sheet, default Integrations panel to full expanded
  // (but only once per "empty sheet" session so we don't fight the user).
  useEffect(() => {
    // Demo should start semi-collapsed, never auto-expand.
    if (isDemo) return;
    if (!rightPanelOpen) return;
    if (rightPanelTab !== "integrations") return;
    if (drawerExpanded) return;
    const isEmpty = !Array.isArray(connectedData) || connectedData.length === 0;
    if (!isEmpty) return;
    if (autoExpandedEmptySheetRef.current) return;
    autoExpandedEmptySheetRef.current = true;
    setDrawerExpanded(true);
  }, [isDemo, rightPanelOpen, rightPanelTab, drawerExpanded, connectedData]);

  useEffect(() => {
    const isEmpty = !Array.isArray(connectedData) || connectedData.length === 0;
    if (!isEmpty) autoExpandedEmptySheetRef.current = false;
  }, [connectedData]);

  const closePanel = useCallback(() => {
    if (isPanelClosing) return;
    setDrawerExpanded(false);
    beginPanelClose(() => {
      setRightPanelOpen?.(false);
      wasOpenRef.current = false;
    });
  }, [isPanelClosing, beginPanelClose, setRightPanelOpen]);

  useEffect(() => () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

  const renderIntegrationAvatar = (opt) => {
    if (opt.logo) {
      return (
        <span
          className={cn(
            "relative flex h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-border/60",
            opt.avatarBgClass ?? "bg-muted/30",
          )}
        >
          <Image
            src={opt.logo}
            alt={opt.label || opt.value}
            fill
            className={cn(opt.avatarImageClass ?? "object-cover")}
            sizes="28px"
          />
        </span>
      );
    }
    const letter = (opt.label || opt.value)[0].toUpperCase();
    return (
      <div className="flex h-7 w-7 shrink-0 self-center place-items-center place-content-center rounded-full bg-muted/30 text-xs font-medium text-muted-foreground">
        {letter}
      </div>
    );
  };

  const renderIntegration = () => {
    switch (integrationSidebar) {
      case "polymarket":
        return (
          <Polymarket
            setConnectedData={setConnectedDataRaw}
            requestSheetDestination={requestSheetDestination}
          />
        );
      case "polymarketHistorical":
        return <PolymarketHistorical setConnectedData={setConnectedDataRaw} />;
      case "kalshiHistorical":
        return <KalshiHistorical setConnectedData={setConnectedDataRaw} />;
      case "coinGecko":
        return (
          <CoinGecko
            setConnectedData={setConnectedDataRaw}
            requestSheetDestination={requestSheetDestination}
          />
        );
      case "twitter":
        return (
          <Twitter
            setConnectedData={setConnectedDataRaw}
            requestSheetDestination={requestSheetDestination}
          />
        );
      case "wallStreetBets":
        return (
          <WallStreetBets
            setConnectedData={setConnectedDataRaw}
            requestSheetDestination={requestSheetDestination}
          />
        );
      case "geckoDex":
        return (
          <GeckoDex
            setConnectedData={setConnectedDataRaw}
            requestSheetDestination={requestSheetDestination}
          />
        );
      case "binance":
        return <Binance setConnectedData={setConnectedDataRaw} />;
      case "chainlink":
        return <Chainlink setConnectedData={setConnectedDataRaw} />;
      default:
        return null;
    }
  };

  const showSidebar = !!rightPanelOpen;
  const isPanelVisible = showSidebar || isPanelClosing;
  const chartsActive = rightPanelTab === "charts";
  const panelAnimatingOpen = isPanelOpen && !isPanelClosing;

  /** Collapsed (default) vs expanded — spacer reserves width; aside is fixed (mobile: inset-x-0 + w-auto). */
  const drawerWidthCollapsed = "w-[18rem] min-w-[18rem] sm:w-[300px] sm:min-w-[300px]";
  const drawerSpacerWidthClass = drawerExpanded
    ? "max-md:w-[100dvw] max-md:min-w-0 max-md:max-w-[100dvw] md:w-1/2 md:min-w-0 md:max-w-[50vw] 2xl:w-1/3 2xl:max-w-[33.333vw]"
    : drawerWidthCollapsed;
  const drawerAsideWidthClass = drawerExpanded
    ? "max-md:w-auto max-md:min-w-0 max-md:max-w-none md:w-1/2 md:min-w-0 md:max-w-[50vw] 2xl:w-1/3 2xl:max-w-[33.333vw]"
    : drawerWidthCollapsed;

  const layout = (
    <div className={cn(
      "flex min-h-0 w-full max-w-full flex-1 flex-col gap-4 overflow-x-hidden px-2 py-2 sm:gap-6 sm:px-4",
      // In demo embeds, treat this component as the "viewport" for the right panel.
      // The parent container should clip overflow; we still set relative here so `absolute` works.
      isDemo && "relative",
    )}>
      <ReplaceOrNewSheetDialog
        open={replaceOrNewSheetOpen}
        onOpenChange={(open) => {
          if (!open) resolveSheetDestination(null);
          else setReplaceOrNewSheetOpen(true);
        }}
        onAddToCurrent={() => resolveSheetDestination("append")}
        onReplace={() => resolveSheetDestination("replace")}
        onAddNewSheet={() => resolveSheetDestination("new_sheet")}
      />
      <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-row gap-4 transition-[gap] duration-300 ease-out sm:gap-6">
        {/* Main: datasheet or chart — shrinks, scrolls, never overflows */}
        <main
          className={cn(
            "relative min-w-0 flex-1",
            chartMode ? "flex min-h-0 flex-col overflow-hidden" : "overflow-auto",
          )}
        >
          {!showSidebar && !isPanelClosing && (
            <OpenApiPanelTab
              contained={isDemo}
              onOpen={() => {
                if (chartMode) {
                  setRightPanelTab?.("charts");
                  setViewing?.("charts");
                } else {
                  setRightPanelTab?.("integrations");
                  setViewing?.("dataStart");
                  setIntegrationSidebar?.((prev) => prev ?? "polymarket");
                }
                setRightPanelOpen?.(true);
              }}
            />
          )}
          {chartMode ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {isDemo ? (
                <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 pb-2 sm:justify-start">
                  <h2 className="text-sm font-semibold leading-snug tracking-tight text-foreground sm:text-base">
                    Charts
                  </h2>
                  <DemoSignUpBadge />
                </div>
              ) : null}
              <ChartCanvas />
            </div>
          ) : (
            <>
              <DataView user={user} startNew={startNew} setStartNew={setStartNew} />
              {isDemo &&
              (integrationSidebar === "polymarketHistorical" || integrationSidebar === "kalshiHistorical") ? (
                <p
                  className="shrink-0 border-t border-red-200/90 bg-red-50 px-3 py-2 text-center text-[11px] font-semibold leading-snug text-red-600 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-400 sm:text-xs"
                  role="status"
                >
                  Demo: you can only pull up to {ATHENA_DEMO_ROW_LIMIT} rows per request. Sign up for the full dataset.
                </p>
              ) : null}
            </>
          )}
        </main>

        {/* Right: API playground — slide in when opened, slide out when X is clicked */}
        {isPanelVisible && (
          <>
            {/* Spacer: keeps main from expanding when panel is fixed */}
            <div
              className={cn(
                "shrink-0 transition-[width,min-width,max-width] duration-300 ease-out",
                isPanelClosing || !isPanelOpen ? "w-0 min-w-0 max-w-0 overflow-hidden" : drawerSpacerWidthClass,
              )}
              aria-hidden
            />
            <aside
              className={cn(
                isDemo
                  ? "absolute inset-y-0 z-20 flex flex-col gap-4 sm:gap-6 transition-[transform,width,min-width,max-width,left,right] duration-300 ease-out"
                  : "fixed top-[4.5rem] z-20 flex h-[calc(100dvh-4.5rem)] flex-col gap-4 sm:gap-6 transition-[transform,width,min-width,max-width,left,right] duration-300 ease-out",
                drawerExpanded
                  ? "max-md:left-0 max-md:right-0 md:right-4"
                  : "right-2 sm:right-4",
                drawerAsideWidthClass,
                isPanelClosing || !isPanelOpen ? "translate-x-full" : "translate-x-0",
              )}
            >
              <div className="h-full min-h-0 w-full flex flex-col">
                <div className="flex h-full flex-col rounded-lg border bg-background/80 backdrop-blur-sm shadow-sm">
                  <Tabs
                    value={rightPanelTab || "integrations"}
                    onValueChange={(v) => {
                      setRightPanelTab?.(v);
                      setRightPanelOpen?.(true);
                      if (v === "charts") {
                        setViewing?.("charts");
                      } else if (v === "integrations") {
                        setViewing?.("dataStart");
                        setIntegrationSidebar?.((prev) => prev ?? "polymarket");
                      }
                    }}
                    className="flex h-full flex-col"
                  >
                    <div className="relative flex items-center gap-2 p-2">
                      <TabsList className="h-9">
                        <TabsTrigger value="integrations" className="text-xs">
                          Integrations
                        </TabsTrigger>
                        <TabsTrigger value="charts" className="text-xs">
                          Charts
                        </TabsTrigger>
                        <TabsTrigger value="export" className="text-xs">
                          Export
                        </TabsTrigger>
                      </TabsList>
                      <div className="ml-auto flex items-center gap-1">
                        {drawerExpanded ? (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={() => setDrawerExpanded(false)}
                                  aria-label="Collapse panel"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">
                                Collapse
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <>
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => setDrawerExpanded(true)}
                                    aria-label="Expand panel"
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                  Expand
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={closePanel}
                              aria-label="Close panel"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div
                      className={cn(
                        "min-h-0 min-w-0 flex-1 pb-2",
                        drawerExpanded ? "w-full max-w-none px-3 sm:px-4" : "max-w-full px-2",
                      )}
                    >
                      <TabsContent value="integrations" className="m-0 h-full w-full min-w-0 max-w-full">
                        <div className="flex h-full w-full min-w-0 max-w-full flex-col gap-3">
                          <div className="flex min-w-0 max-w-full items-center gap-2">
                            <div
                              className={cn(
                                "min-w-0",
                                // In full-expanded view, keep the dropdown the same width as the semi-collapsed drawer.
                                // This prevents it from stretching to fill the wider panel.
                                // Slightly shorter in full-expanded mode.
                                drawerExpanded ? "w-[14rem] sm:w-[240px] flex-none" : "flex-1",
                              )}
                            >
                              <Select
                                value={integrationSidebar || ""}
                                onValueChange={(value) => setIntegrationSidebar?.(value)}
                              >
                                <SelectTrigger className="h-9 w-full min-w-0 justify-start text-sm gap-2 text-left [&>span]:text-left [&>svg]:ml-auto focus:ring-0 focus:ring-offset-0">
                                {integrationSidebar &&
                                  renderIntegrationAvatar(
                                    INTEGRATION_OPTIONS.find((o) => o.value === integrationSidebar) || {
                                      label: integrationSidebar,
                                      value: integrationSidebar,
                                      logo: null,
                                    }
                                  )}
                                <SelectValue className="flex-1 min-w-0 text-left" placeholder="Select API" />
                                </SelectTrigger>
                                <SelectContent>
                                  {INTEGRATION_OPTIONS.map((opt) => {
                                    const isProOnly =
                                      isDemo && !DEMO_ACTIVE_INTEGRATION_VALUES.has(opt.value);
                                    return (
                                      <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                        disabled={isProOnly}
                                        left={renderIntegrationAvatar(opt)}
                                        suffix={
                                          isProOnly ? (
                                            <span className="rounded-md border border-border/70 bg-muted/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                              Pro
                                            </span>
                                          ) : null
                                        }
                                      >
                                        {opt.label}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="min-h-0 min-w-0 max-w-full flex-1 overflow-auto overflow-x-hidden rounded-md border bg-muted/30 p-3">
                            {integrationSidebar ? (
                              renderIntegration()
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                Select an integration to get started.
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="charts" className="m-0 h-full min-w-0 w-full max-w-full">
                        <div
                          className={cn(
                            "h-full min-w-0 max-w-full overflow-auto",
                            drawerExpanded ? "w-full p-1 sm:p-2" : "p-1",
                          )}
                        >
                          {chartsActive ? (
                            <ChartControls />
                          ) : (
                            <div className="text-xs text-muted-foreground">Select Charts tab to edit.</div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="export" className="m-0 h-full min-w-0 w-full max-w-full">
                        <div className="h-full min-w-0 w-full max-w-full overflow-auto">
                          <ExportPanel />
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
  return (
    <ChartBuilderProvider demo={isDemo} initialBuilderSnapshot={loadedChartBuilderSnapshot}>
      {layout}
    </ChartBuilderProvider>
  );
}
