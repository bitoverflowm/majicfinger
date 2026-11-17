"use client";

import { useRef, useState } from "react";

import { BLUE, GREEN, RED } from "@/components/sections/features/feature-kit";
import { EASE, GuideAnimationFigure, ScaledStage, useGuidePhases } from "@/components/content/guide-animations/guide-animation-kit";
import { InteractiveFigure, PillButton } from "@/components/university/expected-wins-animations";
import { AMBER, Eyebrow, Frames, Panel, Reveal } from "@/components/university/pythagorean-animations";

const YES = GREEN;
const NO = RED;
const NOW = AMBER;
const NOTE = BLUE;

function cents(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toFixed(Number.isInteger(rounded) ? 0 : 1)}¢`;
}

function sharesLabel(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/* -------------------------------------------------------------------------- */
/* 1. Live price vs holder average                                            */
/* -------------------------------------------------------------------------- */

export function YesNowVsEntryAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1600, 1800, 2000, 4000], rootRef, 3);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="YES trades at 30.5 cents while holders still holding YES paid 24.54 cents on average. Most of those shares belong to one wallet."
      caption="November 17, 2026 snapshot · three consecutive Fed rate hikes contract."
    >
      <Frames />
      <ScaledStage width={860} height={260}>
        <div className="grid h-full gap-4 sm:grid-cols-2">
          <Panel className="flex flex-col justify-center p-5">
            <Eyebrow>YES on the screen</Eyebrow>
            <p className="mt-3 font-mono text-[44px] font-semibold leading-none tabular-nums" style={{ color: NOW }}>
              30.5¢
            </p>
            <p className="mt-2 text-[13px] text-muted-foreground">Snapshot display price</p>
          </Panel>
          <Panel className="flex flex-col justify-center p-5">
            <Eyebrow>YES holders paid</Eyebrow>
            <Reveal show={phase >= 1}>
              <p className="mt-3 font-mono text-[44px] font-semibold leading-none tabular-nums" style={{ color: YES }}>
                24.54¢
              </p>
              <p className="mt-2 text-[13px] text-muted-foreground">Average entry across shares still held</p>
            </Reveal>
            <Reveal show={phase >= 2}>
              <p className="mt-4 text-[14px] text-foreground">
                About <span className="font-mono font-semibold">+6¢</span> per share vs that average — before asking who owns the book.
              </p>
            </Reveal>
          </Panel>
        </div>
      </ScaledStage>
      <Reveal show={phase >= 3}>
        <p className="mt-4 text-[14px] text-foreground">
          Most of those YES shares belonged to one wallet. The chart’s tall bar is not a crowd — it’s mostly puravida.
        </p>
      </Reveal>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. YES vs NO entry cards                                                   */
/* -------------------------------------------------------------------------- */

export function YesNoEntrySidesAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1400, 1600, 1800, 4000], rootRef, 3);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="YES averaged 24.54 cents across 3,664 shares. NO averaged 69.58 cents across 2,848 shares with a recorded entry, while 816 NO shares had no recorded entry."
      caption="12 YES positions and 20 NO positions in the holder response."
    >
      <Frames />
      <div className="grid gap-3 sm:grid-cols-2">
        <Panel className="px-4 py-4" style={{ opacity: phase >= 0 ? 1 : 0.2, transition: "opacity 400ms ease" }}>
          <Eyebrow>YES</Eyebrow>
          <p className="mt-2 font-mono text-[28px] font-semibold tabular-nums" style={{ color: YES }}>
            24.54¢
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">{sharesLabel(3664.37)} shares · every position had an entry</p>
          <Reveal show={phase >= 2}>
            <p className="mt-3 text-[13px] text-foreground">
              At 30.5¢, about <span className="font-mono font-semibold">+6¢</span> vs average entry.
            </p>
          </Reveal>
        </Panel>
        <Panel className="px-4 py-4" style={{ opacity: phase >= 1 ? 1 : 0.2, transition: "opacity 400ms ease" }}>
          <Eyebrow>NO</Eyebrow>
          <p className="mt-2 font-mono text-[28px] font-semibold tabular-nums" style={{ color: NO }}>
            69.58¢
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">{sharesLabel(2848.18)} shares with a recorded entry</p>
          <Reveal show={phase >= 2}>
            <p className="mt-3 text-[13px] text-foreground">
              Snapshot NO at 69.5¢ — within a tenth of a cent of known-cost average.
            </p>
          </Reveal>
        </Panel>
      </div>
      <Reveal show={phase >= 3}>
        <p className="mt-4 text-[14px] text-foreground">
          Another <span className="font-mono font-semibold">{sharesLabel(816.18)}</span> NO shares had no recorded entry price. That gap changes how you read the side.
        </p>
      </Reveal>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Missing entry prices                                                    */
/* -------------------------------------------------------------------------- */

export function MissingEntryExplorer() {
  const [mode, setMode] = useState<"known" | "zero">("known");
  const known = 69.58;
  const pretendZero = 54.08;
  const shown = mode === "known" ? known : pretendZero;

  return (
    <InteractiveFigure caption="Same NO book. Switch between the known-cost average and what happens if missing entries are treated as zero.">
      <div className="flex flex-wrap gap-2">
        <PillButton active={mode === "known"} onClick={() => setMode("known")}>
          Known costs only
        </PillButton>
        <PillButton active={mode === "zero"} onClick={() => setMode("zero")}>
          Treat missing as 0¢
        </PillButton>
      </div>
      <Panel className="mt-4 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">NO average</p>
            <p className="font-mono text-[24px] font-semibold tabular-nums" style={{ color: NO }}>
              {cents(shown)}
            </p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">NO now</p>
            <p className="font-mono text-[24px] font-semibold tabular-nums text-foreground">69.5¢</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Missing entry shares</p>
            <p className="font-mono text-[24px] font-semibold tabular-nums" style={{ color: NOTE }}>
              {sharesLabel(816.18)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground" aria-live="polite">
          {mode === "known"
            ? "Holders with recorded costs were near break-even vs 69.5¢. We can establish that much."
            : "Counting the 816.18 shares as free drops the average to 54.08¢ and makes NO look comfortably ahead. What those shares cost is unknown."}
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Tall histogram bars                                                     */
/* -------------------------------------------------------------------------- */

export function SupplyBandExplorer() {
  const [side, setSide] = useState<"yes" | "no">("yes");
  const yes = { band: "23–24¢", pct: 82.2, who: "puravida", detail: "Every share in that bar belonged to one wallet." };
  const no = { band: "67–68¢", pct: 65.1, who: "several holders", detail: "Share of NO shares with a known entry in that band." };
  const active = side === "yes" ? yes : no;

  return (
    <InteractiveFigure caption="Where the supply was bought · Shares metric. A tall bar can be one large wallet.">
      <div className="flex flex-wrap gap-2">
        <PillButton active={side === "yes"} onClick={() => setSide("yes")}>
          YES · 23–24¢
        </PillButton>
        <PillButton active={side === "no"} onClick={() => setSide("no")}>
          NO · 67–68¢
        </PillButton>
      </div>
      <Panel className="mt-4 p-5">
        <Eyebrow>{side === "yes" ? "YES heaviest band" : "NO heaviest known-entry band"}</Eyebrow>
        <div className="mt-3 flex items-end gap-3">
          <div className="w-16">
            <div
              className="mx-auto w-10 rounded-t-md"
              style={{
                height: `${Math.max(36, active.pct * 1.6)}px`,
                background: side === "yes" ? YES : NO,
                transition: `height 400ms ${EASE}`,
              }}
            />
            <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">{active.band}</p>
          </div>
          <div>
            <p className="font-mono text-[32px] font-semibold tabular-nums text-foreground">{active.pct.toFixed(1)}%</p>
            <p className="text-[13px] text-muted-foreground">of {side === "yes" ? "YES shares" : "known-entry NO shares"}</p>
            <p className="mt-2 text-[14px] text-foreground" aria-live="polite">
              {active.detail} Owner of the story: <span className="font-semibold">{active.who}</span>.
            </p>
          </div>
        </div>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Puravida fill vs position average                                       */
/* -------------------------------------------------------------------------- */

export function PuravidaFillVsAvgAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1400, 1600, 1800, 4000], rootRef, 3);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Puravida bought 3,084 shares at 22.78 cents, then sold later. Remaining shares sit in the 23 to 24 cent bar at a 23.71 cent average entry."
      caption="Position average is not the same as any one fill."
    >
      <Frames />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { title: "Big buy", value: "22.78¢", detail: "3,084.47 shares", on: phase >= 0 },
          { title: "Earlier buy", value: "27¢", detail: "52 shares", on: phase >= 1 },
          { title: "Remaining avg", value: "23.71¢", detail: "3,011.22 shares still held", on: phase >= 2 },
        ].map((card) => (
          <Panel
            key={card.title}
            className="px-4 py-4"
            style={{ opacity: card.on ? 1 : 0.2, transition: "opacity 400ms ease" }}
          >
            <Eyebrow>{card.title}</Eyebrow>
            <p className="mt-2 font-mono text-[24px] font-semibold tabular-nums" style={{ color: YES }}>
              {card.value}
            </p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">{card.detail}</p>
          </Panel>
        ))}
      </div>
      <Reveal show={phase >= 3}>
        <p className="mt-4 text-[14px] text-foreground">
          The big purchase went through below 23¢, yet the remaining holding sits in the 23–24¢ bar. Lychee places the current
          holding at the position record’s average entry. For a particular purchase, open that fill.
        </p>
      </Reveal>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. How-to steps                                                            */
/* -------------------------------------------------------------------------- */

const STEPS = [
  { title: "Choose the exact contract", body: "An event can hold several questions. Open the YES/NO pair you mean." },
  { title: "Read each side vs its price", body: "Compare YES entry with YES now, then NO with NO. Note missing entries." },
  { title: "Follow the tallest bar", body: "Find wallets in that band. One wallet can own the bar." },
  { title: "Open the large holder", body: "Check buys and sells in the same market — then portfolio share if needed." },
] as const;

export function EntryPriceCheckStepsAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1100, 1100, 1100, 1100, 3200], rootRef, 4);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Four steps for checking holder entry prices: choose the contract, compare each side to its price, follow the tallest histogram bar, then open the large holder."
      caption="For a known-cost average, weight only shares with recorded entries."
    >
      <Frames />
      <div className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((step, index) => (
          <Panel
            key={step.title}
            className="px-4 py-4"
            style={{
              opacity: phase >= index ? 1 : 0.2,
              transform: phase >= index ? "none" : "translateY(8px)",
              transition: `opacity 400ms ease, transform 500ms ${EASE}`,
            }}
          >
            <Eyebrow>Step {index + 1}</Eyebrow>
            <p className="mt-1 text-[15px] font-semibold text-foreground">{step.title}</p>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{step.body}</p>
          </Panel>
        ))}
      </div>
      <Reveal show={phase >= 4}>
        <p className="mt-4 text-[14px] text-foreground">
          The overview’s average can include a zero entry field. Multiply recorded entries by shares still held, then divide by
          shares with recorded entries.
        </p>
      </Reveal>
    </GuideAnimationFigure>
  );
}
