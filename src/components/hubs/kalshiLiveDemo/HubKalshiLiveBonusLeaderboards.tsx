"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Braces, Loader2, RefreshCw, Sparkles, Table2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  KALSHI_LIVE_SERIES_CATEGORY_OPTIONS,
} from "@/lib/kalshiLive/kalshiLiveCategories";
import {
  getKalshiLiveLeaderboardColumnLabel,
  KALSHI_LIVE_LEADERBOARD_COLUMNS,
  KALSHI_LIVE_LEADERBOARD_DEFAULT_METRIC,
  KALSHI_LIVE_LEADERBOARD_DEFAULT_TIME_PERIOD,
  KALSHI_LIVE_LEADERBOARD_LIMIT_DEFAULT,
  KALSHI_LIVE_LEADERBOARD_METRIC_OPTIONS,
  KALSHI_LIVE_LEADERBOARD_TIME_PERIOD_OPTIONS,
  normalizeKalshiLiveLeaderboardMetric,
  normalizeKalshiLiveLeaderboardTimePeriod,
} from "@/lib/kalshiLive/leaderboardColumns";
import { fetchKalshiLiveLeaderboardPull } from "@/lib/kalshiLive/fetchKalshiLiveLeaderboardPull";
import { formatKalshiLiveTraderMetricCompact } from "@/lib/kalshiLive/searchTradersColumns";
import { cn } from "@/lib/utils";

type LeaderboardViewMode = "pretty" | "sheet" | "json";

type LeaderboardState = {
  rows: Record<string, unknown>[];
  raw: unknown[];
  metricName: string;
  timePeriod: string;
  category: string;
  querySummary: string;
};

const SHEET_COLUMNS = KALSHI_LIVE_LEADERBOARD_COLUMNS.map((c) => c.name);

function cellValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function resolveProfileImageUrl(path: unknown): string | null {
  const s = String(path || "").trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  // Kalshi returns keys like "galaxy" or "user-generated-0-…"; public CDN is:
  // https://kalshi-social-public.s3.amazonaws.com/profile-pictures/{key}.webp
  const key = s
    .replace(/^\/+/, "")
    .replace(/^profile-pictures\//i, "")
    .replace(/\.webp$/i, "");
  if (!key) return null;
  return `https://kalshi-social-public.s3.amazonaws.com/profile-pictures/${encodeURIComponent(key)}.webp`;
}

function nicknameInitial(nickname: string): string {
  const s = String(nickname || "").trim();
  if (!s) return "?";
  return s.slice(0, 1).toUpperCase();
}

function formatLeaderboardValue(
  value: unknown,
  metricName: string,
): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  const compact = formatKalshiLiveTraderMetricCompact(n);
  if (!compact) return "—";
  if (metricName === "projected_pnl" || metricName === "dollars_traded") {
    return n < 0 ? `-$${compact.replace(/^-/, "")}` : `$${compact}`;
  }
  if (metricName === "projected_roi") {
    const pct = Math.abs(n) <= 5 ? n * 100 : n;
    const sign = pct < 0 ? "-" : "";
    return `${sign}${Math.abs(pct).toFixed(1)}%`;
  }
  return compact;
}

function metricLabel(metricName: string): string {
  return (
    KALSHI_LIVE_LEADERBOARD_METRIC_OPTIONS.find((o) => o.value === metricName)
      ?.label || metricName
  );
}

function periodLabel(timePeriod: string): string {
  return (
    KALSHI_LIVE_LEADERBOARD_TIME_PERIOD_OPTIONS.find(
      (o) => o.value === timePeriod,
    )?.label || timePeriod
  );
}

function SheetTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse gap-3">
          <div className="h-3 w-8 rounded bg-muted" />
          <div className="h-3 flex-1 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function PrettyListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-3 py-2.5"
        >
          <div className="h-4 w-6 rounded bg-muted" />
          <div className="size-9 rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-muted" />
            <div className="h-2.5 w-1/4 rounded bg-muted" />
          </div>
          <div className="h-3 w-14 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

type HubKalshiLiveBonusLeaderboardsProps = {
  className?: string;
};

/**
 * Bonus Features — Leaderboards panel.
 * Pulls the same social leaderboard endpoint as the dashboard, with category
 * tag filters and pretty / sheet / JSON views.
 */
export function HubKalshiLiveBonusLeaderboards({
  className,
}: HubKalshiLiveBonusLeaderboardsProps) {
  const [metricName, setMetricName] = useState(KALSHI_LIVE_LEADERBOARD_DEFAULT_METRIC);
  const [timePeriod, setTimePeriod] = useState(
    KALSHI_LIVE_LEADERBOARD_DEFAULT_TIME_PERIOD,
  );
  const [category, setCategory] = useState("");
  const [viewMode, setViewMode] = useState<LeaderboardViewMode>("pretty");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LeaderboardState | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const loadLeaderboard = useCallback(
    async (opts?: {
      metricName?: string;
      timePeriod?: string;
      category?: string;
    }) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const requestId = ++requestIdRef.current;

      const nextMetric = normalizeKalshiLiveLeaderboardMetric(
        opts?.metricName ?? metricName,
      );
      const nextPeriod = normalizeKalshiLiveLeaderboardTimePeriod(
        opts?.timePeriod ?? timePeriod,
      );
      const nextCategory = String(
        opts?.category !== undefined ? opts.category : category,
      ).trim();

      setLoading(true);
      setError(null);

      try {
        const result = await fetchKalshiLiveLeaderboardPull({
          metricName: nextMetric,
          timePeriod: nextPeriod,
          category: nextCategory,
          limit: KALSHI_LIVE_LEADERBOARD_LIMIT_DEFAULT,
          signal: ac.signal,
        });

        if (requestId !== requestIdRef.current) return;

        setData({
          rows: result.rows as Record<string, unknown>[],
          raw: result.raw,
          metricName: result.metricName,
          timePeriod: result.timePeriod,
          category: result.category,
          querySummary: result.querySummary,
        });
      } catch (e) {
        if (
          ac.signal.aborted ||
          (e instanceof DOMException && e.name === "AbortError")
        ) {
          return;
        }
        if (requestId !== requestIdRef.current) return;
        setError(
          e instanceof Error ? e.message : "Failed to load leaderboard.",
        );
        setData(null);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [category, metricName, timePeriod],
  );

  useEffect(() => {
    void loadLeaderboard();
    return () => {
      abortRef.current?.abort();
    };
    // Initial pull only — subsequent pulls are driven by filter handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMetricChange = useCallback(
    (value: string) => {
      const next = normalizeKalshiLiveLeaderboardMetric(value);
      setMetricName(next);
      void loadLeaderboard({ metricName: next });
    },
    [loadLeaderboard],
  );

  const handlePeriodChange = useCallback(
    (value: string) => {
      const next = normalizeKalshiLiveLeaderboardTimePeriod(value);
      setTimePeriod(next);
      void loadLeaderboard({ timePeriod: next });
    },
    [loadLeaderboard],
  );

  const handleCategoryChange = useCallback(
    (value: string) => {
      const next = value === "__any__" ? "" : value;
      setCategory(next);
      void loadLeaderboard({ category: next });
    },
    [loadLeaderboard],
  );

  const activeMetric = data?.metricName || metricName;
  const activePeriod = data?.timePeriod || timePeriod;
  const rowCount = data?.rows.length ?? 0;

  const categoryChips = useMemo(
    () => [
      { value: "__any__", label: "All" },
      ...KALSHI_LIVE_SERIES_CATEGORY_OPTIONS.map((c) => ({
        value: c.value,
        label: c.label,
      })),
    ],
    [],
  );

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      <div className="rounded-xl border border-border/70 bg-muted/15 px-4 py-3.5 sm:px-5">
        <p className="text-sm font-medium text-foreground">
          What is the Kalshi leaderboard?
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
          Kalshi’s public social leaderboard ranks traders by metrics like projected
          PnL, volume, ROI, and markets traded over a chosen window. Optionally
          narrow by market category—the same category tags used elsewhere in Kalshi
          Live—to see who’s leading in elections, sports, crypto, and more.
        </p>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Rank order
            </Label>
            <Select
              value={normalizeKalshiLiveLeaderboardMetric(metricName)}
              disabled={loading}
              onValueChange={handleMetricChange}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Rank by…" />
              </SelectTrigger>
              <SelectContent>
                {KALSHI_LIVE_LEADERBOARD_METRIC_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Time period
            </Label>
            <Select
              value={normalizeKalshiLiveLeaderboardTimePeriod(timePeriod)}
              disabled={loading}
              onValueChange={handlePeriodChange}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                {KALSHI_LIVE_LEADERBOARD_TIME_PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-muted-foreground">
            Category tags
          </Label>
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="tablist"
            aria-label="Leaderboard category"
          >
            {categoryChips.map((chip) => {
              const selected =
                chip.value === "__any__"
                  ? !category
                  : category === chip.value;
              return (
                <button
                  key={chip.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  disabled={loading}
                  onClick={() => handleCategoryChange(chip.value)}
                  className={cn(
                    "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium leading-tight transition-colors",
                    selected
                      ? "border-secondary/25 bg-secondary/10 text-secondary"
                      : "border-border/60 bg-background/80 text-muted-foreground hover:border-border hover:text-foreground",
                    loading && "opacity-60",
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex min-h-[22rem] flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/20">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Leaderboard
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {metricLabel(activeMetric)} · {periodLabel(activePeriod)}
              {data?.category ? ` · ${data.category}` : " · All categories"}
              {" · "}
              top {KALSHI_LIVE_LEADERBOARD_LIMIT_DEFAULT}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {loading ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Loading…
              </span>
            ) : data ? (
              <span className="text-xs text-muted-foreground">
                {rowCount} trader{rowCount === 1 ? "" : "s"}
              </span>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void loadLeaderboard()}
              className="h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground"
            >
              <RefreshCw
                className={cn("size-3.5", loading && "animate-spin")}
                aria-hidden
              />
              Refresh
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!data && !loading}
              onClick={() => setViewMode("pretty")}
              className={cn(
                "h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground",
                viewMode === "pretty" &&
                  "border-secondary/40 bg-secondary/10 text-foreground",
              )}
            >
              <Sparkles className="size-3.5" aria-hidden />
              Pretty
            </Button>

            <div
              className="inline-flex h-7 items-center rounded-md border border-border/70 bg-background p-0.5"
              role="group"
              aria-label="Leaderboard data view"
            >
              <button
                type="button"
                disabled={!data && !loading}
                onClick={() => {
                  if (viewMode === "pretty") {
                    setViewMode("sheet");
                    return;
                  }
                  setViewMode(viewMode === "json" ? "sheet" : "json");
                }}
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  (viewMode === "sheet" || viewMode === "json") &&
                    "bg-muted/60 text-foreground",
                )}
                aria-label={
                  viewMode === "pretty"
                    ? "Switch to data sheet"
                    : viewMode === "json"
                      ? "Switch to sheet view"
                      : "Switch to JSON view"
                }
              >
                {viewMode === "pretty" ? (
                  <>
                    <Table2 className="size-3.5" aria-hidden />
                    Data Sheet
                  </>
                ) : viewMode === "json" ? (
                  <>
                    <Table2 className="size-3.5" aria-hidden />
                    Sheet
                  </>
                ) : (
                  <>
                    <Braces className="size-3.5" aria-hidden />
                    JSON
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              Couldn’t load leaderboard
            </p>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
              {error}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void loadLeaderboard()}
            >
              Try again
            </Button>
          </div>
        ) : loading ? (
          viewMode === "pretty" ? (
            <PrettyListSkeleton />
          ) : (
            <SheetTableSkeleton />
          )
        ) : !data?.rows.length ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No rankings</p>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
              Kalshi returned an empty leaderboard for this metric, period, and
              category. Try another filter.
            </p>
          </div>
        ) : viewMode === "pretty" ? (
          <div className="max-h-[32rem] overflow-auto p-2 sm:p-3">
            <ul className="space-y-1.5">
              {data.rows.map((row, index) => {
                const rank = Number(row.rank);
                const nickname = String(row.nickname || "Anonymous").trim() || "Anonymous";
                const anonymous = Boolean(row.is_anonymous);
                const imageUrl = resolveProfileImageUrl(row.profile_image_path);
                const valueLabel = formatLeaderboardValue(row.value, activeMetric);
                const medal =
                  rank === 1
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : rank === 2
                      ? "bg-slate-400/15 text-slate-700 dark:text-slate-300"
                      : rank === 3
                        ? "bg-orange-500/15 text-orange-700 dark:text-orange-300"
                        : "bg-muted/60 text-muted-foreground";

                return (
                  <li
                    key={`${row.social_id || nickname}-${rank}-${index}`}
                    className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/70 px-3 py-2.5 transition-colors hover:bg-background"
                  >
                    <span
                      className={cn(
                        "inline-flex h-7 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
                        medal,
                      )}
                    >
                      {Number.isFinite(rank) ? rank : "—"}
                    </span>

                    <Avatar className="size-9 border border-border/50">
                      {imageUrl && !anonymous ? (
                        <AvatarImage src={imageUrl} alt="" />
                      ) : null}
                      <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                        {nicknameInitial(anonymous ? "?" : nickname)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {anonymous ? "Anonymous" : nickname}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {anonymous
                          ? "Hidden profile"
                          : row.social_id
                            ? String(row.social_id)
                            : metricLabel(activeMetric)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {valueLabel}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {metricLabel(activeMetric)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : viewMode === "json" ? (
          <div className="max-h-[32rem] overflow-auto px-3 py-3 font-mono text-[11px] leading-relaxed text-foreground sm:text-xs">
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(data.raw, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-max min-w-full border-collapse text-left text-[11px] sm:text-xs">
              <thead className="sticky top-0 z-[1] bg-muted/80 backdrop-blur">
                <tr className="border-b border-border/60">
                  {SHEET_COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground"
                    >
                      {getKalshiLiveLeaderboardColumnLabel(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, rowIndex) => (
                  <tr
                    key={`${row.social_id || row.nickname}-${row.rank}-${rowIndex}`}
                    className="border-b border-border/40 last:border-0"
                  >
                    {SHEET_COLUMNS.map((col) => (
                      <td
                        key={`${rowIndex}-${col}`}
                        className="max-w-[16rem] truncate whitespace-nowrap px-3 py-2 text-foreground"
                        title={cellValue(row[col])}
                      >
                        {cellValue(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
