import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type {
  HubCta,
  HubCtaSection,
  HubHeroSection,
  HubLinkGroupSection,
  HubPublishedAssets,
  HubPublishedChartsSection,
  HubQuerySection,
  HubSection,
  HubStatsSection,
  HubTextBlockSection,
} from "@/types/hub";

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
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {section.stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-card/50 px-6 py-8 text-center transition-colors hover:bg-accent/30"
            >
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </dt>
              <dd className="mt-3 text-lg font-semibold tracking-tight text-foreground md:text-xl">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function HubQuery({ section }: { section: HubQuerySection }) {
  return (
    <section className="w-full px-6 py-20 md:py-28">
      <div className="mx-auto w-full max-w-3xl space-y-10">
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {section.title}
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg text-pretty">
            {section.description}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-8 md:p-10">
          <p className="mb-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Example queries
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {section.examples.map((example) => (
              <li
                key={example}
                className="rounded-lg border border-border/60 bg-background px-4 py-3 text-sm text-foreground/90"
              >
                {example}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex justify-center">
            <HubCtaButton cta={section.cta} variant="primary" />
          </div>
        </div>
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
    <section className="w-full px-6 py-16 md:py-24">
      <div className="mx-auto w-full max-w-4xl space-y-12">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {section.title}
        </h2>
        <div className="space-y-14">
          {section.groups.map((group) => (
            <div key={group.label} className="space-y-6">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h3>
              <ul className="grid gap-4 sm:grid-cols-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group block h-full rounded-xl border border-border bg-card/40 p-6 transition-all hover:border-primary/30 hover:bg-accent/30 hover:shadow-sm"
                      prefetch={false}
                    >
                      <span className="text-base font-medium text-foreground group-hover:text-primary">
                        {link.title}
                      </span>
                      {link.description ? (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                          {link.description}
                        </p>
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
    <section className="w-full px-6 py-16 md:py-24">
      <div className="mx-auto w-full max-w-6xl space-y-12">
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {section.title}
          </h2>
          {section.description ? (
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg text-pretty">
              {section.description}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {charts.map((chart, idx) => {
            const href = `/${encodeURIComponent(chart.username)}/charts/${encodeURIComponent(chart.slug)}`;
            const ogImage = chart.hasOgImage
              ? `/api/public/charts/${encodeURIComponent(chart.username)}/${encodeURIComponent(chart.slug)}/og-image`
              : null;
            return (
              <Link
                key={`${chart.username}-${chart.slug}`}
                href={href}
                className="group block min-w-0"
                prefetch={false}
              >
                <div className="h-full overflow-hidden rounded-xl border border-border bg-card/40 transition-all hover:border-primary/30 hover:shadow-md">
                  {ogImage ? (
                    <div className="relative aspect-[40/21] w-full overflow-hidden border-b border-border/60">
                      <Image
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        src={ogImage}
                        alt={chart.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority={idx <= 2}
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[40/21] items-center justify-center border-b border-border/60 bg-muted text-sm text-muted-foreground">
                      Chart
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-base font-medium text-foreground group-hover:text-primary line-clamp-2">
                      {chart.title}
                    </h3>
                    <p className="mt-2 text-xs text-muted-foreground">@{chart.username}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
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
          <div className="mt-8 flex justify-center">
            <HubCtaButton cta={section.cta} variant="primary" />
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
    <div className={cn(isAlternate && "bg-muted/20")}>{children}</div>
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
      return wrapper(<HubPublishedCharts section={section} assets={assets} />);
    case "cta":
      return wrapper(<HubCta section={section} />);
    default:
      return null;
  }
}
