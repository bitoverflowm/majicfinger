"use client";

import { useRef, useState } from "react";

import { BLUE, GREEN, RED } from "@/components/sections/features/feature-kit";
import { EASE, GuideAnimationFigure, ScaledStage, useGuidePhases } from "@/components/content/guide-animations/guide-animation-kit";
import { InteractiveFigure, PillButton } from "@/components/university/expected-wins-animations";
import { AMBER, Eyebrow, Frames, Panel, Reveal } from "@/components/university/pythagorean-animations";

const YES = GREEN;
const NO = RED;
const RULE = AMBER;
const STEP = BLUE;

/* -------------------------------------------------------------------------- */
/* 1. Headline says YES. Rules say NO.                                        */
/* -------------------------------------------------------------------------- */

export function HeadlineVsRulesAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1600, 1800, 2000, 4200], rootRef, 3);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="A headline shows Northbridge scoring 102 points. The contract rules count only regulation time, where the score was 98, so YES loses."
      caption="Hypothetical game. Same final score. Different contract result."
    >
      <Frames />
      <ScaledStage width={860} height={300}>
        <div className="grid h-full gap-4 sm:grid-cols-2">
          <Panel className="flex flex-col justify-center p-5">
            <Eyebrow>The headline</Eyebrow>
            <p className="mt-3 font-mono text-[40px] font-semibold leading-none tabular-nums text-foreground">102</p>
            <p className="mt-2 text-[14px] text-muted-foreground">Northbridge final score</p>
            <Reveal show={phase >= 1}>
              <p className="mt-4 text-[14px] font-medium text-foreground">You bought YES on “at least 100.”</p>
            </Reveal>
          </Panel>
          <Panel className="flex flex-col justify-center p-5">
            <Eyebrow>The rules</Eyebrow>
            <Reveal show={phase >= 2}>
              <p className="mt-3 text-[14px] leading-relaxed text-foreground">
                Only <span className="font-semibold" style={{ color: RULE }}>regulation-time</span> points count.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border px-3 py-2.5">
                  <p className="text-[11px] text-muted-foreground">Regulation</p>
                  <p className="font-mono text-[22px] font-semibold tabular-nums text-foreground">98</p>
                </div>
                <div
                  className="rounded-lg border border-border px-3 py-2.5"
                  style={{
                    opacity: phase >= 3 ? 1 : 0.35,
                    background: phase >= 3 ? "rgba(239,68,68,0.08)" : undefined,
                    transition: `opacity 400ms ease, background 400ms ease`,
                  }}
                >
                  <p className="text-[11px] text-muted-foreground">Contract</p>
                  <p className="font-mono text-[22px] font-semibold tabular-nums" style={{ color: NO }}>
                    NO
                  </p>
                </div>
              </div>
            </Reveal>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Rules checklist                                                         */
/* -------------------------------------------------------------------------- */

const CHECKS = [
  { title: "Condition", body: "What exactly must happen for YES?" },
  { title: "Source", body: "Which record or provider determines it?" },
  { title: "Time", body: "Which deadline, zone, or window applies?" },
  { title: "Exceptions", body: "Postponement, correction, tie, ambiguity?" },
] as const;

export function ResolutionChecklistAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1100, 1100, 1100, 1100, 3200], rootRef, 4);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Four checklist cards appear: condition, source, time, and exceptions. Traders should answer each before treating a title as the contract."
      caption="Polymarket’s docs put source, end date, and edge cases in the rules — not just the title."
    >
      <Frames />
      <div className="grid gap-3 sm:grid-cols-2">
        {CHECKS.map((item, index) => {
          const on = phase >= index;
          return (
            <Panel
              key={item.title}
              className="px-4 py-4"
              style={{
                opacity: on ? 1 : 0.2,
                transform: on ? "none" : "translateY(8px)",
                transition: `opacity 400ms ease, transform 500ms ${EASE}`,
              }}
            >
              <Eyebrow>
                {index + 1}. {item.title}
              </Eyebrow>
              <p className="mt-2 text-[14px] leading-snug text-foreground">{item.body}</p>
            </Panel>
          );
        })}
      </div>
      <Reveal show={phase >= 4}>
        <p className="mt-4 text-[14px] text-foreground">
          The examples that matter depend on this market. Don’t carry a condition from the last contract into the next.
        </p>
      </Reveal>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Two contracts, one game                                                 */
/* -------------------------------------------------------------------------- */

export function TwoContractsSameGameExplorer() {
  const [which, setWhich] = useState<"reg" | "ot">("reg");
  const reg = which === "reg";

  return (
    <InteractiveFigure caption="Same invented game: 98 in regulation, 102 with overtime. Switch contracts.">
      <div className="flex flex-wrap gap-2">
        <PillButton active={which === "reg"} onClick={() => setWhich("reg")}>
          Regulation only
        </PillButton>
        <PillButton active={which === "ot"} onClick={() => setWhich("ot")}>
          Including overtime
        </PillButton>
      </div>
      <Panel className="mt-4 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Counted score</p>
            <p className="font-mono text-[28px] font-semibold tabular-nums text-foreground">{reg ? "98" : "102"}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Threshold</p>
            <p className="font-mono text-[28px] font-semibold tabular-nums text-foreground">≥ 100</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Result</p>
            <p className="font-mono text-[28px] font-semibold tabular-nums" style={{ color: reg ? NO : YES }}>
              {reg ? "NO" : "YES"}
            </p>
          </div>
        </div>
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground" aria-live="polite">
          {reg
            ? "Both contracts can be consistent with their rules. The headline score alone doesn’t tell you which one you own."
            : "Overtime points push the counted score over 100. Same game, opposite payout — because the rules differ."}
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Who resolves?                                                           */
/* -------------------------------------------------------------------------- */

export function WhoResolvesExplorer() {
  const [mode, setMode] = useState<"uma" | "chainlink">("uma");

  return (
    <InteractiveFigure caption="Start with the market’s own source. “Polymarket uses UMA” is not a complete answer for every contract.">
      <div className="flex flex-wrap gap-2">
        <PillButton active={mode === "uma"} onClick={() => setMode("uma")}>
          UMA-resolved
        </PillButton>
        <PillButton active={mode === "chainlink"} onClick={() => setMode("chainlink")}>
          Chainlink Up/Down
        </PillButton>
      </div>
      <Panel className="mt-4 p-5">
        {mode === "uma" ? (
          <>
            <Eyebrow>Proposal and dispute</Eyebrow>
            <p className="mt-2 text-[14px] leading-relaxed text-foreground">
              Polymarket documents UMA’s proposal-and-dispute process for these markets. Someone proposes an outcome; others
              can dispute before it finalizes.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Propose", "Challenge window", "Finalize"].map((step, index) => (
                <span
                  key={step}
                  className="rounded-md border border-border px-2.5 py-1 font-mono text-[12px] text-foreground"
                  style={{ borderColor: index === 1 ? STEP : undefined }}
                >
                  {step}
                </span>
              ))}
            </div>
          </>
        ) : (
          <>
            <Eyebrow>Reference-price observations</Eyebrow>
            <p className="mt-2 text-[14px] leading-relaxed text-foreground">
              Up/Down markets can use Chainlink TWAP resolution. Specified price observations determine the result — a
              different mechanism from UMA dispute.
            </p>
            <div className="mt-4 rounded-lg border border-border px-3 py-2.5">
              <p className="text-[12px] text-muted-foreground">Illustration</p>
              <p className="font-mono text-[15px] font-semibold text-foreground">TWAP window → YES or NO</p>
            </div>
          </>
        )}
        <p className="mt-4 text-[13px] text-muted-foreground">
          Oracle governance details are a separate lesson. Read this market’s source and rules first.
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Event end ≠ paid now                                                    */
/* -------------------------------------------------------------------------- */

const PIPELINE = [
  { title: "Event ends", detail: "What happened in the world" },
  { title: "Trading ends", detail: "Orders stop matching" },
  { title: "Resolved", detail: "Outcome confirmed / disputes done" },
  { title: "Redeemable", detail: "Winning tokens can be cashed" },
] as const;

export function ResolutionPipelineAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1200, 1200, 1200, 1200, 3600], rootRef, 4);
  const active = Math.min(3, Math.max(0, phase));

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Four steps light up in order: event ends, trading ends, market resolves, then winning tokens become redeemable."
      caption="A news alert is not proof that settlement is finished."
    >
      <Frames />
      <div className="grid gap-3 sm:grid-cols-4">
        {PIPELINE.map((step, index) => {
          const on = phase >= index;
          const current = index === active && phase < 4;
          return (
            <Panel
              key={step.title}
              className="px-3 py-3"
              style={{
                opacity: on ? 1 : 0.2,
                outline: current ? `2px solid ${STEP}` : undefined,
                outlineOffset: 2,
                transition: `opacity 400ms ease`,
              }}
            >
              <Eyebrow>Step {index + 1}</Eyebrow>
              <p className="mt-1 text-[14px] font-semibold text-foreground">{step.title}</p>
              <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{step.detail}</p>
            </Panel>
          );
        })}
      </div>
      <Reveal show={phase >= 4}>
        <p className="mt-4 text-[14px] text-foreground">
          Confirmation or a dispute can sit between the real-world ending and redemption. Check market status.
        </p>
      </Reveal>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Ambiguous wording                                                       */
/* -------------------------------------------------------------------------- */

export function AmbiguousWordingAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1600, 2000, 2200, 4000], rootRef, 3);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Two interpretations of the same vague sentence appear. A clarification panel replaces personal preference with the published process."
      caption="Don’t substitute your preferred reading for a settled answer."
    >
      <Frames />
      <ScaledStage width={860} height={280}>
        <div className="grid h-full gap-4 sm:grid-cols-[1.1fr_0.9fr]">
          <Panel className="flex flex-col justify-center p-5">
            <Eyebrow>Vague line</Eyebrow>
            <p className="mt-3 text-[16px] font-medium leading-snug text-foreground">
              “Will the deal be announced by Friday?”
            </p>
            <div className="mt-4 grid gap-2">
              {[
                { label: "Your reading", body: "Any credible leak counts" },
                { label: "Another reading", body: "Only the official press release" },
              ].map((row, index) => (
                <div
                  key={row.label}
                  className="rounded-lg border border-border px-3 py-2"
                  style={{
                    opacity: phase >= index ? 1 : 0.2,
                    transition: "opacity 400ms ease",
                  }}
                >
                  <p className="text-[11px] text-muted-foreground">{row.label}</p>
                  <p className="text-[13px] text-foreground">{row.body}</p>
                </div>
              ))}
            </div>
          </Panel>
          <Reveal show={phase >= 2}>
            <Panel className="flex h-full flex-col justify-center p-5">
              <Eyebrow>What to use instead</Eyebrow>
              <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-foreground">
                <li>Published additional context</li>
                <li>Clarification / dispute process</li>
                <li>What the resolution process decided</li>
              </ul>
              <Reveal show={phase >= 3}>
                <p className="mt-4 text-[12.5px] text-muted-foreground">
                  Clarifications can arrive after trading starts, within limits on changing the question’s fundamental intent.
                </p>
              </Reveal>
            </Panel>
          </Reveal>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Finish the sentence                                                     */
/* -------------------------------------------------------------------------- */

const SENTENCE = {
  condition: "Northbridge scores ≥ 100 in regulation",
  source: "the league’s official box score",
  window: "end of regulation, local tip-off date",
} as const;

export function ResolutionSentenceExplorer() {
  const [show, setShow] = useState<"condition" | "source" | "window" | "full">("condition");

  return (
    <InteractiveFigure caption="Before buying YES, finish this sentence for the actual market in front of you.">
      <div className="flex flex-wrap gap-2">
        <PillButton active={show === "condition"} onClick={() => setShow("condition")}>
          Condition
        </PillButton>
        <PillButton active={show === "source"} onClick={() => setShow("source")}>
          Source
        </PillButton>
        <PillButton active={show === "window"} onClick={() => setShow("window")}>
          Window
        </PillButton>
        <PillButton active={show === "full"} onClick={() => setShow("full")}>
          Full sentence
        </PillButton>
      </div>
      <Panel className="mt-4 p-5">
        <Eyebrow>Hypothetical worked example</Eyebrow>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground" aria-live="polite">
          {show === "full" ? (
            <>
              I get the winning payout if{" "}
              <span className="font-semibold" style={{ color: RULE }}>
                {SENTENCE.condition}
              </span>
              , according to{" "}
              <span className="font-semibold" style={{ color: STEP }}>
                {SENTENCE.source}
              </span>
              , within{" "}
              <span className="font-semibold" style={{ color: YES }}>
                {SENTENCE.window}
              </span>
              .
            </>
          ) : show === "condition" ? (
            <>
              I get the winning payout if{" "}
              <span className="font-semibold" style={{ color: RULE }}>
                {SENTENCE.condition}
              </span>
              …
            </>
          ) : show === "source" ? (
            <>
              …according to{" "}
              <span className="font-semibold" style={{ color: STEP }}>
                {SENTENCE.source}
              </span>
              …
            </>
          ) : (
            <>
              …within{" "}
              <span className="font-semibold" style={{ color: YES }}>
                {SENTENCE.window}
              </span>
              .
            </>
          )}
        </p>
        <p className="mt-4 text-[13px] text-muted-foreground">
          Swap in the real condition, source, and window from the market page before you size the trade.
        </p>
      </Panel>
    </InteractiveFigure>
  );
}
