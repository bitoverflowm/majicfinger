"use client";

import { useRef, useState } from "react";

import { GuideAnimationFigure, ScaledStage, useGuidePhases } from "@/components/content/guide-animations/guide-animation-kit";
import { InteractiveFigure, PillButton } from "@/components/university/expected-wins-animations";
import { AMBER, Eyebrow, Frames, Panel } from "@/components/university/pythagorean-animations";
import { BLUE, GREEN, RED } from "@/components/sections/features/feature-kit";

const NEWS = AMBER;
const YES = GREEN;
const NO = RED;

const DAY_START = 3 * 60;
const DAY_END = 10 * 60;

type Kind = "news" | "yes" | "no";

type Mark = {
  id: string;
  minutes: number;
  clock: string;
  short: string;
  detail: string;
  kind: Kind;
};

const MARKS: Mark[] = [
  {
    id: "anadolu",
    minutes: 3 * 60 + 8,
    clock: "03:08",
    short: "Replacement effort reported",
    detail: "Anadolu Agency, in Lychee’s Google News feed. The push to replace the speaker is already public.",
    kind: "news",
  },
  {
    id: "yes",
    minutes: 8 * 60 + 16,
    clock: "08:16",
    short: "215 YES bought",
    detail: "Contestable-Parfait buys 215 YES shares at about 70.93¢.",
    kind: "yes",
  },
  {
    id: "nominee",
    minutes: 8 * 60 + 26,
    clock: "08:26",
    short: "Nominee named",
    detail: "The Times of Israel reports that the bloc agreed to nominate Matan Kahana.",
    kind: "news",
  },
  {
    id: "no",
    minutes: 9 * 60 + 35,
    clock: "09:35",
    short: "108 NO bought",
    detail: "The same wallet buys 108 NO shares at 88¢. Ten seconds later it merges 108 pairs.",
    kind: "no",
  },
];

const colorOf = (kind: Kind) => (kind === "yes" ? YES : kind === "no" ? NO : NEWS);

function xOf(minutes: number, width: number) {
  return ((minutes - DAY_START) / (DAY_END - DAY_START)) * width;
}

export function TradeNewsTimeline() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase, reduced } = useGuidePhases([900, 1400, 1600, 1800, 4200], rootRef, 4);
  const revealed = reduced ? MARKS.length : Math.min(MARKS.length, phase);
  const [picked, setPicked] = useState<string | null>(null);
  const active = picked && MARKS.findIndex((mark) => mark.id === picked) < revealed ? picked : MARKS[Math.max(0, revealed - 1)]?.id;
  const mark = MARKS.find((item) => item.id === active) ?? MARKS[0];
  const yes = MARKS[1];
  const nominee = MARKS[2];
  const showGap = revealed >= 3;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="November 10 timeline in UTC. A news report at 03:08, a 215-share YES buy at 08:16, the nomination report at 08:26, and a 108-share NO buy at 09:35. The YES buy sits about ten minutes before the nomination report."
      caption="November 10, 2026, UTC. Click a marker. The ten-minute gap is the nomination report, not the first story of the day."
    >
      <Frames />
      <ScaledStage width={860} height={360}>
        <div className="flex h-full flex-col justify-between px-2">
          <div className="flex items-center justify-between">
            <Eyebrow>November 10 · UTC</Eyebrow>
            <span className="font-mono text-[11px] text-muted-foreground">Click a time</span>
          </div>
          <div className="relative h-[72px] w-[820px]">
            <div className="absolute left-0 right-0 top-3 h-px bg-border" />
            {[3, 6, 8, 10].map((hour) => (
              <span
                key={hour}
                className="absolute top-8 font-mono text-[11px] text-muted-foreground"
                style={{ left: xOf(hour * 60, 820), transform: "translateX(-50%)" }}
              >
                {String(hour).padStart(2, "0")}:00
              </span>
            ))}
            {MARKS.map((item, index) => {
              const shown = index < revealed;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!shown}
                  aria-label={`${item.clock} ${item.short}`}
                  aria-pressed={active === item.id}
                  onClick={() => setPicked(item.id)}
                  className="absolute top-1.5 size-3 -translate-x-1/2 rounded-full border-2 border-background disabled:pointer-events-none"
                  style={{
                    left: xOf(item.minutes, 820),
                    background: colorOf(item.kind),
                    opacity: shown ? 1 : 0,
                    boxShadow: active === item.id ? `0 0 0 4px ${colorOf(item.kind)}33` : undefined,
                    transition: "opacity 400ms ease",
                  }}
                />
              );
            })}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {MARKS.map((item, index) => {
              const shown = index < revealed;
              const selected = active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!shown}
                  onClick={() => setPicked(item.id)}
                  aria-pressed={selected}
                  className="rounded-lg border px-2.5 py-2 text-left transition-opacity disabled:pointer-events-none"
                  style={{
                    opacity: shown ? 1 : 0,
                    borderColor: selected ? colorOf(item.kind) : "var(--border)",
                    background: "var(--background)",
                  }}
                >
                  <span className="block font-mono text-[11px]" style={{ color: colorOf(item.kind) }}>
                    {item.clock}
                  </span>
                  <span className="mt-0.5 block text-[12px] font-medium leading-tight text-foreground">{item.short}</span>
                </button>
              );
            })}
          </div>
          <Panel className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="font-mono text-[12px]" style={{ color: colorOf(mark.kind) }}>
                {mark.clock} UTC
              </p>
              <p className="text-[14px] leading-snug text-foreground">{mark.detail}</p>
            </div>
            <p
              className="shrink-0 text-right font-mono text-[13px] leading-tight"
              style={{ color: showGap ? YES : "var(--muted-foreground)", opacity: showGap ? 1 : 0.4 }}
            >
              {yes.clock} → {nominee.clock}
              <span className="mt-0.5 block text-[12px]">10 minutes</span>
            </p>
          </Panel>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

const HEADLINES = [
  {
    id: "nominee",
    label: "The nomination report",
    clock: "08:26",
    source: "The Times of Israel",
    line: "The bloc agreed to nominate Matan Kahana.",
    verdict: "Before this headline",
    gap: "The 08:16 YES buy leads this report by about 10 minutes.",
    before: true,
  },
  {
    id: "earlier",
    label: "The earlier story",
    clock: "03:08",
    source: "Anadolu Agency, via Google News",
    line: "The push to replace the speaker was already being reported.",
    verdict: "After this headline",
    gap: "The same YES buy lands 5 hours and 8 minutes after this report.",
    before: false,
  },
] as const;

export function WhichHeadlineExplorer() {
  const [id, setId] = useState<(typeof HEADLINES)[number]["id"]>("nominee");
  const headline = HEADLINES.find((item) => item.id === id) ?? HEADLINES[0];
  const buyAt = 58;
  const newsAt = headline.before ? 78 : 16;

  return (
    <InteractiveFigure caption="Same fill. Change the headline and the “before the news” claim changes with it.">
      <div className="flex flex-wrap gap-2">
        {HEADLINES.map((item) => (
          <PillButton key={item.id} active={item.id === id} onClick={() => setId(item.id)}>
            {item.label}
          </PillButton>
        ))}
      </div>
      <div className="relative mt-6 h-16">
        <div className="absolute left-0 right-0 top-3 h-px bg-border" />
        <span className="absolute top-6 font-mono text-[11px] text-muted-foreground" style={{ left: `${buyAt}%`, transform: "translateX(-50%)" }}>
          08:16 YES
        </span>
        <span className="absolute top-0 size-3 -translate-x-1/2 rounded-full border-2 border-background" style={{ left: `${buyAt}%`, background: YES }} />
        <span
          className="absolute top-0 size-3 -translate-x-1/2 rounded-full border-2 border-background transition-all duration-500"
          style={{ left: `${newsAt}%`, background: NEWS }}
        />
        <span
          className="absolute top-6 font-mono text-[11px] transition-all duration-500"
          style={{ left: `${newsAt}%`, transform: "translateX(-50%)", color: NEWS }}
        >
          {headline.clock} news
        </span>
      </div>
      <Panel className="mt-2 px-4 py-3">
        <Eyebrow>{headline.source}</Eyebrow>
        <p className="mt-1 text-[15px] leading-snug text-foreground">{headline.line}</p>
        <p className="mt-2 font-mono text-[13px]" style={{ color: headline.before ? YES : BLUE }}>
          {headline.verdict}. {headline.gap}
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

const CONTRACT_PHASES = [1600, 1800, 2200, 3200] as const;

export function ContractQuestionAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases(CONTRACT_PHASES, rootRef, 3);
  const showContract = phase >= 1;
  const showVote = phase >= 2;
  const showResolve = phase >= 3;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="The headline says opposition leaders agreed on a nominee. The contract asks whether the Knesset elects a speaker by November 13. Later coverage says the vote was set for the following Tuesday, past that deadline. The contract resolved NO."
      caption="A nomination is one step. The November 13 contract asked whether a speaker would be elected by that date."
    >
      <Frames />
      <div className="grid gap-3 md:grid-cols-2">
        <Panel className="px-4 py-3">
          <Eyebrow>Headline · 08:26 UTC</Eyebrow>
          <p className="mt-2 text-[15px] font-medium leading-snug text-foreground">Bloc agrees to nominate Matan Kahana.</p>
          <p className="mt-1 text-[13px] text-muted-foreground">The Times of Israel live update.</p>
        </Panel>
        <Panel className="px-4 py-3" style={{ opacity: showContract ? 1 : 0.35, transition: "opacity 400ms ease" }}>
          <Eyebrow>Contract</Eyebrow>
          <p className="mt-2 text-[15px] font-medium leading-snug text-foreground">Will the Knesset elect a new Speaker by November 13?</p>
          <p className="mt-1 text-[13px] text-muted-foreground">A separate market from November 6, November 30, and December 31.</p>
        </Panel>
      </div>
      <Panel className="mt-3 px-4 py-3" style={{ opacity: showVote ? 1 : 0, transition: "opacity 400ms ease" }}>
        <p className="text-[14px] leading-snug text-foreground">
          Later that day, the speaker said the vote would be held the following Tuesday.
        </p>
        <p
          className="mt-2 font-mono text-[13px]"
          style={{ color: showResolve ? NO : "var(--muted-foreground)", opacity: showResolve ? 1 : 0, transition: "opacity 400ms ease" }}
        >
          The November 13 contract resolved NO.
        </p>
      </Panel>
    </GuideAnimationFigure>
  );
}
