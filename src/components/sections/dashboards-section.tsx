import Link from "next/link";
import {
  getPublishedDashboardsForLanding,
  type LandingDashboardCard,
} from "@/lib/landing/publishedDashboards";
import { LandingDashboardCardItem } from "@/components/sections/landing-dashboard-card";

export type { LandingDashboardCard };

export async function DashboardsSection({
  username = "misterrpink",
  limit = 12,
  showCta = true,
}: {
  username?: string;
  limit?: number;
  showCta?: boolean;
}) {
  const { dashboards, profilePic } = await getPublishedDashboardsForLanding(username, limit);

  if (!dashboards.length) return null;

  return (
    <section id="dashboards" className="relative mx-auto w-full min-w-0 max-w-7xl px-4 py-16 sm:px-6">
      <div className="mx-auto space-y-4 pb-6 text-center">
        <p className="font-mono text-sm font-medium uppercase tracking-wider text-primary">
          Dashboards
        </p>
        <h2 className="mx-auto mt-4 max-w-xs text-3xl font-semibold sm:max-w-none sm:text-4xl md:text-5xl">
          Dashboards Gallery
        </h2>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
          Live, shareable dashboards built with Lychee.
        </p>
        {showCta ? (
          <div className="pt-2">
            <Link
              href="/dashboards-gallery"
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              prefetch={false}
            >
              View all dashboards
            </Link>
          </div>
        ) : null}
      </div>

      <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-8 px-2 sm:px-0 md:grid-cols-2 lg:grid-cols-3">
        {dashboards.map((d, idx) => (
          <LandingDashboardCardItem
            key={`${d.username}-${d.slug}`}
            dashboard={d}
            profilePic={profilePic}
            priority={idx <= 1}
          />
        ))}
      </div>
    </section>
  );
}
