"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ExternalLink, Newspaper, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { parseWarRoomMarketId } from "@/lib/warRoom/ids";

import type { ActivityRow } from "./ActivityPane";
import { formatAge, formatCents, formatMove, formatVolume, venueLabel } from "./format";
import type { MarketRow } from "./MarketsPane";
import { pulseMarketToRow } from "./relatedMarkets";
import { WarRoomMarketChart } from "./WarRoomMarketChart";

export type WarRoomDetailTarget =
  | { kind: "market"; market: MarketRow }
  | { kind: "trade"; activity: ActivityRow; market?: MarketRow | null }
  | { kind: "news"; activity: ActivityRow; relatedMarkets?: MarketRow[] };

export type WarRoomNavigateRequest =
  | { type: "holders"; conditionId: string; title: string; slug?: string | null }
  | { type: "markets"; venue: "kalshi" | "polymarket"; marketId: string }
  | { type: "war-room-market"; marketId: string };

function VenueTag({ venue }: { venue: string }) {
  const v = String(venue || "").toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide",
        v === "kalshi" && "bg-[#28CC95]/20 text-[#28CC95]",
        v === "polymarket" && "bg-[#2E5CFF]/20 text-[#8da4ff]",
        v === "news" && "bg-violet-400/20 text-violet-200",
        v !== "kalshi" && v !== "polymarket" && v !== "news" && "bg-white/10 text-slate-300",
      )}
    >
      {venueLabel(venue)}
    </span>
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
          "mt-0.5 font-mono text-[12px] tabular-nums leading-none text-slate-100",
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

/** Same search path as Jarvis nav — expand a headline into live market cousins. */
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
    // Prefer rows that already have a live price when filling the short list.
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
  return (
    <div>
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Related markets
        {loading ? <span className="ml-1 font-normal normal-case tracking-normal">· searching</span> : null}
      </p>
      {rows.length ? (
        <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-md border border-white/10">
          {rows.map((row) => {
            const moveLabel = formatMove(row.move);
            const up = (row.move ?? 0) > 0;
            const down = (row.move ?? 0) < 0;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onSelect?.(row)}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-white/[0.04]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      row.avatarUrl ||
                      row.imageUrl ||
                      (row.venue === "kalshi" ? "/kalshi.png" : "/polymarket.png")
                    }
                    alt=""
                    className="size-5 rounded object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <VenueTag venue={row.venue} />
                      <span className="truncate text-[11px] text-slate-200">{row.title}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-[11px] tabular-nums text-white">
                      {formatCents(row.price)}
                    </span>
                    {moveLabel ? (
                      <span
                        className={cn(
                          "block font-mono text-[9px] tabular-nums",
                          up && "text-emerald-300",
                          down && "text-rose-300",
                          !up && !down && "text-slate-500",
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

export function WarRoomDetailCard({
  open,
  target,
  anchor,
  onOpenChange,
  onNavigate,
  onSelectRelatedMarket,
}: {
  open: boolean;
  target: WarRoomDetailTarget | null;
  anchor?: { x: number; y: number } | null;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (request: WarRoomNavigateRequest) => void;
  onSelectRelatedMarket?: (market: MarketRow) => void;
}) {
  const [articleMode, setArticleMode] = useState<"preview" | "iframe">("preview");
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [searchedRelated, setSearchedRelated] = useState<MarketRow[]>([]);
  const [searchingRelated, setSearchingRelated] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 12, top: 12, maxHeight: 420 });

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

  const parsed = market ? parseWarRoomMarketId(market.id) : null;
  const title =
    target?.kind === "news"
      ? activity?.title || "Headline"
      : market?.title || activity?.title || "Market";
  const imageUrl = target?.kind === "news" ? null : market?.imageUrl || null;
  const avatarUrl =
    target?.kind === "news" ? null : market?.avatarUrl || market?.imageUrl || null;
  const move = formatMove(market?.move ?? null);
  const venue = market?.venue || (target?.kind === "news" ? "news" : null);
  const tokenIds = market?.tokenIds?.length
    ? market.tokenIds
    : (market?.outcomes || []).map((o) => o?.tokenId).filter(Boolean);
  const sourceUrl = activity?.sourceUrl || null;
  const rising = (market?.move ?? 0) > 0;
  const falling = (market?.move ?? 0) < 0;
  const publisher = String(activity?.data?.publisher || "").trim();

  const body = useMemo(() => {
    if (!target) return null;

    if (target.kind === "news") {
      return (
        <div className="space-y-2.5">
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

          {articleMode === "iframe" && sourceUrl ? (
            <div className="overflow-hidden rounded-md border border-white/10">
              <iframe title={title} src={sourceUrl} className="h-52 w-full bg-white" />
            </div>
          ) : null}

          <RelatedMarketsList
            rows={related}
            loading={searchingRelated && related.length < 2}
            onSelect={onSelectRelatedMarket}
          />
        </div>
      );
    }

    if (!market) {
      return <p className="text-[12px] text-slate-500">Loading market…</p>;
    }

    return (
      <div className="space-y-2.5">
        <div className="flex items-end justify-between gap-3 border-b border-white/[0.06] pb-2">
          <Metric label="Price" value={formatCents(livePrice ?? market.price)} />
          <Metric
            label="Move"
            value={move || "—"}
            tone={rising ? "up" : falling ? "down" : "muted"}
          />
          <Metric label="Vol 24h" value={formatVolume(market.volume24h)} />
          {market.region ? <Metric label="Region" value={market.region} tone="muted" /> : null}
        </div>

        {target.kind === "trade" && activity?.summary ? (
          <p className="text-[11px] leading-snug text-amber-100/90">
            {activity.summary}
            {activity.occurredAt ? (
              <span className="text-slate-500"> · {formatAge(activity.occurredAt)}</span>
            ) : null}
          </p>
        ) : null}

        <WarRoomMarketChart
          venue={market.venue}
          tokenIds={tokenIds as string[]}
          ticker={parsed?.venue === "kalshi" ? parsed.venueMarketId : market.venueMarketId}
          onLivePrice={setLivePrice}
        />

        <div className="flex gap-2">
          {parsed?.venue === "polymarket" ? (
            <button
              type="button"
              onClick={() =>
                onNavigate?.({
                  type: "holders",
                  conditionId: parsed.venueMarketId,
                  title: market.title,
                  slug: market.slug,
                })
              }
              className="inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-md bg-white text-[12px] font-medium text-slate-950 hover:bg-white/90"
            >
              Holder Terminal <ArrowUpRight className="size-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() =>
              onNavigate?.({
                type: "markets",
                venue: (parsed?.venue as "kalshi" | "polymarket") || "polymarket",
                marketId: market.id,
              })
            }
            className={cn(
              "inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-md text-[12px] font-medium",
              parsed?.venue === "polymarket"
                ? "border border-white/12 text-slate-100 hover:bg-white/[0.04]"
                : "bg-white text-slate-950 hover:bg-white/90",
            )}
          >
            Market Terminal <ArrowUpRight className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }, [
    activity,
    articleMode,
    falling,
    livePrice,
    market,
    move,
    onNavigate,
    onSelectRelatedMarket,
    parsed,
    publisher,
    related,
    rising,
    searchingRelated,
    sourceUrl,
    target,
    title,
    tokenIds,
  ]);

  // Keep the card inside the *visible* globe stage (stage can extend below the fold).
  useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    const parent = panel.offsetParent as HTMLElement | null;
    if (!parent) return;

    const place = () => {
      const pad = 10;
      const parentW = parent.clientWidth;
      const parentH = parent.clientHeight;
      const parentRect = parent.getBoundingClientRect();

      // Visible slice of the stage in parent-local coords.
      const visTop = Math.min(parentH, Math.max(0, 0 - parentRect.top));
      const visBottom = Math.min(parentH, Math.max(0, window.innerHeight - parentRect.top));
      const visLeft = Math.min(parentW, Math.max(0, 0 - parentRect.left));
      const visRight = Math.min(parentW, Math.max(0, window.innerWidth - parentRect.left));
      const visW = Math.max(0, visRight - visLeft);
      const visH = Math.max(0, visBottom - visTop);
      if (visW < 80 || visH < 80) return;

      const width = Math.min(panel.offsetWidth || 352, visW - pad * 2);
      const rawH = panel.offsetHeight || 280;
      const maxHeight = Math.max(160, visH - pad * 2);
      const height = Math.min(rawH, maxHeight);

      const ax = anchor?.x ?? visLeft + visW * 0.42;
      const ay = anchor?.y ?? visTop + visH * 0.42;

      let left = ax + 14;
      if (left + width > visRight - pad) left = ax - width - 14;
      left = Math.min(Math.max(visLeft + pad, left), Math.max(visLeft + pad, visRight - width - pad));

      // Prefer below the ping when there is room in the visible slice; else above; else center.
      let top = ay + 14;
      if (top + height > visBottom - pad) top = ay - height - 14;
      if (top < visTop + pad || top + height > visBottom - pad) {
        top = visTop + Math.max(pad, (visH - height) / 2);
      }
      top = Math.min(Math.max(visTop + pad, top), Math.max(visTop + pad, visBottom - height - pad));

      setPos({ left, top, maxHeight });
    };

    place();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(place) : null;
    ro?.observe(parent);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      ro?.disconnect();
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, anchor, target, related.length, articleMode, livePrice]);

  useEffect(() => {
    if (!open) {
      setArticleMode("preview");
      setLivePrice(null);
      setSearchedRelated([]);
    }
  }, [open]);

  if (!open || !target) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      className="war-room-detail-popover absolute z-40 w-[min(100%,22rem)] overflow-hidden rounded-xl border border-white/12 shadow-[0_18px_50px_rgba(0,0,0,0.65)]"
      style={{
        left: pos.left,
        top: pos.top,
        maxHeight: pos.maxHeight,
        backgroundColor: "#0a0d14",
        color: "#f1f5f9",
      }}
    >
      <div className="flex items-start gap-2.5 border-b border-white/[0.08] px-3 py-2.5">
        {target.kind === "news" ? (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-violet-400/25 bg-violet-400/10 text-violet-200">
            <Newspaper className="size-3.5" />
          </div>
        ) : (
          <div className="relative size-8 shrink-0 overflow-hidden rounded-md border border-white/10 bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl || imageUrl || (venue === "kalshi" ? "/kalshi.png" : "/polymarket.png")}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {venue ? <VenueTag venue={venue} /> : null}
            {target.kind === "trade" ? (
              <span className="text-[10px] uppercase tracking-wide text-amber-200/80">Trade</span>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-3 text-[12.5px] font-medium leading-snug text-slate-50">
            {title}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-white/[0.06] hover:text-slate-200"
          aria-label="Close"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="overflow-y-auto px-3 py-2.5" style={{ maxHeight: Math.max(120, pos.maxHeight - 72) }}>
        {body}
      </div>
    </div>
  );
}
