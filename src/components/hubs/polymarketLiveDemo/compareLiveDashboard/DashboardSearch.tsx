"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Loader2, RefreshCw } from "lucide-react";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { PolymarketLiveSearch } from "@/components/connectData/polymarketLive/PolymarketLiveSearch";
import {
  featuredPolymarketMarketToDemoMarket,
  type HubPolymarketLiveDemoMarket,
} from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveDemoSelection";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchKalshiLiveMarket } from "@/lib/kalshiLive/fetchKalshiLiveMarket";
import { formatPolymarketVolume } from "@/lib/polymarketLive/polymarketPublicSearch";
import {
  findKalshiLiveMatchesForPolymarket,
  matchTierLabel,
} from "@/lib/predictionMarkets/matchPolymarketToKalshiLive";
import { findPolymarketLiveMatchesForKalshi } from "@/lib/predictionMarkets/matchKalshiToPolymarketLive";
import {
  polymarketRealtimeMarketFromSuggestion,
  polymarketRealtimeMarketKey,
  polymarketRealtimeMarketsFromEventSuggestion,
} from "@/lib/polymarketLive/polymarketRealtimeCompose";
import { cn } from "@/lib/utils";

import { KALSHI_GREEN, POLYMARKET_BLUE, type DashboardPair } from "./types";

type FeaturedPoly = {
  id: string;
  slug?: string;
  conditionId: string;
  title: string;
  volume24h: number | null;
  imageUrl?: string;
  featured?: boolean;
  outcomes: { tokenId: string; outcome: string; lastPrice: number | null }[];
};

type FeaturedKalshi = {
  ticker: string;
  title: string;
  lastPriceDollars: number | null;
  volume24h: number | null;
  imageUrl?: string;
  eventTitle?: string;
  seriesTicker?: string;
  tags?: string[];
  status?: string;
  closeTime?: string;
};

function formatCents(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}¢`;
}

function formatKalshiVol(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

type KalshiMatchCandidate = Awaited<
  ReturnType<typeof findKalshiLiveMatchesForPolymarket>
>["candidates"][number];
type PolyMatchCandidate = Awaited<
  ReturnType<typeof findPolymarketLiveMatchesForKalshi>
>["candidates"][number];

type YesNoLabels = { yes: string; no: string };

function formatMatchScore(score: number | null | undefined) {
  if (score == null || !Number.isFinite(score)) return "—";
  return `${Math.round(Math.max(0, Math.min(1, score)) * 100)}% match`;
}

function outcomeCompareKey(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(wins?|will|the|a|an|yes|no|price|up|down)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function yesOutcomesLikelySame(parentYes: string, childYes: string) {
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

function preferredChildSide(parentYes: string, child: YesNoLabels): "yes" | "no" {
  const yesAligned = yesOutcomesLikelySame(parentYes, child.yes);
  const noAligned = yesOutcomesLikelySame(parentYes, child.no);
  if (!yesAligned && noAligned) return "no";
  return "yes";
}

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
  if (labels.length >= 2) return { yes: labels[0]!, no: labels[1]! };
  if (labels.length === 1) return { yes: labels[0]!, no: `Not ${labels[0]}` };
  return { yes: "Yes", no: "No" };
}

function kalshiYesNoLabels(
  market: Record<string, unknown> | null | undefined,
  fallbackTitle?: string,
): YesNoLabels {
  const yesSub = String(
    market?.yes_sub_title || market?.yes_subtitle || market?.yesSubtitle || "",
  ).trim();
  const noSub = String(
    market?.no_sub_title || market?.no_subtitle || market?.noSubtitle || "",
  ).trim();
  const title = String(market?.title || fallbackTitle || "").trim();
  if (yesSub) {
    const distinctNo = noSub && noSub.toLowerCase() !== yesSub.toLowerCase() ? noSub : "";
    return { yes: yesSub, no: distinctNo || `Not: ${yesSub}` };
  }
  if (title) {
    const parts = title.split(/\s[—–-]\s/).map((part) => part.trim()).filter(Boolean);
    const yesFromTitle = (parts.length > 1 ? parts[parts.length - 1] : title).replace(/\?\s*$/, "");
    return { yes: yesFromTitle, no: "No" };
  }
  return { yes: "Yes", no: "No" };
}

function distinctKalshiText(value: string, seen: string[]) {
  const text = value.trim();
  if (!text) return false;
  const key = text.toLowerCase();
  return !seen.some((item) => item.trim().toLowerCase() === key);
}

function kalshiCandidateContext(market: KalshiMatchCandidate["market"] | null | undefined) {
  if (!market) {
    return { heading: "", outcome: "", displayTitle: "", category: "", closes: "" };
  }
  const strike = String(market.yesSubtitle || "").trim();
  const eventTitle = String(market.eventTitle || "").trim();
  const seriesTitle = String(market.suggestionTitle || "").trim();
  const rawTitle = String(
    market.raw && typeof market.raw === "object" ? (market.raw as { title?: unknown }).title || "" : "",
  ).trim();
  const heading =
    (distinctKalshiText(eventTitle, [strike]) && eventTitle) ||
    (distinctKalshiText(seriesTitle, [strike, eventTitle]) && seriesTitle) ||
    (distinctKalshiText(rawTitle, [strike, eventTitle, seriesTitle]) && rawTitle) ||
    strike ||
    String(market.title || "").trim() ||
    market.marketTicker;
  const headingLower = heading.toLowerCase();
  const outcome =
    distinctKalshiText(strike, [heading]) && !headingLower.includes(strike.toLowerCase())
      ? strike
      : "";
  const closeMs = Date.parse(String(market.closeTime || ""));
  const closes = Number.isFinite(closeMs)
    ? new Date(closeMs).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "";
  return {
    heading,
    outcome,
    displayTitle: outcome ? `${heading} — ${outcome}` : heading,
    category: String(market.category || "").trim(),
    closes,
  };
}

function isUnlistedMarketError(err: unknown) {
  const extra = err && typeof err === "object" ? (err as { status?: number }) : {};
  const status = Number(extra.status);
  const raw = err instanceof Error ? err.message : String(err || "");
  if (status === 404) return true;
  return /does not exist|no longer listed|not found|not_found/i.test(raw);
}

async function filterListedKalshiCandidates(
  candidates: KalshiMatchCandidate[],
  signal: AbortSignal,
) {
  const toCheck = candidates.slice(0, 8);
  const results = await Promise.all(
    toCheck.map(async (candidate) => {
      try {
        await fetchKalshiLiveMarket({
          marketTicker: candidate.market.marketTicker,
          signal,
        });
        return candidate;
      } catch (err) {
        if (signal.aborted || (err instanceof DOMException && err.name === "AbortError")) throw err;
        if (isUnlistedMarketError(err)) return null;
        return candidate;
      }
    }),
  );
  return results.filter((row): row is KalshiMatchCandidate => Boolean(row));
}

function asPolyDemo(
  market: Record<string, unknown> | HubPolymarketLiveDemoMarket | null | undefined,
): HubPolymarketLiveDemoMarket | null {
  if (!market) return null;
  const tokenIds = (market as HubPolymarketLiveDemoMarket).tokenIds;
  if (Array.isArray(tokenIds) && tokenIds.length) return market as HubPolymarketLiveDemoMarket;
  return featuredPolymarketMarketToDemoMarket(market as Record<string, unknown>);
}

function CompareMatchPills({
  score,
  tier,
}: {
  score: number;
  tier: "exact" | "close" | "related" | "none";
}) {
  return (
    <>
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
        {formatMatchScore(score)}
      </span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
          tier === "exact"
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            : tier === "close"
              ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
        )}
      >
        {matchTierLabel(tier)}
      </span>
    </>
  );
}

function GateOption({
  selected,
  title,
  onSelect,
  children,
}: {
  selected: boolean;
  title: string;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col rounded-2xl border p-4 text-left transition-colors",
        selected
          ? "border-secondary bg-secondary/10 ring-2 ring-secondary/40"
          : "border-border/70 bg-background hover:border-border hover:bg-muted/40",
      )}
    >
      <input
        type="radio"
        name="dashboard-gate-choice"
        className="sr-only"
        checked={selected}
        onChange={onSelect}
      />
      <span className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
            selected
              ? "border-secondary bg-secondary text-primary-foreground"
              : "border-muted-foreground/40 bg-background text-transparent",
          )}
          aria-hidden
        >
          <Check className="size-3 stroke-[2.5]" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{title}</span>
        {selected ? (
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
            Selected
          </span>
        ) : null}
      </span>
      <span className="mt-3 block">{children}</span>
    </label>
  );
}

export function DashboardGate({
  pair,
  onKeep,
  onNewSearch,
}: {
  pair: DashboardPair;
  onKeep: () => void;
  onNewSearch: () => void;
}) {
  const [choice, setChoice] = useState<"keep" | "new">("keep");
  const [suggestions, setSuggestions] = useState<{ venue: "Kalshi" | "Polymarket"; title: string }[]>(
    [],
  );

  const current = pair.matchFromKalshi
    ? [
        {
          venue: "Kalshi" as const,
          color: KALSHI_GREEN,
          title: pair.kalshiTitle,
          meta: pair.kalshiTicker,
        },
        {
          venue: "Polymarket" as const,
          color: POLYMARKET_BLUE,
          title: pair.polyTitle,
          meta: String(pair.polyMarket.slug || pair.polyMarket.id || ""),
        },
      ]
    : [
        {
          venue: "Polymarket" as const,
          color: POLYMARKET_BLUE,
          title: pair.polyTitle,
          meta: String(pair.polyMarket.slug || pair.polyMarket.id || ""),
        },
        {
          venue: "Kalshi" as const,
          color: KALSHI_GREEN,
          title: pair.kalshiTitle,
          meta: pair.kalshiTicker,
        },
      ];

  useEffect(() => {
    const ac = new AbortController();
    const skip = new Set(
      [pair.kalshiTitle, pair.polyTitle, pair.kalshiTicker, String(pair.polyMarket.slug || "")]
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    );

    async function load() {
      try {
        const [polyRes, kalshiRes] = await Promise.all([
          fetch("/api/integrations/polymarket-live/markets/featured?limit=6", {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
            signal: ac.signal,
          }),
          fetch("/api/integrations/kalshi-live/markets/featured?limit=6&source=discovery&v=3", {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
            signal: ac.signal,
          }),
        ]);
        const polyBody = await polyRes.json().catch(() => ({}));
        const kalshiBody = await kalshiRes.json().catch(() => ({}));
        const poly = (Array.isArray(polyBody?.markets) ? polyBody.markets : [])
          .map((row: Record<string, unknown>) => String(row.title || "").trim())
          .filter((title: string) => title && !skip.has(title.toLowerCase()));
        const kalshi = (Array.isArray(kalshiBody?.markets) ? kalshiBody.markets : [])
          .map((row: Record<string, unknown>) => String(row.title || "").trim())
          .filter((title: string) => title && !skip.has(title.toLowerCase()));
        const mixed: { venue: "Kalshi" | "Polymarket"; title: string }[] = [];
        for (let i = 0; i < 3; i += 1) {
          if (poly[i]) mixed.push({ venue: "Polymarket", title: poly[i] });
          if (kalshi[i]) mixed.push({ venue: "Kalshi", title: kalshi[i] });
        }
        if (!ac.signal.aborted) setSuggestions(mixed.slice(0, 4));
      } catch {
        if (!ac.signal.aborted) setSuggestions([]);
      }
    }

    void load();
    return () => ac.abort();
  }, [pair.kalshiTicker, pair.kalshiTitle, pair.polyMarket.slug, pair.polyTitle]);

  return (
    <div className="grid h-full min-h-0 w-full flex-1 place-items-center px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center">
        <div className="space-y-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-secondary">
            Live dashboard
          </p>
          <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
            Use the markets you already have open?
          </h2>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            You’re already comparing these contracts. Open them as a live workspace, or start a
            fresh search.
          </p>
        </div>
        <div
          className="grid w-full gap-3 sm:grid-cols-2"
          role="radiogroup"
          aria-label="Choose how to start the live dashboard"
        >
          <GateOption
            selected={choice === "keep"}
            title="Keep this comparison"
            onSelect={() => setChoice("keep")}
          >
            <span className="block text-left">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Currently selected
              </span>
              <span className="mt-2 flex flex-col gap-2">
                {current.map((row) => (
                  <span key={`${row.venue}-${row.meta || row.title}`} className="block">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: row.color }}
                    >
                      {row.venue}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[12px] font-medium leading-snug text-foreground">
                      {row.title}
                    </span>
                    {row.meta ? (
                      <span className="mt-0.5 line-clamp-1 block font-mono text-[10px] text-muted-foreground">
                        {row.meta}
                      </span>
                    ) : null}
                  </span>
                ))}
              </span>
            </span>
          </GateOption>
          <GateOption
            selected={choice === "new"}
            title="Make a new search"
            onSelect={() => setChoice("new")}
          >
            <span className="block text-left">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Suggested markets
              </span>
              <span className="mt-2 flex flex-col gap-1.5">
                {suggestions.length ? (
                  suggestions.map((row) => (
                    <span key={`${row.venue}-${row.title}`} className="block">
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          color: row.venue === "Kalshi" ? KALSHI_GREEN : POLYMARKET_BLUE,
                        }}
                      >
                        {row.venue}
                      </span>
                      <span className="line-clamp-1 block text-[12px] leading-snug text-muted-foreground">
                        {row.title}
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="block text-[12px] leading-relaxed text-muted-foreground">
                    Pick another Kalshi or Polymarket market and we’ll match the other venue.
                  </span>
                )}
              </span>
            </span>
          </GateOption>
        </div>
        <Button
          type="button"
          className="h-10 rounded-full px-6"
          onClick={() => (choice === "keep" ? onKeep() : onNewSearch())}
        >
          {choice === "keep" ? "Continue with this comparison" : "Search for a new market"}
        </Button>
      </div>
    </div>
  );
}

export function DashboardSearch({
  onReady,
}: {
  onReady: (pair: DashboardPair) => void;
}) {
  const [error, setError] = useState("");
  const [matching, setMatching] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState("");
  const [polyFeatured, setPolyFeatured] = useState<FeaturedPoly[]>([]);
  const [kalshiFeatured, setKalshiFeatured] = useState<FeaturedKalshi[]>([]);
  const [polyLoading, setPolyLoading] = useState(true);
  const [kalshiLoading, setKalshiLoading] = useState(true);
  const [eventPicker, setEventPicker] = useState<{
    title: string;
    markets: HubPolymarketLiveDemoMarket[];
  } | null>(null);
  const [eventPickKey, setEventPickKey] = useState("");
  const [pendingPoly, setPendingPoly] = useState<HubPolymarketLiveDemoMarket | null>(null);
  const [pendingKalshi, setPendingKalshi] = useState<{ ticker: string; title: string } | null>(null);
  const [kalshiCandidates, setKalshiCandidates] = useState<KalshiMatchCandidate[]>([]);
  const [polyCandidates, setPolyCandidates] = useState<PolyMatchCandidate[]>([]);
  const [selectedKalshiTicker, setSelectedKalshiTicker] = useState("");
  const [selectedPolyKey, setSelectedPolyKey] = useState("");
  const [childSide, setChildSide] = useState<"yes" | "no">("yes");
  const [kalshiQuery, setKalshiQuery] = useState("");
  const matchAbort = useRef<AbortController | null>(null);

  const pairing = Boolean(pendingPoly || pendingKalshi);
  const matchFromKalshi = Boolean(pendingKalshi && !pendingPoly);

  const resetPairing = useCallback(() => {
    matchAbort.current?.abort();
    setPendingPoly(null);
    setPendingKalshi(null);
    setKalshiCandidates([]);
    setPolyCandidates([]);
    setSelectedKalshiTicker("");
    setSelectedPolyKey("");
    setChildSide("yes");
    setEmptyMessage("");
    setError("");
    setMatching(false);
    setKalshiQuery("");
  }, []);

  const loadPoly = useCallback(async () => {
    setPolyLoading(true);
    try {
      const res = await fetch("/api/integrations/polymarket-live/markets/featured?limit=12", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const body = await res.json().catch(() => ({}));
      const parsed = (Array.isArray(body?.markets) ? body.markets : [])
        .map((row: Record<string, unknown>) => {
          const outcomes = Array.isArray(row.outcomes)
            ? row.outcomes
                .map((item) => {
                  if (!item || typeof item !== "object") return null;
                  const tokenId = String((item as { tokenId?: string }).tokenId || "").trim();
                  if (!tokenId) return null;
                  return {
                    tokenId,
                    outcome: String((item as { outcome?: string }).outcome || "Yes"),
                    lastPrice:
                      (item as { lastPrice?: number }).lastPrice != null
                        ? Number((item as { lastPrice?: number }).lastPrice)
                        : null,
                  };
                })
                .filter(Boolean)
            : [];
          const id = String(row.id || row.conditionId || row.slug || "").trim();
          const title = String(row.title || "").trim() || id;
          if (!id || !title || !outcomes.length) return null;
          return {
            id,
            slug: String(row.slug || "") || undefined,
            conditionId: String(row.conditionId || id),
            title,
            volume24h: Number.isFinite(Number(row.volume24h)) ? Number(row.volume24h) : null,
            imageUrl: String(row.imageUrl || "") || undefined,
            featured: row.featured === true,
            outcomes,
          } satisfies FeaturedPoly;
        })
        .filter(Boolean) as FeaturedPoly[];
      setPolyFeatured(parsed.slice(0, 6));
    } catch {
      setPolyFeatured([]);
    } finally {
      setPolyLoading(false);
    }
  }, []);

  const loadKalshi = useCallback(async () => {
    setKalshiLoading(true);
    try {
      const res = await fetch(
        "/api/integrations/kalshi-live/markets/featured?limit=6&source=discovery&v=3",
        { credentials: "same-origin", headers: { Accept: "application/json" } },
      );
      const body = await res.json().catch(() => ({}));
      const parsed = (Array.isArray(body?.markets) ? body.markets : [])
        .map((row: Record<string, unknown>) => {
          const ticker = String(row.ticker || "").trim().toUpperCase();
          const title = String(row.title || row.subtitle || ticker).trim();
          if (!ticker || !title) return null;
          const tags = Array.isArray(row.tags)
            ? row.tags.map((tag) => String(tag || "").trim()).filter(Boolean)
            : [];
          return {
            ticker,
            title,
            lastPriceDollars: Number.isFinite(Number(row.lastPriceDollars))
              ? Number(row.lastPriceDollars)
              : null,
            volume24h: Number.isFinite(Number(row.volume24h)) ? Number(row.volume24h) : null,
            imageUrl: String(row.imageUrl || "") || undefined,
            eventTitle: String(row.eventTitle || "").trim() || undefined,
            seriesTicker: String(row.seriesTicker || "").trim() || undefined,
            tags: tags.length ? tags : undefined,
            status: String(row.status || "").trim() || undefined,
            closeTime: String(row.closeTime || "").trim() || undefined,
          } satisfies FeaturedKalshi;
        })
        .filter(Boolean) as FeaturedKalshi[];
      setKalshiFeatured(parsed.slice(0, 6));
    } catch {
      setKalshiFeatured([]);
    } finally {
      setKalshiLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPoly();
    void loadKalshi();
  }, [loadKalshi, loadPoly]);

  useEffect(() => {
    return () => matchAbort.current?.abort();
  }, []);

  const selectedKalshi = kalshiCandidates.find((row) => row.market.marketTicker === selectedKalshiTicker);
  const selectedPoly = polyCandidates.find(
    (row) => polymarketRealtimeMarketKey(row.market as HubPolymarketLiveDemoMarket) === selectedPolyKey,
  );
  const selectedPolyMarket = asPolyDemo(selectedPoly?.market) || (matchFromKalshi ? null : pendingPoly);

  const parentYes = matchFromKalshi
    ? kalshiYesNoLabels(pendingKalshi as unknown as Record<string, unknown>, pendingKalshi?.title).yes
    : polymarketYesNoLabels(pendingPoly as unknown as Record<string, unknown>).yes;
  const counterpartLabels = matchFromKalshi
    ? polymarketYesNoLabels(selectedPolyMarket as unknown as Record<string, unknown>)
    : kalshiYesNoLabels(selectedKalshi?.market, selectedKalshi?.market.title);

  useEffect(() => {
    if (!pairing) return;
    if (matchFromKalshi) {
      if (!selectedPolyMarket) {
        setChildSide("yes");
        return;
      }
      setChildSide(preferredChildSide(parentYes, counterpartLabels));
      return;
    }
    if (!selectedKalshi) {
      setChildSide("yes");
      return;
    }
    setChildSide(preferredChildSide(parentYes, counterpartLabels));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- align when the chosen counterpart changes
  }, [pairing, matchFromKalshi, selectedKalshiTicker, selectedPolyKey, pendingPoly, pendingKalshi]);

  const startFromPoly = useCallback(
    async (market: HubPolymarketLiveDemoMarket) => {
      matchAbort.current?.abort();
      const ac = new AbortController();
      matchAbort.current = ac;
      setPendingPoly(market);
      setPendingKalshi(null);
      setPolyCandidates([]);
      setSelectedPolyKey("");
      setKalshiCandidates([]);
      setSelectedKalshiTicker("");
      setChildSide("yes");
      setError("");
      setEmptyMessage("");
      setKalshiQuery("");
      setMatching(true);
      try {
        const result = await findKalshiLiveMatchesForPolymarket(market, { signal: ac.signal });
        if (ac.signal.aborted) return;
        const listed = await filterListedKalshiCandidates(result.candidates, ac.signal);
        if (ac.signal.aborted) return;
        setKalshiCandidates(listed);
        setEmptyMessage(listed.length ? "" : result.emptyMessage || "");
        const preselectedTicker = result.preselected?.market.marketTicker;
        const preselected = preselectedTicker
          ? listed.find((row) => row.market.marketTicker === preselectedTicker)
          : null;
        if (preselected) setSelectedKalshiTicker(preselected.market.marketTicker);
        else if (listed.length === 1) setSelectedKalshiTicker(listed[0]!.market.marketTicker);
      } catch (err) {
        if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
        setError(err instanceof Error ? err.message : "Match search failed");
        setKalshiCandidates([]);
      } finally {
        if (!ac.signal.aborted) setMatching(false);
      }
    },
    [],
  );

  const startFromKalshi = useCallback(async (market: FeaturedKalshi | { ticker: string; title: string }) => {
    const next = String(market.ticker || "").trim().toUpperCase();
    if (!next) return;
    const title = String(market.title || next).trim() || next;
    matchAbort.current?.abort();
    const ac = new AbortController();
    matchAbort.current = ac;
    setPendingKalshi({ ticker: next, title });
    setPendingPoly(null);
    setKalshiCandidates([]);
    setSelectedKalshiTicker(next);
    setPolyCandidates([]);
    setSelectedPolyKey("");
    setChildSide("yes");
    setError("");
    setEmptyMessage("");
    setKalshiQuery("");
    setMatching(true);
    try {
      const extra = market as FeaturedKalshi;
      const result = await findPolymarketLiveMatchesForKalshi(
        {
          ticker: next,
          title,
          eventTitle: extra.eventTitle,
          seriesTicker: extra.seriesTicker,
          tags: extra.tags,
        },
        { signal: ac.signal },
      );
      if (ac.signal.aborted) return;
      setPolyCandidates(result.candidates);
      setEmptyMessage(result.emptyMessage || "");
      const preselected = asPolyDemo(result.preselected?.market);
      const only = result.candidates.length === 1 ? asPolyDemo(result.candidates[0]?.market) : null;
      const pick = preselected || only;
      if (pick) setSelectedPolyKey(polymarketRealtimeMarketKey(pick));
    } catch (err) {
      if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
      setError(err instanceof Error ? err.message : "Match search failed");
      setPolyCandidates([]);
    } finally {
      if (!ac.signal.aborted) setMatching(false);
    }
  }, []);

  const applyKalshiMatch = useCallback((ticker: string, title?: string) => {
    const next = ticker.trim().toUpperCase();
    if (!next) return;
    setSelectedKalshiTicker(next);
    setEmptyMessage("");
    setError("");
    if (!title) return;
    setKalshiCandidates((prev) => {
      if (prev.some((row) => row.market.marketTicker === next)) return prev;
      return [
        {
          market: { marketTicker: next, title, raw: {} },
          score: 0.5,
          tier: "related" as const,
          reasons: ["Manually selected"],
          warnings: ["Manual selection — verify event, resolution window, and settlement rules"],
        },
        ...prev,
      ];
    });
  }, []);

  const applyPolyMatch = useCallback((market: HubPolymarketLiveDemoMarket) => {
    const demo = asPolyDemo(market);
    if (!demo) {
      setError("Pick a market with outcome tokens.");
      return;
    }
    setSelectedPolyKey(polymarketRealtimeMarketKey(demo));
    setEmptyMessage("");
    setError("");
    setPolyCandidates((prev) => {
      const key = polymarketRealtimeMarketKey(demo);
      if (prev.some((row) => polymarketRealtimeMarketKey(row.market as HubPolymarketLiveDemoMarket) === key)) {
        return prev;
      }
      return [
        {
          market: demo,
          score: 0.5,
          tier: "related" as const,
          reasons: ["Manually selected"],
        } as PolyMatchCandidate,
        ...prev,
      ];
    });
  }, []);

  const handlePolySuggestion = useCallback(
    (suggestion: Record<string, unknown>) => {
      setError("");
      const entity = String(suggestion?.entity || "");
      if (entity === "event") {
        const nested = polymarketRealtimeMarketsFromEventSuggestion(
          suggestion,
        ) as HubPolymarketLiveDemoMarket[];
        if (!nested.length) {
          setError("That event has no streamable markets.");
          return;
        }
        if (nested.length === 1) {
          if (matchFromKalshi) applyPolyMatch(nested[0]!);
          else void startFromPoly(nested[0]!);
          return;
        }
        setEventPickKey("");
        setEventPicker({
          title: String(suggestion.title || "Select event markets"),
          markets: nested,
        });
        return;
      }
      const market = polymarketRealtimeMarketFromSuggestion(suggestion) as HubPolymarketLiveDemoMarket | null;
      if (!market) {
        setError("Pick a market with outcome tokens.");
        return;
      }
      if (matchFromKalshi) applyPolyMatch(market);
      else void startFromPoly(market);
    },
    [applyPolyMatch, matchFromKalshi, startFromPoly],
  );

  const confirmPair = useCallback(() => {
    const poly = matchFromKalshi ? selectedPolyMarket : pendingPoly;
    const kalshiTicker = matchFromKalshi ? pendingKalshi?.ticker : selectedKalshiTicker;
    const kalshiTitle = matchFromKalshi
      ? pendingKalshi?.title || pendingKalshi?.ticker || ""
      : kalshiCandidateContext(selectedKalshi?.market).displayTitle ||
        selectedKalshi?.market.title ||
        selectedKalshiTicker;
    if (!poly || !kalshiTicker) return;
    onReady({
      kalshiTicker,
      kalshiTitle,
      polyMarket: poly,
      polyTitle: String(poly.title || poly.slug || "Polymarket"),
      childSide,
      matchFromKalshi,
    });
  }, [
    childSide,
    matchFromKalshi,
    onReady,
    pendingKalshi,
    pendingPoly,
    selectedKalshi,
    selectedKalshiTicker,
    selectedPolyMarket,
  ]);

  const canOpen = Boolean(
    matchFromKalshi ? pendingKalshi && selectedPolyMarket : pendingPoly && selectedKalshiTicker,
  );

  const polySearch = (
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
        const first =
          suggestions.find((row) => row?.entity === "market") ||
          suggestions.find((row) => row?.entity === "event");
        if (first) handlePolySuggestion(first);
      }}
    />
  );

  const kalshiSearch = (
    <MarketTickerSearch
      value={kalshiQuery}
      onChange={setKalshiQuery}
      onSelectionsChange={(selections) => {
        const s = selections?.[0];
        const ticker = String(s?.ticker || "").trim().toUpperCase();
        if (!ticker) return;
        const title = String(s?.title || ticker);
        if (pendingPoly) applyKalshiMatch(ticker, title);
        else void startFromKalshi({ ticker, title });
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
  );

  const selectedEventMarket =
    eventPicker?.markets.find((market) => polymarketRealtimeMarketKey(market) === eventPickKey) || null;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-1 flex-col space-y-5 px-4 py-8">
      <div className="space-y-2 text-center">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-secondary">
          Build a live dashboard
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {pairing ? "Confirm the matching market" : "Search a market, then we’ll assemble the rest"}
        </h2>
        <p className="text-pretty text-sm text-muted-foreground">
          {pairing
            ? "Same Kalshi vs Polymarket flow. Review scored matches, search for a closer contract, reverse YES/NO if needed, then open the dashboard."
            : "Choose a contract and we’ll match the other venue. You can search, pick an event market, and reverse YES/NO before the live view opens."}
        </p>
      </div>

      {!pairing ? (
        <div className="mx-auto grid w-full max-w-2xl gap-2">
          {polySearch}
          {kalshiSearch}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <FeaturedCol
          label="Polymarket"
          loading={!pairing && polyLoading}
          onRefresh={pairing ? undefined : () => void loadPoly()}
          accent={POLYMARKET_BLUE}
        >
          {pendingPoly ? (
            <SelectedMarketCard
              title={String(pendingPoly.title || pendingPoly.slug || "Polymarket")}
              meta={String(pendingPoly.slug || pendingPoly.id || "")}
              labels={polymarketYesNoLabels(pendingPoly as unknown as Record<string, unknown>)}
              onChange={resetPairing}
            />
          ) : matchFromKalshi ? (
            <div className="space-y-2">
              {polySearch}
              {matching ? (
                <p className="flex items-center gap-2 px-1 py-2 text-[12px] text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Searching Polymarket for a match…
                </p>
              ) : null}
              {polyCandidates.length ? (
                <div className="grid gap-1.5">
                  {polyCandidates.slice(0, 6).map((candidate) => {
                    const market = asPolyDemo(candidate.market);
                    if (!market) return null;
                    const key = polymarketRealtimeMarketKey(market);
                    const selected = key === selectedPolyKey;
                    const labels = polymarketYesNoLabels(market as unknown as Record<string, unknown>);
                    const aligned = yesOutcomesLikelySame(parentYes, labels.yes);
                    return (
                      <label
                        key={key}
                        className={cn(
                          "flex cursor-pointer items-start gap-2 rounded-lg border p-2 transition-colors",
                          selected
                            ? "border-[#2E5CFF]/50 bg-[#2E5CFF]/10"
                            : "border-border/60 bg-background hover:bg-muted/30",
                        )}
                      >
                        <input
                          type="radio"
                          name="dashboard-poly-match"
                          className="mt-0.5 size-3.5 accent-[#2E5CFF]"
                          checked={selected}
                          onChange={() => applyPolyMatch(market)}
                        />
                        <span className="min-w-0 flex-1 space-y-0.5">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-medium text-foreground">
                              {String(market.title || market.slug || "Market")}
                            </span>
                            <CompareMatchPills score={candidate.score} tier={candidate.tier} />
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            YES = {labels.yes} · NO = {labels.no}
                          </span>
                          {!aligned ? (
                            <span className="block text-[11px] text-amber-700 dark:text-amber-300">
                              YES on this market is {labels.yes}, not the parent YES ({parentYes}). Reverse
                              YES/NO below if that’s a closer match.
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : !matching ? (
                <p className="px-1 py-2 text-[12px] leading-relaxed text-muted-foreground">
                  {emptyMessage ||
                    "Select a Polymarket market. No automatic match yet — search by name or ticker."}
                </p>
              ) : null}
            </div>
          ) : (
            polyFeatured.map((market) => (
              <button
                key={market.id}
                type="button"
                disabled={matching}
                onClick={() => {
                  const demo = featuredPolymarketMarketToDemoMarket(market);
                  if (demo) void startFromPoly(demo);
                }}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-left hover:bg-muted/40"
              >
                <p className="line-clamp-2 text-[13px] font-medium text-foreground">{market.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatCents(market.outcomes[0]?.lastPrice)} · {formatPolymarketVolume(market.volume24h) || "—"}
                </p>
              </button>
            ))
          )}
        </FeaturedCol>
        <FeaturedCol
          label="Kalshi"
          loading={!pairing && kalshiLoading}
          onRefresh={pairing ? undefined : () => void loadKalshi()}
          accent={KALSHI_GREEN}
        >
          {pendingKalshi && !pendingPoly ? (
            <SelectedMarketCard
              title={pendingKalshi.title}
              meta={pendingKalshi.ticker}
              labels={kalshiYesNoLabels(pendingKalshi as unknown as Record<string, unknown>, pendingKalshi.title)}
              onChange={resetPairing}
            />
          ) : pendingPoly ? (
            <div className="space-y-2">
              {kalshiSearch}
              {matching ? (
                <p className="flex items-center gap-2 px-1 py-2 text-[12px] text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Searching Kalshi for a match…
                </p>
              ) : null}
              {kalshiCandidates.length ? (
                <div className="grid gap-1.5">
                  {kalshiCandidates.slice(0, 6).map((candidate) => {
                    const selected = candidate.market.marketTicker === selectedKalshiTicker;
                    const labels = kalshiYesNoLabels(candidate.market, candidate.market.title);
                    const aligned = yesOutcomesLikelySame(parentYes, labels.yes);
                    const context = kalshiCandidateContext(candidate.market);
                    return (
                      <label
                        key={candidate.market.marketTicker}
                        className={cn(
                          "flex cursor-pointer items-start gap-2 rounded-lg border p-2 transition-colors",
                          selected
                            ? "border-[#28CC95]/50 bg-[#28CC95]/10"
                            : "border-border/60 bg-background hover:bg-muted/30",
                        )}
                      >
                        <input
                          type="radio"
                          name="dashboard-kalshi-match"
                          className="mt-0.5 size-3.5 accent-[#28CC95]"
                          checked={selected}
                          onChange={() =>
                            applyKalshiMatch(candidate.market.marketTicker, context.displayTitle)
                          }
                        />
                        <span className="min-w-0 flex-1 space-y-0.5">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-medium leading-snug text-foreground">
                              {context.heading}
                            </span>
                            <CompareMatchPills score={candidate.score} tier={candidate.tier} />
                          </span>
                          {context.outcome ? (
                            <span className="block text-[12px] font-medium text-foreground/90">
                              {context.outcome}
                            </span>
                          ) : null}
                          <span className="block font-mono text-[10px] text-muted-foreground">
                            {candidate.market.marketTicker}
                            {context.category ? ` · ${context.category}` : ""}
                            {context.closes ? ` · Closes ${context.closes}` : ""}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            YES = {labels.yes} · NO = {labels.no}
                          </span>
                          {!aligned ? (
                            <span className="block text-[11px] text-amber-700 dark:text-amber-300">
                              YES on this market is {labels.yes}, not the parent YES ({parentYes}). Reverse
                              YES/NO below if that’s a closer match.
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : !matching ? (
                <p className="px-1 py-2 text-[12px] leading-relaxed text-muted-foreground">
                  {emptyMessage ||
                    "Select a Kalshi market. No automatic match yet — search by name or ticker."}
                </p>
              ) : null}
            </div>
          ) : (
            kalshiFeatured.map((market) => (
              <button
                key={market.ticker}
                type="button"
                disabled={matching}
                onClick={() => void startFromKalshi(market)}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-left hover:bg-muted/40"
              >
                <p className="line-clamp-2 text-[13px] font-medium text-foreground">{market.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatCents(market.lastPriceDollars)} · {formatKalshiVol(market.volume24h)}
                </p>
              </button>
            ))
          )}
        </FeaturedCol>
      </div>

      {pairing && canOpen ? (
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2.5">
            <p className="text-[11px] text-muted-foreground">Match parent YES to</p>
            <div
              className="inline-flex h-7 max-w-full items-center rounded-md border border-border/70 bg-muted/40 p-0.5"
              role="group"
              aria-label="Child market side to compare"
            >
              {(["yes", "no"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={childSide === id}
                  onClick={() => setChildSide(id)}
                  className={cn(
                    "h-6 max-w-[11rem] truncate rounded px-2 text-[11px] font-medium transition-colors",
                    childSide === id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {id === "yes"
                    ? `YES · ${counterpartLabels.yes}`
                    : `NO · ${counterpartLabels.no}`}
                </button>
              ))}
            </div>
            {childSide === "no" ? (
              <p className="text-[11px] text-muted-foreground">
                Using this market’s NO ({counterpartLabels.no}).
              </p>
            ) : null}
          </div>
          <Button type="button" className="h-10 rounded-full px-6" onClick={confirmPair}>
            Open live dashboard
          </Button>
        </div>
      ) : pairing ? (
        <p className="text-center text-[12px] text-muted-foreground">
          Pick a counterpart, or search for a closer market, then open the dashboard.
        </p>
      ) : null}

      {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}

      <Dialog
        open={Boolean(eventPicker)}
        onOpenChange={(open) => {
          if (!open) {
            setEventPicker(null);
            setEventPickKey("");
          }
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col gap-3 overflow-hidden sm:max-w-xl">
          <DialogHeader className="shrink-0">
            <DialogTitle>{eventPicker?.title || "Select event markets"}</DialogTitle>
            <DialogDescription className="text-left">
              This is an event with multiple markets. Pick the specific market you want to compare.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {(eventPicker?.markets || []).map((market) => {
              const key = polymarketRealtimeMarketKey(market);
              const checked = key === eventPickKey;
              const labels = polymarketYesNoLabels(market as unknown as Record<string, unknown>);
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
                    name="dashboard-event-market"
                    className="mt-1 size-4 accent-[#2E5CFF]"
                    checked={checked}
                    onChange={() => setEventPickKey(key)}
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-foreground">
                      {String(market.title || market.slug || "Market")}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      YES = {labels.yes} · NO = {labels.no}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <DialogFooter className="shrink-0 items-center border-t border-border/60 pt-3 sm:justify-between">
            <p className="text-[11px] text-muted-foreground">
              {selectedEventMarket
                ? `Compare ${String(selectedEventMarket.title || selectedEventMarket.slug)}`
                : "Pick a market to continue."}
            </p>
            <Button
              type="button"
              disabled={!selectedEventMarket}
              onClick={() => {
                if (!selectedEventMarket) return;
                setEventPicker(null);
                setEventPickKey("");
                if (matchFromKalshi) applyPolyMatch(selectedEventMarket);
                else void startFromPoly(selectedEventMarket);
              }}
            >
              Use this market
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SelectedMarketCard({
  title,
  meta,
  labels,
  onChange,
}: {
  title: string;
  meta: string;
  labels: YesNoLabels;
  onChange: () => void;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-muted-foreground">Selected</p>
          <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">{title}</p>
          {meta ? (
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{meta}</p>
          ) : null}
          <p className="mt-1 text-[11px] text-muted-foreground">
            YES = {labels.yes} · NO = {labels.no}
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-xs" onClick={onChange}>
          Change
        </Button>
      </div>
    </div>
  );
}

function FeaturedCol({
  label,
  loading,
  onRefresh,
  accent,
  children,
}: {
  label: string;
  loading: boolean;
  onRefresh?: () => void;
  accent: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/10">
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: accent }}>
          {label}
        </p>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label={`Refresh ${label}`}
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          </button>
        ) : null}
      </div>
      <div className="space-y-1.5 p-2">
        {loading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />
            ))}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
