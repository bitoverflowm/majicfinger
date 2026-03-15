"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useMyStateV2 } from "@/context/stateContextV2";
import DataView from "@/components/dataView";
import ChartView from "@/components/chartView";
import Polymarket from "@/components/integrationsView/integrationPlayground/integrations/polymarket";
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
import { X, PanelRightOpen } from "lucide-react";
import { Label } from "@/components/ui/label";

const INTEGRATION_OPTIONS = [
  { value: "polymarket", label: "Polymarket" },
  { value: "coinGecko", label: "CoinGecko" },
  { value: "twitter", label: "Twitter" },
  { value: "wallStreetBets", label: "Wall Street Bets" },
  { value: "geckoDex", label: "GeckoTerminal" },
  { value: "binance", label: "Binance" },
  { value: "chainlink", label: "Chainlink" },
];

const PANEL_CLOSE_MS = 300;

export default function DataSheetWithIntegration({ user, startNew, setStartNew, chartMode }) {
  const contextStateV2 = useMyStateV2();
  const integrationSidebar = contextStateV2?.integrationSidebar;
  const setIntegrationSidebar = contextStateV2?.setIntegrationSidebar;
  const setConnectedData = contextStateV2?.setConnectedData;

  const [isPanelClosing, setIsPanelClosing] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const closeTimeoutRef = useRef(null);
  const wasOpenRef = useRef(false);

  // Slide-in when panel opens: every time we go from no panel → panel (e.g. first time opening or after close)
  useEffect(() => {
    const isOpen = integrationSidebar != null;
    if (isOpen && !wasOpenRef.current) {
      setIsPanelOpen(false); // start off-screen so we can animate in
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setIsPanelOpen(true); // trigger slide-open animation; panel ends in "open" state
          wasOpenRef.current = true;
        })
      );
      return () => cancelAnimationFrame(id);
    }
    if (!isOpen) wasOpenRef.current = false;
  }, [integrationSidebar]);

  const closePanel = useCallback(() => {
    setIsPanelClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setIntegrationSidebar?.(null);
      setIsPanelClosing(false);
      closeTimeoutRef.current = null;
    }, PANEL_CLOSE_MS);
  }, [setIntegrationSidebar]);

  useEffect(() => () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

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
      case "binance":
        return <Binance setConnectedData={setConnectedData} />;
      case "chainlink":
        return <Chainlink setConnectedData={setConnectedData} />;
      default:
        return null;
    }
  };

  const showSidebar = integrationSidebar != null;
  const isPanelVisible = showSidebar || isPanelClosing;

  return (
    <div className="flex min-h-0 w-full max-w-full flex-1 flex-col gap-4 px-2 py-2 sm:gap-6 sm:px-4">
      <div className="flex min-h-0 w-full max-w-full flex-1 flex-row gap-4 sm:gap-6">
        {/* Main: datasheet or chart — shrinks, scrolls, never overflows */}
        <main className="min-w-0 flex-1 overflow-auto relative">
          {!showSidebar && !isPanelClosing && (
            <button
              type="button"
              onClick={() => setIntegrationSidebar("polymarket")}
              className="absolute top-0 right-0 z-10 flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs hover:bg-muted"
            >
              <PanelRightOpen className="h-3.5 w-3.5" />
              Open API panel
            </button>
          )}
          {chartMode ? (
            <div className="py-16">
              <ChartView user={user} />
            </div>
          ) : (
            <DataView user={user} startNew={startNew} setStartNew={setStartNew} />
          )}
        </main>

        {/* Right: API playground — slide in when opened, slide out when X is clicked */}
        {isPanelVisible && (
          <div
            className={`flex shrink-0 flex-col overflow-hidden transition-[width] duration-300 ease-out ${
              isPanelClosing || !isPanelOpen
                ? "w-0 min-w-0 gap-0"
                : "w-[18rem] min-w-[18rem] sm:w-[300px] sm:min-w-[300px] gap-4 sm:gap-6"
            }`}
          >
            <aside
              className={`flex min-w-[18rem] sm:min-w-[300px] w-[18rem] sm:w-[300px] flex-1 flex-col gap-4 sm:gap-6 transition-transform duration-300 ease-out ${
                isPanelClosing || !isPanelOpen ? "translate-x-full" : "translate-x-0"
              }`}
            >
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    API
                  </Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={closePanel}
                    aria-label="Close panel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Select
                  value={integrationSidebar}
                  onValueChange={(value) => setIntegrationSidebar(value)}
                >
                  <SelectTrigger className="h-9 w-full text-sm">
                    <SelectValue placeholder="Select API" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTEGRATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid min-h-0 gap-3">
                <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/30 p-3">
                  {renderIntegration()}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
