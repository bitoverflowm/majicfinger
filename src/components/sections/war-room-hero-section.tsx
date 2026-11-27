"use client";

import Link from "next/link";
import { NewsletterInline } from "@/components/newsletter/newsletter-signup";
import { LandingDemoScrollManager } from "./landing-demo-scroll";
import { DemoScrollLink } from "./demo-scroll-link";
import { HomepageExploreTabs } from "./homepage-explore-tabs";
import { scrollToPricingSection } from "@/lib/scrollToPricing";

export function WarRoomHeroSection({ fixture = false }: { fixture?: boolean }) {
  return (
    <section id="hero" className="relative w-full overflow-visible">
      <LandingDemoScrollManager />
      <div className="mx-auto flex w-full max-w-[min(100%,48rem)] flex-col items-center px-8 py-[150px] text-center">
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          The Ultimate Intelligence Terminal for Predicting the Future
        </h1>
        <p className="mt-5 max-w-[40rem] text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          Research Kalshi and Polymarket. Monitor real-world signals. Explore markets, trades,
          investigate wallets, build custom charts and live sharable dashboards. No code. No setup.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <DemoScrollLink
            href="#demo"
            className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition hover:opacity-90"
          >
            Learn More
          </DemoScrollLink>
          <Link
            href="/#pricing"
            onClick={(e) => {
              e.preventDefault();
              scrollToPricingSection();
            }}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-border bg-muted px-5 text-sm font-medium text-foreground transition hover:bg-muted/70"
          >
            See plans
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
      <HomepageExploreTabs fixture={fixture} />
      {/* Mobile-only: same newsletter form as the War Room interrupt, for dismissers. lg+ unchanged. */}
      <div className="w-full lg:hidden">
        <NewsletterInline
          band
          title="Stay in the Lychee loop."
          description="Kalshi and Polymarket research, guides, and product updates — plus subscriber offers."
        />
      </div>
    </section>
  );
}
