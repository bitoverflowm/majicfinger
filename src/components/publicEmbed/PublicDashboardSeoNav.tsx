import Link from "next/link";
import type { DashboardCluster } from "@/lib/server/dashboardClusterMap";

export function PublicDashboardSeoNav({
  username,
  dashboardTitle,
  cluster,
}: {
  username: string;
  slug: string;
  dashboardTitle: string;
  cluster: DashboardCluster | null;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mx-auto max-w-6xl px-6 pt-6 text-xs text-muted-foreground"
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="hover:text-foreground hover:underline underline-offset-2">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link
            href="/dashboards-gallery"
            className="hover:text-foreground hover:underline underline-offset-2"
          >
            Dashboards
          </Link>
        </li>
        {cluster ? (
          <>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={cluster.href}
                className="hover:text-foreground hover:underline underline-offset-2"
              >
                {cluster.title.length > 48 ? `${cluster.title.slice(0, 45)}…` : cluster.title}
              </Link>
            </li>
          </>
        ) : null}
        <li aria-hidden="true">/</li>
        <li className="text-foreground font-medium truncate max-w-[240px]" aria-current="page">
          {dashboardTitle}
        </li>
      </ol>
      <p className="mt-2 text-[11px]">
        By{" "}
        <span className="font-medium text-foreground">@{username}</span>
        {" · "}
        <Link href="/guides" className="hover:text-foreground hover:underline underline-offset-2">
          Guides
        </Link>
        {cluster ? (
          <>
            {" · "}
            <Link
              href={cluster.href}
              className="hover:text-foreground hover:underline underline-offset-2"
            >
              {cluster.slug.replace(/-/g, " ")}
            </Link>
          </>
        ) : null}
      </p>
    </nav>
  );
}
