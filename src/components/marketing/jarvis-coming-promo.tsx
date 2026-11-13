"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JARVIS_KEYFRAMES } from "@/components/marketing/jarvis/jarvis-keyframes";
import { JarvisOrb } from "@/components/marketing/jarvis/jarvis-orb";
import { JARVIS_PROMO } from "@/lib/jarvisPromo";
import { BLACK_FRIDAY_ANCHOR, SEE_BLACK_FRIDAY_EVENT } from "@/components/promo/useBlackFriday";
import { blackFridayActive } from "@/lib/promo/blackFriday";

const PRIMARY_CTA =
  "inline-flex h-12 items-center justify-center rounded-full border border-white/[0.12] bg-secondary px-6 text-sm font-normal text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] transition-all ease-out hover:bg-secondary/80 active:scale-95 dark:text-secondary-foreground";
const SECONDARY_CTA =
  "inline-flex h-12 items-center justify-center rounded-full border border-border bg-muted px-6 text-sm font-normal text-primary transition-all ease-out hover:bg-muted/70 active:scale-95";

const CHIPS = [
  { label: "jarvis_pulse", className: "left-[2%] top-[14%]", delay: "0s" },
  { label: "analyze_holders", className: "right-[0%] top-[8%]", delay: "-1.2s" },
  { label: "compare_venues", className: "left-[-4%] bottom-[22%]", delay: "-2.1s" },
  { label: "@lychee_data", className: "right-[-2%] bottom-[16%]", delay: "-0.6s" },
] as const;

type Props = {
  /** Compact strip under the navbar. */
  variant?: "banner" | "section";
};

export function JarvisComingPromo({ variant = "section" }: Props) {
  const pathname = usePathname() || "";
  if (pathname === "/jarvis" || pathname.startsWith("/jarvis/")) return null;
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/checkout")) return null;

  const bf = blackFridayActive();

  if (variant === "banner") {
    return (
      <aside
        aria-label="Jarvis is coming"
        className="features-showcase relative z-40 border-b border-border bg-background/90 backdrop-blur-sm"
      >
        <style dangerouslySetInnerHTML={{ __html: JARVIS_KEYFRAMES }} />
        <div className="mx-auto flex max-w-[min(100%,84rem)] flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            <span className="relative flex size-1.5" aria-hidden>
              <span className="absolute inset-0 rounded-full bg-secondary/60 [animation:jx-ping_2.4s_ease-out_infinite]" />
              <span className="relative size-full rounded-full bg-gradient-to-br from-sky-300 via-secondary to-[#7c5cff]" />
            </span>
            {JARVIS_PROMO.badge}
          </span>
          <p className="text-center text-[13px] leading-snug text-muted-foreground">
            <span className="font-medium text-primary">{JARVIS_PROMO.title}.</span>{" "}
            {bf ? JARVIS_PROMO.blackFridayLine : JARVIS_PROMO.body}
          </p>
          <Link href={JARVIS_PROMO.href} className="text-[13px] font-medium text-secondary hover:text-primary">
            {JARVIS_PROMO.meetCta} →
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <section
      aria-label="Jarvis is coming"
      className="features-showcase flex w-full scroll-mt-28 flex-col items-center px-5 py-10 md:px-10 md:py-14"
    >
      <style dangerouslySetInnerHTML={{ __html: JARVIS_KEYFRAMES }} />
      <div className="relative w-full max-w-7xl overflow-hidden rounded-xl border border-border bg-gradient-to-br from-secondary/35 via-background to-muted shadow-xl">
        <div className="relative z-10 grid items-center gap-10 px-6 py-12 md:px-12 md:py-16 lg:grid-cols-2">
          <div className="relative mx-auto aspect-square w-full max-w-[18rem]">
            <JarvisOrb className="absolute inset-[6%]" />
            {CHIPS.map((chip) => (
              <span key={chip.label} className={`absolute ${chip.className}`}>
                <span
                  className="block rounded-full border border-border bg-background/90 px-2.5 py-1 font-mono text-[11px] text-primary shadow-sm backdrop-blur [animation:jx-float_4s_ease-in-out_infinite]"
                  style={{ animationDelay: chip.delay }}
                >
                  {chip.label}
                </span>
              </span>
            ))}
          </div>

          <div className="flex flex-col items-start gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <span className="rounded-full bg-gradient-to-r from-secondary to-[#7c5cff] px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-white">
                  {JARVIS_PROMO.badge}
                </span>
                Lychee MCP + Jarvis
              </span>
              {bf ? (
                <span className="inline-flex w-fit items-center rounded-full border border-secondary/25 bg-secondary/10 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-secondary">
                  {JARVIS_PROMO.blackFridayBadge}
                </span>
              ) : null}
            </div>
            <h2 className="text-4xl font-medium tracking-tighter text-foreground md:text-5xl">{JARVIS_PROMO.title}</h2>
            <p className="text-base text-muted-foreground">{JARVIS_PROMO.subtitle}</p>
            <p className="max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              {bf ? JARVIS_PROMO.blackFridayLine : JARVIS_PROMO.body}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link href={JARVIS_PROMO.href} className={PRIMARY_CTA}>
                {JARVIS_PROMO.meetCta}
              </Link>
              <Link href={JARVIS_PROMO.checkoutHref} className={SECONDARY_CTA}>
                {JARVIS_PROMO.preregCta}
              </Link>
              {bf ? (
                <a
                  href={`/#${BLACK_FRIDAY_ANCHOR}`}
                  onClick={() => window.dispatchEvent(new Event(SEE_BLACK_FRIDAY_EVENT))}
                  className="text-sm text-secondary transition-colors hover:text-primary"
                >
                  See Black Friday plans →
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
