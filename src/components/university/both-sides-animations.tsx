"use client";

import { useRef, useState, type ReactNode } from "react";

import { BLUE, GREEN, RED } from "@/components/sections/features/feature-kit";
import { EASE, GuideAnimationFigure, ScaledStage, useGuidePhases } from "@/components/content/guide-animations/guide-animation-kit";
import { InteractiveFigure, PillButton } from "@/components/university/expected-wins-animations";
import { AMBER, Eyebrow, Frames, Panel, Reveal, Slider } from "@/components/university/pythagorean-animations";
import { cn } from "@/lib/utils";

const YES = GREEN;
const NO = RED;
const PAIR = BLUE;
/** The holder terminal's "Holds YES and NO" flag colour. */
const BOTH = "#d946ef";

/** Amounts are kept in cents so share × price stays exact. */
function usd(cents: number) {
  const dollars = Math.abs(cents) / 100;
  return `$${Number.isInteger(dollars) ? dollars.toLocaleString("en-US") : dollars.toFixed(2)}`;
}

function signedUsd(cents: number) {
  if (cents === 0) return "$0";
  return `${cents > 0 ? "+" : "−"}${usd(cents)}`;
}

function pairPrice(cents: number) {
  return cents >= 100 ? `$${(cents / 100).toFixed(2)}` : `${cents}¢`;
}

const toneOf = (cents: number) => (cents > 0 ? YES : cents < 0 ? NO : "var(--muted-foreground)");

function SideTag({ side, className }: { side: "YES" | "NO"; className?: string }) {
  const color = side === "YES" ? YES : NO;
  return (
    <span
      className={cn("inline-flex h-5 items-center rounded px-1.5 font-mono text-[10.5px] font-semibold", className)}
      style={{ color, background: side === "YES" ? "rgba(16,185,129,0.12)" : "rgba(229,72,77,0.1)" }}
    >
      {side}
    </span>
  );
}

function BothFlag() {
  return (
    <span
      className="inline-flex h-5 items-center rounded-full border px-2 text-[10.5px] font-medium"
      style={{ color: BOTH, borderColor: `${BOTH}66`, background: `${BOTH}12` }}
    >
      YES + NO
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Two trades, one wallet                                                  */
/* -------------------------------------------------------------------------- */

const TWO_TRADES = [
  { when: "Yesterday", side: "YES", shares: 100, price: 40 },
  { when: "Today", side: "NO", shares: 60, price: 55 },
] as const;

function BalanceBar({
  side,
  shares,
  matched,
  split,
}: {
  side: "YES" | "NO";
  shares: number;
  matched: number;
  split: boolean;
}) {
  const color = side === "YES" ? YES : NO;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <SideTag side={side} />
        <span className="font-mono text-[15px] font-medium tabular-nums text-foreground">{shares} shares</span>
      </div>
      <div className="relative mt-2 h-7 overflow-hidden rounded-md bg-muted">
        <div className="absolute inset-y-0 left-0 rounded-md" style={{ width: `${shares}%`, background: color, transition: `width 700ms ${EASE}` }} />
        <div
          className="absolute inset-y-0 left-0 rounded-l-md"
          style={{
            width: `${matched}%`,
            background: PAIR,
            opacity: split ? 0.9 : 0,
            transition: `opacity 500ms ease, width 700ms ${EASE}`,
          }}
        />
      </div>
    </div>
  );
}

export function TwoTradesAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1800, 2000, 1800, 3600], rootRef, 3);
  const no = phase >= 1 ? 60 : 0;
  const answered = phase >= 3;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A wallet buys 100 YES yesterday and 60 NO today on the same question. Its balances fill in as two bars. The 60 NO shares are then matched against 60 of the YES shares, leaving 40 YES unmatched: the wallet is still 40 shares on YES."
      caption="Buying NO didn't flip the bet. It matched 60 of the YES shares and left 40 still riding on YES."
    >
      <ScaledStage width={860} height={360}>
        <div className="grid h-full grid-cols-[1fr_1.15fr] gap-4">
          <Panel className="flex flex-col p-5">
            <Eyebrow>The wallet&apos;s trades</Eyebrow>
            <ol className="mt-4 space-y-3">
              {TWO_TRADES.map((trade, index) => (
                <li
                  key={trade.when}
                  className="flex items-center gap-3 rounded-lg border px-3 py-3 transition-all duration-500"
                  style={{
                    opacity: phase >= index ? 1 : 0.25,
                    borderColor: phase === index ? (trade.side === "YES" ? YES : NO) : "var(--border)",
                  }}
                >
                  <span className="w-[76px] font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{trade.when}</span>
                  <span className="text-[15px] font-medium text-foreground">Buy {trade.shares}</span>
                  <SideTag side={trade.side} />
                  <span className="ml-auto font-mono text-[13px] text-muted-foreground">@ {trade.price}¢</span>
                </li>
              ))}
            </ol>
            <Reveal show={phase >= 2} className="mt-auto rounded-lg border border-dashed border-border px-4 py-3">
              <p className="text-[16px] font-medium text-foreground">Did they change their mind?</p>
            </Reveal>
          </Panel>

          <Panel className="flex flex-col p-5">
            <Eyebrow>What the wallet holds now</Eyebrow>
            <div className="mt-5 space-y-4">
              <BalanceBar side="YES" shares={100} matched={60} split={answered} />
              <BalanceBar side="NO" shares={no} matched={no} split={answered} />
            </div>
            <div className="mt-auto">
              <Reveal show={answered} className="mb-3 flex gap-4 text-[12px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm" style={{ background: PAIR }} /> Matched YES + NO
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm" style={{ background: YES }} /> Still on YES
                </span>
              </Reveal>
              <p className="text-[22px] font-semibold tracking-tight text-foreground transition-colors duration-500" aria-live="polite">
                {answered ? (
                  <>
                    Still <span style={{ color: YES }}>40 shares on YES</span>
                  </>
                ) : phase >= 1 ? (
                  "100 YES · 60 NO"
                ) : (
                  "100 YES"
                )}
              </p>
            </div>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Pair up the shares                                                      */
/* -------------------------------------------------------------------------- */

const CELL = 26;
const CHIP = 18;
const NUDGE = 9;
const GRID_X = 24;
const GRID_Y = 52;
const NO_START_X = 330;

function chipPos(index: number) {
  return { left: (index % 10) * CELL, top: Math.floor(index / 10) * CELL };
}

const PAIR_STEPS = [
  "100 YES shares and 60 NO shares, all on the same question.",
  "Each NO share finds a YES partner. 60 complete pairs.",
  "60 pairs merge for $60, whatever happens. 40 YES are left over.",
];

export function PairUpSharesAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop } = useGuidePhases([2000, 2200, 3800], rootRef, 2);
  const moved = phase >= 1;
  const coined = phase >= 2;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A grid of 100 green YES chips and a separate grid of 60 red NO chips. The NO chips slide over the first 60 YES chips, forming pairs. The 60 pairs turn into blue one-dollar pills worth 60 dollars together, and the last 40 YES chips stay green as the shares still riding on the outcome."
      caption="One YES and one NO on the same question make a complete pair, worth $1 merged. Whatever is left over still depends on the outcome."
    >
      <Frames />
      <ScaledStage width={860} height={390}>
        <div key={loop} className="relative size-full">
          <p className="absolute font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground" style={{ left: GRID_X, top: 22 }}>
            YES shares · 100
          </p>
          <p
            className="absolute font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-opacity duration-500"
            style={{ left: NO_START_X, top: 22, opacity: moved ? 0 : 1 }}
          >
            NO shares · 60
          </p>

          <div className="absolute" style={{ left: GRID_X, top: GRID_Y, width: CELL * 10, height: CELL * 10 }}>
            {Array.from({ length: 100 }, (_, index) => {
              const { left, top } = chipPos(index);
              const paired = index < 60;
              return (
                <span
                  key={index}
                  className="absolute rounded-full"
                  style={{
                    left,
                    top,
                    width: CHIP,
                    height: CHIP,
                    background: YES,
                    opacity: coined && paired ? 0 : 1,
                    boxShadow: coined && !paired ? `0 0 0 2px var(--background), 0 0 0 3.5px ${AMBER}` : undefined,
                    transition: "opacity 400ms ease, box-shadow 400ms ease",
                  }}
                />
              );
            })}
            {Array.from({ length: 60 }, (_, index) => {
              const { left, top } = chipPos(index);
              return (
                <span
                  key={index}
                  className="absolute flex items-center justify-center rounded-full font-mono text-[8.5px] font-bold text-white"
                  style={{
                    left,
                    top,
                    width: CHIP + NUDGE,
                    height: CHIP,
                    background: PAIR,
                    opacity: coined ? 1 : 0,
                    transform: coined ? "none" : "scale(.6)",
                    transition: `opacity 400ms ease ${index * 8}ms, transform 400ms ${EASE} ${index * 8}ms`,
                  }}
                >
                  $1
                </span>
              );
            })}
          </div>

          <div
            className="absolute"
            style={{
              left: NO_START_X,
              top: GRID_Y,
              width: CELL * 10,
              height: CELL * 6,
              transform: moved ? `translateX(${GRID_X + NUDGE - NO_START_X}px)` : "none",
              opacity: coined ? 0 : 1,
              transition: `transform 1100ms ${EASE}, opacity 400ms ease`,
            }}
          >
            {Array.from({ length: 60 }, (_, index) => {
              const { left, top } = chipPos(index);
              return (
                <span
                  key={index}
                  className="absolute rounded-full"
                  style={{ left, top, width: CHIP, height: CHIP, background: NO, boxShadow: "0 0 0 1.5px var(--background)" }}
                />
              );
            })}
          </div>

          <Reveal show={coined} className="absolute" style={{ left: GRID_X + CELL * 10 + 22, top: GRID_Y }}>
            <div className="flex items-stretch gap-3" style={{ height: CELL * 6 - 8 }}>
              <span className="w-[3px] rounded-full" style={{ background: PAIR }} />
              <div className="flex flex-col justify-center">
                <p className="font-mono text-[28px] font-medium leading-none" style={{ color: PAIR }}>
                  60 pairs
                </p>
                <p className="mt-2 text-[14px] text-foreground">Merge for $60 before the result is known</p>
              </div>
            </div>
            <div className="mt-4 flex items-stretch gap-3" style={{ height: CELL * 4 - 8 }}>
              <span className="w-[3px] rounded-full" style={{ background: AMBER }} />
              <div className="flex flex-col justify-center">
                <p className="font-mono text-[28px] font-medium leading-none" style={{ color: YES }}>
                  40 YES
                </p>
                <p className="mt-2 text-[14px] text-foreground">Left over. Pays only if YES wins</p>
              </div>
            </div>
          </Reveal>

          <div className="absolute inset-x-6 bottom-3 flex items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-2">
            <span className="font-mono text-[11px] text-muted-foreground">{phase + 1}/3</span>
            <span key={phase} className="text-[13px] font-medium text-foreground" style={{ animation: "pyth-rise .35s both" }}>
              {PAIR_STEPS[phase]}
            </span>
          </div>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Play out the result                                                     */
/* -------------------------------------------------------------------------- */

const PAYOUT_PRESETS = [
  { label: "The example", yes: 100, no: 60 },
  { label: "Fully hedged", yes: 100, no: 100 },
  { label: "After selling 30 YES", yes: 70, no: 100 },
  { label: "YES only", yes: 100, no: 0 },
];

function PayoutBar({ side, pays, pairs, scale }: { side: "YES" | "NO"; pays: number; pairs: number; scale: number }) {
  const color = side === "YES" ? YES : NO;
  const extra = pays - pairs;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] text-foreground">
          If <SideTag side={side} className="mx-0.5" /> wins
        </p>
        <p className="font-mono text-[20px] font-medium tabular-nums text-foreground">{usd(pays * 100)}</p>
      </div>
      <div className="mt-1.5 flex h-6 overflow-hidden rounded-md bg-muted">
        <div style={{ width: `${(pairs / scale) * 100}%`, background: PAIR, transition: `width 350ms ${EASE}` }} />
        <div style={{ width: `${(extra / scale) * 100}%`, background: color, transition: `width 350ms ${EASE}` }} />
      </div>
    </div>
  );
}

export function OutcomePayoutExplorer() {
  const [yes, setYes] = useState(100);
  const [no, setNo] = useState(60);
  const pairs = Math.min(yes, no);
  const extra = Math.abs(yes - no);
  const lean = yes > no ? "YES" : no > yes ? "NO" : null;
  const scale = Math.max(yes, no, 1);

  return (
    <InteractiveFigure caption="Shares are held to resolution: each winning share pays $1, each losing share pays nothing. Prices paid come next.">
      <div className="grid gap-3 md:grid-cols-[15rem_minmax(0,1fr)]">
        <Panel className="space-y-4 p-5">
          <div>
            <Eyebrow>Try it yourself</Eyebrow>
            <p className="mt-1 text-[15px] font-semibold text-foreground">Set the wallet&apos;s balances</p>
          </div>
          <Slider label="YES shares" value={yes} min={0} max={200} step={5} onChange={setYes} color={YES} />
          <Slider label="NO shares" value={no} min={0} max={200} step={5} onChange={setNo} color={NO} />
          <div className="flex flex-wrap gap-2 pt-1">
            {PAYOUT_PRESETS.map((preset) => (
              <PillButton
                key={preset.label}
                active={preset.yes === yes && preset.no === no}
                onClick={() => {
                  setYes(preset.yes);
                  setNo(preset.no);
                }}
              >
                {preset.label}
              </PillButton>
            ))}
          </div>
        </Panel>

        <Panel className="flex flex-col p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">Complete pairs</p>
              <p className="font-mono text-[22px] font-medium tabular-nums" style={{ color: PAIR }}>
                {pairs}
              </p>
              <p className="text-[11.5px] text-muted-foreground">{usd(pairs * 100)} either way</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">Left over</p>
              <p className="font-mono text-[22px] font-medium tabular-nums" style={{ color: lean === "YES" ? YES : lean === "NO" ? NO : "var(--muted-foreground)" }}>
                {extra} {lean ?? ""}
              </p>
              <p className="text-[11.5px] text-muted-foreground">{lean ? `Pays only if ${lean} wins` : "Nothing left over"}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <PayoutBar side="YES" pays={yes} pairs={pairs} scale={scale} />
            <PayoutBar side="NO" pays={no} pairs={pairs} scale={scale} />
          </div>

          <p className="mt-5 rounded-lg border border-border px-3 py-2.5 text-[13px] leading-relaxed text-foreground" aria-live="polite">
            {lean ? (
              <>
                <span className="font-semibold">{usd(extra * 100)} more if {lean} wins.</span> That&apos;s the part of the payout still riding on{" "}
                {lean}.
              </>
            ) : pairs > 0 ? (
              <>
                <span className="font-semibold">Same payout either way.</span> Every share has a partner, so the outcome no longer changes what this
                wallet collects.
              </>
            ) : (
              "No shares, no payout."
            )}
          </p>
        </Panel>
      </div>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. What did the pairs cost?                                                */
/* -------------------------------------------------------------------------- */

const HELD_YES = 100;
const HELD_NO = 60;

function PairCostGauge({ yesPrice, noPrice }: { yesPrice: number; noPrice: number }) {
  const cost = yesPrice + noPrice;
  const max = Math.max(120, cost + 10);
  const at = (cents: number) => `${(cents / max) * 100}%`;
  const edge = 100 - cost;
  return (
    <div>
      <div className="relative h-9 rounded-md bg-muted">
        <div className="absolute inset-y-0 left-0 flex overflow-hidden rounded-l-md" style={{ width: at(cost), transition: `width 300ms ${EASE}` }}>
          <div className="flex items-center justify-center font-mono text-[11px] font-semibold text-white" style={{ width: `${(yesPrice / cost) * 100}%`, background: YES }}>
            {yesPrice}¢
          </div>
          <div className="flex items-center justify-center font-mono text-[11px] font-semibold text-white" style={{ width: `${(noPrice / cost) * 100}%`, background: NO }}>
            {noPrice}¢
          </div>
        </div>
        {edge !== 0 ? (
          <div
            className="absolute inset-y-1 rounded-sm"
            style={{
              left: at(Math.min(cost, 100)),
              width: at(Math.abs(edge)),
              background:
                edge > 0
                  ? "rgba(16,185,129,0.18)"
                  : "repeating-linear-gradient(45deg, rgba(255,255,255,0.7) 0 3px, transparent 3px 7px)",
              border: edge > 0 ? `1px dashed ${YES}` : "1px solid rgba(255,255,255,0.8)",
              transition: `left 300ms ${EASE}, width 300ms ${EASE}`,
            }}
          />
        ) : null}
        <div className="absolute -bottom-1 -top-1 w-[2px] bg-foreground" style={{ left: at(100) }} />
      </div>
      <div className="relative mt-1.5 h-4 text-[11px] text-muted-foreground">
        <span className="absolute -translate-x-1/2 font-mono font-medium text-foreground" style={{ left: at(100) }}>
          $1 merge
        </span>
      </div>
    </div>
  );
}

export function PairCostExplorer() {
  const [yesPrice, setYesPrice] = useState(40);
  const [noPrice, setNoPrice] = useState(55);
  const pairs = Math.min(HELD_YES, HELD_NO);
  const leftover = HELD_YES - pairs;
  const pairCost = yesPrice + noPrice;
  const pairsCost = pairs * pairCost;
  const locked = pairs * 100 - pairsCost;
  const leftoverCost = leftover * yesPrice;
  const spent = HELD_YES * yesPrice + HELD_NO * noPrice;
  const ifYes = HELD_YES * 100 - spent;
  const ifNo = HELD_NO * 100 - spent;

  return (
    <InteractiveFigure caption="The wallet holds 100 YES and 60 NO either way. All amounts are before fees.">
      <div className="grid gap-3 md:grid-cols-[15rem_minmax(0,1fr)]">
        <Panel className="space-y-4 p-5">
          <div>
            <Eyebrow>Try it yourself</Eyebrow>
            <p className="mt-1 text-[15px] font-semibold text-foreground">Change the prices that filled</p>
          </div>
          <Slider label="YES price paid (¢)" value={yesPrice} min={1} max={99} onChange={setYesPrice} color={YES} />
          <Slider label="NO price paid (¢)" value={noPrice} min={1} max={99} onChange={setNoPrice} color={NO} />
          <div className="flex flex-wrap gap-2 pt-1">
            {[55, 65].map((price) => (
              <PillButton
                key={price}
                active={yesPrice === 40 && noPrice === price}
                onClick={() => {
                  setYesPrice(40);
                  setNoPrice(price);
                }}
              >
                NO fills at {price}¢
              </PillButton>
            ))}
          </div>
        </Panel>

        <Panel className="flex flex-col p-5">
          <Eyebrow>One pair</Eyebrow>
          <p className="mt-1 text-[15px] text-foreground">
            Costs <span className="font-mono font-semibold">{pairPrice(pairCost)}</span>, merges for <span className="font-mono font-semibold">$1</span>
          </p>
          <div className="mt-3">
            <PairCostGauge yesPrice={yesPrice} noPrice={noPrice} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { label: `${pairs} pairs cost`, value: usd(pairsCost), color: "var(--foreground)" },
              { label: "Merge value", value: usd(pairs * 100), color: PAIR },
              { label: "Locked in", value: signedUsd(locked), color: toneOf(locked) },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border px-2 py-2">
                <p className="text-[11px] text-muted-foreground">{item.label}</p>
                <p className="font-mono text-[17px] font-medium tabular-nums" style={{ color: item.color }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-border px-3 py-2.5">
            <p className="text-[12px] text-muted-foreground">
              The whole position also includes {leftover} YES that cost {usd(leftoverCost)}. Spent in total: {usd(spent)}.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-2">
              {[
                { side: "YES" as const, value: ifYes },
                { side: "NO" as const, value: ifNo },
              ].map((row) => (
                <p key={row.side} className="flex items-center justify-between text-[13px] text-foreground">
                  <span>
                    If <SideTag side={row.side} className="mx-0.5" /> wins
                  </span>
                  <span className="font-mono font-medium tabular-nums" style={{ color: toneOf(row.value) }}>
                    {signedUsd(row.value)}
                  </span>
                </p>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Same holdings, two different trades                                     */
/* -------------------------------------------------------------------------- */

const TWO_WALLETS = [
  { name: "Wallet A", address: "0x3f…a1c2", noPrice: 55 },
  { name: "Wallet B", address: "0x9b…07de", noPrice: 65 },
];

function WalletStory({ name, address, noPrice, phase }: { name: string; address: string; noPrice: number; phase: number }) {
  const pairCost = 40 + noPrice;
  const locked = 60 * (100 - pairCost);
  const ifNo = HELD_NO * 100 - (HELD_YES * 40 + HELD_NO * noPrice);
  return (
    <Panel className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-[13px] font-semibold text-foreground">{name}</p>
        <span className="font-mono text-[11px] text-muted-foreground">{address}</span>
      </div>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="font-mono text-[15px] font-medium text-foreground">100</span>
        <SideTag side="YES" />
        <span className="font-mono text-[15px] font-medium text-foreground">60</span>
        <SideTag side="NO" />
        <span className="ml-auto">
          <BothFlag />
        </span>
      </div>
      <Reveal show={phase >= 1} className="space-y-1.5 px-4 py-3">
        <Eyebrow>The fills</Eyebrow>
        <p className="flex justify-between text-[13px] text-foreground">
          <span>Bought 100 YES</span>
          <span className="font-mono">@ 40¢</span>
        </p>
        <p className="flex justify-between text-[13px] text-foreground">
          <span>Bought 60 NO</span>
          <span className="font-mono" style={{ color: noPrice > 60 ? NO : undefined }}>
            @ {noPrice}¢
          </span>
        </p>
        <p className="flex justify-between border-t border-border pt-1.5 text-[13px] text-foreground">
          <span>Each pair cost</span>
          <span className="font-mono font-semibold">{pairPrice(pairCost)}</span>
        </p>
      </Reveal>
      <Reveal show={phase >= 2} className="mt-auto border-t border-border bg-muted/40 px-4 py-3">
        <p className="text-[12px] text-muted-foreground">60 pairs lock in</p>
        <p className="font-mono text-[24px] font-medium leading-tight" style={{ color: toneOf(locked) }}>
          {signedUsd(locked)}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Whole position if NO wins: <span className="font-mono font-medium" style={{ color: toneOf(ifNo) }}>{signedUsd(ifNo)}</span>
        </p>
      </Reveal>
    </Panel>
  );
}

export function SameHoldingsAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([2200, 2800, 3800], rootRef, 2);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Two wallets that both hold 100 YES and 60 NO and carry the same YES plus NO flag. Their fills are revealed: both paid 40 cents for YES, but wallet A paid 55 cents for NO and wallet B paid 65 cents. A's 60 pairs lock in a 3 dollar gain, B's lock in a 3 dollar loss, before fees."
      caption="A holders table shows balances, not prices. The trade history tells these two wallets apart. Amounts are before fees."
    >
      <ScaledStage width={860} height={400}>
        <div className="flex h-full flex-col gap-3">
          <div className="grid flex-1 grid-cols-2 gap-4">
            {TWO_WALLETS.map((wallet) => (
              <WalletStory key={wallet.name} {...wallet} phase={phase} />
            ))}
          </div>
          <div className="flex items-center justify-between rounded-full border border-border bg-background px-4 py-2 text-[13px]">
            <span className="text-muted-foreground">Same row in the holders table</span>
            <span className="font-medium text-foreground">{phase >= 2 ? "Opposite results on the pairs" : phase >= 1 ? "Different prices filled" : "Identical balances"}</span>
          </div>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. A market maker splits collateral                                        */
/* -------------------------------------------------------------------------- */

const BAR_SCALE = 2.1;

function InventoryBar({
  side,
  shares,
  matched,
  highlight,
  badge,
}: {
  side: "YES" | "NO";
  shares: number;
  matched: number;
  highlight: boolean;
  badge?: ReactNode;
}) {
  const color = side === "YES" ? YES : NO;
  const extra = Math.max(0, shares - matched);
  return (
    <div className="relative flex w-[92px] flex-col items-center">
      {badge}
      <span
        className="mb-2 font-mono text-[18px] font-medium tabular-nums text-foreground transition-opacity duration-500"
        style={{ opacity: shares ? 1 : 0 }}
      >
        {shares}
      </span>
      <div className="flex h-[220px] w-[64px] flex-col justify-end">
        <div
          className="w-full rounded-t-md"
          style={{
            height: extra * BAR_SCALE,
            background: color,
            boxShadow: highlight && extra ? `0 0 0 2px var(--background), 0 0 0 4px ${AMBER}` : undefined,
            transition: `height 900ms ${EASE}, box-shadow 400ms ease`,
          }}
        />
        <div
          className={cn("w-full", extra ? "" : "rounded-t-md")}
          style={{
            height: matched * BAR_SCALE,
            background: highlight ? PAIR : color,
            transition: `height 900ms ${EASE}, background 500ms ease`,
          }}
        />
      </div>
      <SideTag side={side} className="mt-2" />
    </div>
  );
}

export function SplitInventoryAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop } = useGuidePhases([1800, 2400, 2600, 3800], rootRef, 3);
  const split = phase >= 1;
  const sold = phase >= 2;
  const yes = split ? (sold ? 70 : 100) : 0;
  const no = split ? 100 : 0;
  const pairs = Math.min(yes, no);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A market maker splits 100 dollars of collateral into 100 YES and 100 NO shares, an even inventory. A buyer takes 30 YES from them, leaving 70 YES and 100 NO. Seventy shares on each side still pair up, and the 30 extra NO shares now lean the wallet toward NO."
      caption="Splitting $100 gives 100 YES and 100 NO. Selling 30 YES leaves 70 pairs and 30 shares leaning NO."
    >
      <ScaledStage width={860} height={380}>
        <div key={loop} className="relative grid size-full grid-cols-[200px_1fr_240px] items-center gap-6 px-2">
          <div className="flex flex-col items-center">
            <div
              className="grid size-[132px] place-items-center rounded-2xl border-2 border-dashed"
              style={{
                borderColor: split ? "var(--border)" : PAIR,
                opacity: split ? 0.35 : 1,
                transition: "opacity 500ms ease, border-color 500ms ease",
              }}
            >
              <div className="text-center">
                <p className="font-mono text-[30px] font-medium text-foreground">$100</p>
                <p className="text-[12px] text-muted-foreground">collateral</p>
              </div>
            </div>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{split ? "Split ⟶" : "Ready to split"}</p>
          </div>

          <div className="relative flex h-full items-end justify-center gap-8 pb-6">
            <InventoryBar
              side="YES"
              shares={yes}
              matched={phase >= 3 ? pairs : yes}
              highlight={phase >= 3}
              badge={
                <span
                  className="absolute left-1/2 top-0 flex h-8 items-center whitespace-nowrap rounded-full px-3 font-mono text-[12px] font-semibold text-white"
                  style={{
                    background: YES,
                    opacity: phase === 2 ? 1 : 0,
                    transform: `translate(-50%, ${phase >= 2 ? -46 : 90}px)`,
                    transition: `transform 1100ms ${EASE}, opacity 400ms ease`,
                  }}
                >
                  30 YES → buyer
                </span>
              }
            />
            <InventoryBar side="NO" shares={no} matched={phase >= 3 ? pairs : no} highlight={phase >= 3} />
          </div>

          <div className="space-y-3">
            <Reveal show={split} className="rounded-lg border border-border bg-background px-4 py-3">
              <Eyebrow>Inventory</Eyebrow>
              <p className="mt-1 text-[15px] font-medium text-foreground">{sold ? "70 YES · 100 NO" : "100 YES · 100 NO"}</p>
              <p className="text-[12px] text-muted-foreground">{sold ? "A buyer took 30 YES" : "Ready for a buyer on either side"}</p>
            </Reveal>
            <Reveal show={phase >= 3} className="rounded-lg border bg-background px-4 py-3" style={{ borderColor: AMBER }}>
              <p className="font-mono text-[22px] font-medium leading-tight" style={{ color: PAIR }}>
                70 pairs
              </p>
              <p className="mt-1 text-[14px] text-foreground">
                + <span className="font-semibold" style={{ color: NO }}>30 NO</span> now lean NO
              </p>
            </Reveal>
          </div>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Read a flagged wallet in the Holder Terminal                            */
/* -------------------------------------------------------------------------- */

const HOLDER_ROWS = [
  { wallet: "0x71…e0b4", yes: 2400, no: 0 },
  { wallet: "0x3f…a1c2", yes: 100, no: 60, flagged: true },
  { wallet: "0xc8…19fa", yes: 0, no: 1850 },
  { wallet: "0x5d…77b0", yes: 640, no: 0 },
];

const CLUES = ["Count the shares", "Open the trades", "Check what's realized"];

function ClueCard({ step, phase, children }: { step: number; phase: number; children: ReactNode }) {
  const on = phase === step + 1;
  return (
    <div
      className="absolute inset-0 flex flex-col p-5"
      style={{
        opacity: on ? 1 : 0,
        transform: on ? "none" : "translateY(8px)",
        transition: `opacity 400ms ease, transform 500ms ${EASE}`,
        pointerEvents: on ? undefined : "none",
      }}
    >
      <Eyebrow>
        Clue {step + 1} · {CLUES[step]}
      </Eyebrow>
      {children}
    </div>
  );
}

export function ReadAWalletAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([2000, 3000, 3000, 3400], rootRef, 1);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A holders table in the Lychee Holder Terminal with one wallet flagged YES plus NO. Three clues follow for that wallet: its balances give 60 pairs and 40 YES still on the outcome; its trades show 100 YES bought at 40 cents and then 60 NO at 55 cents; its realized profit and loss is still zero because nothing has been merged or sold."
      caption="Illustrative wallet using the lesson's numbers. In the terminal, the flag sits in the holders table and the heatmap."
    >
      <ScaledStage width={860} height={400}>
        <div className="flex h-full flex-col gap-3">
          <div className="flex items-center gap-2">
            {CLUES.map((clue, index) => {
              const on = phase === index + 1;
              return (
                <span
                  key={clue}
                  className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] transition-all duration-500"
                  style={{
                    borderColor: on ? "var(--foreground)" : "var(--border)",
                    background: on ? "var(--foreground)" : "var(--background)",
                    color: on ? "var(--background)" : "var(--muted-foreground)",
                  }}
                >
                  <span className="font-mono text-[11px]">{index + 1}</span>
                  {clue}
                </span>
              );
            })}
          </div>

          <div className="grid flex-1 grid-cols-[1.1fr_1fr] gap-4">
            <Panel className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-[13px] font-semibold text-foreground">Holders</p>
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Example market</span>
              </div>
              <div className="grid grid-cols-[1fr_64px_64px_88px] border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                <span>Wallet</span>
                <span className="text-right">YES</span>
                <span className="text-right">NO</span>
                <span className="text-right">Flags</span>
              </div>
              {HOLDER_ROWS.map((row) => (
                <div
                  key={row.wallet}
                  className="grid grid-cols-[1fr_64px_64px_88px] items-center border-b border-border/70 px-4 py-2.5 text-[13px] transition-colors duration-500 last:border-b-0"
                  style={{ background: row.flagged && phase >= 0 ? `${BOTH}10` : undefined, boxShadow: row.flagged ? `inset 3px 0 0 ${BOTH}` : undefined }}
                >
                  <span className="font-mono text-foreground">{row.wallet}</span>
                  <span className="text-right font-mono tabular-nums" style={{ color: row.yes ? YES : "var(--muted-foreground)" }}>
                    {row.yes.toLocaleString("en-US")}
                  </span>
                  <span className="text-right font-mono tabular-nums" style={{ color: row.no ? NO : "var(--muted-foreground)" }}>
                    {row.no.toLocaleString("en-US")}
                  </span>
                  <span className="flex justify-end">{row.flagged ? <BothFlag /> : null}</span>
                </div>
              ))}
            </Panel>

            <Panel className="relative overflow-hidden">
              <div
                className="absolute inset-0 grid place-items-center p-6 text-center transition-opacity duration-500"
                style={{ opacity: phase === 0 ? 1 : 0 }}
              >
                <div>
                  <BothFlag />
                  <p className="mt-3 text-[15px] font-medium text-foreground">Pick a flagged wallet</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">It holds shares on both outcomes of this market.</p>
                </div>
              </div>

              <ClueCard step={0} phase={phase}>
                <p className="mt-3 font-mono text-[15px] text-foreground">100 YES · 60 NO</p>
                <div className="mt-3 flex h-6 overflow-hidden rounded-md">
                  <div className="flex items-center justify-center font-mono text-[11px] font-semibold text-white" style={{ width: "60%", background: PAIR }}>
                    60 pairs
                  </div>
                  <div className="flex items-center justify-center font-mono text-[11px] font-semibold text-white" style={{ width: "40%", background: YES }}>
                    40 YES
                  </div>
                </div>
                <p className="mt-auto text-[13px] leading-relaxed text-foreground">
                  The smaller balance is the number of pairs. The other <span className="font-semibold" style={{ color: YES }}>40 YES</span> still depend on the
                  outcome.
                </p>
              </ClueCard>

              <ClueCard step={1} phase={phase}>
                <ul className="mt-3 space-y-2">
                  {TWO_TRADES.map((trade) => (
                    <li key={trade.when} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[13px] text-foreground">
                      <span className="w-[70px] font-mono text-[10.5px] uppercase text-muted-foreground">{trade.when}</span>
                      Buy {trade.shares} <SideTag side={trade.side} />
                      <span className="ml-auto font-mono">@ {trade.price}¢</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-auto text-[13px] leading-relaxed text-foreground">
                  The fills set the pair cost: <span className="font-mono font-semibold">95¢</span> for something that merges for $1.
                </p>
              </ClueCard>

              <ClueCard step={2} phase={phase}>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Realized in this market</p>
                    <p className="font-mono text-[20px] font-medium text-foreground">$0</p>
                  </div>
                  <div className="rounded-lg border border-border px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Pairs could merge for</p>
                    <p className="font-mono text-[20px] font-medium" style={{ color: PAIR }}>
                      $60
                    </p>
                  </div>
                </div>
                <p className="mt-auto text-[13px] leading-relaxed text-foreground">
                  Nothing merged or sold yet, so the <span className="font-semibold" style={{ color: YES }}>+$3</span> on the pairs is available, not banked.
                </p>
              </ClueCard>
            </Panel>
          </div>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}
