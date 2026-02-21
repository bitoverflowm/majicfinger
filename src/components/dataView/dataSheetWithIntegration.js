"use client";

import { useMyStateV2 } from "@/context/stateContextV2";
import DataView from "@/components/dataView";
import Polymarket from "@/components/integrationsView/integrationPlayground/integrations/polymarket";
import CoinGecko from "@/components/integrationsView/integrationPlayground/integrations/coinGecko";
import Twitter from "@/components/integrationsView/integrationPlayground/integrations/twitter";
import WallStreetBets from "@/components/integrationsView/integrationPlayground/integrations/wallStreetBets";
import GeckoDex from "@/components/integrationsView/integrationPlayground/integrations/geckoDex";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const INTEGRATION_OPTIONS = [
  { value: "polymarket", label: "Polymarket" },
  { value: "coinGecko", label: "CoinGecko" },
  { value: "twitter", label: "Twitter" },
  { value: "wallStreetBets", label: "Wall Street Bets" },
  { value: "geckoDex", label: "GeckoTerminal" },
];

export default function DataSheetWithIntegration({ user, startNew, setStartNew }) {
  const contextStateV2 = useMyStateV2();
  const integrationSidebar = contextStateV2?.integrationSidebar;
  const setIntegrationSidebar = contextStateV2?.setIntegrationSidebar;
  const setConnectedData = contextStateV2?.setConnectedData;

  if (!integrationSidebar) return null;

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
    <div className="flex h-full min-h-0 w-full pt-4">
      {/* Center: datasheet — flex-1, scrolls internally */}
      <main className="flex-1 min-w-0 overflow-auto py-4 px-2 sm:py-6 sm:px-4">
        <DataView user={user} startNew={startNew} setStartNew={setStartNew} />
      </main>

      {/* Right: API panel — fixed width, responsive, scrolls internally */}
      <aside className="w-[14rem] shrink-0 border-l border-border bg-muted/30 flex flex-col min-h-0 sm:w-[16rem] md:w-[18rem]">
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
            Actions
          </span>
          <Select
            value={integrationSidebar}
            onValueChange={(value) => setIntegrationSidebar(value)}
          >
            <SelectTrigger className="h-8 flex-1 min-w-0 text-xs">
              <SelectValue placeholder="API" />
            </SelectTrigger>
            <SelectContent>
              {INTEGRATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setIntegrationSidebar(null)}
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Separator className="shrink-0" />
        <div className="flex-1 min-h-0 overflow-auto px-3 py-3">
          <fieldset className="rounded-lg border border-border px-2 py-2 sm:px-3 sm:py-3">
            <legend className="px-1 text-[10px] sm:text-xs font-medium text-muted-foreground">
              API pull
            </legend>
            {renderIntegration()}
          </fieldset>
        </div>
      </aside>
    </div>
  );
}
