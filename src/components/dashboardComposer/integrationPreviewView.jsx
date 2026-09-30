"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  formatCompact,
  formatProb,
  getCachedIntegrationPreview,
  loadIntegrationPreview,
} from "@/components/dashboardComposer/integrationPreviewSample";

function displayTile(row) {
  const ticker = String(row.subtitle || "");
  if (/^[A-Z0-9-]{4,}$/.test(ticker)) {
    const letters = ticker.replace(/^KX/i, "").replace(/[^A-Za-z]/g, "");
    if (letters.length >= 2) return letters.slice(0, 2).toUpperCase();
  }
  const skip = new Set([
    "will", "the", "a", "an", "of", "to", "in", "be", "by", "there", "no", "or", "and", "for", "after",
    "win", "on", "at", "next",
  ]);
  const words = String(row.title || "")
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z]/g, ""))
    .filter((word) => word && !skip.has(word.toLowerCase()));
  const letters = words.slice(0, 2).map((word) => word[0]).join("");
  return (letters || row.tile || "•").toUpperCase();
}

function Sparkline({ values, tone }) {
  const nums = (values || []).filter((n) => Number.isFinite(n));
  if (nums.length < 2) return null;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const width = 72;
  const height = 28;
  const points = nums
    .map((n, index) => {
      const x = (index / (nums.length - 1)) * width;
      const y = max === min ? height / 2 : height - ((n - min) / (max - min)) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0">
      <polyline
        fill="none"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
        className={cn(
          tone === "down" ? "stroke-rose-600 dark:stroke-rose-400" : "",
          tone === "up" ? "stroke-emerald-600 dark:stroke-emerald-400" : "",
          tone !== "up" && tone !== "down" ? "stroke-muted-foreground" : "",
        )}
      />
    </svg>
  );
}

function StatCards({ stats }) {
  if (!stats?.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-border/70 bg-background px-3 py-3 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-[20px] font-semibold tracking-tight text-foreground">{stat.value}</p>
              <p
                className={cn(
                  "mt-1 text-[11px] leading-snug",
                  stat.tone === "up" ? "text-emerald-700 dark:text-emerald-300" : "",
                  stat.tone === "down" ? "text-rose-700 dark:text-rose-300" : "",
                  stat.tone !== "up" && stat.tone !== "down" ? "text-muted-foreground" : "",
                )}
              >
                {stat.tone === "up" ? "↑ " : stat.tone === "down" ? "↓ " : ""}
                {stat.sentence}
              </p>
            </div>
            <Sparkline values={stat.series} tone={stat.tone} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Card({ title, caption, children }) {
  return (
    <article className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <header className="border-b border-border/50 px-3 py-2.5">
        <p className="text-[13px] font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{caption}</p>
      </header>
      {children}
    </article>
  );
}

function Pill({ children, tone }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone === "up" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "",
        tone === "down" ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "",
        tone !== "up" && tone !== "down" ? "bg-muted text-muted-foreground" : "",
      )}
    >
      {children}
    </span>
  );
}

function RankTable({ table }) {
  return (
    <Card title={table.title} caption={table.caption}>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border/50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-semibold">Market</th>
            <th className="px-3 py-2 font-semibold">Volume</th>
            <th className="px-3 py-2 text-right font-semibold">Yes</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={`${row.subtitle}-${row.title}`} className="border-b border-border/40 last:border-0">
              <td className="max-w-[220px] px-3 py-2.5">
                <p className="truncate text-[12px] font-medium text-foreground">{row.title}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">{row.subtitle}</p>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${row.share}%` }} />
                  </div>
                  <span className="font-mono text-[12px] text-foreground">
                    {formatCompact(row.volume, { money: table.money || row.money })}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-[12px] text-foreground">{formatProb(row.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function WatchlistTable({ table }) {
  return (
    <Card title={table.title} caption={table.caption}>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border/50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-semibold">Market</th>
            <th className="px-3 py-2 font-semibold">Yes</th>
            <th className="px-3 py-2 text-right font-semibold">Volume</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.subtitle || row.title} className="border-b border-border/40 last:border-0">
              <td className="max-w-[190px] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-foreground">
                    {displayTile(row)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium text-foreground">{row.title}</span>
                    <span className="block truncate font-mono text-[10px] text-muted-foreground">
                      {row.subtitle}
                    </span>
                  </span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <p className="font-mono text-[12px] font-medium text-foreground">{formatProb(row.price)}</p>
                {row.bid != null || row.ask != null ? (
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {formatProb(row.bid)}–{formatProb(row.ask)}
                  </p>
                ) : row.noPrice != null ? (
                  <p className="font-mono text-[10px] text-muted-foreground">No {formatProb(row.noPrice)}</p>
                ) : null}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-[12px] text-foreground">
                {formatCompact(row.volume, { money: table.money })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function AuditTable({ table }) {
  return (
    <Card title={table.title} caption={table.caption}>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border/50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-semibold">Time</th>
            <th className="px-3 py-2 font-semibold">Ticker</th>
            <th className="px-3 py-2 font-semibold">Side</th>
            <th className="px-3 py-2 text-right font-semibold">Size</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={`${row.time}-${row.title}-${index}`} className="border-b border-border/40 last:border-0">
              <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-muted-foreground">{row.time}</td>
              <td className="max-w-[150px] truncate px-3 py-2 font-mono text-[11px] text-foreground">{row.title}</td>
              <td className="px-3 py-2">
                <Pill tone={row.side === "no" ? "down" : "up"}>{row.side || "yes"}</Pill>
                <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{formatProb(row.price)}</span>
              </td>
              <td className="px-3 py-2 text-right font-mono text-[12px] text-foreground">
                {formatCompact(row.size)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function StatusTable({ table }) {
  return (
    <Card title={table.title} caption={table.caption}>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border/50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-semibold">Contract</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 text-right font-semibold">Last</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.subtitle} className="border-b border-border/40 last:border-0">
              <td className="max-w-[170px] px-3 py-2.5">
                <p className="truncate text-[12px] font-medium text-foreground">{row.title}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">{row.subtitle}</p>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                  <Pill>{row.status}</Pill>
                  {row.result ? (
                    <Pill tone={row.result === "no" ? "down" : row.result === "yes" ? "up" : undefined}>
                      {row.result}
                    </Pill>
                  ) : null}
                </div>
              </td>
              <td className="px-3 py-2.5 text-right">
                <p className="font-mono text-[12px] text-foreground">{formatProb(row.price)}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{formatCompact(row.volume)}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function PreviewTableView({ table }) {
  if (table.kind === "watchlist") return <WatchlistTable table={table} />;
  if (table.kind === "audit") return <AuditTable table={table} />;
  if (table.kind === "status") return <StatusTable table={table} />;
  return <RankTable table={table} />;
}

export function IntegrationSamplePreview({ integrationId }) {
  const cached = getCachedIntegrationPreview(integrationId);
  const [state, setState] = useState(() =>
    cached ? { status: "ready", data: cached, error: "" } : { status: "loading", data: null, error: "" },
  );

  useEffect(() => {
    const hit = getCachedIntegrationPreview(integrationId);
    if (hit) {
      setState({ status: "ready", data: hit, error: "" });
      return undefined;
    }
    let cancel = false;
    setState({ status: "loading", data: null, error: "" });
    loadIntegrationPreview(integrationId).then(
      (data) => {
        if (!cancel) setState({ status: "ready", data, error: "" });
      },
      (error) => {
        if (!cancel) {
          setState({
            status: "error",
            data: null,
            error: error instanceof Error ? error.message : "Sample pull failed",
          });
        }
      },
    );
    return () => {
      cancel = true;
    };
  }, [integrationId]);

  if (state.status === "loading") {
    return (
      <div className="mt-5 space-y-3">
        <Skeleton className="h-40 w-full rounded-xl bg-background/80" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-20 rounded-xl bg-background/80" />
          <Skeleton className="h-20 rounded-xl bg-background/80" />
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return <p className="mt-5 text-[12px] text-muted-foreground">{state.error}</p>;
  }

  const data = state.data;
  if (!data) return null;

  return (
    <div className="mt-5 space-y-3">
      {data.tables.map((table) => (
        <PreviewTableView key={table.title} table={table} />
      ))}
      <StatCards stats={data.stats} />
    </div>
  );
}
