"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import { Copy, MoreVertical, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DestructiveConfirmMenuItem } from "@/components/ui/destructive-confirm-menu-item";
import { cn } from "@/lib/utils";
import {
  WELCOME_START_TAB_ID,
  duplicateTabName,
  newStartTabId,
  saveWorkspaceStartTabs,
} from "@/lib/workspaceStartTabs";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useUser } from "@/lib/hooks";
import { KALSHI_GUIDED_WEATHER_WORKFLOW_ID } from "@/lib/guidedWorkflows/kalshiHistorical/stepIds";
import { requestKalshiHistoricalGuidedWorkflow } from "@/lib/guidedWorkflows/pendingLaunch";

export const CHECKOUT_WELCOME_KEY = "lycheeCheckoutWelcome";
const CHECKOUT_CELEBRATE_KEY = "lycheeCheckoutCelebrate";
const WORKSPACE_WELCOME_SEEN_KEY = "lycheeWorkspaceWelcomeSeen";

const CONFETTI_COLORS = ["#e11d48", "#fb7185", "#fda4af", "#fbbf24", "#fde68a", "#ffffff"];
const MAILTO = "mailto:kash@lycheedata.com";

const RESEARCH = [
  {
    title: "Why Random Sampling Matters: A Polymarket Case Study",
    href: "/guides/random-sampling-data-analysis",
    image: "/images/guides/random-sampling-data-analysis/main.png",
  },
  {
    title: "When Do Prediction Markets Become Accurate?",
    href: "/guides/kalshi-historical-political-prediction-market-accuracy-lifecycle",
    image: "/images/guides/kalshi-historical-political-prediction-market-accuracy-lifecycle/main.png",
  },
  {
    title: "Are 90% Prediction Markets Reliable?",
    href: "/guides/kalshi-political-prediction-market-accuracy",
    image: "/images/guides/kalshi-political-prediction-market-accuracy/main.png",
  },
  {
    title: "Political Prediction Markets: What Historical Data Reveals",
    href: "/guides/kalshi-political-prediction-markets-analysis",
    image: "/images/guides/kalshi-political-prediction-markets-analysis/main.png",
  },
];

const GUIDES = [
  {
    title: "How to Compare Kalshi and Polymarket Odds",
    href: "/guides/how-to-compare-kalshi-polymarket-odds",
    image: "/images/guides/kalshi-polymarket-odds-comparison/main.png",
  },
  {
    title: "How to Build a Kalshi Weather Volatility Chart",
    href: "/guides/kalshi-weather-volatility-chart",
    image: "/images/guides/kalshi-weather-volatility-chart/main.png",
  },
  {
    title: "How to Build a Kalshi Weather Probability Calibration Chart",
    href: "/guides/kalshi-weather-probability-calibration-chart",
    image: "/images/guides/kalshi-weather-probability-calibration-chart/main.png",
  },
  {
    title: "How to Build a Kalshi Weather Probability Convergence Chart",
    href: "/guides/kalshi-weather-probability-convergence-chart",
    image: "/images/guides/kalshi-weather-probability-convergence-chart/main.png",
  },
];

const ROADMAP = [
  "Live X / Twitter integration to follow conversations alongside the markets.",
  "Live news feeds to see what event impacted your historical data, and to view breaking news for your interests in the dashboard in real time.",
  "Reddit integration to explore community discussions.",
  "More quantitative tools, including sentiment analysis in your browser.",
  "MCP integration to connect Lychee with your favorite AI agents and work from the tools you already use.",
];

export function rememberCheckoutWelcome(tier) {
  try {
    sessionStorage.setItem(
      CHECKOUT_WELCOME_KEY,
      JSON.stringify({ tier: String(tier || "").trim() }),
    );
    sessionStorage.setItem(CHECKOUT_CELEBRATE_KEY, "1");
  } catch {
    // Private mode can block storage. The dashboard still loads.
  }
}

/** Dev Strict Mode mounts twice; keep the consumed checkout payload for the second read. */
let stagedCheckoutWelcome;

/** Read the one-time post-checkout welcome, if this visit should open on it. */
export function takeCheckoutWelcome() {
  if (typeof window === "undefined") return null;
  if (stagedCheckoutWelcome !== undefined) {
    const staged = stagedCheckoutWelcome;
    stagedCheckoutWelcome = undefined;
    return staged;
  }
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("welcome") === "1";
  let hadStored = false;
  let storedTier = "";
  try {
    const raw = sessionStorage.getItem(CHECKOUT_WELCOME_KEY) || "";
    if (raw) {
      hadStored = true;
      sessionStorage.setItem(CHECKOUT_CELEBRATE_KEY, "1");
      sessionStorage.removeItem(CHECKOUT_WELCOME_KEY);
      const parsed = JSON.parse(raw);
      storedTier = String(parsed?.tier || "").trim();
    }
  } catch {
    hadStored = false;
  }
  let result = null;
  if (fromQuery) {
    const rawTier = String(params.get("tier") || storedTier || "Pro").trim();
    const tier = rawTier ? rawTier.charAt(0).toUpperCase() + rawTier.slice(1) : "Pro";
    result = { tier, celebrate: hadStored };
  } else if (hadStored) {
    result = { tier: storedTier, celebrate: true };
  }
  stagedCheckoutWelcome = result;
  queueMicrotask(() => {
    if (stagedCheckoutWelcome === result) stagedCheckoutWelcome = undefined;
  });
  return result;
}

/** True until this browser has left the welcome page once. */
export function workspaceWelcomePending() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(WORKSPACE_WELCOME_SEEN_KEY) !== "1";
  } catch {
    return true;
  }
}

export function markWorkspaceWelcomeSeen() {
  try {
    localStorage.setItem(WORKSPACE_WELCOME_SEEN_KEY, "1");
  } catch {
    // Private mode can block storage. This visit still leaves the welcome page.
  }
}

function clearWelcomeSearch() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("welcome") && !url.searchParams.has("tier")) return;
  url.searchParams.delete("welcome");
  url.searchParams.delete("tier");
  const search = url.searchParams.toString();
  window.history.replaceState(null, "", url.pathname + (search ? `?${search}` : "") + url.hash);
}

let welcomeConfettiPlayed = false;

function burstConfetti() {
  const base = { colors: CONFETTI_COLORS, startVelocity: 42, gravity: 0.9, ticks: 220, scalar: 1 };
  confetti({ ...base, particleCount: 110, spread: 78, origin: { y: 0.62 } });
  window.setTimeout(() => {
    confetti({ ...base, particleCount: 48, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
  }, 160);
  window.setTimeout(() => {
    confetti({ ...base, particleCount: 48, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
  }, 260);
}

function MailLink({ children }) {
  return (
    <a
      href={MAILTO}
      className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
    >
      {children}
    </a>
  );
}

function SectionTitle({ children }) {
  return <h3 className="text-lg font-semibold tracking-tighter text-foreground">{children}</h3>;
}

function BentoCell({ children }) {
  return (
    <div className="relative flex h-full flex-col gap-3 p-5 lg:p-6 before:absolute before:bottom-0 before:left-0 before:h-px before:w-full before:bg-border last:before:hidden lg:before:bottom-auto lg:before:left-auto lg:before:right-0 lg:before:top-0 lg:before:h-full lg:before:w-px">
      {children}
    </div>
  );
}

function PosterRow({ title, description, items }) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="space-y-0.5">
        <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="text-sm leading-snug">{description}</p>
      </div>
      <Carousel opts={{ align: "start", containScroll: "trimSnaps" }} className="group/row">
        <CarouselContent className="-ml-3">
          {items.map((item) => (
            <CarouselItem key={item.href} className="basis-[42%] pl-3 sm:basis-[30%] lg:basis-[22%]">
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.title}
                className="group/card block overflow-hidden rounded-lg border border-border bg-muted shadow-sm outline-none transition duration-300 group-hover/card:border-foreground/30 group-hover/card:shadow-md group-focus-visible/card:ring-2 group-focus-visible/card:ring-ring"
              >
                <div className="relative aspect-video">
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 42vw, (max-width: 1024px) 30vw, 220px"
                    className="object-cover transition duration-500 group-hover/card:scale-[1.04]"
                  />
                </div>
              </a>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-1 top-1/2 z-10 size-8 border-0 bg-black/75 text-white shadow-md hover:bg-black hover:text-white disabled:pointer-events-none disabled:opacity-0" />
        <CarouselNext className="right-1 top-1/2 z-10 size-8 border-0 bg-black/75 text-white shadow-md hover:bg-black hover:text-white disabled:pointer-events-none disabled:opacity-0" />
      </Carousel>
    </div>
  );
}

function StartTabChip({ tab, selected, userId, onSelect }) {
  const context = useMyStateV2();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(tab.name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!renaming) setDraftName(tab.name);
  }, [renaming, tab.name]);

  useEffect(() => {
    if (!renaming) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [renaming]);

  const persist = (next) => {
    context?.setWorkspaceStartTabs?.(next.tabs);
    context?.setWelcomeTabRemoved?.(next.welcomeRemoved);
    context?.setActiveWorkspaceStartTabId?.(next.activeId);
    saveWorkspaceStartTabs(userId, next);
  };

  const current = () => ({
    welcomeRemoved: !!context?.welcomeTabRemoved,
    tabs: Array.isArray(context?.workspaceStartTabs) ? context.workspaceStartTabs : [],
    activeId: context?.activeWorkspaceStartTabId || null,
  });

  const duplicate = () => {
    const state = current();
    const copy = {
      id: newStartTabId(),
      name: duplicateTabName(tab.name, state.tabs.map((item) => item.name)),
    };
    const index = state.tabs.findIndex((item) => item.id === tab.id);
    const at = index < 0 ? state.tabs.length : index + 1;
    const tabs = [...state.tabs.slice(0, at), copy, ...state.tabs.slice(at)];
    persist({ ...state, tabs, activeId: copy.id });
    onSelect?.(copy.id);
    setMenuOpen(false);
  };

  const commitRename = () => {
    const name = String(inputRef.current?.value ?? draftName).trim();
    setRenaming(false);
    if (!name || name === tab.name) {
      setDraftName(tab.name);
      return;
    }
    const state = current();
    persist({
      ...state,
      tabs: state.tabs.map((item) => (item.id === tab.id ? { ...item, name } : item)),
    });
  };

  const remove = () => {
    const state = current();
    const index = state.tabs.findIndex((item) => item.id === tab.id);
    const tabs = state.tabs.filter((item) => item.id !== tab.id);
    const welcomeRemoved = state.welcomeRemoved || tab.id === WELCOME_START_TAB_ID;
    const neighbor = tabs[index] || tabs[index - 1] || null;
    const activeId =
      state.activeId === tab.id ? neighbor?.id || null : state.activeId;
    persist({ welcomeRemoved, tabs, activeId });
    setMenuOpen(false);
    if (state.activeId === tab.id) {
      if (neighbor) onSelect?.(neighbor.id);
      else context?.setViewing?.("connectDataHome");
    }
  };

  return (
    <div className="group/tab relative inline-flex">
      {renaming ? (
        <input
          ref={inputRef}
          value={draftName}
          aria-label="Rename tab"
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            } else if (event.key === "Escape") {
              setDraftName(tab.name);
              setRenaming(false);
            }
          }}
          style={{ width: Math.max(88, draftName.length * 7 + 28) }}
          className="h-7 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : (
        <button
          type="button"
          role="tab"
          aria-selected={selected}
          onClick={() => onSelect?.(tab.id)}
          className={cn(
            "inline-flex h-7 items-center rounded-md border border-border px-2.5 text-xs font-medium shadow-sm transition-[padding-right] duration-200 ease-out",
            selected
              ? "bg-card text-foreground"
              : "bg-background text-muted-foreground transition-[padding-right,color,background-color] duration-200 hover:bg-muted hover:text-foreground",
            menuOpen && "pr-6",
            "group-hover/tab:pr-6 group-focus-within/tab:pr-6",
          )}
        >
          {tab.name}
        </button>
      )}
      {renaming ? null : (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${tab.name}`}
              className={cn(
                "absolute right-0.5 top-1/2 inline-flex size-5 -translate-y-1/2 translate-x-1 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-[opacity,transform] duration-200 ease-out hover:bg-muted hover:text-foreground",
                "pointer-events-none group-hover/tab:pointer-events-auto group-hover/tab:translate-x-0 group-hover/tab:opacity-100 group-focus-within/tab:pointer-events-auto group-focus-within/tab:translate-x-0 group-focus-within/tab:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:translate-x-0 data-[state=open]:opacity-100",
              )}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onSelect?.(tab.id);
              }}
            >
              <MoreVertical className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={6} className="w-48 rounded-xl p-1 shadow-lg">
            <DropdownMenuItem
              className="gap-2.5 rounded-md px-2 py-2 text-[13px]"
              onSelect={duplicate}
            >
              <Copy className="size-4 text-muted-foreground" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2.5 rounded-md px-2 py-2 text-[13px]"
              onSelect={() => {
                setDraftName(tab.name);
                setRenaming(true);
              }}
            >
              <Pencil className="size-4 text-muted-foreground" />
              Rename
            </DropdownMenuItem>
            <DestructiveConfirmMenuItem onConfirm={remove} />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function WorkspaceStartTabs({ welcomeActive, onOpenWelcome, onOpenIntegrations }) {
  const context = useMyStateV2();
  const sessionUser = useUser();
  const tabs = Array.isArray(context?.workspaceStartTabs) ? context.workspaceStartTabs : [];
  const activeId = context?.activeWorkspaceStartTabId;

  const selectTab = (id) => {
    context?.setActiveWorkspaceStartTabId?.(id);
    onOpenWelcome?.();
  };

  return (
    <div
      role="tablist"
      aria-label="Workspace"
      className="flex shrink-0 items-center gap-1.5 p-6"
    >
      {tabs.map((tab) => (
        <StartTabChip
          key={tab.id}
          tab={tab}
          selected={!!welcomeActive && tab.id === activeId}
          userId={sessionUser?.userId}
          onSelect={selectTab}
        />
      ))}
      <button
        type="button"
        role="tab"
        aria-selected={false}
        aria-label="Open integrations"
        onClick={onOpenIntegrations}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-sm leading-none text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
      >
        +
      </button>
    </div>
  );
}

export default function CheckoutWelcome({ name = "", tier = "", celebrate = false }) {
  const context = useMyStateV2();
  const sessionUser = useUser();

  useEffect(() => {
    if (welcomeConfettiPlayed) return;
    let celebrateNow = celebrate;
    try {
      if (sessionStorage.getItem(CHECKOUT_CELEBRATE_KEY) === "1") celebrateNow = true;
    } catch {
      celebrateNow = celebrate;
    }
    if (!celebrateNow) return;
    welcomeConfettiPlayed = true;
    try {
      sessionStorage.removeItem(CHECKOUT_CELEBRATE_KEY);
    } catch {
      // The in-memory flag still blocks a second burst this visit.
    }
    burstConfetti();
  }, [celebrate]);

  const displayName = String(name || sessionUser?.name || "").trim();
  const tierLabel = String(tier || "").trim() || "Lychee";
  const opening = displayName
    ? `You’re in, ${displayName}. Welcome to Lychee.`
    : "You’re in. Welcome to Lychee.";

  const leaveToIntegrations = () => {
    markWorkspaceWelcomeSeen();
    clearWelcomeSearch();
    context?.setViewing?.("connectDataHome");
  };

  const pullFirstDataset = () => {
    markWorkspaceWelcomeSeen();
    clearWelcomeSearch();
    requestKalshiHistoricalGuidedWorkflow(KALSHI_GUIDED_WEATHER_WORKFLOW_ID);
    context?.setIntegrationSidebar?.("kalshiHistorical");
    context?.setRightPanelOpen?.(false);
    context?.requestConnectWorkspace?.("kalshiHistorical");
    context?.setViewing?.("connectDataHome");
  };

  return (
      <div className="min-h-0 flex-1 overflow-y-auto pb-24">
        <div className="mx-auto w-full max-w-[90rem] space-y-6 px-6 py-6 text-sm leading-relaxed text-muted-foreground">
          <h1 className="text-xl font-semibold leading-snug tracking-tight text-foreground">{opening}</h1>
          <div className="space-y-3">
            <p>
              Your account is verified, your {tierLabel} subscription is active, and your workspace is ready.
            </p>
            <p>I’m Kash, the founder. Thank you for trusting Lychee with your research.</p>
            <p>
              I built Lychee because I was tired of writing custom code every time I needed data for my research.
            </p>
            <p>Since then, it’s grown into a workspace where you can:</p>
            <ul className="pl-4 text-sm leading-snug text-muted-foreground">
              {[
                "Answer your own questions about the markets",
                "Explore historical and live data from Kalshi and Polymarket.",
                "Turn that data into your own charts and visualizations.",
                "Run your analysis directly in your browser.",
                "Build custom dashboards to follow the markets that matter to you, your way.",
                "Share everything with your own audience",
              ].map((item) => (
                <li key={item} className="list-disc pl-1 marker:text-foreground/40">
                  {item}
                </li>
              ))}
            </ul>
            <p className="font-semibold text-foreground">All without writing a single line of code.</p>
          </div>

          <div className="space-y-4">
            <h2 className="text-center text-lg font-semibold tracking-tight text-foreground">Where to go from here</h2>
            <div className="grid grid-cols-1 items-stretch overflow-hidden border border-border lg:grid-cols-3">
              <BentoCell>
                <SectionTitle>Let’s pull your first dataset.</SectionTitle>
                <p>
                  Start with a guided walkthrough: <span className="font-medium text-foreground">find the top 10 Kalshi weather markets by all-time trading volume</span> using Kalshi Historical Data.
                </p>
                <p>We’ll walk you through the steps, then you can explore the results yourself.</p>
                <div className="mt-auto flex flex-row flex-wrap items-center gap-2 pt-2">
                  <Button type="button" onClick={pullFirstDataset} className="w-fit">
                    Pull my first dataset →
                  </Button>
                  <Button type="button" variant="ghost" className="w-fit" onClick={leaveToIntegrations}>
                    Skip and explore on my own
                  </Button>
                </div>
              </BentoCell>
              <BentoCell>
                <SectionTitle>Have a question, or something isn’t working as expected?</SectionTitle>
                <p>
                  Email me directly at <MailLink>kash@lycheedata.com</MailLink>. Tell me what you’re trying to do, and I’ll help you find a way forward.
                </p>
              </BentoCell>
              <BentoCell>
                <SectionTitle>Help shape what comes next</SectionTitle>
                <p>Here’s what’s on the roadmap:</p>
                <ul className="space-y-1.5 pl-4">
                  {ROADMAP.map((item) => (
                    <li key={item} className="list-disc pl-1 leading-snug marker:text-foreground/40">
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-auto pt-2">
                  Have something you’d love us to build? <MailLink>Email me</MailLink>. I’d love to hear what would make Lychee more useful to you.
                </p>
              </BentoCell>
            </div>
            <div className="min-w-0 space-y-5">
              <PosterRow
                title="See what we’ve uncovered with Lychee"
                description="Explore the questions, methods, and findings behind our research."
                items={RESEARCH}
              />
              <PosterRow
                title="Learn something new"
                description="Our latest guides walk through the data, tools, and concepts."
                items={GUIDES}
              />
            </div>
          </div>

          <div className="space-y-1 border-t border-border pt-4 text-foreground">
            <p>Make yourself at home. Bring a question. See where the data takes you.</p>
            <p className="pt-3 font-medium">Kash</p>
            <p className="text-muted-foreground">Founder, Lychee</p>
            <div className="pt-4">
              <Button type="button" onClick={leaveToIntegrations}>
                Head to your Workspace
              </Button>
            </div>
          </div>
        </div>
      </div>
  );
}
