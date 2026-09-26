"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useUser } from "@/lib/hooks";
import { KALSHI_GUIDED_WEATHER_WORKFLOW_ID } from "@/lib/guidedWorkflows/kalshiHistorical/stepIds";
import { requestKalshiHistoricalGuidedWorkflow } from "@/lib/guidedWorkflows/pendingLaunch";

export const CHECKOUT_WELCOME_KEY = "lycheeCheckoutWelcome";

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
  } catch {
    // Private mode can block storage. The dashboard still loads.
  }
}

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
  return <h3 className="text-base font-semibold tracking-tight text-foreground">{children}</h3>;
}

function ColumnCard({ children, className = "" }) {
  return (
    <div className={`flex flex-col gap-2.5 rounded-xl border border-border bg-card p-4 ${className}`}>
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
            <CarouselItem key={item.href} className="basis-[78%] pl-3 sm:basis-[46%]">
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
                    sizes="(max-width: 1024px) 70vw, 280px"
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

export default function CheckoutWelcome({ preview = false, name = "" }) {
  const context = useMyStateV2();
  const sessionUser = useUser();
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState("");

  useEffect(() => {
    if (preview) {
      setTier("Pro");
      setOpen(true);
      burstConfetti();
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") {
      const fromQuery = String(params.get("tier") || "Pro").trim();
      setTier(fromQuery ? fromQuery.charAt(0).toUpperCase() + fromQuery.slice(1) : "Pro");
      setOpen(true);
      burstConfetti();
      return;
    }

    let raw = "";
    try {
      raw = sessionStorage.getItem(CHECKOUT_WELCOME_KEY) || "";
      if (raw) sessionStorage.removeItem(CHECKOUT_WELCOME_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    let parsed = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
    setTier(String(parsed?.tier || "").trim());
    setOpen(true);
    burstConfetti();
  }, [preview]);

  const displayName = String(name || sessionUser?.name || "").trim();
  const tierLabel = String(tier || "").trim() || "Lychee";
  const opening = displayName
    ? `You’re in, ${displayName}. Welcome to Lychee.`
    : "You’re in. Welcome to Lychee.";

  const pullFirstDataset = () => {
    if (context?.requestConnectWorkspace) {
      requestKalshiHistoricalGuidedWorkflow(KALSHI_GUIDED_WEATHER_WORKFLOW_ID);
      context.setViewing?.("connectDataHome");
      context.setIntegrationSidebar?.("kalshiHistorical");
      context.setRightPanelOpen?.(false);
      context.requestConnectWorkspace("kalshiHistorical");
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        overlayClassName="z-[1000]"
        className="z-[1001] flex max-h-[min(90vh,900px)] w-[min(96vw,90rem)] max-w-[90rem] flex-col gap-0 overflow-hidden p-0 sm:max-w-[90rem] [&>button]:hidden"
      >
        <DialogHeader className="relative space-y-1 border-b border-border px-6 py-4 pr-12 text-left">
          <DialogTitle className="text-xl leading-snug">{opening}</DialogTitle>
          <DialogDescription className="sr-only">
            A note from Kash about your new workspace.
          </DialogDescription>
          <DialogClose className="absolute right-4 top-1/2 -translate-y-1/2 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:pointer-events-none dark:ring-offset-slate-950 dark:focus:ring-slate-300">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-muted-foreground">
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
            <div className="grid items-start gap-3 lg:grid-cols-3">
              <ColumnCard className="bg-muted/40">
                <SectionTitle>Let’s pull your first dataset.</SectionTitle>
                <p>
                  Start with a guided walkthrough: <span className="font-medium text-foreground">find the top 10 Kalshi weather markets by all-time trading volume</span> using Kalshi Historical Data.
                </p>
                <p>We’ll walk you through the steps, then you can explore the results yourself.</p>
                <div className="mt-auto flex flex-row flex-wrap items-center gap-2 pt-1">
                  <Button type="button" onClick={pullFirstDataset} className="w-fit">
                    Pull my first dataset →
                  </Button>
                  <Button type="button" variant="ghost" className="w-fit" onClick={() => setOpen(false)}>
                    Skip and explore on my own
                  </Button>
                </div>
              </ColumnCard>
              <ColumnCard>
                <SectionTitle>Have a question, or something isn’t working as expected?</SectionTitle>
                <p>
                  Email me directly at <MailLink>kash@lycheedata.com</MailLink>. Tell me what you’re trying to do, and I’ll help you find a way forward.
                </p>
              </ColumnCard>
              <ColumnCard>
                <SectionTitle>Help shape what comes next</SectionTitle>
                <p>Here’s what’s on the roadmap:</p>
                <ul className="space-y-1.5 pl-4">
                  {ROADMAP.map((item) => (
                    <li key={item} className="list-disc pl-1 leading-snug marker:text-foreground/40">
                      {item}
                    </li>
                  ))}
                </ul>
                <p>
                  Have something you’d love us to build? <MailLink>Email me</MailLink>. I’d love to hear what would make Lychee more useful to you.
                </p>
              </ColumnCard>
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
              <Button type="button" onClick={() => setOpen(false)}>
                Head to your Workspace
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
