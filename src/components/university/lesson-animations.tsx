"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { BLUE, GREEN, useReducedMotion } from "@/components/sections/features/feature-kit";
import { cn } from "@/lib/utils";
import { EASE, GuideAnimationFigure, ScaledStage, useGuidePhases } from "@/components/content/guide-animations/guide-animation-kit";

const EXTRA_FRAMES = `
@keyframes uni-dart {
  0% { opacity: 0; transform: translate(18px, -16px) scale(.6); }
  70% { opacity: 1; transform: translate(0, 0) scale(1.08); }
  100% { opacity: 1; transform: none; }
}
@keyframes uni-drift {
  0% { transform: translateX(0); }
  100% { transform: translateX(var(--uni-drift)); }
}
@media (prefers-reduced-motion: reduce) {
  .guide-animation .uni-anim { animation: none !important; }
}
`;

function useCountUp(target: number, active: boolean, duration = 1200) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);

  useEffect(() => {
    if (!active || reduced) {
      setValue(target);
      return;
    }
    setValue(0);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(target * eased));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [active, duration, reduced, target]);

  return value;
}

function Panel({
  className,
  children,
  style,
}: {
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-background shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)]", className)}
      style={style}
    >
      {children}
    </div>
  );
}

export function ChanceBenchmarkAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([2400, 2600, 2800], rootRef, 2);
  const showBoard = phase >= 1;
  const showScore = phase >= 2;
  const darts = [
    { x: 46, y: 38 },
    { x: 62, y: 54 },
    { x: 34, y: 58 },
    { x: 58, y: 30 },
    { x: 40, y: 46 },
  ];

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Illustration: a confident claim about experts is set beside a chance benchmark. Darts scatter across a target to show the metaphor, not a real chimpanzee experiment."
      caption="The chimpanzee is a chance benchmark. Beating it is more informative than sounding sure."
    >
      <style dangerouslySetInnerHTML={{ __html: EXTRA_FRAMES }} />
      <ScaledStage width={860} height={380}>
        <div className="relative size-full">
          <Panel className="absolute left-4 top-8 w-[390px] p-5" style={{ opacity: showScore ? 0.72 : 1 }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">The memorable claim</p>
            <p className="mt-3 text-[22px] font-semibold leading-snug tracking-tight text-foreground">
              “An expert is about as accurate as a chimp throwing darts.”
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">Catchy. Incomplete.</p>
          </Panel>

          <Panel className="absolute right-4 top-8 w-[390px] overflow-hidden p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">What it actually is</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="relative grid size-[148px] shrink-0 place-items-center">
                <span className="absolute size-[148px] rounded-full border border-foreground/80" />
                <span className="absolute size-[104px] rounded-full border-2" style={{ borderColor: GREEN }} />
                <span className="absolute size-[58px] rounded-full border border-foreground/30" />
                {darts.map((dart, index) => (
                  <span
                    key={`${dart.x}-${dart.y}`}
                    className={cn("absolute size-2.5 rounded-full", showBoard && "uni-anim")}
                    style={{
                      left: dart.x,
                      top: dart.y,
                      background: index % 2 ? GREEN : BLUE,
                      animation: showBoard ? `uni-dart .55s ${EASE} ${index * 90}ms both` : undefined,
                    }}
                  />
                ))}
              </div>
              <div>
                <p className="text-[18px] font-semibold leading-snug text-foreground">A chance benchmark</p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  Scattered, not aimed. A forecast needs this kind of baseline before a confident voice means anything.
                </p>
              </div>
            </div>
          </Panel>

          <div
            className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-full border border-border bg-background/95 px-4 py-2 text-[12px] transition-opacity duration-500"
            style={{ opacity: showScore ? 1 : 0 }}
          >
            <span className="text-muted-foreground">Sounds impressive</span>
            <span className="font-medium text-foreground">is not the same as beating chance</span>
          </div>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

export function StudyScaleAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([2800, 3200], rootRef, 1);
  const people = useCountUp(284, phase >= 0, 1100);
  const forecasts = useCountUp(82361, phase >= 0, 1500);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Animation of the published study scale: 284 professionals and 82,361 forecasts accumulated by 2003. The second beat notes that the count is forecasts, not a Wall Street stock-picking test."
      caption="These are the published counts. 82,361 is forecasts, not 82,361 separate questions."
    >
      <ScaledStage width={860} height={340}>
        <div className="grid h-full grid-cols-2 gap-4">
          <Panel className="flex flex-col justify-between p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Who was in the study</p>
            <p className="font-mono text-[64px] font-medium leading-none tracking-tight text-foreground">{people.toLocaleString("en-US")}</p>
            <p className="text-[15px] leading-snug text-foreground">professionals commenting on political and economic trends</p>
          </Panel>
          <Panel className="flex flex-col justify-between p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">What was collected by 2003</p>
            <p className="font-mono text-[64px] font-medium leading-none tracking-tight" style={{ color: BLUE }}>
              {forecasts.toLocaleString("en-US")}
            </p>
            <p className="text-[15px] leading-snug text-foreground">forecasts, checked against what later happened</p>
          </Panel>
          <div
            className="col-span-2 flex items-center justify-between rounded-xl border border-border bg-background px-5 py-3 text-[13px] transition-opacity duration-500"
            style={{ opacity: phase >= 1 ? 1 : 0 }}
          >
            <span className="text-muted-foreground">Political and economic forecasting</span>
            <span className="font-medium text-foreground">Not a test of Wall Street stock picking</span>
          </div>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

export function HorizonFadeAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, loop } = useGuidePhases([1600, 2200, 2800], rootRef, 2);
  const travel = phase === 0 ? "8%" : phase === 1 ? "46%" : "82%";
  const nearChance = phase >= 2;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Qualitative timeline: forecasts looking about one year ahead are marked stronger, and forecasts three to five years out drift toward a band labeled near chance. This is an illustration, not a chart of study scores."
      caption="Illustration of the horizon finding. The marks are not numerical scores from the study."
    >
      <ScaledStage width={860} height={320}>
        <Panel className="flex h-full flex-col justify-between p-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Time ahead of the question</p>
              <p className="mt-2 text-[22px] font-semibold tracking-tight text-foreground">
                {nearChance ? "Far enough out, the edge fades" : "Closer questions left more room for skill"}
              </p>
            </div>
            <span
              key={`${loop}-${phase}`}
              className="rounded-full px-3 py-1 text-[12px] font-medium"
              style={{
                background: nearChance ? "rgba(229,72,77,0.1)" : "rgba(16,185,129,0.12)",
                color: nearChance ? "#e5484d" : "#047857",
                animation: "fx-rise .35s both",
              }}
            >
              {nearChance ? "Near chance" : "Stronger"}
            </span>
          </div>

          <div className="relative mt-6 h-24">
            <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border" />
            <div
              className="absolute right-0 top-1/2 h-10 w-[28%] -translate-y-1/2 rounded-lg border border-dashed"
              style={{
                borderColor: nearChance ? "#e5484d" : "var(--border)",
                background: nearChance ? "rgba(229,72,77,0.06)" : "transparent",
              }}
            />
            <span
              className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{
                left: travel,
                background: nearChance ? "#e5484d" : GREEN,
                transition: `left 900ms ${EASE}, background 400ms ease`,
              }}
            />
            <div className="absolute inset-x-0 bottom-0 flex justify-between text-[12px] text-muted-foreground">
              <span>About 1 year</span>
              <span>3–5 years</span>
            </div>
          </div>
          <p className="text-[13px] text-muted-foreground">A finding about the questions Tetlock studied, not an expiration date for every prediction.</p>
        </Panel>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

const FOX_IDEAS = ["Politics", "Economics", "Base rates", "New evidence"];

export function ThinkingStyleAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([2200, 2200, 2200, 2600], rootRef, 3);
  const foxFocus = phase % FOX_IDEAS.length;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Two thinking styles side by side. The hedgehog keeps one big explanation. The fox moves attention across politics, economics, base rates, and new evidence."
      caption="Hedgehog: one overarching explanation. Fox: several perspectives, including a willingness to reconsider."
    >
      <ScaledStage width={860} height={360}>
        <div className="grid h-full grid-cols-2 gap-4">
          <Panel className="flex flex-col p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Hedgehog</p>
            <div className="mt-4 flex flex-1 items-center justify-center">
              <div className="grid size-36 place-items-center rounded-full border border-foreground text-center">
                <p className="px-4 text-[15px] font-semibold leading-snug text-foreground">One big explanation</p>
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground">The story stays fixed, even when the question changes.</p>
          </Panel>
          <Panel className="flex flex-col p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Fox</p>
            <div className="mt-4 grid flex-1 grid-cols-2 content-center gap-2">
              {FOX_IDEAS.map((idea, index) => {
                const on = index === foxFocus;
                return (
                  <div
                    key={idea}
                    className="rounded-lg border px-3 py-3 text-[13px] font-medium transition-all duration-500"
                    style={{
                      borderColor: on ? BLUE : "var(--border)",
                      background: on ? "rgba(47,111,237,0.08)" : "transparent",
                      transform: on ? "translateY(-2px)" : undefined,
                    }}
                  >
                    {idea}
                    {on && phase === 3 && idea === "New evidence" ? (
                      <span className="mt-1 block text-[11px] font-normal text-muted-foreground">Reconsider</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <p className="text-[13px] text-muted-foreground">Several views. Room to change one of them.</p>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

const SCORE_FIELDS = [
  { label: "Event", vague: "Inflation will fall", specific: "CPI above 3%" },
  { label: "Deadline", vague: "Eventually", specific: "Dec 31, 2026" },
  { label: "Probability", vague: "—", specific: "35%" },
  { label: "Benchmark", vague: "—", specific: "Last year’s rate" },
  { label: "Result", vague: "No one checks", specific: "Score it later" },
];

export function ForecastScorecardAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([700, 700, 700, 700, 700, 2400], rootRef, 5);
  const revealed = Math.min(SCORE_FIELDS.length, phase);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A worked example comparing a vague inflation remark with a forecast that names the event, deadline, probability, benchmark, and a plan to score it. The 35 percent figure is an example for the exercise, not a result from the study."
      caption="Worked example for this lesson. The 35% figure is not a result from Tetlock’s study."
    >
      <ScaledStage width={860} height={420}>
        <div className="grid h-full grid-cols-2 gap-4">
          {(["Vague", "Specific enough to score"] as const).map((title) => {
            const specific = title !== "Vague";
            return (
              <Panel key={title} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-[13px] font-semibold text-foreground">{title}</p>
                  <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    {specific ? "Example" : "Hard to check"}
                  </span>
                </div>
                <ul>
                  {SCORE_FIELDS.map((field, index) => {
                    const show = !specific || index < revealed;
                    return (
                      <li key={field.label} className="grid grid-cols-[7.2rem_1fr] items-center gap-2 border-b border-border/70 px-4 py-2.5 last:border-b-0">
                        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{field.label}</span>
                        <span
                          className={cn("text-[14px]", specific ? "font-medium text-foreground" : "text-muted-foreground")}
                          style={{ opacity: show ? 1 : 0.25, transition: "opacity 280ms ease" }}
                        >
                          {specific ? field.specific : field.vague}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            );
          })}
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

const MARKET_CHECKS = ["Resolution rules", "Observation date", "Price history", "Eventual outcome"];

export function MarketQuestionsAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([900, 900, 900, 900, 2600], rootRef, 4);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A prediction-market contract card. Resolution rules, observation date, price history, and the eventual outcome light up one at a time. A closing line says the original study does not by itself prove markets beat experts."
      caption="The same five questions, applied to a contract. This does not show that a market beat the experts."
    >
      <ScaledStage width={860} height={360}>
        <Panel className="mx-auto flex h-full w-[520px] flex-col p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Kalshi or Polymarket contract</p>
          <p className="mt-2 text-[22px] font-semibold tracking-tight text-foreground">What has to happen, and when is it scored?</p>
          <ul className="mt-5 space-y-2">
            {MARKET_CHECKS.map((check, index) => {
              const on = phase >= index;
              return (
                <li
                  key={check}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-[14px] transition-all duration-500"
                  style={{
                    borderColor: on ? GREEN : "var(--border)",
                    background: on ? "rgba(16,185,129,0.08)" : "transparent",
                  }}
                >
                  <span
                    className="grid size-5 place-items-center rounded-full text-[11px] font-semibold text-white"
                    style={{ background: on ? GREEN : "var(--muted-foreground)" }}
                  >
                    {on ? "✓" : index + 1}
                  </span>
                  {check}
                </li>
              );
            })}
          </ul>
          <p
            className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground transition-opacity duration-500"
            style={{ opacity: phase >= 4 ? 1 : 0 }}
          >
            Tetlock’s study still does not, by itself, show that a market outperformed experts.
          </p>
        </Panel>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}
