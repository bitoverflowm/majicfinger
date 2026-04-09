"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

import { ExternalLink } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BorderBeam } from "@/components/magicui/border-beam";

import { useMyStateV2 } from "@/context/stateContextV2";
import { API_INTEGRATIONS, integrations_list } from "./integrationsConfig";
import { ConnectProgressWithLabel } from "./integrationPlayground/integrations/polymarketHistorical/ConnectProgressWithLabel";
import { useBeckerHistoricalWarmIntegrationsConnect } from "./integrationPlayground/integrations/polymarketHistorical/useBeckerHistoricalWarmIntegrationsConnect";
import { DemoSignUpBadge } from "@/components/demo/DemoSignUpBadge";

// Extract tags categories
const tags_categories = [...new Set(integrations_list.flatMap(integration => integration.tags))];

const IntegrationsView = () => {
  const [selectedTag, setSelectedTag] = useState(null);
  const context = useMyStateV2();
  const isDemo = context?.isDemo;
  const setViewing = context?.setViewing;
  const setIntegrationSidebar = context?.setIntegrationSidebar;
  const setConnectedData = context?.setConnectedData;
  const setConnectedCols = context?.setConnectedCols;
  const setRightPanelOpen = context?.setRightPanelOpen;
  const setRightPanelTab = context?.setRightPanelTab;

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

  const clickHandler = (clickHandlerId) => {
    if (API_INTEGRATIONS.includes(clickHandlerId)) {
      setConnectedData?.([]);
      setConnectedCols?.([]);
      setViewing?.("dataStart");
      setIntegrationSidebar?.(clickHandlerId);
      setRightPanelTab?.("integrations");
      setRightPanelOpen?.(true);
    }
  };

  const handleTagClick = (tag) => {
    setSelectedTag(tag);
  };

  return (
    <div className="">
      <div className="pt-4 p-10 md:p-12 lg:p-16 xl:p-32">
            {isDemo ? (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">Integrations</h2>
                <DemoSignUpBadge />
              </div>
            ) : null}
            <div className="w-full pb-20 grid gap-6 lg:grid-cols-2">
              <Card className="relative overflow-hidden flex flex-row w-full min-h-[180px]">
                <BorderBeam size={250} duration={12} colorFrom="#2E5CFF" colorTo="#60a5fa" className="pointer-events-none" />
                <div className="flex w-full min-h-[180px]">
                  <div className="w-48 sm:w-56 shrink-0 flex items-center justify-center bg-[#2E5CFF] p-6">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-white/25">
                      <Image src="/polymarket.png" alt="Polymarket" fill className="object-cover" sizes="80px" />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-6 relative z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-2xl font-bold">Polymarket</h3>
                        <Badge className="bg-amber-500 text-white shrink-0">New</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Live API and WebSocket — pull markets, trades, and stream updates.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <Button onClick={() => clickHandler("polymarket")} className="w-fit">Connect</Button>
                      <Button variant="outline" className="w-fit bg-white rounded-md border border-input">Guide</Button>
                      <Button variant="outline" className="w-fit bg-white rounded-md border border-input" asChild>
                        <a href="https://docs.polymarket.com/" target="_blank" rel="noopener noreferrer">View Official Docs</a>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
              <Card className="relative overflow-hidden flex flex-row w-full min-h-[180px] border-slate-700/40">
                <BorderBeam size={250} duration={14} colorFrom="#64748b" colorTo="#38bdf8" className="pointer-events-none" />
                <div className="flex w-full min-h-[180px]">
                  <div className="w-48 sm:w-56 shrink-0 flex items-center justify-center bg-slate-900 p-6">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-slate-500/40">
                      <Image src="/polymarket.png" alt="Polymarket Historical" fill className="object-cover opacity-95" sizes="80px" />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-6 relative z-10 bg-slate-950/40">
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-2xl font-bold">Polymarket Historical</h3>
                        <Badge variant="secondary" className="shrink-0">Parquet</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Archived Becker / Lychee Parquet in S3 — query in the browser with DuckDB and load into your sheet.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 mt-4 w-full min-w-0 max-w-md">
                      {polymarketHistoricalConnect.busy ? (
                        <ConnectProgressWithLabel
                          label={polymarketHistoricalConnect.label}
                          progress={polymarketHistoricalConnect.progress}
                        />
                      ) : polymarketHistoricalConnect.error ? (
                        <>
                          <p className="text-xs text-destructive break-words">{polymarketHistoricalConnect.error}</p>
                          <Button
                            type="button"
                            onClick={() => polymarketHistoricalConnect.start()}
                            className="w-fit bg-slate-800 hover:bg-slate-700"
                          >
                            Try again
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => polymarketHistoricalConnect.start()}
                          className="w-fit bg-slate-800 hover:bg-slate-700"
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            <div className="mx-auto grid w-full lg:w-5/6 md:grid-cols-2 pb-16 gap-10 lg:gap-6 place-items-center place-content-center">
              <div className="max-w-xl"> 
                <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                  All your favorite data sources under one roof.
                </h1> 
              </div>
              <div className="max-w-md">
                <p className="text-sm text-muted-foreground pb-4">
                  Lychee makes it easy by taking care of everything, end-to-end so you can you can focus on <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] mr-2 font-mono font-semibold"> discovering something great. </code> Instantly pull data cleaner than a nun's browser history.
                </p>
                <p className="text-xs text-muted-foreground pb-2">Want to see how to use Lychee Integrations?</p>
                <Link className="text-xs pt-1 pb-1 px-2 underline font-bold bg-lychee_green flex w-96 place-items-center gap-2" rel="noopener noreferrer" target="_blank" href="https://misterrpink.beehiiv.com/p/how-to-use-lychee-integrations-coingecko"><code> CoinGecko API: Pull Crypto Market Data </code> <ExternalLink className="w-4 h-4"/></Link>
              </div>
            </div>
            <div className="p-10 flex flex-wrap gap-1">
              <Badge key={777} variant="outline" onClick={() => handleTagClick()} className="cursor-pointer hover:bg-lychee_green/30">
                all
              </Badge>
              {tags_categories.map((tag, index) => (
                <Badge key={index} variant="outline" onClick={() => handleTagClick(tag)} className={`cursor-pointer hover:bg-lychee_green/30 ${tag === 'coming July 24' && 'bg-lychee_blue text-white shadow-2xl hover:text-lychee_blue'}`}>
                  {tag}
                </Badge>
              ))}
            </div>
            {/* Featured Polymarket card - full width, image left, text right */}
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
              {integrations_list
                .filter(integration => !selectedTag || integration.tags.includes(selectedTag))
                .map((integration, index) => (
                <Card key={index} className="flex flex-col h-full">
                  <CardHeader
                    className={`w-full items-center rounded-md py-20`}
                    style={{
                      backgroundColor: integration.color,
                      "--integration-card-bg": integration.color,
                    }}
                  >
                    {integration.icon}
                  </CardHeader>
                  <CardContent className="py-4 grow">
                    <small className="text-sm font-medium leading-none">{integration.name}</small>
                    <p className="text-sm pt-1 text-muted-foreground pb-2">{integration.description}</p>
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
                            <Button type="button" onClick={() => warmConnect.start()} className="w-full sm:w-auto self-end">
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
                        <Button onClick={() => clickHandler(integration.clickHandler)} className="self-end">
                          Connect
                        </Button>
                      );
                    })()}
                  </CardFooter>
                </Card>
              ))}
            </div>
      </div>
    </div>
  );
}


export default IntegrationsView