import type { Metadata } from "next";
import Link from "next/link";

import { FooterSection } from "@/components/sections/footer-section";
import { JarvisComingPromo } from "@/components/marketing/jarvis-coming-promo";
import { getNewsPulseFeed } from "@/lib/newsPulse";
import { getSiteUrl } from "@/lib/site";

export const revalidate = 600;

const SITE = getSiteUrl();
const PATH = "/news";
const TITLE = "lychee_news: Prediction Market News Pulse | Lychee";
const DESCRIPTION =
  "A reverse-chronological preview of what Lychee would post as @lychee_news — headlines with the Polymarket and Kalshi markets they can move.";
const OG_IMAGE = "/og/lychee-research-terminal.png";
const LOAD_TIMEOUT_MS = 12_000;

const TIME = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

type PulseMarket = {
  venue: string;
  title: string;
  url?: string | null;
  lychee_href?: string | null;
};

type PulseItem = {
  id: string;
  headline: string;
  url?: string | null;
  source?: string | null;
  t: number;
  markets: PulseMarket[];
};

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

function venueLabel(venue: string) {
  if (venue === "kalshi") return "Kalshi";
  if (venue === "polymarket") return "Polymarket";
  return venue;
}

function MarketLinks({ markets }: { markets: PulseMarket[] }) {
  if (!markets?.length) return null;
  return (
    <ul className="mt-3 flex flex-col gap-1.5">
      {markets.map((market) => {
        const href = market.url || market.lychee_href;
        if (!href) return null;
        const external = /^https?:\/\//i.test(href);
        return (
          <li key={`${market.venue}:${market.title}`}>
            <Link
              href={href}
              className="group inline-flex max-w-full items-baseline gap-2 text-sm leading-snug text-muted-foreground transition-colors hover:text-foreground"
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              prefetch={false}
            >
              <span className="shrink-0 font-medium text-amber-700 dark:text-amber-300">{venueLabel(market.venue)}</span>
              <span className="min-w-0 underline-offset-4 group-hover:underline">{market.title}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default async function NewsPulsePage() {
  const feed = await withTimeout(getNewsPulseFeed() as Promise<{ items: PulseItem[]; demo?: boolean; as_of?: string }>, {
    items: [],
    demo: false,
  });
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
            lychee_news
          </p>
          <h1 className="text-balance text-[2.5rem] font-normal leading-[1.02] tracking-[-0.03em] text-primary sm:text-[3.25rem]">
            News that can move the books
          </h1>
          <p className="max-w-[38rem] text-balance text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
            A live preview of the @lychee_news pulse — headlines from real publishers, newest first, with the
            Polymarket and Kalshi markets they can hit. Posting to X comes later; this page is how we iterate.
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
          {items.length ? (
            <ol className="divide-y divide-border border-y border-border">
              {items.map((item) => (
                <li key={item.id}>
                  <article className="flex flex-col gap-1 px-1 py-6 sm:flex-row sm:items-start sm:gap-6 sm:px-2">
                    <time
                      dateTime={new Date(item.t).toISOString()}
                      className="shrink-0 pt-0.5 text-sm tabular-nums text-muted-foreground sm:w-40"
                    >
                      {TIME.format(item.t)}
                    </time>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-balance text-base font-medium leading-snug text-foreground sm:text-[1.05rem]">
                        {item.url ? (
                          <Link
                            href={item.url}
                            className="underline-offset-4 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                            prefetch={false}
                          >
                            {item.headline}
                          </Link>
                        ) : (
                          item.headline
                        )}
                      </h2>
                      {item.source ? (
                        <p className="mt-1.5 text-[13px] text-muted-foreground">{item.source}</p>
                      ) : null}
                      <MarketLinks markets={item.markets} />
                    </div>
                  </article>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-xl bg-muted px-6 py-14 text-center">
              <p className="text-base font-medium text-foreground">No matched headlines right now</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                The pulse needs a live Polymarket list plus recent Google News (or the Lychee archive). Try again
                shortly, or search the{" "}
                <Link href="/news-archive" className="font-medium text-foreground underline-offset-4 hover:underline">
                  news archive
                </Link>
                .
              </p>
              <p className="mt-4 text-[13px] text-muted-foreground">
                Local demo: set <code className="rounded bg-background px-1.5 py-0.5 text-[12px]">NEWS_PULSE_DEMO=1</code>{" "}
                and open <code className="rounded bg-background px-1.5 py-0.5 text-[12px]">/news</code> or{" "}
                <code className="rounded bg-background px-1.5 py-0.5 text-[12px]">/api/news/pulse</code>.
              </p>
            </div>
          )}
          {feed.demo ? (
            <p className="mt-4 text-center text-[13px] text-amber-700 dark:text-amber-300">Showing demo sample data (NEWS_PULSE_DEMO=1).</p>
          ) : null}
        </div>
      </section>

      <JarvisComingPromo />
      <FooterSection />
    </main>
  );
}
