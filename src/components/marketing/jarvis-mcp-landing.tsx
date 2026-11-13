"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/lib/hooks";
import { mcpDocAccess, userHasMcpPrereg } from "@/lib/mcp/access";

import { FAQSection } from "@/components/sections/faq-section";
import { FEATURE_KEYFRAMES } from "@/components/sections/features/feature-keyframes";
import { ShowcaseRows, type ShowcaseRow } from "@/components/sections/features/feature-showcase-section";
import { FooterSection } from "@/components/sections/footer-section";
import { SectionHeader } from "@/components/section-header";
import { SectionScrollLink } from "@/components/sections/section-scroll-link";
import { landingPageV2Config } from "@/lib/landingPageV2Config";
import automateBackdrop from "../../../public/landing/feature-automate.jpg";
import connectBackdrop from "../../../public/landing/feature-connect-village.jpg";
import exploreBackdrop from "../../../public/landing/feature-explore-lake.jpg";
import { JarvisChatShowcase } from "./jarvis/jarvis-chat-showcase";
import { JARVIS_KEYFRAMES } from "./jarvis/jarvis-keyframes";
import { JarvisOrb } from "./jarvis/jarvis-orb";
import { PulseRadarDemo } from "./jarvis/pulse-radar-demo";
import { TraderDeepDiveDemo } from "./jarvis/trader-deep-dive-demo";
import { WorkflowRunnerDemo } from "./jarvis/workflow-runner-demo";
import { XMentionDemo } from "./jarvis/x-mention-demo";

const CHECKOUT_HREF = landingPageV2Config.mcpPrereg?.href || "/checkout?plan=mcp_prereg";
const PRICE = landingPageV2Config.mcpPrereg?.price || "$49";

const PRIMARY_CTA =
  "flex h-12 items-center justify-center rounded-full border border-white/[0.12] bg-secondary px-6 text-base font-normal text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] transition-all ease-out hover:bg-secondary/80 active:scale-95 dark:text-secondary-foreground";
const SECONDARY_CTA =
  "flex h-12 items-center justify-center gap-1.5 rounded-full border border-border bg-muted px-6 text-base font-normal text-primary transition-all ease-out hover:bg-muted/70 active:scale-95";

const CAPABILITIES: ShowcaseRow[] = [
  {
    id: "pulse",
    title: "Jarvis keeps watch so you don't have to.",
    description: [
      "Every turn starts with a pulse across Polymarket and Kalshi: the hottest market, the biggest print on the tape, fresh wallets loading up, and gaps between venues.",
      "Say “pulse” or “what's hot?” anytime for a fresh scan.",
    ],
    showcase: { demo: <PulseRadarDemo />, backdrop: automateBackdrop, href: CHECKOUT_HREF, cta: `Preregister · ${PRICE}` },
  },
  {
    id: "workflows",
    title: "Whole research projects from one ask.",
    description: [
      "Ask for a whale war room, a cross-venue gap hunt, or a calibration roast. Jarvis chains the right Lychee tools, lands charts in the chat, and writes up what it found.",
      "Every workflow runs on real Lychee data, never scraped pages.",
    ],
    showcase: { demo: <WorkflowRunnerDemo />, backdrop: exploreBackdrop, href: "/mcp", cta: "Connect Lychee MCP" },
  },
  {
    id: "x",
    title: "Tag @lychee_data under any post.",
    description: [
      "Ask “is there a market for this?”, “does the data back this?”, or “who's buying?” right in the thread. Jarvis reads the question, pulls Lychee numbers, and replies.",
      "New reply packs run as dry runs first, so nothing posts until it's right.",
    ],
    showcase: { demo: <XMentionDemo />, backdrop: connectBackdrop, href: "https://x.com/lychee_data", cta: "Follow @lychee_data" },
  },
  {
    id: "traders",
    title: "Go ultra deep on any trader.",
    description: [
      "Name a Polymarket trader or paste a wallet. Jarvis checks the post's claims, then reads what a leaderboard can't show.",
      "Edge: before or after the news, how early, does price move their way. Style: longshots vs favorites, profit concentration, holder or flipper, current form. Category: where they win vs bleed, country edge, category ranks. Book: what they're buying now, contrarian bets, the copy-trade check. Crowd: similar traders, with or against the whales, who follows them in.",
      "Ask for one, like “is he early?”, and Jarvis answers it with the rest of that group. Say “go ultra deep” for all 16 plus a shareable dashboard of charts.",
    ],
    showcase: { demo: <TraderDeepDiveDemo />, backdrop: exploreBackdrop, href: "https://x.com/lychee_data", cta: "Try it on X" },
  },
];

const ORBIT_CHIPS = [
  { label: "jarvis_pulse", className: "left-[2%] top-[14%]", delay: "0s" },
  { label: "analyze_holders", className: "right-[0%] top-[8%]", delay: "-1.2s" },
  { label: "compare_venues", className: "left-[-4%] bottom-[22%]", delay: "-2.1s" },
  { label: "approve_pending", className: "right-[-2%] bottom-[16%]", delay: "-0.6s" },
  { label: "@lychee_data", className: "left-1/2 -translate-x-1/2 bottom-[-2%]", delay: "-1.6s" },
] as const;

const FAQ = [
  {
    question: "What is Jarvis?",
    answer:
      "Jarvis is a proactive mode for Lychee MCP. Once it's on, your AI assistant opens every turn with a short brief on what's moving across Polymarket and Kalshi, and can run full research workflows with Lychee data and charts.",
  },
  {
    question: "Which apps does it work in?",
    answer:
      "ChatGPT, Claude, and Cursor, through Lychee MCP. On X, mention @lychee_data under any post with your question.",
  },
  {
    question: "Will Jarvis message me when I'm not chatting?",
    answer:
      "Not yet. Chat apps only let Jarvis speak when you send a message, so it pulses at the start of every turn. Say “pulse” or “update” for a fresh scan anytime. Push alerts to Slack and webhooks are next.",
  },
  {
    question: "Can Jarvis publish or spend credits without asking?",
    answer:
      "No. Publishing and expensive pulls wait for your go-ahead. Reply “approve”, “always allow”, or “deny” right in the chat and Jarvis carries on.",
  },
  {
    question: "How do the X replies work?",
    answer:
      "Tag @lychee_data with a question like “is there a market for this?” or “does the data back this?”. Jarvis works out what you're asking, pulls matching markets, holders, or prices from Lychee, and replies in the thread. New reply packs run as dry runs before they go live.",
  },
  {
    question: "What can Jarvis tell me about a trader?",
    answer:
      "Tag @lychee_data under a post about a trader (or name them, or paste a wallet) and ask “dig into this trader”. You get a claim check, their record, and the 2-3 most surprising reads. Ask about one thing (news timing, how early, longshots vs favorites, profit concentration, holder or flipper, current form, category PnL, country edge, category ranks, what they're buying now, contrarian bets, copy-trade check, similar traders, whales, followers) and Jarvis answers it plus the rest of that group. Say “go ultra deep” for all 16 and a dashboard you can share.",
  },
  {
    question: `What does the ${PRICE} preregistration include?`,
    answer:
      "A one-time payment for founding access: Lychee MCP in ChatGPT, Claude, and Cursor, Jarvis mode and crazy workflows, 3 months of free Jarvis usage at launch, chat-side approvals, early X @lychee_data mention packs, and a founding MCP credit grant. Current Lychee subscribers already accrue tokens and should skip this.",
  },
  {
    question: "I already subscribe to Lychee. Should I preregister?",
    answer:
      "No. If you're already on a Lychee subscription, monthly MCP tokens are accruing now and you'll have Jarvis as soon as it launches. Skip the $49 founding payment. A Black Friday annual purchase also includes 3 months of free Jarvis at launch.",
  },
];

export function JarvisMcpLanding() {
  const prereg = landingPageV2Config.mcpPrereg;
  const user = useUser();
  const access = mcpDocAccess(user);
  const alreadyPrereg = userHasMcpPrereg(user);
  const skipPrereg = access.skipPrereg;
  return (
    <main className="flex min-h-screen w-full flex-col items-stretch divide-y divide-border bg-background font-sans antialiased theme-landing scroll-smooth">
      <style dangerouslySetInnerHTML={{ __html: FEATURE_KEYFRAMES + JARVIS_KEYFRAMES }} />

      <section id="hero" className="features-showcase relative w-full">
        <div className="mx-auto flex w-full max-w-[min(100%,84rem)] flex-col items-start gap-6 px-6 pb-10 pt-28 sm:px-8 md:pt-32 lg:px-10">
          <div className="flex w-full max-w-[36rem] flex-col gap-3 text-left">
            <h1 className="text-balance text-[1.5rem] font-normal leading-[1.25] tracking-tight text-primary sm:text-[1.625rem]">
              Jarvis for prediction markets.
              <span className="block text-muted-foreground">Your AI chat, now watching Polymarket and Kalshi for you.</span>
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
              Connect Lychee MCP to ChatGPT, Claude, or Cursor. Jarvis briefs you on what&apos;s moving, drops charts into the
              conversation, runs whole research workflows, and answers{" "}
              <span className="font-medium text-primary">@lychee_data</span> on X. Included in the Black Friday Special.
              Preorder or a Black Friday purchase includes 3 months of free Jarvis at launch.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {skipPrereg || alreadyPrereg ? (
              <Link href="/mcp" className={PRIMARY_CTA}>
                Open MCP playbook
              </Link>
            ) : (
              <Link href={CHECKOUT_HREF} className={PRIMARY_CTA}>
                Preregister · {PRICE}
              </Link>
            )}
            <SectionScrollLink href="/jarvis#jarvis-demo" sectionId="jarvis-demo" className={SECONDARY_CTA}>
              Watch it work
              <span aria-hidden>→</span>
            </SectionScrollLink>
          </div>
          {skipPrereg ? (
            <p className="max-w-[36rem] text-sm leading-relaxed text-muted-foreground">
              You&apos;re already on a Lychee subscription. Monthly MCP tokens are accruing now, and you&apos;ll have
              Jarvis as soon as it launches. You don&apos;t need to preregister.
            </p>
          ) : (
            <p className="max-w-[36rem] text-sm leading-relaxed text-muted-foreground">
              Already on a Lychee subscription? Don&apos;t preregister — you&apos;re already accruing MCP tokens and will
              have Jarvis at launch.
            </p>
          )}
        </div>
        <div className="mx-auto w-full max-w-[min(100%,84rem)] px-6 pb-10 sm:px-8 md:pb-14 lg:px-10">
          <JarvisChatShowcase />
        </div>
      </section>

      <section id="capabilities" className="relative w-full scroll-mt-28">
        <SectionHeader>
          <h2 className="text-balance pb-1 text-center text-3xl font-medium tracking-tighter md:text-4xl">
            Everything Jarvis can do
          </h2>
          <p className="text-balance text-center font-medium text-muted-foreground">
            It scans the markets, runs the research, and answers on X, all with live Lychee data.
          </p>
        </SectionHeader>
        <ShowcaseRows rows={CAPABILITIES} className="py-10 md:py-14" />
      </section>

      <section id="preregister" aria-label="Preregister for Lychee MCP and Jarvis" className="features-showcase flex w-full scroll-mt-28 flex-col items-center px-5 py-10 md:px-10 md:py-14">
        <div className="relative w-full max-w-7xl overflow-hidden rounded-xl border border-border bg-gradient-to-br from-secondary/35 via-background to-muted shadow-xl">
          <div className="relative z-10 grid items-center gap-10 px-6 py-12 md:px-12 md:py-16 lg:grid-cols-2">
            <div className="relative mx-auto aspect-square w-full max-w-[22rem]">
              <JarvisOrb className="absolute inset-[6%]" />
              {ORBIT_CHIPS.map((chip) => (
                <span key={chip.label} className={`absolute ${chip.className}`}>
                  <span
                    className="block rounded-full border border-border bg-background/90 px-2.5 py-1 font-mono text-[11px] text-primary shadow-sm backdrop-blur [animation:jx-float_4s_ease-in-out_infinite]"
                    style={{ animationDelay: chip.delay }}
                  >
                    {chip.label}
                  </span>
                </span>
              ))}
            </div>

            <div className="flex flex-col items-start gap-5">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <span className="rounded-full bg-gradient-to-r from-secondary to-[#7c5cff] px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-white">
                  {prereg?.badge || "Founding access"}
                </span>
                Lychee MCP + Jarvis
              </span>
              {skipPrereg ? (
                <>
                  <h2 className="text-4xl font-medium tracking-tighter text-foreground md:text-6xl">You&apos;re already in.</h2>
                  <p className="text-[15px] leading-relaxed text-muted-foreground">
                    You&apos;re on a Lychee subscription, so monthly MCP tokens are accruing now and you&apos;ll have Jarvis
                    as soon as it launches. Don&apos;t buy the {PRICE} founding seat.
                  </p>
                  <Link href="/mcp" className={PRIMARY_CTA}>
                    Open MCP playbook
                  </Link>
                </>
              ) : alreadyPrereg ? (
                <>
                  <h2 className="text-4xl font-medium tracking-tighter text-foreground md:text-6xl">You&apos;re preregistered.</h2>
                  <p className="text-[15px] leading-relaxed text-muted-foreground">
                    Your MCP preregistration is on file. Open the playbook to connect ChatGPT, Claude, or Cursor.
                  </p>
                  <Link href="/mcp" className={PRIMARY_CTA}>
                    Open MCP playbook
                  </Link>
                </>
              ) : (
                <>
                  <h2 className="text-4xl font-medium tracking-tighter text-foreground md:text-6xl">Get Jarvis first.</h2>
                  <p className="flex items-baseline gap-2">
                    <span className="text-3xl font-medium tracking-tight text-primary">{PRICE}</span>
                    <span className="text-sm text-muted-foreground">
                      one-time · founding access · 3 months of Jarvis at launch
                    </span>
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Included in the Black Friday Special. Preorder or a Black Friday purchase includes 3 months of free
                    Jarvis usage when it launches. Already on a Lychee subscription? Skip this — you&apos;re already
                    accruing MCP tokens and will have Jarvis at launch.
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    {(prereg?.features || []).map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-[15px] text-primary">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-2">
                    <Link href={CHECKOUT_HREF} className={PRIMARY_CTA}>
                      {prereg?.buttonText || `Preregister · ${PRICE}`}
                    </Link>
                    <Link href="/mcp" className="text-sm text-secondary transition-colors hover:text-primary">
                      Already connected? Open MCP settings →
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <FAQSection
        id="jarvis-faq"
        title="Questions about Jarvis"
        description=""
        items={FAQ.map((item, index) => ({ id: index + 1, ...item }))}
      />

      <FooterSection />
    </main>
  );
}
