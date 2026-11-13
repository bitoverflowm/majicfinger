"use client";

import { BadgeCheck, Check, Loader2 } from "lucide-react";
import { useRef } from "react";

import { FeatureWindow, useInView, useReducedMotion } from "@/components/sections/features/feature-kit";
import { cn } from "@/lib/utils";
import { typedLength, useStepClock } from "./jarvis-kit";
import { JarvisOrb } from "./jarvis-orb";

type Scenario = {
  tab: string;
  intent: string;
  post: { name: string; handle: string; color: string; text: string };
  mention: { name: string; handle: string; color: string; text: string };
  scanning: string;
  reply: string;
};

const SCENARIOS: readonly Scenario[] = [
  {
    tab: "Does the data back this?",
    intent: "verify",
    post: {
      name: "Macro Maria",
      handle: "macro_maria",
      color: "bg-rose-500",
      text: "December cut is a done deal. Markets have it priced like a lock.",
    },
    mention: { name: "Dev", handle: "devtrades", color: "bg-sky-500", text: "@lychee_data does the data back this?" },
    scanning: "Checking Kalshi + Polymarket prices",
    reply:
      "Lychee data lines up with that.\nKalshi · Fed cuts rates in December? · 78¢\nPolymarket agrees at 77¢, and top holders added YES this week.\nlycheedata.com/jarvis",
  },
  {
    tab: "Is there a market for this?",
    intent: "market_for",
    post: {
      name: "Crypto Kai",
      handle: "kai_onchain",
      color: "bg-violet-500",
      text: "If staking ETFs get approved, ETH runs to 6K before New Year. Calling it.",
    },
    mention: { name: "Sam", handle: "samtheshort", color: "bg-emerald-500", text: "@lychee_data is there a market for this?" },
    scanning: "Searching listed markets on both venues",
    reply:
      "Yes — 2 listed.\nPoly · Ethereum above $6,000 by December 31? · 14¢\nKalshi · ETH staking ETFs approved this year? · 38¢\nThe market thinks approval is likely; 6K much less so.\nlycheedata.com/jarvis",
  },
  {
    tab: "Who's buying?",
    intent: "holders",
    post: {
      name: "Desk Notes",
      handle: "desknotes",
      color: "bg-amber-500",
      text: "Someone just walked into the recession market with size.",
    },
    mention: { name: "Rita", handle: "rita_quant", color: "bg-indigo-500", text: "@lychee_data who's actually buying?" },
    scanning: "Pulling holders and the recent tape",
    reply:
      "Yes — 1 listed.\nPoly · US recession in 2026? · 31¢\nWallet 0x7a3f…c91e bought $182K of YES in 2h. 3 brand-new wallets followed.\nlycheedata.com/jarvis",
  },
];

const MENTION_AT = 500;
const INTENT_AT = 1400;
const REPLY_AT = 3200;
const TYPE_MS = 2600;
const POSTED_AT = REPLY_AT + TYPE_MS + 900;
const DURATIONS = SCENARIOS.map(() => POSTED_AT + 2600);

export function XMentionDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const reduced = useReducedMotion();
  const { step, t, run, goTo } = useStepClock(DURATIONS, inView && !reduced);
  const scenario = SCENARIOS[step];
  const elapsed = reduced ? DURATIONS[step] : t;
  const typed = typedLength(scenario.reply, elapsed - REPLY_AT, TYPE_MS);
  const posted = elapsed >= POSTED_AT;

  return (
    <div ref={rootRef} className="size-full">
      <FeatureWindow title="X · @lychee_data" className="size-full">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="grid shrink-0 grid-cols-3 gap-1 border-b border-border p-1.5">
            {SCENARIOS.map((item, i) => {
              const active = i === step;
              return (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-pressed={active}
                  className={cn(
                    "relative flex h-8 min-w-0 items-center justify-center overflow-hidden rounded-md px-1.5 text-[11px] font-medium transition-colors",
                    active ? "bg-muted text-primary" : "text-muted-foreground hover:bg-muted hover:text-primary",
                  )}
                >
                  <span className="truncate">{item.tab}</span>
                  {active && !reduced ? (
                    <span
                      key={run}
                      className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[#2f6fed] [animation:fx-fill_linear_both]"
                      style={{ animationDuration: `${DURATIONS[i]}ms` }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div key={run} className="relative min-h-0 flex-1 overflow-hidden px-3 pt-3 sm:px-4">
            <Post {...scenario.post} />
            {elapsed >= MENTION_AT ? (
              <div className="[animation:jx-pop_.45s_both]">
                <Post {...scenario.mention} reply />
              </div>
            ) : null}

            {elapsed >= INTENT_AT && elapsed < REPLY_AT ? (
              <div className="ml-11 mt-1 flex w-fit items-center gap-2 rounded-md border border-border bg-muted/60 px-2 py-1 text-[10.5px] [animation:jx-pop_.35s_both]">
                <Loader2 className="size-3 animate-spin text-secondary" />
                <span className="font-mono text-primary">intent: {scenario.intent}</span>
                <span className="hidden text-muted-foreground sm:inline">{scenario.scanning}</span>
              </div>
            ) : null}

            {elapsed >= REPLY_AT ? (
              <div className="mt-1 flex gap-3 [animation:jx-pop_.45s_both]">
                <div className="flex w-8 shrink-0 flex-col items-center">
                  <JarvisOrb className="w-9" />
                </div>
                <div className="min-w-0 flex-1 pb-3">
                  <p className="flex items-center gap-1 text-[12px]">
                    <span className="font-semibold text-primary">Lychee</span>
                    <BadgeCheck className="size-3.5 text-secondary" />
                    <span className="truncate text-muted-foreground">@lychee_data · now</span>
                    <span
                      className={cn(
                        "ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[9.5px] font-medium transition-colors duration-500",
                        posted ? "bg-[#10b981]/15 text-[#0f9f6e]" : "bg-amber-400/15 text-amber-600",
                      )}
                    >
                      {posted ? <Check className="size-2.5" strokeWidth={3} /> : null}
                      {posted ? "Posted" : "Dry run"}
                    </span>
                  </p>
                  <p className="mt-0.5 whitespace-pre-line text-[12px] leading-relaxed text-primary">
                    {scenario.reply.slice(0, typed)}
                    {typed < scenario.reply.length ? (
                      <span className="ml-px inline-block h-3 w-px translate-y-0.5 animate-pulse bg-primary" />
                    ) : null}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex h-7 shrink-0 items-center justify-between gap-2 border-t border-border px-3 text-[10px] text-muted-foreground">
            <span>Mention → Lychee research → reply</span>
            <span className="font-mono">{posted ? "live" : "dry run first"}</span>
          </div>
        </div>
      </FeatureWindow>
    </div>
  );
}

function Post({
  name,
  handle,
  color,
  text,
  reply,
}: {
  name: string;
  handle: string;
  color: string;
  text: string;
  reply?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex w-8 shrink-0 flex-col items-center">
        <span className={cn("flex size-8 items-center justify-center rounded-full text-[12px] font-semibold text-white", color)}>
          {name[0]}
        </span>
        <span className="mt-1 w-px flex-1 bg-border" />
      </div>
      <div className="min-w-0 flex-1 pb-3">
        <p className="flex items-center gap-1 text-[12px]">
          <span className="font-semibold text-primary">{name}</span>
          <span className="truncate text-muted-foreground">@{handle} · {reply ? "1m" : "8m"}</span>
        </p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-primary">
          {text.split(/(@lychee_data)/).map((part, i) =>
            part === "@lychee_data" ? (
              <span key={i} className="text-secondary">
                {part}
              </span>
            ) : (
              part
            ),
          )}
        </p>
      </div>
    </div>
  );
}
