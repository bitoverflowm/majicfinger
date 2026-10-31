import Link from "next/link";

import { DemoScrollLink } from "@/components/sections/demo-scroll-link";
import { siteConfig } from "@/lib/config";

/** End-of-article CTA; same wording and actions as the landing page's closing section. */
export function GuideTakeawayCta() {
  const { ctaSection, hero } = siteConfig;

  return (
    <section
      aria-labelledby="guide-takeaway-cta"
      className="rounded-xl border border-border bg-muted/40 px-5 py-6 text-center sm:px-6 sm:py-7"
    >
      <h2
        id="guide-takeaway-cta"
        className="text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg"
      >
        {ctaSection.title}
      </h2>
      <div className="mt-4 flex flex-col items-center gap-2.5">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <DemoScrollLink
            href={`/${hero.cta.primary.href}`}
            activateLandingDemo
            className="flex h-9 w-fit items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95"
          >
            {hero.cta.primary.text}
          </DemoScrollLink>
          <Link
            href={hero.cta.secondary.href}
            className="flex h-9 w-fit items-center justify-center gap-1.5 rounded-full border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {hero.cta.secondary.text}
            <span aria-hidden>→</span>
          </Link>
        </div>
        <p className="max-w-md text-xs text-muted-foreground sm:text-sm">
          {ctaSection.subtext}
        </p>
      </div>
    </section>
  );
}
