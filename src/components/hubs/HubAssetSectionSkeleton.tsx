import { cn } from "@/lib/utils";
import { HubChartEmbedSkeleton } from "@/components/publicEmbed/ChartEmbedSkeleton";
import type { HubPublishedChartsSection, HubPublishedDashboardsSection } from "@/types/hub";

type HubAssetSectionSkeletonProps = {
  section: HubPublishedChartsSection | HubPublishedDashboardsSection;
};

export function HubAssetSectionSkeleton({ section }: HubAssetSectionSkeletonProps) {
  if (section.type === "published_charts") {
    return (
      <section
        id={section.anchorId}
        className={cn("w-full py-16 md:py-24", section.anchorId && "scroll-mt-28")}
        aria-busy="true"
        aria-label="Loading charts"
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
          {Array.from({ length: 4 }).map((_, i) => (
            <article
              key={`chart-skeleton-${i}`}
              className="overflow-hidden rounded-xl border border-border bg-card/40"
            >
              <HubChartEmbedSkeleton />
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      id={section.anchorId}
      className={cn("w-full py-16 md:py-24", section.anchorId && "scroll-mt-28")}
      aria-busy="true"
      aria-label="Loading dashboards"
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
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={`dash-skeleton-${i}`}
            className="h-28 animate-pulse rounded-xl border border-border bg-muted/30"
          />
        ))}
      </ul>
    </section>
  );
}
