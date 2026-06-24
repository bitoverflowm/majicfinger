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
  const heroTitleLines = hero.title.trim().split(/\n+/);
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
    "border border-border bg-accent rounded-full text-sm h-8 px-3 inline-flex items-center gap-2 max-w-full text-center";

  return (
    <section id="hero" className="relative w-full overflow-visible">
      <LandingDemoScrollManager />
      {/* Background only — must stay below copy (z-10) and demo (z-30). */}
      <div
        aria-hidden
        className="hero-aura-gradient pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto h-[38rem] w-full max-w-[min(100%,84rem)] rounded-b-2xl md:h-[42rem] lg:h-[44rem]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[65rem] flex-col items-center gap-10 px-6 pb-12 pt-32 md:pb-16 md:pt-32 lg:pb-20">
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
        <div className="flex w-full max-w-[65rem] flex-col items-center justify-center gap-5 px-1 sm:px-0">
          <h1 className="flex w-full max-w-full flex-col gap-2 text-center text-[clamp(1.125rem,2.15vw+0.625rem,2.625rem)] font-medium leading-[1.1] tracking-tighter text-primary sm:gap-2.5">
            {heroTitleLines.map((line, i) => (
              <span key={i} className="block max-w-full md:whitespace-nowrap">
                {line}
              </span>
            ))}
          </h1>
          <p className="text-balance text-center text-base font-medium leading-relaxed tracking-tight text-muted-foreground md:text-lg">
            {hero.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <DemoScrollLink
            href={hero.cta.primary.href}
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

        <ResearchQuestionRotator />
      </div>

      <DashboardDemoSectionLazy />
      <CompanyShowcase />
    </section>
  );
}
