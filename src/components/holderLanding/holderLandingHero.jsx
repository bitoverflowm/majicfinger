"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { HolderTerminalSearch } from "@/components/terminals/holder/holderTerminalSearch";
import { HOLDER_BROWSE_HELPERS, HOLDER_SEARCH_COPY, holderTerminalHref } from "@/lib/holderLanding/pages";
import { retryImport } from "@/lib/retryImport";
import { cn } from "@/lib/utils";
import { FREE_NOTE, PRIMARY_CTA } from "./holderLandingRail";

function BrowseLoading() {
  return (
    <div className="flex h-40 items-center justify-center gap-2 text-[12px] text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      Loading
    </div>
  );
}

const HolderMarketBrowser = dynamic(
  () => retryImport(() => import("@/components/terminals/holder/browse/holderMarketBrowser")).then((m) => m.HolderMarketBrowser),
  { ssr: false, loading: BrowseLoading },
);
const HolderTraderBrowser = dynamic(
  () => retryImport(() => import("@/components/terminals/holder/browse/holderTraderBrowser")).then((m) => m.HolderTraderBrowser),
  { ssr: false, loading: BrowseLoading },
);

const ROTATE_MS = 3800;
const SHOWN = 3;

const BROWSE_LABELS = { markets: "Browse Markets", holders: "Browse Holders" };

/** Live markets to start from, a few at a time, turning over until the visitor reaches for one. */
function Suggestions({ markets, current, onPick, frozen }) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (frozen || markets.length <= SHOWN) return undefined;
    const timer = window.setInterval(() => setOffset((at) => (at + SHOWN) % markets.length), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [frozen, markets.length]);
  if (!markets.length) return null;
  const shown = Array.from({ length: Math.min(SHOWN, markets.length) }, (_, index) => markets[(offset + index) % markets.length]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12px] text-muted-foreground">Trading now:</span>
      {shown.map((market) => (
        <button
          key={`${offset}:${market.conditionId}`}
          type="button"
          onClick={() => onPick(market)}
          aria-pressed={current === market.conditionId}
          className={cn(
            "max-w-[22rem] truncate rounded-full border px-3 py-1 text-[12px] transition-colors animate-in fade-in-0 slide-in-from-bottom-1 duration-500 motion-reduce:animate-none",
            current === market.conditionId
              ? "border-[#0d99ff]/50 bg-[#0d99ff]/10 text-foreground"
              : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground",
          )}
        >
          {market.title}
        </button>
      ))}
    </div>
  );
}

/**
 * Search, live suggestions, the browsers and the two ways in. Typing, focusing or picking freezes
 * the suggestions so they never move under the visitor.
 */
export function HeroTools({ page, suggestions, market, subject, onPick, onExample, ctaRef }) {
  const hero = page.hero;
  const [frozen, setFrozen] = useState(false);
  const [browse, setBrowse] = useState(null);
  const freeze = () => setFrozen(true);
  const pick = (subjects) => {
    freeze();
    setBrowse(null);
    onPick(subjects);
  };

  return (
    <div className="flex w-full flex-col gap-4" onFocusCapture={freeze} onKeyDownCapture={freeze}>
      <div className="w-full rounded-2xl border border-border bg-background p-3 shadow-[0_10px_30px_-14px_rgba(15,23,42,0.3)]">
        <HolderTerminalSearch
          onPick={pick}
          scopes={hero.scopes}
          labels={HOLDER_SEARCH_COPY.labels}
          placeholders={HOLDER_SEARCH_COPY.placeholders}
        />
      </div>
      {hero.scopes.includes("markets") ? (
        <Suggestions markets={suggestions} current={market?.conditionId} onPick={(item) => pick([item])} frozen={frozen} />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {hero.browse.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              freeze();
              setBrowse(browse === id ? null : id);
            }}
            aria-expanded={browse === id}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
              browse === id ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {BROWSE_LABELS[id]}
          </button>
        ))}
        {hero.crossLink ? (
          <span className="text-[13px] text-muted-foreground">
            {hero.crossLink.lead}{" "}
            <Link href={hero.crossLink.href} className="text-secondary hover:text-primary">
              {hero.crossLink.label}
            </Link>
          </span>
        ) : null}
      </div>
      {browse ? (
        <div className="w-full rounded-xl border border-border bg-background p-3 shadow-sm animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <p className="px-1 pb-2 text-[12.5px] text-muted-foreground">
            {browse === "holders" && hero.browseHelper ? hero.browseHelper : HOLDER_BROWSE_HELPERS[browse]}
          </p>
          <div className="max-h-[32rem] overflow-y-auto">
            {browse === "markets" ? (
              <HolderMarketBrowser onPick={pick} heading={<span className="text-[13px] font-semibold">Browse Markets</span>} />
            ) : (
              <HolderTraderBrowser onPick={pick} heading={<span className="text-[13px] font-semibold">Browse Holders</span>} />
            )}
          </div>
        </div>
      ) : null}
      <div ref={ctaRef} className="flex flex-col gap-2.5 pt-1">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={holderTerminalHref(subject)} prefetch={false} className={cn(PRIMARY_CTA, "h-12 px-6 text-base font-normal")}>
            Open the free terminal
            <span aria-hidden>→</span>
          </Link>
          <a
            href={`#${hero.exampleTarget}`}
            onClick={onExample}
            className="flex h-12 items-center justify-center gap-1.5 rounded-full border border-border bg-muted px-6 text-base font-normal text-primary transition-all ease-out hover:bg-muted/70 active:scale-95"
          >
            {hero.exampleAction}
            <span aria-hidden>↓</span>
          </a>
        </div>
        <p className="text-[12.5px] text-muted-foreground">{FREE_NOTE}</p>
      </div>
    </div>
  );
}
