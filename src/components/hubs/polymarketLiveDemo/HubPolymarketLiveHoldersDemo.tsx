"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HubInPageLink } from "@/components/hubs/HubCtaButton";
import {
  useHubPolymarketLiveDemo,
  type HubPolymarketLiveDemoMarket,
} from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveDemoSelection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Crown, Loader2, Trophy, Users } from "lucide-react";

type HolderRow = {
  proxyWallet: string;
  name: string;
  pseudonym: string;
  profileImage: string;
  amount: number;
  outcomeIndex: number;
  outcome: string;
  asset: string;
  verified: boolean;
};

type HolderEnrichment = {
  marketCashPnl: number | null;
  marketPercentPnl: number | null;
  marketCurrentValue: number | null;
  marketSize: number | null;
  leaderboardRank: string | null;
  leaderboardPnl: number | null;
  leaderboardVol: number | null;
  profileImage: string;
};

type OtherPosition = {
  title: string;
  outcome: string;
  size: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  curPrice: number;
  icon: string;
  conditionId: string;
};

const SEARCH_HREF = "#find-polymarket-markets";
const HOLDERS_LIMIT = 12;
const WHALE_SHARE_FLOOR = 0.2;
const WHALE_AMOUNT_FLOOR = 10_000;
const ENRICH_BATCH = 4;

function shortAddress(address: string): string {
  if (!address || address.length < 10) return address || "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function displayName(holder: Pick<HolderRow, "name" | "pseudonym" | "proxyWallet">): string {
  const name = String(holder.name || "").trim();
  if (name) return name;
  const pseudo = String(holder.pseudonym || "").trim();
  if (pseudo) return pseudo;
  return shortAddress(holder.proxyWallet);
}

function initials(label: string): string {
  const parts = label.replace(/[^\w\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function formatUsd(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const formatted =
    abs >= 1_000_000
      ? `${(abs / 1_000_000).toFixed(1)}M`
      : abs >= 10_000
        ? `${(abs / 1_000).toFixed(1)}K`
        : abs.toLocaleString(undefined, {
            maximumFractionDigits: digits,
            minimumFractionDigits: 0,
          });
  const sign = value < 0 ? "−" : "";
  return `${sign}$${formatted}`;
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

function formatShares(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function formatRank(rank: string | null | undefined): string {
  if (!rank) return "—";
  const n = Number(rank);
  if (!Number.isFinite(n)) return String(rank);
  return `#${n.toLocaleString()}`;
}

function outcomeLabelForIndex(
  market: HubPolymarketLiveDemoMarket,
  outcomeIndex: number,
  asset: string,
): string {
  const pairs = Array.isArray(market.outcomePairs) ? market.outcomePairs : [];
  for (const pair of pairs) {
    if (!pair || typeof pair !== "object") continue;
    const item = pair as { tokenId?: string; outcome?: string };
    if (String(item.tokenId || "") === asset && item.outcome) {
      return String(item.outcome);
    }
  }
  const outcomes = Array.isArray(market.outcomes)
    ? market.outcomes.map((name) => String(name).trim())
    : [];
  if (outcomes[outcomeIndex]) return outcomes[outcomeIndex];
  const tokenIds = Array.isArray(market.tokenIds)
    ? market.tokenIds.map((id) => String(id))
    : [];
  const tokenIdx = tokenIds.indexOf(asset);
  if (tokenIdx >= 0 && outcomes[tokenIdx]) return outcomes[tokenIdx];
  return outcomeIndex === 0 ? "Yes" : outcomeIndex === 1 ? "No" : `Outcome ${outcomeIndex + 1}`;
}

function isWhale(amount: number, peers: number[]): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  const total = peers.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
  if (total > 0 && amount / total >= WHALE_SHARE_FLOOR) return true;
  return amount >= WHALE_AMOUNT_FLOOR;
}

function avatarTone(seed: string): string {
  const tones = [
    "bg-emerald-500/20 text-emerald-300",
    "bg-sky-500/20 text-sky-300",
    "bg-amber-500/20 text-amber-300",
    "bg-rose-500/20 text-rose-300",
    "bg-violet-500/20 text-violet-300",
    "bg-teal-500/20 text-teal-300",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  return tones[hash % tones.length];
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof (payload as { message?: string })?.message === "string"
        ? (payload as { message: string }).message
        : "Request failed",
    );
  }
  return payload;
}

function flattenHoldersPayload(
  payload: unknown,
  market: HubPolymarketLiveDemoMarket,
): HolderRow[] {
  const arr = Array.isArray(payload) ? payload : payload != null ? [payload] : [];
  const rows: HolderRow[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const meta = item as Record<string, unknown>;
    if (meta.proxyWallet != null && !Array.isArray(meta.holders)) {
      const wallet = String(meta.proxyWallet || "").trim();
      if (!wallet) continue;
      const amount = Number(meta.amount);
      const outcomeIndex = Number(meta.outcomeIndex);
      const asset = String(meta.asset || meta.token || "").trim();
      rows.push({
        proxyWallet: wallet,
        name: String(meta.name || ""),
        pseudonym: String(meta.pseudonym || ""),
        profileImage: String(meta.profileImageOptimized || meta.profileImage || ""),
        amount: Number.isFinite(amount) ? amount : 0,
        outcomeIndex: Number.isFinite(outcomeIndex) ? outcomeIndex : 0,
        outcome: outcomeLabelForIndex(
          market,
          Number.isFinite(outcomeIndex) ? outcomeIndex : 0,
          asset,
        ),
        asset,
        verified: Boolean(meta.verified),
      });
      continue;
    }
    const token = String(meta.token || "").trim();
    const holders = Array.isArray(meta.holders) ? meta.holders : [];
    for (const holder of holders) {
      if (!holder || typeof holder !== "object") continue;
      const h = holder as Record<string, unknown>;
      const wallet = String(h.proxyWallet || "").trim();
      if (!wallet) continue;
      const amount = Number(h.amount);
      const outcomeIndex = Number(h.outcomeIndex);
      const asset = String(h.asset || token).trim();
      rows.push({
        proxyWallet: wallet,
        name: String(h.name || ""),
        pseudonym: String(h.pseudonym || ""),
        profileImage: String(h.profileImageOptimized || h.profileImage || ""),
        amount: Number.isFinite(amount) ? amount : 0,
        outcomeIndex: Number.isFinite(outcomeIndex) ? outcomeIndex : 0,
        outcome: outcomeLabelForIndex(
          market,
          Number.isFinite(outcomeIndex) ? outcomeIndex : 0,
          asset,
        ),
        asset,
        verified: Boolean(h.verified),
      });
    }
  }
  return rows.sort((a, b) => b.amount - a.amount);
}

async function enrichHolder(
  holder: HolderRow,
  conditionId: string,
  signal: AbortSignal,
): Promise<HolderEnrichment> {
  const enrichment: HolderEnrichment = {
    marketCashPnl: null,
    marketPercentPnl: null,
    marketCurrentValue: null,
    marketSize: null,
    leaderboardRank: null,
    leaderboardPnl: null,
    leaderboardVol: null,
    profileImage: holder.profileImage,
  };

  const positionParams = new URLSearchParams({
    query: "getCurrentPositions",
    user: holder.proxyWallet,
    market: conditionId,
    sizeThreshold: "0",
    limit: "20",
    skipFlatten: "true",
  });
  const leaderboardParams = new URLSearchParams({
    query: "getTraderLeaderboard",
    category: "OVERALL",
    timePeriod: "ALL",
    orderBy: "PNL",
    limit: "1",
    user: holder.proxyWallet,
    skipFlatten: "true",
  });

  const [positionsResult, leaderboardResult] = await Promise.allSettled([
    fetchJson(`/api/integrations/polymarket?${positionParams.toString()}`, signal),
    fetchJson(`/api/integrations/polymarket?${leaderboardParams.toString()}`, signal),
  ]);

  if (positionsResult.status === "fulfilled") {
    const rows = Array.isArray(positionsResult.value) ? positionsResult.value : [];
    const match =
      rows.find((row) => {
        if (!row || typeof row !== "object") return false;
        const item = row as Record<string, unknown>;
        return String(item.asset || "") === holder.asset;
      }) ||
      rows.find((row) => row && typeof row === "object") ||
      null;
    if (match && typeof match === "object") {
      const item = match as Record<string, unknown>;
      const cash = Number(item.cashPnl);
      const pct = Number(item.percentPnl);
      const value = Number(item.currentValue);
      const size = Number(item.size);
      enrichment.marketCashPnl = Number.isFinite(cash) ? cash : null;
      enrichment.marketPercentPnl = Number.isFinite(pct) ? pct : null;
      enrichment.marketCurrentValue = Number.isFinite(value) ? value : null;
      enrichment.marketSize = Number.isFinite(size) ? size : null;
    }
  }

  if (leaderboardResult.status === "fulfilled") {
    const rows = Array.isArray(leaderboardResult.value) ? leaderboardResult.value : [];
    const row = rows.find((item) => item && typeof item === "object") as
      | Record<string, unknown>
      | undefined;
    if (row) {
      enrichment.leaderboardRank =
        row.rank != null && String(row.rank).trim() ? String(row.rank) : null;
      const pnl = Number(row.pnl);
      const vol = Number(row.vol);
      enrichment.leaderboardPnl = Number.isFinite(pnl) ? pnl : null;
      enrichment.leaderboardVol = Number.isFinite(vol) ? vol : null;
      const image = String(row.profileImage || "").trim();
      if (image) enrichment.profileImage = image;
    }
  }

  return enrichment;
}

async function fetchOtherPositions(
  wallet: string,
  excludeConditionId: string,
  signal: AbortSignal,
): Promise<OtherPosition[]> {
  const params = new URLSearchParams({
    query: "getCurrentPositions",
    user: wallet,
    sizeThreshold: "1",
    limit: "50",
    sortBy: "CURRENT",
    sortDirection: "DESC",
    skipFlatten: "true",
  });
  const payload = await fetchJson(`/api/integrations/polymarket?${params.toString()}`, signal);
  const rows = Array.isArray(payload) ? payload : [];
  const out: OtherPosition[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const conditionId = String(item.conditionId || "").trim();
    if (conditionId && conditionId === excludeConditionId) continue;
    const size = Number(item.size);
    const currentValue = Number(item.currentValue);
    const cashPnl = Number(item.cashPnl);
    const percentPnl = Number(item.percentPnl);
    const curPrice = Number(item.curPrice);
    out.push({
      title: String(item.title || item.slug || "Market").trim() || "Market",
      outcome: String(item.outcome || "").trim() || "—",
      size: Number.isFinite(size) ? size : 0,
      currentValue: Number.isFinite(currentValue) ? currentValue : 0,
      cashPnl: Number.isFinite(cashPnl) ? cashPnl : 0,
      percentPnl: Number.isFinite(percentPnl) ? percentPnl : 0,
      curPrice: Number.isFinite(curPrice) ? curPrice : 0,
      icon: String(item.icon || "").trim(),
      conditionId,
    });
  }
  return out;
}

function HoldersSkeleton() {
  return (
    <div className="space-y-3 p-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-xl border border-border/50 bg-muted/20 p-3"
        >
          <div className="size-11 rounded-full bg-muted/70" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-muted/70" />
            <div className="h-2.5 w-2/3 rounded bg-muted/50" />
          </div>
          <div className="h-8 w-16 rounded bg-muted/60" />
        </div>
      ))}
    </div>
  );
}

function PnlText({ value, className }: { value: number | null; className?: string }) {
  const positive = value != null && value > 0;
  const negative = value != null && value < 0;
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        positive && "text-emerald-500",
        negative && "text-rose-500",
        value == null && "text-muted-foreground",
        className,
      )}
    >
      {formatUsd(value, 0)}
    </span>
  );
}

export function HubPolymarketLiveHoldersDemo({
  heading,
  helper,
  placeholder,
}: {
  heading?: string;
  helper?: string;
  placeholder?: string;
}) {
  const selection = useHubPolymarketLiveDemo();
  const markets = selection?.markets ?? [];
  const market = markets[0] || null;
  const conditionId = String(market?.conditionId || "").trim();
  const hasSelection = Boolean(market && conditionId);
  const marketsKey = markets
    .map((item) => String(item.conditionId || item.id || ""))
    .join(",");

  const [holders, setHolders] = useState<HolderRow[]>([]);
  const [enrichment, setEnrichment] = useState<Record<string, HolderEnrichment>>({});
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [otherPositions, setOtherPositions] = useState<OtherPosition[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionsError, setPositionsError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setHolders([]);
    setEnrichment({});
    setError(null);
    setOutcomeFilter("all");
    setSelectedWallet(null);
    setOtherPositions([]);
    setPositionsError(null);
    if (!hasSelection) setLoading(false);
  }, [hasSelection, marketsKey]);

  useEffect(() => {
    if (!hasSelection || !market || !conditionId) return undefined;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    setEnriching(false);

    const load = async () => {
      try {
        const params = new URLSearchParams({
          query: "getTopHolders",
          market: conditionId,
          limit: "20",
          minBalance: "1",
        });
        const payload = await fetchJson(
          `/api/integrations/polymarket?${params.toString()}`,
          ac.signal,
        );
        if (ac.signal.aborted) return;
        const rows = flattenHoldersPayload(payload, market).slice(0, HOLDERS_LIMIT);
        setHolders(rows);
        setLoading(false);
        if (!rows.length) return;

        setEnriching(true);
        const next: Record<string, HolderEnrichment> = {};
        for (let i = 0; i < rows.length; i += ENRICH_BATCH) {
          if (ac.signal.aborted) return;
          const batch = rows.slice(i, i + ENRICH_BATCH);
          const results = await Promise.all(
            batch.map(async (holder) => {
              try {
                const data = await enrichHolder(holder, conditionId, ac.signal);
                return [holder.proxyWallet, data] as const;
              } catch {
                return [
                  holder.proxyWallet,
                  {
                    marketCashPnl: null,
                    marketPercentPnl: null,
                    marketCurrentValue: null,
                    marketSize: null,
                    leaderboardRank: null,
                    leaderboardPnl: null,
                    leaderboardVol: null,
                    profileImage: holder.profileImage,
                  } satisfies HolderEnrichment,
                ] as const;
              }
            }),
          );
          for (const [wallet, data] of results) next[wallet] = data;
          if (!ac.signal.aborted) setEnrichment({ ...next });
        }
        if (!ac.signal.aborted) setEnriching(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (ac.signal.aborted) return;
        setHolders([]);
        setLoading(false);
        setEnriching(false);
        setError(err instanceof Error ? err.message : "Failed to load holders");
      }
    };

    void load();
    return () => ac.abort();
  }, [conditionId, hasSelection, market, marketsKey]);

  const outcomeOptions = useMemo(() => {
    const set = new Set(holders.map((holder) => holder.outcome).filter(Boolean));
    return ["all", ...set];
  }, [holders]);

  const visibleHolders = useMemo(() => {
    const filtered =
      outcomeFilter === "all"
        ? holders
        : holders.filter((holder) => holder.outcome === outcomeFilter);
    return filtered;
  }, [holders, outcomeFilter]);

  const peerAmountsByOutcome = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const holder of holders) {
      const list = map.get(holder.outcome) || [];
      list.push(holder.amount);
      map.set(holder.outcome, list);
    }
    return map;
  }, [holders]);

  const selectedHolder = useMemo(
    () => holders.find((holder) => holder.proxyWallet === selectedWallet) || null,
    [holders, selectedWallet],
  );

  const openHolder = useCallback(
    (wallet: string) => {
      setSelectedWallet(wallet);
      setOtherPositions([]);
      setPositionsError(null);
      setPositionsLoading(true);
      detailAbortRef.current?.abort();
      const ac = new AbortController();
      detailAbortRef.current = ac;
      void fetchOtherPositions(wallet, conditionId, ac.signal)
        .then((rows) => {
          if (ac.signal.aborted) return;
          setOtherPositions(rows);
          setPositionsLoading(false);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (ac.signal.aborted) return;
          setOtherPositions([]);
          setPositionsLoading(false);
          setPositionsError(err instanceof Error ? err.message : "Failed to load positions");
        });
    },
    [conditionId],
  );

  useEffect(() => {
    return () => detailAbortRef.current?.abort();
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
      <div className="shrink-0 space-y-1">
        {heading ? (
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{heading}</h3>
        ) : null}
        {helper ? (
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{helper}</p>
        ) : null}
      </div>

      {!hasSelection ? (
        <div className="flex min-h-[16rem] flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-sm text-muted-foreground">
            {placeholder || "Search for a Polymarket market to load this view."}
          </p>
          <HubInPageLink
            href={SEARCH_HREF}
            className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Select a market above
          </HubInPageLink>
        </div>
      ) : (
        <div
          className="flex min-h-[12rem] flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/20"
          role="region"
          aria-label="Market holders"
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">
                Top holders · {String(market?.title || "Selected market")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {loading || enriching ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  {loading ? "Loading…" : "Enriching…"}
                </span>
              ) : holders.length ? (
                <span className="text-xs text-muted-foreground">
                  {visibleHolders.length} holder{visibleHolders.length === 1 ? "" : "s"}
                </span>
              ) : null}
              {outcomeOptions.length > 2 ? (
                <div
                  className="inline-flex h-7 items-center rounded-md border border-border/70 bg-background p-0.5"
                  role="group"
                  aria-label="Filter by outcome"
                >
                  {outcomeOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setOutcomeFilter(option)}
                      className={cn(
                        "inline-flex h-6 items-center rounded px-2 text-[11px] font-medium transition-colors",
                        outcomeFilter === option
                          ? "bg-muted text-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      )}
                      aria-pressed={outcomeFilter === option}
                    >
                      {option === "all" ? "All" : option}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {error && !holders.length ? (
            <p className="px-3 py-4 text-sm text-destructive">{error}</p>
          ) : loading && !holders.length ? (
            <HoldersSkeleton />
          ) : !holders.length ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <Users className="size-8 text-muted-foreground/70" aria-hidden />
              <p className="text-sm text-muted-foreground">
                No visible holders for this market yet.
              </p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto p-2 sm:p-3">
              <ul className="space-y-2">
                {visibleHolders.map((holder, index) => {
                  const meta = enrichment[holder.proxyWallet];
                  const label = displayName(holder);
                  const image = meta?.profileImage || holder.profileImage;
                  const peers = peerAmountsByOutcome.get(holder.outcome) || [holder.amount];
                  const whale = isWhale(holder.amount, peers);
                  const marketPnl = meta?.marketCashPnl ?? null;
                  const overallPnl = meta?.leaderboardPnl ?? null;
                  return (
                    <li key={`${holder.proxyWallet}-${holder.asset}-${index}`}>
                      <div className="rounded-xl border border-border/60 bg-background/70 p-3 shadow-sm transition-colors hover:border-border hover:bg-background">
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            <Avatar className="size-11 ring-1 ring-border/60">
                              {image ? <AvatarImage src={image} alt="" /> : null}
                              <AvatarFallback
                                className={cn(
                                  "text-xs font-semibold",
                                  avatarTone(holder.proxyWallet),
                                )}
                              >
                                {initials(label)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="absolute -left-1 -top-1 inline-flex size-5 items-center justify-center rounded-full border border-border/70 bg-background text-[10px] font-semibold text-muted-foreground">
                              {index + 1}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openHolder(holder.proxyWallet)}
                                className="truncate text-left text-sm font-semibold text-foreground underline-offset-2 hover:underline"
                              >
                                {label}
                              </button>
                              {whale ? (
                                <Badge
                                  variant="secondary"
                                  className="h-5 gap-1 border-amber-500/30 bg-amber-500/15 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300"
                                >
                                  <Crown className="size-3" aria-hidden />
                                  Whale
                                </Badge>
                              ) : null}
                              <span className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {holder.outcome}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                              {shortAddress(holder.proxyWallet)}
                            </p>

                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <div className="rounded-lg bg-muted/30 px-2.5 py-2">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  Position
                                </p>
                                <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                                  {formatShares(meta?.marketSize ?? holder.amount)}
                                </p>
                              </div>
                              <div className="rounded-lg bg-muted/30 px-2.5 py-2">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  Market P&amp;L
                                </p>
                                <p className="mt-0.5 text-sm font-semibold">
                                  <PnlText value={marketPnl} />
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {formatPct(meta?.marketPercentPnl ?? null)}
                                </p>
                              </div>
                              <div className="rounded-lg bg-muted/30 px-2.5 py-2">
                                <p className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                                  <Trophy className="size-3" aria-hidden />
                                  Rank
                                </p>
                                <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                                  {formatRank(meta?.leaderboardRank)}
                                </p>
                              </div>
                              <div className="rounded-lg bg-muted/30 px-2.5 py-2">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  Overall P&amp;L
                                </p>
                                <p className="mt-0.5 text-sm font-semibold">
                                  <PnlText value={overallPnl} />
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      <Sheet
        open={Boolean(selectedWallet)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedWallet(null);
            detailAbortRef.current?.abort();
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full max-w-md overflow-y-auto border-border bg-background p-0 sm:max-w-md"
        >
          <div className="border-b border-border/60 px-5 py-4">
            <SheetHeader className="space-y-1 text-left">
              <SheetTitle className="text-base">
                {selectedHolder ? displayName(selectedHolder) : "Holder"}
              </SheetTitle>
              <SheetDescription className="font-mono text-[11px]">
                {selectedHolder ? shortAddress(selectedHolder.proxyWallet) : ""}
              </SheetDescription>
            </SheetHeader>
            {selectedHolder ? (
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-md border border-border/60 px-2 py-1">
                  This market: {selectedHolder.outcome}
                </span>
                <span className="rounded-md border border-border/60 px-2 py-1">
                  Size {formatShares(selectedHolder.amount)}
                </span>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 px-5 py-4">
            <p className="text-xs font-medium text-muted-foreground">
              Positions in other markets
            </p>
            {positionsLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading positions…
              </div>
            ) : positionsError ? (
              <p className="text-sm text-destructive">{positionsError}</p>
            ) : !otherPositions.length ? (
              <p className="py-8 text-sm text-muted-foreground">
                No other open positions found for this wallet.
              </p>
            ) : (
              <ul className="space-y-2">
                {otherPositions.map((position, index) => (
                  <li
                    key={`${position.conditionId}-${position.title}-${index}`}
                    className="rounded-xl border border-border/60 bg-muted/20 p-3"
                  >
                    <div className="flex items-start gap-3">
                      {position.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={position.icon}
                          alt=""
                          className="mt-0.5 size-9 shrink-0 rounded-md border border-border/50 object-cover"
                        />
                      ) : (
                        <div className="mt-0.5 size-9 shrink-0 rounded-md bg-muted/70" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium text-foreground">
                          {position.title}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {position.outcome} · {formatShares(position.size)} shares ·{" "}
                          {Math.round(position.curPrice * 100)}¢
                        </p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs">
                          <span>
                            Value{" "}
                            <span className="font-mono font-medium tabular-nums text-foreground">
                              {formatUsd(position.currentValue)}
                            </span>
                          </span>
                          <span>
                            P&amp;L <PnlText value={position.cashPnl} className="font-medium" />{" "}
                            <span className="text-muted-foreground">
                              ({formatPct(position.percentPnl)})
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
