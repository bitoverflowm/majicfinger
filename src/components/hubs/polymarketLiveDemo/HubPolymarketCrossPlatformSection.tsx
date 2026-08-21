"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@radix-ui/react-icons";

import { HubCtaButton } from "@/components/hubs/HubCtaButton";
import { HubLazyWhenVisible } from "@/components/hubs/HubLazyWhenVisible";
import { INTEGRATION_LOGO_STRIP } from "@/lib/integrations/integration-logo-strip";
import { PRIMARY_INTEGRATION_HUB_PATHS } from "@/lib/integrations/marketing-catalog";
import { cn } from "@/lib/utils";
import type {
  HubCrossPlatformResearchCard,
  HubCrossPlatformResearchSection,
} from "@/types/hub";

const HubPolymarketKalshiCompareDemo = dynamic(
  () =>
    import("@/components/hubs/polymarketLiveDemo/HubPolymarketKalshiCompareDemo").then(
      (m) => m.HubPolymarketKalshiCompareDemo,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[28rem] w-full animate-pulse rounded-xl bg-muted/40 ring-1 ring-border/50" />
    ),
  },
);

function SectionEyebrow({ children }: { children: string }) {
  return (
    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-secondary">
      {children}
    </p>
  );
}

function IntegrationLogoChip({
  label,
  src,
  href,
  comingSoon,
}: {
  label: string;
  src: string | null;
  href: string;
  comingSoon?: boolean;
}) {
  return (
    <Link
      href={href}
      title={comingSoon ? `${label} (coming soon)` : label}
      className={cn(
        "relative inline-flex size-9 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-background shadow-sm transition-colors hover:border-border hover:bg-muted/40",
        comingSoon && "opacity-80",
      )}
    >
      {src ? (
        <Image src={src} alt="" width={28} height={28} className="object-contain p-0.5" />
      ) : (
        <span className="px-0.5 text-center text-[7px] font-semibold leading-tight text-foreground">
          {label}
        </span>
      )}
      {comingSoon ? <span className="sr-only">Coming soon</span> : null}
    </Link>
  );
}

/**
 * Compact cross-platform research block for Polymarket Live:
 * integration cards → Kalshi compare demo → external signals strip.
 * Intentionally smaller hierarchy than primary Polymarket Live demo sections.
 */
export function HubPolymarketCrossPlatformSection({
  section,
}: {
  section: HubCrossPlatformResearchSection;
}) {
  return (
    <section
      id={section.anchorId}
      className={cn(
        "w-full px-6 py-12 sm:px-8 md:px-10 md:py-16",
        section.anchorId && "scroll-mt-28",
      )}
    >
      <div className="mx-auto w-full max-w-4xl space-y-8 px-2 sm:px-0">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          {section.eyebrow ? (
            <div className="flex justify-center">
              <SectionEyebrow>{section.eyebrow}</SectionEyebrow>
            </div>
          ) : null}
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {section.title}
          </h2>
          {section.intro
            ? section.intro.split("\n\n").filter(Boolean).map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="text-sm leading-relaxed text-muted-foreground md:text-base text-pretty"
                >
                  {paragraph}
                </p>
              ))
            : null}
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {section.cards.map((card) => {
            const inner = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
                  {card.youAreHere ? (
                    <span className="shrink-0 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                      You’re Here
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-muted-foreground text-pretty">
                  {card.description}
                </p>
                {!card.youAreHere ? (
                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-foreground">
                    Open hub
                    <ArrowRightIcon className="size-3" aria-hidden />
                  </span>
                ) : (
                  <span className="mt-3 inline-flex text-[11px] font-medium text-muted-foreground">
                    Current page
                  </span>
                )}
              </>
            );

            return (
              <li key={card.id}>
                {card.youAreHere ? (
                  <div
                    className={cn(
                      "flex h-full flex-col rounded-lg border border-secondary/35 bg-secondary/5 p-4 shadow-sm",
                    )}
                    aria-current="page"
                  >
                    {inner}
                  </div>
                ) : (
                  <Link
                    href={card.href}
                    className="flex h-full flex-col rounded-lg border border-border/70 bg-background p-4 shadow-sm transition-colors hover:border-border hover:bg-muted/20"
                  >
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        <div
          id="compare-polymarket-kalshi"
          className="scroll-mt-28 space-y-4 border-t border-border/50 pt-8"
        >
          <div className="mx-auto max-w-2xl space-y-2 text-center">
            {section.compareEyebrow ? (
              <div className="flex justify-center">
                <SectionEyebrow>{section.compareEyebrow}</SectionEyebrow>
              </div>
            ) : null}
            {section.compareTitle ? (
              <h3 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                {section.compareTitle}
              </h3>
            ) : null}
            {section.compareIntro ? (
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                {section.compareIntro}
              </p>
            ) : null}
          </div>

          <HubLazyWhenVisible
            rootMargin="320px 0px"
            fallback={
              <div className="h-[28rem] w-full animate-pulse rounded-xl bg-muted/40 ring-1 ring-border/50" />
            }
          >
            <div className="rounded-xl border border-border/70 bg-background/80 p-3 sm:p-4">
              <HubPolymarketKalshiCompareDemo />
            </div>
          </HubLazyWhenVisible>
        </div>

        <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-5 text-center sm:px-6">
          {section.signalsTitle ? (
            <h3 className="text-sm font-semibold text-foreground">{section.signalsTitle}</h3>
          ) : null}
          {section.signalsBody ? (
            <p className="mx-auto mt-2 max-w-2xl text-[12px] leading-relaxed text-muted-foreground text-pretty">
              {section.signalsBody}
            </p>
          ) : null}
          <ul className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {INTEGRATION_LOGO_STRIP.map((item) => (
              <li key={item.id}>
                <IntegrationLogoChip
                  label={item.label}
                  src={item.src}
                  href={item.href}
                  comingSoon={item.comingSoon}
                />
              </li>
            ))}
          </ul>
          {section.cta || section.secondaryCta ? (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {section.cta ? <HubCtaButton cta={section.cta} variant="secondary" /> : null}
              {section.secondaryCta ? (
                <HubCtaButton cta={section.secondaryCta} variant="secondary" />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** Default card set for Polymarket Live — links only to existing hubs. */
export function defaultPolymarketCrossPlatformCards(): HubCrossPlatformResearchCard[] {
  return [
    {
      id: "polymarket-live",
      title: "Polymarket Live",
      description:
        "Follow active markets, prices, trades, spreads, order books, holders and positions as conditions change.",
      href: PRIMARY_INTEGRATION_HUB_PATHS.polymarket,
      youAreHere: true,
    },
    {
      id: "polymarket-historical",
      title: "Polymarket Historical",
      description:
        "Study resolved markets, longer price histories and past market behavior for research and backtesting.",
      href: PRIMARY_INTEGRATION_HUB_PATHS.polymarketHistorical,
    },
    {
      id: "kalshi-live",
      title: "Kalshi Live",
      description:
        "Compare current probabilities, prices, volume and market activity across prediction-market platforms.",
      href: PRIMARY_INTEGRATION_HUB_PATHS.kalshiLive,
    },
    {
      id: "kalshi-historical",
      title: "Kalshi Historical",
      description:
        "Explore Kalshi markets and trades across the platform’s complete historical lifecycle.",
      href: PRIMARY_INTEGRATION_HUB_PATHS.kalshiHistorical,
    },
  ];
}
