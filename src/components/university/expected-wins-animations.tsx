"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from "react";

import { BLUE, GREEN, RED, useInView, useReducedMotion } from "@/components/sections/features/feature-kit";
import { EASE, GuideAnimationFigure, ScaledStage, useGuidePhases } from "@/components/content/guide-animations/guide-animation-kit";
import { AMBER, Eyebrow, Frames, Panel, Reveal, Slider, pct, pythagorean } from "@/components/university/pythagorean-animations";
import { cn } from "@/lib/utils";

const FRAMES = `
@keyframes avw-flash {
  0% { background: transparent; }
  35% { background: rgba(47,111,237,.16); }
  100% { background: transparent; }
}
@keyframes avw-drop {
  0% { opacity: 0; transform: translateY(-14px) scale(.5); }
  100% { opacity: 1; transform: none; }
}
.avw-dot { transform-box: fill-box; transform-origin: center; }
@media (prefers-reduced-motion: reduce) {
  .avw-anim { animation: none !important; }
}
`;

function AvwFrames() {
  return <style dangerouslySetInnerHTML={{ __html: FRAMES }} />;
}

/** Eases a number from 0 to `target` each time `restartKey` changes while `active`. */
function useCountUp(target: number, active: boolean, restartKey: unknown, ms = 900) {
  const [value, setValue] = useState(target);
  useEffect(() => {
    if (!active) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(target * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    setValue(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, restartKey, ms]);
  return value;
}

export function InteractiveFigure({
  caption,
  children,
  rootRef,
}: {
  caption: ReactNode;
  children: ReactNode;
  rootRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <figure ref={rootRef} data-article-bleed className="not-prose mx-auto my-8 w-full max-w-[48rem] font-sans sm:my-10">
      <div className="rounded-xl border border-border bg-muted/50 p-3 sm:p-5">{children}</div>
      <figcaption className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

export function PillButton({ onClick, children, active = false }: { onClick: () => void; children: ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared scatter plot pieces (values are percentages, e.g. 61 for 61%)       */
/* -------------------------------------------------------------------------- */

export type Scale = { min: number; max: number; size: number };

export const sx = (s: Scale, v: number) => ((v - s.min) / (s.max - s.min)) * s.size;
export const sy = (s: Scale, v: number) => s.size - sx(s, v);

function ticksFor(s: Scale, step: number) {
  const out: number[] = [];
  for (let v = s.min; v <= s.max + 1e-9; v += step) out.push(Math.round(v * 10) / 10);
  return out;
}

/** Grid, tick labels and axis titles. Draw inside a <g> translated to the plot's top-left corner. */
function ScatterAxes({
  scale,
  step,
  show = true,
  xTitle = "Pythagorean expected win %",
  yTitle = "Actual win %",
  fontSize = 11,
}: {
  scale: Scale;
  step: number;
  show?: boolean;
  xTitle?: string;
  yTitle?: string;
  fontSize?: number;
}) {
  const ticks = ticksFor(scale, step);
  return (
    <g style={{ opacity: show ? 1 : 0, transition: "opacity 600ms ease" }}>
      <rect x={0} y={0} width={scale.size} height={scale.size} fill="var(--background)" stroke="var(--border)" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={sx(scale, t)} x2={sx(scale, t)} y1={0} y2={scale.size} stroke="var(--border)" strokeDasharray="2 4" />
          <line x1={0} x2={scale.size} y1={sy(scale, t)} y2={sy(scale, t)} stroke="var(--border)" strokeDasharray="2 4" />
          <text x={sx(scale, t)} y={scale.size + fontSize + 6} textAnchor="middle" fontSize={fontSize} fill="var(--muted-foreground)">
            {t}%
          </text>
          <text x={-8} y={sy(scale, t) + fontSize / 3} textAnchor="end" fontSize={fontSize} fill="var(--muted-foreground)">
            {t}%
          </text>
        </g>
      ))}
      <text x={scale.size / 2} y={scale.size + fontSize * 2 + 16} textAnchor="middle" fontSize={fontSize + 1} fill="var(--foreground)">
        {xTitle} →
      </text>
      <text
        transform={`translate(${-fontSize * 3 - 12}, ${scale.size / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize={fontSize + 1}
        fill="var(--foreground)"
      >
        {yTitle} →
      </text>
    </g>
  );
}

function Diagonal({ scale, show = true, animate = false, color = "var(--foreground)" }: { scale: Scale; show?: boolean; animate?: boolean; color?: string }) {
  const length = Math.SQRT2 * scale.size;
  return (
    <line
      x1={0}
      y1={scale.size}
      x2={scale.size}
      y2={0}
      stroke={color}
      strokeWidth={1.75}
      strokeDasharray={length}
      strokeDashoffset={show ? 0 : length}
      style={{ transition: animate ? `stroke-dashoffset 1100ms ${EASE}` : undefined, opacity: show || animate ? 1 : 0 }}
    />
  );
}

function DiagonalLabel({ scale, show = true, fontSize = 10.5 }: { scale: Scale; show?: boolean; fontSize?: number }) {
  const at = scale.size * 0.8;
  return (
    <text
      transform={`translate(${at - 4}, ${scale.size - at - 6}) rotate(-45)`}
      textAnchor="middle"
      fontSize={fontSize}
      fill="var(--muted-foreground)"
      style={{ opacity: show ? 1 : 0, transition: "opacity 500ms ease" }}
    >
      actual = expected
    </text>
  );
}

/* -------------------------------------------------------------------------- */
/* Hypothetical league (162-game season)                                      */
/* -------------------------------------------------------------------------- */

export const SEASON_GAMES = 162;

export const LEAGUE = [
  { name: "Summit", rs: 820, ra: 640, w: 97 },
  { name: "Bayside", rs: 780, ra: 650, w: 93 },
  { name: "Redrock", rs: 760, ra: 700, w: 88 },
  { name: "Meadowbrook", rs: 720, ra: 660, w: 83 },
  { name: "Northgate", rs: 730, ra: 690, w: 82 },
  { name: "Lakeshore", rs: 710, ra: 700, w: 80 },
  { name: "Pinewood", rs: 680, ra: 680, w: 86 },
  { name: "Ironvale", rs: 690, ra: 720, w: 79 },
  { name: "Riverton", rs: 670, ra: 710, w: 72 },
  { name: "Highland", rs: 650, ra: 730, w: 75 },
  { name: "Coastline", rs: 640, ra: 760, w: 70 },
  { name: "Stonebridge", rs: 610, ra: 790, w: 66 },
].map((team) => {
  const p = pythagorean(team.rs, team.ra);
  const expWins = p * SEASON_GAMES;
  return {
    ...team,
    losses: SEASON_GAMES - team.w,
    exp: p * 100,
    act: (team.w / SEASON_GAMES) * 100,
    expWins,
    gap: team.w - expWins,
  };
});

export type LeagueTeam = (typeof LEAGUE)[number];

/** Least-squares line of actual on expected, in percentage points. */
export const FIT = (() => {
  const n = LEAGUE.length;
  const mx = LEAGUE.reduce((sum, t) => sum + t.exp, 0) / n;
  const my = LEAGUE.reduce((sum, t) => sum + t.act, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const t of LEAGUE) {
    sxy += (t.exp - mx) * (t.act - my);
    sxx += (t.exp - mx) ** 2;
  }
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
})();

const gapColor = (gap: number) => (Math.abs(gap) < 0.5 ? "var(--muted-foreground)" : gap > 0 ? GREEN : RED);

export function signed(value: number, digits = 1) {
  const fixed = Math.abs(value).toFixed(digits);
  if (Number(fixed) === 0) return (0).toFixed(digits);
  return `${value > 0 ? "+" : "−"}${fixed}`;
}

/* -------------------------------------------------------------------------- */
/* 1. Actual win percentage: tap games to flip them                           */
/* -------------------------------------------------------------------------- */

const START_SEASON = Array.from({ length: 100 }, (_, index) => index < 60);

export function WinPercentageGrid() {
  const rootRef = useRef<HTMLElement>(null);
  const inView = useInView(rootRef, 0.35);
  const reduced = useReducedMotion();
  const [entered, setEntered] = useState(false);
  const [games, setGames] = useState<boolean[]>(START_SEASON);
  const wins = games.filter(Boolean).length;
  const share = wins / games.length;

  useEffect(() => {
    if (inView) setEntered(true);
  }, [inView]);

  const flip = (index: number) => setGames((current) => current.map((won, i) => (i === index ? !won : won)));

  return (
    <InteractiveFigure
      rootRef={rootRef}
      caption="Starts at 60 wins in 100 games. Every win counts the same here, however large the margin."
    >
      <Frames />
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_15rem]">
        <Panel className="p-5">
          <Eyebrow>Tap a game to flip it</Eyebrow>
          <p className="mt-1 text-[15px] font-semibold text-foreground">100 games played</p>
          <div className="mt-4 grid grid-cols-10 gap-[6px]">
            {games.map((won, index) => (
              <button
                key={index}
                type="button"
                onClick={() => flip(index)}
                aria-pressed={won}
                aria-label={`Game ${index + 1}: ${won ? "win" : "loss"}`}
                className={cn(
                  "aspect-square w-full rounded-full transition-[background-color,transform] duration-200 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6fed]",
                  entered && !reduced && "pyth-anim",
                )}
                style={{
                  background: won ? GREEN : "transparent",
                  border: won ? "none" : "1.5px solid var(--border)",
                  animation: entered && !reduced ? `pyth-pop .3s ${EASE} ${index * 9}ms both` : undefined,
                }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: GREEN }} /> Win
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border border-border" /> Loss
            </span>
          </div>
        </Panel>

        <Panel className="flex flex-col p-5">
          <Eyebrow>Actual win %</Eyebrow>
          <p className="mt-1 font-mono text-[44px] font-medium leading-none tracking-tight" style={{ color: GREEN }} aria-live="polite">
            {pct(share, 0)}
          </p>
          <p className="mt-2 font-mono text-[13px] text-foreground">
            {wins}–{games.length - wins}
          </p>
          <div className="mt-4 rounded-lg border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Games won ÷ games played</p>
            <p className="font-mono text-[15px] font-medium text-foreground">
              {wins} ÷ {games.length} = {share.toFixed(2)}
            </p>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${share * 100}%`, background: GREEN, transition: `width 300ms ${EASE}` }} />
          </div>
          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            <PillButton onClick={() => setGames(START_SEASON)}>Reset to 60–40</PillButton>
            <PillButton onClick={() => setGames(Array.from({ length: 100 }, (_, i) => i % 2 === 0))}>50–50</PillButton>
          </div>
        </Panel>
      </div>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. A win is a win: 10–0 and 1–0                                            */
/* -------------------------------------------------------------------------- */

function Scoreboard({ label, score, shownScore, active }: { label: string; score: number; shownScore: number; active: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-[#0f172a] px-4 py-3 text-white shadow-inner">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">{label} · final</p>
      <div className="mt-2 space-y-1.5">
        {[
          { team: "Your team", value: active ? Math.round(shownScore) : score, lead: true },
          { team: "Opponent", value: 0, lead: false },
        ].map((row) => (
          <div key={row.team} className="flex items-center justify-between">
            <span className={cn("text-[14px]", row.lead ? "font-semibold" : "text-white/60")}>{row.team}</span>
            <span className="font-mono text-[26px] font-medium tabular-nums leading-none" style={{ color: row.lead ? "#fbbf24" : "rgba(255,255,255,.6)" }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarginBlindAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop, reduced } = useGuidePhases([2400, 2400, 4600], rootRef, 2);
  const bigScore = useCountUp(10, !reduced, loop, 1100);
  const smallScore = useCountUp(1, !reduced, loop, 500);
  const unit = 22;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Two final scoreboards: a 10–0 win and a 1–0 win. The margins are drawn as bars of 10 runs and 1 run. In the standings, each adds exactly one win."
      caption="One blowout, one squeaker. The standings record both as a single win."
    >
      <Frames />
      <ScaledStage width={860} height={360}>
        <div className="grid h-full grid-cols-[300px_1fr] gap-4">
          <Panel className="flex flex-col gap-3 p-5">
            <Eyebrow>Two games</Eyebrow>
            <Scoreboard label="Game 1" score={10} shownScore={bigScore} active={!reduced} />
            <Scoreboard label="Game 2" score={1} shownScore={smallScore} active={!reduced} />
          </Panel>

          <Panel className="flex flex-col p-5">
            <Eyebrow>What the margin says</Eyebrow>
            <div className="mt-3 space-y-2.5">
              {[
                { label: "Game 1", runs: 10 },
                { label: "Game 2", runs: 1 },
              ].map((game, index) => (
                <div key={game.label} className="flex items-center gap-3">
                  <span className="w-14 text-[12px] text-muted-foreground">{game.label}</span>
                  <div
                    className="h-5 rounded-[4px]"
                    style={{
                      width: phase >= 1 ? game.runs * unit : 0,
                      background: BLUE,
                      transition: `width 900ms ${EASE} ${index * 200}ms`,
                    }}
                  />
                  <Reveal show={phase >= 1}>
                    <span className="font-mono text-[13px] text-foreground">+{game.runs} {game.runs === 1 ? "run" : "runs"}</span>
                  </Reveal>
                </div>
              ))}
            </div>

            <Eyebrow className="mt-6">What the record says</Eyebrow>
            <div className="mt-3 flex items-center gap-3">
              {["Game 1", "Game 2"].map((game, index) => (
                <div key={game} className="flex items-center gap-3">
                  {index === 1 ? (
                    <Reveal show={phase >= 2}>
                      <span className="font-mono text-[22px] text-muted-foreground">=</span>
                    </Reveal>
                  ) : null}
                  <div
                    key={phase >= 2 ? `on-${loop}` : "off"}
                    className="pyth-anim flex flex-col items-center rounded-lg border px-4 py-2"
                    style={{
                      borderColor: phase >= 2 ? GREEN : "var(--border)",
                      opacity: phase >= 2 ? 1 : 0.25,
                      animation: phase >= 2 && !reduced ? `pyth-pop .4s ${EASE} ${index * 180}ms both` : undefined,
                    }}
                  >
                    <span className="font-mono text-[22px] font-semibold leading-none" style={{ color: GREEN }}>
                      W
                    </span>
                    <span className="mt-1 text-[11px] text-muted-foreground">1 win</span>
                  </div>
                </div>
              ))}
            </div>

            <Reveal show={phase >= 2} className="mt-auto rounded-lg px-4 py-2.5" style={{ background: `${AMBER}14` }}>
              <p className="text-[14px] font-medium text-foreground">The margin changes. The record treats them the same.</p>
            </Reveal>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Runs → expected % → expected wins                                       */
/* -------------------------------------------------------------------------- */

function Chevron({ on }: { on: boolean }) {
  return (
    <span
      className="grid size-7 place-items-center rounded-full border bg-background font-mono text-[13px] transition-colors duration-500"
      style={{ borderColor: on ? BLUE : "var(--border)", color: on ? BLUE : "var(--muted-foreground)" }}
    >
      →
    </span>
  );
}

export function ExpectedWinsAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop, reduced } = useGuidePhases([1800, 2600, 2600, 3000, 3600], rootRef, 4);

  const card = (on: boolean) => ({
    borderColor: on ? `${BLUE}88` : "var(--border)",
    transition: "border-color 500ms ease",
  });

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A three-step pipeline. Runs: 500 scored and 400 allowed over 100 games. Expected win percentage: 500 squared is 250,000, 400 squared is 160,000, and 250,000 divided by 410,000 is about 0.61, or 61 percent. Expected wins: 0.61 times 100 games is about 61 wins, shown as 61 filled dots out of 100."
      caption="The made-up team: 500 runs scored and 400 allowed over 100 games. Use the percentage as a decimal when you multiply."
    >
      <Frames />
      <ScaledStage width={860} height={400}>
        <div className="flex h-full flex-col gap-3">
          <div className="grid min-h-0 flex-1 grid-cols-[1fr_auto_1.15fr_auto_1fr] items-center gap-2">
            <Panel className="flex h-full flex-col p-4" style={card(true)}>
              <Eyebrow>1 · Runs</Eyebrow>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-[11.5px] text-muted-foreground">Runs scored</p>
                  <p className="font-mono text-[34px] font-medium leading-none" style={{ color: BLUE }}>500</p>
                </div>
                <div>
                  <p className="text-[11.5px] text-muted-foreground">Runs allowed</p>
                  <p className="font-mono text-[34px] font-medium leading-none" style={{ color: RED }}>400</p>
                </div>
                <div>
                  <p className="text-[11.5px] text-muted-foreground">Games played</p>
                  <p className="font-mono text-[22px] font-medium leading-none text-foreground">100</p>
                </div>
              </div>
            </Panel>
            <Chevron on={phase >= 1} />
            <Panel className="flex h-full flex-col p-4" style={card(phase >= 1)}>
              <Eyebrow>2 · Expected win %</Eyebrow>
              <div className="mt-4 space-y-2 font-mono text-[14px] text-foreground">
                <Reveal show={phase >= 1}>
                  <p>
                    <span style={{ color: BLUE }}>500²</span> = 250,000
                  </p>
                </Reveal>
                <Reveal show={phase >= 1} style={{ transitionDelay: phase >= 1 ? "350ms" : "0ms" }}>
                  <p>
                    <span style={{ color: RED }}>400²</span> = 160,000
                  </p>
                </Reveal>
                <Reveal show={phase >= 2}>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex flex-col items-center text-[13px]">
                      <span>250,000</span>
                      <span className="my-0.5 h-px w-full bg-foreground" />
                      <span>410,000</span>
                    </div>
                    <span>≈ 0.61</span>
                  </div>
                </Reveal>
              </div>
              <Reveal show={phase >= 2} className="mt-auto">
                <div className="flex h-5 overflow-hidden rounded-md">
                  <div style={{ width: phase >= 2 ? "61%" : "50%", background: BLUE, transition: `width 900ms ${EASE}` }} />
                  <div className="flex-1" style={{ background: `${RED}cc` }} />
                </div>
                <p className="mt-1.5 font-mono text-[22px] font-medium" style={{ color: BLUE }}>≈ 61%</p>
              </Reveal>
            </Panel>
            <Chevron on={phase >= 3} />
            <Panel className="flex h-full flex-col p-4" style={card(phase >= 3)}>
              <Eyebrow>3 · Expected wins</Eyebrow>
              <Reveal show={phase >= 3}>
                <p className="mt-2 font-mono text-[13px] text-foreground">0.61 × 100 games</p>
              </Reveal>
              <div className="mt-3 grid w-fit grid-cols-10 gap-[4px]">
                {Array.from({ length: 100 }, (_, index) => {
                  const on = phase >= 3 && index < 61;
                  return (
                    <span
                      key={`${loop}-${phase >= 3}-${index}`}
                      className={cn("size-[11px] rounded-full", on && "pyth-anim")}
                      style={{
                        background: on ? BLUE : "transparent",
                        border: on ? "none" : "1px solid var(--border)",
                        animation: on && !reduced ? `pyth-pop .25s ${EASE} ${index * 14}ms both` : undefined,
                      }}
                    />
                  );
                })}
              </div>
              <Reveal show={phase >= 3} className="mt-auto">
                <p className="font-mono text-[22px] font-medium" style={{ color: BLUE }}>≈ 61 wins</p>
              </Reveal>
            </Panel>
          </div>
          <Panel className="flex h-[52px] items-center justify-between px-5">
            <span className="text-[13px] text-muted-foreground">Runs → expected win % → expected wins</span>
            <Reveal show={phase >= 4}>
              <span className="text-[13px] font-medium text-foreground">Equal runs land at exactly 50%</span>
            </Reveal>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Interactive balance: score more, allow less                             */
/* -------------------------------------------------------------------------- */

const PIVOT = { x: 170, y: 90 };
const ARM = 110;
const GROUND = 214;
/** Degrees of tilt per unit of (expected % − 50%); keeps both pans inside the viewBox at the extremes. */
const TILT_PER_UNIT = 36;

function Pan({ x, y, radius, color, label }: { x: number; y: number; radius: number; color: string; label: string }) {
  return (
    <g style={{ transform: `translate(${x}px, ${y}px)`, transition: `transform 450ms ${EASE}` }}>
      <line x1={0} y1={0} x2={-26} y2={44} stroke="var(--muted-foreground)" strokeWidth={1} />
      <line x1={0} y1={0} x2={26} y2={44} stroke="var(--muted-foreground)" strokeWidth={1} />
      <path d="M-34,44 Q0,60 34,44 Z" fill="var(--muted)" stroke="var(--muted-foreground)" strokeWidth={1} />
      <circle cx={0} cy={44 - radius} r={radius} fill={color} opacity={0.88} style={{ transition: `r 300ms ${EASE}, cy 300ms ${EASE}` }} />
      <text x={0} y={74} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
        {label}
      </text>
    </g>
  );
}

export function RunBalanceExplorer() {
  const [rs, setRs] = useState(500);
  const [ra, setRa] = useState(400);
  const [games, setGames] = useState(100);

  const p = pythagorean(rs, ra);
  const expectedWins = p * games;
  const tilt = (p - 0.5) * TILT_PER_UNIT;
  const rad = (tilt * Math.PI) / 180;
  const left = { x: PIVOT.x - ARM * Math.cos(rad), y: PIVOT.y + ARM * Math.sin(rad) };
  const right = { x: PIVOT.x + ARM * Math.cos(rad), y: PIVOT.y - ARM * Math.sin(rad) };
  const weight = (runs: number) => (runs > 0 ? 5 + 17 * Math.sqrt(runs / 1000) : 0);

  const status =
    rs === ra
      ? { text: "Equal runs: exactly 50%", color: "var(--foreground)" }
      : rs > ra
        ? { text: "Scoring more than allowing: above 50%", color: GREEN }
        : { text: "Allowing more than scoring: below 50%", color: RED };

  return (
    <InteractiveFigure caption="Starts at the made-up team: 500 scored, 400 allowed, 100 games. Classic squared version.">
      <div className="grid gap-3 md:grid-cols-2">
        <Panel className="p-5">
          <Eyebrow>Score more, allow less</Eyebrow>
          <svg viewBox="0 36 340 186" className="mt-2 w-full" aria-hidden>
            <line x1={20} x2={320} y1={GROUND} y2={GROUND} stroke="var(--border)" />
            <path
              d={`M${PIVOT.x},${PIVOT.y} L${PIVOT.x - 22},${GROUND} L${PIVOT.x + 22},${GROUND} Z`}
              fill="var(--muted)"
              stroke="var(--muted-foreground)"
              strokeWidth={1}
            />
            <g style={{ transform: `rotate(${-tilt}deg)`, transformOrigin: `${PIVOT.x}px ${PIVOT.y}px`, transition: `transform 450ms ${EASE}` }}>
              <rect x={PIVOT.x - ARM - 4} y={PIVOT.y - 3} width={ARM * 2 + 8} height={6} rx={3} fill="var(--foreground)" />
            </g>
            <circle cx={PIVOT.x} cy={PIVOT.y} r={5} fill="var(--background)" stroke="var(--foreground)" strokeWidth={2} />
            <Pan x={left.x} y={left.y} radius={weight(rs)} color={BLUE} label={`Scored ${rs}`} />
            <Pan x={right.x} y={right.y} radius={weight(ra)} color={RED} label={`Allowed ${ra}`} />
          </svg>
          <div className="mt-2 space-y-3">
            <Slider label="Runs scored" value={rs} min={0} max={1000} step={10} onChange={setRs} />
            <Slider label="Runs allowed" value={ra} min={0} max={1000} step={10} onChange={setRa} color={RED} />
            <Slider label="Games played" value={games} min={1} max={162} onChange={setGames} color="#64748b" />
          </div>
        </Panel>

        <Panel className="flex flex-col p-5">
          <Eyebrow>Expected win %</Eyebrow>
          <p className="mt-1 font-mono text-[44px] font-medium leading-none tracking-tight" style={{ color: BLUE }} aria-live="polite">
            {pct(p)}
          </p>
          <p className="mt-2 text-[13px] text-muted-foreground">
            ≈ <span className="font-mono font-medium text-foreground">{expectedWins.toFixed(1)}</span> expected wins in {games}{" "}
            {games === 1 ? "game" : "games"}
          </p>

          <div className="mt-4 rounded-lg border border-border px-3 py-2 font-mono text-[12.5px] text-foreground">
            {rs}² ÷ ({rs}² + {ra}²) = {p.toFixed(3)}
          </div>
          <div className="mt-2 rounded-lg border border-border px-3 py-2 font-mono text-[12.5px] text-foreground">
            {p.toFixed(3)} × {games} = {expectedWins.toFixed(1)} wins
          </div>

          <p className="mt-4 rounded-lg px-3 py-2 text-[13px] font-medium" style={{ color: status.color, background: "var(--muted)" }}>
            {status.text}
          </p>

          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            <PillButton onClick={() => setRa(rs)}>Make them equal</PillButton>
            <PillButton
              onClick={() => {
                setRs(500);
                setRa(400);
                setGames(100);
              }}
            >
              Reset
            </PillButton>
          </div>
        </Panel>
      </div>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Building the scatter plot                                               */
/* -------------------------------------------------------------------------- */

const SETUP: Scale = { min: 40, max: 70, size: 336 };
const EXAMPLE = { exp: 60.98, act: 60 };

export function ScatterSetupAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop, reduced } = useGuidePhases([1800, 2400, 2200, 2200, 3200], rootRef, 4);
  const dx = sx(SETUP, EXAMPLE.exp);
  const dy = sy(SETUP, EXAMPLE.act);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A scatter plot with Pythagorean expected win percentage on the horizontal axis and actual win percentage on the vertical axis, both from 40 to 70 percent. The example team's dot sits at about 61 percent across and 60 percent up. Moving right means a higher estimate; moving up means a higher actual win percentage."
      caption="Same scale on both axes. Each dot is one team's season; here there is only our example team."
    >
      <AvwFrames />
      <ScaledStage width={860} height={420}>
        <div className="grid h-full grid-cols-[1fr_280px] gap-4">
          <Panel className="relative">
            <svg className="absolute left-[104px] top-[18px] overflow-visible" width={SETUP.size} height={SETUP.size} aria-hidden>
              <defs>
                <marker id="avw-arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill={BLUE} />
                </marker>
                <marker id="avw-arrow-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill={GREEN} />
                </marker>
              </defs>
              <ScatterAxes scale={SETUP} step={10} />
              <g style={{ opacity: phase >= 1 ? 1 : 0, transition: "opacity 500ms ease" }}>
                <line x1={dx} x2={dx} y1={SETUP.size} y2={dy} stroke={BLUE} strokeDasharray="4 4" />
                <line x1={0} x2={dx} y1={dy} y2={dy} stroke={GREEN} strokeDasharray="4 4" />
                <text x={dx} y={SETUP.size - 6} textAnchor="middle" fontSize={11} fill={BLUE} fontWeight={600}>
                  ≈ 61%
                </text>
                <text x={6} y={dy - 6} fontSize={11} fill={GREEN} fontWeight={600}>
                  60%
                </text>
              </g>
              <g style={{ opacity: phase >= 2 ? 1 : 0, transition: "opacity 500ms ease" }}>
                <line x1={dx + 14} x2={dx + 80} y1={dy + 40} y2={dy + 40} stroke={BLUE} strokeWidth={2.5} markerEnd="url(#avw-arrow-blue)" />
                <text x={dx + 14} y={dy + 58} fontSize={11.5} fill={BLUE} fontWeight={600}>
                  estimate higher
                </text>
              </g>
              <g style={{ opacity: phase >= 3 ? 1 : 0, transition: "opacity 500ms ease" }}>
                <line x1={dx - 40} x2={dx - 40} y1={dy - 14} y2={dy - 80} stroke={GREEN} strokeWidth={2.5} markerEnd="url(#avw-arrow-green)" />
                <text x={dx - 48} y={dy - 60} textAnchor="end" fontSize={11.5} fill={GREEN} fontWeight={600}>
                  actual higher
                </text>
              </g>
              {phase >= 1 ? (
                <circle
                  key={`dot-${loop}`}
                  className="avw-dot avw-anim"
                  cx={dx}
                  cy={dy}
                  r={8}
                  fill={BLUE}
                  stroke="white"
                  strokeWidth={2.5}
                  style={{ animation: reduced ? undefined : `avw-drop .6s ${EASE} .25s both` }}
                />
              ) : null}
            </svg>
          </Panel>

          <Panel className="flex flex-col p-5">
            <Eyebrow>One team, two numbers</Eyebrow>
            <p className="mt-1 text-[15px] font-semibold text-foreground">Example team · 100 games</p>
            <div className="mt-4 space-y-2">
              {[
                { label: "Pythagorean estimate", sub: "Across", value: "≈ 61%", color: BLUE, on: phase >= 2 || phase === 1 },
                { label: "Actual win %", sub: "Up", value: "60%", color: GREEN, on: phase >= 3 || phase === 1 },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5 transition-all duration-500"
                  style={{ borderColor: row.on ? row.color : "var(--border)", background: row.on ? `${row.color}10` : "transparent" }}
                >
                  <span>
                    <span className="block text-[13px] font-medium text-foreground">{row.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{row.sub}</span>
                  </span>
                  <span className="font-mono text-[18px] font-medium" style={{ color: row.color }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-auto text-[12.5px] leading-snug text-muted-foreground">
              Move right and the scoring-based estimate gets higher. Move up and the actual win percentage gets higher.
            </p>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Drag a dot around the diagonal                                          */
/* -------------------------------------------------------------------------- */

const GAP_PLOT: Scale = { min: 40, max: 70, size: 320 };
const GAP_MARGIN = { left: 62, top: 14 };

const clampPct = (v: number) => Math.min(GAP_PLOT.max, Math.max(GAP_PLOT.min, Math.round(v * 10) / 10));

export function GapExplorer() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [point, setPoint] = useState(EXAMPLE);
  const [dragging, setDragging] = useState(false);
  const [games, setGames] = useState(100);

  const gap = point.act - point.exp;
  const winGap = (gap / 100) * games;
  const onLine = Math.abs(gap) < 0.25;
  const verdict = onLine
    ? { text: "On the line: the record matches the scoring-based estimate.", color: "var(--foreground)" }
    : gap > 0
      ? { text: "Above the line: the team won more than the formula estimated.", color: GREEN }
      : { text: "Below the line: the team won fewer than the formula estimated.", color: RED };

  const moveTo = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const px = local.x - GAP_MARGIN.left;
    const py = local.y - GAP_MARGIN.top;
    const span = GAP_PLOT.max - GAP_PLOT.min;
    setPoint({
      exp: clampPct(GAP_PLOT.min + (px / GAP_PLOT.size) * span),
      act: clampPct(GAP_PLOT.min + ((GAP_PLOT.size - py) / GAP_PLOT.size) * span),
    });
  };

  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const step = event.shiftKey ? 2 : 0.5;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setPoint((current) => ({ exp: clampPct(current.exp + move[0]), act: clampPct(current.act + move[1]) }));
  };

  const dx = sx(GAP_PLOT, point.exp);
  const dy = sy(GAP_PLOT, point.act);
  const lineY = sy(GAP_PLOT, point.exp);
  const s = GAP_PLOT.size;

  return (
    <InteractiveFigure caption="Drag the dot, or focus it and use the arrow keys. The dashed amber line is the vertical gap between actual and expected.">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
        <Panel className="p-3 sm:p-4">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${GAP_MARGIN.left + s + 16} ${GAP_MARGIN.top + s + 58}`}
            className={cn("w-full touch-none select-none", dragging ? "cursor-grabbing" : "cursor-crosshair")}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragging(true);
              moveTo(event);
            }}
            onPointerMove={(event) => {
              if (dragging) moveTo(event);
            }}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
          >
            <g transform={`translate(${GAP_MARGIN.left}, ${GAP_MARGIN.top})`}>
              <ScatterAxes scale={GAP_PLOT} step={5} fontSize={10} />
              <path d={`M0,0 L0,${s} L${s},0 Z`} fill={GREEN} opacity={0.07} />
              <path d={`M0,${s} L${s},${s} L${s},0 Z`} fill={RED} opacity={0.07} />
              <text x={12} y={22} fontSize={11} fill={GREEN} fontWeight={600}>
                Won more than estimated
              </text>
              <text x={s - 12} y={s - 12} textAnchor="end" fontSize={11} fill={RED} fontWeight={600}>
                Won fewer than estimated
              </text>
              <Diagonal scale={GAP_PLOT} />
              <DiagonalLabel scale={GAP_PLOT} />
              {!onLine ? (
                <>
                  <line x1={dx} x2={dx} y1={dy} y2={lineY} stroke={AMBER} strokeWidth={2} strokeDasharray="4 3" />
                  <text
                    x={point.exp > 63 ? dx - 14 : dx + 14}
                    y={(dy + lineY) / 2 + 4}
                    textAnchor={point.exp > 63 ? "end" : "start"}
                    fontSize={11.5}
                    fontWeight={700}
                    fill={AMBER}
                    pointerEvents="none"
                  >
                    {signed(gap)} pts
                  </text>
                </>
              ) : null}
              <g
                role="slider"
                tabIndex={0}
                aria-label="Team dot"
                aria-valuetext={`Expected ${point.exp.toFixed(1)}%, actual ${point.act.toFixed(1)}%`}
                onKeyDown={onKeyDown}
                className="cursor-grab outline-none [&:focus-visible>circle:first-child]:opacity-100"
              >
                <circle cx={dx} cy={dy} r={13} fill="none" stroke={BLUE} strokeWidth={2} opacity={0} />
                <circle cx={dx} cy={dy} r={7} fill={BLUE} stroke="white" strokeWidth={2} />
              </g>
            </g>
          </svg>
        </Panel>

        <Panel className="flex flex-col p-5">
          <Eyebrow>Where is the dot?</Eyebrow>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Expected (across)</p>
              <p className="font-mono text-[17px] font-medium" style={{ color: BLUE }}>{point.exp.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Actual (up)</p>
              <p className="font-mono text-[17px] font-medium" style={{ color: GREEN }}>{point.act.toFixed(1)}%</p>
            </div>
          </div>
          <div className="mt-3 rounded-lg border px-3 py-2" style={{ borderColor: onLine ? "var(--border)" : AMBER }}>
            <p className="text-[11px] text-muted-foreground">Vertical gap (actual − expected)</p>
            <p className="font-mono text-[20px] font-medium" style={{ color: onLine ? "var(--foreground)" : AMBER }} aria-live="polite">
              {signed(gap)} pts
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <span className="font-mono font-medium text-foreground">
                ≈ {signed(winGap)} {Math.abs(winGap) >= 0.95 && Math.abs(winGap) < 1.05 ? "win" : "wins"}
              </span>
              over
              {[100, 162].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setGames(n)}
                  aria-pressed={games === n}
                  className={cn(
                    "rounded px-1.5 py-0.5 font-mono transition-colors",
                    games === n ? "bg-foreground text-background" : "hover:text-foreground",
                  )}
                >
                  {n}
                </button>
              ))}
              games
            </div>
          </div>
          <p className="mt-3 text-[13px] font-medium leading-snug" style={{ color: verdict.color }}>
            {verdict.text}
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <PillButton onClick={() => setPoint(EXAMPLE)}>Example team</PillButton>
            <PillButton onClick={() => setPoint({ exp: 55, act: 55 })}>On the line</PillButton>
            <PillButton onClick={() => setPoint({ exp: 52, act: 58 })}>Above</PillButton>
            <PillButton onClick={() => setPoint({ exp: 64, act: 57 })}>Below</PillButton>
          </div>
        </Panel>
      </div>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Table to scatter                                                        */
/* -------------------------------------------------------------------------- */

const LEAGUE_PLOT: Scale = { min: 35, max: 65, size: 300 };

export function TableToScatterAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop, reduced } = useGuidePhases([1800, 3800, 2400, 3800], rootRef, 3);
  const stagger = 240;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A table of twelve hypothetical teams with expected and actual win percentages. Each row becomes a dot on the scatter plot. A diagonal line marks where the two percentages are equal; most dots sit close to it, some above and some below."
      caption="Hypothetical 12-team league over a 162-game season. The diagonal is drawn by us, not fitted to the dots."
    >
      <AvwFrames />
      <ScaledStage width={860} height={430}>
        <div className="grid h-full grid-cols-[300px_1fr] gap-4">
          <Panel className="flex flex-col p-4">
            <Eyebrow>The table</Eyebrow>
            <div className="mt-2 grid grid-cols-[1fr_64px_64px] border-b border-border pb-1 text-[11px] text-muted-foreground">
              <span>Team</span>
              <span className="text-right">Expected</span>
              <span className="text-right">Actual</span>
            </div>
            {LEAGUE.map((team, index) => (
              <div
                key={`${team.name}-${phase >= 1 ? loop : "idle"}`}
                className="avw-anim grid grid-cols-[1fr_64px_64px] rounded px-1 py-[3px] text-[12.5px]"
                style={{ animation: phase >= 1 && !reduced ? `avw-flash 900ms ease ${index * stagger}ms both` : undefined }}
              >
                <span className="text-foreground">{team.name}</span>
                <span className="text-right font-mono" style={{ color: BLUE }}>{team.exp.toFixed(1)}%</span>
                <span
                  className="text-right font-mono transition-colors duration-500"
                  style={{ color: phase >= 3 ? gapColor(team.gap) : GREEN }}
                >
                  {team.act.toFixed(1)}%
                </span>
              </div>
            ))}
          </Panel>

          <Panel className="relative">
            <svg className="absolute left-[118px] top-[24px] overflow-visible" width={LEAGUE_PLOT.size} height={LEAGUE_PLOT.size} aria-hidden>
              <ScatterAxes scale={LEAGUE_PLOT} step={5} />
              <Diagonal scale={LEAGUE_PLOT} show={phase >= 2} animate={!reduced} />
              {LEAGUE.map((team, index) =>
                phase >= 1 ? (
                  <circle
                    key={`${team.name}-${loop}`}
                    className="avw-dot avw-anim"
                    cx={sx(LEAGUE_PLOT, team.exp)}
                    cy={sy(LEAGUE_PLOT, team.act)}
                    r={6}
                    fill={phase >= 3 ? gapColor(team.gap) : BLUE}
                    stroke="white"
                    strokeWidth={1.5}
                    style={{
                      animation: reduced ? undefined : `avw-drop .5s ${EASE} ${index * stagger + 120}ms both`,
                      transition: "fill 500ms ease",
                    }}
                  />
                ) : null,
              )}
            </svg>
            <Reveal show={phase >= 3} className="absolute bottom-4 left-5 right-5 flex items-center justify-center gap-5 text-[12px]">
              <span className="flex items-center gap-1.5 text-foreground">
                <span className="h-0.5 w-4 bg-foreground" /> Actual = expected
              </span>
              <span className="flex items-center gap-1.5 text-foreground">
                <span className="size-2.5 rounded-full" style={{ background: GREEN }} /> Above the line
              </span>
              <span className="flex items-center gap-1.5 text-foreground">
                <span className="size-2.5 rounded-full" style={{ background: RED }} /> Below the line
              </span>
            </Reveal>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. Explore the league                                                      */
/* -------------------------------------------------------------------------- */

const EXPLORE_PLOT: Scale = { min: 35, max: 65, size: 320 };

function TeamDetail({ team }: { team: LeagueTeam }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-[16px] font-semibold text-foreground">{team.name}</p>
        <p className="font-mono text-[13px] text-foreground">
          {team.w}–{team.losses}
        </p>
      </div>
      <p className="font-mono text-[12px] text-muted-foreground">
        {team.rs} scored · {team.ra} allowed
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border px-2.5 py-1.5">
          <p className="text-[10.5px] text-muted-foreground">Expected</p>
          <p className="font-mono text-[15px] font-medium" style={{ color: BLUE }}>
            {team.exp.toFixed(1)}%
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">{team.expWins.toFixed(1)} wins</p>
        </div>
        <div className="rounded-lg border border-border px-2.5 py-1.5">
          <p className="text-[10.5px] text-muted-foreground">Actual</p>
          <p className="font-mono text-[15px] font-medium" style={{ color: GREEN }}>
            {team.act.toFixed(1)}%
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">{team.w} wins</p>
        </div>
      </div>
      <p className="font-mono text-[13px] font-medium" style={{ color: gapColor(team.gap) }}>
        Gap {signed(team.gap)} wins {Math.abs(team.gap) < 0.5 ? "(on the line)" : team.gap > 0 ? "(above)" : "(below)"}
      </p>
    </div>
  );
}

export function LeagueScatterExplorer() {
  const [selected, setSelected] = useState("Pinewood");
  const [showDiagonal, setShowDiagonal] = useState(true);
  const [showGaps, setShowGaps] = useState(false);
  const [colorBySide, setColorBySide] = useState(true);
  const team = LEAGUE.find((t) => t.name === selected) ?? LEAGUE[0];
  const biggest = [...LEAGUE].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 4);
  const s = EXPLORE_PLOT.size;
  const margin = { left: 62, top: 14 };

  return (
    <InteractiveFigure caption="Hypothetical 12-team league, 162-game season. Hover or tap a dot; toggle the diagonal and the gaps.">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
        <Panel className="p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap gap-2">
            <PillButton active={showDiagonal} onClick={() => setShowDiagonal((v) => !v)}>
              Diagonal
            </PillButton>
            <PillButton active={showGaps} onClick={() => setShowGaps((v) => !v)}>
              Gaps
            </PillButton>
            <PillButton active={colorBySide} onClick={() => setColorBySide((v) => !v)}>
              Above / below
            </PillButton>
          </div>
          <svg viewBox={`0 0 ${margin.left + s + 16} ${margin.top + s + 58}`} className="w-full select-none">
            <g transform={`translate(${margin.left}, ${margin.top})`}>
              <ScatterAxes scale={EXPLORE_PLOT} step={5} fontSize={10} />
              <g style={{ opacity: showDiagonal ? 1 : 0, transition: "opacity 400ms ease" }}>
                <Diagonal scale={EXPLORE_PLOT} />
              </g>
              {LEAGUE.map((t) => {
                const cx = sx(EXPLORE_PLOT, t.exp);
                const cy = sy(EXPLORE_PLOT, t.act);
                const on = t.name === team.name;
                const color = colorBySide ? gapColor(t.gap) : BLUE;
                return (
                  <g key={t.name}>
                    <line
                      x1={cx}
                      x2={cx}
                      y1={cy}
                      y2={sy(EXPLORE_PLOT, t.exp)}
                      stroke={AMBER}
                      strokeWidth={on ? 2.5 : 1.5}
                      strokeDasharray="3 3"
                      style={{ opacity: showGaps || on ? 1 : 0, transition: "opacity 300ms ease" }}
                    />
                    <g
                      role="button"
                      tabIndex={0}
                      aria-label={`${t.name}: expected ${t.exp.toFixed(1)}%, actual ${t.act.toFixed(1)}%`}
                      aria-pressed={on}
                      className="cursor-pointer outline-none"
                      onMouseEnter={() => setSelected(t.name)}
                      onFocus={() => setSelected(t.name)}
                      onClick={() => setSelected(t.name)}
                    >
                      <circle cx={cx} cy={cy} r={14} fill="transparent" />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={on ? 9 : 6.5}
                        fill={color}
                        stroke={on ? "var(--foreground)" : "white"}
                        strokeWidth={on ? 2.5 : 1.5}
                        style={{ transition: "r 200ms ease, fill 300ms ease" }}
                      />
                    </g>
                    {on ? (
                      <text
                        x={cx + (t.exp > 58 ? -14 : 14)}
                        y={cy - 12}
                        textAnchor={t.exp > 58 ? "end" : "start"}
                        fontSize={11.5}
                        fontWeight={600}
                        fill="var(--foreground)"
                        pointerEvents="none"
                      >
                        {t.name}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </g>
          </svg>
        </Panel>

        <Panel className="flex flex-col p-5">
          <Eyebrow>Selected team</Eyebrow>
          <div className="mt-2" aria-live="polite">
            <TeamDetail team={team} />
          </div>
          <Eyebrow className="mt-5">Biggest gaps</Eyebrow>
          <ul className="mt-2 space-y-1">
            {biggest.map((t) => (
              <li key={t.name}>
                <button
                  type="button"
                  onClick={() => setSelected(t.name)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[12.5px] transition-colors",
                    t.name === team.name ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{t.name}</span>
                  <span className="font-mono" style={{ color: gapColor(t.gap) }}>
                    {signed(t.gap)} W
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-auto pt-4 text-[11.5px] leading-snug text-muted-foreground">
            A gap is something to investigate. It doesn&apos;t explain itself, and it isn&apos;t a forecast.
          </p>
        </Panel>
      </div>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 9. Drawn, not fitted                                                       */
/* -------------------------------------------------------------------------- */

const TEASER_PLOT: Scale = { min: 35, max: 65, size: 280 };

export function DrawnNotFittedAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, reduced } = useGuidePhases([1600, 2600, 3000, 3200], rootRef, 3);
  const s = TEASER_PLOT.size;
  const fitY = (x: number) => FIT.slope * x + FIT.intercept;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="The league's dots with two lines. A solid diagonal drawn by us marks where expected and actual are equal. A dashed line fitted to the dots appears with a question mark: fitting that line is linear regression, the next lesson."
      caption="The solid diagonal is our reference. The dashed line is a preview of what fitting to the data looks like; that comes next."
    >
      <AvwFrames />
      <ScaledStage width={860} height={370}>
        <div className="grid h-full grid-cols-[1fr_300px] gap-4">
          <Panel className="relative">
            <svg className="absolute left-[106px] top-[22px] overflow-visible" width={s} height={s} aria-hidden>
              <ScatterAxes scale={TEASER_PLOT} step={10} fontSize={10.5} />
              {LEAGUE.map((t) => (
                <circle key={t.name} cx={sx(TEASER_PLOT, t.exp)} cy={sy(TEASER_PLOT, t.act)} r={5} fill="#64748b" opacity={0.75} />
              ))}
              <Diagonal scale={TEASER_PLOT} show={phase >= 1} animate={!reduced} />
              <line
                x1={0}
                y1={sy(TEASER_PLOT, fitY(TEASER_PLOT.min))}
                x2={s}
                y2={sy(TEASER_PLOT, fitY(TEASER_PLOT.max))}
                stroke={AMBER}
                strokeWidth={2.25}
                strokeDasharray="7 5"
                style={{ opacity: phase >= 2 ? 1 : 0, transition: "opacity 700ms ease" }}
              />
              <g style={{ opacity: phase >= 2 ? 1 : 0, transition: "opacity 700ms ease 300ms" }}>
                <circle cx={s - 34} cy={sy(TEASER_PLOT, fitY(61)) + 26} r={11} fill={AMBER} />
                <text x={s - 34} y={sy(TEASER_PLOT, fitY(61)) + 30.5} textAnchor="middle" fontSize={13} fontWeight={700} fill="white">
                  ?
                </text>
              </g>
            </svg>
          </Panel>

          <Panel className="flex flex-col gap-3 p-5">
            <Eyebrow>Two kinds of line</Eyebrow>
            <div
              className="rounded-lg border px-3 py-2.5 transition-all duration-500"
              style={{ borderColor: phase >= 1 ? "var(--foreground)" : "var(--border)", opacity: phase >= 1 ? 1 : 0.45 }}
            >
              <p className="flex items-center gap-2 text-[13.5px] font-semibold text-foreground">
                <span className="h-0.5 w-6 bg-foreground" /> The diagonal
              </p>
              <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                We drew it before looking at the dots. It marks where the two percentages are equal.
              </p>
            </div>
            <div
              className="rounded-lg border px-3 py-2.5 transition-all duration-500"
              style={{ borderColor: phase >= 2 ? AMBER : "var(--border)", opacity: phase >= 2 ? 1 : 0.45 }}
            >
              <p className="flex items-center gap-2 text-[13.5px] font-semibold text-foreground">
                <span className="w-6 border-t-2 border-dashed" style={{ borderColor: AMBER }} /> A fitted line
              </p>
              <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                The data decides its slope and position. Quantifying the relationship this way is linear regression.
              </p>
            </div>
            <Reveal show={phase >= 3} className="mt-auto rounded-lg px-3 py-2.5" style={{ background: `${BLUE}12` }}>
              <a href="/university/linear-regression" className="text-[13px] font-medium hover:underline" style={{ color: BLUE }}>
                Next lesson: linear regression →
              </a>
            </Reveal>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}
