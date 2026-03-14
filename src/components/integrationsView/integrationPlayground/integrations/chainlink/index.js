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

const SYMBOLS = [
  { value: "btc/usd", label: "btc/usd — Bitcoin to USD" },
  { value: "eth/usd", label: "eth/usd — Ethereum to USD" },
  { value: "sol/usd", label: "sol/usd — Solana to USD" },
  { value: "xrp/usd", label: "xrp/usd — XRP to USD" },
];

const Chainlink = () => {
  const [symbol, setSymbol] = useState("btc/usd");
  const [error, setError] = useState(null);
  const liveStreamState = useMyStateV2()?.liveStreamState;
  const liveStreamActions = useMyStateV2()?.liveStreamActions;

  const isConnected = liveStreamState?.type === "chainlink" && liveStreamState?.isRunning;

  const handleConnect = () => {
    setError(null);
    liveStreamActions?.start?.("chainlink", { symbol });
  };

  const handleDisconnect = () => {
    liveStreamActions?.stop?.();
  };

  return (
    <div className="space-y-4">
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
            <Button size="sm" onClick={handleConnect}>
              Connect
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Real-time cryptocurrency price data from Chainlink — the world&apos;s #1 oracle
      </p>

      <div className="grid gap-2">
        <Label className="text-xs text-muted-foreground">Symbol</Label>
        <Select
          value={symbol}
          onValueChange={(v) => {
            setSymbol(v);
            if (isConnected) {
              liveStreamActions?.start?.("chainlink", { symbol: v });
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
