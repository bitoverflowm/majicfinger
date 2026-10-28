import Link from "next/link";
import type { ReactNode } from "react";

import { DemoScrollLink } from "./demo-scroll-link";
import { CryptoTerminalDemo } from "./research/crypto-terminal-demo";
import { HolderResearchDemo } from "./research/holder-research-demo";
import { OddsCompareDemo } from "./research/odds-compare-demo";

type ResearchCard = {
  id: string;
  title: string;
  description: string;
  cta: { label: string; href: string; demo?: boolean };
  demo: ReactNode;
};

const CARDS: readonly ResearchCard[] = [
  {
    id: "holders",
    title: "Research Polymarket holders and wallets.",
    description:
      "See who holds the largest positions, then explore those wallets’ other positions and trading activity. Investigate whether exposure is concentrated among a few holders and how each position fits into a broader portfolio.",
    cta: { label: "Explore Polymarket wallet research", href: "/polymarket-live-data#polymarket-holders-positions" },
    demo: <HolderResearchDemo />,
  },
  {
    id: "compare",
    title: "Compare Kalshi and Polymarket odds.",
    description:
      "View corresponding contracts side by side to compare prices and trading activity. Review their wording and settlement rules to understand whether the price difference reflects the same underlying question.",
    cta: { label: "Compare Kalshi and Polymarket odds", href: "/kalshi-vs-polymarket-odds" },
    demo: <OddsCompareDemo />,
  },
  {
    id: "crypto",
    title: "Follow 15-minute crypto markets with more context.",
    description:
      "Keep prediction market odds, Binance spot prices, and relevant Chainlink feeds in the same terminal. Follow the underlying asset alongside the contract as resolution approaches.",
    cta: { label: "Explore a crypto research terminal", href: "/#demo", demo: true },
    demo: <CryptoTerminalDemo />,
  },
];

const LINK_CLASS = "w-fit text-sm text-secondary transition-colors hover:text-primary";

/** The demos reuse the `ds-` keyframes defined by the data sources section. */
const REDUCED_MOTION = `@media (prefers-reduced-motion: reduce) { #features [class*="ds-"] { animation: none !important; } }`;

export function FeatureSection() {
  return (
    <section id="features" className="relative w-full scroll-mt-28">
      <div className="mx-auto w-full max-w-[min(100%,84rem)] px-6 py-12 sm:px-8 md:py-16 lg:px-10">
        <div className="max-w-2xl">
          <h2 className="text-xl font-normal tracking-tight text-primary sm:text-2xl">
            Go deeper into the questions behind the odds.
          </h2>
          <p className="mt-1 text-muted-foreground">
            Investigate market positioning, compare prices across platforms, and follow crypto markets with the
            underlying data in view.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:mt-8 lg:grid-cols-3">
          {CARDS.map((card) => (
            <article key={card.id} className="flex flex-col rounded-xl bg-muted p-2 sm:p-3">
              <div className="px-3 pb-6 pt-3 text-[1.0625rem] leading-snug tracking-tight sm:px-4 sm:pt-4">
                <h3 className="font-normal text-primary">{card.title}</h3>
                <p className="text-muted-foreground">{card.description}</p>
                <div className="mt-4">
                  {card.cta.demo ? (
                    <DemoScrollLink href={card.cta.href} activateLandingDemo className={LINK_CLASS}>
                      {card.cta.label} →
                    </DemoScrollLink>
                  ) : (
                    <Link href={card.cta.href} className={LINK_CLASS}>
                      {card.cta.label} →
                    </Link>
                  )}
                </div>
              </div>
              <div className="mt-auto">{card.demo}</div>
            </article>
          ))}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: REDUCED_MOTION }} />
    </section>
  );
}
