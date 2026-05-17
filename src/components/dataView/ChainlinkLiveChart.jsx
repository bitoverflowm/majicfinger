"use client";

import { useMemo, useState } from "react";
import { Liveline } from "liveline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SHEET_COLORS = [
  "#3b82f6", // shadcn blue
  "#22c55e", // green
  "#a855f7", // purple
  "#f97316", // orange
];

const LIVELINE_WINDOWS = [
  { label: "1m", secs: 60 },
  { label: "5m", secs: 300 },
  { label: "15m", secs: 900 },
];

function toTimeSec(row) {
  const t = row?.time ?? row?.timestamp;
  if (t == null) return null;
  if (typeof t === "number") return t > 1e12 ? t / 1000 : t;
  const parsed = Date.parse(String(t));
  return Number.isFinite(parsed) ? parsed / 1000 : null;
}

function toValue(row) {
  const v = row?.value ?? row?.price;
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function ChainlinkLiveChart({ dataSheets = {}, streamsBySheetId = {}, compact = false }) {
  const chartHeight = compact ? 260 : 500;
  const chartMinHeight = compact ? 260 : 500;
  const outerClass = compact
    ? "mt-2 rounded-lg border border-border bg-card p-2"
    : "pb-10 mb-20 mt-4 rounded-lg border border-border bg-card p-3";
  const [split, setSplit] = useState(false);

  const chainlinkSheets = useMemo(() => {
    return Object.entries(streamsBySheetId)
      .filter(([, s]) => s?.type === "chainlink")
      .map(([sheetId]) => sheetId)
      .sort();
  }, [streamsBySheetId]);

  // Build series for all chainlink sheets (used for both single and multi)
  const series = useMemo(() => {
    return chainlinkSheets.map((sheetId, index) => {
      const rows = (dataSheets[sheetId]?.data ?? [])
        .map((row) => ({ time: toTimeSec(row), value: toValue(row), symbol: row?.symbol }))
        .filter((r) => r.time != null && r.value != null)
        .sort((a, b) => a.time - b.time);

      // Derive symbol label like "btc" from "BTC/USD"
      const firstSymbolRow = rows.find((r) => r.symbol);
      const rawSymbol = firstSymbolRow?.symbol || "";
      const baseSymbol = rawSymbol.split("/")[0]?.trim().toLowerCase() || null;

      const labelPrefix = `${index + 1}: `;
      const labelCore = baseSymbol || dataSheets[sheetId]?.name || sheetId;
      const label = `${labelPrefix}${labelCore}`;

      return {
        id: sheetId,
        label,
        color: SHEET_COLORS[index % SHEET_COLORS.length],
        data: rows.map(({ time, value }) => ({ time, value })), // strip symbol for Liveline
        value: rows[rows.length - 1]?.value ?? 0,
      };
    });
  }, [chainlinkSheets, dataSheets]);

  if (!chainlinkSheets.length) {
    return null;
  }

  const anyDataMulti = series.some((s) => s.data.length > 0);
  const anyConnecting = chainlinkSheets.some((id) => streamsBySheetId[id]?.connecting);
  const anyRunning = chainlinkSheets.some(
    (id) => streamsBySheetId[id]?.isRunning && !streamsBySheetId[id]?.hasReceivedFirstData
  );
  const loadingMulti = !anyDataMulti && (anyConnecting || anyRunning);
  const allPausedMulti =
    chainlinkSheets.length > 0 && chainlinkSheets.every((id) => streamsBySheetId[id]?.isPaused);
  const pausedMulti = allPausedMulti;

  // Single-stream Liveline mode
  if (chainlinkSheets.length === 1) {
    const sheetId = chainlinkSheets[0];
    const stream = streamsBySheetId[sheetId] || {};
    const s = series[0];
    const rows = s?.data ?? [];
    const hasData = rows.length > 0;
    const loading =
      !hasData && (stream.connecting || (stream.isRunning && !stream.hasReceivedFirstData));
    const paused = !!stream.isPaused;

    return (
      <div className={outerClass}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">Price vs time (live)</p>
          {paused && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
              Feed paused
            </span>
          )}
        </div>
        <div style={{ height: chartHeight, minHeight: chartMinHeight }} className="w-full">
          <Liveline
            data={rows}
            value={rows[rows.length - 1]?.value ?? 0}
            theme="light"
            color={SHEET_COLORS[0]}
            momentum={true}
            showValue={true}
            valueMomentumColor={true}
            windows={LIVELINE_WINDOWS}
            windowStyle="rounded"
            exaggerate={true}
            scrub={true}
            degen={true}
            badge={true}
            badgeVariant="default"
            loading={loading}
            paused={paused}
            emptyText="waiting for data to load in"
          />
        </div>
      </div>
    );
  }

  const anyData = series.some((s) => s.data.length > 0);
  const loading = loadingMulti;
  const paused = pausedMulti;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card transition-all duration-300 ease-in-out",
        compact ? "p-2" : "pb-10 mb-20 p-3",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Price vs time (live)</p>
        <div className="flex items-center gap-2">
          {paused && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
              Feed paused
            </span>
          )}
          {series.length > 1 && (
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="h-6 px-2 text-[11px]"
              onClick={() => setSplit((v) => !v)}
            >
              {split ? "Merge charts" : "Split chart"}
            </Button>
          )}
        </div>
      </div>
          <div className="w-full overflow-visible transition-all duration-300 ease-in-out">
        {split && series.length > 1 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {series.map((s, index) => (
              <div
                key={s.id}
                className={cn(
                  "rounded-lg border border-border/60 bg-card/80 p-2 transition-all duration-300 ease-in-out",
                  compact ? "h-[220px]" : "h-[460px]",
                )}
              >
                <p className="mb-1 text-[11px] font-medium text-muted-foreground">{s.label}</p>
                <div
                  className="w-full"
                  style={{ height: compact ? 180 : 340, minHeight: compact ? 180 : 340 }}
                >
                  <Liveline
                    data={s.data}
                    value={s.value}
                    theme="light"
                    color={SHEET_COLORS[index % SHEET_COLORS.length]}
                    momentum={true}
                    showValue={true}
                    valueMomentumColor={true}
                    windows={LIVELINE_WINDOWS}
                    windowStyle="rounded"
                    exaggerate={true}
                    scrub={true}
                    degen={true}
                    badge={true}
                    badgeVariant="default"
                    loading={loading && s.data.length === 0}
                    paused={paused}
                    emptyText="waiting for data to load in"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              height: compact ? chartHeight : 360,
              minHeight: compact ? chartMinHeight : 360,
            }}
            className="w-full overflow-visible"
          >
            <Liveline
              series={series}
              theme="light"
              windows={LIVELINE_WINDOWS}
              windowStyle="rounded"
              showValue={true}
              valueMomentumColor={true}
              exaggerate={true}
              scrub={true}
              degen={true}
              badge={true}
              badgeVariant="default"
              loading={loading}
              paused={paused}
              emptyText="waiting for data to load in"
            />
          </div>
        )}
      </div>
    </div>
  );
}
