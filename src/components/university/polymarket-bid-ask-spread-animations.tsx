"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { BLUE, GREEN, RED, useInView } from "@/components/sections/features/feature-kit";
import { EASE, GuideAnimationFigure, ScaledStage, useGuidePhases } from "@/components/content/guide-animations/guide-animation-kit";
import { InteractiveFigure, PillButton } from "@/components/university/expected-wins-animations";
import { AMBER, Eyebrow, Frames, Panel, Reveal, Slider } from "@/components/university/pythagorean-animations";

const BID = BLUE;
const ASK = AMBER;
const MID = "#64748b";
const FILL = GREEN;
const BAD = RED;

const EXAMPLE = {
  bid: 63,
  ask: 67,
  mid: 65,
  spread: 4,
} as const;

function dollars(value: number, { cents = true }: { cents?: boolean } = {}) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
}

function centsLabel(cents: number) {
  const rounded = Math.round(cents * 10) / 10;
  return `${rounded.toFixed(Number.isInteger(rounded) ? 0 : 1)}¢`;
}

function toCents(price: number) {
  return Math.round(price * 1000) / 10;
}

function parseLevels(raw: unknown): { price: number; size: number }[] {
  let rows: unknown = raw;
  if (typeof raw === "string") {
    try {
      rows = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(rows)) return [];
  const out: { price: number; size: number }[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const price = Number((row as { price?: unknown }).price);
    const size = Number((row as { size?: unknown }).size ?? (row as { value?: unknown }).value);
    if (!Number.isFinite(price) || !Number.isFinite(size) || size <= 0) continue;
    out.push({ price, size });
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* 1. Three prices on one market                                              */
/* -------------------------------------------------------------------------- */

export function ThreePricesAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1600, 1800, 2000, 4200], rootRef, 3);

  const cards = [
    { title: "Displayed", value: "65¢", detail: "Midpoint of the quotes", color: MID, show: phase >= 0 },
    { title: "Buy now", value: "67¢", detail: "Best ask you can take", color: ASK, show: phase >= 1 },
    { title: "Sell now", value: "63¢", detail: "Best bid that takes your shares", color: BID, show: phase >= 2 },
  ] as const;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Three prices appear for the same Polymarket question: a 65 cent midpoint display, a 67 cent buy price, and a 63 cent sell price."
      caption="One market. Three numbers. Only two are tradable quotes."
    >
      <Frames />
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <Panel
            key={card.title}
            className="px-4 py-4"
            style={{
              opacity: card.show ? 1 : 0.2,
              transform: card.show ? "none" : "translateY(8px)",
              transition: `opacity 400ms ease, transform 500ms ${EASE}`,
            }}
          >
            <Eyebrow>{card.title}</Eyebrow>
            <p className="mt-2 font-mono text-[32px] font-semibold tabular-nums leading-none" style={{ color: card.color }}>
              {card.value}
            </p>
            <p className="mt-2 text-[13px] leading-snug text-muted-foreground">{card.detail}</p>
          </Panel>
        ))}
      </div>
      <Reveal show={phase >= 3}>
        <p className="mt-4 text-[14px] text-foreground">
          The 4¢ gap between 63¢ and 67¢ is the bid–ask spread. 65¢ sits in the middle — nobody has to trade there.
        </p>
      </Reveal>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Bid / ask / midpoint strip                                              */
/* -------------------------------------------------------------------------- */

export function BidAskMidpointAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1400, 1600, 1600, 1800, 4200], rootRef, 4);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A price strip shows a 63 cent bid, a 67 cent ask, a 65 cent midpoint between them, and a 4 cent spread."
      caption="Hypothetical YES book. Enough size at each quote for a small trade."
    >
      <Frames />
      <ScaledStage width={860} height={300}>
        <div className="flex h-full flex-col justify-center gap-5">
          <div className="relative mx-auto h-3 w-[92%] rounded-full bg-muted">
            <div
              className="absolute inset-y-0 rounded-full"
              style={{
                left: "18%",
                right: "18%",
                background: "rgba(100,116,139,0.25)",
                opacity: phase >= 3 ? 1 : 0,
                transition: `opacity 500ms ${EASE}`,
              }}
            />
            {[
              { left: "18%", label: "63¢ bid", color: BID, on: phase >= 0 },
              { left: "50%", label: "65¢ mid", color: MID, on: phase >= 2 },
              { left: "82%", label: "67¢ ask", color: ASK, on: phase >= 1 },
            ].map((mark) => (
              <div
                key={mark.label}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: mark.left,
                  opacity: mark.on ? 1 : 0.15,
                  transition: `opacity 400ms ease`,
                }}
              >
                <div className="size-3.5 rounded-full border-2 border-background" style={{ background: mark.color }} />
                <p className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap font-mono text-[12px] font-semibold tabular-nums" style={{ color: mark.color }}>
                  {mark.label}
                </p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Panel className="px-4 py-3">
              <Eyebrow>Trade now</Eyebrow>
              <p className="mt-1 text-[14px] text-foreground">
                Buy at <span className="font-mono font-semibold" style={{ color: ASK }}>67¢</span>
                <span className="mx-1.5 text-muted-foreground">·</span>
                Sell at <span className="font-mono font-semibold" style={{ color: BID }}>63¢</span>
              </p>
            </Panel>
            <Reveal show={phase >= 3}>
              <Panel className="px-4 py-3">
                <Eyebrow>Spread</Eyebrow>
                <p className="mt-1 font-mono text-[22px] font-semibold tabular-nums text-foreground">4¢</p>
                <p className="text-[12.5px] text-muted-foreground">Ask − bid. The midpoint is a description, not an offer.</p>
              </Panel>
            </Reveal>
          </div>
          <Reveal show={phase >= 4}>
            <p className="text-[13.5px] text-muted-foreground">
              Polymarket usually shows the midpoint. When the spread is wider than 10¢, it can show the last trade instead.
            </p>
          </Reveal>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Round-trip cost explorer                                                */
/* -------------------------------------------------------------------------- */

export function RoundTripCostExplorer() {
  const [shares, setShares] = useState(100);
  const buy = (shares * EXAMPLE.ask) / 100;
  const sell = (shares * EXAMPLE.bid) / 100;
  const loss = buy - sell;
  const pct = buy > 0 ? (loss / buy) * 100 : 0;

  return (
    <InteractiveFigure caption="Hypothetical quotes stay fixed: buy 67¢, sell 63¢. Drag size to see the round-trip gap before fees.">
      <Panel className="p-5">
        <Slider label="YES shares" value={shares} min={10} max={500} step={10} onChange={setShares} color={ASK} />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Buy now @ 67¢</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums text-foreground">{dollars(buy)}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Sell now @ 63¢</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums text-foreground">{dollars(sell)}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Round-trip gap</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums" style={{ color: BAD }}>
              −{dollars(loss)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground" aria-live="polite">
          That is the full {EXAMPLE.spread}¢ spread crossed once: about{" "}
          <span className="font-mono text-foreground">{pct.toFixed(2)}%</span> of the entry cost. Holding to settlement is a
          different exit — this measures buy-then-sell against these quotes.
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Spread ≠ fee                                                            */
/* -------------------------------------------------------------------------- */

export function SpreadVsFeeAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1800, 2000, 2200, 4000], rootRef, 3);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Two panels contrast the bid-ask spread as a gap between traders' quotes with trading fees as a separate platform charge."
      caption="Same market. Different parts of the bill."
    >
      <Frames />
      <div className="grid gap-3 md:grid-cols-2">
        <Panel
          className="px-4 py-4"
          style={{
            opacity: phase >= 0 ? 1 : 0.2,
            transition: `opacity 400ms ease`,
          }}
        >
          <Eyebrow>Spread</Eyebrow>
          <p className="mt-2 font-mono text-[24px] font-semibold tabular-nums text-foreground">4¢ gap</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            Between the best bid and best ask. It belongs to the quotes in the book, not automatically to Polymarket.
          </p>
        </Panel>
        <Panel
          className="px-4 py-4"
          style={{
            opacity: phase >= 1 ? 1 : 0.2,
            transition: `opacity 400ms ease`,
          }}
        >
          <Eyebrow>Fees</Eyebrow>
          <p className="mt-2 font-mono text-[24px] font-semibold tabular-nums text-foreground">Separate</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            Where they apply, fees are an extra line. Cross the spread and still check the fee schedule.
          </p>
        </Panel>
      </div>
      <Reveal show={phase >= 2}>
        <Panel className="mt-3 px-4 py-3">
          <Eyebrow>Market maker path</Eyebrow>
          <p className="mt-1 text-[14px] text-foreground">
            A maker might try to buy at 63¢ and sell at 67¢. Both sides must fill. One fill leaves inventory risk.
          </p>
        </Panel>
      </Reveal>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Limit at the midpoint                                                   */
/* -------------------------------------------------------------------------- */

export function LimitAtMidpointAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop } = useGuidePhases([1600, 2000, 2200, 4200], rootRef, 3);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A buy limit at 65 cents sits between the 63 cent bid and 67 cent ask and waits. Taking the 67 cent ask fills immediately."
      caption="Limit sets your price. Someone still has to meet it."
    >
      <Frames />
      <ScaledStage width={860} height={280}>
        <div key={loop} className="grid h-full gap-4 sm:grid-cols-2">
          <Panel className="flex flex-col justify-center p-5">
            <Eyebrow>Buy limit @ 65¢</Eyebrow>
            <p className="mt-3 font-mono text-[40px] font-semibold tabular-nums leading-none text-foreground">65¢</p>
            <Reveal show={phase >= 1}>
              <p className="mt-4 text-[14px] leading-relaxed text-foreground">
                Sits between the quotes. Needs a seller willing to come to you — may fill, fill partly, or wait.
              </p>
            </Reveal>
          </Panel>
          <Panel className="flex flex-col justify-center p-5">
            <Eyebrow>Take the ask @ 67¢</Eyebrow>
            <div className="mt-4 space-y-3">
              <div
                className="rounded-lg border border-border px-3 py-2.5"
                style={{
                  opacity: phase >= 2 ? 1 : 0.35,
                  background: phase >= 2 ? "rgba(34,197,94,0.08)" : undefined,
                  transition: `opacity 400ms ease, background 400ms ease`,
                }}
              >
                <p className="font-mono text-[18px] font-semibold tabular-nums" style={{ color: FILL }}>
                  Fills now
                </p>
                <p className="text-[12.5px] text-muted-foreground">A 67¢ buy limit against a 67¢ ask is still taking liquidity.</p>
              </div>
              <Reveal show={phase >= 3}>
                <p className="text-[13px] text-muted-foreground">“Limit” is a price constraint — not a guarantee you become a maker.</p>
              </Reveal>
            </div>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Tight spread ≠ deep book                                                */
/* -------------------------------------------------------------------------- */

const THIN_BOOK = [
  { price: 66, side: "ask" as const, qty: 20 },
  { price: 67, side: "ask" as const, qty: 40 },
  { price: 65, side: "bid" as const, qty: 25 },
  { price: 64, side: "bid" as const, qty: 80 },
];

export function TightSpreadDepthExplorer() {
  const [size, setSize] = useState(100);
  const asks = THIN_BOOK.filter((row) => row.side === "ask").sort((a, b) => a.price - b.price);
  const bestAsk = asks[0]?.price ?? 66;
  const bestBid = 65;
  const spread = bestAsk - bestBid;

  let left = size;
  let cost = 0;
  let filled = 0;
  const takes: { price: number; take: number }[] = [];
  for (const level of asks) {
    const take = Math.min(left, level.qty);
    if (take <= 0) break;
    takes.push({ price: level.price, take });
    cost += take * level.price;
    filled += take;
    left -= take;
  }
  const avg = filled > 0 ? cost / filled : null;

  return (
    <InteractiveFigure caption="1¢ spread at the top. Thin ask size. Drag a larger buy and watch the average climb.">
      <Panel className="p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="rounded-md border border-border px-2.5 py-1 font-mono text-[12px] tabular-nums text-foreground">
            Spread {spread}¢
          </span>
          <span className="rounded-md border border-border px-2.5 py-1 font-mono text-[12px] tabular-nums text-muted-foreground">
            Best ask size 20
          </span>
        </div>
        <Slider label="Shares to buy now" value={size} min={10} max={60} step={5} onChange={setSize} color={ASK} />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Best ask</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums" style={{ color: ASK }}>
              {centsLabel(bestAsk)}
            </p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Average if you lift {size}</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums text-foreground">
              {avg != null ? centsLabel(avg) : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Vs best ask</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums" style={{ color: avg != null && avg > bestAsk + 0.05 ? BAD : FILL }}>
              {avg != null ? `+${(avg - bestAsk).toFixed(1)}¢` : "—"}
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {asks.map((level) => {
            const take = takes.find((row) => row.price === level.price)?.take ?? 0;
            return (
              <li key={level.price} className="grid grid-cols-[4rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-[13px]">
                <span className="font-mono tabular-nums" style={{ color: ASK }}>
                  {level.price}¢
                </span>
                <div className="relative h-3 overflow-hidden rounded bg-muted">
                  <div className="absolute inset-y-0 left-0 bg-amber-500/20" style={{ width: `${(level.qty / 40) * 100}%` }} />
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{ width: `${(take / 40) * 100}%`, background: FILL, transition: `width 300ms ${EASE}` }}
                  />
                </div>
                <span className="text-right font-mono text-[12px] tabular-nums text-muted-foreground">
                  {take ? `${take}/` : ""}
                  {level.qty}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground" aria-live="polite">
          A tight spread answers the top-of-book gap. Size at each level answers whether that gap survives your order.
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Live Polymarket spread explorer                                         */
/* -------------------------------------------------------------------------- */

const DEFAULT_SLUG = "will-the-us-invade-iran-before-2027";

type LiveBook = {
  title: string;
  tokenId: string;
  bestBid: number | null;
  bestAsk: number | null;
  bidSize: number | null;
  askSize: number | null;
  midpoint: number | null;
  lastTrade: number | null;
  displayMode: "midpoint" | "last";
};

function summarizeBook(book: Record<string, unknown>, title: string, tokenId: string): LiveBook {
  const bids = parseLevels(book.bids);
  const asks = parseLevels(book.asks);
  const bestBid = bids.length ? Math.max(...bids.map((row) => row.price)) : null;
  const bestAsk = asks.length ? Math.min(...asks.map((row) => row.price)) : null;
  const bidSize = bestBid == null ? null : bids.find((row) => row.price === bestBid)?.size ?? null;
  const askSize = bestAsk == null ? null : asks.find((row) => row.price === bestAsk)?.size ?? null;
  const midpoint = bestBid != null && bestAsk != null ? (bestBid + bestAsk) / 2 : null;
  const lastTradeRaw = Number(book.last_trade_price ?? book.lastTradePrice);
  const lastTrade = Number.isFinite(lastTradeRaw) ? lastTradeRaw : null;
  const spreadCents = bestBid != null && bestAsk != null ? toCents(bestAsk - bestBid) : null;
  const displayMode: "midpoint" | "last" = spreadCents != null && spreadCents > 10 ? "last" : "midpoint";
  return {
    title,
    tokenId,
    bestBid,
    bestAsk,
    bidSize,
    askSize,
    midpoint,
    lastTrade,
    displayMode,
  };
}

async function resolveToken(input: string, signal: AbortSignal): Promise<{ tokenId: string; title: string }> {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Enter a market slug or YES token id.");
  if (/^\d{20,}$/.test(trimmed)) {
    return { tokenId: trimmed, title: trimmed };
  }
  const slug = trimmed.replace(/^https?:\/\/(www\.)?polymarket\.com\/event\//i, "").replace(/\/$/, "");
  const res = await fetch(
    `/api/integrations/polymarket?query=listMarkets&slug=${encodeURIComponent(slug)}&limit=5`,
    { signal },
  );
  const payload = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error(payload?.message || payload?.error || "Couldn't look up that market.");
  const markets = Array.isArray(payload) ? payload : payload?.markets || payload?.data || [];
  const market =
    markets.find((row: Record<string, unknown>) => String(row.slug || "") === slug) ||
    markets[0];
  if (!market) throw new Error("No Polymarket market matched that slug.");
  let tokens: unknown = market.clobTokenIds;
  if (typeof tokens === "string") {
    try {
      tokens = JSON.parse(tokens);
    } catch {
      tokens = [];
    }
  }
  const tokenId = Array.isArray(tokens) ? String(tokens[0] || "") : "";
  if (!tokenId) throw new Error("That market has no CLOB YES token id.");
  return { tokenId, title: String(market.question || market.title || slug) };
}

export function LivePolymarketSpreadExplorer() {
  const [draft, setDraft] = useState(DEFAULT_SLUG);
  const [query, setQuery] = useState(DEFAULT_SLUG);
  const [book, setBook] = useState<LiveBook | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"buy" | "sell" | "look">("look");
  const rootRef = useRef<HTMLElement>(null);
  const inView = useInView(rootRef, 0.2);

  useEffect(() => {
    if (!inView || !query) return undefined;
    const abort = new AbortController();
    setStatus("loading");
    setError("");
    const load = async () => {
      try {
        const resolved = await resolveToken(query, abort.signal);
        const res = await fetch("/api/integrations/polymarket?query=getOrderBooks", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify([{ token_id: resolved.tokenId }]),
          signal: abort.signal,
        });
        const payload = await res.json().catch(() => ([]));
        if (!res.ok) throw new Error(payload?.message || payload?.error || "Couldn't load the order book.");
        const rows = Array.isArray(payload) ? payload : [];
        const raw = (rows[0] && typeof rows[0] === "object" ? rows[0] : null) as Record<string, unknown> | null;
        if (!raw) throw new Error("Empty order book response.");
        const next = summarizeBook(raw, resolved.title, resolved.tokenId);
        if (next.bestBid == null || next.bestAsk == null) throw new Error("No bid/ask on this YES token right now.");
        setBook(next);
        setStatus("ready");
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setStatus("error");
        setError((err as Error)?.message || "Couldn't load the order book.");
        setBook(null);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 20_000);
    return () => {
      abort.abort();
      window.clearInterval(timer);
    };
  }, [query, inView]);

  const spreadCents = useMemo(() => {
    if (book?.bestBid == null || book?.bestAsk == null) return null;
    return toCents(book.bestAsk - book.bestBid);
  }, [book]);

  const displayCents = useMemo(() => {
    if (!book) return null;
    if (book.displayMode === "last" && book.lastTrade != null) return toCents(book.lastTrade);
    if (book.midpoint != null) return toCents(book.midpoint);
    return null;
  }, [book]);

  const actionable =
    mode === "buy"
      ? book?.bestAsk != null
        ? `Buy now against the ask at ${centsLabel(toCents(book.bestAsk))}.`
        : "No ask."
      : mode === "sell"
        ? book?.bestBid != null
          ? `Sell now against the bid at ${centsLabel(toCents(book.bestBid))}.`
          : "No bid."
        : displayCents != null
          ? `Looking at about ${centsLabel(displayCents)} on the display — not a promise you can trade there.`
          : "Looking at the quotes.";

  return (
    <figure ref={rootRef} data-article-bleed className="not-prose mx-auto my-8 w-full max-w-[48rem] font-sans sm:my-10">
      <div className="rounded-xl border border-border bg-muted/50 p-3 sm:p-5">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <label className="text-[12px] text-muted-foreground" htmlFor="pm-spread-input">
              Polymarket slug or YES token id
            </label>
            <input
              id="pm-spread-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") setQuery(draft.trim());
              }}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px] text-foreground"
            />
          </div>
          <button
            type="button"
            onClick={() => setQuery(draft.trim())}
            className="rounded-lg bg-foreground px-3 py-2 text-[13px] font-medium text-background"
          >
            Load book
          </button>
        </div>
        <p className="mt-2 truncate text-[12.5px] text-muted-foreground">{book?.title || DEFAULT_SLUG}</p>

        {status === "loading" ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading YES book
          </div>
        ) : status === "error" ? (
          <p className="py-10 text-center text-[13px] text-muted-foreground">{error}</p>
        ) : book ? (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <PillButton active={mode === "look"} onClick={() => setMode("look")}>
                Just looking
              </PillButton>
              <PillButton active={mode === "buy"} onClick={() => setMode("buy")}>
                Buying
              </PillButton>
              <PillButton active={mode === "sell"} onClick={() => setMode("sell")}>
                Selling
              </PillButton>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Best bid</p>
                <p className="font-mono text-[20px] font-semibold tabular-nums" style={{ color: BID }}>
                  {book.bestBid != null ? centsLabel(toCents(book.bestBid)) : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {book.bidSize != null ? `${Math.round(book.bidSize).toLocaleString()} size` : ""}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Best ask</p>
                <p className="font-mono text-[20px] font-semibold tabular-nums" style={{ color: ASK }}>
                  {book.bestAsk != null ? centsLabel(toCents(book.bestAsk)) : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {book.askSize != null ? `${Math.round(book.askSize).toLocaleString()} size` : ""}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Spread</p>
                <p className="font-mono text-[20px] font-semibold tabular-nums text-foreground">
                  {spreadCents != null ? centsLabel(spreadCents) : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">
                  Display ({book.displayMode === "last" ? "last trade" : "midpoint"})
                </p>
                <p className="font-mono text-[20px] font-semibold tabular-nums text-foreground">
                  {displayCents != null ? centsLabel(displayCents) : "—"}
                </p>
              </div>
            </div>
            <p className="mt-4 text-[13.5px] leading-relaxed text-foreground" aria-live="polite">
              {actionable}
            </p>
          </>
        ) : null}
      </div>
      <figcaption className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
        Live Polymarket YES book via Lychee. Display follows Polymarket’s midpoint rule (last trade when the spread is wider
        than 10¢). Illustration — not a trading recommendation.
      </figcaption>
    </figure>
  );
}
