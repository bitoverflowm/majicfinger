import Link from "next/link";
import dynamic from "next/dynamic";
import { HubCtaButton } from "@/components/hubs/HubCtaButton";
import { cn } from "@/lib/utils";
import type {
  HubBulletsSection,
  HubCardsSection,
  HubCtaSection,
  HubFaqSection,
  HubHeroSection,
  HubLinkGroupSection,
  HubPublishedAssets,
  HubPublishedChartsSection,
  HubPublishedDashboardsSection,
  HubQuerySection,
  HubSection,
  HubStatsSection,
  HubTextBlockSection,
  HubPublicChartPayload,
  HubVideoCarouselSection,
} from "@/types/hub";
import { HubHeroBody } from "@/components/hubs/HubHeroBody";
import { HubProofMetrics } from "@/components/hubs/HubProofMetrics";
import { HubPublishedChartEmbed } from "@/components/hubs/HubPublishedChartEmbed";
import { HubVideoInstructionsCarousel } from "@/components/hubs/HubVideoInstructionsCarousel";
import { HubChartEmbedSkeleton } from "@/components/publicEmbed/ChartEmbedSkeleton";

const HubKalshiQueryBuilder = dynamic(
  () =>
    import("@/components/hubs/kalshiQuery/HubKalshiQueryBuilder").then(
      (m) => m.HubKalshiQueryBuilder,
    ),
  { ssr: false, loading: () => <div className="h-48 w-full animate-pulse bg-muted/40" /> },
);

const HubPublishedChartEmbedLazy = dynamic(
  () =>
    import("@/components/hubs/HubPublishedChartEmbed").then((m) => m.HubPublishedChartEmbed),
  {
    ssr: false,
    loading: () => (
      <article className="overflow-hidden rounded-xl border border-border bg-card/40">
        <HubChartEmbedSkeleton />
      </article>
    ),
  },
);

function HubHero({
  section,
  heroChartPayload,
}: {
  section: HubHeroSection;
  heroChartPayload?: HubPublicChartPayload | null;
}) {
  const isPremium = section.variant === "premium";

  if (isPremium) {
    return (
      <section className="relative w-full overflow-hidden">
        <div
          aria-hidden
          className="hero-aura-gradient pointer-events-none absolute inset-0 z-0 w-full"
        />
        <div className="relative z-10 w-full px-6 pb-12 pt-[6.8rem] md:pb-16 md:pt-[8.5rem]">
          <div className="mx-auto grid w-full max-w-6xl items-start gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="flex flex-col items-start gap-5 px-4 text-left sm:px-6 md:gap-6 lg:px-0 lg:pt-2">
              {section.eyebrow ? (
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-secondary">
                  {section.eyebrow}
                </p>
              ) : null}
              <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-primary md:text-5xl lg:text-[3.25rem]">
                {section.title}
              </h1>
              <p className="max-w-xl text-balance text-2xl font-semibold leading-snug tracking-tight text-foreground md:text-[1.65rem]">
                {section.subtitle}
              </p>
              {section.heroBody ? (
                <HubHeroBody parts={section.heroBody.parts} />
              ) : (
                <>
                  {section.microtext ? (
                    <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
                      {section.microtext}
                    </p>
                  ) : null}
                  {section.supportingText ? (
                    <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
                      {section.supportingText}
                    </p>
                  ) : null}
                </>
              )}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {section.primaryCTAs.map((cta) => (
                  <HubCtaButton key={cta.href} cta={cta} variant="primary" />
                ))}
                {section.secondaryCTAs?.map((cta) => (
                  <HubCtaButton key={cta.href} cta={cta} variant="secondary" />
                ))}
              </div>
            </div>

            {section.heroChart ? (
              <div className="w-full lg:-mr-2 lg:-mt-12 lg:self-start">
                <HubPublishedChartEmbed
                  username={section.heroChart.username}
                  slug={section.heroChart.slug}
                  initialPayload={heroChartPayload ?? null}
                  variant="hero"
                />
              </div>
            ) : (
              <div
                aria-hidden
                className="min-h-[280px] w-full rounded-2xl border border-border/60 bg-background shadow-sm sm:min-h-[320px] lg:min-h-[380px]"
              />
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden">
      <div className="flex w-full flex-col items-center px-6 pb-20 pt-[7.65rem] md:pb-28 md:pt-[9.35rem]">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center">
          {section.eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {section.eyebrow}
            </p>
          ) : null}
          <h1 className="text-3xl font-medium tracking-tighter text-primary md:text-4xl lg:text-5xl text-balance">
            {section.title}
          </h1>
          <p className="max-w-2xl text-base font-medium leading-relaxed tracking-tight text-muted-foreground md:text-lg text-balance">
            {section.subtitle}
          </p>
          {section.microtext ? (
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground/80 md:text-base text-pretty">
              {section.microtext}
            </p>
          ) : null}
          {section.supportingText ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base text-pretty">
              {section.supportingText}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {section.primaryCTAs.map((cta) => (
              <HubCtaButton key={cta.href} cta={cta} variant="primary" />
            ))}
            {section.secondaryCTAs?.map((cta) => (
              <HubCtaButton key={cta.href} cta={cta} variant="secondary" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HubStats({ section }: { section: HubStatsSection }) {
  if (section.variant === "proof_strip") {
    return (
      <section className="w-full border-y border-border/60 bg-muted/20 px-6 py-10 md:py-12">
        <ul className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-center gap-3">
          {section.stats.map((stat) => (
            <li
              key={stat.label}
              className="rounded-full border border-border/60 bg-background px-4 py-2 text-sm text-foreground"
            >
              {stat.value ? (
                <>
                  <span className="font-medium">{stat.label}</span>
                  <span className="text-muted-foreground"> · {stat.value}</span>
                </>
              ) : (
                stat.label
              )}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className="w-full px-6 py-20 md:py-28">
      <div className="mx-auto w-full max-w-4xl space-y-12">
        {section.title ? (
          <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {section.title}
          </h2>
        ) : null}
        <dl className="mx-auto w-full max-w-xl space-y-2 text-left">
          {section.stats.map((stat) => (
            <div key={stat.label} className="flex flex-wrap gap-x-2 text-base leading-relaxed">
              <dt className="font-medium text-foreground">{stat.label}:</dt>
              <dd className="text-muted-foreground">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function HubQuery({ section }: { section: HubQuerySection }) {
  return (
    <section
      id={section.anchorId}
      className={cn("w-full px-6 py-20 md:py-28", section.anchorId && "scroll-mt-28")}
    >
      <div className="mx-auto w-full max-w-3xl space-y-4 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {section.title}
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg text-pretty">
            {section.description}
          </p>
        </div>

        <div className="relative z-20 mx-auto mt-12 w-full max-w-4xl px-2 sm:px-4">
          <HubKalshiQueryBuilder />
        </div>

        <div className="mx-auto w-full max-w-3xl space-y-4 pt-12">
          <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {section.examplesTitle || "Example queries you can build"}
          </p>
          <ul className="mx-auto grid max-w-2xl gap-2 sm:grid-cols-2">
            {section.examples.map((example) => (
              <li
                key={example}
                className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-sm text-muted-foreground"
              >
                {example}
              </li>
            ))}
          </ul>
        </div>
    </section>
  );
}

function HubTextBlock({ section }: { section: HubTextBlockSection }) {
  return (
    <section className="w-full px-6 py-16 md:py-24">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          {section.title}
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground md:text-lg text-pretty">
          {section.content}
        </p>
      </div>
    </section>
  );
}

function HubCards({ section }: { section: HubCardsSection }) {
  return (
    <section
      id={section.anchorId}
      className={cn("w-full px-6 py-16 md:py-24", section.anchorId && "scroll-mt-28")}
    >
      <div className="mx-auto w-full max-w-4xl space-y-10">
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {section.title}
          </h2>
          {section.intro ? (
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg text-pretty">
              {section.intro}
            </p>
          ) : null}
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {section.cards.map((card) => (
            <li
              key={card.title}
              className="rounded-xl border border-border bg-background p-5 shadow-sm"
            >
              <h3 className="font-semibold text-foreground">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                {card.description}
              </p>
            </li>
          ))}
        </ul>
        {section.note ? (
          <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-muted-foreground text-pretty">
            {section.note}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function HubBullets({ section }: { section: HubBulletsSection }) {
  return (
    <section className="w-full px-6 py-16 md:py-24">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {section.title}
          </h2>
          {section.intro ? (
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg text-pretty">
              {section.intro}
            </p>
          ) : null}
        </div>
        <ul className="space-y-3">
          {section.bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-base leading-relaxed text-foreground"
            >
              <span className="text-muted-foreground" aria-hidden>
                •
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HubFaq({ section }: { section: HubFaqSection }) {
  return (
    <section className="w-full px-6 py-16 md:py-24">
      <div className="mx-auto w-full max-w-2xl space-y-10">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {section.title}
        </h2>
        <dl className="space-y-6">
          {section.items.map((item) => (
            <div key={item.question} className="space-y-2 border-b border-border/60 pb-6 last:border-0">
              <dt className="text-base font-semibold text-foreground md:text-lg">{item.question}</dt>
              <dd className="text-base leading-relaxed text-muted-foreground text-pretty">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function HubLinkGroup({ section }: { section: HubLinkGroupSection }) {
  return (
    <section
      id={section.anchorId}
      className={cn("w-full px-6 py-20 md:py-28", section.anchorId && "scroll-mt-28")}
    >
      <div className="mx-auto w-full max-w-4xl space-y-12">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {section.title}
        </h2>
        <div className="mx-auto w-full max-w-xl space-y-10">
          {section.groups.map((group) => (
            <div key={group.label} className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h3>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex flex-wrap gap-x-2 text-base leading-relaxed hover:underline underline-offset-2"
                      prefetch={false}
                    >
                      <span className="font-medium text-foreground group-hover:text-primary">
                        {link.title}
                        {link.description ? ":" : ""}
                      </span>
                      {link.description ? (
                        <span className="text-muted-foreground">{link.description}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HubPublishedDashboards({
  section,
  assets,
}: {
  section: HubPublishedDashboardsSection;
  assets: HubPublishedAssets;
}) {
  const { dashboards } = assets;
  if (!dashboards.length) return null;

  return (
    <section
      id={section.anchorId}
      className={cn("w-full py-16 md:py-24", section.anchorId && "scroll-mt-28")}
    >
      <div className="mx-auto max-w-2xl space-y-4 px-6 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {section.title}
        </h2>
        {section.description ? (
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg text-pretty">
            {section.description}
          </p>
        ) : null}
      </div>
      <ul className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 px-6 sm:grid-cols-2">
        {dashboards.map((dash) => (
          <li key={`${dash.username}-${dash.slug}`}>
            <Link
              href={`/${encodeURIComponent(dash.username)}/dashboards/${encodeURIComponent(dash.slug)}`}
              className="group block rounded-xl border border-border bg-background p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
              prefetch={false}
            >
              <h3 className="font-semibold text-foreground group-hover:text-primary">{dash.title}</h3>
              {dash.description ? (
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{dash.description}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">@{dash.username}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HubPublishedCharts({
  section,
  assets,
}: {
  section: HubPublishedChartsSection;
  assets: HubPublishedAssets;
}) {
  const { charts } = assets;
  if (!charts.length) return null;

  // Cap live chart embeds — each mounts a full ChartCanvas client-side.
  const visibleCharts = charts.slice(0, 8);

  return (
    <section
      id={section.anchorId}
      className={cn("w-full py-16 md:py-24", section.anchorId && "scroll-mt-28")}
    >
      <div className="mx-auto max-w-2xl space-y-4 px-6 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {section.title}
        </h2>
        {section.description ? (
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg text-pretty">
            {section.description}
          </p>
        ) : null}
      </div>
      <div className="mt-12 grid grid-cols-1 gap-6 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
        {visibleCharts.map((chart) => (
          <HubPublishedChartEmbedLazy
            key={`${chart.username}-${chart.slug}`}
            username={chart.username}
            slug={chart.slug}
          />
        ))}
      </div>
    </section>
  );
}

function HubVideoCarousel({ section }: { section: HubVideoCarouselSection }) {
  return (
    <section
      id={section.anchorId}
      className={cn("w-full px-6 py-20 md:py-28", section.anchorId && "scroll-mt-28")}
    >
      <div className="mx-auto w-full max-w-4xl space-y-4 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {section.title}
        </h2>
        {section.description ? (
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg text-pretty">
            {section.description}
          </p>
        ) : null}
      </div>
      <div className="mx-auto mt-12 w-full max-w-5xl">
        <HubVideoInstructionsCarousel videos={section.videos} />
      </div>
    </section>
  );
}

function HubCta({ section }: { section: HubCtaSection }) {
  return (
    <section className="w-full px-6 py-20 md:py-28">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl border border-border bg-muted/40 px-8 py-14 text-center md:px-12 md:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {section.title}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground text-pretty">
            {section.description}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <HubCtaButton cta={section.cta} variant="primary" />
            {section.secondaryCta ? (
              <HubCtaButton cta={section.secondaryCta} variant="secondary" />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HubSectionRenderer({
  section,
  assets,
  index,
  heroChartPayload = null,
}: {
  section: HubSection;
  assets: HubPublishedAssets;
  index: number;
  heroChartPayload?: HubPublicChartPayload | null;
}) {
  const isAlternate = index % 2 === 1;

  const wrapper = (children: React.ReactNode) => (
    <div className={cn("w-full", isAlternate && "bg-muted/20")}>{children}</div>
  );

  switch (section.type) {
    case "hero":
      return wrapper(<HubHero section={section} heroChartPayload={heroChartPayload} />);
    case "stats":
      return wrapper(<HubStats section={section} />);
    case "proof_metrics":
      return <HubProofMetrics section={section} />;
    case "query":
      return wrapper(<HubQuery section={section} />);
    case "text_block":
      return wrapper(<HubTextBlock section={section} />);
    case "cards":
      return wrapper(<HubCards section={section} />);
    case "bullets":
      return wrapper(<HubBullets section={section} />);
    case "faq":
      return wrapper(<HubFaq section={section} />);
    case "link_group":
      return wrapper(<HubLinkGroup section={section} />);
    case "published_charts":
      return (
        <div className="relative z-30 w-full bg-white [clip-path:inset(0_-100vmax)] shadow-[0_0_0_100vmax_#ffffff] dark:bg-background dark:shadow-[0_0_0_100vmax_var(--background)]">
          <HubPublishedCharts section={section} assets={assets} />
        </div>
      );
    case "published_dashboards":
      return wrapper(<HubPublishedDashboards section={section} assets={assets} />);
    case "video_carousel":
      return wrapper(<HubVideoCarousel section={section} />);
    case "cta":
      return wrapper(<HubCta section={section} />);
    default:
      return null;
  }
}
