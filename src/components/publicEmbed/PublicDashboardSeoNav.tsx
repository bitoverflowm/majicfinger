import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { DashboardCluster } from "@/lib/server/dashboardClusterMap";

const LINK_CLASS = "transition-colors hover:text-foreground";

export function PublicDashboardSeoNav({
  dashboardTitle,
  cluster,
}: {
  username: string;
  slug: string;
  dashboardTitle: string;
  cluster: DashboardCluster | null;
}) {
  const sep = (
    <li aria-hidden="true">
      <ChevronRight className="size-3 text-muted-foreground/60" />
    </li>
  );
  return (
    <nav aria-label="Breadcrumb" className="mx-auto w-full max-w-6xl px-4 pt-5 text-[12px] text-muted-foreground sm:px-6">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className={LINK_CLASS}>
            Home
          </Link>
        </li>
        {sep}
        <li>
          <Link href="/dashboards-gallery" className={LINK_CLASS}>
            Dashboards
          </Link>
        </li>
        {cluster ? (
          <>
            {sep}
            <li>
              <Link href={cluster.href} className={LINK_CLASS}>
                {cluster.title.length > 48 ? `${cluster.title.slice(0, 45)}…` : cluster.title}
              </Link>
            </li>
          </>
        ) : null}
        {sep}
        <li className="max-w-[260px] truncate font-medium text-foreground" aria-current="page">
          {dashboardTitle}
        </li>
      </ol>
    </nav>
  );
}
