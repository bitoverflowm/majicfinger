"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useMyStateV2 } from "@/context/stateContextV2";
import { ReplaceOrNewSheetDialog } from "@/components/dataView/replaceOrNewSheetDialog";
import { integrations_list } from "@/components/integrationsView/integrationsConfig";
import { Play, Square, RotateCw, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

// symbol format "btc/usd" -> base "btc", quote "usd"
const PAIRS = [
  { value: "btc/usd", base: "BTC", quote: "USD" },
  { value: "eth/usd", base: "ETH", quote: "USD" },
  { value: "sol/usd", base: "SOL", quote: "USD" },
  { value: "xrp/usd", base: "XRP", quote: "USD" },
];

function quoteChar(quote) {
  const q = (quote || "").toUpperCase();
  if (q === "USD") return "$";
  if (q === "USDT") return "T";
  if (q === "USDC") return "C";
  if (q === "GBP") return "£";
  if (q === "EUR") return "€";
  return q[0] || "?";
}

function TokenLogo({ base, quote, className }) {
  const baseLetter = (base || "?")[0];
  const quoteLetter = quoteChar(quote);
  return (
    <div
      className={cn(
        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/30",
        className
      )}
    >
      <span className="text-sm font-semibold text-foreground">{baseLetter}</span>
      <span
        className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-md border border-background bg-muted text-[10px] font-medium text-foreground"
        style={{ zIndex: 1 }}
      >
        {quoteLetter}
      </span>
    </div>
  );
}

const Chainlink = () => {
  const [selectedSymbols, setSelectedSymbols] = useState([]);
  const [error, setError] = useState(null);
  const [replaceOrNewSheetOpen, setReplaceOrNewSheetOpen] = useState(false);
  const [pendingSymbol, setPendingSymbol] = useState(null);
  const ctx = useMyStateV2();
  const liveStreamState = ctx?.liveStreamState;
  const liveStreamActions = ctx?.liveStreamActions;
  const activeSheetId = ctx?.activeSheetId;
  const replaceCurrentSheetData = ctx?.replaceCurrentSheetData;
  const addNewSheetAndActivate = ctx?.addNewSheetAndActivate;

  const streamsBySheetId = liveStreamState?.streamsBySheetId || {};
  const hasDataOrStream = (ctx?.connectedData?.length > 0) || Object.values(streamsBySheetId).some((s) => s?.isRunning);
  const hasLiveConnection = Object.values(streamsBySheetId).some((s) => s?.isRunning);

  const getSheetIdForSymbol = (symbol) => {
    const entry = Object.entries(streamsBySheetId).find(
      ([, s]) => s?.type === "chainlink" && s?.config?.symbol === symbol
    );
    return entry ? entry[0] : null;
  };

  const doConnect = (sheetId, symbol) => {
    setError(null);
    liveStreamActions?.start?.(sheetId, "chainlink", { symbol });
  };

  const handleStart = (symbol) => {
    if (hasDataOrStream) {
      setPendingSymbol(symbol);
      setReplaceOrNewSheetOpen(true);
    } else {
      doConnect(activeSheetId, symbol);
    }
  };

  const handleReplace = () => {
    if (pendingSymbol) {
      liveStreamActions?.stop?.(activeSheetId);
      replaceCurrentSheetData?.([]);
      doConnect(activeSheetId, pendingSymbol);
      setPendingSymbol(null);
    }
  };

  const handleAddNewSheet = () => {
    if (pendingSymbol) {
      addNewSheetAndActivate?.((newId) => {
        doConnect(newId, pendingSymbol);
        setPendingSymbol(null);
      });
    }
  };

  const toggleSymbol = (symbol) => {
    setSelectedSymbols((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  };

  return (
    <div className="relative space-y-4">
      <div className="absolute top-1 right-1 -mt-6 -mr-1 flex items-center gap-1">
        <span className="h-2 w-2 shrink-0 rounded-full bg-green-500 animate-pulse" aria-hidden />
        <span className="text-[6pt] text-muted-foreground">Live</span>
      </div>
      <ReplaceOrNewSheetDialog
        open={replaceOrNewSheetOpen}
        onOpenChange={(open) => {
          if (!open) setPendingSymbol(null);
          setReplaceOrNewSheetOpen(open);
        }}
        hasLiveConnection={hasLiveConnection}
        onReplace={handleReplace}
        onAddNewSheet={handleAddNewSheet}
      />
      <p className="text-xs text-muted-foreground">
        {integrations_list.find((i) => i.clickHandler === "chainlink")?.playgroundDescription ??
          "Real-time cryptocurrency price data from Chainlink — the world's #1 oracle"}
      </p>

      <div className="flex flex-col gap-1">
        {PAIRS.map((pair) => {
          const sheetId = getSheetIdForSymbol(pair.value);
          const stream = sheetId ? streamsBySheetId[sheetId] : null;
          const isRunning = stream?.isRunning ?? false;
          const isPaused = stream?.isPaused ?? false;
          const isSelected = selectedSymbols.includes(pair.value);

          return (
            <label
              key={pair.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors duration-200 hover:bg-muted/50",
                isSelected && "bg-muted/30"
              )}
            >
              <TokenLogo base={pair.base} quote={pair.quote} />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-foreground">
                  {pair.base}/{pair.quote}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSymbol(pair.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="mr-1"
                />
                {isSelected && (
                  isRunning ? (
                    <>
                      {isPaused ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.preventDefault();
                            liveStreamActions?.resume?.(sheetId);
                          }}
                          aria-label="Resume"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.preventDefault();
                            liveStreamActions?.pause?.(sheetId);
                          }}
                          aria-label="Pause"
                        >
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.preventDefault();
                          liveStreamActions?.restart?.(sheetId);
                        }}
                        aria-label="Restart"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.preventDefault();
                          liveStreamActions?.stop?.(sheetId);
                        }}
                        aria-label="Stop"
                      >
                        <Square className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        handleStart(pair.value);
                      }}
                      disabled={!activeSheetId}
                      aria-label="Start"
                    >
                      <Play className="h-3 w-3" />
                      Start
                    </Button>
                  )
                )}
              </div>
            </label>
          );
        })}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};

export default Chainlink;
