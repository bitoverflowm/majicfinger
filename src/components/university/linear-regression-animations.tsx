"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

import { BLUE, GREEN, RED } from "@/components/sections/features/feature-kit";
import { EASE, GuideAnimationFigure, ScaledStage, useGuidePhases } from "@/components/content/guide-animations/guide-animation-kit";
import { FIT, InteractiveFigure, LEAGUE, PillButton, signed, sx, sy, type Scale } from "@/components/university/expected-wins-animations";
import { AMBER, Eyebrow, Frames, Panel, Reveal } from "@/components/university/pythagorean-animations";
import { cn } from "@/lib/utils";

const VIOLET = "#7c3aed";
const SLATE = "#64748b";

const FRAMES = `
@keyframes lr-drop {
  0% { opacity: 0; transform: translateY(-14px) scale(.5); }
  100% { opacity: 1; transform: none; }
}
@keyframes lr-rise {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: none; }
}
.lr-dot { transform-box: fill-box; transform-origin: center; }
@media (prefers-reduced-motion: reduce) {
  .lr-anim { animation: none !important; }
}
`;

function LrFrames() {
  return <style dangerouslySetInnerHTML={{ __html: FRAMES }} />;
}

/* -------------------------------------------------------------------------- */
/* Shared pieces (plot values are percentages, e.g. 59 for 59%)               */
/* -------------------------------------------------------------------------- */

/** The lesson's made-up line, in percentage points: 0.05 + 0.90 × x. */
const EXAMPLE_LINE = { a: 5, b: 0.9 };
const EXAMPLE_X = 60;

const fitAt = (x: number) => FIT.intercept + FIT.slope * x;
const MEAN = {
  x: LEAGUE.reduce((sum, t) => sum + t.exp, 0) / LEAGUE.length,
  y: LEAGUE.reduce((sum, t) => sum + t.act, 0) / LEAGUE.length,
};

function sumSquares(points: readonly { exp: number; act: number }[], a: number, b: number) {
  return points.reduce((sum, p) => sum + (p.act - (a + b * p.exp)) ** 2, 0);
}

function rms(points: readonly { exp: number; act: number }[], a: number, b: number) {
  return Math.sqrt(sumSquares(points, a, b) / points.length);
}

const LEAGUE_SSE = sumSquares(LEAGUE, FIT.intercept, FIT.slope);

/** Percentage points → decimal string, dropping a trailing third-place zero (59 → "0.59", 59.5 → "0.595"). */
const dec = (points: number) => (points / 100).toFixed(3).replace(/(\.\d\d)0$/, "$1");

const sideColor = (residual: number) => (Math.abs(residual) < 0.25 ? "var(--muted-foreground)" : residual > 0 ? GREEN : RED);

/** Eases toward `target` whenever it changes; jumps straight there when disabled. */
function useTween(target: number, enabled: boolean, ms = 900) {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    if (!enabled) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    if (from === target) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const next = from + (target - from) * (1 - (1 - t) ** 3);
      current.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled, ms]);
  return value;
}

/** Grid, tick labels and axis titles; ticks land on multiples of `step`. Draw inside a <g> at the plot's top-left. */
function Axes({
  scale,
  step,
  fontSize = 11,
  xTitle = "Pythagorean expectation",
  yTitle = "Actual win %",
}: {
  scale: Scale;
  step: number;
  fontSize?: number;
  xTitle?: string;
  yTitle?: string;
}) {
  const s = scale.size;
  const ticks: number[] = [];
  for (let v = Math.ceil(scale.min / step - 1e-9) * step; v <= scale.max + 1e-9; v += step) ticks.push(Math.round(v * 10) / 10);
  return (
    <g>
      <rect x={0} y={0} width={s} height={s} fill="var(--background)" stroke="var(--border)" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={sx(scale, t)} x2={sx(scale, t)} y1={0} y2={s} stroke="var(--border)" strokeDasharray="2 4" />
          <line x1={0} x2={s} y1={sy(scale, t)} y2={sy(scale, t)} stroke="var(--border)" strokeDasharray="2 4" />
          <text x={sx(scale, t)} y={s + fontSize + 6} textAnchor="middle" fontSize={fontSize} fill="var(--muted-foreground)">
            {t}%
          </text>
          <text x={-8} y={sy(scale, t) + fontSize / 3} textAnchor="end" fontSize={fontSize} fill="var(--muted-foreground)">
            {t}%
          </text>
        </g>
      ))}
      <text x={s / 2} y={s + fontSize * 2 + 16} textAnchor="middle" fontSize={fontSize + 1} fill="var(--foreground)">
        {xTitle} →
      </text>
      <text transform={`translate(${-fontSize * 3 - 12}, ${s / 2}) rotate(-90)`} textAnchor="middle" fontSize={fontSize + 1} fill="var(--foreground)">
        {yTitle} →
      </text>
    </g>
  );
}

/** The part of y = a + b·x that falls inside the plot square, in pixels. */
function segment(scale: Scale, a: number, b: number) {
  let lo = scale.min;
  let hi = scale.max;
  if (Math.abs(b) < 1e-9) {
    if (a < scale.min || a > scale.max) return null;
  } else {
    const xAtMin = (scale.min - a) / b;
    const xAtMax = (scale.max - a) / b;
    lo = Math.max(lo, Math.min(xAtMin, xAtMax));
    hi = Math.min(hi, Math.max(xAtMin, xAtMax));
  }
  if (hi <= lo) return null;
  return { x1: sx(scale, lo), y1: sy(scale, a + b * lo), x2: sx(scale, hi), y2: sy(scale, a + b * hi) };
}

function PlotLine({
  scale,
  a,
  b,
  color = BLUE,
  width = 2.5,
  dash,
  show = true,
  draw = false,
  opacity = 1,
}: {
  scale: Scale;
  a: number;
  b: number;
  color?: string;
  width?: number;
  dash?: string;
  show?: boolean;
  /** Animate the stroke in when `show` turns on. */
  draw?: boolean;
  opacity?: number;
}) {
  const seg = segment(scale, a, b);
  if (!seg) return null;
  if (draw) {
    const length = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
    return (
      <line
        {...seg}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={show ? 0 : length}
        style={{ opacity, transition: `stroke-dashoffset 1100ms ${EASE}, opacity 500ms ease` }}
      />
    );
  }
  return (
    <line
      {...seg}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray={dash}
      style={{ opacity: show ? opacity : 0, transition: "opacity 500ms ease" }}
    />
  );
}

function DropDot({
  cx,
  cy,
  r = 6,
  fill = BLUE,
  delay = 0,
  animate,
  stroke = "white",
  strokeWidth = 1.5,
  opacity = 1,
}: {
  cx: number;
  cy: number;
  r?: number;
  fill?: string;
  delay?: number;
  animate: boolean;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}) {
  return (
    <circle
      className="lr-dot lr-anim"
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      style={{ opacity, transition: "opacity 500ms ease, fill 400ms ease", animation: animate ? `lr-drop .5s ${EASE} ${delay}ms both` : undefined }}
    />
  );
}

/** Pointer position in plot units for an SVG whose plot sits at `margin`. */
function pointerToPlot(svg: SVGSVGElement | null, event: PointerEvent<SVGSVGElement>, margin: { left: number; top: number }, scale: Scale) {
  const matrix = svg?.getScreenCTM();
  if (!svg || !matrix) return null;
  const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  const span = scale.max - scale.min;
  return {
    x: scale.min + ((local.x - margin.left) / scale.size) * span,
    y: scale.min + ((scale.size - (local.y - margin.top)) / scale.size) * span,
  };
}

function RangeRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  color = BLUE,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  color?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[12.5px] text-muted-foreground">
          {label}
        </label>
        <span className="font-mono text-[14px] font-medium tabular-nums" style={{ color }}>
          {format(value)}
        </span>
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

function Stat({ label, children, color = "var(--foreground)", className }: { label: ReactNode; children: ReactNode; color?: string; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border px-3 py-2", className)}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-mono text-[16px] font-medium" style={{ color }}>
        {children}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Lines by eye vs a fitted line                                           */
/* -------------------------------------------------------------------------- */

const EYE_PLOT: Scale = { min: 35, max: 65, size: 300 };

const GUESSES = [
  { label: "Guess 1", note: "Drawn by eye", a: MEAN.y - 0.85 * MEAN.x, b: 0.85, color: SLATE },
  { label: "Guess 2", note: "A little higher", a: MEAN.y - 0.85 * MEAN.x + 2.6, b: 0.85, color: VIOLET },
  { label: "Guess 3", note: "A different slope", a: MEAN.y - 1.15 * MEAN.x, b: 1.15, color: AMBER },
];

export function ByEyeLinesAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop, reduced } = useGuidePhases([1800, 2400, 2000, 2000, 2000, 4200], rootRef, 5);
  const s = EYE_PLOT.size;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Twelve team-seasons on a scatter plot of Pythagorean expectation against actual win percentage. The dots tend to rise from left to right. Three lines drawn by eye disagree: one is a little higher, another has a different slope. Then a single blue line fitted from the data appears: linear regression."
      caption="Hypothetical 12-team league from lesson 3. Everyone draws a slightly different line by eye; regression fits one from the data."
    >
      <LrFrames />
      <ScaledStage width={860} height={410}>
        <div className="grid h-full grid-cols-[1fr_290px] gap-4">
          <Panel className="relative">
            <svg className="absolute left-[150px] top-[22px] overflow-visible" width={s} height={s} aria-hidden>
              <defs>
                <marker id="lr-trend-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" fill={GREEN} />
                </marker>
              </defs>
              <Axes scale={EYE_PLOT} step={5} />
              <line
                x1={sx(EYE_PLOT, 38)}
                y1={sy(EYE_PLOT, 41)}
                x2={sx(EYE_PLOT, 61)}
                y2={sy(EYE_PLOT, 59.5)}
                stroke={GREEN}
                strokeWidth={14}
                strokeLinecap="round"
                markerEnd="url(#lr-trend-arrow)"
                style={{ opacity: phase === 1 ? 0.22 : 0, transition: "opacity 600ms ease" }}
              />
              <text
                x={sx(EYE_PLOT, 44)}
                y={sy(EYE_PLOT, 55)}
                fontSize={12}
                fontWeight={600}
                fill={GREEN}
                style={{ opacity: phase === 1 ? 1 : 0, transition: "opacity 600ms ease" }}
              >
                tends to rise
              </text>
              {GUESSES.map((g, index) => (
                <PlotLine
                  key={g.label}
                  scale={EYE_PLOT}
                  a={g.a}
                  b={g.b}
                  color={g.color}
                  width={2}
                  draw
                  show={phase >= 2 + index}
                  opacity={phase >= 5 ? 0.3 : 1}
                />
              ))}
              <PlotLine scale={EYE_PLOT} a={FIT.intercept} b={FIT.slope} width={3.25} draw show={phase >= 5} />
              {LEAGUE.map((t, index) => (
                <DropDot
                  key={`${t.name}-${loop}`}
                  cx={sx(EYE_PLOT, t.exp)}
                  cy={sy(EYE_PLOT, t.act)}
                  fill={SLATE}
                  delay={index * 90}
                  animate={!reduced}
                />
              ))}
            </svg>
          </Panel>

          <Panel className="flex flex-col p-5">
            <Eyebrow>Where should the line go?</Eyebrow>
            <div className="mt-3 space-y-1.5">
              {GUESSES.map((g, index) => (
                <div
                  key={g.label}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2 transition-all duration-500"
                  style={{
                    borderColor: phase === 2 + index ? g.color : "var(--border)",
                    opacity: phase >= 2 + index ? (phase >= 5 ? 0.55 : 1) : 0.3,
                  }}
                >
                  <span className="h-0.5 w-6 shrink-0 rounded" style={{ background: g.color }} />
                  <span>
                    <span className="block text-[13px] font-medium text-foreground">{g.label}</span>
                    <span className="block text-[11.5px] text-muted-foreground">{g.note}</span>
                  </span>
                </div>
              ))}
              <div
                className="flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-500"
                style={{
                  borderColor: phase >= 5 ? BLUE : "var(--border)",
                  background: phase >= 5 ? `${BLUE}10` : "transparent",
                  opacity: phase >= 5 ? 1 : 0.3,
                }}
              >
                <span className="h-1 w-6 shrink-0 rounded" style={{ background: BLUE }} />
                <span>
                  <span className="block text-[13px] font-semibold" style={{ color: BLUE }}>
                    Linear regression
                  </span>
                  <span className="block text-[11.5px] text-muted-foreground">One consistent rule, fitted from the data</span>
                </span>
              </div>
            </div>
            <div className="mt-auto rounded-lg bg-muted px-3 py-2.5 text-[12px] leading-snug">
              <p className="font-medium text-foreground">Simple linear regression</p>
              <p className="mt-1 text-muted-foreground">
                Input: <span className="text-foreground">Pythagorean expectation</span>
              </p>
              <p className="text-muted-foreground">
                Outcome: <span className="text-foreground">actual win %</span>
              </p>
            </div>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Anatomy of the equation                                                 */
/* -------------------------------------------------------------------------- */

const EQ_PLOT: Scale = { min: 40, max: 70, size: 320 };
const SLOPE_PIVOT = 55;

function Token({ on, color, children }: { on: boolean; color: string; children: ReactNode }) {
  return (
    <span
      className="rounded-md px-1.5 py-0.5 transition-all duration-500"
      style={{ background: on ? `${color}1f` : "transparent", color: on ? color : "var(--foreground)", boxShadow: on ? `inset 0 0 0 1.5px ${color}` : "none" }}
    >
      {children}
    </span>
  );
}

export function EquationAnatomyAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, reduced } = useGuidePhases([1800, 3000, 3200, 3400, 3800], rootRef, 4);
  const s = EQ_PLOT.size;
  const { a, b } = EXAMPLE_LINE;
  const fitted = a + b * EXAMPLE_X;
  const pivotY = a + b * SLOPE_PIVOT;
  const px = sx(EQ_PLOT, EXAMPLE_X);
  const py = sy(EQ_PLOT, fitted);
  const run = { x1: sx(EQ_PLOT, 50), x2: sx(EQ_PLOT, 60), y: sy(EQ_PLOT, a + b * 50) };

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="The made-up line 0.05 plus 0.90 times Pythagorean expectation. First the intercept is highlighted and copies of the line shift up and down: it sets the height. Then the slope is highlighted and copies tilt: ten points across means nine points up. Finally 0.60 is plugged in: 0.05 plus 0.54 equals 0.59, an estimated actual win percentage of 59 percent."
      caption="Made-up numbers for illustration, not fitted to a real season. Percentages go into the equation as decimals."
    >
      <LrFrames />
      <ScaledStage width={860} height={430}>
        <div className="grid h-full grid-cols-[1fr_330px] gap-4">
          <Panel className="relative">
            <svg className="absolute left-[118px] top-[20px] overflow-visible" width={s} height={s} aria-hidden>
              <Axes scale={EQ_PLOT} step={10} />
              <g style={{ opacity: phase === 1 ? 1 : 0, transition: "opacity 500ms ease" }}>
                <PlotLine scale={EQ_PLOT} a={a + 5} b={b} color={AMBER} width={1.75} dash="6 5" />
                <PlotLine scale={EQ_PLOT} a={a - 5} b={b} color={AMBER} width={1.75} dash="6 5" />
                {[1, -1].map((dir) => (
                  <line
                    key={dir}
                    x1={sx(EQ_PLOT, 47)}
                    x2={sx(EQ_PLOT, 47)}
                    y1={sy(EQ_PLOT, a + b * 47) - dir * 6}
                    y2={sy(EQ_PLOT, a + b * 47 + dir * 4.2)}
                    stroke={AMBER}
                    strokeWidth={2}
                    markerEnd="url(#lr-eq-amber)"
                  />
                ))}
                <text x={12} y={22} fontSize={12} fontWeight={600} fill={AMBER}>
                  Intercept: moves the line up or down
                </text>
              </g>
              <g style={{ opacity: phase === 2 ? 1 : 0, transition: "opacity 500ms ease" }}>
                <PlotLine scale={EQ_PLOT} a={pivotY - 0.55 * SLOPE_PIVOT} b={0.55} color={VIOLET} width={1.75} dash="6 5" />
                <PlotLine scale={EQ_PLOT} a={pivotY - 1.3 * SLOPE_PIVOT} b={1.3} color={VIOLET} width={1.75} dash="6 5" />
                <path d={`M${run.x1},${run.y} L${run.x2},${run.y} L${run.x2},${py}`} fill="none" stroke={VIOLET} strokeWidth={2} />
                <text x={(run.x1 + run.x2) / 2} y={run.y + 16} textAnchor="middle" fontSize={11.5} fontWeight={600} fill={VIOLET}>
                  +10 across
                </text>
                <text x={run.x2 + 8} y={(run.y + py) / 2 + 4} fontSize={11.5} fontWeight={600} fill={VIOLET}>
                  +9 up
                </text>
                <text x={12} y={22} fontSize={12} fontWeight={600} fill={VIOLET}>
                  Slope: how steeply the line rises
                </text>
              </g>
              <g style={{ opacity: phase >= 3 ? 1 : 0, transition: "opacity 500ms ease" }}>
                <line x1={px} x2={px} y1={s} y2={py} stroke={BLUE} strokeWidth={1.75} strokeDasharray="5 4" />
                <line x1={0} x2={px} y1={py} y2={py} stroke={GREEN} strokeWidth={1.75} strokeDasharray="5 4" />
                <text x={px + 6} y={s - 8} fontSize={11.5} fontWeight={600} fill={BLUE}>
                  0.60
                </text>
                <text x={8} y={py - 7} fontSize={11.5} fontWeight={600} fill={GREEN}>
                  0.59
                </text>
              </g>
              <defs>
                <marker id="lr-eq-amber" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" fill={AMBER} />
                </marker>
              </defs>
              <PlotLine scale={EQ_PLOT} a={a} b={b} width={3} draw show />
              {phase >= 3 ? (
                <DropDot key="eq-dot" cx={px} cy={py} r={7.5} fill={GREEN} strokeWidth={2.5} animate={!reduced} delay={250} />
              ) : null}
            </svg>
          </Panel>

          <Panel className="flex flex-col p-5">
            <Eyebrow>The regression equation</Eyebrow>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">Estimated actual win % =</p>
            <p className="mt-1 font-mono text-[16px] leading-relaxed">
              <Token on={phase === 1} color={AMBER}>
                0.05
              </Token>{" "}
              +{" "}
              <Token on={phase === 2} color={VIOLET}>
                0.90
              </Token>{" "}
              ×{" "}
              <Token on={phase >= 3} color={BLUE}>
                {phase >= 3 ? "0.60" : "Pyth. exp."}
              </Token>
            </p>

            <div className="mt-4 grid min-h-[124px]">
              <Reveal show={phase === 1} className="[grid-area:1/1]">
                <p className="text-[13px] font-semibold" style={{ color: AMBER }}>
                  Intercept
                </p>
                <p className="text-[12.5px] leading-snug text-muted-foreground">Sets the line&apos;s height. Change it and the whole line slides up or down.</p>
              </Reveal>
              <Reveal show={phase === 2} className="[grid-area:1/1]">
                <p className="text-[13px] font-semibold" style={{ color: VIOLET }}>
                  Slope
                </p>
                <p className="text-[12.5px] leading-snug text-muted-foreground">
                  How much the fitted outcome changes as the input increases: 0.90 up for every 1 across.
                </p>
              </Reveal>
              <Reveal show={phase >= 3} className="[grid-area:1/1]">
                <div className="space-y-1 font-mono text-[14px] text-foreground">
                  <p>0.05 + 0.90 × 0.60</p>
                  <p>= 0.05 + 0.54</p>
                  <p>
                    = <span style={{ color: GREEN }}>0.59</span>
                  </p>
                </div>
              </Reveal>
            </div>

            <Reveal show={phase >= 4} className="mt-auto rounded-lg px-4 py-3" style={{ background: `${GREEN}14` }}>
              <p className="text-[11px] text-muted-foreground">Estimated actual win percentage</p>
              <p className="font-mono text-[28px] font-medium leading-tight" style={{ color: GREEN }}>
                59%
              </p>
            </Reveal>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Explore intercept, slope and input                                      */
/* -------------------------------------------------------------------------- */

const LINE_PLOT: Scale = { min: 30, max: 70, size: 320 };
const LINE_MARGIN = { left: 62, top: 14 };

const LINE_PRESETS = [
  { label: "Lesson example", a: 0.05, b: 0.9 },
  { label: "Steeper", a: -0.25, b: 1.4 },
  { label: "Flat", a: 0.5, b: 0 },
  { label: "Equality line", a: 0, b: 1 },
];

export function RegressionLineExplorer() {
  const clipId = `lr-clip-${useId().replace(/:/g, "")}`;
  const [a, setA] = useState(0.05);
  const [b, setB] = useState(0.9);
  const [x, setX] = useState(0.6);

  const fitted = a + b * x;
  const s = LINE_PLOT.size;
  const xPts = x * 100;
  const yPts = fitted * 100;
  const inPlot = yPts >= LINE_PLOT.min && yPts <= LINE_PLOT.max;
  const px = sx(LINE_PLOT, xPts);
  const py = sy(LINE_PLOT, Math.min(LINE_PLOT.max, Math.max(LINE_PLOT.min, yPts)));
  const runFrom = xPts > 58 ? xPts - 10 : xPts;
  const runTo = runFrom + 10;
  const runY = sy(LINE_PLOT, a * 100 + b * runFrom);
  const riseY = sy(LINE_PLOT, a * 100 + b * runTo);
  const showTriangle = b > 0.02 && [a * 100 + b * runFrom, a * 100 + b * runTo].every((v) => v >= LINE_PLOT.min && v <= LINE_PLOT.max);
  const outside = fitted < 0 || fitted > 1;

  return (
    <InteractiveFigure caption="Move the sliders. The faint dashed line is the equality line from lesson 3, for reference.">
      <LrFrames />
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_17rem]">
        <Panel className="p-3 sm:p-4">
          <svg viewBox={`0 0 ${LINE_MARGIN.left + s + 16} ${LINE_MARGIN.top + s + 58}`} className="w-full select-none" aria-hidden>
            <defs>
              <clipPath id={clipId}>
                <rect x={0} y={0} width={s} height={s} />
              </clipPath>
            </defs>
            <g transform={`translate(${LINE_MARGIN.left}, ${LINE_MARGIN.top})`}>
              <Axes scale={LINE_PLOT} step={10} fontSize={10} />
              <PlotLine scale={LINE_PLOT} a={0} b={1} color="var(--muted-foreground)" width={1.25} dash="4 5" opacity={0.7} />
              <g clipPath={`url(#${clipId})`}>
                <PlotLine scale={LINE_PLOT} a={a * 100} b={b} width={3} />
                {showTriangle ? (
                  <>
                    <path
                      d={`M${sx(LINE_PLOT, runFrom)},${runY} L${sx(LINE_PLOT, runTo)},${runY} L${sx(LINE_PLOT, runTo)},${riseY}`}
                      fill="none"
                      stroke={VIOLET}
                      strokeWidth={1.75}
                    />
                    <text x={(sx(LINE_PLOT, runFrom) + sx(LINE_PLOT, runTo)) / 2} y={runY + 14} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={VIOLET}>
                      +10 pts
                    </text>
                    <text x={sx(LINE_PLOT, runTo) + 6} y={(runY + riseY) / 2 + 4} fontSize={10.5} fontWeight={600} fill={VIOLET}>
                      +{(10 * b).toFixed(1)}
                    </text>
                  </>
                ) : null}
              </g>
              <line x1={px} x2={px} y1={s} y2={py} stroke={BLUE} strokeWidth={1.5} strokeDasharray="4 4" />
              {inPlot ? (
                <>
                  <line x1={0} x2={px} y1={py} y2={py} stroke={GREEN} strokeWidth={1.5} strokeDasharray="4 4" />
                  <circle cx={px} cy={py} r={7} fill={GREEN} stroke="white" strokeWidth={2} />
                </>
              ) : (
                <text x={px} y={yPts > LINE_PLOT.max ? 14 : s - 10} textAnchor="middle" fontSize={11} fontWeight={600} fill={GREEN}>
                  {yPts > LINE_PLOT.max ? "↑ off the chart" : "↓ off the chart"}
                </text>
              )}
            </g>
          </svg>
        </Panel>

        <Panel className="flex flex-col p-5">
          <Eyebrow>Build the line</Eyebrow>
          <div className="mt-3 space-y-3">
            <RangeRow label="Intercept" value={a} min={-0.3} max={0.5} step={0.01} onChange={setA} format={(v) => v.toFixed(2)} color={AMBER} />
            <RangeRow label="Slope" value={b} min={0} max={1.5} step={0.01} onChange={setB} format={(v) => v.toFixed(2)} color={VIOLET} />
            <RangeRow label="Pythagorean expectation" value={x} min={0.3} max={0.7} step={0.01} onChange={setX} format={(v) => v.toFixed(2)} />
          </div>
          <div className="mt-4 rounded-lg border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Estimated actual win %</p>
            <p className="font-mono text-[13px] text-foreground">
              <span style={{ color: AMBER }}>{a.toFixed(2)}</span> + <span style={{ color: VIOLET }}>{b.toFixed(2)}</span> ×{" "}
              <span style={{ color: BLUE }}>{x.toFixed(2)}</span> = <span style={{ color: GREEN }}>{dec(yPts)}</span>
            </p>
            <p className="mt-1 font-mono text-[26px] font-medium leading-none" style={{ color: GREEN }} aria-live="polite">
              {yPts.toFixed(1)}%
            </p>
          </div>
          <p className="mt-3 text-[12px] leading-snug text-muted-foreground">
            {b === 0 ? (
              "Slope 0: the input changes nothing; every team gets the same estimate."
            ) : (
              <>
                Each 1-point rise in Pythagorean expectation adds <span className="font-mono text-foreground">{b.toFixed(2)}</span> points along this line.
              </>
            )}
          </p>
          {outside ? (
            <p className="mt-2 text-[12px] font-medium leading-snug" style={{ color: RED }}>
              Below 0% or above 100%: a straight line doesn&apos;t know win percentages have limits.
            </p>
          ) : null}
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            {LINE_PRESETS.map((preset) => (
              <PillButton
                key={preset.label}
                active={Math.abs(a - preset.a) < 1e-6 && Math.abs(b - preset.b) < 1e-6}
                onClick={() => {
                  setA(preset.a);
                  setB(preset.b);
                  if (preset.label === "Lesson example") setX(0.6);
                }}
              >
                {preset.label}
              </PillButton>
            ))}
          </div>
        </Panel>
      </div>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. The intercept lives far from the data                                   */
/* -------------------------------------------------------------------------- */

const DATA_RANGE = { lo: 37, hi: 62.5 };

export function InterceptZoomAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop, reduced } = useGuidePhases([2400, 3000, 3000, 4200], rootRef, 3);
  const min = useTween(phase >= 1 ? 0 : 35, !reduced, 1500);
  const max = useTween(phase >= 1 ? 100 : 65, !reduced, 1500);
  const scale: Scale = { min, max, size: 300 };
  const s = scale.size;
  const { a, b } = EXAMPLE_LINE;
  const ix = sx(scale, 0);
  const iy = sy(scale, a);
  const zoomed = phase >= 1;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="The made-up line over the league's dots, which sit between about 37 and 62 percent. The view zooms out to 0 to 100 percent. The line is followed back to an input of zero, where it gives 0.05, or 5 percent: the intercept. That point is far outside the range of the data."
      caption="The intercept positions the line. Read literally, it describes a team expected to win 0% of its games, which is nowhere near our data."
    >
      <LrFrames />
      <ScaledStage width={860} height={400}>
        <div className="grid h-full grid-cols-[1fr_300px] gap-4">
          <Panel className="relative">
            <svg className="absolute left-[140px] top-[20px] overflow-visible" width={s} height={s} aria-hidden>
              <Axes scale={scale} step={max - min > 45 ? 20 : 5} />
              <rect
                x={sx(scale, DATA_RANGE.lo)}
                y={0}
                width={sx(scale, DATA_RANGE.hi) - sx(scale, DATA_RANGE.lo)}
                height={s}
                fill={BLUE}
                opacity={0.07}
              />
              <text
                x={(sx(scale, DATA_RANGE.lo) + sx(scale, DATA_RANGE.hi)) / 2}
                y={16}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill={BLUE}
                style={{ opacity: zoomed ? 1 : 0, transition: "opacity 500ms ease" }}
              >
                our teams
              </text>
              <PlotLine scale={scale} a={a} b={b} width={2.75} />
              {LEAGUE.map((t, index) => (
                <DropDot
                  key={`${t.name}-${loop}`}
                  cx={sx(scale, t.exp)}
                  cy={sy(scale, t.act)}
                  r={zoomed ? 4.5 : 6}
                  fill={SLATE}
                  delay={index * 70}
                  animate={!reduced}
                />
              ))}
              <g style={{ opacity: phase >= 2 ? 1 : 0, transition: "opacity 500ms ease" }}>
                <circle cx={ix} cy={iy} r={12} fill="none" stroke={AMBER} strokeWidth={2} />
                <circle cx={ix} cy={iy} r={5} fill={AMBER} />
                <text x={ix + 18} y={iy + 4} fontSize={12} fontWeight={700} fill={AMBER}>
                  input 0 → 0.05
                </text>
              </g>
              <g style={{ opacity: phase >= 3 ? 1 : 0, transition: "opacity 500ms ease" }}>
                <line x1={ix + 4} x2={sx(scale, DATA_RANGE.lo) - 4} y1={sy(scale, 55)} y2={sy(scale, 55)} stroke={AMBER} strokeWidth={1.5} strokeDasharray="4 4" />
                <line x1={ix + 4} x2={ix + 4} y1={sy(scale, 55) - 6} y2={sy(scale, 55) + 6} stroke={AMBER} strokeWidth={1.5} />
                <line
                  x1={sx(scale, DATA_RANGE.lo) - 4}
                  x2={sx(scale, DATA_RANGE.lo) - 4}
                  y1={sy(scale, 55) - 6}
                  y2={sy(scale, 55) + 6}
                  stroke={AMBER}
                  strokeWidth={1.5}
                />
                <text x={(ix + sx(scale, DATA_RANGE.lo)) / 2} y={sy(scale, 55) - 10} textAnchor="middle" fontSize={11.5} fontWeight={600} fill={AMBER}>
                  far from the data
                </text>
              </g>
            </svg>
          </Panel>

          <Panel className="flex flex-col gap-2.5 p-5">
            <Eyebrow>What is the intercept?</Eyebrow>
            <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: `${BLUE}66` }}>
              <p className="text-[13px] font-semibold" style={{ color: BLUE }}>
                Our data
              </p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">Pythagorean expectation runs from about 37% to 62%.</p>
            </div>
            <div
              className="rounded-lg border px-3 py-2.5 transition-all duration-500"
              style={{ borderColor: phase >= 2 ? AMBER : "var(--border)", opacity: phase >= 2 ? 1 : 0.35 }}
            >
              <p className="text-[13px] font-semibold" style={{ color: AMBER }}>
                The intercept: 0.05
              </p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">The line&apos;s value when the input is zero.</p>
            </div>
            <div
              className="rounded-lg border px-3 py-2.5 transition-all duration-500"
              style={{ borderColor: phase >= 3 ? "var(--foreground)" : "var(--border)", opacity: phase >= 3 ? 1 : 0.35 }}
            >
              <p className="text-[13px] font-semibold text-foreground">Useful, not meaningful here</p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                It positions the line mathematically. A team expected to win 0% of its games is nowhere near our data.
              </p>
            </div>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Residuals: drag the team                                                */
/* -------------------------------------------------------------------------- */

const RES_PLOT: Scale = { min: 45, max: 70, size: 320 };
const RES_MARGIN = { left: 62, top: 14 };
const RES_START = { x: 60, y: 62 };

const clampTo = (scale: Scale, v: number) => Math.min(scale.max, Math.max(scale.min, v));

export function ResidualExplorer() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [point, setPoint] = useState(RES_START);
  const [dragging, setDragging] = useState(false);

  const { a, b } = EXAMPLE_LINE;
  const fitted = a + b * point.x;
  const residual = point.y - fitted;
  const onLine = Math.abs(residual) < 0.25;
  const color = sideColor(residual);
  const s = RES_PLOT.size;
  const dx = sx(RES_PLOT, point.x);
  const dy = sy(RES_PLOT, point.y);
  const fy = sy(RES_PLOT, fitted);
  const labelLeft = residual > 0 ? point.x > 48 : point.x > 66;

  const moveTo = (event: PointerEvent<SVGSVGElement>) => {
    const p = pointerToPlot(svgRef.current, event, RES_MARGIN, RES_PLOT);
    if (!p) return;
    setPoint({ x: Math.round(clampTo(RES_PLOT, p.x)), y: Math.round(clampTo(RES_PLOT, p.y)) });
  };

  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setPoint((p) => ({ x: clampTo(RES_PLOT, p.x + move[0]), y: clampTo(RES_PLOT, p.y + move[1]) }));
  };

  const verdict = onLine
    ? "On the line: the team matched its fitted value."
    : residual > 0
      ? "Positive residual: the dot sits above the fitted line."
      : "Negative residual: the dot sits below the fitted line.";

  return (
    <InteractiveFigure caption="Drag the team's dot, or focus it and use the arrow keys. The line is the made-up equation: 0.05 + 0.90 × Pythagorean expectation.">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_17rem]">
        <Panel className="p-3 sm:p-4">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${RES_MARGIN.left + s + 16} ${RES_MARGIN.top + s + 58}`}
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
            <g transform={`translate(${RES_MARGIN.left}, ${RES_MARGIN.top})`}>
              <Axes scale={RES_PLOT} step={5} fontSize={10} />
              <PlotLine scale={RES_PLOT} a={a} b={b} width={2.75} />
              <text
                x={sx(RES_PLOT, 46)}
                y={sy(RES_PLOT, a + b * 46) - 10}
                fontSize={10.5}
                fontWeight={600}
                fill={BLUE}
                transform={`rotate(${-Math.atan(b) * (180 / Math.PI)}, ${sx(RES_PLOT, 46)}, ${sy(RES_PLOT, a + b * 46) - 10})`}
              >
                fitted line
              </text>
              {!onLine ? (
                <>
                  <line x1={dx} x2={dx} y1={dy} y2={fy} stroke={color} strokeWidth={3} />
                  <text
                    x={labelLeft ? dx - 14 : dx + 14}
                    y={(dy + fy) / 2 + 4}
                    textAnchor={labelLeft ? "end" : "start"}
                    fontSize={12}
                    fontWeight={700}
                    fill={color}
                    pointerEvents="none"
                  >
                    {signed(residual)} pts
                  </text>
                </>
              ) : null}
              <circle cx={dx} cy={fy} r={5.5} fill="var(--background)" stroke={BLUE} strokeWidth={2} />
              <g
                role="slider"
                tabIndex={0}
                aria-label="Team dot"
                aria-valuetext={`Pythagorean expectation ${point.x}%, actual ${point.y}%, residual ${signed(residual)} points`}
                onKeyDown={onKeyDown}
                className="cursor-grab outline-none [&:focus-visible>circle:first-child]:opacity-100"
              >
                <circle cx={dx} cy={dy} r={13} fill="none" stroke={BLUE} strokeWidth={2} opacity={0} />
                <circle cx={dx} cy={dy} r={7.5} fill="var(--foreground)" stroke="white" strokeWidth={2} />
              </g>
            </g>
          </svg>
        </Panel>

        <Panel className="flex flex-col p-5">
          <Eyebrow>Actual vs fitted</Eyebrow>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="Pyth. exp." color={BLUE}>
              {point.x}%
            </Stat>
            <Stat label="Actual">{point.y}%</Stat>
          </div>
          <div className="mt-2 rounded-lg border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Fitted value (on the line)</p>
            <p className="font-mono text-[13px] text-foreground">
              0.05 + 0.90 × {dec(point.x)} = <span style={{ color: BLUE }}>{dec(fitted)}</span>
            </p>
          </div>
          <div className="mt-2 rounded-lg border px-3 py-2" style={{ borderColor: onLine ? "var(--border)" : color }}>
            <p className="text-[11px] text-muted-foreground">Residual = actual − fitted</p>
            <p className="font-mono text-[13px] text-foreground">
              {dec(point.y)} − {dec(fitted)} = {signed(residual / 100, 3).replace(/(\.\d\d)0$/, "$1")}
            </p>
            <p className="mt-1 font-mono text-[24px] font-medium leading-none" style={{ color: onLine ? "var(--foreground)" : color }} aria-live="polite">
              {signed(residual)} pts
            </p>
          </div>
          <p className="mt-3 text-[12.5px] font-medium leading-snug" style={{ color: onLine ? "var(--foreground)" : color }}>
            {verdict}
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <PillButton active={point.x === 60 && point.y === 62} onClick={() => setPoint({ x: 60, y: 62 })}>
              Won 62%
            </PillButton>
            <PillButton active={point.x === 60 && point.y === 56} onClick={() => setPoint({ x: 60, y: 56 })}>
              Won 56%
            </PillButton>
            <PillButton active={point.x === 60 && point.y === 59} onClick={() => setPoint({ x: 60, y: 59 })}>
              On the line
            </PillButton>
          </div>
        </Panel>
      </div>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Why square the residuals?                                               */
/* -------------------------------------------------------------------------- */

const CANCEL = [3, -3, 1, -1];
const WEIGHT = [1, 2, 3, 4];
const BASELINE = 132;

export function WhySquareAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop, reduced } = useGuidePhases([1800, 2800, 3200, 4200], rootRef, 3);
  const squared = phase >= 2;
  const rawUnit = 20;
  const sqUnit = 12;
  const cell = 22;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Left: four residuals of plus 3, minus 3, plus 1 and minus 1 add up to zero, as if the line were perfect. Squared, they become 9, 9, 1 and 1, which add up to 20. Right: residuals of 1, 2, 3 and 4 drawn as squares of 1, 4, 9 and 16 cells. Doubling a miss quadruples its squared value."
      caption="Squared residuals can't cancel, and big misses count for much more than small ones."
    >
      <Frames />
      <ScaledStage width={860} height={390}>
        <div className="grid h-full grid-cols-2 gap-4">
          <Panel className="flex flex-col p-5">
            <Eyebrow>Problem: raw residuals cancel</Eyebrow>
            <div className="relative mt-2 h-[230px]">
              <div className="absolute inset-x-6 h-px bg-foreground/50" style={{ top: BASELINE }} />
              <span className="absolute left-0 text-[10.5px] text-muted-foreground" style={{ top: BASELINE - 16 }}>
                line
              </span>
              {CANCEL.map((r, index) => {
                const value = squared ? r * r : r;
                const h = Math.abs(value) * (squared ? sqUnit : rawUnit);
                const up = value >= 0;
                const color = squared ? AMBER : r > 0 ? GREEN : RED;
                return (
                  <div key={index} className="absolute w-[46px]" style={{ left: 40 + index * 88 }}>
                    <div
                      className="absolute w-full rounded-[4px]"
                      style={{
                        top: up ? BASELINE - h : BASELINE,
                        height: h,
                        background: color,
                        opacity: 0.85,
                        transition: `top 700ms ${EASE}, height 700ms ${EASE}, background 500ms ease`,
                      }}
                    />
                    <span
                      className="absolute w-full text-center font-mono text-[13px] font-semibold"
                      style={{ top: up ? BASELINE - h - 20 : BASELINE + h + 4, color, transition: `top 700ms ${EASE}` }}
                    >
                      {squared ? `${value}` : signed(r, 0)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-auto space-y-1.5">
              <Reveal show={phase >= 1} className="flex items-baseline justify-between rounded-lg border border-border px-3 py-2">
                <span className="font-mono text-[13px] text-foreground">+3 − 3 + 1 − 1</span>
                <span className="font-mono text-[15px] font-semibold text-foreground">= 0</span>
              </Reveal>
              <Reveal show={phase >= 2} className="flex items-baseline justify-between rounded-lg border px-3 py-2" style={{ borderColor: AMBER }}>
                <span className="font-mono text-[13px] text-foreground">9 + 9 + 1 + 1</span>
                <span className="font-mono text-[15px] font-semibold" style={{ color: AMBER }}>
                  = 20
                </span>
              </Reveal>
            </div>
            <p className="mt-2 h-[18px] text-[12px] text-muted-foreground">
              {phase === 1 ? "A total of 0 looks perfect, but every dot missed." : phase >= 2 ? "Squared, every miss adds to the total." : ""}
            </p>
          </Panel>

          <Panel className="flex flex-col p-5">
            <Eyebrow>Bonus: bigger misses weigh more</Eyebrow>
            <div className="mt-4 flex h-[210px] items-end justify-around">
              {WEIGHT.map((r, index) => {
                const side = r * cell;
                const on = phase >= 3;
                return (
                  <div key={r} className="flex flex-col items-center gap-2">
                    <div
                      key={on ? `on-${loop}` : "off"}
                      className="pyth-anim rounded-[3px] border"
                      style={{
                        width: side,
                        height: side,
                        borderColor: AMBER,
                        backgroundColor: `${AMBER}26`,
                        backgroundImage: `linear-gradient(${AMBER}55 1px, transparent 1px), linear-gradient(90deg, ${AMBER}55 1px, transparent 1px)`,
                        backgroundSize: `${cell}px ${cell}px`,
                        opacity: on ? 1 : 0.15,
                        animation: on && !reduced ? `pyth-pop .45s ${EASE} ${index * 260}ms both` : undefined,
                      }}
                    />
                    <span className="font-mono text-[12px] text-foreground">
                      {r}² = <span style={{ color: AMBER, fontWeight: 600 }}>{r * r}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <Reveal show={phase >= 3} className="mt-auto rounded-lg px-3 py-2.5" style={{ background: `${AMBER}14` }}>
              <p className="text-[13px] font-medium text-foreground">A miss of 4 counts 16 times as much as a miss of 1.</p>
            </Reveal>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Find the least-squares line yourself                                    */
/* -------------------------------------------------------------------------- */

const LS_PLOT: Scale = { min: 35, max: 65, size: 320 };
const LS_MARGIN = { left: 62, top: 14 };
const HANDLE_X = [40, 60] as const;
const LS_START = { y1: 47, y2: 55 };
const LS_TARGET = { y1: fitAt(HANDLE_X[0]), y2: fitAt(HANDLE_X[1]) };

export function LeastSquaresExplorer() {
  const svgRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef(0);
  const [handles, setHandles] = useState(LS_START);
  const [active, setActive] = useState<0 | 1 | null>(null);
  const [showSquares, setShowSquares] = useState(true);

  const b = (handles.y2 - handles.y1) / (HANDLE_X[1] - HANDLE_X[0]);
  const a = handles.y1 - b * HANDLE_X[0];
  const total = sumSquares(LEAGUE, a, b);
  const excess = total - LEAGUE_SSE;
  const isBest = excess < 0.05;
  const s = LS_PLOT.size;
  const unit = s / (LS_PLOT.max - LS_PLOT.min);
  const barMax = LEAGUE_SSE * 6;

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const animateTo = (target: typeof LS_START) => {
    cancelAnimationFrame(frameRef.current);
    const from = handles;
    const start = performance.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = (now: number) => {
      const t = reduced ? 1 : Math.min(1, (now - start) / 900);
      const e = 1 - (1 - t) ** 3;
      setHandles({ y1: from.y1 + (target.y1 - from.y1) * e, y2: from.y2 + (target.y2 - from.y2) * e });
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  const setHandle = (index: 0 | 1, y: number) => {
    const value = Math.round(clampTo(LS_PLOT, y) * 10) / 10;
    setHandles((h) => (index === 0 ? { ...h, y1: value } : { ...h, y2: value }));
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (active === null) return;
    const p = pointerToPlot(svgRef.current, event, LS_MARGIN, LS_PLOT);
    if (p) setHandle(active, p.y);
  };

  const onHandleKey = (index: 0 | 1) => (event: KeyboardEvent<SVGGElement>) => {
    const step = event.shiftKey ? 2 : 0.5;
    const delta = event.key === "ArrowUp" ? step : event.key === "ArrowDown" ? -step : 0;
    if (!delta) return;
    event.preventDefault();
    setHandle(index, (index === 0 ? handles.y1 : handles.y2) + delta);
  };

  return (
    <InteractiveFigure caption="Drag the two round handles to move the line, or focus one and use the arrow keys. Squares show each squared residual; least squares makes their total area as small as possible.">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_17rem]">
        <Panel className="p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap gap-2">
            <PillButton active={showSquares} onClick={() => setShowSquares((v) => !v)}>
              Squares
            </PillButton>
          </div>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${LS_MARGIN.left + s + 16} ${LS_MARGIN.top + s + 58}`}
            className="w-full touch-none select-none"
            onPointerMove={onPointerMove}
            onPointerUp={() => setActive(null)}
            onPointerCancel={() => setActive(null)}
          >
            <g transform={`translate(${LS_MARGIN.left}, ${LS_MARGIN.top})`}>
              <Axes scale={LS_PLOT} step={5} fontSize={10} />
              {LEAGUE.map((t) => {
                const fitted = a + b * t.exp;
                const r = t.act - fitted;
                const cx = sx(LS_PLOT, t.exp);
                const cy = sy(LS_PLOT, t.act);
                const fy = sy(LS_PLOT, clampTo(LS_PLOT, fitted));
                const side = Math.min(Math.abs(cy - fy), Math.abs(r) * unit);
                const goLeft = cx + side > s;
                return (
                  <g key={t.name}>
                    <rect
                      x={goLeft ? cx - side : cx}
                      y={Math.min(cy, fy)}
                      width={side}
                      height={side}
                      fill={AMBER}
                      fillOpacity={0.16}
                      stroke={AMBER}
                      strokeOpacity={0.55}
                      style={{ opacity: showSquares ? 1 : 0, transition: "opacity 300ms ease" }}
                    />
                    <line x1={cx} x2={cx} y1={cy} y2={fy} stroke={sideColor(r)} strokeWidth={2} />
                  </g>
                );
              })}
              <PlotLine scale={LS_PLOT} a={a} b={b} width={3} color={isBest ? BLUE : "var(--foreground)"} />
              {LEAGUE.map((t) => (
                <circle key={t.name} cx={sx(LS_PLOT, t.exp)} cy={sy(LS_PLOT, t.act)} r={5.5} fill={SLATE} stroke="white" strokeWidth={1.5} />
              ))}
              {HANDLE_X.map((hx, index) => {
                const hy = index === 0 ? handles.y1 : handles.y2;
                return (
                  <g
                    key={hx}
                    role="slider"
                    tabIndex={0}
                    aria-label={`Line handle at ${hx}% Pythagorean expectation`}
                    aria-valuenow={Number(hy.toFixed(1))}
                    aria-valuemin={LS_PLOT.min}
                    aria-valuemax={LS_PLOT.max}
                    onKeyDown={onHandleKey(index as 0 | 1)}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      svgRef.current?.setPointerCapture(event.pointerId);
                      cancelAnimationFrame(frameRef.current);
                      setActive(index as 0 | 1);
                    }}
                    className={cn("outline-none [&:focus-visible>circle:first-child]:opacity-100", active === index ? "cursor-grabbing" : "cursor-grab")}
                  >
                    <circle cx={sx(LS_PLOT, hx)} cy={sy(LS_PLOT, hy)} r={15} fill="none" stroke={BLUE} strokeWidth={2} opacity={0} />
                    <circle cx={sx(LS_PLOT, hx)} cy={sy(LS_PLOT, hy)} r={18} fill="transparent" />
                    <circle cx={sx(LS_PLOT, hx)} cy={sy(LS_PLOT, hy)} r={8.5} fill="var(--background)" stroke={isBest ? BLUE : "var(--foreground)"} strokeWidth={3} />
                    <path
                      d="M-3,-1.5 L0,-4.5 L3,-1.5 M-3,1.5 L0,4.5 L3,1.5"
                      transform={`translate(${sx(LS_PLOT, hx)}, ${sy(LS_PLOT, hy)})`}
                      fill="none"
                      stroke={isBest ? BLUE : "var(--foreground)"}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pointerEvents="none"
                    />
                  </g>
                );
              })}
            </g>
          </svg>
        </Panel>

        <Panel className="flex flex-col p-5">
          <Eyebrow>Your line</Eyebrow>
          <p className="mt-1 font-mono text-[13px] text-foreground">
            {dec(a)} + {b.toFixed(2)} × Pyth. exp.
          </p>

          <Eyebrow className="mt-4">Sum of squared residuals</Eyebrow>
          <p className="mt-1 font-mono text-[34px] font-medium leading-none tracking-tight" style={{ color: isBest ? BLUE : AMBER }} aria-live="polite">
            {total.toFixed(1)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">squared percentage points</p>

          <div className="relative mt-4 h-3 rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, (total / barMax) * 100)}%`, background: isBest ? BLUE : AMBER, transition: "width 150ms linear" }}
            />
            <div className="absolute -top-1 h-5 w-0.5 bg-foreground" style={{ left: `${(LEAGUE_SSE / barMax) * 100}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Smallest possible: <span className="font-mono text-foreground">{LEAGUE_SSE.toFixed(1)}</span>
          </p>

          <p className="mt-3 text-[12.5px] font-medium leading-snug" style={{ color: isBest ? BLUE : "var(--foreground)" }}>
            {isBest
              ? "This is the least-squares line. No other straight line has a smaller total."
              : `${excess.toFixed(1)} above the smallest total. Keep adjusting, or let least squares do it.`}
          </p>

          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <PillButton active={isBest} onClick={() => animateTo(LS_TARGET)}>
              Fit least squares
            </PillButton>
            <PillButton onClick={() => animateTo(LS_START)}>Reset</PillButton>
          </div>
        </Panel>
      </div>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. Two lines, two questions                                                */
/* -------------------------------------------------------------------------- */

const TWO_PLOT: Scale = { min: 35, max: 65, size: 300 };
const SPOTLIGHT = LEAGUE.find((t) => t.name === "Summit") ?? LEAGUE[0];

export function TwoLinesAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop, reduced } = useGuidePhases([1600, 2800, 2800, 3400, 4200], rootRef, 4);
  const s = TWO_PLOT.size;
  const team = SPOTLIGHT;
  const cx = sx(TWO_PLOT, team.exp);
  const cy = sy(TWO_PLOT, team.act);
  const diagY = sy(TWO_PLOT, team.exp);
  const fitY = sy(TWO_PLOT, fitAt(team.exp));
  const vsDiagonal = team.act - team.exp;
  const vsFit = team.act - fitAt(team.exp);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label={`The league's dots with two lines. A dark diagonal marks where actual equals Pythagorean expectation; we chose it as a reference. A blue regression line is fitted from the dots. One team, ${team.name}, is highlighted: it sits ${Math.abs(vsDiagonal).toFixed(1)} points below the diagonal but ${vsFit.toFixed(1)} points above the fitted line.`}
      caption={`Hypothetical league. ${team.name} sits below the equality line and above the regression line at the same time.`}
    >
      <LrFrames />
      <ScaledStage width={860} height={410}>
        <div className="grid h-full grid-cols-[1fr_320px] gap-4">
          <Panel className="relative">
            <svg className="absolute left-[92px] top-[22px] overflow-visible" width={s} height={s} aria-hidden>
              <Axes scale={TWO_PLOT} step={5} />
              <PlotLine scale={TWO_PLOT} a={0} b={1} color="var(--foreground)" width={2} draw show={phase >= 1} />
              <PlotLine scale={TWO_PLOT} a={FIT.intercept} b={FIT.slope} width={3} draw show={phase >= 2} />
              {LEAGUE.map((t, index) => (
                <DropDot
                  key={`${t.name}-${loop}`}
                  cx={sx(TWO_PLOT, t.exp)}
                  cy={sy(TWO_PLOT, t.act)}
                  fill={SLATE}
                  delay={index * 80}
                  animate={!reduced}
                  opacity={phase >= 3 && t.name !== team.name ? 0.35 : 1}
                />
              ))}
              <g style={{ opacity: phase >= 3 ? 1 : 0, transition: "opacity 500ms ease" }}>
                <line x1={cx} x2={cx} y1={cy} y2={diagY} stroke={RED} strokeWidth={3} />
                <line x1={cx} x2={cx} y1={cy} y2={fitY} stroke={GREEN} strokeWidth={3} />
                <circle cx={cx} cy={cy} r={8} fill="var(--foreground)" stroke="white" strokeWidth={2} />
                <text x={s + 12} y={diagY + 4} fontSize={11.5} fontWeight={700} fill={RED}>
                  {signed(vsDiagonal)} vs diagonal
                </text>
                <text x={s + 12} y={cy + 4} fontSize={11.5} fontWeight={600} fill="var(--foreground)">
                  {team.name}
                </text>
                <text x={s + 12} y={cy + 22} fontSize={11.5} fontWeight={700} fill={GREEN}>
                  {signed(vsFit)} vs fitted
                </text>
              </g>
            </svg>
          </Panel>

          <Panel className="flex flex-col gap-2.5 p-5">
            <Eyebrow>Two lines, two questions</Eyebrow>
            <div
              className="rounded-lg border px-3 py-2.5 transition-all duration-500"
              style={{ borderColor: phase >= 1 ? "var(--foreground)" : "var(--border)", opacity: phase >= 1 ? 1 : 0.35 }}
            >
              <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                <span className="h-0.5 w-6 bg-foreground" /> Equality line · we chose it
              </p>
              <p className="mt-1 text-[12px] leading-snug text-muted-foreground">Did this team&apos;s record match its scoring-based estimate?</p>
            </div>
            <div
              className="rounded-lg border px-3 py-2.5 transition-all duration-500"
              style={{ borderColor: phase >= 2 ? BLUE : "var(--border)", opacity: phase >= 2 ? 1 : 0.35 }}
            >
              <p className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: BLUE }}>
                <span className="h-1 w-6 rounded" style={{ background: BLUE }} /> Regression line · fitted
              </p>
              <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                Where does this team sit compared with the relationship fitted across the teams?
              </p>
            </div>
            <Reveal show={phase >= 4} className="mt-auto rounded-lg px-3 py-2.5" style={{ background: `${AMBER}14` }}>
              <p className="text-[13px] font-medium text-foreground">
                {team.name}: below one line, above the other. Different comparisons.
              </p>
            </Reveal>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 9. Compare every team against both lines                                   */
/* -------------------------------------------------------------------------- */

const COMPARE_PLOT: Scale = { min: 35, max: 65, size: 320 };

const side = (r: number) => (Math.abs(r) < 0.25 ? 0 : Math.sign(r));
const sideWord = (r: number) => (side(r) === 0 ? "on the line" : r > 0 ? "above" : "below");
const opposite = (t: (typeof LEAGUE)[number]) => side(t.act - t.exp) * side(t.act - fitAt(t.exp)) < 0;
const OPPOSITE_TEAMS = LEAGUE.filter(opposite);

export function TwoLinesExplorer() {
  const [selected, setSelected] = useState(SPOTLIGHT.name);
  const [showDiagonal, setShowDiagonal] = useState(true);
  const [showFit, setShowFit] = useState(true);
  const [flagOpposite, setFlagOpposite] = useState(false);
  const team = LEAGUE.find((t) => t.name === selected) ?? LEAGUE[0];
  const vsDiagonal = team.act - team.exp;
  const vsFit = team.act - fitAt(team.exp);
  const s = COMPARE_PLOT.size;
  const margin = { left: 62, top: 14 };

  return (
    <InteractiveFigure caption="Hypothetical league. Hover or tap a dot to measure it against both lines.">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_17rem]">
        <Panel className="p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap gap-2">
            <PillButton active={showDiagonal} onClick={() => setShowDiagonal((v) => !v)}>
              Equality line
            </PillButton>
            <PillButton active={showFit} onClick={() => setShowFit((v) => !v)}>
              Regression line
            </PillButton>
            <PillButton active={flagOpposite} onClick={() => setFlagOpposite((v) => !v)}>
              Opposite sides
            </PillButton>
          </div>
          <svg viewBox={`0 0 ${margin.left + s + 16} ${margin.top + s + 58}`} className="w-full select-none">
            <g transform={`translate(${margin.left}, ${margin.top})`}>
              <Axes scale={COMPARE_PLOT} step={5} fontSize={10} />
              <PlotLine scale={COMPARE_PLOT} a={0} b={1} color="var(--foreground)" width={1.75} show={showDiagonal} />
              <PlotLine scale={COMPARE_PLOT} a={FIT.intercept} b={FIT.slope} width={2.75} show={showFit} />
              {LEAGUE.map((t) => {
                const cx = sx(COMPARE_PLOT, t.exp);
                const cy = sy(COMPARE_PLOT, t.act);
                const on = t.name === team.name;
                const flagged = flagOpposite && opposite(t);
                return (
                  <g key={t.name}>
                    {on ? (
                      <>
                        <line
                          x1={cx - 2}
                          x2={cx - 2}
                          y1={cy}
                          y2={sy(COMPARE_PLOT, t.exp)}
                          stroke="var(--foreground)"
                          strokeWidth={2.5}
                          strokeDasharray="3 3"
                          style={{ opacity: showDiagonal ? 1 : 0 }}
                        />
                        <line
                          x1={cx + 2}
                          x2={cx + 2}
                          y1={cy}
                          y2={sy(COMPARE_PLOT, fitAt(t.exp))}
                          stroke={BLUE}
                          strokeWidth={2.5}
                          style={{ opacity: showFit ? 1 : 0 }}
                        />
                      </>
                    ) : null}
                    {flagged ? <circle cx={cx} cy={cy} r={13} fill="none" stroke={AMBER} strokeWidth={2.5} /> : null}
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
                        r={on ? 8.5 : 6}
                        fill={on ? "var(--foreground)" : SLATE}
                        stroke="white"
                        strokeWidth={on ? 2 : 1.5}
                        style={{ transition: "r 200ms ease" }}
                      />
                    </g>
                    {on ? (
                      <text
                        x={cx + (t.exp > 56 ? -14 : 14)}
                        y={cy + (t.act > fitAt(t.exp) ? -12 : 20)}
                        textAnchor={t.exp > 56 ? "end" : "start"}
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
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-[16px] font-semibold text-foreground">{team.name}</p>
            <p className="font-mono text-[12px] text-muted-foreground">
              {team.exp.toFixed(1)}% → {team.act.toFixed(1)}%
            </p>
          </div>
          <div className="mt-3 space-y-2" aria-live="polite">
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="h-0.5 w-4 bg-foreground" /> vs equality line (actual − expected)
              </p>
              <p className="font-mono text-[17px] font-medium" style={{ color: sideColor(vsDiagonal) }}>
                {signed(vsDiagonal)} pts · {sideWord(vsDiagonal)}
              </p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="h-1 w-4 rounded" style={{ background: BLUE }} /> vs regression line (actual − fitted)
              </p>
              <p className="font-mono text-[17px] font-medium" style={{ color: sideColor(vsFit) }}>
                {signed(vsFit)} pts · {sideWord(vsFit)}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">fitted value {fitAt(team.exp).toFixed(1)}%</p>
            </div>
          </div>
          {opposite(team) ? (
            <p className="mt-3 rounded-lg px-3 py-2 text-[12.5px] font-medium text-foreground" style={{ background: `${AMBER}18` }}>
              Opposite sides: {sideWord(vsDiagonal)} one line, {sideWord(vsFit)} the other.
            </p>
          ) : (
            <p className="mt-3 text-[12px] leading-snug text-muted-foreground">Same side of both lines here. Try a team marked by &ldquo;Opposite sides&rdquo;.</p>
          )}
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            {OPPOSITE_TEAMS.map((t) => (
              <PillButton key={t.name} active={t.name === team.name} onClick={() => setSelected(t.name)}>
                {t.name}
              </PillButton>
            ))}
          </div>
        </Panel>
      </div>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 10. Same line, different spread                                            */
/* -------------------------------------------------------------------------- */

const SPREAD_PLOT: Scale = { min: 30, max: 70, size: 320 };
const SPREAD_X = Array.from({ length: 16 }, (_, i) => 38 + i * 1.6);

/** Fixed residual pattern with zero mean and zero correlation with x, scaled to a root-mean-square of 1. */
const SPREAD_Z = (() => {
  const raw = [1.2, -0.8, 0.3, -1.5, 0.9, -0.2, 1.7, -1.1, 0.4, -0.6, -1.3, 0.8, 1.0, -0.4, 0.2, -0.9];
  const n = raw.length;
  const mx = SPREAD_X.reduce((sum, v) => sum + v, 0) / n;
  const mz = raw.reduce((sum, v) => sum + v, 0) / n;
  const centered = raw.map((v) => v - mz);
  const dxs = SPREAD_X.map((v) => v - mx);
  const k = centered.reduce((sum, v, i) => sum + v * dxs[i], 0) / dxs.reduce((sum, v) => sum + v * v, 0);
  const z = centered.map((v, i) => v - k * dxs[i]);
  const norm = Math.sqrt(z.reduce((sum, v) => sum + v * v, 0) / n);
  return z.map((v) => v / norm);
})();

const SPREAD_PRESETS = [
  { label: "Tight", value: 0.5 },
  { label: "Our league", value: 1.6 },
  { label: "Loose", value: 3.5 },
];

export function SpreadExplorer() {
  const [spread, setSpread] = useState(1.6);
  const s = SPREAD_PLOT.size;
  const points = SPREAD_X.map((x, i) => ({ exp: x, act: fitAt(x) + spread * SPREAD_Z[i], r: spread * SPREAD_Z[i] }));
  const largest = Math.max(...points.map((p) => Math.abs(p.r)));
  const within = points.filter((p) => Math.abs(p.r) <= 1).length;
  const band = spread * (s / (SPREAD_PLOT.max - SPREAD_PLOT.min));
  const seg = segment(SPREAD_PLOT, FIT.intercept, FIT.slope);
  const margin = { left: 62, top: 14 };

  return (
    <InteractiveFigure caption="Hypothetical teams. The slider scales how far each dot sits from the line; the fitted line itself stays the same at every setting.">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_17rem]">
        <Panel className="p-3 sm:p-4">
          <svg viewBox={`0 0 ${margin.left + s + 16} ${margin.top + s + 58}`} className="w-full select-none" aria-hidden>
            <g transform={`translate(${margin.left}, ${margin.top})`}>
              <Axes scale={SPREAD_PLOT} step={10} fontSize={10} />
              {seg ? (
                <polygon
                  points={`${seg.x1},${seg.y1 - band} ${seg.x2},${seg.y2 - band} ${seg.x2},${seg.y2 + band} ${seg.x1},${seg.y1 + band}`}
                  fill={BLUE}
                  opacity={0.08}
                />
              ) : null}
              <PlotLine scale={SPREAD_PLOT} a={FIT.intercept} b={FIT.slope} width={2.75} />
              {points.map((p, i) => {
                const cx = sx(SPREAD_PLOT, p.exp);
                return (
                  <g key={i}>
                    <line x1={cx} x2={cx} y1={sy(SPREAD_PLOT, p.act)} y2={sy(SPREAD_PLOT, fitAt(p.exp))} stroke={sideColor(p.r)} strokeWidth={1.75} />
                    <circle cx={cx} cy={sy(SPREAD_PLOT, p.act)} r={5.5} fill={SLATE} stroke="white" strokeWidth={1.5} />
                  </g>
                );
              })}
            </g>
          </svg>
        </Panel>

        <Panel className="flex flex-col p-5">
          <Eyebrow>Same line, different spread</Eyebrow>
          <div className="mt-3">
            <RangeRow label="Spread around the line" value={spread} min={0} max={4} step={0.1} onChange={setSpread} format={(v) => `${v.toFixed(1)} pts`} color={AMBER} />
          </div>
          <div className="mt-4 space-y-2">
            <Stat label="Fitted line (unchanged)" color={BLUE}>
              {dec(FIT.intercept)} + {FIT.slope.toFixed(2)} × x
            </Stat>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Largest miss" color={AMBER}>
                {largest.toFixed(1)} pts
              </Stat>
              <Stat label="Within 1 pt">
                {within} of {points.length}
              </Stat>
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-snug text-muted-foreground">
            The shaded band is the typical distance from the line: {spread.toFixed(1)} points. A fitted value is an estimate; individual teams land above or below it.
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            {SPREAD_PRESETS.map((preset) => (
              <PillButton key={preset.label} active={Math.abs(spread - preset.value) < 1e-6} onClick={() => setSpread(preset.value)}>
                {preset.label}
              </PillButton>
            ))}
          </div>
        </Panel>
      </div>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 11. Fitting one season isn't predicting the next                           */
/* -------------------------------------------------------------------------- */

const SEASON_PLOT: Scale = { min: 35, max: 65, size: 300 };
const SEASON_TWO = [
  [60.5, -2.8],
  [57.8, 3.1],
  [55.6, -1.9],
  [53.9, 2.4],
  [52.1, -3.3],
  [50.6, 1.2],
  [49.2, 2.9],
  [47.5, -2.2],
  [46.0, 0.8],
  [44.4, -2.7],
  [42.3, 3.4],
  [39.6, -1.0],
].map(([exp, r]) => ({ exp, act: fitAt(exp) + r }));
const SEASON_ONE_MISS = rms(LEAGUE, FIT.intercept, FIT.slope);
const SEASON_TWO_MISS = rms(SEASON_TWO, FIT.intercept, FIT.slope);

export function NewSeasonAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop, reduced } = useGuidePhases([1800, 2800, 2400, 2600, 4400], rootRef, 4);
  const s = SEASON_PLOT.size;
  const showSeasonTwo = phase >= 3;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label={`A regression line is fitted to one season's twelve teams; their typical distance from the line is ${SEASON_ONE_MISS.toFixed(1)} points. The line is then frozen and a new season's teams, which the line has never seen, are added. Their typical distance from the same line is ${SEASON_TWO_MISS.toFixed(1)} points.`}
      caption="Hypothetical seasons. “Typical miss” is the root-mean-square residual. Checking a line needs data it wasn't fitted on."
    >
      <LrFrames />
      <ScaledStage width={860} height={410}>
        <div className="grid h-full grid-cols-[1fr_300px] gap-4">
          <Panel className="relative">
            <svg className="absolute left-[140px] top-[22px] overflow-visible" width={s} height={s} aria-hidden>
              <Axes scale={SEASON_PLOT} step={5} />
              {LEAGUE.map((t) => (
                <line
                  key={`r1-${t.name}`}
                  x1={sx(SEASON_PLOT, t.exp)}
                  x2={sx(SEASON_PLOT, t.exp)}
                  y1={sy(SEASON_PLOT, t.act)}
                  y2={sy(SEASON_PLOT, fitAt(t.exp))}
                  stroke={BLUE}
                  strokeWidth={2}
                  style={{ opacity: phase === 1 ? 0.8 : 0, transition: "opacity 500ms ease" }}
                />
              ))}
              {SEASON_TWO.map((t, index) => (
                <line
                  key={`r2-${index}`}
                  x1={sx(SEASON_PLOT, t.exp)}
                  x2={sx(SEASON_PLOT, t.exp)}
                  y1={sy(SEASON_PLOT, t.act)}
                  y2={sy(SEASON_PLOT, fitAt(t.exp))}
                  stroke={VIOLET}
                  strokeWidth={2}
                  style={{ opacity: phase >= 4 ? 0.85 : 0, transition: "opacity 500ms ease" }}
                />
              ))}
              <PlotLine scale={SEASON_PLOT} a={FIT.intercept} b={FIT.slope} width={3} draw show color={phase >= 2 ? "var(--foreground)" : BLUE} />
              <g style={{ opacity: phase >= 2 ? 1 : 0, transition: "opacity 500ms ease" }}>
                <rect x={sx(SEASON_PLOT, 36.5)} y={sy(SEASON_PLOT, 63.5)} width={112} height={24} rx={12} fill="var(--foreground)" />
                <text x={sx(SEASON_PLOT, 36.5) + 56} y={sy(SEASON_PLOT, 63.5) + 16} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--background)">
                  line frozen
                </text>
              </g>
              {LEAGUE.map((t, index) => (
                <DropDot
                  key={`s1-${t.name}-${loop}`}
                  cx={sx(SEASON_PLOT, t.exp)}
                  cy={sy(SEASON_PLOT, t.act)}
                  fill={BLUE}
                  delay={index * 70}
                  animate={!reduced}
                  opacity={phase >= 2 ? 0.18 : 1}
                />
              ))}
              {showSeasonTwo
                ? SEASON_TWO.map((t, index) => (
                    <DropDot
                      key={`s2-${index}-${loop}`}
                      cx={sx(SEASON_PLOT, t.exp)}
                      cy={sy(SEASON_PLOT, t.act)}
                      fill="var(--background)"
                      stroke={VIOLET}
                      strokeWidth={2.5}
                      r={5.5}
                      delay={index * 90}
                      animate={!reduced}
                    />
                  ))
                : null}
            </svg>
          </Panel>

          <Panel className="flex flex-col gap-2.5 p-5">
            <Eyebrow>Fit vs check</Eyebrow>
            <div
              className="rounded-lg border px-3 py-2.5 transition-all duration-500"
              style={{ borderColor: phase >= 1 ? BLUE : "var(--border)", opacity: phase >= 1 ? 1 : 0.4 }}
            >
              <p className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: BLUE }}>
                <span className="size-2.5 rounded-full" style={{ background: BLUE }} /> Season the line was fitted on
              </p>
              <p className="mt-1 font-mono text-[20px] font-medium text-foreground">{phase >= 1 ? `${SEASON_ONE_MISS.toFixed(1)} pts` : "—"}</p>
              <p className="text-[11px] text-muted-foreground">typical miss</p>
            </div>
            <div
              className="rounded-lg border px-3 py-2.5 transition-all duration-500"
              style={{ borderColor: phase >= 3 ? VIOLET : "var(--border)", opacity: phase >= 3 ? 1 : 0.4 }}
            >
              <p className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: VIOLET }}>
                <span className="size-2.5 rounded-full border-2" style={{ borderColor: VIOLET }} /> A season it hasn&apos;t seen
              </p>
              <p className="mt-1 font-mono text-[20px] font-medium text-foreground">{phase >= 4 ? `${SEASON_TWO_MISS.toFixed(1)} pts` : "?"}</p>
              <p className="text-[11px] text-muted-foreground">typical miss</p>
            </div>
            <Reveal show={phase >= 4} className="mt-auto rounded-lg px-3 py-2.5" style={{ background: `${VIOLET}12` }}>
              <p className="text-[12.5px] font-medium leading-snug text-foreground">
                How well a line fits its own data doesn&apos;t tell you how well it predicts new data.
              </p>
            </Reveal>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 12. Table → scatter → line                                                 */
/* -------------------------------------------------------------------------- */

const MINI_PLOT: Scale = { min: 35, max: 65, size: 168 };
const MINI_ROWS = LEAGUE.filter((_, index) => index % 2 === 0);

function MiniPlot({ showLine, showResiduals, active, loop, reduced }: { showLine: boolean; showResiduals: boolean; active: boolean; loop: number; reduced: boolean }) {
  const s = MINI_PLOT.size;
  return (
    <svg width={s} height={s} className="overflow-visible" aria-hidden>
      <rect x={0} y={0} width={s} height={s} fill="var(--background)" stroke="var(--border)" />
      {[40, 50, 60].map((t) => (
        <g key={t}>
          <line x1={sx(MINI_PLOT, t)} x2={sx(MINI_PLOT, t)} y1={0} y2={s} stroke="var(--border)" strokeDasharray="2 4" />
          <line x1={0} x2={s} y1={sy(MINI_PLOT, t)} y2={sy(MINI_PLOT, t)} stroke="var(--border)" strokeDasharray="2 4" />
        </g>
      ))}
      {showResiduals
        ? LEAGUE.map((t) => (
            <line
              key={`r-${t.name}`}
              x1={sx(MINI_PLOT, t.exp)}
              x2={sx(MINI_PLOT, t.exp)}
              y1={sy(MINI_PLOT, t.act)}
              y2={sy(MINI_PLOT, fitAt(t.exp))}
              stroke={sideColor(t.act - fitAt(t.exp))}
              strokeWidth={1.75}
            />
          ))
        : null}
      {showLine ? <PlotLine scale={MINI_PLOT} a={FIT.intercept} b={FIT.slope} width={2.5} draw show={active} /> : null}
      {LEAGUE.map((t, index) =>
        active ? (
          <DropDot key={`${t.name}-${loop}`} cx={sx(MINI_PLOT, t.exp)} cy={sy(MINI_PLOT, t.act)} r={4} fill={SLATE} strokeWidth={1} delay={index * 60} animate={!reduced && !showLine} />
        ) : null,
      )}
    </svg>
  );
}

export function TableScatterLineAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop, reduced } = useGuidePhases([1600, 2200, 2600, 4200], rootRef, 3);

  const step = (index: number) => ({
    borderColor: phase === index ? BLUE : "var(--border)",
    opacity: phase >= index ? 1 : 0.3,
    transition: "opacity 500ms ease, border-color 500ms ease",
  });

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Three steps side by side. First, a table of teams with Pythagorean expectation and actual win percentage. Then, the same numbers as dots on a scatter plot. Now, a regression line fitted through the dots, with each team's residual drawn as a short vertical line."
      caption="First a table, then a scatter plot, now a line fitted to the data, plus how far each team sits from it."
    >
      <LrFrames />
      <ScaledStage width={860} height={330}>
        <div className="grid h-full grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-2">
          <Panel className="flex flex-col p-4" style={step(0)}>
            <Eyebrow>1 · First, a table</Eyebrow>
            <div className="mt-3 grid grid-cols-[1fr_52px_52px] border-b border-border pb-1 text-[10.5px] text-muted-foreground">
              <span>Team</span>
              <span className="text-right">Pyth.</span>
              <span className="text-right">Actual</span>
            </div>
            {MINI_ROWS.map((t) => (
              <div key={t.name} className="grid grid-cols-[1fr_52px_52px] py-[3px] text-[12px]">
                <span className="text-foreground">{t.name}</span>
                <span className="text-right font-mono" style={{ color: BLUE }}>
                  {t.exp.toFixed(1)}
                </span>
                <span className="text-right font-mono" style={{ color: GREEN }}>
                  {t.act.toFixed(1)}
                </span>
              </div>
            ))}
            <p className="mt-auto text-[11px] text-muted-foreground">…and {LEAGUE.length - MINI_ROWS.length} more</p>
          </Panel>
          <span className="self-center font-mono text-[16px]" style={{ color: phase >= 1 ? BLUE : "var(--border)", transition: "color 500ms ease" }}>
            →
          </span>
          <Panel className="flex flex-col items-center p-4" style={step(1)}>
            <Eyebrow className="self-start">2 · Then, a scatter plot</Eyebrow>
            <div className="mt-5">
              <MiniPlot showLine={false} showResiduals={false} active={phase >= 1} loop={loop} reduced={reduced} />
            </div>
          </Panel>
          <span className="self-center font-mono text-[16px]" style={{ color: phase >= 2 ? BLUE : "var(--border)", transition: "color 500ms ease" }}>
            →
          </span>
          <Panel className="flex flex-col items-center p-4" style={step(2)}>
            <Eyebrow className="self-start">3 · Now, a fitted line</Eyebrow>
            <div className="mt-5">
              <MiniPlot showLine showResiduals={phase >= 3} active={phase >= 2} loop={loop} reduced={reduced} />
            </div>
            <Reveal show={phase >= 3} className="mt-auto pt-2 text-center font-mono text-[11.5px]" style={{ color: BLUE }}>
              {dec(FIT.intercept)} + {FIT.slope.toFixed(2)} × Pyth. exp.
            </Reveal>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}
