import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, LineChart, Search } from "lucide-react";

import { NewsArchiveHeroActions, NewsArchiveSearch } from "@/components/newsArchive/NewsArchiveSearch";
import { JarvisComingPromo } from "@/components/marketing/jarvis-coming-promo";
import { FAQSection } from "@/components/sections/faq-section";
import { FooterSection } from "@/components/sections/footer-section";
import { pickMarkets } from "@/lib/holderLanding/featuredSubjects";
import { archiveConfigured, archiveStart } from "@/lib/newsArchive";
import { marketNewsTerms } from "@/lib/newsQuery";
import { getSiteUrl } from "@/lib/site";

export const revalidate = 3600;

const SITE = getSiteUrl();
const PATH = "/news-archive";
const TITLE = "Prediction Market News Archive: Search Headlines by Keyword | Lychee";
const DESCRIPTION =
  "Search news headlines by the words they mention, see when coverage spiked, and line the stories up with Polymarket prices. Google News plus Lychee's GDELT archive, refreshed every 15 minutes.";
const OG_IMAGE = "/og/lychee-research-terminal.png";
const LOAD_TIMEOUT_MS = 4_000;
const TOPIC_COUNT = 6;

type Topic = { terms: string[]; title: string };

const FALLBACK_TOPICS: Topic[] = [
  { terms: ["Federal Reserve"], title: "Federal Reserve" },
  { terms: ["tariffs"], title: "Tariffs" },
  { terms: ["Bitcoin"], title: "Bitcoin" },
  { terms: ["ceasefire"], title: "Ceasefire talks" },
  { terms: ["Supreme Court"], title: "Supreme Court" },
];

const MONTH_YEAR = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const FULL_DATE = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), LOAD_TIMEOUT_MS)),
  ]);
}

/** Search words for Polymarket's trending markets, one topic per distinct set. */
async function loadTopics(): Promise<Topic[]> {
  const markets = (await withTimeout(pickMarkets(), [])) as { title: string }[];
  const seen = new Set<string>();
  const topics: Topic[] = [];
  for (const market of markets) {
    const { terms } = marketNewsTerms(market.title);
    const key = terms.join("|").toLowerCase();
    if (!terms.length || seen.has(key)) continue;
    seen.add(key);
    topics.push({ terms, title: market.title });
    if (topics.length === TOPIC_COUNT) break;
  }
  return topics.length >= 3 ? topics : FALLBACK_TOPICS;
}

async function loadArchiveStart(): Promise<number | null> {
  if (!archiveConfigured()) return null;
  return withTimeout(archiveStart() as Promise<number | null>, null);
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${SITE}${PATH}` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "The news behind every prediction market move",
    description: DESCRIPTION,
    type: "website",
    url: `${SITE}${PATH}`,
    siteName: "Lychee",
    locale: "en_US",
    images: [{ url: `${SITE}${OG_IMAGE}`, width: 1200, height: 630, alt: "Lychee news archive" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@misterrpink1",
    title: "The news behind every prediction market move",
    description: DESCRIPTION,
    images: [`${SITE}${OG_IMAGE}`],
  },
};

const STEPS = [
  {
    icon: Search,
    title: "Search by the words a story mentions",
    body: "Every result mentions all of your words. Start from a trending market or add a name, a place, or a company, up to five words.",
  },
  {
    icon: BarChart3,
    title: "See when coverage spiked",
    body: "Bars count the matching articles over time, from the last day to the whole archive. Click a bar to read the stories from that stretch.",
  },
  {
    icon: LineChart,
    title: "Put the news next to the price",
    body: "In the Holder Terminal the same headlines sit on a market's price chart and beside a trader's buys and sells.",
  },
];

const RELATED = [
  {
    href: "/polymarket-holder-terminal",
    title: "Lychee Holder Terminal",
    description: "Markets and traders together, from price and news to the wallets behind them.",
  },
  {
    href: "/polymarket-market-holders",
    title: "Polymarket top holders by market",
    description: "Who holds YES and NO in any market, and what they paid.",
  },
  {
    href: "/polymarket-wallet-tracker",
    title: "Polymarket wallet tracker",
    description: "Any trader's positions, P&L, and new trades as they happen.",
  },
];

function faqItems(start: number | null) {
  return [
    {
      question: "Where do the headlines come from?",
      answer:
        "Two places. Google News covers recent articles. The GDELT Project monitors news sites around the world, and Lychee keeps its English-language articles in its own archive, adding a new batch every 15 minutes.",
    },
    {
      question: "How far back can I search?",
      answer: start
        ? `Lychee's GDELT archive starts on ${FULL_DATE.format(start)}. Google News adds recent coverage on top.`
        : "As far back as Lychee's GDELT archive goes; pick a longer range above to search further back. Google News adds recent coverage on top.",
    },
    {
      question: "How are article times worked out?",
      answer:
        "Google News articles use their publication time. GDELT records when it first saw an article, usually within 15 minutes of publishing. Articles known only by date are marked “date only”.",
    },
    {
      question: "Why doesn't every headline name my words?",
      answer:
        "A match can come from the article, not just its headline. Turn on “Only when the headline names it” above the list to keep the closest matches.",
    },
    {
      question: "Can I see the news on a market's price chart?",
      answer:
        "Yes. Open any Polymarket market in the Holder Terminal and its price chart shows matching headlines, with news bars underneath. A trader's buys and sells line up with the news the same way.",
    },
  ];
}

function structuredData(faq: { question: string; answer: string }[]) {
  const url = `${SITE}${PATH}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: TITLE,
      description: DESCRIPTION,
      url,
      inLanguage: "en",
      isPartOf: { "@type": "WebSite", name: "Lychee", url: SITE },
      publisher: { "@type": "Organization", name: "LycheeData", url: SITE },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "News archive", item: url },
      ],
    },
  ];
}

export default async function NewsArchivePage() {
  const [topics, start] = await Promise.all([loadTopics(), loadArchiveStart()]);
  const faq = faqItems(start);
  const facts = [start ? `Archive since ${MONTH_YEAR.format(start)}` : "Searchable news archive", "Refreshed every 15 minutes", "Google News + GDELT"];

  return (
    <main className="flex min-h-screen w-full flex-col items-stretch divide-y divide-border bg-background font-sans antialiased theme-landing">
      {structuredData(faq).map((data) => (
        <script key={data["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
      ))}

      <section id="hero" className="w-full px-4 pb-14 pt-24 sm:px-8 md:pt-32">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          <p className="inline-flex h-7 w-fit items-center gap-2 rounded-full border border-border bg-accent px-3 text-[13px] text-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500/60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
            </span>
            News archive
          </p>
          <h1 className="text-balance text-[2.5rem] font-normal leading-[1.02] tracking-[-0.03em] text-primary sm:text-[3.25rem] xl:text-[4rem]">
            The news behind every prediction market move
          </h1>
          <p className="max-w-[38rem] text-balance text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
            Search headlines by the words they mention, see when coverage spiked, and read the stories. Then line them up with a market&apos;s price in the Holder Terminal.
          </p>
          <NewsArchiveHeroActions />
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-[13px] text-muted-foreground">
            {facts.map((fact) => (
              <li key={fact} className="flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-amber-500" aria-hidden />
                {fact}
              </li>
            ))}
          </ul>
        </div>

        <div id="search" className="mx-auto mt-12 w-full max-w-5xl scroll-mt-24">
          <NewsArchiveSearch topics={topics} archiveStart={start} />
        </div>
      </section>

      <section className="w-full px-6 py-16 md:py-24">
        <div className="mx-auto w-full max-w-5xl space-y-10">
          <div className="space-y-3 text-center">
            <h2 className="text-balance text-[1.75rem] font-normal leading-tight tracking-[-0.02em] text-primary sm:text-[2rem]">
              From a headline to the trade it moved
            </h2>
            <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              Prices on Polymarket react to the news. The archive shows what was written and when, so you can tell which stories came before a move and which came after.
            </p>
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex flex-col gap-3 rounded-xl bg-muted p-5">
                <span className="flex size-9 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  <Icon className="size-4" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="font-medium text-primary">{title}</span>
                <span className="text-sm leading-relaxed text-muted-foreground">{body}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <JarvisComingPromo />

      <FAQSection
        title="Frequently asked questions"
        description=""
        items={faq.map((item, index) => ({ id: index + 1, question: item.question, answer: item.answer }))}
      />

      <section className="w-full px-6 py-16 md:py-24">
        <div className="mx-auto w-full max-w-4xl space-y-8">
          <h2 className="text-center text-2xl font-medium tracking-tighter text-foreground md:text-3xl">Keep exploring</h2>
          <ul className="mx-auto grid w-full max-w-4xl gap-3 sm:grid-cols-3">
            {RELATED.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="flex h-full flex-col gap-1 rounded-xl bg-muted p-5 transition-colors hover:bg-muted/70">
                  <span className="font-medium text-primary">{link.title} →</span>
                  <span className="text-sm leading-relaxed text-muted-foreground">{link.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <FooterSection />
    </main>
  );
}
