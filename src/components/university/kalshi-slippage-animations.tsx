"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { BLUE, GREEN, RED, useInView } from "@/components/sections/features/feature-kit";
import { EASE, GuideAnimationFigure, ScaledStage, useGuidePhases } from "@/components/content/guide-animations/guide-animation-kit";
import { InteractiveFigure, PillButton } from "@/components/university/expected-wins-animations";
import { AMBER, Eyebrow, Frames, Panel, Reveal, Slider } from "@/components/university/pythagorean-animations";

const ASK = AMBER;
const FILL = GREEN;
const WAIT = BLUE;
const BAD = RED;

/** Example YES asks from the lesson. Prices in cents. */
const BOOK = [
  { price: 40, qty: 100 },
  { price: 42, qty: 200 },
  { price: 45, qty: 200 },
] as const;

function dollars(value: number, { cents = true }: { cents?: boolean } = {}) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
}

function centsLabel(cents: number) {
  return `${cents.toFixed(Number.isInteger(cents) ? 0 : 1)}¢`;
}

/** Walk the ask book for `want` contracts. Returns filled levels + totals. */
function walkBook(levels: readonly { price: number; qty: number }[], want: number) {
  let left = want;
  let costCents = 0;
  let filled = 0;
  const rows: { price: number; available: number; take: number; cost: number }[] = [];
  for (const level of levels) {
    const take = Math.min(left, level.qty);
    const cost = take * level.price;
    rows.push({ price: level.price, available: level.qty, take, cost });
    costCents += cost;
    filled += take;
    left -= take;
    if (left <= 0) break;
  }
  return {
    rows,
    filled,
    unfilled: Math.max(0, want - filled),
    costDollars: costCents / 100,
    avgCents: filled > 0 ? costCents / filled : null,
    bestCents: levels[0]?.price ?? null,
    fullAtBest: filled > 0 && levels[0] ? (want * levels[0].price) / 100 : null,
  };
}

/* -------------------------------------------------------------------------- */
/* 1. The quote has a quantity                                                */
/* -------------------------------------------------------------------------- */

export function QuoteHasQuantityAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1800, 2200, 2400, 4000], rootRef, 3);
  const showQty = phase >= 1;
  const showWant = phase >= 2;
  const showGap = phase >= 3;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="YES is offered at 40 cents, but only 100 contracts sit at that price. You want 500. The gap is the start of slippage."
      caption="The first price has a quantity attached."
    >
      <Frames />
      <ScaledStage width={860} height={280}>
        <div className="grid h-full grid-cols-[1.1fr_1fr] gap-4">
          <Panel className="flex flex-col justify-center p-6">
            <Eyebrow>What you saw</Eyebrow>
            <p className="mt-3 font-mono text-[48px] font-semibold leading-none tabular-nums" style={{ color: ASK }}>
              40¢
            </p>
            <p className="mt-2 text-[15px] text-muted-foreground">Best YES ask on the screen</p>
            <Reveal show={showWant}>
              <p className="mt-5 text-[14px] text-foreground">
                You want <span className="font-mono font-semibold">500</span> contracts →{" "}
                <span className="font-mono font-semibold">{dollars(200)}</span> if everything filled there.
              </p>
            </Reveal>
          </Panel>
          <Panel className="flex flex-col justify-center p-6">
            <Eyebrow>What the book had</Eyebrow>
            <div className="mt-4 space-y-3">
              <div className="flex items-end justify-between gap-3">
                <span className="text-[13px] text-muted-foreground">At 40¢</span>
                <span className="font-mono text-[28px] font-semibold tabular-nums text-foreground" style={{ opacity: showQty ? 1 : 0.25 }}>
                  100
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: showQty ? "20%" : "0%",
                    background: ASK,
                    transition: `width 700ms ${EASE}`,
                  }}
                />
              </div>
              <Reveal show={showGap}>
                <p className="text-[14px] leading-snug text-foreground">
                  <span className="font-semibold" style={{ color: BAD }}>
                    400 still needed
                  </span>{" "}
                  after the best ask runs out.
                </p>
              </Reveal>
            </div>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Walk the book                                                           */
/* -------------------------------------------------------------------------- */

export function WalkTheBookAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop } = useGuidePhases([1400, 1600, 1600, 1600, 4200], rootRef, 4);
  const filledLevels = Math.min(3, Math.max(0, phase));
  const walk = walkBook(BOOK, 500);
  const shownCost = walk.rows.slice(0, filledLevels).reduce((sum, row) => sum + row.cost, 0) / 100;
  const shownFilled = walk.rows.slice(0, filledLevels).reduce((sum, row) => sum + row.take, 0);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A market order for 500 YES walks three ask levels: 100 at 40 cents, 200 at 42 cents, 200 at 45 cents. Total cost 214 dollars, average 42.8 cents."
      caption="Hypothetical YES asks. The order walks the book."
    >
      <Frames />
      <ScaledStage width={860} height={360}>
        <div key={loop} className="flex h-full flex-col gap-4">
          <div className="flex items-center justify-between">
            <Eyebrow>Buy 500 YES · market order</Eyebrow>
            <p className="font-mono text-[13px] tabular-nums text-muted-foreground">
              Filled {shownFilled.toLocaleString()} · {dollars(shownCost)}
            </p>
          </div>
          <div className="grid flex-1 grid-cols-[1.2fr_0.9fr] gap-4">
            <Panel className="overflow-hidden p-0">
              <div className="grid grid-cols-[5rem_1fr_5.5rem_5.5rem] border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                <span>Ask</span>
                <span>Available</span>
                <span className="text-right">Take</span>
                <span className="text-right">Cost</span>
              </div>
              {BOOK.map((level, index) => {
                const row = walk.rows[index];
                const on = index < filledLevels;
                const width = (level.qty / 200) * 100;
                return (
                  <div
                    key={level.price}
                    className="grid grid-cols-[5rem_1fr_5.5rem_5.5rem] items-center border-b border-border/70 px-4 py-3 last:border-b-0"
                    style={{
                      opacity: on ? 1 : 0.35,
                      background: on ? "rgba(217,119,6,0.06)" : undefined,
                      transition: `opacity 400ms ease, background 400ms ease`,
                    }}
                  >
                    <span className="font-mono text-[16px] font-semibold tabular-nums" style={{ color: ASK }}>
                      {level.price}¢
                    </span>
                    <div className="pr-4">
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: on ? `${width}%` : "0%",
                            background: on ? FILL : ASK,
                            transition: `width 600ms ${EASE}`,
                          }}
                        />
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{level.qty} contracts</p>
                    </div>
                    <span className="text-right font-mono text-[14px] tabular-nums text-foreground">{on ? row.take : "—"}</span>
                    <span className="text-right font-mono text-[14px] tabular-nums text-foreground">
                      {on ? dollars(row.cost / 100) : "—"}
                    </span>
                  </div>
                );
              })}
            </Panel>
            <Panel className="flex flex-col justify-center gap-4 p-5">
              <div>
                <Eyebrow>If all filled at 40¢</Eyebrow>
                <p className="mt-1 font-mono text-[22px] tabular-nums text-muted-foreground">{dollars(200)}</p>
              </div>
              <div style={{ opacity: filledLevels >= 3 ? 1 : 0.35, transition: "opacity 400ms ease" }}>
                <Eyebrow>Actual fill</Eyebrow>
                <p className="mt-1 font-mono text-[28px] font-semibold tabular-nums text-foreground">{dollars(214)}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Average <span className="font-mono font-medium text-foreground">42.8¢</span>
                  <span className="mx-1.5">·</span>
                  <span style={{ color: BAD }}>+$14 vs best ask</span>
                </p>
              </div>
            </Panel>
          </div>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Size explorer                                                           */
/* -------------------------------------------------------------------------- */

export function SizeSlippageExplorer() {
  const [size, setSize] = useState(500);
  const walk = useMemo(() => walkBook(BOOK, size), [size]);
  const slipCents = walk.avgCents != null && walk.bestCents != null ? walk.avgCents - walk.bestCents : 0;
  const extra = walk.fullAtBest != null ? walk.costDollars - walk.fullAtBest : 0;

  return (
    <InteractiveFigure caption="Hypothetical book: 100 @ 40¢, 200 @ 42¢, 200 @ 45¢. Drag the size.">
      <Panel className="p-5">
        <Slider label="Contracts to buy" value={size} min={10} max={500} step={10} onChange={setSize} color={ASK} />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Average fill</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums text-foreground">
              {walk.avgCents != null ? centsLabel(walk.avgCents) : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Total before fees</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums text-foreground">{dollars(walk.costDollars)}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Vs filling all at 40¢</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums" style={{ color: extra > 0.005 ? BAD : FILL }}>
              {extra > 0.005 ? `+${dollars(extra)}` : dollars(0)}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {BOOK.map((level) => {
            const row = walk.rows.find((item) => item.price === level.price);
            const take = row?.take ?? 0;
            return (
              <div key={level.price} className="grid grid-cols-[4rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-[13px]">
                <span className="font-mono tabular-nums" style={{ color: ASK }}>
                  {level.price}¢
                </span>
                <div className="relative h-4 overflow-hidden rounded bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 bg-amber-500/25"
                    style={{ width: `${(level.qty / 200) * 100}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-sm"
                    style={{
                      width: `${(take / 200) * 100}%`,
                      background: FILL,
                      transition: `width 350ms ${EASE}`,
                    }}
                  />
                </div>
                <span className="text-right font-mono tabular-nums text-muted-foreground">
                  {take}/{level.qty}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground" aria-live="polite">
          {size <= 100 ? (
            <>At {size} contracts you stay on the best ask. Average stays 40¢.</>
          ) : (
            <>
              Slippage vs the 40¢ quote: <span className="font-mono text-foreground">{slipCents.toFixed(1)}¢</span> per
              contract on the filled size.
            </>
          )}
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Which reference price?                                                  */
/* -------------------------------------------------------------------------- */

export function ReferencePriceExplorer() {
  const [mode, setMode] = useState<"screen" | "preview">("screen");
  const avg = 42.8;
  const reference = mode === "screen" ? 40 : 42.8;
  const delta = avg - reference;

  return (
    <InteractiveFigure caption="Same 42.8¢ fill. Change the reference price and the “slippage” number changes with it.">
      <div className="flex flex-wrap gap-2">
        <PillButton active={mode === "screen"} onClick={() => setMode("screen")}>
          Vs best ask (40¢)
        </PillButton>
        <PillButton active={mode === "preview"} onClick={() => setMode("preview")}>
          Vs order preview (42.8¢)
        </PillButton>
      </div>
      <Panel className="mt-4 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Eyebrow>Reference</Eyebrow>
            <p className="mt-1 font-mono text-[26px] font-semibold tabular-nums text-foreground">{centsLabel(reference)}</p>
          </div>
          <div>
            <Eyebrow>Actual average</Eyebrow>
            <p className="mt-1 font-mono text-[26px] font-semibold tabular-nums text-foreground">{centsLabel(avg)}</p>
          </div>
          <div>
            <Eyebrow>Difference</Eyebrow>
            <p
              className="mt-1 font-mono text-[26px] font-semibold tabular-nums"
              style={{ color: Math.abs(delta) < 0.05 ? FILL : BAD }}
            >
              {delta === 0 ? "0¢" : `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}¢`}
            </p>
          </div>
        </div>
        <p className="mt-4 text-[14px] leading-relaxed text-foreground" aria-live="polite">
          {mode === "screen" ? (
            <>
              Against the first price on the screen, the order paid more. That measures how far it walked the book.
            </>
          ) : (
            <>
              Against a preview that already showed 42.8¢, this fill matched. Write down which reference you used.
            </>
          )}
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Spread ≠ depth ≠ fees                                                   */
/* -------------------------------------------------------------------------- */

export function SpreadDepthFeesAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([2000, 2200, 2200, 4000], rootRef, 3);

  const cards = [
    {
      title: "Spread",
      body: "39¢ bid · 40¢ ask",
      detail: "1¢ between the best buy and sell offers.",
      color: BLUE,
    },
    {
      title: "Depth",
      body: "100 at 40¢",
      detail: "How many contracts sit at each price.",
      color: ASK,
    },
    {
      title: "Fees",
      body: "Separate charge",
      detail: "Not part of the average fill price.",
      color: BAD,
    },
  ] as const;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Three cards appear: the bid-ask spread, order book depth, and trading fees. They measure different things."
      caption="Same best ask. Different questions."
    >
      <Frames />
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((card, index) => (
          <Panel
            key={card.title}
            className="px-4 py-4"
            style={{
              opacity: phase >= index ? 1 : 0.2,
              transform: phase >= index ? "none" : "translateY(8px)",
              transition: `opacity 400ms ease, transform 500ms ${EASE}`,
            }}
          >
            <Eyebrow>{card.title}</Eyebrow>
            <p className="mt-2 font-mono text-[18px] font-semibold text-foreground">{card.body}</p>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{card.detail}</p>
          </Panel>
        ))}
      </div>
      <Reveal show={phase >= 3}>
        <p className="mt-4 text-[14px] text-foreground">
          A tight spread does not tell you whether 500 contracts are available at 40¢.
        </p>
      </Reveal>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Limit order partial fill                                                */
/* -------------------------------------------------------------------------- */

export function LimitOrderPartialFillAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1600, 2000, 2200, 4000], rootRef, 3);
  const filled = phase >= 1 ? 100 : 0;
  const waiting = phase >= 2 ? 400 : 0;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A buy limit at 40 cents fills 100 contracts immediately. 400 remain unfilled, waiting for more sellers at 40 cents. It cannot fill at 42 or 45 cents."
      caption="Limit at 40¢. Price protected. Size not guaranteed."
    >
      <Frames />
      <ScaledStage width={860} height={300}>
        <div className="flex h-full flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Eyebrow>Buy limit · 500 YES · max 40¢</Eyebrow>
            <span className="font-mono text-[12px] text-muted-foreground">Cannot fill at 42¢ or 45¢</span>
          </div>
          <Panel className="p-5">
            <div className="flex h-10 overflow-hidden rounded-lg border border-border">
              <div
                className="flex items-center justify-center font-mono text-[12px] font-semibold text-white"
                style={{
                  width: `${(filled / 500) * 100}%`,
                  background: FILL,
                  transition: `width 700ms ${EASE}`,
                }}
              >
                {filled ? `${filled} filled` : null}
              </div>
              <div
                className="flex items-center justify-center font-mono text-[12px] font-semibold"
                style={{
                  width: `${(waiting / 500) * 100}%`,
                  background: "rgba(47,111,237,0.15)",
                  color: WAIT,
                  transition: `width 700ms ${EASE}`,
                }}
              >
                {waiting ? `${waiting} waiting` : null}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Eyebrow>Filled now</Eyebrow>
                <p className="mt-1 text-[14px] text-foreground">100 @ 40¢ · {dollars(40)}</p>
              </div>
              <Reveal show={phase >= 2}>
                <Eyebrow>Still open</Eyebrow>
                <p className="mt-1 text-[14px] text-foreground">400 need more sellers at your price — or cancel.</p>
              </Reveal>
            </div>
            <Reveal show={phase >= 3}>
              <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
                “Limit” describes your price constraint. It can still execute immediately when offers match. Fees stay
                separate.
              </p>
            </Reveal>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Live Kalshi order book walk                                             */
/* -------------------------------------------------------------------------- */

type LiveLevel = { priceCents: number; qty: number };

function yesAsksFromBook(orderbookFp: { yes_dollars?: unknown[]; no_dollars?: unknown[] } | null): LiveLevel[] {
  const noBids = Array.isArray(orderbookFp?.no_dollars) ? orderbookFp!.no_dollars! : [];
  const asks: LiveLevel[] = [];
  for (const level of noBids) {
    if (!Array.isArray(level) || level.length < 2) continue;
    const noPrice = Number(level[0]);
    const qty = Number(level[1]);
    if (!Number.isFinite(noPrice) || !Number.isFinite(qty) || qty <= 0) continue;
    const yesAskCents = Math.round((1 - noPrice) * 1000) / 10;
    asks.push({ priceCents: yesAskCents, qty: Math.floor(qty) });
  }
  // Best YES ask = highest NO bid → lowest (1 - no). Sort ascending by ask price.
  return asks.sort((a, b) => a.priceCents - b.priceCents).slice(0, 8);
}

const DEFAULT_TICKER = "KXFEDDECISION-26DEC-H25";

export function LiveKalshiBookExplorer() {
  const [ticker, setTicker] = useState(DEFAULT_TICKER);
  const [draft, setDraft] = useState(DEFAULT_TICKER);
  const [size, setSize] = useState(500);
  const [title, setTitle] = useState("");
  const [levels, setLevels] = useState<LiveLevel[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLElement>(null);
  const inView = useInView(rootRef, 0.2);

  useEffect(() => {
    if (!inView || !ticker) return undefined;
    const abort = new AbortController();
    setStatus("loading");
    setError("");
    const load = async () => {
      try {
        const [bookRes, marketRes] = await Promise.all([
          fetch(`/api/integrations/kalshi-live/markets/orderbook?ticker=${encodeURIComponent(ticker)}&depth=10`, {
            signal: abort.signal,
          }),
          fetch(`/api/integrations/kalshi-live/markets/get?ticker=${encodeURIComponent(ticker)}`, {
            signal: abort.signal,
          }).catch(() => null),
        ]);
        const bookJson = await bookRes.json().catch(() => ({}));
        if (!bookRes.ok) throw new Error(bookJson?.message || bookJson?.error || "Couldn't load the order book.");
        const asks = yesAsksFromBook(bookJson.orderbook_fp);
        if (!asks.length) throw new Error("No YES ask depth in this book right now.");
        setLevels(asks);
        setStatus("ready");
        if (marketRes?.ok) {
          const marketJson = await marketRes.json().catch(() => ({}));
          const market = marketJson?.market || marketJson;
          setTitle(String(market?.title || market?.yes_sub_title || ticker));
        } else {
          setTitle(ticker);
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setStatus("error");
        setError((err as Error)?.message || "Couldn't load the order book.");
        setLevels([]);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 20_000);
    return () => {
      abort.abort();
      window.clearInterval(timer);
    };
  }, [ticker, inView]);

  const walk = useMemo(() => walkBook(levels.map((level) => ({ price: level.priceCents, qty: level.qty })), size), [levels, size]);

  return (
    <figure ref={rootRef} data-article-bleed className="not-prose mx-auto my-8 w-full max-w-[48rem] font-sans sm:my-10">
      <div className="rounded-xl border border-border bg-muted/50 p-3 sm:p-5">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <label className="text-[12px] text-muted-foreground" htmlFor="kalshi-slip-ticker">
              Kalshi ticker
            </label>
            <input
              id="kalshi-slip-ticker"
              value={draft}
              onChange={(event) => setDraft(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter") setTicker(draft.trim());
              }}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px] text-foreground"
            />
          </div>
          <button
            type="button"
            onClick={() => setTicker(draft.trim())}
            className="rounded-lg bg-foreground px-3 py-2 text-[13px] font-medium text-background"
          >
            Load book
          </button>
        </div>
        <p className="mt-2 truncate text-[12.5px] text-muted-foreground">{title || "Live YES asks derived from NO bids"}</p>

        {status === "loading" ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading order book
          </div>
        ) : status === "error" ? (
          <p className="py-10 text-center text-[13px] text-muted-foreground">{error}</p>
        ) : (
          <>
            <div className="mt-4">
              <Slider label="Hypothetical buy size" value={size} min={10} max={Math.min(5000, Math.max(100, walk.filled || 500))} step={10} onChange={setSize} color={ASK} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Best YES ask</p>
                <p className="font-mono text-[20px] font-semibold tabular-nums">{walk.bestCents != null ? centsLabel(walk.bestCents) : "—"}</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Avg if you lift {size.toLocaleString()}</p>
                <p className="font-mono text-[20px] font-semibold tabular-nums">
                  {walk.avgCents != null ? centsLabel(walk.avgCents) : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Extra vs best ask</p>
                <p className="font-mono text-[20px] font-semibold tabular-nums" style={{ color: walk.avgCents && walk.bestCents && walk.avgCents > walk.bestCents + 0.05 ? BAD : FILL }}>
                  {walk.avgCents != null && walk.bestCents != null ? `${(walk.avgCents - walk.bestCents).toFixed(1)}¢` : "—"}
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {levels.map((level) => {
                const row = walk.rows.find((item) => item.price === level.priceCents);
                const take = row?.take ?? 0;
                const maxQty = Math.max(...levels.map((item) => item.qty), 1);
                return (
                  <li key={level.priceCents} className="grid grid-cols-[4.5rem_minmax(0,1fr)_5rem] items-center gap-3 text-[13px]">
                    <span className="font-mono tabular-nums" style={{ color: ASK }}>
                      {centsLabel(level.priceCents)}
                    </span>
                    <div className="relative h-3 overflow-hidden rounded bg-background">
                      <div className="absolute inset-y-0 left-0 bg-amber-500/20" style={{ width: `${(level.qty / maxQty) * 100}%` }} />
                      <div
                        className="absolute inset-y-0 left-0"
                        style={{ width: `${(take / maxQty) * 100}%`, background: FILL, transition: `width 300ms ${EASE}` }}
                      />
                    </div>
                    <span className="text-right font-mono text-[12px] tabular-nums text-muted-foreground">
                      {take ? `${take.toLocaleString()} / ` : ""}
                      {level.qty.toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ul>
            {walk.unfilled > 0 ? (
              <p className="mt-3 text-[12.5px] text-muted-foreground">
                Only {walk.filled.toLocaleString()} contracts sit within the displayed asks. {walk.unfilled.toLocaleString()} would need deeper levels.
              </p>
            ) : null}
          </>
        )}
      </div>
      <figcaption className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
        Live Kalshi book via Lychee. YES asks are inferred from NO bids (ask ≈ 100¢ − NO bid). Illustration for depth — not a trading recommendation.
      </figcaption>
    </figure>
  );
}
