import type { Metadata } from "next";
import Link from "next/link";

import { NewsPulseLive, type PulseItem } from "@/components/marketing/news-pulse-live";
import { FooterSection } from "@/components/sections/footer-section";
import { JarvisComingPromo } from "@/components/marketing/jarvis-coming-promo";
import { getNewsPulseFeed } from "@/lib/newsPulse";
import { getSiteUrl } from "@/lib/site";

/** ISR aligned with soft memo (~90s); open tabs poll /api/news/pulse for fresher rows. */
export const revalidate = 90;

const SITE = getSiteUrl();
const PATH = "/news";
const TITLE = "lychee_news: Prediction Market News Pulse | Lychee";
const DESCRIPTION =
  "A reverse-chronological preview of what Lychee would post as @lychee_news — headlines with the Polymarket and Kalshi markets they can move.";
const OG_IMAGE = "/og/lychee-research-terminal.png";
const LOAD_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), LOAD_TIMEOUT_MS)),
  ]);
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${SITE}${PATH}` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "lychee_news pulse",
    description: DESCRIPTION,
    type: "website",
    url: `${SITE}${PATH}`,
    siteName: "Lychee",
    locale: "en_US",
    images: [{ url: `${SITE}${OG_IMAGE}`, width: 1200, height: 630, alt: "lychee_news pulse" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@misterrpink1",
    title: "lychee_news pulse",
    description: DESCRIPTION,
    images: [`${SITE}${OG_IMAGE}`],
  },
};

export default async function NewsPulsePage() {
  const feed = await withTimeout(
    getNewsPulseFeed() as Promise<{ items: PulseItem[]; demo?: boolean; as_of?: string }>,
    {
      items: [],
      demo: false,
    },
  );
  const items = Array.isArray(feed.items) ? feed.items : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: `${SITE}${PATH}`,
    isPartOf: { "@type": "WebSite", name: "Lychee", url: SITE },
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-stretch divide-y divide-border bg-background font-sans antialiased theme-landing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="w-full px-4 pb-10 pt-24 sm:px-8 md:pt-32">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 text-center sm:text-left">
          <p className="inline-flex h-7 w-fit items-center gap-2 self-center rounded-full border border-border bg-accent px-3 text-[13px] text-foreground sm:self-start">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500/60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
            </span>
            lychee_news · live
          </p>
          <h1 className="text-balance text-[2.5rem] font-normal leading-[1.02] tracking-[-0.03em] text-primary sm:text-[3.25rem]">
            News that can move the books
          </h1>
          <p className="max-w-[38rem] text-balance text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
            A live preview of the @lychee_news pulse — headlines from real publishers, newest first, with the
            Polymarket and Kalshi markets they can hit and where YES is trading. Posting to X comes later; this
            page is how we iterate.
          </p>
          <p className="text-[13px] text-muted-foreground">
            Prefer a keyword search?{" "}
            <Link href="/news-archive" className="font-medium text-foreground underline-offset-4 hover:underline" prefetch={false}>
              Open the news archive
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="w-full px-4 py-10 sm:px-8 md:py-14">
        <div className="mx-auto w-full max-w-3xl">
          <NewsPulseLive initialItems={items} initialAsOf={feed.as_of ?? null} demo={Boolean(feed.demo)} />
        </div>
      </section>

      <JarvisComingPromo />
      <FooterSection />
    </main>
  );
}
