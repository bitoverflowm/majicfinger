import { siteConfig } from "@/lib/config";
import Link from "next/link";
import { CompanyShowcase } from "./company-showcase";
import { DashboardDemoSectionLazy } from "./dashboard-demo-section-lazy";
import { DemoScrollLink } from "./demo-scroll-link";
import { HeroDescription } from "./hero-description";
import { LandingDemoScrollManager } from "./landing-demo-scroll";
export function HeroSection() {
  const { hero } = siteConfig;

  return (
    <section id="hero" className="relative w-full overflow-visible">
      <LandingDemoScrollManager />

      <div className="relative z-10 mx-auto flex w-full max-w-[min(100%,84rem)] flex-col items-start gap-6 px-6 pb-10 pt-28 sm:px-8 md:pt-32 lg:px-10">
        <div className="flex w-full max-w-[34rem] flex-col gap-3 text-left">
          <h1 className="text-balance text-[1.5rem] font-normal leading-[1.25] tracking-tight text-primary sm:text-[1.625rem]">
            {hero.title}
            {hero.subtitle ? (
              <span className="block text-muted-foreground">{hero.subtitle}</span>
            ) : null}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
            <HeroDescription text={hero.description} terms={hero.descriptionTerms} />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DemoScrollLink
            href={hero.cta.primary.href}
            activateLandingDemo
            className="flex h-12 items-center justify-center rounded-full border border-white/[0.12] bg-secondary px-6 text-base font-normal text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] transition-all ease-out hover:bg-secondary/80 active:scale-95 dark:text-secondary-foreground"
          >
            {hero.cta.primary.text}
          </DemoScrollLink>
          <Link
            href={hero.cta.secondary.href}
            className="flex h-12 items-center justify-center gap-1.5 rounded-full border border-border bg-muted px-6 text-base font-normal text-primary transition-all ease-out hover:bg-muted/70 active:scale-95"
          >
            {hero.cta.secondary.text}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      <DashboardDemoSectionLazy framed />
      <CompanyShowcase />
    </section>
  );
}
