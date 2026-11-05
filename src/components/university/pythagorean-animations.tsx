"use client";

import { useId, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { BLUE, GREEN, RED } from "@/components/sections/features/feature-kit";
import { EASE, GuideAnimationFigure, ScaledStage, useGuidePhases } from "@/components/content/guide-animations/guide-animation-kit";
import { cn } from "@/lib/utils";

const AMBER = "#d97706";

const FRAMES = `
@keyframes pyth-pop {
  0% { opacity: 0; transform: scale(.4); }
  100% { opacity: 1; transform: none; }
}
@keyframes pyth-grow {
  0% { transform: scaleY(0); }
  100% { transform: scaleY(1); }
}
@keyframes pyth-rise {
  0% { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .guide-animation .pyth-anim { animation: none !important; }
}
`;

function Frames() {
  return <style dangerouslySetInnerHTML={{ __html: FRAMES }} />;
}

/** Exponent-k Pythagorean win fraction; 0.5 when there is no scoring at all. */
function pythagorean(rs: number, ra: number, k = 2) {
  const a = Math.max(0, rs) ** k;
  const b = Math.max(0, ra) ** k;
  return a + b > 0 ? a / (a + b) : 0.5;
}

function pct(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function Panel({ className, children, style }: { className?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-background shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)]", className)}
      style={style}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground", className)}>{children}</p>
  );
}

function Reveal({ show, children, className, style }: { show: boolean; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={cn("transition-opacity duration-500", className)} style={{ ...style, opacity: show ? 1 : 0 }}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Same record, different scoring                                          */
/* -------------------------------------------------------------------------- */

type Game = readonly [scored: number, allowed: number];

const TEAM_A: readonly Game[] = [[7, 2], [3, 4], [8, 1], [5, 6], [6, 1], [9, 3], [2, 3], [7, 2], [4, 5], [6, 0]];
const TEAM_B: readonly Game[] = [[4, 3], [1, 9], [3, 2], [5, 4], [0, 7], [2, 1], [6, 5], [2, 10], [4, 3], [1, 8]];

function totals(games: readonly Game[]) {
  let rs = 0;
  let ra = 0;
  let wins = 0;
  for (const [s, a] of games) {
    rs += s;
    ra += a;
    if (s > a) wins += 1;
  }
  return { rs, ra, wins, losses: games.length - wins };
}

function MarginBars({ games, loop, animate }: { games: readonly Game[]; loop: number; animate: boolean }) {
  const unit = 8;
  return (
    <div className="relative h-[150px]">
      <div className="absolute inset-x-0 top-[75px] h-px bg-border" />
      {games.map(([s, a], index) => {
        const margin = s - a;
        const win = margin > 0;
        const h = Math.max(4, Math.abs(margin) * unit);
        return (
          <span
            key={`${loop}-${index}`}
            className="pyth-anim absolute w-[26px] rounded-[3px]"
            style={{
              left: index * 36,
              top: win ? 75 - h : 76,
              height: h,
              background: win ? GREEN : RED,
              opacity: win ? 0.9 : 0.75,
              transformOrigin: win ? "bottom" : "top",
              animation: animate ? `pyth-grow .5s ${EASE} ${index * 90}ms both` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

function TeamCard({
  name,
  games,
  story,
  phase,
  loop,
  animate,
}: {
  name: string;
  games: readonly Game[];
  story: string;
  phase: number;
  loop: number;
  animate: boolean;
}) {
  const t = totals(games);
  return (
    <Panel className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between">
        <div>
          <Eyebrow>{name} · hypothetical</Eyebrow>
          <p className="mt-1 text-[15px] font-semibold text-foreground">Last ten games, by margin</p>
        </div>
        <Reveal show={phase >= 1}>
          <span className="rounded-full bg-foreground px-3 py-1 font-mono text-[15px] font-medium text-background">
            {t.wins}–{t.losses}
          </span>
        </Reveal>
      </div>
      <div className="mt-5 px-1">
        <MarginBars games={games} loop={loop} animate={animate} />
      </div>
      <Reveal show={phase >= 2} className="mt-auto space-y-1.5 border-t border-border/70 pt-3">
        <p className="text-[12.5px] text-muted-foreground">{story}</p>
        <p className="font-mono text-[13px] text-foreground">
          {t.rs} scored · {t.ra} allowed →{" "}
          <span className="font-semibold" style={{ color: t.rs > t.ra ? GREEN : RED }}>
            {pct(pythagorean(t.rs, t.ra))}
          </span>{" "}
          <span className="text-muted-foreground">Pythagorean</span>
        </p>
      </Reveal>
    </Panel>
  );
}

export function SameRecordTwoTeamsAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop, reduced } = useGuidePhases([2600, 2200, 4200], rootRef, 2);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Two hypothetical teams' last ten games drawn as margin bars. Team A wins big and loses four games by one run. Team B wins narrowly and loses four games heavily. Both finish 6–4, but Team A scored 57 and allowed 27, while Team B scored 28 and allowed 52."
      caption="Hypothetical ten-game stretches. Ten games is too few for a firm verdict; this only shows why scoring adds information a record hides."
    >
      <Frames />
      <ScaledStage width={860} height={400}>
        <div className="flex h-full flex-col gap-3">
          <Reveal show={phase >= 1} className="flex justify-center">
            <span className="rounded-full border border-border bg-background px-3 py-1 text-[12px] font-medium text-foreground shadow-sm">
              Same record: both 6–4
            </span>
          </Reveal>
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
            <TeamCard
              name="Team A"
              games={TEAM_A}
              story="Big wins, one-run losses."
              phase={phase}
              loop={loop}
              animate={!reduced}
            />
            <TeamCard
              name="Team B"
              games={TEAM_B}
              story="Narrow wins, heavy losses."
              phase={phase}
              loop={loop}
              animate={!reduced}
            />
          </div>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. The formula as squares                                                  */
/* -------------------------------------------------------------------------- */

const SQUARE_STEPS = [
  { label: "Square runs scored", math: "500 × 500 = 250,000" },
  { label: "Square runs allowed", math: "400 × 400 = 160,000" },
  { label: "Add them", math: "250,000 + 160,000 = 410,000" },
  { label: "Divide", math: "250,000 ÷ 410,000 = 0.6098" },
];

export function PythagoreanSquaresAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1800, 1500, 1500, 1500, 3600], rootRef, 4);
  const scale = 0.42;
  const rsSide = 500 * scale;
  const raSide = 400 * scale;
  const base = 318;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="The worked example drawn as squares. A side of 500 runs scored and a side of 400 runs allowed grow into squares of 250,000 and 160,000. Together they make 410,000, and the scored square's share, about 61 percent, is the Pythagorean estimate. The plain share of runs is 55.6 percent."
      caption="500 runs scored and 400 allowed. Squaring is what turns a 55.6% share of runs into a roughly 61% win estimate."
    >
      <ScaledStage width={860} height={420}>
        <div className="grid h-full grid-cols-[1fr_330px] gap-4">
          <Panel className="relative overflow-hidden p-5">
            <Eyebrow>Expected win % = RS² ÷ (RS² + RA²)</Eyebrow>
            <p className="mt-1 text-[15px] font-semibold text-foreground">
              {phase >= 1 ? "Each side becomes a square" : "Start with the two run totals"}
            </p>

            {[
              { side: rsSide, left: 34, color: BLUE, on: phase >= 1, label: "RS = 500", area: "250,000" },
              { side: raSide, left: 34 + rsSide + 46, color: RED, on: phase >= 2, label: "RA = 400", area: "160,000" },
            ].map((sq) => (
              <div key={sq.label}>
                <div
                  className="absolute grid place-items-center overflow-hidden rounded-[3px] border-2"
                  style={{
                    left: sq.left,
                    top: base - (sq.on ? sq.side : 3),
                    width: sq.side,
                    height: sq.on ? sq.side : 3,
                    borderColor: sq.color,
                    background: sq.on ? `${sq.color}1a` : sq.color,
                    transition: `top 800ms ${EASE}, height 800ms ${EASE}, background 400ms ease`,
                  }}
                >
                  <span
                    className="font-mono text-[18px] font-medium transition-opacity duration-500"
                    style={{ color: sq.color, opacity: sq.on ? 1 : 0 }}
                  >
                    {sq.area}
                  </span>
                </div>
                <p
                  className="absolute text-center font-mono text-[12px] text-muted-foreground"
                  style={{ left: sq.left, top: base + 10, width: sq.side }}
                >
                  {sq.label}
                </p>
              </div>
            ))}

            <Reveal show={phase >= 3} className="absolute bottom-5 left-5 right-5">
              <div className="flex h-7 overflow-hidden rounded-md border border-border">
                <div
                  className="flex items-center justify-center font-mono text-[11px] font-medium text-white"
                  style={{ width: phase >= 4 ? "60.98%" : "50%", background: BLUE, transition: `width 900ms ${EASE}` }}
                >
                  250,000
                </div>
                <div
                  className="flex flex-1 items-center justify-center font-mono text-[11px] font-medium text-white"
                  style={{ background: RED }}
                >
                  160,000
                </div>
              </div>
              <p className="mt-1.5 text-[11.5px] text-muted-foreground">Together: 410,000. The scored square&apos;s share is the estimate.</p>
            </Reveal>
          </Panel>

          <Panel className="flex flex-col p-5">
            <Eyebrow>Worked example</Eyebrow>
            <ol className="mt-3 space-y-2">
              {SQUARE_STEPS.map((step, index) => {
                const on = phase >= index + 1;
                return (
                  <li
                    key={step.label}
                    className="rounded-lg border px-3 py-2 transition-all duration-500"
                    style={{
                      borderColor: on ? BLUE : "var(--border)",
                      background: on ? "rgba(47,111,237,0.06)" : "transparent",
                      opacity: on ? 1 : 0.45,
                    }}
                  >
                    <p className="text-[12px] text-muted-foreground">
                      {index + 1}. {step.label}
                    </p>
                    <p className="font-mono text-[13px] font-medium text-foreground">{step.math}</p>
                  </li>
                );
              })}
            </ol>
            <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Share of runs</p>
                <p className="font-mono text-[18px] font-medium text-foreground">55.6%</p>
              </div>
              <div
                className="rounded-lg border px-3 py-2 transition-colors duration-500"
                style={{ borderColor: phase >= 4 ? BLUE : "var(--border)" }}
              >
                <p className="text-[11px] text-muted-foreground">Expected win %</p>
                <p className="font-mono text-[18px] font-medium" style={{ color: phase >= 4 ? BLUE : "var(--muted-foreground)" }}>
                  {phase >= 4 ? "≈ 61%" : "—"}
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Interactive calculator                                                  */
/* -------------------------------------------------------------------------- */

const EXPONENTS = [
  { value: 1, label: "1" },
  { value: 1.83, label: "1.83" },
  { value: 2, label: "2" },
];

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  color = BLUE,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  color?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[12.5px] text-muted-foreground">
          {label}
        </label>
        <span className="font-mono text-[14px] font-medium tabular-nums text-foreground">{value.toLocaleString("en-US")}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 w-full cursor-pointer"
        style={{ accentColor: color }}
      />
    </div>
  );
}

export function PythagoreanCalculator() {
  const [rs, setRs] = useState(500);
  const [ra, setRa] = useState(400);
  const [games, setGames] = useState(100);
  const [actualWins, setActualWins] = useState(52);
  const [k, setK] = useState(2);

  const wins = Math.min(actualWins, games);
  const expectedPct = pythagorean(rs, ra, k);
  const expectedWins = expectedPct * games;
  const gap = wins - expectedWins;
  const runShare = rs + ra > 0 ? rs / (rs + ra) : 0.5;
  const kLabel = EXPONENTS.find((e) => e.value === k)?.label || String(k);

  return (
    <figure data-article-bleed className="not-prose mx-auto my-8 w-full max-w-[48rem] font-sans sm:my-10">
      <div className="rounded-xl border border-border bg-muted/50 p-3 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <Panel className="space-y-4 p-5">
            <div>
              <Eyebrow>Try it yourself</Eyebrow>
              <p className="mt-1 text-[15px] font-semibold text-foreground">Pythagorean expectation calculator</p>
            </div>
            <Slider label="Runs scored (RS)" value={rs} min={0} max={1200} step={10} onChange={setRs} />
            <Slider label="Runs allowed (RA)" value={ra} min={0} max={1200} step={10} onChange={setRa} color={RED} />
            <Slider
              label="Games those totals cover"
              value={games}
              min={1}
              max={162}
              onChange={(value) => {
                setGames(value);
                setActualWins((w) => Math.min(w, value));
              }}
              color="#64748b"
            />
            <Slider label="Actual wins" value={wins} min={0} max={games} onChange={setActualWins} color={GREEN} />
            <div>
              <p className="text-[12.5px] text-muted-foreground">Exponent</p>
              <div className="mt-1.5 inline-flex rounded-lg border border-border p-0.5" role="radiogroup" aria-label="Exponent">
                {EXPONENTS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    role="radio"
                    aria-checked={k === option.value}
                    onClick={() => setK(option.value)}
                    className={cn(
                      "rounded-md px-3 py-1 font-mono text-[12.5px] transition-colors",
                      k === option.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          <Panel className="flex flex-col p-5" style={{ minHeight: 0 }}>
            <Eyebrow>Expected win %</Eyebrow>
            <p className="mt-1 font-mono text-[44px] font-medium leading-none tracking-tight" style={{ color: BLUE }} aria-live="polite">
              {pct(expectedPct)}
            </p>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Pythagorean record{" "}
              <span className="font-mono font-medium text-foreground">
                {Math.round(expectedWins)}–{games - Math.round(expectedWins)}
              </span>{" "}
              · share of runs <span className="font-mono text-foreground">{pct(runShare)}</span>
            </p>

            <div className="mt-5 space-y-2.5">
              {[
                { label: "Expected wins", value: expectedWins, color: BLUE },
                { label: "Actual wins", value: wins, color: GREEN },
              ].map((bar) => (
                <div key={bar.label}>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-muted-foreground">{bar.label}</span>
                    <span className="font-mono text-foreground">{bar.value.toFixed(bar.label === "Actual wins" ? 0 : 1)}</span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(bar.value / games) * 100}%`, background: bar.color, transition: `width 400ms ${EASE}` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 rounded-lg border border-border px-3 py-2 text-[12.5px] text-foreground">
              {Math.abs(gap) < 0.5
                ? "Actual wins are in line with the scoring."
                : `Actual wins are ${Math.abs(gap).toFixed(1)} ${gap < 0 ? "below" : "above"} the estimate. A question to investigate, not a debt.`}
            </p>

            <p className="mt-auto pt-4 font-mono text-[11.5px] text-muted-foreground">
              Spreadsheet: ={rs}^{kLabel}/({rs}^{kLabel}+{ra}^{kLabel})
            </p>
          </Panel>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
        Starts at the lesson&apos;s hypothetical team: 500 scored, 400 allowed, 100 games, 52 actual wins.
      </figcaption>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Expected vs actual                                                      */
/* -------------------------------------------------------------------------- */

const GAP_REASONS = ["Lost close games", "Runs piled up in blowouts", "Bullpen in key spots", "Roster changes"];

function DotGrid({
  filled,
  color,
  highlight,
  loop,
  animate,
}: {
  filled: number;
  color: string;
  highlight?: [number, number] | null;
  loop: number;
  animate: boolean;
}) {
  return (
    <div className="grid w-fit grid-cols-10 gap-[6px]">
      {Array.from({ length: 100 }, (_, index) => {
        const on = index < filled;
        const marked = highlight && index >= highlight[0] && index < highlight[1];
        return (
          <span
            key={`${loop}-${index}`}
            className={cn("size-[14px] rounded-full", on && "pyth-anim")}
            style={{
              background: on ? color : "transparent",
              border: on ? "none" : "1px solid var(--border)",
              boxShadow: marked ? `0 0 0 2px var(--background), 0 0 0 4px ${AMBER}` : undefined,
              transition: "box-shadow 300ms ease",
              animation: on && animate ? `pyth-pop .3s ${EASE} ${index * 12}ms both` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

export function ExpectedVsActualAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop, reduced } = useGuidePhases([2200, 2200, 2400, 4000], rootRef, 3);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Two grids of 100 games. The first fills 61 dots for the Pythagorean record of 61–39. The second fills 52 dots for the actual 52–48 record. The nine-game gap is circled, followed by possible explanations to investigate."
      caption="Hypothetical team. The gap is a question to investigate; the calculation alone does not explain it."
    >
      <Frames />
      <ScaledStage width={860} height={420}>
        <div className="flex h-full flex-col gap-4">
          <div className="grid flex-1 grid-cols-2 gap-4">
            <Panel className="flex flex-col items-center p-5">
              <Eyebrow className="self-start">Pythagorean record</Eyebrow>
              <p className="self-start font-mono text-[22px] font-medium" style={{ color: BLUE }}>
                61–39
              </p>
              <div className="mt-3">
                <DotGrid filled={61} color={BLUE} highlight={phase >= 2 ? [52, 61] : null} loop={loop} animate={!reduced} />
              </div>
            </Panel>
            <Panel className="flex flex-col items-center p-5">
              <Eyebrow className="self-start">Actual record</Eyebrow>
              <p
                className="self-start font-mono text-[22px] font-medium transition-opacity duration-500"
                style={{ color: GREEN, opacity: phase >= 1 ? 1 : 0.2 }}
              >
                52–48
              </p>
              <div className="mt-3">
                <DotGrid filled={phase >= 1 ? 52 : 0} color={GREEN} loop={loop + (phase >= 1 ? 1000 : 0)} animate={!reduced} />
              </div>
            </Panel>
          </div>
          <Panel className="flex h-[78px] items-center gap-4 px-5">
            <Reveal show={phase >= 2} className="shrink-0">
              <span className="rounded-full px-3 py-1 font-mono text-[14px] font-semibold" style={{ background: `${AMBER}1a`, color: AMBER }}>
                −9 wins
              </span>
            </Reveal>
            <div className="min-w-0 flex-1">
              <Reveal show={phase >= 2}>
                <p className="text-[14px] font-medium text-foreground">Why did this scoring turn into fewer wins?</p>
              </Reveal>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {GAP_REASONS.map((reason, index) => (
                  <span
                    key={reason}
                    className="rounded-md border border-border px-2 py-0.5 text-[11.5px] text-muted-foreground transition-all duration-500"
                    style={{ opacity: phase >= 3 ? 1 : 0, transitionDelay: phase >= 3 ? `${index * 140}ms` : "0ms" }}
                  >
                    {reason}?
                  </span>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Not owed wins                                                           */
/* -------------------------------------------------------------------------- */

export function NotOwedWinsAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([2200, 2600, 2400, 3600], rootRef, 3);
  const perGame = 760 / 120;
  const winsW = 52 * perGame;
  const lossW = 48 * perGame;
  const restW = 20 * perGame;
  const forecastW = 12 * perGame;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A season bar. 52 wins and 48 losses from 100 games are locked in. A bubble claiming nine wins are owed is crossed out. A separate 60 percent forecast over the 20 remaining games adds 12 expected wins, for a projected 64."
      caption="Hypothetical projection. The 60% is a separate forecast for the remaining games, not something read off the gap."
    >
      <ScaledStage width={860} height={330}>
        <Panel className="relative h-full p-6">
          <Eyebrow>Season so far, then the rest</Eyebrow>
          <p className="mt-1 text-[18px] font-semibold tracking-tight text-foreground">
            {phase >= 3 ? "Projected total: 52 + 12 = 64 wins" : phase >= 2 ? "Forecast only the games left" : phase >= 1 ? "Is the team owed nine wins?" : "100 games played: 52–48"}
          </p>

          <div className="absolute left-[44px] top-[150px] flex h-12" style={{ width: 760 }}>
            <div className="flex items-center justify-center rounded-l-md font-mono text-[12px] font-medium text-white" style={{ width: winsW, background: GREEN }}>
              52 W
            </div>
            <div className="flex items-center justify-center font-mono text-[12px] font-medium text-white" style={{ width: lossW, background: "#94a3b8" }}>
              48 L
            </div>
            <div className="relative overflow-hidden rounded-r-md border-2 border-dashed border-border" style={{ width: restW }}>
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: phase >= 2 ? forecastW : 0,
                  background: `repeating-linear-gradient(135deg, ${BLUE}55 0 6px, ${BLUE}22 6px 12px)`,
                  transition: `width 900ms ${EASE}`,
                }}
              />
            </div>
          </div>
          <div className="absolute left-[44px] top-[206px] flex text-[11.5px] text-muted-foreground" style={{ width: 760 }}>
            <span style={{ width: winsW + lossW }}>Already decided. These stay as they are.</span>
            <span style={{ width: restW }} className="text-center">20 left</span>
          </div>

          <Reveal
            show={phase === 1}
            className="absolute rounded-lg border-2 px-3 py-2 text-center"
            style={{ left: 44 + winsW + lossW - 40, top: 76, borderColor: RED, background: "var(--background)" }}
          >
            <p className="font-mono text-[14px] font-semibold line-through" style={{ color: RED }}>
              +9 “owed” wins
            </p>
            <p className="text-[11px] text-muted-foreground">Not how it works</p>
          </Reveal>

          <Reveal show={phase >= 2} className="absolute bottom-6 left-6 right-6 flex items-center justify-between rounded-lg border border-border px-4 py-2.5">
            <span className="text-[13px] text-muted-foreground">Separate forecast: 60% × 20 remaining games</span>
            <span className="font-mono text-[14px] font-medium" style={{ color: BLUE }}>
              ≈ 12 expected wins
            </span>
          </Reveal>
        </Panel>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Exponent curves                                                         */
/* -------------------------------------------------------------------------- */

const CURVES = [
  { k: 1, label: "Exponent 1", note: "Same as share of runs", color: "#64748b" },
  { k: 1.83, label: "Exponent 1.83", note: "A baseball refinement", color: GREEN },
  { k: 2, label: "Exponent 2", note: "The teaching version", color: BLUE },
  { k: 6, label: "Exponent 6", note: "Illustrative only", color: "#a855f7" },
];

const W = 470;
const H = 280;
const X_MIN = 0.5;
const X_MAX = 2;
const x = (ratio: number) => ((ratio - X_MIN) / (X_MAX - X_MIN)) * W;
const y = (p: number) => H - p * H;

const CURVE_PATHS = CURVES.map((curve) => {
  const pts: string[] = [];
  for (let i = 0; i <= 80; i += 1) {
    const ratio = X_MIN + ((X_MAX - X_MIN) * i) / 80;
    pts.push(`${i ? "L" : "M"}${x(ratio).toFixed(1)},${y(pythagorean(ratio, 1, curve.k)).toFixed(1)}`);
  }
  return pts.join(" ");
});

export function ExponentCurvesAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([2400, 2400, 2400, 2800], rootRef, 2);
  const marker = 1.25;
  const paths = CURVE_PATHS;

  const active = CURVES[phase] || CURVES[2];
  const activeP = pythagorean(marker, 1, active.k);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Expected win percentage plotted against the ratio of runs scored to runs allowed, for exponents 1, 1.83, 2 and an illustrative 6. At the 500-to-400 ratio of 1.25, exponent 1 gives 55.6 percent, 1.83 gives about 60.1 percent, 2 gives 61.0 percent, and 6 gives about 79 percent."
      caption="Every curve passes 50% when scoring is equal. A larger exponent pushes the same scoring edge further from 50%. Exponent 6 is an illustration, not a fitted value for any sport."
    >
      <ScaledStage width={860} height={400}>
        <div className="grid h-full grid-cols-[1fr_270px] gap-4">
          <Panel className="relative p-5">
            <Eyebrow>Expected win % vs. runs scored ÷ runs allowed</Eyebrow>
            <svg className="absolute left-[56px] top-[52px] overflow-visible" width={W} height={H} aria-hidden>
              {[0, 0.25, 0.5, 0.75, 1].map((p) => (
                <g key={p}>
                  <line x1={0} x2={W} y1={y(p)} y2={y(p)} stroke="var(--border)" strokeDasharray={p === 0.5 ? undefined : "3 4"} />
                  <text x={-10} y={y(p) + 4} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
                    {p * 100}%
                  </text>
                </g>
              ))}
              {[0.5, 1, 1.25, 1.5, 2].map((r) => (
                <text key={r} x={x(r)} y={H + 18} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
                  {r.toFixed(r === 1.25 ? 2 : 1)}
                </text>
              ))}
              <line x1={x(marker)} x2={x(marker)} y1={0} y2={H} stroke={AMBER} strokeDasharray="4 4" opacity={0.7} />
              <text x={x(marker) + 6} y={14} fontSize={11} fill={AMBER}>
                500 ÷ 400
              </text>
              {CURVES.map((curve, index) => {
                const on = index === phase;
                return (
                  <path
                    key={curve.k}
                    d={paths[index]}
                    fill="none"
                    stroke={curve.color}
                    strokeWidth={on ? 3 : 1.5}
                    opacity={on ? 1 : 0.28}
                    style={{ transition: "opacity 400ms ease, stroke-width 400ms ease" }}
                  />
                );
              })}
              <circle
                cx={x(marker)}
                cy={y(activeP)}
                r={6}
                fill={active.color}
                stroke="white"
                strokeWidth={2}
                style={{ transition: `cy 700ms ${EASE}, fill 400ms ease` }}
              />
            </svg>
          </Panel>

          <Panel className="flex flex-col p-5">
            <Eyebrow>At 500 scored, 400 allowed</Eyebrow>
            <ul className="mt-3 space-y-2">
              {CURVES.map((curve, index) => {
                const on = index === phase;
                return (
                  <li
                    key={curve.k}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 transition-all duration-500"
                    style={{ borderColor: on ? curve.color : "var(--border)", background: on ? `${curve.color}12` : "transparent" }}
                  >
                    <span>
                      <span className="block text-[13px] font-medium text-foreground">{curve.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{curve.note}</span>
                    </span>
                    <span className="font-mono text-[15px] font-medium" style={{ color: on ? curve.color : "var(--muted-foreground)" }}>
                      {pct(pythagorean(500, 400, curve.k))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Three numbers                                                           */
/* -------------------------------------------------------------------------- */

const MATCHUP_FACTORS = ["Opponent", "Venue", "Injuries", "Rest", "Starting pitchers"];

export function ThreeNumbersAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([2000, 650, 650, 650, 650, 650, 3800], rootRef, 6);
  const done = phase >= 6;

  const cards = [
    { eyebrow: "Actual win %", value: "52%", note: "How often the team has won in the games observed", color: GREEN },
    { eyebrow: "Pythagorean win %", value: "61%", note: "What its scoring performance suggests", color: BLUE },
  ];

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Three cards. Actual win percentage, 52 percent. Pythagorean win percentage, 61 percent. Next-game win probability starts as a question mark, then takes in the opponent, venue, injuries, rest and starting pitchers before showing a separate 60 percent matchup estimate, which is the number that matches the contract's question."
      caption="Hypothetical numbers. Only the third answers “will the team win its next game?”, and it needs more than season scoring."
    >
      <ScaledStage width={860} height={380}>
        <div className="flex h-full flex-col gap-4">
          <div className="grid flex-1 grid-cols-3 gap-4">
            {cards.map((card) => (
              <Panel key={card.eyebrow} className="flex flex-col p-5">
                <Eyebrow>{card.eyebrow}</Eyebrow>
                <p className="mt-4 font-mono text-[52px] font-medium leading-none tracking-tight" style={{ color: card.color }}>
                  {card.value}
                </p>
                <p className="mt-auto text-[13px] leading-snug text-muted-foreground">{card.note}</p>
              </Panel>
            ))}
            <Panel
              className="flex flex-col p-5 transition-colors duration-500"
              style={{ borderColor: done ? AMBER : undefined }}
            >
              <Eyebrow>Next-game win probability</Eyebrow>
              <p
                key={done ? "done" : "pending"}
                className="pyth-anim mt-4 font-mono text-[52px] font-medium leading-none tracking-tight"
                style={{ color: done ? AMBER : "var(--muted-foreground)", animation: done ? "pyth-pop .4s both" : undefined }}
              >
                {done ? "60%" : "?"}
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {MATCHUP_FACTORS.map((factor, index) => {
                  const on = phase >= index + 1;
                  return (
                    <span
                      key={factor}
                      className="rounded-md border px-1.5 py-0.5 text-[10.5px] transition-all duration-300"
                      style={{
                        borderColor: on ? AMBER : "var(--border)",
                        color: on ? "var(--foreground)" : "var(--muted-foreground)",
                        opacity: on ? 1 : 0.5,
                      }}
                    >
                      {factor}
                    </span>
                  );
                })}
              </div>
              <p className="mt-auto pt-2 text-[12px] leading-snug text-muted-foreground">
                {done ? "From a separate matchup assessment" : "This opponent, today’s conditions"}
              </p>
            </Panel>
          </div>
          <Panel className="flex items-center justify-between px-5 py-3">
            <span className="text-[13px] text-muted-foreground">Contract: Will the team win its next game?</span>
            <Reveal show={done}>
              <span className="text-[13px] font-medium" style={{ color: AMBER }}>
                Matches the third number →
              </span>
            </Reveal>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. Probability vs. price                                                   */
/* -------------------------------------------------------------------------- */

export function ProbabilityVsPriceAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([2000, 2000, 1700, 1700, 4000], rootRef, 4);

  const lines = [
    { show: phase >= 2, text: "Win:  0.60 × $0.45 = $0.27" },
    { show: phase >= 3, text: "Loss: 0.40 × $0.55 = $0.22" },
  ];

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A hypothetical YES contract priced at 55 cents, implying about 55 percent. Your separate estimate is 60 percent. A payoff tree shows a 45 cent profit with 60 percent probability and a 55 cent loss with 40 percent probability, for an expected profit of 5 cents per contract before fees."
      caption="Hypothetical price and estimate, held to settlement, before fees. The 60% comes from a matchup assessment, not from the Pythagorean percentage."
    >
      <ScaledStage width={860} height={400}>
        <div className="grid h-full grid-cols-[340px_1fr] gap-4">
          <Panel className="flex flex-col p-5">
            <Eyebrow>Hypothetical contract</Eyebrow>
            <p className="mt-1 text-[17px] font-semibold leading-snug text-foreground">Will the team win its next game?</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-md px-3 py-1.5 font-mono text-[14px] font-medium text-white" style={{ background: GREEN }}>
                YES 55¢
              </span>
              <span className="text-[12px] text-muted-foreground">Pays $1 if the team wins</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border px-3 py-3">
                <p className="text-[11px] text-muted-foreground">Price implies</p>
                <p className="mt-1 font-mono text-[30px] font-medium leading-none text-foreground">55%</p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">55¢ ÷ $1 payout</p>
              </div>
              <Reveal show={phase >= 1} className="rounded-lg border px-3 py-3" style={{ borderColor: `${BLUE}88` }}>
                <p className="text-[11px] text-muted-foreground">Your estimate</p>
                <p className="mt-1 font-mono text-[30px] font-medium leading-none" style={{ color: BLUE }}>60%</p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">Matchup work</p>
              </Reveal>
            </div>
            <Reveal show={phase >= 1} className="mt-2 text-center font-mono text-[12px]" style={{ color: AMBER }}>
              Gap: +5 pts above the price
            </Reveal>

            <div className="relative mt-auto pb-10 pt-8">
              <div className="h-2 rounded-full bg-muted" />
              <div
                className="absolute top-8 h-2 rounded-full"
                style={{ left: "55%", width: phase >= 1 ? "5%" : "0%", background: `${AMBER}aa`, transition: `width 700ms ${EASE}` }}
              />
              {[
                { at: 55, label: "Market ≈ 55%", color: "var(--foreground)", show: true, above: true },
                { at: 60, label: "Your estimate 60%", color: BLUE, show: phase >= 1, above: false },
              ].map((m) => (
                <div
                  key={m.label}
                  className="absolute -translate-x-1/2 transition-opacity duration-500"
                  style={{ left: `${m.at}%`, top: m.above ? 0 : 30, opacity: m.show ? 1 : 0 }}
                >
                  {m.above ? (
                    <p className="whitespace-nowrap text-[11px] font-medium" style={{ color: m.color }}>{m.label}</p>
                  ) : null}
                  <span className="mx-auto mt-0.5 block h-4 w-0.5" style={{ background: m.color }} />
                  {!m.above ? (
                    <p className="whitespace-nowrap text-[11px] font-medium" style={{ color: m.color }}>{m.label}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="relative flex flex-col p-5">
            <Eyebrow>If you buy YES at 55¢ and hold to settlement</Eyebrow>
            <div className="relative mt-4 h-[150px]">
              <div className="absolute left-0 top-[57px] rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-foreground">
                Pay 55¢
              </div>
              <svg className="absolute left-[92px] top-0" width={110} height={150} aria-hidden>
                <path d="M0,75 C50,75 50,22 110,22" fill="none" stroke={GREEN} strokeWidth={2} />
                <path d="M0,75 C50,75 50,128 110,128" fill="none" stroke={RED} strokeWidth={2} />
              </svg>
              {[
                { top: 2, label: "Team wins", prob: "60%", value: "+45¢", color: GREEN },
                { top: 108, label: "Team loses", prob: "40%", value: "−55¢", color: RED },
              ].map((b) => (
                <div
                  key={b.label}
                  className="absolute left-[212px] flex w-[250px] items-center justify-between rounded-lg border px-3 py-2"
                  style={{ top: b.top, borderColor: b.color }}
                >
                  <span className="text-[13px] text-foreground">
                    {b.label} <span className="text-muted-foreground">· {b.prob}</span>
                  </span>
                  <span className="font-mono text-[14px] font-semibold" style={{ color: b.color }}>
                    {b.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1 font-mono text-[13.5px] text-foreground">
              {lines.map((line) => (
                <Reveal key={line.text} show={line.show}>
                  <p className="whitespace-pre">{line.text}</p>
                </Reveal>
              ))}
            </div>
            <Reveal show={phase >= 4} className="mt-auto">
              <div className="flex items-center justify-between rounded-lg px-4 py-2.5" style={{ background: `${BLUE}12` }}>
                <span className="text-[13px] text-foreground">Expected profit, before fees</span>
                <span className="font-mono text-[18px] font-semibold" style={{ color: BLUE }}>
                  +$0.05
                </span>
              </div>
            </Reveal>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 9. Same run differential, different estimate                               */
/* -------------------------------------------------------------------------- */

const DIFF_TEAMS = [
  { name: "Team X", rs: 500, ra: 400 },
  { name: "Team Y", rs: 900, ra: 800 },
];

export function SameDifferentialAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([2600, 3800], rootRef, 1);
  const unit = 300 / 900;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Two hypothetical teams with the same +100 run differential. Team X scores 500 and allows 400, for a Pythagorean estimate of 61.0 percent. Team Y scores 900 and allows 800, for 55.9 percent."
      caption="Same +100 differential. A 100-run edge is a bigger share of a 900-run total than of a 1,700-run total, so the estimates differ."
    >
      <ScaledStage width={860} height={300}>
        <div className="grid h-full grid-cols-2 gap-4">
          {DIFF_TEAMS.map((team) => {
            const p = pythagorean(team.rs, team.ra);
            return (
              <Panel key={team.name} className="flex flex-col p-5">
                <div className="flex items-center justify-between">
                  <Eyebrow>{team.name} · hypothetical</Eyebrow>
                  <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[12px] text-foreground">+100</span>
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    { label: "Scored", v: team.rs, color: BLUE },
                    { label: "Allowed", v: team.ra, color: RED },
                  ].map((bar) => (
                    <div key={bar.label} className="flex items-center gap-3">
                      <span className="w-14 text-[12px] text-muted-foreground">{bar.label}</span>
                      <div className="h-4 rounded-sm" style={{ width: bar.v * unit, background: bar.color, opacity: 0.85 }} />
                      <span className="font-mono text-[12px] text-foreground">{bar.v}</span>
                    </div>
                  ))}
                </div>
                <Reveal show={phase >= 1} className="mt-auto">
                  <p className="text-[12px] text-muted-foreground">Pythagorean estimate</p>
                  <p className="font-mono text-[34px] font-medium leading-none" style={{ color: BLUE }}>
                    {pct(p)}
                  </p>
                </Reveal>
              </Panel>
            );
          })}
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}
