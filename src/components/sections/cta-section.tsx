import Link from "next/link";

import { CtaLycheeAsciiArt } from "@/components/cta-lychee-ascii-art";
import { siteConfig } from "@/lib/config";

export function CTASection() {
  const { ctaSection } = siteConfig;

  return (
    <section
      id="cta"
      className="flex w-full flex-col items-center justify-center px-5 md:px-10"
    >
      <div className="w-full max-w-7xl">
        <div className="relative z-20 w-full overflow-hidden rounded-xl border border-border bg-gradient-to-br from-secondary/35 via-background to-muted shadow-xl">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-t from-transparent via-transparent to-transparent dark:from-black/55 dark:via-black/20"
          />

          <div className="relative z-10 flex min-h-[520px] flex-col items-center px-4 pb-10 pt-10 md:min-h-[560px] md:pb-12 md:pt-14">
            <h2 className="max-w-xs shrink-0 text-center text-4xl font-medium tracking-tighter text-foreground md:max-w-3xl md:text-7xl dark:text-white dark:drop-shadow-[0_2px_24px_rgba(0,0,0,0.85)]">
              {ctaSection.title}
            </h2>

            <div className="flex w-full max-w-lg flex-1 flex-col items-center justify-center py-8 md:py-10">
              <CtaLycheeAsciiArt className="w-full" />
            </div>

            <div className="flex shrink-0 flex-col items-center gap-2">
              <Link
                href={ctaSection.button.href}
                className="flex h-10 w-fit items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md transition-opacity hover:opacity-95"
              >
                {ctaSection.button.text}
              </Link>
              <span className="max-w-md text-center text-sm text-muted-foreground dark:text-white/90">
                {ctaSection.subtext}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
