"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Newspaper, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { parseWarRoomMarketId } from "@/lib/warRoom/ids";

import { relevanceScore } from "@/lib/mcp/research/relevance";

import type { ActivityRow } from "./ActivityPane";
import { formatAge, formatCents, formatMove, formatVolume, venueLabel } from "./format";
import type { MarketRow } from "./MarketsPane";
import { pulseMarketToRow } from "./relatedMarkets";
import {
  polymarketConditionId,
  researchNavigateFromMarket,
  type WarRoomNavigateRequest,
  type WarRoomResearchOrigin,
} from "./researchHandoff";
import { useWarRoomTheme } from "./useWarRoomTheme";
import { WarRoomMarketChart } from "./WarRoomMarketChart";
import { WarRoomRelatedMarketsChart } from "./WarRoomRelatedMarketsChart";

export type WarRoomDetailTarget =
  | { kind: "market"; market: MarketRow }
  | { kind: "trade"; activity: ActivityRow; market?: MarketRow | null }
  | { kind: "news"; activity: ActivityRow; relatedMarkets?: MarketRow[] };

export type { WarRoomNavigateRequest };

function VenueTag({ venue, dark = true }: { venue: string; dark?: boolean }) {
  const v = String(venue || "").toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide",
        v === "kalshi" && "bg-[#28CC95]/20 text-[#28CC95]",
        v === "polymarket" &&
          (dark ? "bg-[#2E5CFF]/20 text-[#8da4ff]" : "bg-[#2E5CFF]/15 text-[#2E5CFF]"),
        v === "news" &&
          (dark ? "bg-violet-400/20 text-violet-200" : "bg-violet-500/15 text-violet-700"),
        v !== "kalshi" &&
          v !== "polymarket" &&
          v !== "news" &&
          (dark ? "bg-white/10 text-slate-300" : "bg-muted text-muted-foreground"),
      )}
    >
      {venueLabel(venue)}
    </span>
  );
}

function isVenueWordmark(src: string) {
  return /\/kalshi\.png$|\/landing\/logos\/kalshi|\/polymarket\.png$/i.test(src);
}

/** Market art when we have it; otherwise a brand tile so Kalshi’s wide wordmark isn’t cropped. */
function MarketMark({
  src,
  venue,
  size = "md",
}: {
  src?: string | null;
  venue?: string | null;
  size?: "sm" | "md";
}) {
  const v = String(venue || "").toLowerCase();
  const fallback = v === "kalshi" ? "/landing/logos/kalshi.png" : "/polymarket.png";
  const resolved = String(src || "").trim() || fallback;
  const venueMark = isVenueWordmark(resolved);
  const kalshi = v === "kalshi" || /kalshi/i.test(resolved);

  if (venueMark) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-md",
          size === "sm" ? "size-5 p-0.5" : "size-9 p-1.5",
          kalshi ? "bg-[#28CC95]" : "bg-[#2E5CFF]",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resolved} alt="" className="size-full object-contain" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-md bg-slate-900",
        size === "sm" ? "size-5" : "size-9",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resolved} alt="" className="h-full w-full object-cover" />
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "muted";
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-mono text-[13px] tabular-nums leading-none text-slate-100",
          tone === "up" && "text-emerald-300",
          tone === "down" && "text-rose-300",
          tone === "muted" && "text-slate-400",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** Prefer the YES token so we don't flip between 8¢ and 98¢ (NO). */
export function yesTokenIds(market: MarketRow | null | undefined): string[] {
  if (!market) return [];
  const yes = (market.outcomes || []).find((o) => {
    const label = String(o?.label || o?.id || "").toLowerCase();
    return label === "yes" || label.startsWith("yes");
  });
  if (yes?.tokenId) return [String(yes.tokenId)];
  if (market.tokenIds?.length) return [String(market.tokenIds[0])];
  return (market.outcomes || []).map((o) => o?.tokenId).filter(Boolean) as string[];
}

/** Collapse strike-ladder cousins ("hit $264 / $256 / …") into one family key. */
function marketFamilyKey(title: string, venue: string) {
  const normalized = String(title || "")
    .toLowerCase()
    .replace(/\$[\d,.]+/g, "$")
    .replace(/\b(high|low)\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${venue}:${normalized.slice(0, 72)}`;
}

async function searchRelatedMarkets(headline: string, signal: AbortSignal): Promise<MarketRow[]> {
  const q = headline.replace(/\s+/g, " ").trim().slice(0, 140);
  if (!q) return [];
  const [polyRes, kalshiRes] = await Promise.allSettled([
    fetch(
      `/api/integrations/polymarket?${new URLSearchParams({
        query: "metadataSuggestions",
        q,
        limit_per_type: "8",
        search_profiles: "false",
      })}`,
      { signal, credentials: "same-origin" },
    ),
    fetch(
      `/api/integrations/kalshi-live/search/embedding-suggestions?${new URLSearchParams({ q })}`,
      { signal, credentials: "same-origin" },
    ),
  ]);

  const out: MarketRow[] = [];
  const seenIds = new Set<string>();
  const seenFamilies = new Set<string>();

  const push = (mapped: MarketRow | null) => {
    if (!mapped?.id || seenIds.has(mapped.id)) return;
    const family = marketFamilyKey(mapped.title, mapped.venue);
    if (seenFamilies.has(family)) return;
    seenIds.add(mapped.id);
    seenFamilies.add(family);
    out.push(mapped);
  };

  if (polyRes.status === "fulfilled" && polyRes.value.ok) {
    const body = await polyRes.value.json().catch(() => ({}));
    const suggestions = [...(body.suggestions || [])].sort((a, b) => {
      const ap = Number(a.price ?? a.yesPrice);
      const bp = Number(b.price ?? b.yesPrice);
      return (Number.isFinite(bp) ? 1 : 0) - (Number.isFinite(ap) ? 1 : 0);
    });
    for (const row of suggestions) {
      if (String(row.entity || "market") === "profile") continue;
      push(
        pulseMarketToRow(
          {
            venue: "polymarket",
            title: row.title || row.slug,
            condition_id: row.conditionId || row.condition_id || row.id,
            slug: row.slug,
            price: row.price ?? row.yesPrice ?? null,
            volume_24h: row.volume24h ?? row.volume_24h ?? null,
            imageUrl: row.imageUrl || row.icon || null,
            yes_token_id: row.yesTokenId || row.yes_token_id || row.tokenId || null,
          },
          undefined,
          out.length,
        ),
      );
    }
  }

  if (kalshiRes.status === "fulfilled" && kalshiRes.value.ok) {
    const body = await kalshiRes.value.json().catch(() => ({}));
    for (const row of body.suggestions || []) {
      push(
        pulseMarketToRow(
          {
            venue: "kalshi",
            title: row.title || row.ticker,
            ticker: row.ticker,
            price: row.yes_price ?? row.price ?? null,
            volume_24h: row.volume_24h ?? row.volume24h ?? null,
          },
          undefined,
          out.length,
        ),
      );
    }
  }

  return out.slice(0, 6);
}

function RelatedMarketsList({
  rows,
  loading,
  onSelect,
}: {
  rows: MarketRow[];
  loading?: boolean;
  onSelect?: (row: MarketRow) => void;
}) {
  const { dark } = useWarRoomTheme();
  return (
    <div>
      <p
        className={cn(
          "mb-1 text-[9px] font-semibold uppercase tracking-[0.14em]",
          dark ? "text-slate-500" : "text-muted-foreground",
        )}
      >
        Related markets
        {loading ? <span className="ml-1 font-normal normal-case tracking-normal">· searching</span> : null}
      </p>
      {rows.length ? (
        <ul
          className={cn(
            "divide-y overflow-hidden rounded-md border",
            dark ? "divide-white/[0.06] border-white/10" : "divide-border/60 border-border/70",
          )}
        >
          {rows.map((row) => {
            const moveLabel = formatMove(row.move);
            const up = (row.move ?? 0) > 0;
            const down = (row.move ?? 0) < 0;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onSelect?.(row)}
                  className={cn(
                    "flex w-full items-center gap-2 px-2 py-1.5 text-left",
                    dark ? "hover:bg-white/[0.04]" : "hover:bg-muted/60",
                  )}
                >
                  <MarketMark
                    size="sm"
                    venue={row.venue}
                    src={row.avatarUrl || row.imageUrl}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <VenueTag venue={row.venue} dark={dark} />
                      <span
                        className={cn(
                          "truncate text-[11px]",
                          dark ? "text-slate-200" : "text-foreground",
                        )}
                      >
                        {row.title}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      className={cn(
                        "block font-mono text-[11px] tabular-nums",
                        dark ? "text-white" : "text-foreground",
                      )}
                    >
                      {formatCents(row.price)}
                    </span>
                    {moveLabel ? (
                      <span
                        className={cn(
                          "block font-mono text-[9px] tabular-nums",
                          up && (dark ? "text-emerald-300" : "text-emerald-600"),
                          down && (dark ? "text-rose-300" : "text-rose-600"),
                          !up && !down && (dark ? "text-slate-500" : "text-muted-foreground"),
                        )}
                      >
                        {moveLabel}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-white/10 px-2 py-2 text-[11px] text-slate-500">
          {loading ? "Matching markets…" : "No linked markets on this headline yet."}
        </p>
      )}
    </div>
  );
}

function newsSnippet(activity: ActivityRow | null | undefined): string {
  if (!activity) return "";
  const snippet = String(activity.data?.snippet || "").trim();
  if (snippet && snippet !== activity.title) return snippet;
  const summary = String(activity.summary || "").trim();
  if (summary && summary !== activity.title) return summary;
  return "";
}

function relatedActivityForMarkets({
  feed,
  related,
  currentId,
  headline,
}: {
  feed: ActivityRow[];
  related: MarketRow[];
  currentId?: string | null;
  headline?: string | null;
}): { news: ActivityRow[]; trades: ActivityRow[] } {
  const marketIds = new Set(related.map((row) => row.id));
  for (const row of related) {
    if (row.venueMarketId) marketIds.add(String(row.venueMarketId));
  }
  const news: ActivityRow[] = [];
  const trades: ActivityRow[] = [];
  for (const row of feed) {
    if (!row?.id || row.id === currentId) continue;
    const linked =
      (row.marketId && marketIds.has(row.marketId)) ||
      (Array.isArray(row.data?.markets) &&
        row.data.markets.some((item) => {
          const condition = String(item?.condition_id || item?.conditionId || "").trim();
          const ticker = String(item?.ticker || "").trim();
          return (
            (condition && [...marketIds].some((id) => id.includes(condition))) ||
            (ticker && marketIds.has(`kalshi:${ticker}`))
          );
        }));
    const lexical =
      !linked &&
      headline &&
      (relevanceScore(headline, row.title) >= 0.32 ||
        related.some((market) => relevanceScore(market.title, row.title) >= 0.36));
    if (!linked && !lexical) continue;
    if (row.kind === "headline") news.push(row);
    else trades.push(row);
    if (news.length >= 4 && trades.length >= 6) break;
  }
  return { news: news.slice(0, 4), trades: trades.slice(0, 6) };
}

/** Shared Research Holders / Research Market CTAs — stay in the War Room demo. */
function ResearchHandoffButtons({
  market,
  origin,
  onNavigate,
}: {
  market: MarketRow | null | undefined;
  origin: WarRoomResearchOrigin;
  onNavigate?: (request: WarRoomNavigateRequest) => void;
}) {
  const { dark } = useWarRoomTheme();
  if (!market?.id || !onNavigate) return null;
  const canHolders = Boolean(polymarketConditionId(market));
  const primaryClass = dark
    ? "bg-white text-slate-950 hover:bg-white/90"
    : "bg-foreground text-background hover:bg-foreground/90";
  const secondaryClass = dark
    ? "border border-white/12 text-slate-100 hover:bg-white/[0.04]"
    : "border border-border text-foreground hover:bg-muted";
  return (
    <div className="mt-auto flex shrink-0 gap-2 pt-1">
      {canHolders ? (
        <button
          type="button"
          onClick={() => onNavigate(researchNavigateFromMarket({ target: "holders", market, origin }))}
          className={cn(
            "inline-flex h-9 min-w-0 flex-1 items-center justify-center rounded-md text-[12px] font-medium",
            primaryClass,
          )}
        >
          Research Holders
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onNavigate(researchNavigateFromMarket({ target: "markets", market, origin }))}
        className={cn(
          "inline-flex h-9 min-w-0 flex-1 items-center justify-center rounded-md text-[12px] font-medium",
          canHolders ? secondaryClass : primaryClass,
        )}
      >
        Research Market
      </button>
    </div>
  );
}

function RelatedActivityLists({
  news,
  trades,
  onSelect,
}: {
  news: ActivityRow[];
  trades: ActivityRow[];
  onSelect?: (row: ActivityRow) => void;
}) {
  const { dark } = useWarRoomTheme();
  if (!news.length && !trades.length) {
    return (
      <p
        className={cn(
          "rounded-md border border-dashed px-2 py-2 text-[11px]",
          dark ? "border-white/10 text-slate-500" : "border-border/70 text-muted-foreground",
        )}
      >
        No related news or trades on these markets yet.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {news.length ? (
        <div>
          <p
            className={cn(
              "mb-1 text-[9px] font-semibold uppercase tracking-[0.14em]",
              dark ? "text-slate-500" : "text-muted-foreground",
            )}
          >
            Related news
          </p>
          <ul
            className={cn(
              "divide-y overflow-hidden rounded-md border",
              dark ? "divide-white/[0.06] border-white/10" : "divide-border/60 border-border/70",
            )}
          >
            {news.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onSelect?.(row)}
                  className={cn(
                    "flex w-full items-start gap-2 px-2 py-1.5 text-left",
                    dark ? "hover:bg-white/[0.04]" : "hover:bg-muted/60",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex shrink-0 items-center rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide",
                      dark ? "bg-violet-400/20 text-violet-200" : "bg-violet-500/15 text-violet-700",
                    )}
                  >
                    News
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "line-clamp-2 text-[11px] leading-snug",
                        dark ? "text-slate-200" : "text-foreground",
                      )}
                    >
                      {row.title}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block text-[10px]",
                        dark ? "text-slate-500" : "text-muted-foreground",
                      )}
                    >
                      {row.data?.publisher ? `${row.data.publisher} · ` : ""}
                      {row.occurredAt ? formatAge(row.occurredAt) : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {trades.length ? (
        <div>
          <p
            className={cn(
              "mb-1 text-[9px] font-semibold uppercase tracking-[0.14em]",
              dark ? "text-slate-500" : "text-muted-foreground",
            )}
          >
            Related trades
          </p>
          <ul
            className={cn(
              "divide-y overflow-hidden rounded-md border",
              dark ? "divide-white/[0.06] border-white/10" : "divide-border/60 border-border/70",
            )}
          >
            {trades.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onSelect?.(row)}
                  className={cn(
                    "flex w-full items-start gap-2 px-2 py-1.5 text-left",
                    dark ? "hover:bg-white/[0.04]" : "hover:bg-muted/60",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex shrink-0 items-center rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide",
                      dark ? "bg-amber-400/15 text-amber-200" : "bg-amber-500/15 text-amber-800",
                    )}
                  >
                    Trade
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "line-clamp-2 text-[11px] leading-snug",
                        dark ? "text-slate-200" : "text-foreground",
                      )}
                    >
                      {row.title}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block text-[10px]",
                        dark ? "text-slate-500" : "text-muted-foreground",
                      )}
                    >
                      {row.summary && row.summary !== row.title ? `${row.summary} · ` : ""}
                      {row.occurredAt ? formatAge(row.occurredAt) : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Left-rail detail for War Room — not a floating popover.
 * Chart + live trades get the vertical space; CTAs stay pinned at the bottom.
 */
export function WarRoomDetailCard({
  open,
  target,
  activityFeed = [],
  onOpenChange,
  onNavigate,
  onSelectRelatedMarket,
  onSelectActivity,
}: {
  open: boolean;
  target: WarRoomDetailTarget | null;
  /** Live War Room activity — used to surface related news/trades for a headline. */
  activityFeed?: ActivityRow[];
  /** @deprecated Floating anchors removed — left panel is fixed. */
  anchor?: { x: number; y: number } | null;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (request: WarRoomNavigateRequest) => void;
  onSelectRelatedMarket?: (market: MarketRow) => void;
  onSelectActivity?: (row: ActivityRow) => void;
}) {
  const { dark } = useWarRoomTheme();
  const [articleMode, setArticleMode] = useState<"preview" | "iframe">("preview");
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [historyMove, setHistoryMove] = useState<number | null>(null);
  const [searchedRelated, setSearchedRelated] = useState<MarketRow[]>([]);
  const [searchingRelated, setSearchingRelated] = useState(false);

  const market =
    target?.kind === "market" ? target.market : target?.kind === "trade" ? target.market || null : null;
  const activity = target?.kind === "news" || target?.kind === "trade" ? target.activity : null;
  const seedRelated = target?.kind === "news" ? target.relatedMarkets || [] : [];

  const related = useMemo(() => {
    const seenIds = new Set<string>();
    const seenFamilies = new Set<string>();
    const out: MarketRow[] = [];
    for (const row of [...seedRelated, ...searchedRelated]) {
      if (!row?.id || seenIds.has(row.id)) continue;
      const family = marketFamilyKey(row.title, row.venue);
      if (seenFamilies.has(family)) continue;
      seenIds.add(row.id);
      seenFamilies.add(family);
      out.push(row);
    }
    return out.slice(0, 6);
  }, [seedRelated, searchedRelated]);

  const relatedActivity = useMemo(() => {
    if (target?.kind !== "news") return { news: [] as ActivityRow[], trades: [] as ActivityRow[] };
    return relatedActivityForMarkets({
      feed: activityFeed,
      related,
      currentId: target.activity?.id,
      headline: target.activity?.title,
    });
  }, [activityFeed, related, target]);

  const snippet = target?.kind === "news" ? newsSnippet(target.activity) : "";

  useEffect(() => {
    if (!open || target?.kind !== "news") {
      setSearchedRelated([]);
      setSearchingRelated(false);
      return;
    }
    const headline = target.activity?.title || "";
    const abort = new AbortController();
    setSearchingRelated(true);
    searchRelatedMarkets(headline, abort.signal)
      .then((rows) => {
        if (!abort.signal.aborted) setSearchedRelated(rows);
      })
      .catch(() => {
        if (!abort.signal.aborted) setSearchedRelated([]);
      })
      .finally(() => {
        if (!abort.signal.aborted) setSearchingRelated(false);
      });
    return () => abort.abort();
  }, [open, target]);

  useEffect(() => {
    if (!open) {
      setArticleMode("preview");
      setLivePrice(null);
      setHistoryMove(null);
      setSearchedRelated([]);
    }
  }, [open]);

  const parsed = market ? parseWarRoomMarketId(market.id) : null;
  const title =
    target?.kind === "news"
      ? activity?.title || "Headline"
      : market?.title || activity?.title || "Market";
  const imageUrl = target?.kind === "news" ? null : market?.imageUrl || null;
  const avatarUrl =
    target?.kind === "news" ? null : market?.avatarUrl || market?.imageUrl || null;
  const venue = market?.venue || (target?.kind === "news" ? "news" : null);
  const tokenIds = yesTokenIds(market);
  const sourceUrl = activity?.sourceUrl || null;
  const publisher = String(activity?.data?.publisher || "").trim();
  const displayMove = market?.move ?? historyMove;
  const moveLabel = formatMove(displayMove);
  const rising = (displayMove ?? 0) > 0;
  const falling = (displayMove ?? 0) < 0;

  if (!open) {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-col justify-center px-4",
          dark ? "bg-[#07090f] text-slate-500" : "bg-background text-muted-foreground",
        )}
      >
        <p className="text-[11px] leading-snug">
          Select a market, trade, or headline — chart, live trades, and terminals open here.
        </p>
      </div>
    );
  }

  if (!target) return null;

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col",
        dark ? "bg-[#07090f] text-slate-100" : "bg-background text-foreground",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-start gap-2.5 border-b px-3 py-2.5",
          dark ? "border-white/10" : "border-border/70",
        )}
      >
        {target.kind === "news" ? (
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-md border",
              dark
                ? "border-violet-400/25 bg-violet-400/10 text-violet-200"
                : "border-violet-500/25 bg-violet-500/10 text-violet-700",
            )}
          >
            <Newspaper className="size-4" />
          </div>
        ) : (
          <MarketMark venue={venue} src={avatarUrl || imageUrl} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {venue ? <VenueTag venue={venue} dark={dark} /> : null}
            {target.kind === "trade" ? (
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wide",
                  dark ? "text-amber-200/80" : "text-amber-800",
                )}
              >
                Trade
              </span>
            ) : null}
          </div>
          <p
            className={cn(
              "mt-0.5 line-clamp-3 text-[13px] font-medium leading-snug",
              dark ? "text-slate-50" : "text-foreground",
            )}
          >
            {title}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-md",
            dark
              ? "text-slate-500 hover:bg-white/[0.06] hover:text-slate-200"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          aria-label="Close"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2.5">
        {target.kind === "news" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
              {publisher ? <span className="truncate">{publisher}</span> : null}
              {activity?.occurredAt ? <span>{formatAge(activity.occurredAt)}</span> : null}
              {sourceUrl ? (
                <>
                  <button
                    type="button"
                    onClick={() => setArticleMode((m) => (m === "preview" ? "iframe" : "preview"))}
                    className="text-slate-300 underline-offset-2 hover:text-white hover:underline"
                  >
                    {articleMode === "preview" ? "Read" : "Hide article"}
                  </button>
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 text-slate-300 hover:text-white"
                  >
                    Source <ExternalLink className="size-2.5" />
                  </a>
                </>
              ) : null}
            </div>
            {snippet ? (
              <p className="text-[12px] leading-relaxed text-slate-300">{snippet}</p>
            ) : (
              <p className="text-[11px] leading-snug text-slate-500">
                Full article text isn’t in the feed yet — open the source for the body.
              </p>
            )}
            {articleMode === "iframe" && sourceUrl ? (
              <div className="overflow-hidden rounded-md border border-white/10">
                <iframe title={title} src={sourceUrl} className="h-64 w-full bg-white" />
              </div>
            ) : null}
            <WarRoomRelatedMarketsChart markets={related} />
            <RelatedMarketsList
              rows={related}
              loading={searchingRelated && related.length < 2}
              onSelect={onSelectRelatedMarket}
            />
            <RelatedActivityLists
              news={relatedActivity.news}
              trades={relatedActivity.trades}
              onSelect={onSelectActivity}
            />
            <ResearchHandoffButtons
              market={related[0] || null}
              origin="news"
              onNavigate={onNavigate}
            />
          </div>
        ) : !market ? (
          <p className="text-[12px] text-slate-500">Loading market…</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex shrink-0 items-end justify-between gap-3 border-b border-white/[0.06] pb-2.5">
              <Metric label="Price" value={formatCents(livePrice ?? market.price)} />
              <Metric
                label="Move"
                value={moveLabel || "—"}
                tone={rising ? "up" : falling ? "down" : "muted"}
              />
              <Metric label="Vol 24h" value={formatVolume(market.volume24h)} />
              {market.region ? <Metric label="Region" value={market.region} tone="muted" /> : null}
            </div>

            {target.kind === "trade" && activity?.summary ? (
              <p className="shrink-0 text-[11px] leading-snug text-amber-100/90">
                {activity.summary}
                {activity.occurredAt ? (
                  <span className="text-slate-500"> · {formatAge(activity.occurredAt)}</span>
                ) : null}
              </p>
            ) : null}

            <WarRoomMarketChart
              tall
              className="min-h-0 flex-1"
              venue={market.venue}
              tokenIds={tokenIds}
              ticker={parsed?.venue === "kalshi" ? parsed.venueMarketId : market.venueMarketId}
              conditionId={parsed?.venue === "polymarket" ? parsed.venueMarketId : null}
              title={market.title}
              onLivePrice={setLivePrice}
              onMove={setHistoryMove}
            />

            <ResearchHandoffButtons
              market={market}
              origin={target.kind === "trade" ? "trade" : "market"}
              onNavigate={onNavigate}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
