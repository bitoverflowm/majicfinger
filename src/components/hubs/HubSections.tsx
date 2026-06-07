import Link from "next/link";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type {
  HubCta,
  HubCtaSection,
  HubHeroSection,
  HubLinkGroupSection,
  HubPublishedAssets,
  HubPublishedChartsSection,
  HubPublishedDashboardsSection,
  HubQuerySection,
  HubSection,
  HubStatsSection,
  HubTextBlockSection,
  HubVideoCarouselSection,
} from "@/types/hub";
import { HubVideoInstructionsCarousel } from "@/components/hubs/HubVideoInstructionsCarousel";
import { HubChartEmbedSkeleton } from "@/components/publicEmbed/ChartEmbedSkeleton";

const HubKalshiQueryBuilder = dynamic(
  () =>
    import("@/components/hubs/kalshiQuery/HubKalshiQueryBuilder").then(
      (m) => m.HubKalshiQueryBuilder,
    ),
  { ssr: false, loading: () => <div className="h-48 w-full animate-pulse bg-muted/40" /> },
);

const HubPublishedChartEmbed = dynamic(
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

function HubCtaButton({ cta, variant = "primary" }: { cta: HubCta; variant?: "primary" | "secondary" }) {
  const className =
    variant === "primary"
      ? "inline-flex h-10 items-center justify-center rounded-full border border-white/[0.12] bg-secondary px-6 text-sm font-medium tracking-wide text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] transition-all ease-out hover:bg-secondary/80 active:scale-[0.98] dark:text-secondary-foreground"
      : "inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-6 text-sm font-medium tracking-wide text-foreground transition-all ease-out hover:bg-muted active:scale-[0.98]";

  return (
    <Link href={cta.href} className={className} prefetch={false}>
      {cta.label}
    </Link>
  );
}

function HubHero({ section }: { section: HubHeroSection }) {
  return (
    <section className="relative w-full">
      <div className="flex w-full flex-col items-center px-6 pb-20 pt-36 md:pb-28 md:pt-44">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center">
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
  return (
    <section className="w-full px-6 py-20 md:py-28">
      <div className="mx-auto w-full max-w-4xl space-y-12">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {section.title}
        </h2>
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

        <div className="relative z-20 -mx-6 mt-12 w-[calc(100%+3rem)]">
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
        {charts.map((chart) => (
          <HubPublishedChartEmbed
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
}: {
  section: HubSection;
  assets: HubPublishedAssets;
  index: number;
}) {
  const isAlternate = index % 2 === 1;

  const wrapper = (children: React.ReactNode) => (
    <div className={cn("w-full", isAlternate && "bg-muted/20")}>{children}</div>
  );

  switch (section.type) {
    case "hero":
      return wrapper(<HubHero section={section} />);
    case "stats":
      return wrapper(<HubStats section={section} />);
    case "query":
      return wrapper(<HubQuery section={section} />);
    case "text_block":
      return wrapper(<HubTextBlock section={section} />);
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
