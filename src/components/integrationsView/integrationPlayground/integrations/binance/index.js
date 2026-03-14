"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const RTDS_WS_URL = "wss://ws-live-data.polymarket.com";
const PING_INTERVAL_MS = 5000;

const SYMBOLS = [
  { value: "btcusdt", label: "btcusdt — Bitcoin to USDT" },
  { value: "ethusdt", label: "ethusdt — Ethereum to USDT" },
  { value: "solusdt", label: "solusdt — Solana to USDT" },
  { value: "xrpusdt", label: "xrpusdt — XRP to USDT" },
];

const Binance = ({ setConnectedData }) => {
  const [symbol, setSymbol] = useState("btcusdt");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const pingIntervalRef = useRef(null);

  const subscriptionMsg = useMemo(() => {
    return {
      action: "subscribe",
      subscriptions: [
        {
          topic: "crypto_prices",
          type: "update",
          filters: JSON.stringify([symbol]),
        },
      ],
    };
  }, [symbol]);

  const disconnect = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    setError(null);
    disconnect();

    const ws = new WebSocket(RTDS_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify(subscriptionMsg));
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("PING");
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (!msg?.payload) return;
        if (msg.topic !== "crypto_prices") return;
        if (msg.type !== "update") return;

        const payload = msg.payload;
        if (payload?.symbol !== symbol) return;

        const row = {
          source: "binance",
          symbol: payload.symbol,
          time: payload.timestamp, // ms
          value: payload.value,
          price: payload.value,
          receivedAt: msg.timestamp,
        };

        setConnectedData?.((prev) => {
          const next = Array.isArray(prev) ? [...prev, row] : [row];
          // keep it bounded so the sheet stays snappy
          return next.length > 2000 ? next.slice(-2000) : next;
        });
      } catch {
        // ignore non-JSON (e.g. server pongs)
      }
    };

    ws.onerror = () => {
      setError("WebSocket error");
      disconnect();
    };

    ws.onclose = () => {
      disconnect();
    };
  }, [disconnect, setConnectedData, subscriptionMsg, symbol]);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">Binance</p>
          <Badge className="bg-lychee_red text-white">Live</Badge>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Button size="sm" variant="outline" onClick={disconnect}>
              Disconnect
            </Button>
          ) : (
            <Button size="sm" onClick={connect}>
              Connect
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Real-time cryptocurrency price data from: Binance
      </p>

      <div className="grid gap-2">
        <Label className="text-xs text-muted-foreground">Symbol</Label>
        <Select
          value={symbol}
          onValueChange={(v) => {
            setSymbol(v);
            if (isConnected) connect();
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

export default Binance;
