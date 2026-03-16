"use client";

import { useMemo } from "react";
import { Liveline } from "liveline";

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

export function ChainlinkLiveChart({ dataSheets = {}, streamsBySheetId = {} }) {
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
        .map((row) => ({ time: toTimeSec(row), value: toValue(row) }))
        .filter((r) => r.time != null && r.value != null)
        .sort((a, b) => a.time - b.time);
      const name = dataSheets[sheetId]?.name ?? sheetId;
      return {
        id: sheetId,
        label: name,
        color: SHEET_COLORS[index % SHEET_COLORS.length],
        data: rows,
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
      <div className="h-[520px] pb-10 mb-20 mt-4 rounded-lg border border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">Price vs time (live)</p>
          {paused && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
              Feed paused
            </span>
          )}
        </div>
        <div style={{ height: 360, minHeight: 360 }} className=" w-full">
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
    <div className="h-[520px] pb-10 mb-20 rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Price vs time (live)</p>
        {paused && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
            Feed paused
          </span>
        )}
      </div>
      <div style={{ height: 360, minHeight: 360 }} className="w-full overflow-visible">
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
    </div>
  );
}
