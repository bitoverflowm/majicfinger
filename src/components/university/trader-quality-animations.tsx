"use client";

import { useRef, useState } from "react";

import { BLUE, GREEN, RED, useInView } from "@/components/sections/features/feature-kit";
import { EASE, GuideAnimationFigure, ScaledStage, useGuidePhases } from "@/components/content/guide-animations/guide-animation-kit";
import { InteractiveFigure, PillButton } from "@/components/university/expected-wins-animations";
import { AMBER, Eyebrow, Frames, Panel, Reveal, Slider } from "@/components/university/pythagorean-animations";
import { cn } from "@/lib/utils";

const WIN = GREEN;
const LOSS = RED;

function dollars(value: number, { signed = false, cents = false }: { signed?: boolean; cents?: boolean } = {}) {
  const abs = Math.abs(value);
  const text = abs.toLocaleString("en-US", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
  if (!signed) return `${value < 0 ? "−" : ""}$${text}`;
  if (abs === 0) return "$0";
  return `${value > 0 ? "+" : "−"}$${text}`;
}

const toneOf = (value: number) => (value > 0 ? WIN : value < 0 ? LOSS : "var(--muted-foreground)");

function Stat({ label, value, color, className }: { label: string; value: string; color?: string; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-background px-3 py-2.5", className)}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-mono text-[20px] font-medium tabular-nums leading-tight" style={{ color: color ?? "var(--foreground)" }}>
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. 19 wins out of 20, zero profit                                          */
/* -------------------------------------------------------------------------- */

export function WinStreakAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop, reduced } = useGuidePhases([3400, 2000, 4000], rootRef, 2);
  const inView = useInView(rootRef, 0.35);
  const lost = phase >= 1;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Twenty one-contract bets bought at 95 cents. Nineteen winners appear one by one, each earning 5 cents, and running profit climbs to 95 cents. The twentieth bet loses 95 cents and profit drops back to zero: a 95 percent win rate with no profit before fees."
      caption="Twenty $1 contracts bought at 95¢ and held to settlement. Before fees."
    >
      <Frames />
      <style dangerouslySetInnerHTML={{ __html: "@keyframes tq-fill { from { transform: scaleX(0); } to { transform: none; } }" }} />
      <ScaledStage width={860} height={360}>
        <div key={inView ? loop : "idle"} className="flex h-full flex-col gap-5">
          <div className="grid grid-cols-10 gap-2">
            {Array.from({ length: 20 }, (_, index) => {
              const isLoss = index === 19;
              const shown = !isLoss || lost;
              return (
                <div
                  key={index}
                  className="flex h-[62px] flex-col items-center justify-center rounded-lg border"
                  style={{
                    borderColor: isLoss ? `${LOSS}88` : `${WIN}55`,
                    background: isLoss ? "rgba(229,72,77,0.08)" : "rgba(16,185,129,0.07)",
                    opacity: shown ? undefined : 0,
                    animation: shown && !reduced ? `pyth-pop .35s ${EASE} both ${isLoss ? 0 : index * 150}ms` : undefined,
                  }}
                >
                  <span className="text-[16px] font-semibold" style={{ color: isLoss ? LOSS : WIN }}>
                    {isLoss ? "✕" : "✓"}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums" style={{ color: isLoss ? LOSS : WIN }}>
                    {isLoss ? "−95¢" : "+5¢"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Stat label="Bought at" value="95¢ each" />
            <Stat label="Win rate" value={lost ? "95%" : "19 of 19"} color={WIN} />
            <Stat label="Profit before fees" value={lost ? "$0.00" : "+$0.95"} color={lost ? "var(--foreground)" : WIN} />
          </div>

          <div>
            <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
              <span>Running profit</span>
              <span>+95¢</span>
            </div>
            <div className="relative mt-1.5 h-4 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-0 origin-left"
                style={{ transform: lost ? "scaleX(0)" : "none", transition: `transform 900ms ${EASE}` }}
              >
                <div
                  className="size-full origin-left rounded-full"
                  style={{ background: WIN, animation: reduced ? undefined : "tq-fill 2900ms linear both" }}
                />
              </div>
            </div>
          </div>

          <Reveal show={phase >= 2} className="mt-auto rounded-lg border px-4 py-3" style={{ borderColor: AMBER }}>
            <p className="text-[17px] font-semibold text-foreground">
              Twenty bets, a 95% win rate, and exactly <span style={{ color: AMBER }}>$0</span> in profit.
            </p>
          </Reveal>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Break-even win rate = entry price                                       */
/* -------------------------------------------------------------------------- */

const BETS = 10;

const BREAK_EVEN_PRESETS = [
  { label: "7 of 10 at 50¢", winRate: 70, price: 50 },
  { label: "7 of 10 at 80¢", winRate: 70, price: 80 },
  { label: "9 of 10 at 95¢", winRate: 90, price: 95 },
];

export function BreakEvenExplorer() {
  const [winRate, setWinRate] = useState(70);
  const [price, setPrice] = useState(50);
  const wins = Math.round((winRate / 100) * BETS);
  const spent = BETS * price;
  const collected = wins * 100;
  const profit = collected - spent;
  const margin = winRate - price;

  return (
    <InteractiveFigure caption="Ten equal one-contract bets held to settlement, each paying $1 or $0. Before fees.">
      <div className="grid gap-3 md:grid-cols-[15rem_minmax(0,1fr)]">
        <Panel className="space-y-4 p-5">
          <div>
            <Eyebrow>Try it yourself</Eyebrow>
            <p className="mt-1 text-[15px] font-semibold text-foreground">Win rate vs entry price</p>
          </div>
          <Slider label="Win rate (%)" value={winRate} min={0} max={100} step={10} onChange={setWinRate} color={WIN} />
          <Slider label="Entry price (¢)" value={price} min={5} max={95} step={5} onChange={setPrice} color={BLUE} />
          <div className="flex flex-wrap gap-2 pt-1">
            {BREAK_EVEN_PRESETS.map((preset) => (
              <PillButton
                key={preset.label}
                active={preset.winRate === winRate && preset.price === price}
                onClick={() => {
                  setWinRate(preset.winRate);
                  setPrice(preset.price);
                }}
              >
                {preset.label}
              </PillButton>
            ))}
          </div>
        </Panel>

        <Panel className="flex flex-col p-5">
          <div className="grid grid-cols-10 gap-1.5">
            {Array.from({ length: BETS }, (_, index) => {
              const won = index < wins;
              return (
                <div
                  key={index}
                  className="flex h-12 flex-col items-center justify-center rounded-md border transition-colors duration-300"
                  style={{
                    borderColor: won ? `${WIN}66` : `${LOSS}66`,
                    background: won ? "rgba(16,185,129,0.08)" : "rgba(229,72,77,0.07)",
                  }}
                >
                  <span className="text-[12px] font-semibold" style={{ color: won ? WIN : LOSS }}>
                    {won ? "✓" : "✕"}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums" style={{ color: won ? WIN : LOSS }}>
                    {won ? `+${100 - price}¢` : `−${price}¢`}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-5">
            <div className="relative h-7 rounded-md bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-md"
                style={{ width: `${winRate}%`, background: margin >= 0 ? WIN : LOSS, opacity: 0.85, transition: `width 300ms ${EASE}` }}
              />
              <div className="absolute -bottom-1.5 -top-1.5 w-[2px] bg-foreground" style={{ left: `${price}%`, transition: `left 300ms ${EASE}` }} />
            </div>
            <div className="relative mt-1.5 h-4">
              <span
                className="absolute -translate-x-1/2 whitespace-nowrap font-mono text-[11px] font-medium text-foreground"
                style={{ left: `${Math.min(88, Math.max(12, price))}%`, transition: `left 300ms ${EASE}` }}
              >
                Break-even: {price}%
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Spent" value={dollars(spent / 100, { cents: true })} />
            <Stat label="Collected" value={dollars(collected / 100, { cents: true })} />
            <Stat label="Profit" value={dollars(profit / 100, { signed: true, cents: true })} color={toneOf(profit)} />
          </div>

          <p className="mt-4 text-[13px] leading-relaxed text-foreground" aria-live="polite">
            Buying at <span className="font-mono font-semibold">{price}¢</span>, you need to win more than{" "}
            <span className="font-semibold">{price}%</span> of the time.{" "}
            {margin > 0
              ? `${winRate}% clears it by ${margin} points.`
              : margin < 0
                ? `${winRate}% falls ${-margin} points short.`
                : `${winRate}% lands exactly on it.`}
          </p>
        </Panel>
      </div>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Lose more often, still finish ahead                                     */
/* -------------------------------------------------------------------------- */

function CountBar({
  label,
  value,
  max,
  color,
  show,
  prefix = "",
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  show: boolean;
  prefix?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-foreground">{label}</span>
        <span className="font-mono text-[17px] font-medium tabular-nums" style={{ color }}>
          {prefix}
          {value.toLocaleString("en-US")}
        </span>
      </div>
      <div className="mt-1.5 h-6 overflow-hidden rounded-md bg-muted">
        <div
          className="h-full rounded-md"
          style={{ width: show ? `${(value / max) * 100}%` : "0%", background: color, transition: `width 1000ms ${EASE}` }}
        />
      </div>
    </div>
  );
}

export function WinnersVsLosersAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop } = useGuidePhases([2600, 3000, 4200], rootRef, 2);
  const avgWin = 2948;
  const avgLoss = 1358;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Contestable-Parfait's finished Polymarket bets: 273 wins and 312 losses, a positive 13.2 percent return on cost. In its Politics category the average winner earned about 2,948 dollars and the average loser cost about 1,358 dollars, so one average win covers about 2.2 average losses."
      caption="Lychee Holder Terminal snapshot of Contestable-Parfait, November 10, 2026. Finished positions only; open holdings have their own P&L."
    >
      <ScaledStage width={860} height={350}>
        <div key={loop} className="grid h-full grid-cols-2 gap-4">
          <Panel className="flex flex-col p-5">
            <Eyebrow>All 585 finished bets</Eyebrow>
            <div className="mt-5 space-y-4">
              <CountBar label="Wins" value={273} max={312} color={WIN} show />
              <CountBar label="Losses" value={312} max={312} color={LOSS} show />
            </div>
            <p className="mt-4 text-[14px] text-foreground">
              Win rate <span className="font-mono font-semibold">46.7%</span>. Loses more often than it wins.
            </p>
            <Reveal show={phase >= 2} className="mt-auto">
              <Stat label="Return on cost" value="+13.2%" color={WIN} />
            </Reveal>
          </Panel>

          <Panel className="flex flex-col p-5" style={{ opacity: phase >= 1 ? 1 : 0.35, transition: "opacity 500ms ease" }}>
            <Eyebrow>Politics · size of the average result</Eyebrow>
            <div className="mt-5 space-y-4">
              <CountBar label="Average winner earned" value={avgWin} max={avgWin} color={WIN} show={phase >= 1} prefix="$" />
              <CountBar label="Average loser cost" value={avgLoss} max={avgWin} color={LOSS} show={phase >= 1} prefix="$" />
            </div>
            <Reveal show={phase >= 2} className="mt-auto rounded-lg border px-4 py-3" style={{ borderColor: AMBER }}>
              <p className="text-[15px] font-semibold text-foreground">One average win ≈ 2.2 average losses</p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">With results that size, winning about 1 in 3 is roughly break-even.</p>
            </Reveal>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Same checkmark, 250× the stake                                          */
/* -------------------------------------------------------------------------- */

const NEWSOM_FILLS = [
  { time: "16:29 UTC", wallet: "Wallet 1", shares: "16.39", spent: 1, price: "≈6.1¢" },
  { time: "≈4.5 min later", wallet: "Wallet 2", shares: "4,034.30", spent: 250, price: "≈6.2¢" },
];

const BIG_R = 84;

export function SameCheckmarkAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([2600, 3200, 4000], rootRef, 2);
  const weighted = phase >= 1;
  const smallR = BIG_R / Math.sqrt(250);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Two fills in Polymarket's Gavin Newsom 2028 market on November 12, 2026. One wallet bought 16.39 YES shares for 1 dollar, another bought 4,034.30 YES shares for 250 dollars about four and a half minutes later, both near 6.2 cents. Counted by trade they weigh the same; sized by money, the second circle is 250 times larger in area."
      caption="Two fills from a six-fill Lychee preview of the Newsom 2028 market, November 12, 2026. Either wallet may have had other exposure."
    >
      <ScaledStage width={860} height={370}>
        <div className="grid h-full grid-cols-[1fr_1.05fr] gap-4">
          <Panel className="flex flex-col p-5">
            <Eyebrow>Will Gavin Newsom win in 2028? · YES buys</Eyebrow>
            <div className="mt-4 space-y-3">
              {NEWSOM_FILLS.map((fill, index) => (
                <div key={fill.wallet} className="rounded-lg border border-border px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-muted-foreground">{fill.time}</span>
                    <span className="text-[16px] font-semibold" style={{ color: WIN }}>
                      ✓
                    </span>
                  </div>
                  <p className="mt-1 text-[15px] text-foreground">
                    {fill.wallet} bought <span className="font-mono font-medium">{fill.shares}</span> YES
                  </p>
                  <p className="mt-0.5 flex justify-between text-[13px] text-muted-foreground">
                    <span>
                      for{" "}
                      <span
                        className="font-mono font-semibold transition-colors duration-500"
                        style={{ color: weighted ? (index ? BLUE : "var(--foreground)") : "var(--foreground)" }}
                      >
                        ${fill.spent}
                      </span>
                    </span>
                    <span className="font-mono">{fill.price} / share</span>
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-auto text-[13px] text-muted-foreground">Same market, same side, nearly the same price.</p>
          </Panel>

          <Panel className="relative overflow-hidden p-5">
            <Eyebrow>{weighted ? "Weighted by money at risk" : "Counted once per purchase"}</Eyebrow>
            <div className="absolute inset-x-5 bottom-[76px] top-10 flex items-center justify-around">
              {[smallR, BIG_R].map((r, index) => {
                const size = (weighted ? r : 34) * 2;
                return (
                  <div key={index} className="flex flex-col items-center gap-2">
                    <div
                      className="rounded-full"
                      style={{
                        width: size,
                        height: size,
                        background: index ? BLUE : "var(--foreground)",
                        opacity: index ? 0.85 : 0.75,
                        transition: `width 1100ms ${EASE}, height 1100ms ${EASE}`,
                      }}
                    />
                    <span className="font-mono text-[12px] text-muted-foreground">{weighted ? `$${index ? 250 : 1}` : "1 trade"}</span>
                  </div>
                );
              })}
            </div>
            <Reveal show={phase >= 2} className="absolute inset-x-5 bottom-4 rounded-lg border px-4 py-2" style={{ borderColor: AMBER }}>
              <p className="text-[14px] font-semibold text-foreground">Equal weight in a win count. 250× the money at stake.</p>
            </Reveal>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Ten contracts, one call                                                 */
/* -------------------------------------------------------------------------- */

const SCENARIOS = ["Wins narrowly", "Wins comfortably", "Loses"] as const;

const RELATED_POSITIONS = [
  { market: "Candidate A wins the election", side: "YES", fill: "400 @ 45¢", cost: 180, pays: [400, 400, 0] },
  { market: "Candidate A wins by 5+ points", side: "YES", fill: "300 @ 20¢", cost: 60, pays: [0, 300, 0] },
  { market: "Candidate A wins State X", side: "YES", fill: "250 @ 56¢", cost: 140, pays: [250, 250, 0] },
  { market: "Candidate B wins the election", side: "NO", fill: "200 @ 50¢", cost: 100, pays: [200, 200, 0] },
] as const;

export function ScenarioPayoffExplorer() {
  const [scenario, setScenario] = useState(0);
  const cost = RELATED_POSITIONS.reduce((sum, row) => sum + row.cost, 0);
  const payouts = SCENARIOS.map((_, index) => RELATED_POSITIONS.reduce((sum, row) => sum + row.pays[index], 0));

  return (
    <InteractiveFigure caption="Illustrative positions held to settlement, before fees. Pick a scenario to see what every contract pays at once.">
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <span className="mr-1 text-[13px] font-semibold text-foreground">If Candidate A…</span>
          {SCENARIOS.map((label, index) => (
            <PillButton key={label} active={scenario === index} onClick={() => setScenario(index)}>
              {label}
            </PillButton>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="border-b border-border font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 text-left font-normal">Contract</th>
                <th className="px-2 py-2 text-right font-normal">Bought</th>
                <th className="px-2 py-2 text-right font-normal">Cost</th>
                {SCENARIOS.map((label, index) => (
                  <th
                    key={label}
                    className="px-3 py-2 text-right font-normal transition-colors"
                    style={{ color: scenario === index ? "var(--foreground)" : undefined }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RELATED_POSITIONS.map((row) => (
                <tr key={row.market} className="border-b border-border/70">
                  <td className="px-4 py-2.5 text-foreground">
                    {row.market}{" "}
                    <span className="ml-1 font-mono text-[10.5px] font-semibold" style={{ color: row.side === "YES" ? WIN : LOSS }}>
                      {row.side}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-muted-foreground">{row.fill}</td>
                  <td className="px-2 py-2.5 text-right font-mono text-foreground">${row.cost}</td>
                  {row.pays.map((pay, index) => (
                    <td
                      key={index}
                      className="px-3 py-2.5 text-right font-mono tabular-nums transition-colors"
                      style={{
                        background: scenario === index ? "var(--muted)" : undefined,
                        color: pay ? WIN : "var(--muted-foreground)",
                      }}
                    >
                      ${pay}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="font-medium">
                <td className="px-4 py-2.5 text-foreground">Total</td>
                <td />
                <td className="px-2 py-2.5 text-right font-mono text-foreground">${cost}</td>
                {payouts.map((pay, index) => (
                  <td key={index} className="px-3 py-2.5 text-right font-mono" style={{ background: scenario === index ? "var(--muted)" : undefined }}>
                    <span className="block text-foreground">{dollars(pay)}</span>
                    <span className="block text-[12px]" style={{ color: toneOf(pay - cost) }}>
                      {dollars(pay - cost, { signed: true })}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <p className="border-t border-border px-4 py-3 text-[13px] leading-relaxed text-foreground" aria-live="polite">
          {scenario === 2 ? (
            <>
              <span className="font-semibold" style={{ color: LOSS }}>
                Every contract pays $0.
              </span>{" "}
              Four positions, one call: the whole ${cost} rode on Candidate A.
            </>
          ) : (
            <>
              <span className="font-semibold" style={{ color: WIN }}>
                {dollars(payouts[scenario] - cost, { signed: true })}
              </span>{" "}
              from {RELATED_POSITIONS.filter((row) => row.pays[scenario] > 0).length} winning contracts, but they all won for the same reason.
            </>
          )}
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Entry price vs later buyers                                             */
/* -------------------------------------------------------------------------- */

const CHART = { left: 70, right: 830, top: 46, bottom: 290, minutes: 90, low: 38, high: 54 };
const cx = (minute: number) => CHART.left + (minute / CHART.minutes) * (CHART.right - CHART.left);
const cy = (cents: number) => CHART.bottom - ((cents - CHART.low) / (CHART.high - CHART.low)) * (CHART.bottom - CHART.top);

const PRICE_PATH: Array<[number, number]> = [
  [0, 42],
  [8, 42.5],
  [16, 43],
  [24, 44],
  [32, 44.5],
  [40, 46],
  [48, 47],
  [56, 48.5],
  [64, 50],
  [70, 50.5],
  [78, 51],
  [90, 50.5],
];
const OTHER_FILLS: Array<[number, number]> = [
  [16, 43],
  [32, 44.5],
  [48, 47],
  [78, 51],
];
const LATER_FILL: [number, number] = [64, 50];

export function EntryGapAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([2000, 2800, 2600, 4200], rootRef, 3);
  const d = PRICE_PATH.map(([m, c], index) => `${index ? "L" : "M"}${cx(m).toFixed(1)},${cy(c).toFixed(1)}`).join(" ");
  const fade = (show: boolean) => ({ opacity: show ? 1 : 0, transition: "opacity 500ms ease" });

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A price chart over 90 minutes. A trader buys YES at 42 cents. A comparison window from 60 to 75 minutes later is shaded, and the first buy by another trader inside it fills at 50 cents, 8 cents above the original entry. Fills outside the window are ignored. A follower who spots the trade then would be paying about 50 cents: a different bet."
      caption="Illustrative prices. Pick the comparison rule first, then measure every entry the same way."
    >
      <ScaledStage width={860} height={340}>
        <svg viewBox="0 0 860 340" className="size-full" aria-hidden>
          {[40, 45, 50].map((c) => (
            <g key={c}>
              <line x1={CHART.left} x2={CHART.right} y1={cy(c)} y2={cy(c)} stroke="var(--border)" />
              <text x={CHART.left - 10} y={cy(c) + 4} textAnchor="end" fontSize={12} fill="var(--muted-foreground)">
                {c}¢
              </text>
            </g>
          ))}
          {[0, 30, 60, 75, 90].map((m) => (
            <text key={m} x={cx(m)} y={CHART.bottom + 22} textAnchor="middle" fontSize={12} fill="var(--muted-foreground)">
              {m === 0 ? "Buy" : `+${m} min`}
            </text>
          ))}

          <g style={fade(phase >= 1)}>
            <rect x={cx(60)} y={CHART.top - 10} width={cx(75) - cx(60)} height={CHART.bottom - CHART.top + 10} fill={BLUE} opacity={0.09} />
            <text x={(cx(60) + cx(75)) / 2} y={CHART.top - 16} textAnchor="middle" fontSize={12} fontWeight={600} fill={BLUE}>
              Comparison window
            </text>
          </g>

          <path
            d={d}
            fill="none"
            stroke="var(--foreground)"
            strokeOpacity={0.55}
            strokeWidth={2}
            pathLength={1}
            strokeDasharray={1}
            style={{ strokeDashoffset: phase >= 1 ? 0 : 1, transition: `stroke-dashoffset 1400ms ${EASE}` }}
          />

          <g style={fade(phase >= 1)}>
            {OTHER_FILLS.map(([m, c]) => (
              <circle key={m} cx={cx(m)} cy={cy(c)} r={5} fill="var(--background)" stroke="var(--muted-foreground)" strokeWidth={1.5} />
            ))}
            <circle cx={cx(LATER_FILL[0])} cy={cy(LATER_FILL[1])} r={7} fill={BLUE} />
            <text x={cx(LATER_FILL[0]) - 12} y={cy(LATER_FILL[1]) - 14} textAnchor="end" fontSize={12.5} fontWeight={600} fill={BLUE}>
              First later buy · 50¢
            </text>
          </g>

          <g style={fade(phase >= 2)}>
            <line
              x1={cx(0)}
              x2={cx(LATER_FILL[0]) + 26}
              y1={cy(42)}
              y2={cy(42)}
              stroke={WIN}
              strokeDasharray="4 4"
            />
            <line x1={cx(LATER_FILL[0]) + 26} x2={cx(LATER_FILL[0]) + 26} y1={cy(42)} y2={cy(50)} stroke={AMBER} strokeWidth={3} />
            <text x={cx(LATER_FILL[0]) + 36} y={(cy(42) + cy(50)) / 2 + 6} fontSize={20} fontWeight={700} fill={AMBER}>
              +8¢
            </text>
          </g>

          <circle cx={cx(0)} cy={cy(42)} r={8} fill={WIN} />
          <text x={cx(0) + 14} y={cy(42) + 24} fontSize={13} fontWeight={600} fill={WIN}>
            Trader buys YES · 42¢
          </text>

          <g style={fade(phase >= 3)}>
            <rect x={CHART.left + 4} y={CHART.top - 8} width={330} height={58} rx={10} fill="var(--background)" stroke={AMBER} />
            <text x={CHART.left + 20} y={CHART.top + 15} fontSize={14} fontWeight={600} fill="var(--foreground)">
              Spot it here and you pay ~50¢, not 42¢.
            </text>
            <text x={CHART.left + 20} y={CHART.top + 36} fontSize={12.5} fill="var(--muted-foreground)">
              Evidence about their entry. A different bet for you.
            </text>
          </g>
        </svg>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Remove the biggest win                                                  */
/* -------------------------------------------------------------------------- */

const EVENTS = [
  { name: "Election (3 related contracts)", pnl: 1500 },
  { name: "Fed rate decision", pnl: 180 },
  { name: "Oscars", pnl: -220 },
  { name: "NBA Finals", pnl: -140 },
  { name: "CPI print", pnl: 90 },
  { name: "Hurricane landfall", pnl: -210 },
];

export function RemoveBiggestWinExplorer() {
  const [removed, setRemoved] = useState(false);
  const biggest = EVENTS.reduce((best, event) => (event.pnl > best.pnl ? event : best), EVENTS[0]);
  const total = EVENTS.reduce((sum, event) => sum + (removed && event === biggest ? 0 : event.pnl), 0);
  const scale = Math.max(...EVENTS.map((event) => Math.abs(event.pnl)));

  return (
    <InteractiveFigure caption="Illustrative record grouped by event. Each number includes realized P&L, fees actually paid, and open positions marked at a stated price and time.">
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <PillButton active={!removed} onClick={() => setRemoved(false)}>
              Everything
            </PillButton>
            <PillButton active={removed} onClick={() => setRemoved(true)}>
              Without the biggest event
            </PillButton>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Total</p>
            <p className="font-mono text-[26px] font-medium leading-none tabular-nums" style={{ color: toneOf(total), transition: "color 300ms ease" }}>
              {dollars(total, { signed: true })}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {EVENTS.map((event) => {
            const gone = removed && event === biggest;
            const width = (Math.abs(event.pnl) / scale) * 50;
            return (
              <div key={event.name} className="grid grid-cols-[11rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-[13px]" style={{ opacity: gone ? 0.3 : 1, transition: "opacity 400ms ease" }}>
                <span className={cn("truncate text-foreground", gone && "line-through")}>{event.name}</span>
                <div className="relative h-5">
                  <div className="absolute inset-y-[-3px] left-1/2 w-px bg-border" />
                  <div
                    className="absolute inset-y-0 rounded-sm"
                    style={{
                      background: event.pnl > 0 ? WIN : LOSS,
                      width: `${gone ? 0 : width}%`,
                      left: event.pnl > 0 ? "50%" : `${50 - (gone ? 0 : width)}%`,
                      transition: `width 500ms ${EASE}, left 500ms ${EASE}`,
                    }}
                  />
                </div>
                <span className="text-right font-mono tabular-nums" style={{ color: toneOf(event.pnl) }}>
                  {dollars(event.pnl, { signed: true })}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-5 rounded-lg border border-border px-3 py-2.5 text-[13px] leading-relaxed text-foreground" aria-live="polite">
          {removed ? (
            <>
              <span className="font-semibold" style={{ color: LOSS }}>
                The other five events lost $300.
              </span>{" "}
              That&apos;s the part of the record that needs more evidence.
            </>
          ) : (
            <>
              <span className="font-semibold">+$1,200 overall.</span> Now take out the single most profitable event.
            </>
          )}
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. The record you watched unfold                                           */
/* -------------------------------------------------------------------------- */

const WATCH_LOG = [
  { event: "Fed holds in December", side: "YES", entry: "38¢", size: "$380", fees: "$4", status: "Won", pnl: 616 },
  { event: "Senate race X", side: "NO", entry: "61¢", size: "$610", fees: "$5", status: "Lost", pnl: -615 },
  { event: "CPI above 3%", side: "YES", entry: "22¢", size: "$220", fees: "$2", status: "Open · 30¢", pnl: 78 },
  { event: "No trades after Nov 28", side: null, entry: "—", size: "—", fees: "—", status: "Stopped", pnl: null },
] as const;

export function WatchlistAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([2200, 1400, 1400, 1400, 1400, 4600], rootRef, 5);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A dated watchlist. On the left, the record that caught your eye, saved on November 12 with a reason and a review date. On the right, a log fills in one new position at a time with event, entry price, size, fees and status: a win of 616 dollars, a loss of 615, an open position marked at 30 cents, and a note that the trader stopped trading. At review, plus 4,200 dollars before sits next to plus 1 dollar realized and plus 78 dollars open since."
      caption="Illustrative watchlist. Keep the losers, the open positions and the traders who go quiet."
    >
      <ScaledStage width={860} height={420}>
        <div className="flex h-full flex-col gap-3">
          <div className="grid flex-1 grid-cols-[15rem_minmax(0,1fr)] gap-4">
            <Panel className="flex flex-col p-5">
              <Eyebrow>The record that caught your eye</Eyebrow>
              <p className="mt-3 font-mono text-[30px] font-medium leading-none" style={{ color: WIN }}>
                +$4,200
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">Leaderboard, last 30 days</p>
              <div className="mt-4 space-y-2 text-[12.5px]">
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Saved</span>
                  <span className="font-mono text-foreground">Nov 12</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Why</span>
                  <span className="text-right text-foreground">Early politics entries</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Review on</span>
                  <span className="font-mono text-foreground">Dec 12</span>
                </p>
              </div>
            </Panel>

            <Panel className="flex flex-col overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <Eyebrow>The record you watched unfold</Eyebrow>
              </div>
              <div className="grid grid-cols-[1fr_52px_56px_44px_88px_64px] border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                <span>Event</span>
                <span className="text-right">Entry</span>
                <span className="text-right">Size</span>
                <span className="text-right">Fees</span>
                <span className="text-right">Status</span>
                <span className="text-right">P&amp;L</span>
              </div>
              {WATCH_LOG.map((row, index) => (
                <div
                  key={row.event}
                  className="grid grid-cols-[1fr_52px_56px_44px_88px_64px] items-center border-b border-border/70 px-4 py-2.5 text-[12.5px]"
                  style={{
                    opacity: phase > index ? 1 : 0,
                    transform: phase > index ? "none" : "translateY(6px)",
                    transition: `opacity 400ms ease, transform 500ms ${EASE}`,
                  }}
                >
                  <span className={cn("truncate", row.side ? "text-foreground" : "italic text-muted-foreground")}>
                    {row.event}
                    {row.side ? (
                      <span className="ml-1.5 font-mono text-[10px] font-semibold" style={{ color: row.side === "YES" ? WIN : LOSS }}>
                        {row.side}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-right font-mono text-foreground">{row.entry}</span>
                  <span className="text-right font-mono text-foreground">{row.size}</span>
                  <span className="text-right font-mono text-muted-foreground">{row.fees}</span>
                  <span className="text-right text-muted-foreground">{row.status}</span>
                  <span className="text-right font-mono tabular-nums" style={{ color: row.pnl == null ? "var(--muted-foreground)" : toneOf(row.pnl) }}>
                    {row.pnl == null ? "—" : dollars(row.pnl, { signed: true })}
                  </span>
                </div>
              ))}
            </Panel>
          </div>

          <Reveal show={phase >= 5} className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-background px-4 py-2.5">
              <p className="text-[11px] text-muted-foreground">Caught your eye</p>
              <p className="font-mono text-[18px] font-medium" style={{ color: WIN }}>
                +$4,200
              </p>
            </div>
            <div className="rounded-lg border bg-background px-4 py-2.5" style={{ borderColor: AMBER }}>
              <p className="text-[11px] text-muted-foreground">Watched unfold, after fees</p>
              <p className="font-mono text-[18px] font-medium text-foreground">
                +$1 realized <span className="text-muted-foreground">·</span> +$78 open
              </p>
            </div>
          </Reveal>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}
