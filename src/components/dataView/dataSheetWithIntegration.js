"use client";

import { useMyStateV2 } from "@/context/stateContextV2";
import DataView from "@/components/dataView";
import Polymarket from "@/components/integrationsView/integrationPlayground/integrations/polymarket";
import CoinGecko from "@/components/integrationsView/integrationPlayground/integrations/coinGecko";
import Twitter from "@/components/integrationsView/integrationPlayground/integrations/twitter";
import WallStreetBets from "@/components/integrationsView/integrationPlayground/integrations/wallStreetBets";
import GeckoDex from "@/components/integrationsView/integrationPlayground/integrations/geckoDex";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const INTEGRATION_LABELS = {
  polymarket: "Polymarket",
  coinGecko: "CoinGecko",
  twitter: "Twitter",
  wallStreetBets: "Wall Street Bets",
  geckoDex: "GeckoTerminal",
};

export default function DataSheetWithIntegration({ user, startNew, setStartNew }) {
  const contextStateV2 = useMyStateV2();
  const integrationSidebar = contextStateV2?.integrationSidebar;
  const setIntegrationSidebar = contextStateV2?.setIntegrationSidebar;
  const setConnectedData = contextStateV2?.setConnectedData;

  if (!integrationSidebar) return null;

  const label = INTEGRATION_LABELS[integrationSidebar] || integrationSidebar;

  const renderIntegration = () => {
    switch (integrationSidebar) {
      case "polymarket":
        return <Polymarket setConnectedData={setConnectedData} />;
      case "coinGecko":
        return <CoinGecko setConnectedData={setConnectedData} />;
      case "twitter":
        return <Twitter setConnectedData={setConnectedData} />;
      case "wallStreetBets":
        return <WallStreetBets setConnectedData={setConnectedData} />;
      case "geckoDex":
        return <GeckoDex setConnectedData={setConnectedData} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full">
      {/* Center: datasheet (playground main content) */}
      <main className="flex-1 min-w-0 overflow-auto py-16">
        <DataView user={user} startNew={startNew} setStartNew={setStartNew} />
      </main>

      {/* Right: API pull panel (shadcn playground style) */}
      <aside className="w-[20rem] shrink-0 border-l border-border bg-muted/30 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-medium">Actions</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIntegrationSidebar(null)}
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-4 py-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
        </div>
        <Separator />
        <div className="flex-1 overflow-auto px-4 py-4">
          <fieldset className="rounded-lg border border-border px-3 py-3">
            <legend className="-ml-1 px-1 text-xs font-medium text-muted-foreground">
              API pull
            </legend>
            {renderIntegration()}
          </fieldset>
        </div>
      </aside>
    </div>
  );
}
