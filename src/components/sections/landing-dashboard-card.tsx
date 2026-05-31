import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { LandingDashboardCard } from "@/lib/landing/publishedDashboards";

const TAG_STYLES = [
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  "bg-lime-500/15 text-lime-800 dark:text-lime-300 border-lime-500/30",
];

function avatarInitial(username: string) {
  const u = String(username || "").trim();
  return (u ? u[0] : "?").toUpperCase();
}

function formatDate(dateStr: string | undefined | null) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-us", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

type LandingDashboardCardProps = {
  dashboard: LandingDashboardCard;
  profilePic?: string | null;
  priority?: boolean;
};

export function LandingDashboardCardItem({
  dashboard: d,
  profilePic,
  priority = false,
}: LandingDashboardCardProps) {
  const href = `/${encodeURIComponent(d.username)}/dashboards/${encodeURIComponent(d.slug)}`;
  const ogImage = d.hasOgImage
    ? `/api/public/dashboards/${encodeURIComponent(d.username)}/${encodeURIComponent(d.slug)}/og-image`
    : null;

  return (
    <Link href={href} className="block min-w-0 max-w-full" prefetch={false}>
      <div className="mb-4 min-w-0 max-w-full overflow-hidden rounded-xl border border-neutral-200 bg-background p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md dark:border-neutral-800">
        {ogImage ? (
          <div className="relative mb-4 aspect-[40/21] w-full max-w-full overflow-hidden rounded-lg border">
            <Image
              className="object-cover"
              src={ogImage}
              alt={d.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={priority}
            />
          </div>
        ) : (
          <div className="bg-muted mb-4 flex h-[180px] items-center justify-center rounded text-muted-foreground">
            Dashboard
          </div>
        )}
        <p className="mb-2">
          <time dateTime={d.publishedAt || undefined} className="text-sm text-muted-foreground">
            {formatDate(d.publishedAt)}
          </time>
        </p>
        <h3 className="mb-2 text-xl font-semibold">{d.title}</h3>
        <p className="mb-2 line-clamp-5 text-foreground">{d.description}</p>

        <div className="mt-4 border-t border-border/60 pt-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {profilePic ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profilePic}
                  alt={`@${d.username}`}
                  className="h-6 w-6 rounded-full object-cover ring-1 ring-border"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
                  {avatarInitial(d.username)}
                </div>
              )}
              <div className="truncate text-xs text-muted-foreground">
                Created by <span className="font-medium text-foreground">@{d.username}</span>
              </div>
            </div>
          </div>

          {Array.isArray(d.tags) && d.tags.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {d.tags.slice(0, 6).map((t, i) => (
                <Badge
                  key={`${d.username}-${d.slug}-tag-${t}`}
                  variant="secondary"
                  className={`border ${TAG_STYLES[i % TAG_STYLES.length]}`}
                >
                  {t}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
