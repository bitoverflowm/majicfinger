"use client";

import { Liveline } from "liveline";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useInView } from "framer-motion";

const CHAINLINK_WS_URL = "wss://ws-live-data.polymarket.com";
const SYMBOL = "btc/usd";
const PING_MS = 5000;
const MAX_POINTS = 800;
/** Landing accent: `lychee_blue` / Tailwind — stark on light & dark chart chrome */
const CHART_BLUE = "#4A5899";

const WINDOWS = [
  { label: "1m", secs: 60 },
  { label: "5m", secs: 300 },
  { label: "15m", secs: 900 },
];

function subscribeHtmlClass(cb: () => void) {
  const el = document.documentElement;
  const mo = new MutationObserver(cb);
  mo.observe(el, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}

function getHtmlIsDark() {
  return document.documentElement.classList.contains("dark");
}

function useDocumentDark() {
  return useSyncExternalStore(subscribeHtmlClass, getHtmlIsDark, () => false);
}

function toTimeSec(row: { time?: number }) {
  const t = row?.time;
  if (t == null) return null;
  if (typeof t === "number") return t > 1e12 ? t / 1000 : t;
  return null;
}

/**
 * Live Chainlink BTC/USD from Polymarket RTDS — connects only when the panel is in view
 * (avoids work when the feature tab is not shown or the section is off-screen).
 * Load via `next/dynamic({ ssr: false })` so the initial page load is not blocked.
 */
export function FeatureChainlinkBtcChart() {
  const ref = useRef<HTMLDivElement>(null);
  const isDark = useDocumentDark();
  const inView = useInView(ref, { amount: 0.2, once: false });
  const [rows, setRows] = useState<{ time: number; value: number }[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [hasData, setHasData] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!inView) {
      if (pingRef.current) {
        clearInterval(pingRef.current);
        pingRef.current = null;
      }
      if (wsRef.current) {
        try {
          wsRef.current.close(1000, "inactive");
        } catch {
          /* ignore */
        }
        wsRef.current = null;
      }
      return;
    }

    setConnecting(true);
    setRows([]);
    setHasData(false);

    const subscriptionMsg = {
      action: "subscribe",
      subscriptions: [
        {
          topic: "crypto_prices_chainlink",
          type: "*",
          filters: JSON.stringify({ symbol: SYMBOL }),
        },
      ],
    };

    const ws = new WebSocket(CHAINLINK_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify(subscriptionMsg));
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("PING");
      }, PING_MS);
      setConnecting(false);
    };

    ws.onmessage = (event) => {
      if (event.data === "PONG" || typeof event.data !== "string") return;
      try {
        const msg = JSON.parse(event.data);
        if (!msg?.payload || msg.topic !== "crypto_prices_chainlink" || msg.type !== "update") return;
        const payload = msg.payload;
        if (payload?.symbol !== SYMBOL) return;
        const time = toTimeSec({ time: payload.timestamp });
        const value = Number(payload.value);
        if (time == null || !Number.isFinite(value)) return;
        setHasData(true);
        setRows((prev) => {
          const next = [...prev, { time, value }];
          return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
        });
      } catch {
        /* ignore */
      }
    };

    ws.onerror = () => {
      setConnecting(false);
    };

    ws.onclose = () => {
      setConnecting(false);
      if (pingRef.current) {
        clearInterval(pingRef.current);
        pingRef.current = null;
      }
      wsRef.current = null;
    };

    return () => {
      if (pingRef.current) {
        clearInterval(pingRef.current);
        pingRef.current = null;
      }
      try {
        ws.close(1000, "cleanup");
      } catch {
        /* ignore */
      }
      wsRef.current = null;
    };
  }, [inView]);

  const chartData = useMemo(
    () => rows.map(({ time, value }) => ({ time, value })).sort((a, b) => a.time - b.time),
    [rows],
  );

  const lastValue = chartData[chartData.length - 1]?.value ?? 0;
  const loading = connecting || (!hasData && inView);

  return (
    <div
      ref={ref}
      className="flex h-full min-h-0 w-full max-h-full flex-col overflow-hidden bg-transparent pt-6 md:pt-7"
    >
      <p className="shrink-0 px-0.5 pb-1 text-[10px] font-medium text-muted-foreground md:text-xs">
        BTC/USD · Chainlink
      </p>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden [&>*:not(:last-child)]:shrink-0">
        <Liveline
          data={chartData}
          value={lastValue}
          theme={isDark ? "dark" : "light"}
          color={CHART_BLUE}
          fill={false}
          momentum
          showValue
          valueMomentumColor
          windows={WINDOWS}
          windowStyle="rounded"
          exaggerate
          scrub
          degen
          badge
          badgeVariant="default"
          loading={loading}
          paused={!inView}
          emptyText="connecting…"
          className="min-h-0 min-w-0 flex-1 basis-0"
          style={{ backgroundColor: "transparent" }}
        />
      </div>
    </div>
  );
}
