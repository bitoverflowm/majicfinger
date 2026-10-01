"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const KALSHI_GREEN = "#28CC95";
const BUCKETS = 160;

function parseChartNumber(value) {
  const raw = String(value ?? "")
    .trim()
    .replace(/¢$/, "")
    .replace(/,/g, "");
  if (!raw) return null;
  const match = raw.match(/^(-?\d+(?:\.\d+)?)\s*([KMB])?$/i);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  const scale = { K: 1e3, M: 1e6, B: 1e9 }[(match[2] || "").toUpperCase()] || 1;
  return n * scale;
}

function columnIndex(columns, test) {
  return (columns || []).findIndex((column) => test(String(column?.title || "").trim().toLowerCase()));
}

function formatWhen(time) {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatCompact(value) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function bucketYesPrice(columns, rows) {
  const timeIndex = columnIndex(columns, (title) => title.includes("created"));
  const priceIndex = columnIndex(columns, (title) => title === "yes price");
  const sizeIndex = columnIndex(columns, (title) => title === "size" || title === "volume");
  const sizeTitle = sizeIndex >= 0 ? columns[sizeIndex]?.title || "Size" : "";
  if (timeIndex < 0 || priceIndex < 0) return { points: [], sizeTitle };

  const samples = [];
  for (const row of rows || []) {
    const time = Date.parse(row?.[timeIndex]);
    const price = parseChartNumber(row?.[priceIndex]);
    if (!Number.isFinite(time) || price == null) continue;
    const size = sizeIndex >= 0 ? parseChartNumber(row?.[sizeIndex]) : 0;
    samples.push({ time, price, size: size || 0 });
  }
  samples.sort((a, b) => a.time - b.time);
  if (!samples.length) return { points: [], sizeTitle };

  const span = Math.max(1, Math.ceil(samples.length / BUCKETS));
  const points = [];
  for (let start = 0; start < samples.length; start += span) {
    const slice = samples.slice(start, start + span);
    const last = slice[slice.length - 1];
    points.push({
      time: last.time,
      price: last.price,
      size: slice.reduce((sum, sample) => sum + sample.size, 0),
    });
  }
  return { points, sizeTitle };
}

function HoverCapture({ active, payload, onHover }) {
  const point = active ? payload?.[0]?.payload : null;
  useEffect(() => {
    onHover(point || null);
  }, [onHover, point]);
  return null;
}

export function TradePriceChart({ columns, rows }) {
  const gradientId = useId().replace(/:/g, "");
  const { points, sizeTitle } = useMemo(() => bucketYesPrice(columns, rows), [columns, rows]);
  const [hover, setHover] = useState(null);
  const onHover = useCallback((point) => {
    setHover((current) => (current?.time === point?.time ? current : point));
  }, []);
  const active = hover || points[points.length - 1];

  if (!points.length) {
    return <p className="px-3 text-[12px] text-muted-foreground">This trades sheet has no yes price to chart yet.</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pb-2">
      <div className="flex items-end justify-between gap-3 pb-1">
        <div className="min-w-0">
          <p className="text-[22px] font-semibold leading-none tabular-nums text-foreground">{Math.round(active.price)}¢</p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">{formatWhen(active.time)}</p>
        </div>
        {sizeTitle ? (
          <p className="shrink-0 text-right text-[11px] text-muted-foreground">
            {sizeTitle} <span className="font-medium tabular-nums text-foreground">{formatCompact(active.size)}</span>
          </p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={KALSHI_GREEN} stopOpacity={0.35} />
                <stop offset="100%" stopColor={KALSHI_GREEN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              type="number"
              domain={["dataMin", "dataMax"]}
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              minTickGap={28}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="price"
              tick={{ fontSize: 10 }}
              width={36}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${Math.round(value)}¢`}
              domain={["auto", "auto"]}
            />
            <Tooltip
              cursor={{ stroke: KALSHI_GREEN, strokeWidth: 1 }}
              content={<HoverCapture onHover={onHover} />}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={KALSHI_GREEN}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 3, fill: KALSHI_GREEN, stroke: "#fff", strokeWidth: 1 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
