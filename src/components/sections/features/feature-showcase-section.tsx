import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { SectionHeader } from "@/components/section-header";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { SectionScrollLink } from "../section-scroll-link";
import automateBackdrop from "../../../../public/landing/feature-automate.jpg";
import connectBackdrop from "../../../../public/landing/feature-connect-village.jpg";
import dashboardsBackdrop from "../../../../public/landing/feature-dashboards.jpg";
import exploreBackdrop from "../../../../public/landing/feature-explore-lake.jpg";
import insightsBackdrop from "../../../../public/landing/feature-insights.jpg";
import { ConnectDemo } from "./connect-demo";
import { DashboardDemo } from "./dashboard-demo";
import { DemoRecipeLink } from "./demo-recipe-link";
import { FEATURE_KEYFRAMES } from "./feature-keyframes";
import { HolderTerminalShowcase } from "./holder-terminal-showcase";
import { LiveTerminalDemo } from "./live-terminal-demo";
import { TradeHistoryDemo } from "./trade-history-demo";
import { TransformDemo } from "./transform-demo";

export type Showcase = {
  demo: ReactNode;
  backdrop: StaticImageData;
  cta: string;
  href?: string;
  /** Opens this recipe in the homepage demo instead of following `href`. */
  recipeId?: string;
  /** Smooth-scrolls to this section id when it is on the page. */
  sectionId?: string;
  /** Homepage copy that replaces the shared `bentoSection` text. */
  title?: string;
  /** One string per paragraph. */
  description?: string | readonly string[];
};

/** Demo, backdrop and link for each `siteConfig.bentoSection` item, keyed by item id. */
const SHOWCASE: Record<string, Showcase> = {
  "1": {
    demo: <ConnectDemo />,
    backdrop: connectBackdrop,
    href: "/#data-sources",
    sectionId: "data-sources",
    cta: "Explore our data sources",
  },
  "2": { demo: <DashboardDemo />, backdrop: dashboardsBackdrop, href: "/dashboards-gallery", cta: "Browse dashboards" },
  "3": {
    demo: <TransformDemo />,
    backdrop: insightsBackdrop,
    href: "/guides",
    sectionId: "library-research",
    cta: "Read up on the published research",
    title: "Turn market data into your own analysis.",
    description:
      "Join markets with their trades, calculate new columns with familiar spreadsheet formulas, and group activity into useful time intervals. Compare volume, calculate average trade sizes, and summarize results—all without code.",
  },
  "4": {
    demo: <LiveTerminalDemo />,
    backdrop: automateBackdrop,
    href: "/dashboards-gallery",
    sectionId: "library-dashboards",
    cta: "Explore custom live terminals",
    title: "Follow your markets in one live research terminal.",
    description: [
      "Bring Kalshi and Polymarket prices, trades, and order books into your own layout. Arrange charts and tables across tabs, add supporting price feeds, and keep the markets you follow in view.",
      "Save your terminal and return to the same research setup.",
    ],
  },
};

/** Homepage-only row, kept out of `bentoSection` so pages reusing that config are unchanged. */
const EXPLORE_ROW: { id: string; title: string; description: string; showcase: Showcase } = {
  id: "explore",
  title: "From a market question to data you can explore.",
  description:
    "Find a Kalshi or Polymarket market by name, ticker, or slug, then inspect its trades, order book, and holders, and download a CSV. Start with a ready-made recipe, then explore the data further with filters, calculations, and charts.",
  showcase: {
    demo: <TradeHistoryDemo />,
    backdrop: exploreBackdrop,
    cta: "Explore Kalshi trade history",
    recipeId: "kalshiTradeHistory",
  },
};

const CTA_CLASS = "w-fit text-sm text-secondary transition-colors hover:text-primary";

export type ShowcaseRow = { id: string; title: string; description: string | readonly string[]; showcase: Showcase };

/** `afterConnect` renders between the "Connect" row and the rest of the showcase; `end` after the last row. */
export function FeatureShowcaseSection({ afterConnect, end }: { afterConnect?: ReactNode; end?: ReactNode }) {
  const { title, description, items } = siteConfig.bentoSection;
  const rows: ShowcaseRow[] = items.flatMap((item) => {
    const showcase = SHOWCASE[item.id];
    if (!showcase) return [];
    const row = {
      id: item.id,
      title: showcase.title ?? item.title,
      description: showcase.description ?? item.description,
      showcase,
    };
    return item.id === "1" ? [EXPLORE_ROW, row] : [row];
  });
  const split = afterConnect ? rows.findIndex((row) => row.id === "1") + 1 : 0;
  const lead = rows.slice(0, split);
  const rest = rows.slice(split);

  return (
    <section id="bento" className="relative w-full scroll-mt-28 !border-t-0">
      <style dangerouslySetInnerHTML={{ __html: FEATURE_KEYFRAMES }} />
      <SectionHeader>
        <h2 className="text-balance pb-1 text-center text-3xl font-medium tracking-tighter md:text-4xl">{title}</h2>
        <p className="text-balance text-center font-medium text-muted-foreground">{description}</p>
      </SectionHeader>

      {lead.length ? (
        <ShowcaseRows rows={lead} start={<HolderTerminalShowcase />} className="pt-10 md:pt-14" />
      ) : null}
      {afterConnect}
      <ShowcaseRows
        rows={rest}
        offset={lead.length}
        start={lead.length ? null : <HolderTerminalShowcase />}
        className={lead.length ? "pb-10 md:pb-14" : "py-10 md:py-14"}
      />
      {end}
    </section>
  );
}

export function ShowcaseRows({
  rows,
  offset = 0,
  start,
  className,
}: {
  rows: ShowcaseRow[];
  offset?: number;
  start?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "features-showcase mx-auto flex w-full max-w-[min(100%,84rem)] flex-col gap-6 px-6 sm:px-8 lg:gap-8 lg:px-10",
        className,
      )}
    >
      {start}
      {rows.map((item, index) => {
        const { showcase } = item;
        const flip = (offset + index) % 2 === 1;
        return (
          <article key={item.id} className="grid overflow-hidden rounded-xl bg-muted lg:grid-cols-3">
            <div
              className={cn(
                "flex flex-col justify-center gap-4 p-6 sm:p-8 lg:px-10",
                flip && "lg:order-2",
              )}
            >
              <div className="max-w-md text-xl leading-snug tracking-tight sm:text-[1.3rem]">
                <h3 className="font-normal text-primary">{item.title}</h3>
                {(typeof item.description === "string" ? [item.description] : item.description).map((paragraph, i) => (
                  <p key={i} className={cn("text-muted-foreground", i > 0 && "mt-3")}>
                    {paragraph}
                  </p>
                ))}
              </div>
              {showcase.recipeId ? (
                <DemoRecipeLink recipeId={showcase.recipeId} className={CTA_CLASS}>
                  {showcase.cta} →
                </DemoRecipeLink>
              ) : showcase.sectionId ? (
                <SectionScrollLink
                  href={showcase.href ?? "/"}
                  sectionId={showcase.sectionId}
                  className={CTA_CLASS}
                >
                  {showcase.cta} →
                </SectionScrollLink>
              ) : (
                <Link href={showcase.href ?? "/"} className={CTA_CLASS}>
                  {showcase.cta} →
                </Link>
              )}
            </div>
            <div className={cn("p-2 sm:p-3 lg:col-span-2", flip && "lg:order-1")}>
              <div className="relative h-[26rem] overflow-hidden rounded-lg sm:h-[30rem] lg:h-[34rem]">
                <Image
                  src={showcase.backdrop}
                  alt=""
                  fill
                  placeholder="blur"
                  sizes="(min-width: 1344px) 860px, (min-width: 1024px) 64vw, 100vw"
                  className="pointer-events-none select-none object-cover"
                />
                <div className="absolute inset-3 sm:inset-8 lg:inset-10">{showcase.demo}</div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
