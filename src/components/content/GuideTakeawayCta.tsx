import Link from "next/link";

import { siteConfig } from "@/lib/config";

export function GuideTakeawayCta() {
  const { ctaSection } = siteConfig;
  const title =
    ctaSection.guideTitle ??
    "Go from raw markets to charts and dashboards in seconds—no code, no CSVs.";

  return (
    <section
      aria-labelledby="guide-takeaway-cta"
      className="rounded-xl border border-border bg-muted/40 px-5 py-6 text-center sm:px-6 sm:py-7"
    >
      <h2
        id="guide-takeaway-cta"
        className="text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg"
      >
        {title}
      </h2>
      <div className="mt-4 flex flex-col items-center gap-2">
        <Link
          href={ctaSection.button.href}
          className="flex h-9 w-fit items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95"
        >
          {ctaSection.button.text}
        </Link>
        <p className="max-w-md text-xs text-muted-foreground sm:text-sm">
          {ctaSection.subtext}
        </p>
      </div>
    </section>
  );
}
