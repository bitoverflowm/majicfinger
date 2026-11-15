"use client";

import { useRef, useState } from "react";

import { BLUE, GREEN, RED } from "@/components/sections/features/feature-kit";
import { EASE, GuideAnimationFigure, ScaledStage, useGuidePhases } from "@/components/content/guide-animations/guide-animation-kit";
import { InteractiveFigure, PillButton } from "@/components/university/expected-wins-animations";
import { AMBER, Eyebrow, Frames, Panel, Reveal, Slider } from "@/components/university/pythagorean-animations";

const HIT = GREEN;
const MISS = RED;
const FORECAST = AMBER;
const AXIS = BLUE;

const BUCKETS = [
  { p: 50, n: 100, hits: 50 },
  { p: 70, n: 100, hits: 70 },
  { p: 90, n: 100, hits: 90 },
] as const;

function pct(value: number) {
  return `${Math.round(value)}%`;
}

/* -------------------------------------------------------------------------- */
/* 1. A 90% favorite can lose                                                 */
/* -------------------------------------------------------------------------- */

export function NinetyPercentLossAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1600, 2000, 2200, 4200], rootRef, 3);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A screenshot claims prediction markets got it wrong after a 90 percent favorite loses. Ten spaces appear: nine hits and one miss, showing the loss fits the forecast."
      caption="One loss can still fit a 90% forecast. Calibration looks across many."
    >
      <Frames />
      <ScaledStage width={860} height={300}>
        <div className="grid h-full gap-4 sm:grid-cols-[1.05fr_1fr]">
          <Panel className="flex flex-col justify-center p-5">
            <Eyebrow>The screenshot</Eyebrow>
            <p className="mt-3 font-mono text-[42px] font-semibold leading-none tabular-nums" style={{ color: FORECAST }}>
              90%
            </p>
            <Reveal show={phase >= 1}>
              <p className="mt-3 text-[15px] font-medium text-foreground">Event did not happen.</p>
              <p className="mt-1 text-[13px] text-muted-foreground">“Prediction markets got it wrong again.”</p>
            </Reveal>
          </Panel>
          <Panel className="flex flex-col justify-center p-5">
            <Eyebrow>Room left by 90%</Eyebrow>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }).map((_, index) => {
                const isMiss = index === 9;
                const show = phase >= 2 && (!isMiss || phase >= 2);
                const lit = phase >= 2 && (index < 9 || phase >= 3);
                return (
                  <div
                    key={index}
                    className="flex aspect-square items-center justify-center rounded-md border border-border font-mono text-[11px] font-semibold"
                    style={{
                      opacity: show ? 1 : 0.2,
                      background: lit ? (isMiss ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)") : undefined,
                      color: lit ? (isMiss ? MISS : HIT) : "var(--muted-foreground)",
                      transition: `opacity 300ms ease, background 400ms ${EASE}`,
                    }}
                  >
                    {lit ? (isMiss ? "X" : "✓") : "·"}
                  </div>
                );
              })}
            </div>
            <Reveal show={phase >= 3}>
              <p className="mt-3 text-[13px] leading-snug text-foreground">
                Nine of ten. The miss belongs in the forecast — it doesn’t, by itself, break calibration.
              </p>
            </Reveal>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Calibrated buckets                                                      */
/* -------------------------------------------------------------------------- */

export function CalibrationBucketsAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1400, 1400, 1400, 4000], rootRef, 3);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Three hypothetical probability buckets: 50 percent with 50 hits, 70 percent with 70 hits, and 90 percent with 90 hits out of 100 forecasts each."
      caption="Hypothetical set. Forecasts recorded one day before resolution."
    >
      <Frames />
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="grid grid-cols-[1fr_5.5rem_6.5rem_5.5rem] border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          <span>Forecast</span>
          <span className="text-right">n</span>
          <span className="text-right">Happened</span>
          <span className="text-right">Rate</span>
        </div>
        {BUCKETS.map((bucket, index) => {
          const on = phase >= index;
          const rate = (bucket.hits / bucket.n) * 100;
          return (
            <div
              key={bucket.p}
              className="grid grid-cols-[1fr_5.5rem_6.5rem_5.5rem] items-center border-b border-border/70 px-4 py-3 last:border-b-0"
              style={{
                opacity: on ? 1 : 0.25,
                transition: `opacity 400ms ease`,
              }}
            >
              <div>
                <p className="font-mono text-[18px] font-semibold tabular-nums" style={{ color: FORECAST }}>
                  {bucket.p}%
                </p>
                <div className="mt-1.5 h-1.5 max-w-[12rem] overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: on ? `${rate}%` : "0%",
                      background: HIT,
                      transition: `width 700ms ${EASE}`,
                    }}
                  />
                </div>
              </div>
              <span className="text-right font-mono text-[14px] tabular-nums text-foreground">{bucket.n}</span>
              <span className="text-right font-mono text-[14px] tabular-nums text-foreground">{on ? bucket.hits : "—"}</span>
              <span className="text-right font-mono text-[14px] font-semibold tabular-nums" style={{ color: on ? HIT : undefined }}>
                {on ? pct(rate) : "—"}
              </span>
            </div>
          );
        })}
      </div>
      <Reveal show={phase >= 3}>
        <p className="mt-4 text-[14px] text-foreground">
          Ten of the 90% forecasts failed. In this constructed example, that is still calibrated.
        </p>
      </Reveal>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Reliability plot explorer                                               */
/* -------------------------------------------------------------------------- */

export function ReliabilityPlotExplorer() {
  const [hits, setHits] = useState(90);
  const forecast = 90;
  const rate = hits;
  const gap = rate - forecast;

  return (
    <InteractiveFigure caption="Hypothetical 100 forecasts at 90%. Drag how many happened. The diagonal is perfect calibration in this toy plot.">
      <Panel className="p-5">
        <Slider label="Events that happened (of 100 at 90%)" value={hits} min={70} max={100} step={1} onChange={setHits} color={FORECAST} />
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_12rem]">
          <div className="relative aspect-square max-h-[240px] rounded-lg border border-border bg-background p-3">
            <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label="Reliability plot">
              <line x1="12" y1="88" x2="88" y2="88" stroke="currentColor" strokeOpacity="0.25" />
              <line x1="12" y1="88" x2="12" y2="12" stroke="currentColor" strokeOpacity="0.25" />
              <line x1="12" y1="88" x2="88" y2="12" stroke={AXIS} strokeWidth="1.2" strokeDasharray="3 3" />
              <circle
                cx={12 + (forecast / 100) * 76}
                cy={88 - (rate / 100) * 76}
                r="3.5"
                fill={Math.abs(gap) <= 3 ? HIT : FORECAST}
              />
              <text x="50" y="98" textAnchor="middle" fontSize="4.5" fill="currentColor" opacity="0.55">
                Forecast probability →
              </text>
              <text
                x="5"
                y="50"
                textAnchor="middle"
                fontSize="4.5"
                fill="currentColor"
                opacity="0.55"
                transform="rotate(-90 5 50)"
              >
                Observed frequency →
              </text>
            </svg>
          </div>
          <div className="flex flex-col justify-center gap-3">
            <div>
              <Eyebrow>Observed rate</Eyebrow>
              <p className="mt-1 font-mono text-[28px] font-semibold tabular-nums text-foreground">{pct(rate)}</p>
            </div>
            <div>
              <Eyebrow>Vs 90% forecast</Eyebrow>
              <p className="mt-1 font-mono text-[22px] font-semibold tabular-nums" style={{ color: Math.abs(gap) <= 3 ? HIT : MISS }}>
                {gap === 0 ? "0 pp" : `${gap > 0 ? "+" : "−"}${Math.abs(gap)} pp`}
              </p>
            </div>
          </div>
        </div>
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground" aria-live="polite">
          {Math.abs(gap) <= 3
            ? "Close to the diagonal in this toy example. Real samples wobble — especially with fewer than 100 forecasts."
            : gap < 0
              ? "Observed less often than stated. That can mean overconfidence in this band — or just a thin sample."
              : "Observed more often than stated. That can mean underconfidence in this band — or just a thin sample."}
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. One result vs the record                                                */
/* -------------------------------------------------------------------------- */

export function OneResultVsRecordExplorer() {
  const [mode, setMode] = useState<"one" | "record">("one");

  return (
    <InteractiveFigure caption="Same 90% miss. Switch between judging one screenshot and looking at the rest of the band.">
      <div className="flex flex-wrap gap-2">
        <PillButton active={mode === "one"} onClick={() => setMode("one")}>
          One result
        </PillButton>
        <PillButton active={mode === "record"} onClick={() => setMode("record")}>
          The record
        </PillButton>
      </div>
      <Panel className="mt-4 p-5">
        {mode === "one" ? (
          <>
            <Eyebrow>Screenshot verdict</Eyebrow>
            <p className="mt-2 text-[16px] font-medium text-foreground">“They said 90%. It failed. Markets are broken.”</p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
              A 99% miss deserves more scrutiny than a 60% miss. Still, one outcome cannot establish whether probabilities are
              systematically too high.
            </p>
          </>
        ) : (
          <>
            <Eyebrow>Same confidence, many forecasts</Eyebrow>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "At 90%", value: "100" },
                { label: "Hits", value: "90" },
                { label: "Misses", value: "10" },
                { label: "Rate", value: "90%" },
              ].map((card) => (
                <div key={card.label} className="rounded-lg border border-border px-3 py-2.5">
                  <p className="text-[11px] text-muted-foreground">{card.label}</p>
                  <p className="font-mono text-[20px] font-semibold tabular-nums text-foreground">{card.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
              Include ordinary successes and other failures. Highlighting only the wildest win or loss picks the story after
              the ending.
            </p>
          </>
        )}
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Winners vs calibration                                                  */
/* -------------------------------------------------------------------------- */

export function WinnersVsCalibrationExplorer() {
  const [who, setWho] = useState<"picker" | "calibrated">("picker");
  const picker = { label: "Winner picker", p: 51, hits: 100, n: 100 };
  const calibrated = { label: "Calibrated 90%", p: 90, hits: 90, n: 100 };
  const active = who === "picker" ? picker : calibrated;
  const rate = (active.hits / active.n) * 100;
  const gap = rate - active.p;

  return (
    <InteractiveFigure caption="Two hypothetical forecasters. One picks every winner at 51%. One matches a 90% frequency with ninety hits.">
      <div className="flex flex-wrap gap-2">
        <PillButton active={who === "picker"} onClick={() => setWho("picker")}>
          51% · 100/100 wins
        </PillButton>
        <PillButton active={who === "calibrated"} onClick={() => setWho("calibrated")}>
          90% · 90/100 hits
        </PillButton>
      </div>
      <Panel className="mt-4 p-5">
        <Eyebrow>{active.label}</Eyebrow>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Stated probability</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums" style={{ color: FORECAST }}>
              {active.p}%
            </p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Observed rate</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums text-foreground">{pct(rate)}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Calibration gap</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums" style={{ color: Math.abs(gap) < 0.5 ? HIT : MISS }}>
              {gap === 0 ? "0 pp" : `${gap > 0 ? "+" : "−"}${Math.abs(gap).toFixed(0)} pp`}
            </p>
          </div>
        </div>
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground" aria-live="polite">
          {who === "picker"
            ? "Perfect winner-picking in this example — and badly calibrated. Events at 51% happened 100% of the time."
            : "Fewer winners than the picker, but the probability matches the observed frequency here. Calibration scores the number attached to the call."}
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Forecast timing                                                         */
/* -------------------------------------------------------------------------- */

export function ForecastTimingAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1600, 2000, 2200, 4000], rootRef, 3);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A timeline from one month before an election to resolution. An early price and a late price are different questions even if both read 65 percent."
      caption="Same contract. Different observation times. Different difficulty."
    >
      <Frames />
      <ScaledStage width={860} height={260}>
        <div className="flex h-full flex-col justify-center gap-6">
          <div className="relative mx-auto h-2 w-[90%] rounded-full bg-muted">
            {[
              { left: "8%", label: "1 month out", detail: "Harder", on: phase >= 0 },
              { left: "55%", label: "1 day out", detail: "Easier", on: phase >= 1 },
              { left: "92%", label: "Resolved", detail: "Outcome", on: phase >= 2 },
            ].map((mark) => (
              <div
                key={mark.label}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: mark.left, opacity: mark.on ? 1 : 0.2, transition: "opacity 400ms ease" }}
              >
                <div className="size-3 rounded-full border-2 border-background" style={{ background: mark.on && mark.label === "Resolved" ? HIT : FORECAST }} />
                <p className="absolute left-1/2 top-4 w-24 -translate-x-1/2 text-center font-mono text-[11px] font-semibold text-foreground">
                  {mark.label}
                </p>
                <p className="absolute left-1/2 top-9 w-24 -translate-x-1/2 text-center text-[11px] text-muted-foreground">{mark.detail}</p>
              </div>
            ))}
          </div>
          <Reveal show={phase >= 3}>
            <p className="text-center text-[14px] text-foreground">
              A 65¢ price a month out is not the same claim as 65¢ after most votes are counted.
            </p>
          </Reveal>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Sample composition                                                      */
/* -------------------------------------------------------------------------- */

export function SampleCompositionExplorer() {
  const [mode, setMode] = useState<"related" | "independent">("related");

  return (
    <InteractiveFigure caption="Before you trust a calibration chart, check whether the sample is one shared story or many separate ones.">
      <div className="flex flex-wrap gap-2">
        <PillButton active={mode === "related"} onClick={() => setMode("related")}>
          One election · 100 contracts
        </PillButton>
        <PillButton active={mode === "independent"} onClick={() => setMode("independent")}>
          100 unrelated elections
        </PillButton>
      </div>
      <Panel className="mt-4 p-5">
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="aspect-square rounded-md border border-border"
              style={{
                background:
                  mode === "related"
                    ? `rgba(217,119,6,${0.15 + index * 0.04})`
                    : index % 2 === 0
                      ? "rgba(47,111,237,0.18)"
                      : "rgba(34,197,94,0.18)",
                transition: `background 350ms ${EASE}`,
              }}
            />
          ))}
        </div>
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground" aria-live="polite">
          {mode === "related"
            ? "A hundred contracts tied to one election are not a hundred unrelated elections. Shared information can move them together."
            : "Separate elections give more independent draws. Still check category, probability bands, and how related contracts were treated."}
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. What to record                                                          */
/* -------------------------------------------------------------------------- */

const RECORD_FIELDS = [
  "Question",
  "Forecast probability",
  "Observation time",
  "Resolution criteria",
  "Eventual result",
] as const;

export function CalibrationRecordAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([900, 900, 900, 900, 900, 2800], rootRef, 5);
  const revealed = Math.min(RECORD_FIELDS.length, phase + 1);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A checklist for investigating calibration yourself: question, forecast probability, observation time, resolution criteria, and eventual result."
      caption="Decide the rules before selecting examples."
    >
      <Frames />
      <Panel className="overflow-hidden p-0">
        <ul>
          {RECORD_FIELDS.map((field, index) => {
            const on = index < revealed;
            return (
              <li
                key={field}
                className="flex items-center gap-3 border-b border-border/70 px-4 py-3 last:border-b-0"
                style={{ opacity: on ? 1 : 0.25, transition: "opacity 300ms ease" }}
              >
                <span
                  className="grid size-6 place-items-center rounded-full font-mono text-[11px] font-semibold"
                  style={{
                    background: on ? "rgba(34,197,94,0.15)" : "transparent",
                    color: on ? HIT : "var(--muted-foreground)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {index + 1}
                </span>
                <span className="text-[14px] font-medium text-foreground">{field}</span>
              </li>
            );
          })}
        </ul>
      </Panel>
      <Reveal show={phase >= 5}>
        <p className="mt-4 text-[14px] text-foreground">
          Then ask: what happened across the other forecasts made with the same confidence?
        </p>
      </Reveal>
    </GuideAnimationFigure>
  );
}
