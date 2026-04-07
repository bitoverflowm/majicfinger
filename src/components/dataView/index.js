"use client";

import { useCallback } from "react";
import { useMyStateV2 } from "@/context/stateContextV2";
import { HardDriveUpload, FilePlus2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import GridView from "@/components/gridView";
import { ChainlinkLiveChart } from "@/components/dataView/ChainlinkLiveChart";
import { VscCircleFilled } from "react-icons/vsc";
import { API_INTEGRATIONS, integrations_list } from "@/components/integrationsView/integrationsConfig";
import { ConnectProgressWithLabel } from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/ConnectProgressWithLabel";
import { useBeckerHistoricalWarmIntegrationsConnect } from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/useBeckerHistoricalWarmIntegrationsConnect";
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-6">
            <Card
              className="flex flex-col h-full cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md"
              onClick={() => setViewing("upload")}
            >
              <CardHeader className="w-full items-center justify-center rounded-t-lg py-12 bg-muted/60">
                <HardDriveUpload className="h-12 w-12 text-muted-foreground" />
              </CardHeader>
              <CardContent className="py-4 grow">
                <h3 className="text-sm font-medium leading-none">Upload your own data</h3>
                <p className="text-sm pt-1 text-muted-foreground">
                  Upload your own .csv or Excel. JSON, PDF, more coming soon.
                </p>
              </CardContent>
            </Card>

            <Card
              className="flex flex-col h-full cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md"
              onClick={() => setViewing("newSheet")}
            >
              <CardHeader className="w-full items-center justify-center rounded-t-lg py-12 bg-muted/60">
                <FilePlus2 className="h-12 w-12 text-muted-foreground" />
              </CardHeader>
              <CardContent className="py-4 grow">
                <h3 className="text-sm font-medium leading-none">Start with New sheet</h3>
                <p className="text-sm pt-1 text-muted-foreground">Start with an empty sheet.</p>
              </CardContent>
            </Card>

            {integrations_list.map((integration, index) => (
              <Card key={index} className="flex flex-col h-full">
                <CardHeader
                  className="w-full items-center rounded-t-lg py-8 min-h-[120px] flex justify-center"
                  style={{ backgroundColor: integration.color }}
                >
                  {integration.icon}
                </CardHeader>
                <CardContent className="py-4 grow">
                  <small className="text-sm font-medium leading-none">{integration.name}</small>
                  <p className="text-sm pt-1 text-muted-foreground line-clamp-2">{integration.description}</p>
                </CardContent>
                <CardFooter className="flex flex-col items-stretch gap-2 place-content-end">
                  {(() => {
                    const warmConnect =
                      integration.clickHandler === "polymarketHistorical"
                        ? polymarketHistoricalConnect
                        : integration.clickHandler === "kalshiHistorical"
                          ? kalshiHistoricalConnect
                          : null;
                    if (!integration.live || integration.tags.includes("coming soon")) {
                      return <Button disabled>Coming soon</Button>;
                    }
                    if (warmConnect) {
                      return warmConnect.busy ? (
                        <ConnectProgressWithLabel label={warmConnect.label} progress={warmConnect.progress} />
                      ) : warmConnect.error ? (
                        <>
                          <p className="text-xs text-destructive break-words">{warmConnect.error}</p>
                          <Button
                            type="button"
                            onClick={() => warmConnect.start()}
                            className="w-full sm:w-auto self-end"
                          >
                            Try again
                          </Button>
                        </>
                      ) : (
                        <Button type="button" onClick={() => warmConnect.start()} className="self-end">
                          Connect
                        </Button>
                      );
                    }
                    return (
                      <Button onClick={() => openIntegrationPlayground(integration.clickHandler)} className="self-end">
                        Connect
                      </Button>
                    );
                  })()}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataView;
