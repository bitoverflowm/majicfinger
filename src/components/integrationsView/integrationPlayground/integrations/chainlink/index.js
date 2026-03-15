"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useMyStateV2 } from "@/context/stateContextV2";
import { ReplaceOrNewSheetDialog } from "@/components/dataView/replaceOrNewSheetDialog";
import { integrations_list } from "@/components/integrationsView/integrationsConfig";
import { Play, Square, RotateCw, Pause, X, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
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

function TokenLogo({ base, quote, className, fullHeight }) {
  const baseLetter = (base || "?")[0];
  const quoteLetter = quoteChar(quote);
  return (
    <div
      className={cn(
        "relative flex w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/30",
        fullHeight ? "self-stretch min-h-[72px]" : "h-9",
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

const LIST_MAX_HEIGHT = 400;
const COLLAPSED_ROW_HEIGHT = 56;
const COLLAPSED_GAP = 8;

const Chainlink = () => {
  const [error, setError] = useState(null);
  const [replaceOrNewSheetOpen, setReplaceOrNewSheetOpen] = useState(false);
  const [pendingSymbol, setPendingSymbol] = useState(null);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const listRef = useRef(null);
  const ctx = useMyStateV2();
  const liveStreamState = ctx?.liveStreamState;
  const liveStreamActions = ctx?.liveStreamActions;
  const activeSheetId = ctx?.activeSheetId;
  const replaceCurrentSheetData = ctx?.replaceCurrentSheetData;
  const addNewSheetAndActivate = ctx?.addNewSheetAndActivate;
  const setSheetData = ctx?.setSheetData;
  const dataSheets = ctx?.dataSheets || {};
  const setDataSheets = ctx?.setDataSheets;
  const setActiveSheetId = ctx?.setActiveSheetId;

  const streamsBySheetId = liveStreamState?.streamsBySheetId || {};
  const replaceTargets = Object.entries(streamsBySheetId)
    .filter(([, s]) => s?.type === "chainlink")
    .map(([sheetId, s]) => ({
      sheetId,
      symbol: s?.config?.symbol,
      sheetName: dataSheets[sheetId]?.name ?? sheetId,
    }));
  const getSheetIdForSymbol = (symbol) => {
    const entry = Object.entries(streamsBySheetId).find(
      ([, s]) => s?.type === "chainlink" && s?.config?.symbol === symbol
    );
    return entry ? entry[0] : null;
  };
  const hasActiveChainlinkStream = Object.values(streamsBySheetId).some((s) => s?.type === "chainlink");
  const selectedPair = PAIRS.find((p) => getSheetIdForSymbol(p.value));
  const hasDataOrStream =
    (ctx?.connectedData?.length > 0) ||
    Object.values(streamsBySheetId).some((s) => s?.isRunning || s?.connecting);
  const hasLiveConnection = Object.values(streamsBySheetId).some((s) => s?.isRunning);
  const showCollapsedView = hasActiveChainlinkStream && !isListExpanded;

  useEffect(() => {
    if (!hasActiveChainlinkStream) setIsListExpanded(false);
  }, [hasActiveChainlinkStream]);

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
      setReplaceOrNewSheetOpen(false);
      setIsListExpanded(false);
      liveStreamActions?.stop?.(activeSheetId);
      replaceCurrentSheetData?.([]);
      doConnect(activeSheetId, pendingSymbol);
      setPendingSymbol(null);
    }
  };

  const handleReplaceOne = (sheetId) => {
    if (!pendingSymbol) return;
    const sym = pendingSymbol;
    setReplaceOrNewSheetOpen(false);
    setIsListExpanded(false);
    setPendingSymbol(null);
    liveStreamActions?.stop?.(sheetId);
    setSheetData?.(sheetId, []);
    setTimeout(() => doConnect(sheetId, sym), 0);
  };

  const handleReplaceAll = () => {
    if (!pendingSymbol) return;
    const sym = pendingSymbol;
    const sheetIdsToStop = Object.entries(streamsBySheetId)
      .filter(([, s]) => s?.type === "chainlink")
      .map(([id]) => id);
    setReplaceOrNewSheetOpen(false);
    setIsListExpanded(false);
    setPendingSymbol(null);
    sheetIdsToStop.forEach((sheetId) => {
      liveStreamActions?.stop?.(sheetId);
      setSheetData?.(sheetId, []);
    });
    setDataSheets?.({ "sheet-1": { name: "Sheet 1", data: [] } });
    setActiveSheetId?.("sheet-1");
    setTimeout(() => doConnect("sheet-1", sym), 0);
  };

  const handleAddNewSheet = () => {
    if (pendingSymbol) {
      setReplaceOrNewSheetOpen(false);
      setIsListExpanded(false);
      addNewSheetAndActivate?.((newId) => {
        doConnect(newId, pendingSymbol);
        setPendingSymbol(null);
      });
    }
  };

  const handleCheckboxChange = (symbol, checked) => {
    if (checked) handleStart(symbol);
  };

  const renderPairRow = (pair, compact = false) => {
    const sheetId = getSheetIdForSymbol(pair.value);
    const stream = sheetId ? streamsBySheetId[sheetId] : null;
    const isRunning = stream?.isRunning ?? false;
    const isPaused = stream?.isPaused ?? false;
    const isLoading =
      stream?.connecting || (stream?.isRunning && !stream?.hasReceivedFirstData);
    const progressValue = stream?.connecting
      ? 0
      : stream?.hasReceivedFirstData
        ? 100
        : isRunning
          ? 50
          : 0;

    if (compact) {
      const showLoadingLayout = isLoading;
      return (
        <div
          key={pair.value}
          className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors hover:bg-muted/70"
        >
          <TokenLogo base={pair.base} quote={pair.quote} />
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-1">
            {showLoadingLayout ? (
              <>
                <div className="flex items-center">
                  <span className="text-xs font-medium text-foreground">
                    {pair.base}/{pair.quote}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-24">
                    <Progress
                      value={progressValue}
                      className="h-1.5 w-full"
                      indicatorClassName="bg-blue-500 dark:bg-blue-400"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  {stream?.statusMessage && (
                    <span className="text-[6pt] text-muted-foreground">{stream.statusMessage}</span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center">
                <span className="text-xs font-medium text-foreground">
                  {pair.base}/{pair.quote}
                </span>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isLoading ? (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        liveStreamActions?.stop?.(sheetId);
                      }}
                      aria-label="Cancel connection"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Cancel connection</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : isRunning ? (
              <>
                {isPaused ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
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
                      e.stopPropagation();
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
                    e.stopPropagation();
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
                    e.stopPropagation();
                    liveStreamActions?.stop?.(sheetId);
                  }}
                  aria-label="Stop"
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Checkbox
                checked={false}
                onCheckedChange={(checked) => handleCheckboxChange(pair.value, checked === true)}
                onClick={(e) => e.stopPropagation()}
                className="h-3.5 w-3.5 shrink-0 rounded-[3px] border border-input [&_svg]:h-2.5 [&_svg]:w-2.5"
                disabled={!activeSheetId}
              />
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        key={pair.value}
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors hover:bg-muted/70"
      >
        <TokenLogo base={pair.base} quote={pair.quote} />
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium text-foreground">
            {pair.base}/{pair.quote}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isLoading ? (
            <>
              <div className="flex w-24 flex-col gap-0.5">
                <Progress
                  value={progressValue}
                  className="h-1.5 w-full"
                  indicatorClassName="bg-blue-500 dark:bg-blue-400"
                />
                {stream?.statusMessage && (
                  <span className="text-[6pt] text-muted-foreground">{stream.statusMessage}</span>
                )}
              </div>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        liveStreamActions?.stop?.(sheetId);
                      }}
                      aria-label="Cancel connection"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Cancel connection</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          ) : isRunning ? (
            <>
              {isPaused ? (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); liveStreamActions?.resume?.(sheetId); }} aria-label="Resume">
                <Play className="h-3.5 w-3.5" />
              </Button>
              ) : (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); liveStreamActions?.pause?.(sheetId); }} aria-label="Pause">
                <Pause className="h-3.5 w-3.5" />
              </Button>
              )}
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); liveStreamActions?.restart?.(sheetId); }} aria-label="Restart">
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); liveStreamActions?.stop?.(sheetId); }} aria-label="Stop">
                <Square className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Checkbox
              checked={false}
              onCheckedChange={(checked) => handleCheckboxChange(pair.value, checked === true)}
              onClick={(e) => e.stopPropagation()}
              className="h-3.5 w-3.5 shrink-0 rounded-[3px] border border-input [&_svg]:h-2.5 [&_svg]:w-2.5"
              disabled={!activeSheetId}
            />
          )}
        </div>
      </div>
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
        replaceTargets={replaceTargets}
        onReplace={handleReplace}
        onReplaceOne={handleReplaceOne}
        onReplaceAll={handleReplaceAll}
        onAddNewSheet={handleAddNewSheet}
      />
      <p className="text-xs text-muted-foreground">
        {integrations_list.find((i) => i.clickHandler === "chainlink")?.playgroundDescription ??
          "Real-time cryptocurrency price data from Chainlink — the world's #1 oracle"}
      </p>

      <div className="flex flex-col gap-1">
        <div
          className="overflow-hidden transition-[max-height] duration-300 ease-in-out pb-4"
          style={{
            maxHeight: showCollapsedView
              ? (() => {
                  const activePairs = PAIRS.filter((p) => getSheetIdForSymbol(p.value));
                  const n = activePairs.length;
                  return n * COLLAPSED_ROW_HEIGHT + (n > 1 ? (n - 1) * COLLAPSED_GAP : 0) + 24;
                })()
              : 0,
          }}
        >
          {PAIRS.filter((p) => getSheetIdForSymbol(p.value)).map((p) => renderPairRow(p, true))}
        </div>
        {showCollapsedView && (
          <div className="mt-4 pt-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setIsListExpanded(true)}
              className="w-full gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Add/stack a new connection
            </Button>
          </div>
        )}
        <div
          className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
          style={{ maxHeight: showCollapsedView ? 0 : LIST_MAX_HEIGHT }}
        >
          <div ref={listRef} className="flex flex-col gap-1">
            {PAIRS.map((p) => renderPairRow(p, false))}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};

export default Chainlink;
