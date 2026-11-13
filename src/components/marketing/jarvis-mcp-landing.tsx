"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FooterSection } from "@/components/sections/footer-section";
import { landingPageV2Config } from "@/lib/landingPageV2Config";
import { useUser } from "@/lib/hooks";
import { mcpDocAccess, userHasMcpPrereg } from "@/lib/mcp/access";
import { CRAZY_WORKFLOWS } from "@/lib/mcp/data/crazyWorkflows";
import styles from "./jarvis-mcp-landing.module.css";

const CHECKOUT_HREF =
  landingPageV2Config.mcpPrereg?.href || "/checkout?plan=mcp_prereg";
const PRICE = landingPageV2Config.mcpPrereg?.price || "$49";

const JARVIS_MOVES = [
  { cmd: "jarvis_on", line: "Power-up animation. Proactive mode online." },
  { cmd: "jarvis_pulse", line: "Unprompted briefs — what’s moving on Polymarket & Kalshi." },
  { cmd: "list_crazy_workflows", line: "Pitch whale war rooms, gap radar, calibration roasts." },
  { cmd: "pull_market_bundle", line: "Land sheets + inline charts while the model thinks." },
  { cmd: "approve_pending", line: "You say “approve” in chat. No tab-hopping to Lychee." },
];

const MCP_SURFACE = [
  {
    title: "Lychee MCP",
    copy: "ChatGPT, Claude, and Cursor call Lychee as source-of-truth — holders, tape, calibration, compose, publish.",
  },
  {
    title: "Jarvis mode",
    copy: "Ask once. Jarvis turns on, pulses interesting markets, and keeps scanning at the start of every turn.",
  },
  {
    title: "X @lychee_data",
    copy: "Mention research in natural language. Jarvis drafts the dig — dry-run first, live when you flip the switch.",
  },
];

function JarvisHeroVisual() {
  return (
    <div className="relative h-full min-h-[min(72vh,40rem)] w-full overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(14,165,233,0.28),transparent_55%),radial-gradient(ellipse_at_80%_70%,rgba(234,88,12,0.22),transparent_50%),linear-gradient(160deg,#071018_0%,#0b1220_45%,#120a08_100%)]" />
      <div className={`absolute inset-0 opacity-[0.35] ${styles.grid}`} />
      <div className="absolute left-1/2 top-[42%] h-[min(58vw,22rem)] w-[min(58vw,22rem)] -translate-x-1/2 -translate-y-1/2">
        <div className={`absolute inset-0 rounded-full bg-sky-400/20 blur-3xl ${styles.pulse}`} />
        <div className={`absolute inset-[12%] rounded-full border border-sky-300/40 ${styles.ring}`} />
        <div className={`absolute inset-[22%] rounded-full border border-orange-400/30 ${styles.ringSlow}`} />
        <div className="absolute inset-[38%] rounded-full bg-gradient-to-br from-sky-300 via-sky-500 to-orange-500 opacity-90 shadow-[0_0_60px_rgba(14,165,233,0.45)]" />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#071018] via-[#071018]/80 to-transparent px-6 pb-10 pt-24 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-sky-200/80">Jarvis online</p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-300">
          Proactive Lychee watch · inline charts · chat approve · X mentions
        </p>
      </div>
    </div>
  );
}

export function JarvisMcpLanding() {
  const user = useUser();
  const access = mcpDocAccess(user);
  const alreadyPrereg = userHasMcpPrereg(user);
  const skipPrereg = access.skipPrereg;
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const workflows = CRAZY_WORKFLOWS.slice(0, 4);
  const rise = (extra = "") => `${styles.rise} ${mounted ? styles.riseIn : ""} ${extra}`.trim();

  return (
    <div className={`relative min-h-screen overflow-x-hidden bg-[#f7f4ef] text-zinc-950 ${styles.landing}`}>
      <section className="relative isolate min-h-[100svh] w-full">
        <div className="absolute inset-0">
          <JarvisHeroVisual />
        </div>
        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[min(100%,84rem)] flex-col justify-end px-6 pb-16 pt-28 sm:px-8 lg:justify-center lg:px-10 lg:pb-20">
          <div className={`max-w-xl ${rise()}`}>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.32em] text-orange-300/90">
              Lychee MCP
            </p>
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
              Jarvis for prediction markets
            </h1>
            <p className={`mt-4 max-w-md text-base leading-relaxed text-zinc-300 ${rise(styles.riseDelay1)}`}>
              Your chat becomes a Lychee research desk — MCP tools, proactive Jarvis, and one-word approvals.
            </p>
            <div className={`mt-8 flex flex-wrap items-center gap-3 ${rise(styles.riseDelay2)}`}>
              {skipPrereg || alreadyPrereg ? (
                <Link
                  href="/mcp"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-medium text-zinc-950 transition hover:bg-orange-50 active:scale-[0.98]"
                >
                  Open MCP playbook
                </Link>
              ) : (
                <Link
                  href={CHECKOUT_HREF}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-medium text-zinc-950 transition hover:bg-orange-50 active:scale-[0.98]"
                >
                  Preregister · {PRICE}
                </Link>
              )}
              <a
                href="#preregister"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/10"
              >
                What’s included
              </a>
            </div>
            {skipPrereg ? (
              <p className={`mt-5 max-w-md text-sm leading-relaxed text-sky-100/90 ${rise(styles.riseDelay2)}`}>
                You&apos;re already on a Lychee subscription. Monthly MCP tokens are accruing now, and
                you&apos;ll have Jarvis as soon as it launches. You don&apos;t need to preregister.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="relative border-t border-zinc-900/10 bg-[#f7f4ef] px-6 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[min(100%,84rem)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-orange-700/80">The product</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Not just MCP — the whole Jarvis stack
          </h2>
          <p className="mt-3 max-w-xl text-base text-zinc-600">
            One founding seat unlocks the assistant surface we&apos;ve been shipping into ChatGPT, Claude, Cursor, and X.
          </p>
          <ul className="mt-12 grid gap-10 md:grid-cols-3">
            {MCP_SURFACE.map((item) => (
              <li key={item.title} className="border-t border-zinc-900/15 pt-5">
                <h3 className="text-lg font-semibold tracking-tight text-zinc-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.copy}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative bg-[#0b1220] px-6 py-20 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[min(100%,84rem)]">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-sky-300/80">Jarvis commands</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Say the quiet part out loud
              </h2>
              <p className="mt-3 text-base text-zinc-400">
                Turn Jarvis on. Pulse the tape. Pitch crazy workflows. Approve publishes without leaving the chat.
              </p>
            </div>
            <div className={`h-px w-full max-w-xs lg:mb-2 ${styles.scanline}`} />
          </div>
          <ul className="mt-12 divide-y divide-white/10 border-y border-white/10">
            {JARVIS_MOVES.map((row) => (
              <li
                key={row.cmd}
                className="grid gap-2 py-5 sm:grid-cols-[minmax(12rem,18rem)_1fr] sm:items-baseline sm:gap-8"
              >
                <code className="font-mono text-sm text-sky-300">{row.cmd}</code>
                <span className="text-sm text-zinc-300">{row.line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[#f7f4ef] px-6 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[min(100%,84rem)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-orange-700/80">Crazy workflows</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Ambitious research, copy-paste ready
          </h2>
          <p className="mt-3 max-w-xl text-base text-zinc-600">
            On connect, Jarvis can pitch live workflows — not vaporware. Each maps to Lychee MCP tools.
          </p>
          <ol className="mt-12 space-y-0">
            {workflows.map((wf, i) => (
              <li
                key={wf.id}
                className="grid gap-2 border-t border-zinc-900/15 py-6 sm:grid-cols-[4rem_1fr] sm:gap-6"
              >
                <span className="font-mono text-sm text-orange-700/70">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">{wf.vibe}</h3>
                  <p className="mt-1 text-sm text-zinc-600">{wf.hook}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-zinc-900/10 bg-white px-6 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[min(100%,84rem)] gap-14 lg:grid-cols-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-orange-700/80">Approvals</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Just say “approve”</h2>
            <p className="mt-3 text-base leading-relaxed text-zinc-600">
              Publishes and expensive pulls still gate safely — but you no longer have to open Lychee. In chat:{" "}
              <span className="font-medium text-zinc-900">approve</span>,{" "}
              <span className="font-medium text-zinc-900">always allow</span>, or{" "}
              <span className="font-medium text-zinc-900">deny</span>. The agent calls{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[13px]">approve_pending</code> and
              continues.
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-orange-700/80">X</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">@lychee_data</h2>
            <p className="mt-3 text-base leading-relaxed text-zinc-600">
              Tag us under a market thread or ask in natural language. Jarvis routes holders, gaps, calibration, or a
              pulse — dry-run first so you can taste the reply before anything goes live.
            </p>
          </div>
        </div>
      </section>

      <section
        id="preregister"
        aria-label="Preregister for Lychee MCP"
        className="relative overflow-hidden bg-[#0b1220] px-6 py-24 text-white sm:px-8 lg:px-10"
      >
        <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-[min(100%,42rem)] text-center">
          {skipPrereg ? (
            <>
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-orange-300/90">
                Already on a Lychee plan
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">You&apos;re in</h2>
              <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-zinc-300">
                If you&apos;re already on a subscription, you&apos;re already accruing MCP tokens and
                will have access to Jarvis as soon as it launches. You shouldn&apos;t preregister —
                the {PRICE} founding payment is only for people who aren&apos;t on a plan yet.
              </p>
              <Link
                href="/mcp"
                className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-medium text-zinc-950 transition hover:bg-orange-50 active:scale-[0.98]"
              >
                Open MCP playbook
              </Link>
            </>
          ) : alreadyPrereg ? (
            <>
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-orange-300/90">
                Preregistered
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">You&apos;re in</h2>
              <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-zinc-300">
                Your MCP preregistration is on file. Open the playbook to connect ChatGPT, Claude, or
                Cursor.
              </p>
              <Link
                href="/mcp"
                className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-medium text-zinc-950 transition hover:bg-orange-50 active:scale-[0.98]"
              >
                Open MCP playbook
              </Link>
            </>
          ) : (
            <>
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-orange-300/90">
                Preregister for Lychee MCP
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{PRICE}</h2>
              <p className="mt-2 text-sm text-zinc-400">Single payment · founding access · MCP credit grant</p>
              <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-zinc-300">
                {landingPageV2Config.mcpPrereg?.description}
              </p>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-zinc-400">
                Already on a Lychee subscription? Don&apos;t preregister — you&apos;re already accruing
                MCP tokens and will have Jarvis as soon as it launches.
              </p>
              <ul className="mx-auto mt-8 max-w-md space-y-2 text-left text-sm text-zinc-300">
                {(landingPageV2Config.mcpPrereg?.features || []).map((f) => (
                  <li key={f} className="flex gap-3 border-t border-white/10 pt-3 first:border-0 first:pt-0">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-sky-400" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={CHECKOUT_HREF}
                className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-medium text-zinc-950 transition hover:bg-orange-50 active:scale-[0.98]"
              >
                {landingPageV2Config.mcpPrereg?.buttonText || `Preregister · ${PRICE}`}
              </Link>
            </>
          )}
          <p className="mt-4 text-xs text-zinc-500">
            Already connected?{" "}
            <Link href="/mcp" className="underline underline-offset-4 hover:text-zinc-300">
              Open MCP settings
            </Link>
          </p>
        </div>
      </section>

      <div className="bg-[#f7f4ef]">
        <FooterSection />
      </div>
    </div>
  );
}
