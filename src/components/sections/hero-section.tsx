import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { CompanyShowcase } from "./company-showcase";
import { DashboardDemoSectionLazy } from "./dashboard-demo-section-lazy";
import { DemoScrollLink } from "./demo-scroll-link";
import { LandingDemoScrollManager } from "./landing-demo-scroll";
import { ResearchQuestionRotator } from "./research-question-rotator";

export function HeroSection() {
  const { hero } = siteConfig;
  const badgeIcon =
    hero.badgeIcon === "dot" ? (
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
    ) : (
      hero.badgeIcon
    );

  const badgeClassName =
    "border border-border bg-accent rounded-full text-sm h-8 px-3 inline-flex items-center gap-2 max-w-full text-left";

  return (
    <section id="hero" className="relative w-full overflow-visible">
      <LandingDemoScrollManager />

      <div className="relative z-10 mx-auto flex w-full max-w-[min(100%,84rem)] flex-col items-start gap-6 px-6 pb-10 pt-28 sm:px-8 md:pt-32 lg:px-10">
        {hero.badgeHref ? (
          <Link
            href={hero.badgeHref}
            className={cn(
              badgeClassName,
              "text-foreground transition-colors hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            {badgeIcon}
            <span className="leading-tight">{hero.badge}</span>
            <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        ) : (
          <p className={cn(badgeClassName, "text-foreground")}>
            {badgeIcon}
            {hero.badge}
          </p>
        )}
        <div className="flex w-full max-w-[34rem] flex-col gap-3 text-left">
          <h1 className="text-balance text-[1.5rem] font-normal leading-[1.25] tracking-tight text-primary sm:text-[1.625rem]">
            {hero.title}
            {hero.subtitle ? (
              <span className="block text-muted-foreground">{hero.subtitle}</span>
            ) : null}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
            {hero.description}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
          <DemoScrollLink
            href={hero.cta.primary.href}
            activateLandingDemo
            className="flex h-9 w-32 items-center justify-center rounded-full border border-white/[0.12] bg-secondary px-4 text-sm font-normal tracking-wide text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] transition-all ease-out hover:bg-secondary/80 active:scale-95 dark:text-secondary-foreground"
          >
            {hero.cta.primary.text}
          </DemoScrollLink>
          <Link
            href={hero.cta.secondary.href}
            className="flex h-10 w-32 items-center justify-center rounded-full border border-[#E5E7EB] bg-white px-5 text-sm font-normal tracking-wide text-primary transition-all ease-out hover:bg-white/80 active:scale-95 dark:border-[#27272A] dark:bg-background dark:hover:bg-background/80"
          >
            {hero.cta.secondary.text}
          </Link>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[65rem] px-6 pb-4 md:pb-6 lg:pb-8">
        <ResearchQuestionRotator />
      </div>

      <DashboardDemoSectionLazy />
      <CompanyShowcase />
    </section>
  );
}
