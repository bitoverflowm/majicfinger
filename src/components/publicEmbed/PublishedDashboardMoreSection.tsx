import Link from "next/link";
import { getAllPublishedDashboards } from "@/lib/landing/allPublishedDashboards";
import { LandingDashboardCardItem } from "@/components/sections/landing-dashboard-card";

export async function PublishedDashboardMoreSection({
  excludeUsername,
  excludeSlug,
  limit = 120,
}: {
  excludeUsername?: string;
  excludeSlug?: string;
  limit?: number;
}) {
  const all = await getAllPublishedDashboards(limit);
  const dashboards = all.filter(
    (d) => !(d.username === excludeUsername && d.slug === excludeSlug),
  );

  if (!dashboards.length) return null;

  return (
    <section aria-labelledby="more-dashboards-heading" className="border-t border-border/60 bg-muted/20">
      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-16 sm:px-6">
        <div className="mx-auto space-y-3 pb-8 text-center">
          <p className="font-mono text-sm font-medium uppercase tracking-wider text-primary">
            Explore
          </p>
          <h2
            id="more-dashboards-heading"
            className="mx-auto text-2xl font-semibold sm:text-3xl md:text-4xl"
          >
            More dashboards
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            Live, shareable dashboards from the Lychee community.
          </p>
        </div>

        <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-8 px-2 sm:px-0 md:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((d, idx) => (
            <LandingDashboardCardItem
              key={`${d.username}-${d.slug}`}
              dashboard={d}
              profilePic={null}
              priority={idx <= 2}
            />
          ))}
        </div>

        <div className="mx-auto mt-14 max-w-3xl rounded-xl border border-border/70 bg-background/80 px-5 py-6 text-center shadow-sm backdrop-blur-sm sm:px-6">
          <p className="text-base font-medium text-foreground sm:text-lg">
            Create your own and discover something great
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Build interactive dashboards with your data — no code required.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/#pricing"
              className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
              prefetch={false}
            >
              Get started
            </Link>
            <Link
              href="/dashboards-gallery"
              className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-6 text-sm font-medium hover:bg-muted"
              prefetch={false}
            >
              View all dashboards
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
