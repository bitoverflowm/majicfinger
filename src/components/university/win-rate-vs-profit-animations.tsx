"use client";

import { useMemo, useRef, useState } from "react";

import { BLUE, GREEN, RED } from "@/components/sections/features/feature-kit";
import { EASE, GuideAnimationFigure, ScaledStage, useGuidePhases } from "@/components/content/guide-animations/guide-animation-kit";
import { InteractiveFigure, PillButton } from "@/components/university/expected-wins-animations";
import { AMBER, Eyebrow, Frames, Panel, Reveal, Slider } from "@/components/university/pythagorean-animations";

const WIN = GREEN;
const LOSS = RED;
const PRICE = AMBER;
const EV = BLUE;

function dollars(value: number) {
  const sign = value < 0 ? "−" : value > 0 ? "+" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function centsLabel(cents: number) {
  const rounded = Math.round(cents * 10) / 10;
  return `${rounded.toFixed(Number.isInteger(rounded) ? 0 : 1)}¢`;
}

/* -------------------------------------------------------------------------- */
/* 1. 90% wins, still down                                                    */
/* -------------------------------------------------------------------------- */

export function HighWinRateLossAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1600, 1800, 2000, 4200], rootRef, 3);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="One hundred contracts bought at 92 cents. Ninety win for 90 dollars. Cost was 92 dollars, so the record is down 2 dollars before fees despite a 90 percent win rate."
      caption="Hypothetical equal-sized binary contracts held to settlement."
    >
      <Frames />
      <ScaledStage width={860} height={300}>
        <div className="grid h-full gap-4 sm:grid-cols-2">
          <Panel className="flex flex-col justify-center p-5">
            <Eyebrow>What win rate sees</Eyebrow>
            <p className="mt-3 font-mono text-[48px] font-semibold leading-none tabular-nums" style={{ color: WIN }}>
              90%
            </p>
            <Reveal show={phase >= 1}>
              <p className="mt-3 text-[14px] text-foreground">90 winners · 10 losers</p>
            </Reveal>
          </Panel>
          <Panel className="flex flex-col justify-center p-5">
            <Eyebrow>What the cash says</Eyebrow>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-muted-foreground">Spent (100 × 92¢)</span>
                <span className="font-mono font-semibold tabular-nums text-foreground">$92.00</span>
              </div>
              <Reveal show={phase >= 2}>
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-muted-foreground">Payout (90 × $1)</span>
                  <span className="font-mono font-semibold tabular-nums text-foreground">$90.00</span>
                </div>
              </Reveal>
              <Reveal show={phase >= 3}>
                <div className="mt-2 rounded-lg border border-border px-3 py-2.5" style={{ background: "rgba(239,68,68,0.08)" }}>
                  <p className="text-[11px] text-muted-foreground">Net before fees</p>
                  <p className="font-mono text-[28px] font-semibold tabular-nums" style={{ color: LOSS }}>
                    −$2.00
                  </p>
                </div>
              </Reveal>
            </div>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Dollars left out of win rate                                            */
/* -------------------------------------------------------------------------- */

export function WinRateCashExplorer() {
  const [priceCents, setPriceCents] = useState(92);
  const wins = 90;
  const losses = 10;
  const winProfit = wins * ((100 - priceCents) / 100);
  const lossCost = losses * (priceCents / 100);
  const net = winProfit - lossCost;

  return (
    <InteractiveFigure caption="Keep 90 wins and 10 losses. Drag the entry price and watch winners earn little while losers cost a lot.">
      <Panel className="p-5">
        <Slider label="Entry price per contract" value={priceCents} min={50} max={95} step={1} onChange={setPriceCents} color={PRICE} />
        <div className="mt-5 overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[1fr_4.5rem_6rem_5.5rem] border-b border-border bg-background px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            <span>Result</span>
            <span className="text-right">n</span>
            <span className="text-right">Per unit</span>
            <span className="text-right">Total</span>
          </div>
          <div className="grid grid-cols-[1fr_4.5rem_6rem_5.5rem] items-center border-b border-border/70 px-3 py-2.5 text-[13px]">
            <span className="font-medium" style={{ color: WIN }}>
              Win
            </span>
            <span className="text-right font-mono tabular-nums">{wins}</span>
            <span className="text-right font-mono tabular-nums">+{centsLabel(100 - priceCents)}</span>
            <span className="text-right font-mono tabular-nums" style={{ color: WIN }}>
              {dollars(winProfit)}
            </span>
          </div>
          <div className="grid grid-cols-[1fr_4.5rem_6rem_5.5rem] items-center border-b border-border/70 px-3 py-2.5 text-[13px]">
            <span className="font-medium" style={{ color: LOSS }}>
              Lose
            </span>
            <span className="text-right font-mono tabular-nums">{losses}</span>
            <span className="text-right font-mono tabular-nums">−{centsLabel(priceCents)}</span>
            <span className="text-right font-mono tabular-nums" style={{ color: LOSS }}>
              {dollars(-lossCost)}
            </span>
          </div>
          <div className="grid grid-cols-[1fr_4.5rem_6rem_5.5rem] items-center bg-muted/40 px-3 py-2.5 text-[13px] font-semibold">
            <span>Net</span>
            <span className="text-right font-mono tabular-nums">100</span>
            <span />
            <span className="text-right font-mono tabular-nums" style={{ color: net >= 0 ? WIN : LOSS }}>
              {dollars(net)}
            </span>
          </div>
        </div>
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground" aria-live="polite">
          At {priceCents}¢, a 90% win rate finishes {net >= 0 ? "ahead" : "behind"} before fees. Win rate never saw those dollar
          weights.
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Expected value explorer                                                 */
/* -------------------------------------------------------------------------- */

export function ExpectedValueExplorer() {
  const [pPct, setPPct] = useState(90);
  const [priceCents, setPriceCents] = useState(92);
  const p = pPct / 100;
  const c = priceCents / 100;
  const ev = useMemo(() => p * (1 - c) + (1 - p) * (0 - c), [p, c]);
  const expectedPayout = p;

  return (
    <InteractiveFigure caption="Your probability estimate × outcomes. Drag p and the purchase price. EV is a weighted average — not a promise for the next trade.">
      <Panel className="p-5">
        <div className="space-y-4">
          <Slider label="Your probability (p)" value={pPct} min={50} max={99} step={1} onChange={setPPct} color={EV} />
          <Slider label="Purchase price (c)" value={priceCents} min={50} max={99} step={1} onChange={setPriceCents} color={PRICE} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Expected payout</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums text-foreground">{expectedPayout.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">You pay</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums text-foreground">{c.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">EV / contract</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums" style={{ color: ev >= 0 ? WIN : LOSS }}>
              {ev >= 0 ? "+" : "−"}
              {Math.abs(ev).toFixed(2)}
            </p>
          </div>
        </div>
        <p className="mt-4 font-mono text-[12.5px] leading-relaxed text-muted-foreground" aria-live="polite">
          EV = {p.toFixed(2)}(1 − {c.toFixed(2)}) + {(1 - p).toFixed(2)}(0 − {c.toFixed(2)}) ={" "}
          <span className="text-foreground">
            {ev >= 0 ? "+" : "−"}
            {Math.abs(ev).toFixed(2)}
          </span>
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Break-even price                                                        */
/* -------------------------------------------------------------------------- */

export function BreakEvenPriceExplorer() {
  const [pPct, setPPct] = useState(90);
  const [feeCents, setFeeCents] = useState(0);
  const [priceCents, setPriceCents] = useState(88);
  const breakEven = pPct - feeCents;
  const expectedProfitCents = pPct - priceCents - feeCents;

  return (
    <InteractiveFigure caption="Binary $1/$0 held to settlement: expected profit ≈ p − c − f. Fees lower what you can pay while staying positive EV.">
      <Panel className="p-5">
        <div className="space-y-4">
          <Slider label="Estimated probability (p)" value={pPct} min={55} max={95} step={1} onChange={setPPct} color={EV} />
          <Slider label="Entry fee f (¢ / contract)" value={feeCents} min={0} max={5} step={1} onChange={setFeeCents} color={LOSS} />
          <Slider label="Purchase price c" value={priceCents} min={50} max={95} step={1} onChange={setPriceCents} color={PRICE} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Break-even price</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums text-foreground">{centsLabel(breakEven)}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">You pay</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums text-foreground">{centsLabel(priceCents)}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Expected profit</p>
            <p
              className="font-mono text-[22px] font-semibold tabular-nums"
              style={{ color: expectedProfitCents >= 0 ? WIN : LOSS }}
            >
              {expectedProfitCents >= 0 ? "+" : "−"}
              {centsLabel(Math.abs(expectedProfitCents))}
            </p>
          </div>
        </div>
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground" aria-live="polite">
          {priceCents < breakEven
            ? `Paying below ${centsLabel(breakEven)} leaves positive expected profit under this p and f — if your estimate and fills hold.`
            : priceCents === breakEven
              ? "At break-even before other costs. Any fee already peeled into f."
              : `Paying above ${centsLabel(breakEven)} asks more than your expected payout after the fee.`}
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Positive EV can lose                                                    */
/* -------------------------------------------------------------------------- */

export function PositiveEvCanLoseAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1400, 1600, 1800, 4000], rootRef, 3);

  const cards = [
    { title: "+EV setup", body: "Buy at 88¢ with p = 90%", detail: "Expected +2¢ before fees", color: WIN },
    { title: "This trade", body: "Contract loses", detail: "You still lose the 88¢", color: LOSS },
    { title: "Takeaway", body: "EV ≠ guaranteed profit", detail: "Limited samples can run cold", color: PRICE },
  ] as const;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Three cards: a positive expected value setup, a single losing trade, and the reminder that expected value is not a guaranteed profit."
      caption="A favorable calculation can still lose. A bad one can still win."
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
            <p className="mt-2 text-[15px] font-semibold text-foreground">{card.body}</p>
            <p className="mt-1 text-[13px] text-muted-foreground" style={{ color: index === 1 ? LOSS : undefined }}>
              {card.detail}
            </p>
          </Panel>
        ))}
      </div>
      <Reveal show={phase >= 3}>
        <p className="mt-4 text-[14px] text-foreground">
          Shared risks and large sizes change how damaging a cold streak becomes. The math is only as good as p, fills, and costs.
        </p>
      </Reveal>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. What a “win” means                                                      */
/* -------------------------------------------------------------------------- */

export function WhatCountsAsWinExplorer() {
  const [kind, setKind] = useState<"fill" | "closed" | "resolved" | "event">("resolved");
  const copy = {
    fill: "A fill can look like a win in a feed and still leave you short if the position isn’t closed or settled.",
    closed: "A closed position realizes P&L at exit prices — not the same as a market resolving YES or NO.",
    resolved: "A resolved market scores the binary outcome. Size and entry still decide whether dollars follow.",
    event: "A whole event can bundle many markets. Counting the event once hides the contracts inside it.",
  } as const;

  return (
    <InteractiveFigure caption="Before you trust a win-rate number, ask what the tracker is counting.">
      <div className="flex flex-wrap gap-2">
        <PillButton active={kind === "fill"} onClick={() => setKind("fill")}>
          Fill
        </PillButton>
        <PillButton active={kind === "closed"} onClick={() => setKind("closed")}>
          Closed position
        </PillButton>
        <PillButton active={kind === "resolved"} onClick={() => setKind("resolved")}>
          Resolved market
        </PillButton>
        <PillButton active={kind === "event"} onClick={() => setKind("event")}>
          Whole event
        </PillButton>
      </div>
      <Panel className="mt-4 p-5">
        <Eyebrow>This “win” means</Eyebrow>
        <p className="mt-2 text-[14px] leading-relaxed text-foreground" aria-live="polite">
          {copy[kind]}
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. What to record                                                          */
/* -------------------------------------------------------------------------- */

const RECORD = [
  "Actual cost and quantity",
  "Fees",
  "Final sale or settlement payout",
  "Open positions (price + time)",
  "Pre-trade EV estimate (optional)",
] as const;

export function RecordBesideWinRateAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([900, 900, 900, 900, 900, 2800], rootRef, 5);
  const revealed = Math.min(RECORD.length, phase + 1);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A checklist of what to record alongside win rate: cost, fees, payouts, open marks, and optional pre-trade expected value."
      caption="Compare total money earned with total money lost."
    >
      <Frames />
      <Panel className="overflow-hidden p-0">
        <ul>
          {RECORD.map((item, index) => {
            const on = index < revealed;
            return (
              <li
                key={item}
                className="flex items-center gap-3 border-b border-border/70 px-4 py-3 last:border-b-0"
                style={{ opacity: on ? 1 : 0.25, transition: "opacity 300ms ease" }}
              >
                <span
                  className="grid size-6 place-items-center rounded-full font-mono text-[11px] font-semibold"
                  style={{
                    background: on ? "rgba(34,197,94,0.15)" : "transparent",
                    color: on ? WIN : "var(--muted-foreground)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {index + 1}
                </span>
                <span className="text-[14px] font-medium text-foreground">{item}</span>
              </li>
            );
          })}
        </ul>
      </Panel>
      <Reveal show={phase >= 5}>
        <p className="mt-4 text-[14px] text-foreground">
          A likely winner can still be expensive. How often you win matters only alongside what those wins pay — and what the
          losses cost.
        </p>
      </Reveal>
    </GuideAnimationFigure>
  );
}
