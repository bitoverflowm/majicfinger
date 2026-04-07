import { siteConfig } from "@/lib/config";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DashboardDemoSection } from "./dashboard-demo-section";

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
    "border border-border bg-accent rounded-full text-sm h-8 px-3 inline-flex items-center gap-2 max-w-full text-center";

  return (
    <section id="hero" className="w-full relative">
      <div className="relative isolate flex flex-col items-center w-full px-6">
        <div className="absolute inset-0">
          <div className="hero-aura-gradient absolute inset-0 z-0 h-[600px] md:h-[800px] w-full rounded-b-xl" />
        </div>
        <div className="relative z-10 pt-32 max-w-3xl mx-auto h-full w-full flex flex-col gap-10 items-center justify-center">
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
          <div className="flex flex-col items-center justify-center gap-5">
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-medium tracking-tighter text-balance text-center text-primary">
              {hero.title}
            </h1>
            <p className="text-base md:text-lg text-center text-muted-foreground font-medium text-balance leading-relaxed tracking-tight">
              {hero.description}
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap justify-center">
            <Link
              href={hero.cta.primary.href}
              className="bg-secondary h-9 flex items-center justify-center text-sm font-normal tracking-wide rounded-full text-primary-foreground dark:text-secondary-foreground w-32 px-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12] hover:bg-secondary/80 transition-all ease-out active:scale-95"
            >
              {hero.cta.primary.text}
            </Link>
            <Link
              href={hero.cta.secondary.href}
              className="h-10 flex items-center justify-center w-32 px-5 text-sm font-normal tracking-wide text-primary rounded-full transition-all ease-out active:scale-95 bg-white dark:bg-background border border-[#E5E7EB] dark:border-[#27272A] hover:bg-white/80 dark:hover:bg-background/80"
            >
              {hero.cta.secondary.text}
            </Link>
          </div>
        </div>
      </div>
      <DashboardDemoSection />
    </section>
  );
}
