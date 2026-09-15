"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, Loader2, RefreshCw, Undo2 } from "lucide-react";

import { PolymarketLiveSearch } from "@/components/connectData/polymarketLive/PolymarketLiveSearch";
import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { HubKalshiLiveDemoTradesLiveline } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoTradesLiveline";
import {
  featuredPolymarketMarketToDemoMarket,
  useHubPolymarketLiveDemo,
  type HubPolymarketLiveDemoMarket,
} from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveDemoSelection";
import {
  polymarketRealtimeMarketFromSuggestion,
  polymarketRealtimeMarketKey,
  polymarketRealtimeMarketsFromEventSuggestion,
} from "@/lib/polymarketLive/polymarketRealtimeCompose";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchKalshiLiveMarket } from "@/lib/kalshiLive/fetchKalshiLiveMarket";
import { impliedChancePctFromMarketRow } from "@/lib/kalshiLive/eventCandlesticksPowerMove";
import { openPolymarketLastTradeSocket } from "@/lib/polymarketLive/openPolymarketMarketSocket";
import { normalizePolymarketRealtimeHistoryRows } from "@/lib/polymarketLive/polymarketRealtimeSeed";
import {
  findKalshiLiveMatchesForPolymarket,
  matchTierLabel,
  polymarketOutcomeShape,
} from "@/lib/predictionMarkets/matchPolymarketToKalshiLive";
import { findPolymarketLiveMatchesForKalshi } from "@/lib/predictionMarkets/matchKalshiToPolymarketLive";
import { trackPolymarketLiveHubEvent } from "@/lib/analytics/polymarketLiveHubEvents";
import {
  formatPolymarketVolume,
} from "@/lib/polymarketLive/polymarketPublicSearch";
import { cn } from "@/lib/utils";
import {
  COMPARE_FEATURED_LIMIT,
  CompareFeaturedSkeletonList,
} from "@/components/hubs/polymarketLiveDemo/HubPolymarketKalshiCompareDemoSkeleton";

type CompareFeaturedCard = {
  id: string;
  slug?: string;
  conditionId: string;
  title: string;
  volume24h: number | null;
  featured?: boolean;
  imageUrl?: string;
  tags?: string[];
  eventTitle?: string;
  outcomes: { tokenId: string; outcome: string; lastPrice: number | null }[];
};

type CompareKalshiFeaturedCard = {
  ticker: string;
  title: string;
  lastPriceDollars: number | null;
  volume24h: number | null;
  imageUrl?: string;
  featured?: boolean;
  status?: string;
  tags?: string[];
  eventTitle?: string;
  seriesTicker?: string;
};

type PinnedKalshiFeatured = {
  ticker: string;
  title: string;
  eventTitle?: string;
  seriesTicker?: string;
  lastPriceDollars?: number | null;
  volume24h?: number | null;
  status?: string;
  tags?: string[];
  imageUrl?: string;
};

function marketImageUrl(
  ...sources: Array<Record<string, unknown> | null | undefined>
): string {
  for (const src of sources) {
    if (!src) continue;
    const url = String(
      src.imageUrl ||
        src.image_url ||
        src.icon ||
        src.image ||
        src.featuredImage ||
        src.featured_image_url ||
        "",
    ).trim();
    if (url) return url;
  }
  return "";
}

function compareFeaturedKey(market: CompareFeaturedCard) {
  return String(market.conditionId || market.id || market.slug || "").trim();
}

function formatCompareFeaturedPrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}¢`;
}

function formatCompareCompactNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return String(Math.round(value));
  }
}

function formatCompareKalshiVolume(value: number | null | undefined) {
  const formatted = formatCompareCompactNumber(value);
  return formatted === "—" ? "—" : `$${formatted}`;
}

function shuffleCompareFeatured<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = current;
  }
  return copy.slice(0, count);
}

function normalizeCompareFeaturedCard(raw: unknown): CompareFeaturedCard | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const outcomesRaw = Array.isArray(row.outcomes) ? row.outcomes : [];
  const outcomes = outcomesRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const outcome = item as Record<string, unknown>;
      const tokenId = String(outcome.tokenId || "").trim();
      if (!tokenId) return null;
      return {
        tokenId,
        outcome: String(outcome.outcome || "").trim() || "Outcome",
        lastPrice:
          outcome.lastPrice != null && Number.isFinite(Number(outcome.lastPrice))
            ? Number(outcome.lastPrice)
            : null,
      };
    })
    .filter(Boolean) as CompareFeaturedCard["outcomes"];
  const id = String(row.id || row.conditionId || row.slug || "").trim();
  const title = String(row.title || "").trim() || id;
  if (!id || !title || outcomes.length < 1) return null;
  return {
    id,
    slug: String(row.slug || "").trim() || undefined,
    conditionId: String(row.conditionId || id).trim(),
    title,
    volume24h:
      row.volume24h != null && Number.isFinite(Number(row.volume24h))
        ? Number(row.volume24h)
        : null,
    featured: row.featured === true,
    imageUrl: String(row.imageUrl || "").trim() || undefined,
    tags: Array.isArray(row.tags)
      ? row.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 4)
      : [],
    eventTitle: String(row.eventTitle || "").trim() || undefined,
    outcomes,
  };
}

function normalizeCompareKalshiFeaturedCard(raw: unknown): CompareKalshiFeaturedCard | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const ticker = String(row.ticker || "").trim().toUpperCase();
  const title = String(row.title || row.subtitle || ticker).trim() || ticker;
  if (!ticker || !title) return null;
  return {
    ticker,
    title,
    lastPriceDollars:
      row.lastPriceDollars != null && Number.isFinite(Number(row.lastPriceDollars))
        ? Number(row.lastPriceDollars)
        : null,
    volume24h:
      row.volume24h != null && Number.isFinite(Number(row.volume24h))
        ? Number(row.volume24h)
        : null,
    imageUrl: String(row.imageUrl || "").trim() || undefined,
    featured: row.featured === true,
    status: String(row.status || "").trim() || undefined,
    eventTitle: String(row.eventTitle || "").trim() || undefined,
    seriesTicker: String(row.seriesTicker || "").trim().toUpperCase() || undefined,
    tags: Array.isArray(row.tags)
      ? row.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 4)
      : [],
  };
}

type IntervalId = "15m" | "1h" | "6h" | "1d" | "all";

/** Kalshi brand green / Polymarket brand blue for compare chrome and charts. */
const KALSHI_GREEN = "#28CC95";
const POLYMARKET_BLUE = "#2E5CFF";
const KALSHI_LINE_GREEN = KALSHI_GREEN;
const INTERVALS: { id: IntervalId; label: "15m" | "1h" | "6h" | "1d" | "All"; ms: number | null }[] = [
  { id: "15m", label: "15m", ms: 15 * 60 * 1000 },
  { id: "1h", label: "1h", ms: 60 * 60 * 1000 },
  { id: "6h", label: "6h", ms: 6 * 60 * 60 * 1000 },
  { id: "1d", label: "1d", ms: 24 * 60 * 60 * 1000 },
  { id: "all", label: "All", ms: null },
];

function CompareFieldSkeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block h-3 animate-pulse rounded bg-muted/70 align-middle", className)}
      aria-hidden
    />
  );
}

function ComparePendingValue({
  pending,
  children,
  skeletonClassName = "w-20",
}: {
  pending: boolean;
  children: ReactNode;
  skeletonClassName?: string;
}) {
  if (pending) return <CompareFieldSkeleton className={skeletonClassName} />;
  return children;
}

function CompareChartSkeleton({ animate = true }: { animate?: boolean }) {
  const pulse = animate ? "animate-pulse" : "";
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 px-3 py-3" aria-hidden>
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex w-10 shrink-0 flex-col justify-between py-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={cn("h-2.5 w-full rounded bg-muted/70", pulse)} />
          ))}
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-border/40 bg-muted/15">
          <div className="absolute inset-x-0 top-[20%] h-px bg-border/40" />
          <div className="absolute inset-x-0 top-[40%] h-px bg-border/40" />
          <div className="absolute inset-x-0 top-[60%] h-px bg-border/40" />
          <div className="absolute inset-x-0 top-[80%] h-px bg-border/40" />
          <div className={cn("absolute inset-[18%_8%_22%_6%] rounded-full bg-muted/50", pulse)} />
          <div className={cn("absolute inset-[42%_12%_28%_10%] rounded-full bg-muted/40", pulse)} />
        </div>
      </div>
      <div className="flex gap-2 pl-12">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn("h-2.5 flex-1 rounded bg-muted/60", pulse)} />
        ))}
      </div>
    </div>
  );
}

function CompareChartBody({
  pending,
  hasData,
  waitingMessage,
  children,
}: {
  pending: boolean;
  hasData: boolean;
  waitingMessage?: string;
  children: ReactNode;
}) {
  if (hasData) return children;
  if (pending) return <CompareChartSkeleton />;
  return (
    <div className="relative h-full min-h-0">
      <CompareChartSkeleton animate={false} />
      {waitingMessage ? (
        <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted-foreground">
          {waitingMessage}
        </p>
      ) : null}
    </div>
  );
}

function yesTokenId(market: Record<string, unknown> | null): string {
  if (!market) return "";
  const pairs = Array.isArray(market.outcomePairs)
    ? (market.outcomePairs as Array<{ tokenId?: string; outcome?: string }>)
    : [];
  if (pairs.length) {
    const yes = pairs.find((p) => String(p.outcome || "").toLowerCase() === "yes");
    if (yes?.tokenId) return String(yes.tokenId).trim();
    if (pairs[0]?.tokenId) return String(pairs[0].tokenId).trim();
  }
  const outcomes = Array.isArray(market.outcomes) ? market.outcomes.map(String) : [];
  const tokens = Array.isArray(market.tokenIds) ? market.tokenIds.map(String) : [];
  const yesIdx = outcomes.findIndex((o) => o.toLowerCase() === "yes");
  if (yesIdx >= 0 && tokens[yesIdx]) return tokens[yesIdx];
  return tokens[0] || "";
}

function polyConditionId(market: Record<string, unknown> | null): string {
  if (!market) return "";
  const fromField = String(market.conditionId || "").trim();
  if (fromField) return fromField;
  const id = String(market.id || "").trim();
  return /^0x[a-fA-F0-9]{64}$/.test(id) ? id : "";
}

function parseTs(row: Record<string, unknown>): number | null {
  const raw = row.created_time ?? row.time ?? row.timestamp ?? row.created_ts ?? row.ts ?? row.t;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw > 1e12 ? raw : raw * 1000;
  }
  const asNum = Number(raw);
  // Epoch seconds/ms often arrive as numeric strings ("1712345678") — Date.parse fails on those.
  if (Number.isFinite(asNum) && asNum > 0 && String(raw).trim() !== "") {
    const rawStr = String(raw).trim();
    if (/^\d+(\.\d+)?$/.test(rawStr)) {
      return asNum > 1e12 ? asNum : asNum * 1000;
    }
  }
  const ms = Date.parse(String(raw || "").trim());
  return Number.isFinite(ms) ? ms : null;
}

function toPctPoint(row: Record<string, unknown>, platform: string): Record<string, unknown> | null {
  const ts = parseTs(row);
  if (ts == null) return null;
  const priceRaw =
    row.yes_price_dollars ?? row.price ?? row.last_price_dollars ?? row.yes_price;
  const price = Number(priceRaw);
  if (!Number.isFinite(price)) return null;
  // Dollars (0–1) → %, cents/already-% (0–100) stay as %.
  const pct = price <= 1.5 ? price * 100 : price;
  if (pct < 0 || pct > 100) return null;
  return {
    ...row,
    created_time: new Date(ts).toISOString(),
    time: new Date(ts).toISOString(),
    timestamp: String(ts),
    yes_price_dollars: pct / 100,
    price: pct / 100,
    _platform: platform,
    _probability_pct: pct,
  };
}

function mergePctPoints(
  prev: Record<string, unknown>[],
  next: Record<string, unknown>[],
  max = 2000,
): Record<string, unknown>[] {
  const byKey = new Map<string, Record<string, unknown>>();
  for (const row of [...prev, ...next]) {
    const key = [
      String(row.created_time || row.timestamp || ""),
      String(row.price ?? ""),
      String(row.size ?? ""),
      String(row.transaction_hash ?? row.transactionHash ?? ""),
    ].join("|");
    if (!key.replace(/\|/g, "")) continue;
    byKey.set(key, row);
  }
  return [...byKey.values()]
    .sort((a, b) => (parseTs(a) || 0) - (parseTs(b) || 0))
    .slice(-max);
}

function polymarketTradeToPoint(
  row: Record<string, unknown>,
  tokenId: string,
): Record<string, unknown> | null {
  const asset = String(row.asset || row.asset_id || "").trim();
  if (asset && tokenId && asset !== tokenId) return null;
  return toPctPoint(
    {
      ...row,
      asset_id: asset || tokenId,
      created_time: row.created_time || row.timestamp || row.time,
      transaction_hash: row.transaction_hash ?? row.transactionHash ?? "",
    },
    "Polymarket",
  );
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function formatMatchScore(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return "—";
  return `${Math.round(Math.max(0, Math.min(1, score)) * 100)}% match`;
}

type YesNoLabels = {
  yes: string;
  no: string;
  named: boolean;
};

function polymarketYesNoLabels(market: Record<string, unknown> | null | undefined): YesNoLabels {
  const pairs = Array.isArray(market?.outcomePairs)
    ? (market?.outcomePairs as Array<{ outcome?: string }>)
        .map((row) => String(row?.outcome || "").trim())
        .filter(Boolean)
    : [];
  const outcomes = Array.isArray(market?.outcomes)
    ? market.outcomes.map((row) => String(row || "").trim()).filter(Boolean)
    : [];
  const labels = pairs.length ? pairs : outcomes;
  const yesIdx = labels.findIndex((label) => label.toLowerCase() === "yes");
  const noIdx = labels.findIndex((label) => label.toLowerCase() === "no");
  if (yesIdx >= 0 && noIdx >= 0) {
    return { yes: labels[yesIdx] || "Yes", no: labels[noIdx] || "No", named: false };
  }
  if (labels.length >= 2) {
    return { yes: labels[0]!, no: labels[1]!, named: true };
  }
  if (labels.length === 1) {
    return { yes: labels[0]!, no: `Not ${labels[0]}`, named: true };
  }
  return { yes: "Yes", no: "No", named: false };
}

function opponentFromVsTitle(title: string, yesName: string): string {
  const vs = title.match(/(.+?)\s+vs\.?\s+(.+?)(?:\s+[—–-]|$)/i);
  if (!vs) return "";
  const left = String(vs[1] || "").trim();
  const right = String(vs[2] || "").trim();
  const yesKey = yesName.toLowerCase();
  const leftKey = left.toLowerCase();
  const rightKey = right.toLowerCase();
  if (rightKey && (yesKey.includes(rightKey) || rightKey.includes(yesKey))) return left;
  if (leftKey && (yesKey.includes(leftKey) || leftKey.includes(yesKey))) return right;
  return "";
}

function isKalshiStrikeSubtitle(text: string): boolean {
  const value = text.trim();
  if (!value) return false;
  return (
    /target\s*price|strike|^\$?\d[\d,]*(?:\.\d+)?$/i.test(value) ||
    /^tbd$/i.test(value)
  );
}

function kalshiYesNoLabels(
  market: Record<string, unknown> | null | undefined,
  fallbackTitle?: string,
): YesNoLabels {
  const yesSubRaw = String(
    market?.yes_sub_title || market?.yes_subtitle || market?.yesSubtitle || "",
  ).trim();
  const noSubRaw = String(
    market?.no_sub_title || market?.no_subtitle || market?.noSubtitle || "",
  ).trim();
  const yesSub = isKalshiStrikeSubtitle(yesSubRaw) ? "" : yesSubRaw;
  const noSub = isKalshiStrikeSubtitle(noSubRaw) ? "" : noSubRaw;
  const title = String(market?.title || fallbackTitle || "").trim();
  const distinctNo = noSub && noSub.toLowerCase() !== yesSub.toLowerCase() ? noSub : "";
  if (yesSub) {
    const vsNo =
      opponentFromVsTitle(title, yesSub) || opponentFromVsTitle(fallbackTitle || "", yesSub);
    return {
      yes: yesSub,
      no: distinctNo || (vsNo ? `${vsNo} wins` : `Not: ${yesSub}`),
      named: true,
    };
  }
  if (title) {
    const parts = title.split(/\s[—–-]\s/).map((part) => part.trim()).filter(Boolean);
    const yesFromTitle = (parts.length > 1 ? parts[parts.length - 1] : title).replace(/\?\s*$/, "");
    if (/\?$/.test(title) || /\bup\b|\bdown\b/i.test(yesFromTitle)) {
      const noFromUp = yesFromTitle.replace(/\bup\b/i, "down");
      return {
        yes: yesFromTitle,
        no: noFromUp !== yesFromTitle ? noFromUp : "No",
        named: true,
      };
    }
    const noFromWin = yesFromTitle.replace(/\bwins?\??$/i, "does not win");
    return {
      yes: yesFromTitle,
      no: noFromWin !== yesFromTitle ? noFromWin : `No — ${yesFromTitle}`,
      named: !/^(yes|no)$/i.test(yesFromTitle),
    };
  }
  return { yes: "Yes", no: "No", named: false };
}

function outcomeCompareKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(wins?|will|the|a|an|yes|no|price|up|down)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function yesOutcomesLikelySame(parentYes: string, childYes: string): boolean {
  const parent = outcomeCompareKey(parentYes);
  const child = outcomeCompareKey(childYes);
  if (!parent || !child) return true;
  if (parent === child) return true;
  if (parent.includes(child) || child.includes(parent)) return true;
  const parentTokens = new Set(parent.split(" ").filter((token) => token.length > 2));
  const childTokens = new Set(child.split(" ").filter((token) => token.length > 2));
  if (!parentTokens.size || !childTokens.size) return true;
  let overlap = 0;
  for (const token of parentTokens) if (childTokens.has(token)) overlap += 1;
  return overlap > 0;
}

function formatAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  const sec = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function filterByInterval(
  rows: Record<string, unknown>[],
  interval: IntervalId,
): Record<string, unknown>[] {
  const spec = INTERVALS.find((item) => item.id === interval);
  if (!spec?.ms) return rows;
  const cutoff = Date.now() - spec.ms;
  return rows.filter((row) => {
    const ts = parseTs(row);
    return ts != null && ts >= cutoff;
  });
}

function isOpaqueHttpErrorMessage(raw: string): boolean {
  const msg = String(raw || "")
    .trim()
    .toLowerCase();
  return (
    !msg ||
    msg.includes("bad request") ||
    msg.includes("bad_request") ||
    msg.includes("not found") ||
    msg.includes("not_found") ||
    msg.includes("internal server error") ||
    msg.includes("invalid_parameters") ||
    msg.includes("field validation") ||
    msg.includes("not valid")
  );
}

function taggedError(message: string, code: string, status?: number): Error {
  const err = new Error(message);
  Object.assign(err, { code, status });
  return err;
}

function humanizeMatchError(raw: string, side: "kalshi" | "polymarket" = "kalshi"): string {
  const other = side === "kalshi" ? "Kalshi" : "Polymarket";
  const origin = side === "kalshi" ? "Polymarket" : "Kalshi";
  if (/too many requests|rate limit/i.test(raw)) {
    return `${other} search is rate-limited. Wait a moment, then try again or search ${other} manually.`;
  }
  if (isOpaqueHttpErrorMessage(raw) || /failed to fetch|network|search failed/i.test(raw)) {
    return `We couldn’t search ${other} for a matching market. Search ${other} manually, or try another ${origin} market.`;
  }
  return raw;
}

function humanizeSeriesError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || "");
  const extra = err && typeof err === "object" ? (err as { code?: string; status?: number }) : {};
  const code = String(extra.code || "");
  const status = Number(extra.status);
  if (/too many requests|rate limit/i.test(raw)) {
    return "Kalshi data is rate-limited. Wait a moment, then try again.";
  }
  if (
    code === "polymarket_history" ||
    code === "polymarket_trades" ||
    /this polymarket market has no yes token/i.test(raw)
  ) {
    if (/no YES token/i.test(raw)) return raw;
    return "This Polymarket market does not exist (or could not be loaded). Pick another Polymarket market.";
  }
  if (
    isOpaqueHttpErrorMessage(raw) ||
    status === 400 ||
    status === 404 ||
    /not found|not_found|does not exist|no market/i.test(raw)
  ) {
    return "This Kalshi market does not exist (or is no longer listed). Search Kalshi manually to pick another.";
  }
  return raw || "Failed to load comparison series";
}

const POLY_TRADE_HISTORY_LIMIT = 1000;

async function fetchPolymarketClobHistory(
  tokenId: string,
  opts: { interval: string; fidelity: number },
  signal: AbortSignal,
): Promise<Record<string, unknown>[]> {
  const res = await fetch("/api/integrations/polymarket?query=getBatchPricesHistory", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      markets: [tokenId],
      interval: opts.interval,
      fidelity: opts.fidelity,
    }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw taggedError(
      typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.error === "string"
          ? payload.error
          : "Failed to load Polymarket history",
      "polymarket_history",
      res.status,
    );
  }
  const rows = normalizePolymarketRealtimeHistoryRows(payload);
  const forToken = rows.filter(
    (row) => !row.asset_id || String(row.asset_id) === tokenId,
  );
  return forToken.length ? forToken : rows;
}

async function fetchPolymarketPricesHistory(
  tokenId: string,
  signal: AbortSignal,
): Promise<Record<string, unknown>[]> {
  // 1-minute CLOB bars fill the liveline the way Kalshi trade prints do.
  // `max` (hourly) covers older archive if the market is longer-lived.
  const [minuteResult, archiveResult] = await Promise.allSettled([
    fetchPolymarketClobHistory(tokenId, { interval: "1d", fidelity: 1 }, signal),
    fetchPolymarketClobHistory(tokenId, { interval: "max", fidelity: 60 }, signal),
  ]);
  if (signal.aborted) return [];

  let minuteRows =
    minuteResult.status === "fulfilled" ? minuteResult.value : [];
  if (!minuteRows.length && !signal.aborted) {
    minuteRows = await fetchPolymarketClobHistory(
      tokenId,
      { interval: "1h", fidelity: 1 },
      signal,
    );
  }
  const archiveRows = archiveResult.status === "fulfilled" ? archiveResult.value : [];
  const merged = [...archiveRows, ...minuteRows];
  if (merged.length) return merged;
  if (minuteResult.status === "rejected") throw minuteResult.reason;
  return [];
}

async function fetchPolymarketTrades(
  conditionId: string,
  tokenId: string,
  signal: AbortSignal,
): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    query: "getTradesByMarket",
    market: conditionId,
    limit: String(POLY_TRADE_HISTORY_LIMIT),
    takerOnly: "false",
    skipFlatten: "true",
  });
  const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw taggedError(
      typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.error === "string"
          ? payload.error
          : "Failed to load Polymarket trades",
      "polymarket_trades",
      res.status,
    );
  }
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { trades?: unknown[] })?.trades)
      ? (payload as { trades: unknown[] }).trades
      : [];
  return rows.filter((row): row is Record<string, unknown> => {
    if (!row || typeof row !== "object") return false;
    const asset = String(
      (row as Record<string, unknown>).asset || (row as Record<string, unknown>).asset_id || "",
    ).trim();
    if (asset && tokenId && asset !== tokenId) return false;
    return true;
  });
}

async function fetchKalshiTrades(
  ticker: string,
  signal: AbortSignal,
): Promise<Record<string, unknown>[]> {
  const qs = new URLSearchParams({ ticker, limit: "1000" });
  const res = await fetch(`/api/integrations/kalshi-live/markets/trades?${qs.toString()}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw taggedError(
      typeof body?.error === "string" ? body.error : "Failed to load Kalshi trades",
      "kalshi_trades",
      res.status,
    );
  }
  return (Array.isArray(body?.trades) ? body.trades : []).filter(
    (row: unknown) => row && typeof row === "object",
  ) as Record<string, unknown>[];
}

function CompareFeaturedTags({
  tags,
  featured,
}: {
  tags?: string[];
  featured?: boolean;
}) {
  const list = Array.isArray(tags) ? tags.filter(Boolean).slice(0, 2) : [];
  return (
    <div className="flex min-w-0 flex-nowrap items-center gap-1.5">
      {featured ? (
        <span className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none text-fuchsia-500 ring-1 ring-fuchsia-500">
          Featured
        </span>
      ) : null}
      {list.map((tag) => (
        <span
          key={tag}
          className="inline-flex shrink-0 items-center rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground ring-1 ring-current"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function CompareMarketCard({
  imageUrl,
  fallback,
  title,
  tags,
  featured,
  priceLabel,
  price,
  volume,
  onClick,
  disabled,
}: {
  imageUrl?: string;
  fallback: string;
  title: string;
  tags?: string[];
  featured?: boolean;
  priceLabel: string;
  price: string;
  volume: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-[4.75rem] w-full items-center gap-2 overflow-hidden rounded-md border border-border/70 bg-background p-1.5 text-left shadow-sm transition-colors hover:border-border hover:bg-muted/30 disabled:opacity-60"
    >
      <div className="relative size-11 shrink-0 overflow-hidden rounded-md border border-border/60 bg-black">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="flex size-full items-center justify-center text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            {fallback}
          </div>
        )}
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-1">
        <p className="line-clamp-2 h-[1.75rem] text-[11px] font-medium leading-[0.875rem] text-foreground">
          {title}
        </p>
        <CompareFeaturedTags tags={tags} featured={featured} />
      </div>
      <div className="flex h-full shrink-0 flex-col items-end justify-center gap-0.5">
        <span className="text-[10px] leading-none text-muted-foreground">
          {priceLabel}{" "}
          <span className="text-base font-semibold tabular-nums leading-none text-foreground">
            {price}
          </span>
        </span>
        <span className="text-[10px] leading-none text-muted-foreground">
          vol{" "}
          <span className="text-sm font-semibold tabular-nums leading-none text-foreground">
            {volume}
          </span>
        </span>
      </div>
    </button>
  );
}

function CompareFeaturedColumn({
  label,
  loading,
  refreshing,
  error,
  hasItems,
  onRefresh,
  children,
}: {
  label: string;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasItems: boolean;
  onRefresh: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/20">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-green-500" aria-hidden />
            Live
          </span>
          {loading ? (
            <span
              className="inline-flex size-6 items-center justify-center text-muted-foreground"
              aria-label={`Loading ${label} markets`}
            >
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            </span>
          ) : (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading || refreshing}
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              aria-label={`Show different ${label} markets`}
              title={`Show different ${label} markets`}
            >
              <RefreshCw
                className={cn("size-3.5", refreshing && "animate-spin")}
                aria-hidden
              />
            </button>
          )}
        </div>
      </div>
      {loading ? (
        <CompareFeaturedSkeletonList />
      ) : error ? (
        <p className="px-3 py-4 text-sm text-destructive">{error}</p>
      ) : !hasItems ? (
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
          No featured markets available right now.
        </p>
      ) : (
        children
      )}
    </div>
  );
}

type CompareEventPickerState = {
  title: string;
  markets: HubPolymarketLiveDemoMarket[];
};

function compareMarketLabel(market: HubPolymarketLiveDemoMarket) {
  return String(market.title || market.slug || market.id || "Market");
}

function compareMarketOutcomeLine(market: HubPolymarketLiveDemoMarket) {
  const labels = polymarketYesNoLabels(market);
  return `YES = ${labels.yes} · NO = ${labels.no}`;
}

function eventPickerFromPolymarketSuggestion(
  suggestion: Record<string, unknown>,
):
  | { picker: CompareEventPickerState }
  | { market: HubPolymarketLiveDemoMarket }
  | { error: string } {
  const nested = polymarketRealtimeMarketsFromEventSuggestion(
    suggestion,
  ) as HubPolymarketLiveDemoMarket[];
  if (!nested.length) {
    return { error: "That event does not include any streamable markets with outcome token IDs." };
  }
  if (nested.length === 1) return { market: nested[0]! };
  return {
    picker: {
      title: String(suggestion.title || "Select event markets"),
      markets: nested,
    },
  };
}

function ComparePolymarketEventMarketDialog({
  picker,
  onClose,
  onSelect,
}: {
  picker: CompareEventPickerState | null;
  onClose: () => void;
  onSelect: (market: HubPolymarketLiveDemoMarket) => void;
}) {
  const [selectedKey, setSelectedKey] = useState("");

  useEffect(() => {
    setSelectedKey("");
  }, [picker?.title, picker?.markets]);

  const selected =
    picker?.markets.find((market) => polymarketRealtimeMarketKey(market) === selectedKey) || null;

  return (
    <Dialog
      open={Boolean(picker)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[85vh] flex-col gap-3 overflow-hidden sm:max-w-xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>{picker?.title || "Select event markets"}</DialogTitle>
          <DialogDescription className="text-left">
            This is an event with multiple markets. Pick the specific market you want to compare.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {(picker?.markets || []).map((market) => {
            const key = polymarketRealtimeMarketKey(market);
            const checked = key === selectedKey;
            return (
              <label
                key={key}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5",
                  checked ? "border-secondary/35 bg-secondary/10" : "border-border/60",
                )}
              >
                <input
                  type="radio"
                  name="compare-event-market"
                  className="mt-1 size-4 accent-[#2E5CFF]"
                  checked={checked}
                  onChange={() => setSelectedKey(key)}
                />
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-foreground">
                    {compareMarketLabel(market)}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    {compareMarketOutcomeLine(market)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <DialogFooter className="shrink-0 items-center border-t border-border/60 pt-3 sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            {selected
              ? `Compare ${compareMarketLabel(selected)}`
              : "Pick a market to continue."}
          </p>
          <Button
            type="button"
            className="gap-1.5"
            disabled={!selected}
            onClick={() => {
              if (selected) onSelect(selected);
            }}
          >
            <Check className="size-3.5" aria-hidden />
            Use this market
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ComparePolymarketMarketSearch({
  onSelectKalshiFeatured,
  kalshiPickLoading,
}: {
  onSelectKalshiFeatured?: (card: CompareKalshiFeaturedCard) => void;
  kalshiPickLoading?: boolean;
}) {
  const selection = useHubPolymarketLiveDemo();
  const selectMarket = selection?.selectMarket;
  const [error, setError] = useState("");
  const [eventPicker, setEventPicker] = useState<CompareEventPickerState | null>(null);
  const [featured, setFeatured] = useState<CompareFeaturedCard[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredRefreshing, setFeaturedRefreshing] = useState(false);
  const [featuredError, setFeaturedError] = useState<string | null>(null);
  const [kalshiFeatured, setKalshiFeatured] = useState<CompareKalshiFeaturedCard[]>([]);
  const [kalshiFeaturedLoading, setKalshiFeaturedLoading] = useState(true);
  const [kalshiFeaturedRefreshing, setKalshiFeaturedRefreshing] = useState(false);
  const [kalshiFeaturedError, setKalshiFeaturedError] = useState<string | null>(null);

  const loadFeatured = useCallback(async (opts?: { excludeIds?: string[] }) => {
    const exclude = opts?.excludeIds || [];
    const refreshing = exclude.length > 0;
    if (refreshing) setFeaturedRefreshing(true);
    else setFeaturedLoading(true);
    setFeaturedError(null);
    try {
      const params = new URLSearchParams({ limit: "12" });
      if (exclude.length) params.set("exclude", exclude.join(","));
      const res = await fetch(
        `/api/integrations/polymarket-live/markets/featured?${params.toString()}`,
        { credentials: "same-origin", headers: { Accept: "application/json" } },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body?.error === "string" ? body.error : "Failed to load featured markets",
        );
      }
      const parsed = (Array.isArray(body?.markets) ? body.markets : [])
        .map(normalizeCompareFeaturedCard)
        .filter(Boolean) as CompareFeaturedCard[];
      setFeatured(shuffleCompareFeatured(parsed, COMPARE_FEATURED_LIMIT));
    } catch (e) {
      setFeatured([]);
      setFeaturedError(e instanceof Error ? e.message : "Failed to load featured markets");
    } finally {
      setFeaturedLoading(false);
      setFeaturedRefreshing(false);
    }
  }, []);

  const loadKalshiFeatured = useCallback(async (opts?: { excludeTickers?: string[] }) => {
    const exclude = opts?.excludeTickers || [];
    const refreshing = exclude.length > 0;
    if (refreshing) setKalshiFeaturedRefreshing(true);
    else setKalshiFeaturedLoading(true);
    setKalshiFeaturedError(null);
    try {
      const params = new URLSearchParams({
        limit: String(COMPARE_FEATURED_LIMIT),
        source: "discovery",
        v: "3",
      });
      if (exclude.length) params.set("exclude", exclude.join(","));
      const res = await fetch(
        `/api/integrations/kalshi-live/markets/featured?${params.toString()}`,
        { credentials: "same-origin", headers: { Accept: "application/json" } },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body?.error === "string" ? body.error : "Failed to load Kalshi markets",
        );
      }
      const parsed = (Array.isArray(body?.markets) ? body.markets : [])
        .map(normalizeCompareKalshiFeaturedCard)
        .filter(Boolean) as CompareKalshiFeaturedCard[];
      setKalshiFeatured(parsed.slice(0, COMPARE_FEATURED_LIMIT));
    } catch (e) {
      if (!refreshing) {
        setKalshiFeatured([]);
        setKalshiFeaturedError(
          e instanceof Error ? e.message : "Failed to load Kalshi markets",
        );
      }
    } finally {
      setKalshiFeaturedLoading(false);
      setKalshiFeaturedRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadFeatured();
    void loadKalshiFeatured();
  }, [loadFeatured, loadKalshiFeatured]);

  const applyMarket = useCallback(
    (
      market: HubPolymarketLiveDemoMarket,
      source: "compare_search" | "compare_featured" | "compare_kalshi_featured",
    ) => {
      if (!selectMarket) return;
      trackPolymarketLiveHubEvent("polymarket_live_market_selected", {
        source,
        title: String(market.title || ""),
        conditionId: String(market.conditionId || market.id || ""),
      });
      selectMarket(market);
      setEventPicker(null);
      setError("");
    },
    [selectMarket],
  );

  const selectFeatured = useCallback(
    (card: CompareFeaturedCard) => {
      const market = featuredPolymarketMarketToDemoMarket(card);
      if (!market) {
        setError("That featured market does not expose streamable outcome token IDs.");
        return;
      }
      applyMarket(market, "compare_featured");
    },
    [applyMarket],
  );

  const selectKalshiFeatured = useCallback(
    (card: CompareKalshiFeaturedCard) => {
      onSelectKalshiFeatured?.(card);
    },
    [onSelectKalshiFeatured],
  );

  const handleSearchSelection = useCallback(
    (suggestion: Record<string, unknown>) => {
      setError("");
      const entity = String(suggestion?.entity || "");
      if (entity === "event") {
        const resolved = eventPickerFromPolymarketSuggestion(suggestion);
        if ("error" in resolved) {
          setError(resolved.error);
          return;
        }
        if ("market" in resolved) {
          applyMarket(resolved.market, "compare_search");
          return;
        }
        setEventPicker(resolved.picker);
        return;
      }
      if (entity !== "market") {
        setError("Pick a market or event to start the comparison.");
        return;
      }
      const market = polymarketRealtimeMarketFromSuggestion(suggestion) as
        | HubPolymarketLiveDemoMarket
        | null;
      if (!market) {
        setError("That market does not expose streamable outcome token IDs.");
        return;
      }
      applyMarket(market, "compare_search");
    },
    [applyMarket],
  );

  const handleSearchAll = useCallback(
    (suggestions: Array<Record<string, unknown>>) => {
      for (const suggestion of suggestions || []) {
        if (suggestion?.entity === "market") {
          handleSearchSelection(suggestion);
          return;
        }
      }
      for (const suggestion of suggestions || []) {
        if (suggestion?.entity === "event") {
          handleSearchSelection(suggestion);
          return;
        }
      }
      setError("No comparable Polymarket markets found for that search.");
    },
    [handleSearchSelection],
  );

  return (
    <div className="space-y-3 text-left">
      <div className="space-y-1 text-center">
        <p className="text-sm font-medium text-foreground">
          Find a Polymarket market to compare with Kalshi Live
        </p>
        <p className="text-sm text-muted-foreground">
          Search by name or ticker, then we&apos;ll match it against Kalshi.
        </p>
      </div>
      <PolymarketLiveSearch
        layout="panel"
        dismissAfterSelect
        searchTags
        searchProfiles={false}
        keepClosedMarkets={false}
        limitPerType={50}
        className="mx-auto w-full max-w-2xl"
        resultsClassName="max-h-56 flex-none"
        placeholder="Search Polymarket by name or ticker…"
        onSelect={handleSearchSelection}
        onSubmitAll={handleSearchAll}
        onFocus={() => {
          trackPolymarketLiveHubEvent("polymarket_live_market_search_start", {
            source: "compare_demo",
          });
        }}
      />
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          Or try one of these trending live markets
        </p>
        <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
          <CompareFeaturedColumn
            label="Polymarket"
            loading={featuredLoading}
            refreshing={featuredRefreshing}
            error={featuredError}
            hasItems={featured.length > 0}
            onRefresh={() =>
              void loadFeatured({
                excludeIds: featured.map((item) => compareFeaturedKey(item)),
              })
            }
          >
            <ul className="grid auto-rows-fr gap-1.5 p-2">
              {featured.map((market) => {
                const yes = market.outcomes[0];
                return (
                  <li key={compareFeaturedKey(market)} className="h-full">
                    <CompareMarketCard
                      imageUrl={market.imageUrl}
                      fallback="PM"
                      title={market.title}
                      tags={market.tags}
                      featured={market.featured}
                      priceLabel={yes?.outcome || "Yes"}
                      price={formatCompareFeaturedPrice(yes?.lastPrice)}
                      volume={formatPolymarketVolume(market.volume24h) || "—"}
                      onClick={() => selectFeatured(market)}
                    />
                  </li>
                );
              })}
            </ul>
          </CompareFeaturedColumn>

          <CompareFeaturedColumn
            label="Kalshi"
            loading={kalshiFeaturedLoading}
            refreshing={kalshiFeaturedRefreshing}
            error={kalshiFeaturedError}
            hasItems={kalshiFeatured.length > 0}
            onRefresh={() =>
              void loadKalshiFeatured({
                excludeTickers: kalshiFeatured.map((item) => item.ticker),
              })
            }
          >
            <ul className="grid auto-rows-fr gap-1.5 p-2">
              {kalshiFeatured.map((market) => (
                <li key={market.ticker} className="h-full">
                  <CompareMarketCard
                    imageUrl={market.imageUrl}
                    fallback="KL"
                    title={market.title}
                    tags={market.tags}
                    featured={market.featured}
                    priceLabel="Yes"
                    price={formatCompareFeaturedPrice(market.lastPriceDollars)}
                    volume={formatCompareKalshiVolume(market.volume24h)}
                    disabled={kalshiPickLoading}
                    onClick={() => selectKalshiFeatured(market)}
                  />
                </li>
              ))}
            </ul>
          </CompareFeaturedColumn>
        </div>
      </div>
      {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
      <ComparePolymarketEventMarketDialog
        picker={eventPicker}
        onClose={() => setEventPicker(null)}
        onSelect={(market) => applyMarket(market, "compare_search")}
      />
    </div>
  );
}

function CompareCounterpartSearch({
  matchFromKalshi,
  onPolySelect,
  onKalshiSelect,
}: {
  matchFromKalshi: boolean;
  onPolySelect: (market: HubPolymarketLiveDemoMarket) => void;
  onKalshiSelect: (ticker: string, title: string) => void;
}) {
  const [manualTickers, setManualTickers] = useState("");
  const [eventPicker, setEventPicker] = useState<CompareEventPickerState | null>(null);
  const [searchError, setSearchError] = useState("");
  const counterpart = matchFromKalshi ? "Polymarket" : "Kalshi";

  const handlePolySuggestion = useCallback(
    (suggestion: Record<string, unknown>) => {
      setSearchError("");
      const entity = String(suggestion?.entity || "");
      if (entity === "event") {
        const resolved = eventPickerFromPolymarketSuggestion(suggestion);
        if ("error" in resolved) {
          setSearchError(resolved.error);
          return;
        }
        if ("market" in resolved) {
          onPolySelect(resolved.market);
          return;
        }
        setEventPicker(resolved.picker);
        return;
      }
      if (entity !== "market") return;
      const market = polymarketRealtimeMarketFromSuggestion(suggestion) as
        | HubPolymarketLiveDemoMarket
        | null;
      if (market) onPolySelect(market);
    },
    [onPolySelect],
  );

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Search {counterpart} by name or ticker
      </p>
      {matchFromKalshi ? (
        <>
          <PolymarketLiveSearch
            layout="panel"
            dismissAfterSelect
            searchTags
            searchProfiles={false}
            keepClosedMarkets={false}
            limitPerType={50}
            className="w-full"
            resultsClassName="max-h-56 flex-none"
            placeholder="Search Polymarket by name or ticker…"
            onSelect={handlePolySuggestion}
            onSubmitAll={(suggestions) => {
              for (const suggestion of suggestions || []) {
                if (suggestion?.entity === "market") {
                  handlePolySuggestion(suggestion);
                  return;
                }
              }
              for (const suggestion of suggestions || []) {
                if (suggestion?.entity === "event") {
                  handlePolySuggestion(suggestion);
                  return;
                }
              }
            }}
          />
          {searchError ? <p className="text-xs text-destructive">{searchError}</p> : null}
          <ComparePolymarketEventMarketDialog
            picker={eventPicker}
            onClose={() => setEventPicker(null)}
            onSelect={(market) => {
              setEventPicker(null);
              onPolySelect(market);
            }}
          />
        </>
      ) : (
        <MarketTickerSearch
          value={manualTickers}
          onChange={setManualTickers}
          onSelectionsChange={(selections) => {
            const s = selections?.[0];
            const ticker = String(s?.ticker || "").trim().toUpperCase();
            if (!ticker) return;
            onKalshiSelect(ticker, String(s?.title || ticker));
          }}
          maxTickers={1}
          dataSource="live"
          searchScope="markets"
          showCutoffNotes={false}
          showHelperText={false}
          required={false}
          placeholder="Search Kalshi by name or ticker…"
          className="w-full"
        />
      )}
    </div>
  );
}

export function HubPolymarketKalshiCompareDemo() {
  const selection = useHubPolymarketLiveDemo();
  const polyMarket = selection?.markets?.[0] || null;
  const setMarkets = selection?.setMarkets;
  const polyKey = String(polyMarket?.conditionId || polyMarket?.id || polyMarket?.slug || "");

  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<
    Awaited<ReturnType<typeof findKalshiLiveMatchesForPolymarket>>["candidates"]
  >([]);
  const [selectedTicker, setSelectedTicker] = useState<string>("");
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const [kalshiAnchor, setKalshiAnchor] = useState<PinnedKalshiFeatured | null>(null);
  const [polyCandidates, setPolyCandidates] = useState<
    Awaited<ReturnType<typeof findPolymarketLiveMatchesForKalshi>>["candidates"]
  >([]);

  const [kalshiMarket, setKalshiMarket] = useState<Record<string, unknown> | null>(null);
  const [polyPoints, setPolyPoints] = useState<Record<string, unknown>[]>([]);
  const [kalshiPoints, setKalshiPoints] = useState<Record<string, unknown>[]>([]);
  const [polyLoading, setPolyLoading] = useState(false);
  const [kalshiLoading, setKalshiLoading] = useState(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [interval, setIntervalId] = useState<IntervalId>("1d");

  const polySocketStop = useRef<(() => void) | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const polyPollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const matchAbort = useRef<AbortController | null>(null);
  const polyHistAbort = useRef<AbortController | null>(null);
  const kalshiSeriesAbort = useRef<AbortController | null>(null);

  const startOver = useCallback(() => {
    matchAbort.current?.abort();
    polyHistAbort.current?.abort();
    kalshiSeriesAbort.current?.abort();
    polySocketStop.current?.();
    polySocketStop.current = null;
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    if (polyPollTimer.current) {
      clearInterval(polyPollTimer.current);
      polyPollTimer.current = null;
    }
    setMatchLoading(false);
    setMatchError(null);
    setCandidates([]);
    setPolyCandidates([]);
    setSelectedTicker("");
    setEmptyMessage(null);
    setKalshiMarket(null);
    setPolyPoints([]);
    setKalshiPoints([]);
    setPolyLoading(false);
    setKalshiLoading(false);
    setSeriesError(null);
    setKalshiAnchor(null);
    setMarkets?.([]);
  }, [setMarkets]);

  const applyPolyMatch = useCallback(
    (market: HubPolymarketLiveDemoMarket) => {
      if (!setMarkets) return;
      trackPolymarketLiveHubEvent("polymarket_live_market_selected", {
        source: "compare_kalshi_featured",
        title: String(market.title || ""),
        conditionId: String(market.conditionId || market.id || ""),
      });
      setEmptyMessage(null);
      setMarkets([market]);
    },
    [setMarkets],
  );

  const startFromKalshi = useCallback(
    (card: CompareKalshiFeaturedCard) => {
      matchAbort.current?.abort();
      const ac = new AbortController();
      matchAbort.current = ac;
      setKalshiAnchor({
        ticker: card.ticker,
        title: card.title,
        eventTitle: card.eventTitle,
        seriesTicker: card.seriesTicker,
        lastPriceDollars: card.lastPriceDollars,
        volume24h: card.volume24h,
        status: card.status,
        tags: card.tags,
        imageUrl: card.imageUrl,
      });
      setSelectedTicker(card.ticker);
      setCandidates([]);
      setPolyCandidates([]);
      setMatchLoading(true);
      setMatchError(null);
      setEmptyMessage(null);
      setSeriesError(null);
      setMarkets?.([]);

      trackPolymarketLiveHubEvent("polymarket_kalshi_compare_attempt", {
        query: card.title,
        candidateCount: 0,
        hasPreselected: false,
        origin: "kalshi",
      });

      void findPolymarketLiveMatchesForKalshi(
        {
          ticker: card.ticker,
          seriesTicker: card.seriesTicker,
          title: card.title,
          eventTitle: card.eventTitle,
          tags: card.tags,
        },
        { signal: ac.signal },
      )
        .then((result) => {
          if (ac.signal.aborted) return;
          setPolyCandidates(result.candidates);
          setEmptyMessage(result.emptyMessage);
          trackPolymarketLiveHubEvent("polymarket_kalshi_compare_match", {
            ticker: card.ticker,
            auto: Boolean(result.preselected),
            origin: "kalshi",
            candidateCount: result.candidates.length,
            query: result.query,
          });
          if (result.preselected?.market) {
            applyPolyMatch(result.preselected.market as HubPolymarketLiveDemoMarket);
          }
        })
        .catch((err) => {
          if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
            return;
          }
          setMatchError(
            humanizeMatchError(
              err instanceof Error ? err.message : "Polymarket search failed",
              "polymarket",
            ),
          );
          setPolyCandidates([]);
        })
        .finally(() => {
          if (!ac.signal.aborted) setMatchLoading(false);
        });
    },
    [applyPolyMatch, setMarkets],
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.12, rootMargin: "120px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      matchAbort.current?.abort();
      polyHistAbort.current?.abort();
      kalshiSeriesAbort.current?.abort();
      polySocketStop.current?.();
      if (pollTimer.current) clearInterval(pollTimer.current);
      if (polyPollTimer.current) clearInterval(polyPollTimer.current);
    };
  }, []);

  // Match Kalshi only when the user started from a Polymarket market.
  useEffect(() => {
    if (kalshiAnchor) return undefined;
    if (!inView || !polyMarket || !polyKey) {
      setCandidates([]);
      setSelectedTicker("");
      setEmptyMessage(null);
      return undefined;
    }

    matchAbort.current?.abort();
    const ac = new AbortController();
    matchAbort.current = ac;
    setMatchLoading(true);
    setMatchError(null);
    setEmptyMessage(null);
    setSelectedTicker("");
    setKalshiMarket(null);
    setKalshiPoints([]);
    setSeriesError(null);

    void findKalshiLiveMatchesForPolymarket(polyMarket, { signal: ac.signal })
      .then((result) => {
        if (ac.signal.aborted) return;
        trackPolymarketLiveHubEvent("polymarket_kalshi_compare_attempt", {
          query: result.query,
          candidateCount: result.candidates.length,
          hasPreselected: Boolean(result.preselected),
        });
        setCandidates(result.candidates);
        setEmptyMessage(result.emptyMessage);
        if (result.preselected) {
          trackPolymarketLiveHubEvent("polymarket_kalshi_compare_match", {
            tier: result.preselected.tier,
            ticker: result.preselected.market.marketTicker,
            auto: true,
          });
          setSelectedTicker(result.preselected.market.marketTicker);
        } else if (result.candidates.length === 1) {
          trackPolymarketLiveHubEvent("polymarket_kalshi_compare_match", {
            tier: result.candidates[0]!.tier,
            ticker: result.candidates[0]!.market.marketTicker,
            auto: false,
          });
          setSelectedTicker(result.candidates[0]!.market.marketTicker);
        }
      })
      .catch((err) => {
        if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
        setMatchError(
          humanizeMatchError(err instanceof Error ? err.message : "Match search failed"),
        );
        setCandidates([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setMatchLoading(false);
      });

    return () => ac.abort();
  }, [inView, kalshiAnchor, polyKey, polyMarket]);

  const selectedCandidate = useMemo(
    () => candidates.find((c) => c.market.marketTicker === selectedTicker) || null,
    [candidates, selectedTicker],
  );

  useEffect(() => {
    if (!polyMarket || !polyKey) {
      setPolyPoints([]);
      setPolyLoading(false);
      return undefined;
    }
    if (!inView) return undefined;

    const tokenId = yesTokenId(polyMarket);
    const conditionId = polyConditionId(polyMarket);
    if (!tokenId) {
      setPolyPoints([]);
      setPolyLoading(false);
      setSeriesError("This Polymarket market has no YES token to chart.");
      return undefined;
    }

    polyHistAbort.current?.abort();
    const ac = new AbortController();
    polyHistAbort.current = ac;
    setPolyPoints([]);
    setPolyLoading(true);

    void Promise.all([
      fetchPolymarketPricesHistory(tokenId, ac.signal),
      conditionId
        ? fetchPolymarketTrades(conditionId, tokenId, ac.signal).catch((err) => {
            if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
              throw err;
            }
            return [] as Record<string, unknown>[];
          })
        : Promise.resolve([] as Record<string, unknown>[]),
    ])
      .then(([history, trades]) => {
        if (ac.signal.aborted) return;
        const histPts = history
          .map((row) => toPctPoint(row, "Polymarket"))
          .filter(Boolean) as Record<string, unknown>[];
        const tradePts = trades
          .map((row) => polymarketTradeToPoint(row, tokenId))
          .filter(Boolean) as Record<string, unknown>[];
        setPolyPoints((prev) => mergePctPoints(histPts, [...tradePts, ...prev]));
      })
      .catch((err) => {
        if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
        setSeriesError(humanizeSeriesError(err));
      })
      .finally(() => {
        if (!ac.signal.aborted) setPolyLoading(false);
      });

    return () => ac.abort();
  }, [inView, polyKey, polyMarket]);

  useEffect(() => {
    if (!selectedTicker) {
      setKalshiMarket(null);
      setKalshiPoints([]);
      setKalshiLoading(false);
      return undefined;
    }
    if (!inView) return undefined;

    kalshiSeriesAbort.current?.abort();
    const ac = new AbortController();
    kalshiSeriesAbort.current = ac;
    setKalshiLoading(true);
    setSeriesError(null);

    void Promise.all([
      fetchKalshiLiveMarket({ marketTicker: selectedTicker, signal: ac.signal }),
      fetchKalshiTrades(selectedTicker, ac.signal),
    ])
      .then(([market, kalshiTrades]) => {
        if (ac.signal.aborted) return;
        setKalshiMarket(market);
        setKalshiPoints(
          kalshiTrades
            .map((row) => toPctPoint(row, "Kalshi"))
            .filter(Boolean) as Record<string, unknown>[],
        );
      })
      .catch((err) => {
        if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
        setSeriesError(humanizeSeriesError(err));
      })
      .finally(() => {
        if (!ac.signal.aborted) setKalshiLoading(false);
      });

    return () => ac.abort();
  }, [inView, selectedTicker]);

  // Live Polymarket trades while the selected market is in view.
  useEffect(() => {
    polySocketStop.current?.();
    polySocketStop.current = null;

    if (!inView || !polyMarket) return undefined;

    const tokenId = yesTokenId(polyMarket);
    if (!tokenId) return undefined;

    polySocketStop.current = openPolymarketLastTradeSocket({
      assetIds: [tokenId],
      onTrade: (row) => {
        const asset = String(row.asset_id || "");
        if (asset && asset !== tokenId) return;
        const point = toPctPoint(
          {
            created_time: row.timestamp || row.time || new Date().toISOString(),
            price: row.price,
            yes_price_dollars: row.price,
            size: row.size,
            side: row.side,
          },
          "Polymarket",
        );
        if (!point) return;
        setPolyPoints((prev) => mergePctPoints(prev, [point]));
      },
    });

    return () => {
      polySocketStop.current?.();
      polySocketStop.current = null;
    };
  }, [inView, polyMarket]);

  // Poll Polymarket trades (Data API) so the liveline stays in sync with Kalshi's REST poll.
  useEffect(() => {
    if (polyPollTimer.current) {
      clearInterval(polyPollTimer.current);
      polyPollTimer.current = null;
    }

    if (!inView || !polyMarket) return undefined;

    const tokenId = yesTokenId(polyMarket);
    const conditionId = polyConditionId(polyMarket);
    if (!tokenId) return undefined;

    polyPollTimer.current = setInterval(() => {
      void (async () => {
        try {
          const [history, trades] = await Promise.all([
            fetchPolymarketClobHistory(
              tokenId,
              { interval: "1h", fidelity: 1 },
              new AbortController().signal,
            ),
            conditionId
              ? fetchPolymarketTrades(conditionId, tokenId, new AbortController().signal)
              : Promise.resolve([] as Record<string, unknown>[]),
          ]);
          const mapped = [
            ...history.map((row) => toPctPoint(row, "Polymarket")),
            ...trades.map((row) => polymarketTradeToPoint(row, tokenId)),
          ].filter(Boolean) as Record<string, unknown>[];
          if (mapped.length) {
            setPolyPoints((prev) => mergePctPoints(prev, mapped));
          }
        } catch {
          /* ignore poll errors */
        }
      })();
    }, 12_000);

    return () => {
      if (polyPollTimer.current) {
        clearInterval(polyPollTimer.current);
        polyPollTimer.current = null;
      }
    };
  }, [inView, polyMarket]);

  // Live Kalshi poll while a matched ticker is in view.
  useEffect(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }

    if (!inView || !selectedTicker) return undefined;

    pollTimer.current = setInterval(() => {
      void (async () => {
        try {
          const [market, trades] = await Promise.all([
            fetchKalshiLiveMarket({ marketTicker: selectedTicker }),
            fetchKalshiTrades(selectedTicker, new AbortController().signal),
          ]);
          setKalshiMarket(market);
          const mapped = trades
            .map((row) => toPctPoint(row, "Kalshi"))
            .filter(Boolean) as Record<string, unknown>[];
          if (mapped.length) {
            setKalshiPoints((prev) => {
              const byTime = new Map<string, Record<string, unknown>>();
              for (const row of [...prev, ...mapped]) {
                const key = String(row.created_time || "");
                if (key) byTime.set(key, row);
              }
              return [...byTime.values()]
                .sort((a, b) => (parseTs(a) || 0) - (parseTs(b) || 0))
                .slice(-2000);
            });
          }
        } catch {
          /* ignore poll errors */
        }
      })();
    }, 12_000);

    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [inView, livePaused, selectedTicker]);

  const polyFiltered = useMemo(
    () => filterByInterval(polyPoints, interval),
    [polyPoints, interval],
  );
  const kalshiFiltered = useMemo(
    () => filterByInterval(kalshiPoints, interval),
    [kalshiPoints, interval],
  );

  const polySeries = useMemo(
    () => [
      {
        id: "polymarket",
        label: "Polymarket",
        color: POLYMARKET_BLUE,
        trades: polyFiltered,
      },
    ],
    [polyFiltered],
  );

  const kalshiSeries = useMemo(
    () => [
      {
        id: "kalshi",
        label: "Kalshi",
        colorToken: "chart-3" as const,
        color: KALSHI_LINE_GREEN,
        trades: kalshiFiltered,
      },
    ],
    [kalshiFiltered],
  );

  const polyYesPct = useMemo(() => {
    const last = polyFiltered[polyFiltered.length - 1];
    if (last && Number.isFinite(Number(last._probability_pct))) {
      return Number(last._probability_pct);
    }
    return null;
  }, [polyFiltered]);

  const kalshiYesPct = useMemo(() => {
    if (kalshiMarket) {
      const fromMarket = impliedChancePctFromMarketRow(kalshiMarket);
      if (fromMarket != null) return fromMarket;
    }
    const last = kalshiFiltered[kalshiFiltered.length - 1];
    if (last && Number.isFinite(Number(last._probability_pct))) {
      return Number(last._probability_pct);
    }
    return null;
  }, [kalshiFiltered, kalshiMarket]);

  const divergence =
    polyYesPct != null && kalshiYesPct != null ? polyYesPct - kalshiYesPct : null;

  const polyLast = polyFiltered[polyFiltered.length - 1] || null;
  const kalshiLast = kalshiFiltered[kalshiFiltered.length - 1] || null;
  const shape = polymarketOutcomeShape(polyMarket || {});

  const relatedWarning =
    !kalshiAnchor &&
    selectedCandidate &&
    (selectedCandidate.tier === "related" || selectedCandidate.tier === "close");

  const polyChartPending = Boolean(polyMarket) && polyLoading && !polyFiltered.length;
  const kalshiChartPending =
    (kalshiLoading || (!kalshiAnchor && matchLoading)) && !kalshiFiltered.length;
  const kalshiFieldsPending = !selectedTicker || (kalshiLoading && !kalshiMarket);
  const polyFieldsPending = !polyMarket || (polyLoading && polyYesPct == null);
  const matchFromKalshi = Boolean(kalshiAnchor);
  const selectedPolyKey = polyMarket ? polymarketRealtimeMarketKey(polyMarket) : "";
  const parentYesNo = matchFromKalshi
    ? kalshiYesNoLabels(
        {
          ...(kalshiMarket || {}),
          yesSubtitle: selectedCandidate?.market.yesSubtitle,
          noSubtitle: selectedCandidate?.market.noSubtitle,
          title: kalshiMarket?.title || kalshiAnchor?.title,
        },
        kalshiAnchor?.title,
      )
    : polymarketYesNoLabels(polyMarket);
  const parentYesPct = matchFromKalshi
    ? kalshiYesPct ??
      (kalshiAnchor?.lastPriceDollars != null && Number.isFinite(kalshiAnchor.lastPriceDollars)
        ? kalshiAnchor.lastPriceDollars * 100
        : null)
    : polyYesPct;
  const parentTitle = matchFromKalshi
    ? kalshiAnchor?.title || selectedTicker || "Market"
    : String(polyMarket?.title || polyMarket?.slug || "Market");
  const parentMeta = matchFromKalshi
    ? [kalshiAnchor?.ticker || selectedTicker, kalshiAnchor?.status || kalshiMarket?.status]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(" · ")
    : [String(polyMarket?.slug || ""), polyMarket?.closed ? "Closed" : polyMarket ? "Live" : ""]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(" · ");
  const parentImageUrl = matchFromKalshi
    ? marketImageUrl(kalshiAnchor as Record<string, unknown> | null, kalshiMarket)
    : marketImageUrl(polyMarket, selection?.metadataRows?.[0]);
  const parentFallback = matchFromKalshi ? "KS" : "PM";
  const polyMatchList = polyCandidates.slice(0, 3);
  const kalshiMatchList = candidates.slice(0, 3);
  const showEmptyMatchNote =
    !matchLoading &&
    !matchError &&
    ((matchFromKalshi && polyMatchList.length === 0) ||
      (!matchFromKalshi && kalshiMatchList.length === 0));

  return (
    <div ref={rootRef}>
      <Card className="overflow-hidden rounded-xl border-border/70 bg-muted/15 text-foreground shadow-none dark:border-border/70 dark:bg-muted/10 dark:text-foreground">
        {!polyMarket && !kalshiAnchor ? (
          <CardContent className="px-4 py-5 sm:px-5 sm:py-6">
            <ComparePolymarketMarketSearch
              onSelectKalshiFeatured={startFromKalshi}
              kalshiPickLoading={matchLoading}
            />
          </CardContent>
        ) : (
          <>
            <CardHeader
              className={cn(
                "border-b px-3 py-2.5 text-white has-[[data-slot=card-action]]:items-center sm:px-4",
                matchFromKalshi ? "bg-[#28CC95]" : "bg-[#2E5CFF]",
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-white/25 bg-black/25">
                  {parentImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={parentImageUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-white/80">
                      {parentFallback}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-[11px] font-medium leading-none text-white/80">
                    Parent market · {matchFromKalshi ? "Kalshi" : "Polymarket"}
                  </CardTitle>
                  <p className="mt-0.5 truncate text-sm font-semibold leading-tight text-white">
                    {parentTitle}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] leading-snug text-white/85">
                    {parentMeta ? `${parentMeta} · ` : null}
                    YES = {parentYesNo.yes}
                    {parentYesPct != null ? ` · ${formatPct(parentYesPct)}` : ""}
                    {" · "}
                    NO = {parentYesNo.no}
                    {parentYesPct != null ? ` · ${formatPct(100 - parentYesPct)}` : ""}
                  </p>
                </div>
              </div>
              <CardAction>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1.5 px-2 text-xs text-white hover:bg-white/15 hover:text-white"
                  onClick={startOver}
                >
                  <Undo2 className="size-3.5" aria-hidden />
                  Start over
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
              {matchLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {matchFromKalshi
                    ? "Searching Polymarket for comparable markets…"
                    : "Searching Kalshi Live for comparable markets…"}
                </div>
              ) : null}

              {matchError ? <p className="text-sm text-destructive">{matchError}</p> : null}

              <CompareCounterpartSearch
                matchFromKalshi={matchFromKalshi}
                onPolySelect={applyPolyMatch}
                onKalshiSelect={(ticker, title) => {
                  setSelectedTicker(ticker);
                  setEmptyMessage(null);
                  setCandidates((prev) => {
                    if (prev.some((c) => c.market.marketTicker === ticker)) return prev;
                    return [
                      {
                        market: {
                          marketTicker: ticker,
                          title,
                          raw: {},
                        },
                        score: 0.5,
                        tier: "related" as const,
                        reasons: ["Manually selected"],
                        warnings: [
                          "Manual selection — verify event, resolution window, and settlement rules",
                        ],
                      },
                      ...prev,
                    ];
                  });
                }}
              />

              {showEmptyMatchNote ? (
                <p className="text-sm text-muted-foreground">
                  {emptyMessage ||
                    `No automatic ${matchFromKalshi ? "Polymarket" : "Kalshi"} match yet. Search by name or ticker.`}
                </p>
              ) : null}

              {matchFromKalshi && polyMatchList.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Found the following matching Polymarket markets
                  </p>
                  <div className="grid gap-2">
                    {polyMatchList.map((candidate) => {
                      const market = candidate.market as HubPolymarketLiveDemoMarket;
                      const key = polymarketRealtimeMarketKey(market);
                      const selected = Boolean(key) && key === selectedPolyKey;
                      const labels = polymarketYesNoLabels(market);
                      const aligned = yesOutcomesLikelySame(parentYesNo.yes, labels.yes);
                      return (
                        <label
                          key={key}
                          className={cn(
                            "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors",
                            selected
                              ? "border-[#2E5CFF]/50 bg-[#2E5CFF]/10"
                              : "border-border/60 bg-background hover:bg-muted/30",
                          )}
                        >
                          <input
                            type="radio"
                            name="polymarket-match"
                            className="mt-1 size-4 accent-[#2E5CFF]"
                            checked={selected}
                            onChange={() => applyPolyMatch(market)}
                          />
                          <span className="min-w-0 flex-1 space-y-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {String(market.title || market.slug || "Market")}
                              </span>
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                                {formatMatchScore(candidate.score)}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                  candidate.tier === "exact"
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                    : candidate.tier === "close"
                                      ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                                )}
                              >
                                {matchTierLabel(candidate.tier)}
                              </span>
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              YES = {labels.yes}
                              {selected && polyYesPct != null ? ` · ${formatPct(polyYesPct)}` : ""}
                              {" · "}
                              NO = {labels.no}
                              {selected && polyYesPct != null ? ` · ${formatPct(100 - polyYesPct)}` : ""}
                            </span>
                            {!aligned ? (
                              <span className="block text-[11px] text-amber-700 dark:text-amber-300">
                                YES on this market is {labels.yes}, not the parent YES ({parentYesNo.yes}).
                              </span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {!matchFromKalshi && kalshiMatchList.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Found the following matching Kalshi markets
                  </p>
                  <div className="grid gap-2">
                    {kalshiMatchList.map((candidate) => {
                      const selected = candidate.market.marketTicker === selectedTicker;
                      const labels = kalshiYesNoLabels(candidate.market, candidate.market.title);
                      const aligned = yesOutcomesLikelySame(parentYesNo.yes, labels.yes);
                      return (
                        <label
                          key={candidate.market.marketTicker}
                          className={cn(
                            "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors",
                            selected
                              ? "border-[#28CC95]/50 bg-[#28CC95]/10"
                              : "border-border/60 bg-background hover:bg-muted/30",
                          )}
                        >
                          <input
                            type="radio"
                            name="kalshi-match"
                            className="mt-1 size-4 accent-[#28CC95]"
                            checked={selected}
                            onChange={() => {
                              setEmptyMessage(null);
                              setSelectedTicker(candidate.market.marketTicker);
                            }}
                          />
                          <span className="min-w-0 flex-1 space-y-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {candidate.market.title}
                              </span>
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                                {formatMatchScore(candidate.score)}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                  candidate.tier === "exact"
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                    : candidate.tier === "close"
                                      ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                                )}
                              >
                                {matchTierLabel(candidate.tier)}
                              </span>
                            </span>
                            <span className="block font-mono text-[10px] text-muted-foreground">
                              {candidate.market.marketTicker}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              YES = {labels.yes}
                              {candidate.market.chancePct != null
                                ? ` · ${candidate.market.chancePct.toFixed(1)}%`
                                : ""}
                              {" · "}
                              NO = {labels.no}
                            </span>
                            {!aligned ? (
                              <span className="block text-[11px] text-amber-700 dark:text-amber-300">
                                YES on this market is {labels.yes}, not the parent YES ({parentYesNo.yes}).
                              </span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {polyMarket && !shape.isBinary ? (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Multi-outcome market — comparison uses the first listed outcome as YES.
                </p>
              ) : null}

              {selectedTicker && relatedWarning ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                  These markets cover a similar event but may use different rules or resolution
                  criteria.
                </p>
              ) : null}

              {seriesError ? <p className="text-sm text-destructive">{seriesError}</p> : null}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div
                  className="inline-flex h-8 items-center rounded-md border border-border/70 bg-background p-0.5"
                  role="group"
                  aria-label="Comparison interval"
                >
                  {INTERVALS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIntervalId(item.id)}
                      className={cn(
                        "h-7 rounded px-2.5 text-[11px] font-medium transition-colors",
                        interval === item.id
                          ? "bg-muted text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => setLivePaused((v) => !v)}
                >
                  {livePaused ? "Resume live" : "Pause live"}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col overflow-hidden rounded-xl border border-border/70 bg-background">
                  <div className="flex shrink-0 items-center gap-2 border-b border-border/50 px-3 py-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: POLYMARKET_BLUE }}
                      aria-hidden
                    />
                    <p className="text-xs font-semibold text-foreground">Polymarket</p>
                  </div>
                  <div className="h-56 min-h-0 w-full shrink-0 sm:h-64">
                    <CompareChartBody
                      pending={polyChartPending}
                      hasData={polyFiltered.length > 0}
                      waitingMessage={
                        polyMarket
                          ? "No chart at present"
                          : "Pick a Polymarket match above to plot this chart"
                      }
                    >
                      <HubKalshiLiveDemoTradesLiveline
                        series={polySeries}
                        persistHistory
                        fullHistory={interval === "6h" || interval === "1d" || interval === "all"}
                        fill
                        fixedValueDomain={{ min: 0, max: 100 }}
                        formatValue={(v) => `${v.toFixed(1)}%`}
                        parseRowValue={(row) => {
                          const n = Number(row._probability_pct);
                          return Number.isFinite(n) ? n : null;
                        }}
                        className="h-full min-h-0"
                        emptyMessage="No chart at present"
                      />
                    </CompareChartBody>
                  </div>
                </div>

                <div className="flex flex-col overflow-hidden rounded-xl border border-border/70 bg-background">
                  <div className="flex shrink-0 items-center gap-2 border-b border-border/50 px-3 py-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: KALSHI_GREEN }}
                      aria-hidden
                    />
                    <p className="text-xs font-semibold text-foreground">Kalshi</p>
                  </div>
                  <div className="h-56 min-h-0 w-full shrink-0 sm:h-64">
                    <CompareChartBody
                      pending={kalshiChartPending}
                      hasData={kalshiFiltered.length > 0}
                      waitingMessage={
                        selectedTicker
                          ? "No chart at present"
                          : "Pick a Kalshi match above to plot this chart"
                      }
                    >
                      <HubKalshiLiveDemoTradesLiveline
                        series={kalshiSeries}
                        persistHistory
                        fullHistory={interval === "6h" || interval === "1d" || interval === "all"}
                        fill
                        fixedValueDomain={{ min: 0, max: 100 }}
                        formatValue={(v) => `${v.toFixed(1)}%`}
                        parseRowValue={(row) => {
                          const n = Number(row._probability_pct);
                          return Number.isFinite(n) ? n : null;
                        }}
                        className="h-full min-h-0"
                        emptyMessage="No chart at present"
                      />
                    </CompareChartBody>
                  </div>
                </div>
              </div>

              {divergence != null ? (
                <p className="text-sm text-muted-foreground">
                  Polymarket is pricing YES{" "}
                  <span className="font-medium text-foreground">
                    {Math.abs(divergence).toFixed(1)} percentage points{" "}
                    {divergence >= 0 ? "higher" : "lower"}
                  </span>{" "}
                  than Kalshi. Descriptive only — not an arbitrage signal.
                </p>
              ) : null}

              <div className="overflow-hidden rounded-xl border border-border/70">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-muted/30 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium"> </th>
                      <th className="px-3 py-2 font-medium">Polymarket</th>
                      <th className="px-3 py-2 font-medium">Kalshi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">Market</td>
                      <td className="px-3 py-2 font-medium text-foreground">
                        {String(polyMarket?.title || "—")}
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground">
                        <ComparePendingValue
                          pending={kalshiFieldsPending && !selectedCandidate?.market.title}
                          skeletonClassName="h-3.5 w-40 max-w-full"
                        >
                          {String(
                            kalshiMarket?.title ||
                              selectedCandidate?.market.title ||
                              kalshiAnchor?.title ||
                              selectedTicker ||
                              "—",
                          )}
                        </ComparePendingValue>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">YES means</td>
                      <td className="px-3 py-2">{polymarketYesNoLabels(polyMarket).yes}</td>
                      <td className="px-3 py-2">
                        {
                          kalshiYesNoLabels(
                            kalshiMarket || selectedCandidate?.market,
                            kalshiAnchor?.title,
                          ).yes
                        }
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">NO means</td>
                      <td className="px-3 py-2">{polymarketYesNoLabels(polyMarket).no}</td>
                      <td className="px-3 py-2">
                        {
                          kalshiYesNoLabels(
                            kalshiMarket || selectedCandidate?.market,
                            kalshiAnchor?.title,
                          ).no
                        }
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">YES</td>
                      <td className="px-3 py-2">
                        <ComparePendingValue pending={polyFieldsPending}>
                          {formatPct(polyYesPct)}
                        </ComparePendingValue>
                      </td>
                      <td className="px-3 py-2">
                        <ComparePendingValue pending={kalshiFieldsPending || (kalshiLoading && kalshiYesPct == null)}>
                          {formatPct(kalshiYesPct)}
                        </ComparePendingValue>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">NO</td>
                      <td className="px-3 py-2">
                        <ComparePendingValue pending={polyFieldsPending}>
                          {formatPct(polyYesPct != null ? 100 - polyYesPct : null)}
                        </ComparePendingValue>
                      </td>
                      <td className="px-3 py-2">
                        <ComparePendingValue pending={kalshiFieldsPending || (kalshiLoading && kalshiYesPct == null)}>
                          {formatPct(kalshiYesPct != null ? 100 - kalshiYesPct : null)}
                        </ComparePendingValue>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">Last trade</td>
                      <td className="px-3 py-2">
                        <ComparePendingValue pending={polyFieldsPending}>
                          {formatAgo(String(polyLast?.created_time || "") || null)}
                        </ComparePendingValue>
                      </td>
                      <td className="px-3 py-2">
                        <ComparePendingValue pending={kalshiFieldsPending || (kalshiLoading && !kalshiLast)}>
                          {formatAgo(String(kalshiLast?.created_time || "") || null)}
                        </ComparePendingValue>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">Activity</td>
                      <td className="px-3 py-2">
                        <ComparePendingValue pending={polyChartPending} skeletonClassName="h-3 w-36">
                          {polyFiltered.length} prints in view
                          {polyMarket?.volume24h != null
                            ? ` · 24h vol $${Number(polyMarket.volume24h).toLocaleString()}`
                            : ""}
                        </ComparePendingValue>
                      </td>
                      <td className="px-3 py-2">
                        <ComparePendingValue pending={kalshiFieldsPending || kalshiChartPending} skeletonClassName="h-3 w-36">
                          {kalshiFiltered.length} trades in view
                          {kalshiMarket?.volume != null
                            ? ` · vol ${Number(kalshiMarket.volume).toLocaleString()} contracts`
                            : kalshiMarket?.volume_fp != null
                              ? ` · vol ${Number(kalshiMarket.volume_fp).toLocaleString()} contracts`
                              : ""}
                        </ComparePendingValue>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">Status</td>
                      <td className="px-3 py-2">
                        {polyMarket?.closed ? "Closed" : polyMarket ? "Live" : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <ComparePendingValue pending={kalshiFieldsPending && !selectedCandidate?.market.status}>
                          {String(kalshiMarket?.status || selectedCandidate?.market.status || "—")}
                        </ComparePendingValue>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    {
                      platform: "Polymarket",
                      pending: polyFieldsPending || polyChartPending,
                      trades: polyFiltered.length,
                      volumeLabel:
                        polyMarket?.volume24h != null
                          ? `24h notional ≈ $${Number(polyMarket.volume24h).toLocaleString()}`
                          : "Volume metric: platform 24h notional (USDC)",
                      lastPrice: formatPct(polyYesPct),
                      lastSize: polyLast?.size != null ? String(polyLast.size) : "—",
                      since: formatAgo(String(polyLast?.created_time || "") || null),
                    },
                    {
                      platform: "Kalshi",
                      pending: kalshiFieldsPending || kalshiChartPending,
                      trades: kalshiFiltered.length,
                      volumeLabel:
                        kalshiMarket?.volume != null || kalshiMarket?.volume_fp != null
                          ? `Contract volume ${Number(
                              kalshiMarket.volume ?? kalshiMarket.volume_fp,
                            ).toLocaleString()}`
                          : "Volume metric: Kalshi contracts (not USDC)",
                      lastPrice: formatPct(kalshiYesPct),
                      lastSize:
                        kalshiLast?.count != null || kalshiLast?.count_fp != null
                          ? String(kalshiLast.count ?? kalshiLast.count_fp)
                          : "—",
                      since: formatAgo(String(kalshiLast?.created_time || "") || null),
                    },
                  ] as const
                ).map((panel) => (
                  <div
                    key={panel.platform}
                    className="rounded-xl border border-border/70 bg-background px-3 py-3"
                  >
                    <p className="text-xs font-semibold text-foreground">{panel.platform} activity</p>
                    <dl className="mt-2 space-y-1.5 text-[11px]">
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Trades in interval</dt>
                        <dd className="font-medium text-foreground">
                          <ComparePendingValue pending={panel.pending} skeletonClassName="h-3 w-10">
                            {panel.trades}
                          </ComparePendingValue>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Volume</dt>
                        <dd className="max-w-[60%] text-right font-medium text-foreground">
                          <ComparePendingValue pending={panel.pending} skeletonClassName="h-3 w-28">
                            {panel.volumeLabel}
                          </ComparePendingValue>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Last execution</dt>
                        <dd className="font-medium text-foreground">
                          <ComparePendingValue pending={panel.pending} skeletonClassName="h-3 w-12">
                            {panel.lastPrice}
                          </ComparePendingValue>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Last size</dt>
                        <dd className="font-medium text-foreground">
                          <ComparePendingValue pending={panel.pending} skeletonClassName="h-3 w-12">
                            {panel.lastSize}
                          </ComparePendingValue>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Since last trade</dt>
                        <dd className="font-medium text-foreground">
                          <ComparePendingValue pending={panel.pending} skeletonClassName="h-3 w-14">
                            {panel.since}
                          </ComparePendingValue>
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <Button type="button" size="sm" asChild>
                  <Link href="#polymarket-live-pricing">Compare Markets in Lychee</Link>
                </Button>
                <Button type="button" size="sm" variant="outline" asChild>
                  <Link href="#polymarket-live-pricing">Add Both to a Live Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
