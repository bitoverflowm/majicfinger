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
import { useMyStateV2 } from "@/context/stateContextV2";
import { runConnectHomeLiveStreamPull } from "@/lib/connectHomePullDestination";

const RTDS_WS_URL = "wss://ws-live-data.polymarket.com";
const PING_INTERVAL_MS = 5000;

const SYMBOLS = [
  { value: "btcusdt", label: "btcusdt — Bitcoin to USDT" },
  { value: "ethusdt", label: "ethusdt — Ethereum to USDT" },
  { value: "solusdt", label: "solusdt — Solana to USDT" },
  { value: "xrpusdt", label: "xrpusdt — XRP to USDT" },
];

const Binance = ({ setConnectedData, connectHomePullBridge = false }) => {
  const ctx = useMyStateV2?.() ?? {};
  const setConnectDataLakePullState = ctx?.setConnectDataLakePullState;
  const connectIntegrationPullTick = ctx?.connectIntegrationPullTick ?? 0;
  const connectLiveSourceId = ctx?.connectLiveSourceId ?? "";
  const connectLiveColumnSelections = ctx?.connectLiveColumnSelections ?? {};
  const connectHomePullDestination = ctx?.connectHomePullDestination;
  const connectHomePendingSheetName = ctx?.connectHomePendingSheetName;
  const connectedData = ctx?.connectedData;
  const dataSheets = ctx?.dataSheets || {};
  const activeSheetId = ctx?.activeSheetId;
  const addNewSheetAndActivate = ctx?.addNewSheetAndActivate;
  const replaceCurrentSheetData = ctx?.replaceCurrentSheetData;
  const setSheetData = ctx?.setSheetData;
  const setDataSheets = ctx?.setDataSheets;
  const lastConnectPullTickRef = useRef(0);
  const connectHomeActive =
    connectHomePullBridge &&
    ctx?.viewing === "connectDataHome" &&
    ctx?.connectWorkspace === "binance";

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

  useEffect(() => {
    if (connectLiveSourceId) setSymbol(connectLiveSourceId);
  }, [connectLiveSourceId]);

  useEffect(() => {
    if (!connectHomeActive || !connectIntegrationPullTick) return;
    if (lastConnectPullTickRef.current === connectIntegrationPullTick) return;
    lastConnectPullTickRef.current = connectIntegrationPullTick;

    const sym = connectLiveSourceId || symbol;
    const cols = connectLiveColumnSelections[sym] || [];
    if (!sym) {
      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: false,
        error: "Select a symbol first.",
      }));
      return;
    }
    if (!cols.length) {
      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: false,
        error: "Select at least one column.",
      }));
      return;
    }
    setConnectDataLakePullState?.((prev) => ({
      ...prev,
      loading: false,
      label: "Live stream connected",
      progress: 100,
      error: null,
    }));
    runConnectHomeLiveStreamPull(
      {
        dataSheets,
        connectedData,
        activeSheetId,
        connectHomePullDestination,
        connectHomePendingSheetName,
        addNewSheetAndActivate,
        replaceCurrentSheetData,
        setSheetData,
        setDataSheets,
      },
      {
        onStart: () => {
          if (sym !== symbol) setSymbol(sym);
          connect();
        },
      },
    );
  }, [
    connectHomeActive,
    connectIntegrationPullTick,
    connectLiveSourceId,
    connectLiveColumnSelections,
    activeSheetId,
    connectHomePullDestination,
    connectHomePendingSheetName,
    connectedData,
    dataSheets,
    addNewSheetAndActivate,
    replaceCurrentSheetData,
    setSheetData,
    setDataSheets,
    symbol,
    connect,
    setConnectDataLakePullState,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">Binance</p>
          <Badge className="bg-secondary text-secondary-foreground">Live</Badge>
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
