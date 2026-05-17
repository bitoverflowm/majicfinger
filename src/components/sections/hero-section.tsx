import { siteConfig } from "@/lib/config";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DashboardDemoSection } from "./dashboard-demo-section";

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
      {/* Background only — must stay below copy (z-10) and demo (z-30). */}
      <div
        aria-hidden
        className="hero-aura-gradient pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto h-[38rem] w-full max-w-[min(100%,84rem)] rounded-b-2xl md:h-[42rem] lg:h-[44rem]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[65rem] flex-col items-center gap-10 px-6 pb-20 pt-32 md:pb-24 lg:pb-28">
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
          </Link>
        ) : (
          <p className={cn(badgeClassName, "text-foreground")}>
            {badgeIcon}
            {hero.badge}
          </p>
        )}
        <div className="flex w-full max-w-[65rem] flex-col items-center justify-center gap-5 px-1 sm:px-0">
          <h1 className="flex w-full max-w-full flex-col gap-2 sm:gap-2.5 text-3xl font-medium tracking-tighter text-primary md:text-4xl lg:text-5xl xl:text-6xl text-center">
            {heroTitleLines.map((line, i) => (
              <span key={i} className="block max-w-full leading-[1.1]">
                {line}
              </span>
            ))}
          </h1>
          <p className="text-balance text-center text-base font-medium leading-relaxed tracking-tight text-muted-foreground md:text-lg">
            {hero.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href={hero.cta.primary.href}
            className="flex h-9 w-32 items-center justify-center rounded-full border border-white/[0.12] bg-secondary px-4 text-sm font-normal tracking-wide text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] transition-all ease-out hover:bg-secondary/80 active:scale-95 dark:text-secondary-foreground"
          >
            {hero.cta.primary.text}
          </Link>
          <Link
            href={hero.cta.secondary.href}
            className="flex h-10 w-32 items-center justify-center rounded-full border border-[#E5E7EB] bg-white px-5 text-sm font-normal tracking-wide text-primary transition-all ease-out hover:bg-white/80 active:scale-95 dark:border-[#27272A] dark:bg-background dark:hover:bg-background/80"
          >
            {hero.cta.secondary.text}
          </Link>
        </div>
      </div>

      <DashboardDemoSection />
    </section>
  );
}
