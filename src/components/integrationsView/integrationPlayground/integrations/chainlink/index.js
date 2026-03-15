"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMyStateV2 } from "@/context/stateContextV2";
import { ReplaceOrNewSheetDialog } from "@/components/dataView/replaceOrNewSheetDialog";
import { integrations_list } from "@/components/integrationsView/integrationsConfig";

const SYMBOLS = [
  { value: "btc/usd", label: "btc/usd — Bitcoin to USD" },
  { value: "eth/usd", label: "eth/usd — Ethereum to USD" },
  { value: "sol/usd", label: "sol/usd — Solana to USD" },
  { value: "xrp/usd", label: "xrp/usd — XRP to USD" },
];

const Chainlink = () => {
  const [symbol, setSymbol] = useState("btc/usd");
  const [error, setError] = useState(null);
  const [replaceOrNewSheetOpen, setReplaceOrNewSheetOpen] = useState(false);
  const ctx = useMyStateV2();
  const liveStreamState = ctx?.liveStreamState;
  const liveStreamActions = ctx?.liveStreamActions;
  const activeSheetId = ctx?.activeSheetId;
  const replaceCurrentSheetData = ctx?.replaceCurrentSheetData;
  const addNewSheetAndActivate = ctx?.addNewSheetAndActivate;

  const streamsBySheetId = liveStreamState?.streamsBySheetId || {};
  const isConnected = activeSheetId && streamsBySheetId[activeSheetId]?.type === "chainlink" && streamsBySheetId[activeSheetId]?.isRunning;
  const hasDataOrStream = (ctx?.connectedData?.length > 0) || Object.values(streamsBySheetId).some((s) => s?.isRunning);
  const hasLiveConnection = Object.values(streamsBySheetId).some((s) => s?.isRunning);

  const doConnect = (sheetId) => {
    setError(null);
    liveStreamActions?.start?.(sheetId, "chainlink", { symbol });
  };

  const handleConnect = () => {
    if (hasDataOrStream) {
      setReplaceOrNewSheetOpen(true);
    } else {
      doConnect(activeSheetId);
    }
  };

  const handleReplace = () => {
    liveStreamActions?.stop?.(activeSheetId);
    replaceCurrentSheetData?.([]);
    doConnect(activeSheetId);
  };

  const handleAddNewSheet = () => {
    addNewSheetAndActivate?.((newId) => doConnect(newId));
  };

  const handleDisconnect = () => {
    liveStreamActions?.stop?.(activeSheetId);
  };

  return (
    <div className="space-y-4">
      <ReplaceOrNewSheetDialog
        open={replaceOrNewSheetOpen}
        onOpenChange={setReplaceOrNewSheetOpen}
        hasLiveConnection={hasLiveConnection}
        onReplace={handleReplace}
        onAddNewSheet={handleAddNewSheet}
      />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">Chainlink</p>
          <Badge className="bg-lychee_red text-white">Live</Badge>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Button size="sm" variant="outline" onClick={handleDisconnect}>
              Disconnect
            </Button>
          ) : (
            <Button size="sm" onClick={handleConnect} disabled={!activeSheetId}>
              Connect
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {integrations_list.find((i) => i.clickHandler === "chainlink")?.playgroundDescription ??
          "Real-time cryptocurrency price data from Chainlink — the world's #1 oracle"}
      </p>

      <div className="grid gap-2">
        <Label className="text-xs text-muted-foreground">Symbol</Label>
        <Select
          value={symbol}
          onValueChange={(v) => {
            setSymbol(v);
            if (isConnected) {
              liveStreamActions?.start?.(activeSheetId, "chainlink", { symbol: v });
            }
          }}
        >
          <SelectTrigger className="h-9 w-full text-sm">
            <SelectValue placeholder="Select symbol" />
          </SelectTrigger>
          <SelectContent>
            {SYMBOLS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};

export default Chainlink;
