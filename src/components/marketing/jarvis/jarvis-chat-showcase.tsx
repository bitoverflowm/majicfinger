"use client";

import { ArrowUp, Check, Flame, Globe, Loader2, Radar, ShieldCheck, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import { SectionScrollLink } from "@/components/sections/section-scroll-link";
import { FeatureWindow, linePath, mulberry32, useInView, useReducedMotion } from "@/components/sections/features/feature-kit";
import { cn } from "@/lib/utils";
import backdrop from "../../../../public/landing/holder-hero-backdrop.jpg";
import { CHECKOUT_HREF, PRICE, PRIMARY_BUTTON, TICK_MS, typedLength, useStepClock } from "./jarvis-kit";
import { JarvisOrb } from "./jarvis-orb";

const STEPS = [
  {
    title: "Turn Jarvis on",
    body: "Say it in ChatGPT, Claude, or Cursor. Jarvis powers up and starts watching Polymarket and Kalshi for you.",
    ms: 5000,
  },
  {
    title: "Get briefed without asking",
    body: "Every turn opens with a pulse: the hottest market, the biggest print on the tape, what Kalshi has on radar.",
    ms: 6400,
  },
  {
    title: "Charts land right in the chat",
    body: "Ask for a deep dive and Lychee pulls prices, holders, and trades. Charts show up inline while the model thinks.",
    ms: 7000,
  },
  {
    title: "Say “approve” and it ships",
    body: "Publishing still waits for you, but you approve in the chat. No tab-hopping back to Lychee.",
    ms: 5800,
  },
] as const;
const DURATIONS = STEPS.map((step) => step.ms);
/** Reduced motion parks here: Jarvis on, briefed, and a chart on screen. */
const STILL_STEP = 2;
const TYPE_MS = 850;
const HOSTS = ["Claude", "ChatGPT", "Cursor"] as const;

type Item =
  | { kind: "user"; step: number; at: number; text: string }
  | { kind: "tool"; step: number; at: number; done: number; name: string; detail: string }
  | { kind: "say"; step: number; at: number; text: string }
  | { kind: "online"; step: number; at: number }
  | { kind: "alert"; step: number; at: number; tone: keyof typeof ALERT_TONES; title: string; meta: string }
  | { kind: "chart"; step: number; at: number }
  | { kind: "approval"; step: number; at: number; resolved: number }
  | { kind: "published"; step: number; at: number };

const SCRIPT: readonly Item[] = [
  { kind: "user", step: 0, at: 900, text: "Turn Jarvis on" },
  { kind: "tool", step: 0, at: 1400, done: 2400, name: "jarvis_on", detail: "power-up" },
  { kind: "online", step: 0, at: 2400 },

  { kind: "tool", step: 1, at: 300, done: 1400, name: "jarvis_pulse", detail: "scanning 2 venues" },
  { kind: "say", step: 1, at: 1500, text: "Hey — three things are moving right now:" },
  { kind: "alert", step: 1, at: 2000, tone: "hot", title: "Fed cuts rates in December?", meta: "Hottest market · $4.2M 24h volume" },
  { kind: "alert", step: 1, at: 2700, tone: "print", title: "BUY YES · $182K @ 64¢", meta: "Biggest print · 0x7a3f…c91e" },
  { kind: "alert", step: 1, at: 3400, tone: "kalshi", title: "Recession in 2026?", meta: "Kalshi on radar · KXRECSS-26" },
  { kind: "say", step: 1, at: 4500, text: "Want me to pull Lychee charts on the Fed market?" },

  { kind: "user", step: 2, at: 900, text: "Yes, dig into the Fed one" },
  { kind: "tool", step: 2, at: 1300, done: 2500, name: "pull_market_bundle", detail: "prices · holders · tape" },
  { kind: "chart", step: 2, at: 2500 },
  { kind: "say", step: 2, at: 5200, text: "Top holder is buying YES into the rally. Publish this as a research page?" },

  { kind: "approval", step: 3, at: 300, resolved: 2300 },
  { kind: "user", step: 3, at: 1800, text: "approve" },
  { kind: "tool", step: 3, at: 2300, done: 3100, name: "approve_pending", detail: "publish_project" },
  { kind: "published", step: 3, at: 3100 },
];

const ALERT_TONES = {
  hot: { icon: Flame, className: "bg-orange-500/10 text-orange-600" },
  print: { icon: Zap, className: "bg-[#a855f7]/10 text-[#a855f7]" },
  kalshi: { icon: Radar, className: "bg-[#10b981]/10 text-[#0f9f6e]" },
} as const;

const PRICES = (() => {
  const rand = mulberry32(42);
  const out: number[] = [];
  let p = 52;
  for (let i = 0; i < 48; i += 1) {
    p += (rand() - 0.42) * 1.6;
    out.push(Math.max(40, Math.min(70, p)));
  }
  out[out.length - 1] = 64;
  return out;
})();

const HOLDERS = [
  { wallet: "0x7a3f…c91e", yes: 0.92 },
  { wallet: "0x19bd…04a2", yes: 0.18 },
  { wallet: "0xe4c0…7f13", yes: 0.74 },
  { wallet: "0x5521…ab9d", yes: 0.55 },
] as const;

export function JarvisChatShowcase() {
  const rootRef = useRef<HTMLElement>(null);
  const inView = useInView(rootRef, 0.2);
  const reduced = useReducedMotion();
  const clock = useStepClock(DURATIONS, inView && !reduced);
  const step = reduced && clock.run === 0 ? STILL_STEP : clock.step;
  const t = reduced ? DURATIONS[step] : clock.t;
  const progress = Math.min(1, t / DURATIONS[step]);

  return (
    <article
      id="jarvis-demo"
      ref={rootRef}
      className="grid scroll-mt-28 overflow-hidden rounded-xl bg-muted ring-1 ring-secondary/20 lg:grid-cols-3"
    >
      <div className="p-2 sm:p-3 lg:col-span-2">
        <div className="relative h-[30rem] overflow-hidden rounded-lg sm:h-[34rem] lg:h-[38rem]">
          <Image
            src={backdrop}
            alt=""
            fill
            priority
            placeholder="blur"
            sizes="(min-width: 1344px) 860px, (min-width: 1024px) 64vw, 100vw"
            className="pointer-events-none select-none object-cover"
          />
          <div className="absolute inset-3 sm:inset-8 lg:inset-10">
            <ChatWindow step={step} t={t} run={clock.run} />
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center gap-5 p-6 sm:p-8 lg:px-8 xl:px-10">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
          <span className="rounded-full bg-gradient-to-r from-secondary to-[#7c5cff] px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-white">
            New
          </span>
          Jarvis mode
        </span>
        <h2 className="max-w-md text-xl font-normal leading-snug tracking-tight text-primary sm:text-[1.3rem]">
          One sentence turns your AI chat into a market research desk.
        </h2>

        <ol className="flex flex-col border-l border-border">
          {STEPS.map((item, index) => {
            const active = index === step;
            return (
              <li key={item.title}>
                <button
                  type="button"
                  onClick={() => clock.goTo(index)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "relative -ml-px flex w-full flex-col border-l-2 py-1.5 pl-4 text-left transition-colors duration-300",
                    active ? "border-secondary" : "border-transparent hover:border-border",
                  )}
                >
                  <span
                    className={cn(
                      "text-[15px] leading-snug transition-colors duration-300",
                      active ? "font-medium text-primary" : "text-muted-foreground hover:text-primary",
                    )}
                  >
                    {item.title}
                  </span>
                  <span
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-500 ease-out",
                      active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <span className="overflow-hidden">
                      <span className="block pt-1 text-[13.5px] leading-relaxed text-muted-foreground">{item.body}</span>
                      {reduced ? null : (
                        <span className="mt-2 block h-0.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10" aria-hidden>
                          <span
                            className="block h-full bg-secondary"
                            style={{
                              width: `${active ? progress * 100 : 0}%`,
                              transition: active && t > 0 ? `width ${TICK_MS}ms linear` : "none",
                            }}
                          />
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href={CHECKOUT_HREF} className={PRIMARY_BUTTON}>
            Preregister · {PRICE}
          </Link>
          <SectionScrollLink
            href="/jarvis#capabilities"
            sectionId="capabilities"
            className="text-sm text-secondary transition-colors hover:text-primary"
          >
            Everything Jarvis can do →
          </SectionScrollLink>
        </div>
      </div>
    </article>
  );
}

function ChatWindow({ step, t, run }: { step: number; t: number; run: number }) {
  const [hostPick, setHostPick] = useState<number | null>(null);
  const hostIndex = (hostPick ?? run) % HOSTS.length;
  const reached = (item: { step: number; at: number }) => item.step < step || (item.step === step && t >= item.at);
  const visible = SCRIPT.filter(reached);
  const online = visible.some((item) => item.kind === "online");

  const typing = SCRIPT.find(
    (item): item is Extract<Item, { kind: "user" }> =>
      item.kind === "user" && item.step === step && item.at > t && item.at - t <= TYPE_MS,
  );
  const draft = typing ? typing.text.slice(0, typedLength(typing.text, TYPE_MS - (typing.at - t), TYPE_MS * 0.8)) : "";

  return (
    <FeatureWindow title={`${HOSTS[hostIndex]} · Lychee MCP`} className="size-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
          <span className="flex min-w-0 items-center gap-2 text-[11px]">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full transition-colors duration-500",
                online ? "bg-secondary shadow-[0_0_8px_var(--secondary)]" : "bg-neutral-300 dark:bg-neutral-600",
              )}
            />
            <span className="font-medium text-primary">Jarvis</span>
            <span className="truncate text-muted-foreground">{online ? "Online · watching 2 venues" : "Off"}</span>
          </span>
          <span className="flex shrink-0 gap-0.5 rounded-md bg-muted p-0.5">
            {HOSTS.map((host, i) => (
              <button
                key={host}
                type="button"
                onClick={() => setHostPick(i)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                  i === hostIndex ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-primary",
                )}
              >
                {host}
              </button>
            ))}
          </span>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          {visible.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
              <JarvisOrb on={false} className="w-16" />
              <p className="text-[11px] text-muted-foreground">Jarvis is off. Just ask.</p>
            </div>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 p-3 sm:p-4">
            {visible.map((item) => {
              const fresh = item.step === step;
              const key = `${item.kind}-${item.step}-${item.at}`;
              return (
                <div key={key} className={cn("min-w-0", fresh && "[animation:jx-pop_.45s_cubic-bezier(.165,.84,.44,1)_both]")}>
                  <ChatItem item={item} step={step} t={t} bootKey={`${run}`} />
                </div>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background to-transparent" />
        </div>

        <div className="shrink-0 border-t border-border p-2.5">
          <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/50 pl-3 pr-1">
            <span className={cn("min-w-0 flex-1 truncate text-[12px]", draft ? "text-primary" : "text-muted-foreground")}>
              {draft || (online ? "Ask Jarvis anything…" : "Message…")}
              {draft ? <span className="ml-px inline-block h-3 w-px translate-y-0.5 animate-pulse bg-primary" /> : null}
            </span>
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors",
                draft ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              <ArrowUp className="size-3.5" />
            </span>
          </div>
        </div>
      </div>
    </FeatureWindow>
  );
}

function ChatItem({ item, step, t, bootKey }: { item: Item; step: number; t: number; bootKey: string }) {
  const passed = (at: number) => item.step < step || t >= at;
  switch (item.kind) {
    case "user":
      return (
        <p className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3 py-1.5 text-[12px] text-primary-foreground">
          {item.text}
        </p>
      );
    case "say":
      return <p className="max-w-[92%] text-[12px] leading-relaxed text-primary">{item.text}</p>;
    case "tool": {
      const done = passed(item.done);
      return (
        <div className="flex w-fit max-w-full items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2 py-1 text-[10.5px]">
          {done ? (
            <Check className="size-3 shrink-0 text-[#0f9f6e]" strokeWidth={3} />
          ) : (
            <Loader2 className="size-3 shrink-0 animate-spin text-secondary" />
          )}
          <span className="font-mono text-primary">lychee.{item.name}</span>
          <span className="truncate text-muted-foreground">{done ? "done" : item.detail}</span>
        </div>
      );
    }
    case "online":
      return (
        <div className="flex items-center gap-3 rounded-xl border border-secondary/20 bg-gradient-to-r from-secondary/10 via-[#7c5cff]/5 to-transparent p-2.5 pr-4">
          <JarvisOrb bootKey={bootKey} className="w-14 shrink-0" />
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium text-primary">Jarvis online</p>
            <p className="text-[11px] text-muted-foreground">Watching Polymarket + Kalshi. I&apos;ll brief you every turn.</p>
          </div>
        </div>
      );
    case "alert": {
      const tone = ALERT_TONES[item.tone];
      const Icon = tone.icon;
      return (
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-2.5 py-2 shadow-sm">
          <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", tone.className)}>
            <Icon className="size-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12px] font-medium text-primary">{item.title}</span>
            <span className="block truncate text-[10.5px] text-muted-foreground">{item.meta}</span>
          </span>
        </div>
      );
    }
    case "chart":
      return <InlineChart />;
    case "approval": {
      const resolved = passed(item.resolved);
      return (
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors duration-500",
            resolved ? "border-[#10b981]/30 bg-[#10b981]/5" : "border-amber-400/40 bg-amber-400/5",
          )}
        >
          <ShieldCheck className={cn("size-4 shrink-0", resolved ? "text-[#0f9f6e]" : "text-amber-500")} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-medium text-primary">Publish “Fed December whales”?</span>
            <span className="block truncate font-mono text-[10.5px] text-muted-foreground">publish_project · public page</span>
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
              resolved ? "bg-[#10b981]/15 text-[#0f9f6e]" : "animate-pulse bg-amber-400/15 text-amber-600",
            )}
          >
            {resolved ? "Approved" : "Waiting for you"}
          </span>
        </div>
      );
    }
    case "published":
      return (
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-background p-2 shadow-sm">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-secondary to-[#7c5cff] text-white">
            <Globe className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-[12px] font-medium text-primary">
              <Check className="size-3 text-[#0f9f6e]" strokeWidth={3} />
              Published
            </span>
            <span className="block truncate font-mono text-[10.5px] text-secondary">lycheedata.com/r/fed-december-whales</span>
          </span>
        </div>
      );
  }
}

function InlineChart() {
  const w = 300;
  const h = 70;
  const path = linePath(PRICES, w, h);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border px-2.5 py-1.5">
        <span className="truncate text-[11.5px] font-medium text-primary">Fed cuts rates in December?</span>
        <span className="shrink-0 text-[10px] text-muted-foreground">Polymarket · 7d</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 px-2.5 pt-2">
        {[
          { label: "YES", value: "64¢", delta: "+6¢" },
          { label: "Holders", value: "2,184" },
          { label: "Top 10 own", value: "41%" },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="rounded-md bg-muted px-2 py-1 [animation:fx-rise_.4s_both]"
            style={{ animationDelay: `${150 + i * 90}ms` }}
          >
            <p className="text-[9.5px] text-muted-foreground">{stat.label}</p>
            <p className="font-mono text-[11.5px] font-medium tabular-nums text-primary">
              {stat.value}
              {stat.delta ? <span className="ml-1 text-[9.5px] text-[#0f9f6e]">{stat.delta}</span> : null}
            </p>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-1 h-14 w-full sm:h-16" aria-hidden>
        <defs>
          <linearGradient id="jarvis-chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f6fed" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2f6fed" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="[animation:fx-draw_1.3s_.3s_ease-out_both]">
          <path d={`${path} L${w} ${h} L0 ${h} Z`} fill="url(#jarvis-chart-fill)" />
          <path d={path} fill="none" stroke="#2f6fed" strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      <div className="flex flex-col gap-1 border-t border-border px-2.5 py-2">
        {HOLDERS.map((holder, i) => (
          <div key={holder.wallet} className="flex items-center gap-2 text-[10px]">
            <span className="w-[4.75rem] shrink-0 font-mono text-muted-foreground">{holder.wallet}</span>
            <span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="h-full origin-left bg-[#10b981] [animation:fx-fill_.7s_ease-out_both]"
                style={{ width: `${holder.yes * 100}%`, animationDelay: `${900 + i * 120}ms` }}
              />
              <span
                className="h-full origin-left bg-[#e5484d] [animation:fx-fill_.7s_ease-out_both]"
                style={{ width: `${(1 - holder.yes) * 100}%`, animationDelay: `${1000 + i * 120}ms` }}
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
