"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JARVIS_PROMO } from "@/lib/jarvisPromo";
import { SEE_BLACK_FRIDAY_EVENT } from "@/components/promo/useBlackFriday";
import { blackFridayActive } from "@/lib/promo/blackFriday";

const PRIMARY_CTA =
  "flex h-12 items-center justify-center rounded-full border border-white/[0.12] bg-secondary px-6 text-base font-normal text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] transition-all ease-out hover:bg-secondary/80 active:scale-95 dark:text-secondary-foreground";
const SECONDARY_CTA =
  "flex h-12 items-center justify-center gap-1.5 rounded-full border border-border bg-muted px-6 text-base font-normal text-primary transition-all ease-out hover:bg-muted/70 active:scale-95";

const CAPABILITIES = [
  {
    title: "Keeps watch for you.",
    description: "Every chat opens with a pulse on what's moving across Polymarket and Kalshi.",
  },
  {
    title: "Runs whole projects.",
    description: "One ask chains Lychee tools, lands charts in the chat, and writes up what it found.",
  },
  {
    title: "Reads any trader.",
    description: "News timing, style, where they win, what they're buying, and who follows them in.",
  },
  {
    title: "Answers on X.",
    description: "Tag @lychee_data under any post and Jarvis replies with real Lychee numbers.",
  },
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
      <aside aria-label={JARVIS_PROMO.title} className="relative z-40 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[min(100%,84rem)] flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 sm:px-6">
          <p className="text-center text-[13px] leading-snug text-muted-foreground">
            <span className="text-primary">{JARVIS_PROMO.title}.</span> {JARVIS_PROMO.tokensLine}
          </p>
          <Link href={JARVIS_PROMO.href} className="text-[13px] text-secondary transition-colors hover:text-primary">
            {JARVIS_PROMO.meetCta} →
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <section aria-label={JARVIS_PROMO.title} className="relative w-full scroll-mt-28 border-t border-border">
      <div className="mx-auto w-full max-w-[min(100%,84rem)] px-6 py-12 sm:px-8 md:py-16 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-2xl font-normal tracking-tight text-primary sm:text-3xl">{JARVIS_PROMO.title}.</h2>
          <p className="mt-2 text-balance text-muted-foreground">{JARVIS_PROMO.subtitle}</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-10 lg:grid-cols-4">
          {CAPABILITIES.map((item) => (
            <article key={item.title} className="rounded-xl bg-muted p-5 text-[1.0625rem] leading-snug tracking-tight sm:p-6">
              <h3 className="font-normal text-primary">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-5 text-center md:mt-10">
          <p className="max-w-2xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
            {JARVIS_PROMO.body} {JARVIS_PROMO.tokensLine}
            {bf ? <span className="block">{JARVIS_PROMO.blackFridayLine}</span> : null}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href={JARVIS_PROMO.href} className={PRIMARY_CTA}>
              {JARVIS_PROMO.meetCta}
            </Link>
            <a
              href="/#pricing"
              onClick={bf ? () => window.dispatchEvent(new Event(SEE_BLACK_FRIDAY_EVENT)) : undefined}
              className={SECONDARY_CTA}
            >
              {JARVIS_PROMO.plansCta}
              <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
