"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "@/components/sections/features/feature-kit";
import { FEATURE_KEYFRAMES } from "@/components/sections/features/feature-keyframes";
import { HolderSessionProvider, chosenName, shortWallet, useHolderSession } from "@/components/terminals/holder/holderSession";
import { HOLDER_LANDING_PAGES, HOLDER_PATHS, holderTerminalHref } from "@/lib/holderLanding/pages";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { HeroTools } from "./holderLandingHero";
import { HeroPreview } from "./holderLandingPreview";
import { FinalCta, MobileCtaBar, PageRail } from "./holderLandingRail";
import { StoryStage } from "./holderLandingStage";
import { useStepToasts } from "./landingToasts";
import { useTraderHolders } from "./traderHolders";

const CONTAINER = "w-full px-6 sm:px-8 lg:px-10";

const MARKET_ID = /^0x[a-fA-F0-9]{64}$/;
const WALLET_ID = /^0x[a-fA-F0-9]{40}$/;

/** The panels' own long descriptions repeat the step copy beside them, so the stage hides them. */
const STAGE_CSS = `
.holder-landing-stage header > .max-w-3xl > p { display: none; }
`;

function marketPageHref(market) {
  if (!market?.conditionId) return HOLDER_PATHS.market;
  const params = new URLSearchParams({ market: market.conditionId });
  if (market.title) params.set("marketTitle", market.title);
  return `${HOLDER_PATHS.market}?${params}`;
}

function walletPageHref(wallet, fromMarket) {
  if (!wallet?.address) return HOLDER_PATHS.wallet;
  const params = new URLSearchParams({ wallet: wallet.address });
  if (wallet.title) params.set("walletTitle", wallet.title);
  if (fromMarket?.conditionId) {
    params.set("fromMarket", fromMarket.conditionId);
    if (fromMarket.title) params.set("fromTitle", fromMarket.title);
    return `${HOLDER_PATHS.wallet}?${params}#wallet-trades-and-news`;
  }
  return `${HOLDER_PATHS.wallet}?${params}`;
}

/** Reflects the selection in the address bar so reload and Back keep it; the canonical stays clean. */
function writeSelection(updates) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(updates)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(null);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return desktop;
}

function useNear(ref, margin) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return undefined;
    const observer = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && setNear(true), { rootMargin: margin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [margin, near, ref]);
  return near;
}

function usd(value) {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function topHolder(sides) {
  const rows = (sides || []).flatMap((side) => (side.rows[0] ? [{ ...side.rows[0], outcome: side.outcome }] : []));
  return rows.sort((a, b) => (b.value ?? b.amount) - (a.value ?? a.amount))[0] || null;
}

function holderName(row) {
  return chosenName(row?.name) || row?.pseudonym || (row?.wallet ? shortWallet(row.wallet) : "");
}

function latestMarket(session) {
  const row = session?.activity?.rows?.find((item) => item.condition_id) || session?.positions?.rows?.find((item) => item.condition_id);
  return row ? { kind: "market", conditionId: row.condition_id, title: row.title, slug: row.slug } : null;
}

/** A one-line, live text version of what the step's panel shows, for readers who skip the chart. */
function StepFact({ step }) {
  const session = useHolderSession();
  if (!session?.subject) return null;
  let text = "";
  if (session.view === "market") {
    const { meta, stats, outcomes } = session;
    if (["priceChart", "headlines", "stats", "trades"].includes(step.panel) && stats?.prices?.length) {
      const prices = outcomes.map((outcome, index) => (Number.isFinite(stats.prices[index]) ? `${outcome} ${Math.round(stats.prices[index] * 100)}¢` : "")).filter(Boolean);
      text = [prices.join(" · "), meta?.volume24h ? `${usd(meta.volume24h)} traded in 24h` : ""].filter(Boolean).join(" · ");
    } else if (["holders", "heatmap", "pickHolder", "supply", "entry", "scores"].includes(step.panel)) {
      const lead = (session.holders?.sides || []).map((side) => {
        const row = side.rows[0];
        if (!row) return "";
        const share = row.supplyPct != null ? ` (${row.supplyPct.toFixed(1)}% of ${side.outcome})` : ` on ${side.outcome}`;
        return `${holderName(row)}${share}`;
      });
      text = lead.filter(Boolean).length ? `Largest holders: ${lead.filter(Boolean).join(" · ")}` : "";
    }
  } else if (session.view === "trader") {
    const row = session.profile?.rows?.[0];
    const realized = Number(row?.realized_pnl);
    const trades = session.activity?.rows?.length;
    text = [
      session.displayName,
      Number.isFinite(realized) ? `${realized < 0 ? "−" : "+"}${usd(Math.abs(realized))} realized` : "",
      trades ? `${trades.toLocaleString()} trades loaded` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (!text) return null;
  return (
    <p className="max-w-md text-[12.5px] text-muted-foreground" aria-live="polite">
      <span className="mr-1.5 inline-flex rounded bg-emerald-500/10 px-1.5 py-px text-[10.5px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
        Now
      </span>
      {text}
    </p>
  );
}

const LINK_CLASS = "w-fit text-sm text-secondary transition-colors hover:text-primary";

function StepLinks({ step, page, actions }) {
  const session = useHolderSession();
  const traders = useTraderHolders(session?.holders?.sides, {
    count: 1,
    enabled: !!step.links?.some((link) => link.kind === "wallet"),
  });
  if (!step.links?.length) return null;
  const items = step.links.flatMap((link, index) => {
    if (link.flagshipOnly && page.key !== "flagship") return [];
    const key = `${link.kind}:${index}`;
    if (link.kind === "terminal") {
      if (!session?.subject) return [];
      return [
        <Link key={key} href={holderTerminalHref(session.subject)} prefetch={false} className={LINK_CLASS}>
          {link.label} →
        </Link>,
      ];
    }
    if (link.kind === "wallet") {
      const row = topHolder(traders);
      if (!row) return [];
      const wallet = { address: row.wallet, title: holderName(row) };
      const label = `${link.label}: ${wallet.title}`;
      if (page.key === "flagship") {
        return [
          <button key={key} type="button" onClick={() => actions.pickTrader(wallet)} className={cn(LINK_CLASS, "text-left")}>
            {label} →
          </button>,
        ];
      }
      return [
        <Link key={key} href={walletPageHref(wallet, session.subject)} className={LINK_CLASS}>
          {label} →
        </Link>,
      ];
    }
    if (link.kind === "market") {
      const market = latestMarket(session);
      if (!market) return [];
      if (page.key === "flagship") {
        return [
          <button key={key} type="button" onClick={() => actions.pickMarket(market)} className={cn(LINK_CLASS, "text-left")}>
            {link.label} →
          </button>,
        ];
      }
      return [
        <Link key={key} href={marketPageHref(market)} className={LINK_CLASS}>
          {link.label} →
        </Link>,
      ];
    }
    if (link.kind === "page") {
      const subject = session?.subject;
      const href = link.withWallet ? walletPageHref(subject) : subject?.kind === "market" && link.href === HOLDER_PATHS.market ? marketPageHref(subject) : link.href;
      return [
        <Link key={key} href={href} className={LINK_CLASS}>
          {link.label} →
        </Link>,
      ];
    }
    return [];
  });
  if (!items.length) return null;
  return <div className="flex flex-col gap-1.5">{items}</div>;
}

function InlineStage({ active, ...props }) {
  const ref = useRef(null);
  const near = useNear(ref, "50% 0px");
  return (
    <div ref={ref} className="min-h-[34rem]">
      {near ? <StoryStage {...props} inline tour={{ ...props.tour, inView: props.tour.inView && active }} /> : null}
    </div>
  );
}

function StepCopy({ stepRef, chapter, step, index, nextStep, skip, active, isDesktop, page, actions, stageProps }) {
  const total = chapter.steps.length;
  return (
    <article
      ref={stepRef}
      id={step.id}
      data-step={index}
      className={cn(
        "flex scroll-mt-28 flex-col justify-center gap-4 py-10 transition-opacity duration-500 lg:min-h-[78vh] lg:py-16",
        isDesktop && !active && "lg:opacity-40",
      )}
    >
      <p className="text-[12px] font-medium tabular-nums text-muted-foreground">
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")} · {step.nav}
      </p>
      <div className="max-w-md text-xl leading-snug tracking-tight sm:text-[1.3rem]">
        <h2 className="font-normal text-primary">{step.title}</h2>
        <p className="mt-2 text-muted-foreground">{step.body}</p>
      </div>
      {step.caption ? (
        <p className="max-w-md border-l-2 border-[#0d99ff] pl-3 text-[13.5px] leading-relaxed text-foreground">{step.caption}</p>
      ) : null}
      <StepFact step={step} />
      {step.notes?.map((note) => (
        <p key={note} className="max-w-md text-[13px] text-muted-foreground">
          {note}
        </p>
      ))}
      {step.details ? (
        <details className="group max-w-md text-[13px]">
          <summary className="cursor-pointer list-none text-secondary hover:text-primary">
            <span className="mr-1 inline-block transition-transform group-open:rotate-90" aria-hidden>
              ›
            </span>
            {step.details.summary}
          </summary>
          <p className="mt-1.5 leading-relaxed text-muted-foreground">{step.details.body}</p>
        </details>
      ) : null}
      <StepLinks step={step} page={page} actions={actions} />
      {isDesktop === false ? <InlineStage active={active} {...stageProps} activeIndex={index} /> : null}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
        {nextStep ? (
          <a href={`#${nextStep.id}`} className="text-secondary hover:text-primary">
            Next: {nextStep.nav} ↓
          </a>
        ) : null}
        {skip ? (
          <a href={`#${skip.id}`} className="text-muted-foreground hover:text-foreground">
            Skip to {skip.label}
          </a>
        ) : null}
      </div>
    </article>
  );
}

function OnThisPage({ steps, active }) {
  return (
    <>
      <nav aria-label="On this page" className="hidden flex-wrap gap-1.5 lg:flex xl:hidden">
        {steps.map((step, index) => (
          <a
            key={step.id}
            href={`#${step.id}`}
            aria-current={index === active ? "location" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-[12px] transition-colors",
              index === active ? "border-[#0d99ff]/40 bg-[#0d99ff]/10 text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {step.nav}
          </a>
        ))}
      </nav>
      <details className="rounded-lg border border-border bg-background px-3 py-2 text-[13px] lg:hidden">
        <summary className="cursor-pointer font-medium text-foreground">On this page</summary>
        <ol className="mt-2 space-y-1">
          {steps.map((step) => (
            <li key={step.id}>
              <a href={`#${step.id}`} className="text-secondary hover:text-primary">
                {step.nav}
              </a>
            </li>
          ))}
        </ol>
      </details>
    </>
  );
}

function ChapterToasts(props) {
  useStepToasts(props);
  return null;
}

function SubjectLine({ chapter, subject, page }) {
  const session = useHolderSession();
  const name =
    chapter.kind === "trader"
      ? session?.displayName || chosenName(subject?.title) || (subject?.address ? shortWallet(subject.address) : "")
      : session?.meta?.title || subject?.title || "";
  const from = chapter.kind === "trader" ? subject?.fromMarket : null;
  return (
    <div className="flex flex-col gap-1.5">
      {name ? (
        <p className="max-w-3xl text-xl leading-snug tracking-tight text-primary sm:text-[1.3rem]">
          <span className="text-muted-foreground">{chapter.kind === "trader" ? "Following the wallet " : "Following "}</span>
          {name}
        </p>
      ) : null}
      {from ? (
        <p className="flex flex-wrap gap-x-4 text-[13px]">
          {page.chapters.some((item) => item.kind === "market") ? (
            <a href="#market-choose-a-wallet" className="text-secondary hover:text-primary">
              ← Back to {from.title || "the market"}
            </a>
          ) : (
            <Link href={marketPageHref(from)} className="text-secondary hover:text-primary">
              ← Back to {from.title || "the market"}
            </Link>
          )}
          <a href="#wallet-overview" className="text-muted-foreground hover:text-foreground">
            See wallet overview
          </a>
        </p>
      ) : null}
    </div>
  );
}

/**
 * One path through the terminal. The first chapter shares the hero's session; later ones start their
 * own (`ownSession`) once the visitor is close, so nothing below the fold loads up front.
 */
function StoryChapter({ page, chapter, chapterIndex, subject, actions, story, tourBase, isDesktop, articles, ownSession, onProgress }) {
  const sectionRef = useRef(null);
  const near = useNear(sectionRef, "900px 0px");
  const [active, setActive] = useState(0);
  const [inBand, setInBand] = useState(false);
  const steps = chapter.steps;

  useEffect(() => {
    onProgress(chapterIndex, { active, inBand });
  }, [active, chapterIndex, inBand, onProgress]);

  // The session provider remounts the copy when the subject loads or changes, so steps register
  // through refs (re-observed on every mount) rather than being queried once.
  const observerRef = useRef(null);
  const stepEls = useRef(new Map());
  const insideRef = useRef(new Set());
  const syncBand = useCallback(() => {
    const inside = insideRef.current;
    if (inside.size) setActive(Math.min(...inside));
    setInBand(inside.size > 0);
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number(entry.target.getAttribute("data-step"));
          if (entry.isIntersecting) insideRef.current.add(index);
          else insideRef.current.delete(index);
        }
        syncBand();
      },
      { rootMargin: "-42% 0px -50% 0px" },
    );
    observerRef.current = observer;
    stepEls.current.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [syncBand]);
  const stepRefs = useMemo(
    () =>
      steps.map((_, index) => (el) => {
        const prev = stepEls.current.get(index);
        if (prev && prev !== el) {
          observerRef.current?.unobserve(prev);
          insideRef.current.delete(index);
        }
        if (el) {
          stepEls.current.set(index, el);
          observerRef.current?.observe(el);
        } else {
          stepEls.current.delete(index);
        }
      }),
    [steps],
  );

  const activeStep = steps[active] || steps[0];
  const nextChapter = page.chapters[chapterIndex + 1];
  const skip = nextChapter ? { id: nextChapter.id, label: `the ${nextChapter.kind} path` } : { id: "faq", label: "FAQ" };
  const scrollTo = useCallback(
    (id) => document.getElementById(id)?.scrollIntoView({ behavior: tourBase.reducedMotion ? "auto" : "smooth", block: "start" }),
    [tourBase.reducedMotion],
  );
  const tour = {
    ...tourBase,
    inView: inBand,
    nextStep: active < steps.length - 1 ? () => scrollTo(steps[active + 1].id) : undefined,
  };
  const tradesStep = steps.find((item) => item.toast === "trade" || item.toast === "trader");
  const stageProps = { chapter, steps, title: subject?.title, story, tour };

  const body = (
    <>
      <ChapterToasts
        kind={inBand ? activeStep.toast : null}
        stepKey={activeStep.id}
        paused={tourBase.paused}
        articles={articles}
        onPause={tourBase.pause}
        onViewTrades={tradesStep ? () => scrollTo(tradesStep.id) : undefined}
        onShowArticle={story.showOnChart}
      />
      <section id={chapter.id} ref={sectionRef} aria-label={chapter.label} className="w-full scroll-mt-24">
        <div className="flex w-full flex-col gap-4 pb-4 pt-14 md:pt-20">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-secondary">{chapter.label}</p>
          <SubjectLine chapter={chapter} subject={subject} page={page} />
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{chapter.summary}</p>
          <OnThisPage steps={steps} active={inBand ? active : -1} />
        </div>
        <div className="grid w-full gap-6 pb-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,9fr)] lg:gap-10 xl:grid-cols-[minmax(0,4fr)_minmax(0,9fr)]">
          <div className="min-w-0">
            {steps.map((step, index) => (
              <StepCopy
                key={step.id}
                stepRef={stepRefs[index]}
                chapter={chapter}
                step={step}
                index={index}
                nextStep={steps[index + 1]}
                skip={skip}
                active={index === active}
                isDesktop={isDesktop}
                page={page}
                actions={actions}
                stageProps={stageProps}
              />
            ))}
          </div>
          <div className="hidden min-w-0 lg:block">
            <div className="sticky top-24 h-[calc(100vh-7.5rem)] max-h-[880px] min-h-[540px] py-2">
              {isDesktop ? <StoryStage {...stageProps} activeIndex={active} /> : null}
            </div>
          </div>
        </div>
      </section>
    </>
  );

  if (!ownSession) return body;
  return (
    <HolderSessionProvider
      subject={near ? subject : null}
      actions={actions}
      alertsOn={inBand && activeStep.toast === "trader" && !tourBase.paused}
    >
      {body}
    </HolderSessionProvider>
  );
}

function useInView(ref, margin = "0px") {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: margin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [margin, ref]);
  return inView;
}

function Breadcrumb({ page }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[12px] text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="hover:text-foreground">
            Lychee
          </Link>
        </li>
        <li aria-hidden>›</li>
        {page.key !== "flagship" ? (
          <>
            <li>
              <Link href={HOLDER_PATHS.flagship} className="hover:text-foreground">
                Holder Terminal
              </Link>
            </li>
            <li aria-hidden>›</li>
          </>
        ) : null}
        <li aria-current="page" className="text-foreground">
          {page.navLabel}
        </li>
      </ol>
    </nav>
  );
}

function HeroCopy({ hero }) {
  return (
    <div className="flex w-full flex-col gap-4 text-left">
      <p className="inline-flex h-7 w-fit items-center gap-2 rounded-full border border-border bg-accent px-3 text-[13px] text-foreground">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        {hero.label}
      </p>
      <h1 className="text-balance text-[2.25rem] font-normal leading-[1.05] tracking-[-0.025em] text-primary sm:text-[2.75rem] xl:text-[3.25rem]">
        {hero.title}
      </h1>
      <p className="max-w-[34rem] text-[15px] leading-relaxed text-muted-foreground sm:text-base">{hero.description}</p>
      <ul className="flex flex-col gap-1.5 pt-1 text-[14px] text-foreground">
        {hero.points.map((point) => (
          <li key={point} className="flex items-center gap-2">
            <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={2.5} aria-hidden />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

function subjectName(kind, subject) {
  if (!subject) return "";
  if (kind === "trader") return chosenName(subject.title) || (subject.address ? shortWallet(subject.address) : "");
  return subject.title || "";
}

/**
 * Hero plus the guided walkthrough for one landing page. Starts on the server-picked market and
 * trader (or the ones in the URL), and every pick re-points the live panels without a reload.
 */
export function HolderLandingExperience({ pageKey, initial }) {
  const page = HOLDER_LANDING_PAGES[pageKey];
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const isDesktop = useIsDesktop();
  const [market, setMarket] = useState(initial.market);
  const [trader, setTrader] = useState(initial.trader);
  const marketRef = useRef(market);
  marketRef.current = market;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const marketId = params.get("market");
    if (marketId && MARKET_ID.test(marketId)) {
      setMarket({ kind: "market", conditionId: marketId.toLowerCase(), title: params.get("marketTitle") || "" });
    }
    const wallet = params.get("wallet");
    if (wallet && WALLET_ID.test(wallet)) {
      const from = params.get("fromMarket");
      setTrader({
        kind: "trader",
        address: wallet.toLowerCase(),
        title: params.get("walletTitle") || "",
        ...(from && MARKET_ID.test(from) ? { fromMarket: { conditionId: from.toLowerCase(), title: params.get("fromTitle") || "" } } : {}),
      });
    }
  }, []);

  const [paused, setPaused] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [tipsHidden, setTipsHidden] = useState(false);
  useEffect(() => {
    if (reducedMotion) setAutoplay(false);
  }, [reducedMotion]);

  const [articles, setArticles] = useState([]);
  const [focusArticle, setFocusArticle] = useState(null);

  const scrollTo = useCallback(
    (id) => document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" }),
    [reducedMotion],
  );
  const hasChapter = (kind) => page.chapters.some((chapter) => chapter.kind === kind);

  const selectMarket = (subject, target = "market-path") => {
    if (!subject?.conditionId) return;
    const next = { kind: "market", conditionId: subject.conditionId, title: subject.title || "", slug: subject.slug || "" };
    setMarket(next);
    setArticles([]);
    setFocusArticle(null);
    writeSelection({ market: next.conditionId, marketTitle: next.title });
    window.requestAnimationFrame(() => scrollTo(target));
  };
  const selectTrader = (subject, target = "trader-path") => {
    if (!subject?.address) return;
    const next = { kind: "trader", address: subject.address, title: subject.title || "", ...(subject.fromMarket ? { fromMarket: subject.fromMarket } : {}) };
    setTrader(next);
    writeSelection({ wallet: next.address, walletTitle: next.title, fromMarket: next.fromMarket?.conditionId, fromTitle: next.fromMarket?.title });
    window.requestAnimationFrame(() => scrollTo(target));
  };

  const pick = (subjects) => {
    const subject = subjects?.[0];
    if (subject?.kind === "market") {
      if (hasChapter("market")) selectMarket(subject);
      else router.push(marketPageHref(subject));
    } else if (subject?.kind === "trader") {
      if (hasChapter("trader")) selectTrader(subject);
      else router.push(walletPageHref(subject));
    }
  };

  const actionsRef = useRef(null);
  actionsRef.current = {
    pick,
    pickTrader: ({ address, title }) => {
      const from = marketRef.current;
      const fromMarket = from ? { conditionId: from.conditionId, title: from.title, slug: from.slug } : undefined;
      if (hasChapter("trader")) selectTrader({ address, title, fromMarket }, "wallet-trades-and-news");
      else router.push(walletPageHref({ address, title }, fromMarket));
    },
    pickMarket: (subject) => {
      if (hasChapter("market")) selectMarket(subject);
      else router.push(marketPageHref(subject));
    },
    nameSubject: (title) => setTrader((prev) => (prev && !prev.title ? { ...prev, title } : prev)),
  };
  // Stable for the sessions; every call reads the latest handlers.
  const actions = useMemo(
    () => ({
      pick: (subjects) => actionsRef.current.pick(subjects),
      pickTrader: (subject) => actionsRef.current.pickTrader(subject),
      pickMarket: (subject) => actionsRef.current.pickMarket(subject),
      nameSubject: (title) => actionsRef.current.nameSubject(title),
    }),
    [],
  );

  const story = useMemo(
    () => ({
      focusArticle,
      onNews: setArticles,
      showOnChart: (article) => {
        setFocusArticle({ t: article.t, id: article.id });
        scrollTo("market-trades-and-news");
      },
    }),
    [focusArticle, scrollTo],
  );

  const tourBase = {
    paused,
    autoplay: autoplay && !paused,
    reducedMotion,
    tipsHidden,
    onTakeOver: () => setAutoplay(false),
    pause: () => setPaused(true),
    togglePause: () => {
      if (paused) {
        setPaused(false);
        setAutoplay(true);
      } else {
        setPaused(true);
      }
    },
    toggleTips: () => setTipsHidden((hidden) => !hidden),
    hideTips: () => setTipsHidden(true),
  };

  const [progress, setProgress] = useState({});
  const onProgress = useCallback((index, { active, inBand }) => {
    setProgress((prev) => {
      const old = prev[index];
      const furthest = Math.max(old?.furthest ?? -1, inBand ? active : -1);
      if (old && old.active === active && old.inBand === inBand && old.furthest === furthest) return prev;
      return { ...prev, [index]: { active, inBand, furthest } };
    });
  }, []);

  const lead = page.chapters[0];
  const subjectOf = (chapter) => (chapter.kind === "trader" ? trader : market);
  const heroSubject = subjectOf(lead);
  const leadState = progress[0];
  const leadAlerts = lead.kind === "trader" && !!leadState?.inBand && lead.steps[leadState.active]?.toast === "trader" && !paused;
  const readingIndex = page.chapters.findIndex((_, index) => progress[index]?.inBand);
  const focusChapter = page.chapters[readingIndex >= 0 ? readingIndex : 0];
  const focusSubject = subjectOf(focusChapter);
  const terminalHref = holderTerminalHref(focusSubject);

  const heroCtaRef = useRef(null);
  const finalRef = useRef(null);
  const heroCtaInView = useInView(heroCtaRef);
  const finalInView = useInView(finalRef);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <HolderSessionProvider subject={heroSubject} actions={actions} alertsOn={leadAlerts}>
      <style dangerouslySetInnerHTML={{ __html: FEATURE_KEYFRAMES + STAGE_CSS }} />
      <section id="hero" className="relative w-full scroll-mt-0">
        <div className={cn(CONTAINER, "grid items-center gap-x-12 gap-y-12 pb-16 pt-24 md:pt-32 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]")}>
          <div className="flex min-w-0 flex-col items-start gap-6">
            <Breadcrumb page={page} />
            <HeroCopy hero={page.hero} />
            <HeroTools
              page={page}
              suggestions={initial.suggestions}
              market={market}
              subject={heroSubject}
              onPick={pick}
              onExample={() => setAutoplay(!reducedMotion)}
              ctaRef={heroCtaRef}
            />
          </div>
          <div className="min-w-0">
            <HeroPreview kind={lead.kind} holdersFirst={page.key === "market"} />
          </div>
        </div>
      </section>
      <div className={cn(CONTAINER, "xl:grid xl:grid-cols-[12rem_minmax(0,1fr)] xl:gap-10")}>
        <aside className="hidden min-w-0 xl:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain pb-6 pt-14 md:pt-20">
            <PageRail
              page={page}
              progress={progress}
              subjects={page.chapters.map((chapter) => subjectName(chapter.kind, subjectOf(chapter)))}
              terminalHref={terminalHref}
            />
          </div>
        </aside>
        <div className="min-w-0">
          {page.chapters.map((chapter, index) => (
            <StoryChapter
              key={chapter.id}
              page={page}
              chapter={chapter}
              chapterIndex={index}
              subject={subjectOf(chapter)}
              actions={actions}
              story={story}
              tourBase={tourBase}
              isDesktop={isDesktop}
              articles={articles}
              ownSession={index > 0}
              onProgress={onProgress}
            />
          ))}
          <FinalCta ref={finalRef} page={page} terminalHref={terminalHref} searchLabel={lead.kind === "trader" ? "Look up another wallet" : "Search another market"} />
        </div>
      </div>
      <MobileCtaBar
        shown={mounted && !heroCtaInView && !finalInView}
        label={subjectName(focusChapter.kind, focusSubject) || page.navLabel}
        terminalHref={terminalHref}
      />
    </HolderSessionProvider>
  );
}
