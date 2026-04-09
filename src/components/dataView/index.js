"use client";

import { useCallback, useMemo } from "react";
import { useMyStateV2 } from "@/context/stateContextV2";
import { ArrowUpFromLine, FilePlus2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import GridView from "@/components/gridView";
import { ChainlinkLiveChart } from "@/components/dataView/ChainlinkLiveChart";
import { VscCircleFilled } from "react-icons/vsc";
import { API_INTEGRATIONS, integrations_list } from "@/components/integrationsView/integrationsConfig";
import { ConnectProgressWithLabel } from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/ConnectProgressWithLabel";
import { useBeckerHistoricalWarmIntegrationsConnect } from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/useBeckerHistoricalWarmIntegrationsConnect";
import { cn } from "@/lib/utils";
import { DemoSignUpBadge } from "@/components/demo/DemoSignUpBadge";
import { scrollToPricingSection } from "@/lib/scrollToPricing";

const DataView = ({ user }) => {
  const contextStateV2 = useMyStateV2();
  const isDemo = contextStateV2?.isDemo;

  const connectedData = contextStateV2?.connectedData;
  const setConnectedData = contextStateV2?.setConnectedData;
  const setViewing = contextStateV2?.setViewing;
  const setIntegrationSidebar = contextStateV2?.setIntegrationSidebar;
  const integrationSidebar = contextStateV2?.integrationSidebar;
  const setRightPanelOpen = contextStateV2?.setRightPanelOpen;
  const setRightPanelTab = contextStateV2?.setRightPanelTab;
  const dataSheets = contextStateV2?.dataSheets;
  const activeSheetId = contextStateV2?.activeSheetId;
  const setActiveSheetId = contextStateV2?.setActiveSheetId;
  const setConnectedCols = contextStateV2?.setConnectedCols;
  const liveStreamState = contextStateV2?.liveStreamState;
  const hasChainlinkStream = Object.values(liveStreamState?.streamsBySheetId || {}).some(
    (s) => s?.type === "chainlink"
  );

  const dataSheetIds = dataSheets ? Object.keys(dataSheets) : [];
  const hasMultipleDataSheets = dataSheetIds.length > 1;
  const showGrid = (connectedData?.length > 0) || hasMultipleDataSheets || integrationSidebar;
  const anySheetHasData = Object.values(dataSheets || {}).some(
    (s) => Array.isArray(s?.data) && s.data.length > 0
  );
  // Show sheet chips whenever the grid is in use and there is at least one sheet to label
  // (including a single renamed sheet like "resolved_markets").
  const showSheetTabs =
    showGrid && (hasMultipleDataSheets || anySheetHasData) && (dataSheetIds?.length ?? 0) > 0;

  const navigatePolymarketHistorical = useCallback(() => {
    if (!API_INTEGRATIONS.includes("polymarketHistorical")) return;
    setConnectedData?.([]);
    setConnectedCols?.([]);
    setViewing?.("dataStart");
    setIntegrationSidebar?.("polymarketHistorical");
    setRightPanelTab?.("integrations");
    setRightPanelOpen?.(true);
  }, [
    setConnectedCols,
    setConnectedData,
    setIntegrationSidebar,
    setRightPanelOpen,
    setRightPanelTab,
    setViewing,
  ]);

  const polymarketHistoricalConnect = useBeckerHistoricalWarmIntegrationsConnect(navigatePolymarketHistorical);

  const navigateKalshiHistorical = useCallback(() => {
    if (!API_INTEGRATIONS.includes("kalshiHistorical")) return;
    setConnectedData?.([]);
    setConnectedCols?.([]);
    setViewing?.("dataStart");
    setIntegrationSidebar?.("kalshiHistorical");
    setRightPanelTab?.("integrations");
    setRightPanelOpen?.(true);
  }, [
    setConnectedCols,
    setConnectedData,
    setIntegrationSidebar,
    setRightPanelOpen,
    setRightPanelTab,
    setViewing,
  ]);

  const kalshiHistoricalConnect = useBeckerHistoricalWarmIntegrationsConnect(navigateKalshiHistorical);

  const integrationsOrdered = useMemo(() => {
    const isAvailable = (i) =>
      Boolean(i.live) && !(i.tags || []).includes("coming soon");
    return [...integrations_list].sort((a, b) => Number(isAvailable(b)) - Number(isAvailable(a)));
  }, []);

  const openIntegrationPlayground = (clickHandlerId) => {
    if (API_INTEGRATIONS.includes(clickHandlerId)) {
      setConnectedData?.([]);
      setConnectedCols?.([]);
      setViewing?.("dataStart");
      setIntegrationSidebar?.(clickHandlerId);
      setRightPanelTab?.("integrations");
      setRightPanelOpen?.(true);
    }
  };

  return (
    <div className="min-w-0 max-w-full min-h-0 px-2 sm:px-4 md:px-6">
      {showSheetTabs && (
        <div className="flex flex-wrap gap-1 mb-2">
          {dataSheetIds.map((id) => (
            <code
              key={id}
              className={`${id === activeSheetId ? "bg-lychee_blue/30" : "bg-yellow-200/30 cursor-pointer hover:bg-lychee_blue/80 hover:text-lychee_white"} relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold`}
              onClick={() => setActiveSheetId?.(id)}
            >
              {dataSheets[id]?.name || id}
            </code>
          ))}
        </div>
      )}

      {showGrid ? (
        <div className="relative min-h-0 flex flex-col gap-3">
          <div
            className={`min-h-0 w-full max-w-full shrink-0 ${
              hasChainlinkStream ? "overflow-auto" : ""
            }`}
          >
            <GridView />
          </div>
          {isDemo && (connectedData?.length ?? 0) > 0 && (
            <p className="shrink-0 text-center text-[11px] text-muted-foreground sm:text-xs">
              <button
                type="button"
                onClick={() => scrollToPricingSection()}
                className="underline decoration-muted-foreground/60 underline-offset-2 transition-colors hover:text-foreground"
              >
                Sign up to get the full data set
              </button>
            </p>
          )}
          {hasChainlinkStream && (
            <div className="pb-10">
              <ChainlinkLiveChart
                dataSheets={dataSheets || {}}
                streamsBySheetId={liveStreamState?.streamsBySheetId || {}}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          {!(user) && !isDemo && (
            <div className="w-full max-w-md mx-auto py-4">
              <Alert onClick={() => setViewing("register")} className="cursor-pointer">
                <VscCircleFilled className="h-5 w-5" />
                <AlertTitle className="text-xs">Want to save your work?</AlertTitle>
                <AlertDescription className="text-xs">Click here to register.</AlertDescription>
              </Alert>
            </div>
          )}

          {isDemo && (
            <div className="mb-3 max-w-2xl text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h2 className="text-sm font-semibold leading-snug tracking-tight text-foreground sm:text-base">
                  Pick one of your favorite data sources
                </h2>
                <DemoSignUpBadge />
              </div>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                Analyze, visualize, and explore — all in one workspace.
              </p>
            </div>
          )}

          <TooltipProvider delayDuration={200}>
            <div
              className={cn(
                "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-6",
                isDemo && "gap-3 py-3",
              )}
            >
              <div className="flex flex-col gap-2 place-content-center p-2">
                <Card
                  className="flex flex-col cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md"
                  onClick={() => setViewing("upload")}
                >
                  <CardHeader
                    className={cn(
                      "w-full items-center justify-center rounded-t-lg bg-muted/60",
                      isDemo ? "py-2" : "py-12",
                    )}
                  >
                    <ArrowUpFromLine
                      className={cn("text-muted-foreground", isDemo ? "h-6 w-6" : "h-12 w-12")}
                    />
                  </CardHeader>
                  <CardContent className={cn("grow", isDemo ? "px-2 py-1" : "py-4")}>
                    <h3 className={cn("font-medium leading-none", isDemo ? "text-xs" : "text-sm")}>
                      Upload .csv or Excel
                    </h3>
                    <p
                      className={cn(
                        "text-muted-foreground",
                        isDemo ? "pt-0.5 text-[11px] leading-snug" : "pt-1 text-sm",
                      )}
                    >
                      PDF and json coming soon.
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="flex flex-col cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md"
                  onClick={() => setViewing("newSheet")}
                >
                  <CardHeader
                    className={cn(
                      "w-full items-center justify-center rounded-t-lg bg-muted/60",
                      isDemo ? "py-2" : "py-12",
                    )}
                  >
                    <FilePlus2 className={cn("text-muted-foreground", isDemo ? "h-6 w-6" : "h-12 w-12")} />
                  </CardHeader>
                  <CardContent className={cn("grow", isDemo ? "px-2 py-1" : "py-4")}>
                    <h3 className={cn("font-medium leading-none", isDemo ? "text-xs" : "text-sm")}>
                      {isDemo ? "New Sheet" : "Start with New sheet"}
                    </h3>
                    <p
                      className={cn(
                        "text-muted-foreground",
                        isDemo ? "pt-0.5 text-[11px] leading-snug" : "pt-1 text-sm",
                      )}
                    >
                      {isDemo ? "Start with empty sheet." : "Start with an empty sheet."}
                    </p>
                  </CardContent>
                </Card>
              </div>

            {integrationsOrdered.map((integration) => (
              <Card key={integration.clickHandler} className="flex flex-col h-full">
                <CardHeader
                  className={cn(
                    "w-full items-center rounded-t-lg flex justify-center",
                    isDemo ? "min-h-[100px] py-6" : "min-h-[120px] py-8",
                  )}
                  style={{
                    backgroundColor: integration.color,
                    "--integration-card-bg": integration.color,
                  }}
                >
                  {integration.icon}
                </CardHeader>
                <CardContent className={cn("grow", isDemo ? "px-2 py-1" : "py-4")}>
                  <small
                    className={cn("font-medium leading-none", isDemo ? "text-xs" : "text-sm")}
                  >
                    {integration.name}
                  </small>
                  <p
                    className={cn(
                      "text-muted-foreground line-clamp-2",
                      isDemo ? "pt-0.5 text-[11px] leading-snug" : "pt-1 text-sm",
                    )}
                  >
                    {integration.description}
                  </p>
                </CardContent>
                <CardFooter
                  className={cn(
                    "flex flex-col items-stretch place-content-end",
                    isDemo ? "gap-1.5 p-2 pt-1" : "gap-2",
                  )}
                >
                  {(() => {
                    const warmConnect =
                      integration.clickHandler === "polymarketHistorical"
                        ? polymarketHistoricalConnect
                        : integration.clickHandler === "kalshiHistorical"
                          ? kalshiHistoricalConnect
                          : null;
                    const startBtnClass = cn(
                      "self-end",
                      isDemo && "h-8 px-3 text-xs",
                    );
                    if (!integration.live || integration.tags.includes("coming soon")) {
                      const disabledBtnClass = cn(isDemo && "h-8 px-3 text-xs");
                      if (isDemo) {
                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex self-end">
                                <Button type="button" disabled className={disabledBtnClass}>
                                  pro
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">not available in demo</TooltipContent>
                          </Tooltip>
                        );
                      }
                      return (
                        <Button type="button" disabled className={disabledBtnClass}>
                          Coming soon
                        </Button>
                      );
                    }
                    if (warmConnect) {
                      return warmConnect.busy ? (
                        <ConnectProgressWithLabel
                          label={warmConnect.label}
                          progress={warmConnect.progress}
                          className={cn(isDemo && "pt-0")}
                        />
                      ) : warmConnect.error ? (
                        <>
                          <p
                            className={cn(
                              "text-destructive break-words",
                              isDemo ? "text-[10px]" : "text-xs",
                            )}
                          >
                            {warmConnect.error}
                          </p>
                          <Button
                            type="button"
                            onClick={() => warmConnect.start()}
                            className={cn("w-full sm:w-auto self-end", isDemo && "h-8 text-xs")}
                          >
                            Try again
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => warmConnect.start()}
                          className={startBtnClass}
                        >
                          {isDemo ? "Start" : "Connect"}
                        </Button>
                      );
                    }
                    return (
                      <Button
                        onClick={() => openIntegrationPlayground(integration.clickHandler)}
                        className={startBtnClass}
                      >
                        {isDemo ? "Start" : "Connect"}
                      </Button>
                    );
                  })()}
                </CardFooter>
              </Card>
            ))}
            </div>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
};

export default DataView;
