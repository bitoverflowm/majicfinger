"use client";

import { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import {
  Loader2,
  Pause,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Radio,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { describeCandlePeriod } from "@/lib/liveFeeds/registry";

/**
 * @typedef {{
 *   id: string;
 *   status: "persisted" | "paused" | "ended";
 *   integration: string;
 *   endpoint: string;
 *   pollIntervalMs: number;
 *   dataSetId: string | null;
 *   projectName: string | null;
 *   sheetRowCount: number;
 *   lastPolledAt: string | null;
 *   lastSuccessAt: string | null;
 *   lastError: string | null;
 *   pollCount: number;
 *   successCount: number;
 *   errorCount: number;
 *   successRate: number | null;
 *   candlesReceivedTotal: number;
 *   candlesAddedTotal: number;
 *   candlesUpdatedTotal: number;
 *   lastTickStats: object | null;
 *   eventTicker: string | null;
 *   seriesTicker: string | null;
 *   periodInterval: number | null;
 *   endedReason: string | null;
 * }} SavedLiveFeedRow
 */

function formatPollInterval(ms) {
  const n = Math.floor(Number(ms)) || 0;
  if (n >= 86_400_000) return `every ${Math.round(n / 86_400_000)}d`;
  if (n >= 3_600_000) return `every ${Math.round(n / 3_600_000)}h`;
  if (n >= 60_000) return `every ${Math.round(n / 60_000)}m`;
  if (n >= 1000) return `every ${Math.round(n / 1000)}s`;
  return "—";
}

function statusBadge(status) {
  if (status === "persisted") {
    return <Badge className="h-5 bg-emerald-500/15 px-1.5 text-[10px] text-emerald-800 dark:text-emerald-200">Live</Badge>;
  }
  if (status === "paused") {
    return <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Paused</Badge>;
  }
  return <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Stopped</Badge>;
}

function formatWhen(raw) {
  if (!raw) return "—";
  const m = moment(raw);
  return m.isValid() ? m.format("ddd MMM D h:mm a") : "—";
}

/** Hide infra / Mongo details from the UI. */
function looksLikeInternalError(msg) {
  const s = String(msg || "").toLowerCase();
  if (!s) return false;
  return /mongodb|mongo|mongoose|econnrefused|etimedout|enotfound|cluster|srv\b|tls|ssl|buffering timed out|topology|server selection|connection.*refused|could not connect/.test(
    s,
  );
}

/**
 * @param {Response} res
 * @param {{ message?: string; code?: string } | null | undefined} body
 * @param {string} fallback
 */
function userFacingFeedError(res, body, fallback) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "Issue connecting to your data. Check your internet connection and try again.";
  }
  if (res.status === 401) return "Sign in to manage your live feeds.";
  if (body?.code === "connection_error" || res.status >= 500) {
    return "Issue connecting to your data. Check your internet connection and try again.";
  }
  const raw = String(body?.message || "").trim();
  if (!raw || looksLikeInternalError(raw)) {
    return fallback;
  }
  // Allow short, intentional API messages (e.g. "Stopped feeds must be restarted.")
  if (raw.length > 140 || /at\s+\S+\s+\(|Error:|stack/i.test(raw)) {
    return fallback;
  }
  return raw;
}

function userFacingFeedLastError(raw) {
  if (!raw) return null;
  if (looksLikeInternalError(raw)) {
    return "Issue connecting to your data. Check your internet connection and try again.";
  }
  const s = String(raw).trim();
  return s.length > 160 ? `${s.slice(0, 157)}…` : s;
}

/**
 * Background (cron) live feeds for Your Saved Work.
 * @param {{ open?: boolean }} props
 */
export function SavedLiveFeedsPanel({ open = true }) {
  const [feeds, setFeeds] = useState(/** @type {SavedLiveFeedRow[]} */ ([]));
  const [counts, setCounts] = useState({ total: 0, live: 0, paused: 0, ended: 0 });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(/** @type {string | null} */ (null));
  const [busyId, setBusyId] = useState(/** @type {string | null} */ (null));
  const [deleteTarget, setDeleteTarget] = useState(/** @type {SavedLiveFeedRow | null} */ (null));

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/live-feeds", { credentials: "include" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) {
        const msg = userFacingFeedError(
          res,
          j,
          "Issue connecting to your data. Check your internet connection and try again.",
        );
        setFeeds([]);
        setCounts({ total: 0, live: 0, paused: 0, ended: 0 });
        setLoadError(msg);
        return;
      }
      setFeeds(Array.isArray(j.feeds) ? j.feeds : []);
      setCounts(j.counts || { total: 0, live: 0, paused: 0, ended: 0 });
    } catch {
      setFeeds([]);
      setCounts({ total: 0, live: 0, paused: 0, ended: 0 });
      setLoadError(
        "Issue connecting to your data. Check your internet connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const runAction = async (feed, action) => {
    setBusyId(feed.id);
    try {
      const res = await fetch(`/api/live-feeds/${encodeURIComponent(feed.id)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) {
        toast.error(
          userFacingFeedError(res, j, `Couldn't ${action} this live feed. Try again.`),
        );
        return;
      }
      if (action === "delete") {
        setFeeds((prev) => prev.filter((f) => f.id !== feed.id));
        setCounts((c) => ({
          ...c,
          total: Math.max(0, c.total - 1),
          live: feed.status === "persisted" ? Math.max(0, c.live - 1) : c.live,
          paused: feed.status === "paused" ? Math.max(0, c.paused - 1) : c.paused,
          ended: feed.status === "ended" ? Math.max(0, c.ended - 1) : c.ended,
        }));
        toast.success("Live feed deleted");
      } else {
        toast.success(
          action === "pause"
            ? "Live feed paused"
            : action === "resume"
              ? "Live feed resumed"
              : action === "stop"
                ? "Live feed stopped"
                : "Live feed restarted",
        );
        await load();
      }
    } catch {
      toast.error("Issue connecting to your data. Check your internet connection and try again.");
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="mb-4 space-y-2 rounded-lg border border-border bg-card/40 p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Radio className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Background live feeds
          </div>
          <p className="text-[11px] text-muted-foreground">
            Saved cron feeds only — not browser-only live sessions.
          </p>
        </div>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => void load()}
                disabled={loading}
                aria-label="Refresh live feeds"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Refresh live feeds</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {!loading && counts.total > 0 ? (
        <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
          <span>{counts.live} live</span>
          <span>·</span>
          <span>{counts.paused} paused</span>
          <span>·</span>
          <span>{counts.ended} stopped</span>
        </div>
      ) : null}

      {loading && !feeds.length ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {!loading && loadError ? (
        <p className="py-2 text-xs text-muted-foreground">{loadError}</p>
      ) : null}

      {!loading && !loadError && feeds.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">No feeds found.</p>
      ) : null}

      <ul className="space-y-2">
        {feeds.map((feed) => {
          const busy = busyId === feed.id;
          const candleLabel =
            feed.periodInterval != null ? describeCandlePeriod(feed.periodInterval) : null;
          const title =
            feed.eventTicker ||
            `${feed.integration}/${feed.endpoint}`;
          return (
            <li
              key={feed.id}
              className="rounded-md border border-border/80 bg-background/60 p-3"
            >
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-medium">{title}</span>
                    {statusBadge(feed.status)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {feed.projectName || "Untitled project"}
                    {" · "}
                    {feed.endpoint.replace(/_/g, " ")}
                    {candleLabel ? ` · ${candleLabel} candles` : ""}
                    {" · "}
                    {formatPollInterval(feed.pollIntervalMs)}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] tabular-nums text-muted-foreground">
                    <span>
                      Success{" "}
                      {feed.successRate != null
                        ? `${feed.successRate}%`
                        : "—"}{" "}
                      ({feed.successCount}/{feed.pollCount}
                      {feed.errorCount > 0 ? `, ${feed.errorCount} err` : ""})
                    </span>
                    <span>
                      Pulled +{feed.candlesAddedTotal} new / {feed.candlesUpdatedTotal} upserted
                      {feed.sheetRowCount > 0 ? ` · ${feed.sheetRowCount} rows on sheets` : ""}
                    </span>
                    <span>Last ok: {formatWhen(feed.lastSuccessAt)}</span>
                    <span>Last poll: {formatWhen(feed.lastPolledAt)}</span>
                  </div>
                  {userFacingFeedLastError(feed.lastError) ? (
                    <p className="text-[11px] text-destructive">
                      {userFacingFeedLastError(feed.lastError)}
                    </p>
                  ) : null}
                  {feed.status === "ended" && feed.endedReason ? (
                    <p className="text-[11px] text-muted-foreground">
                      Ended: {String(feed.endedReason).replace(/_/g, " ")}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {feed.status === "paused" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    disabled={busy}
                    onClick={() => void runAction(feed, "resume")}
                  >
                    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                    Play
                  </Button>
                ) : feed.status === "persisted" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    disabled={busy}
                    onClick={() => void runAction(feed, "pause")}
                  >
                    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3" />}
                    Pause
                  </Button>
                ) : null}

                {feed.status !== "ended" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    disabled={busy}
                    onClick={() => void runAction(feed, "stop")}
                  >
                    <Square className="h-3 w-3" />
                    Stop
                  </Button>
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  disabled={busy}
                  onClick={() => void runAction(feed, "restart")}
                >
                  <RotateCcw className="h-3 w-3" />
                  Restart
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                  disabled={busy}
                  onClick={() => setDeleteTarget(feed)}
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete live feed?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes this background feed from cron and project stamps. Sheet data stays; you
              won&apos;t be able to resume this feed without starting live again and saving.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!busyId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!busyId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) void runAction(deleteTarget, "delete");
              }}
            >
              {busyId ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
