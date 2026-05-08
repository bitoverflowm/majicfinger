import Link from "next/link";
import Image from "next/image";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import ChartDashboard from "@/models/ChartDashboards";
import { Badge } from "@/components/ui/badge";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

type DashboardCard = {
  username: string;
  slug: string;
  title: string;
  description: string;
  publishedAt?: string | null;
  hasOgImage?: boolean;
  tags?: string[];
};

function avatarInitial(username: string) {
  const u = String(username || "").trim();
  return (u ? u[0] : "?").toUpperCase();
}

const TAG_STYLES = [
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  "bg-lime-500/15 text-lime-800 dark:text-lime-300 border-lime-500/30",
];

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

export async function DashboardsSection({
  username = "misterrpink",
  limit = 12,
  showCta = true,
}: {
  username?: string;
  limit?: number;
  showCta?: boolean;
}) {
  let dashboards: DashboardCard[] = [];
  let profilePic: string | null = null;
  try {
    await dbConnect();
    const user = (await User.findOne({ user_name: String(username).trim() })
      .select("_id user_name profile_pic")
      .lean()) as any;
    if (user?._id) {
      profilePic = user.profile_pic ? String(user.profile_pic) : null;
      const list = (await ChartDashboard.find({
        user_id: user._id,
        is_public: true,
        public_slug: { $type: "string", $gt: "" },
      })
        .select("public_slug page_heading page_subheading published_at last_edited_date og_image_data tags")
        .sort({ published_at: -1, last_edited_date: -1 })
        .limit(Math.max(1, Math.min(120, Number(limit) || 12)))
        .lean()) as any[];
      dashboards = list
        .map((d) => {
          const slug = String(d.public_slug || "").trim();
          const title = String(d.page_heading || "").trim();
          const description = String(d.page_subheading || "").trim();
          if (!slug || !title || !description) return null;
          const tags = Array.isArray(d.tags) ? d.tags.map((t) => String(t || "").trim()).filter(Boolean) : [];
          const publishedAt = (d.published_at || d.last_edited_date)
            ? new Date(d.published_at || d.last_edited_date).toISOString()
            : null;
          return {
            username: String(user.user_name || username),
            slug,
            title,
            description,
            publishedAt,
            hasOgImage: !!d.og_image_data,
            tags,
          } satisfies DashboardCard;
        })
        .filter(Boolean) as DashboardCard[];
    }
  } catch {
    dashboards = [];
  }

  if (!dashboards.length) return null;

  return (
    <section id="dashboards" className="relative mx-auto w-full min-w-0 max-w-7xl px-4 py-16 sm:px-6">
      <div className="text-center space-y-4 pb-6 mx-auto">
        <h2 className="text-sm text-primary font-mono font-medium tracking-wider uppercase">Dashboards</h2>
        <h3 className="mx-auto mt-4 max-w-xs text-3xl font-semibold sm:max-w-none sm:text-4xl md:text-5xl">
          Published dashboards
        </h3>
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
        {dashboards.map((d, idx) => {
          const href = `/${encodeURIComponent(d.username)}/dashboards/${encodeURIComponent(d.slug)}`;
          // Use a same-origin relative URL so `next/image` doesn't require remotePatterns.
          const ogImage = d.hasOgImage
            ? `/api/public/dashboards/${encodeURIComponent(d.username)}/${encodeURIComponent(d.slug)}/og-image`
            : null;
          return (
            <Link
              key={`${d.username}-${d.slug}`}
              href={href}
              className="block min-w-0 max-w-full"
              prefetch={false}
            >
              <div className="mb-4 min-w-0 max-w-full overflow-hidden rounded-xl border border-neutral-200 bg-background p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md dark:border-neutral-800">
                {ogImage ? (
                  <div className="relative mb-4 aspect-[40/21] w-full max-w-full overflow-hidden rounded-lg border">
                    <Image
                      className="object-cover"
                      src={ogImage}
                      alt={d.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      priority={idx <= 1}
                    />
                  </div>
                ) : (
                  <div className="bg-muted h-[180px] mb-4 rounded flex items-center justify-center text-muted-foreground">
                    Dashboard
                  </div>
                )}
                <p className="mb-2">
                  <time dateTime={d.publishedAt || undefined} className="text-sm text-muted-foreground">
                    {formatDate(d.publishedAt)}
                  </time>
                </p>
                <h3 className="text-xl font-semibold mb-2">{d.title}</h3>
                <p className="text-foreground mb-2 line-clamp-5">{d.description}</p>

                <div className="mt-4 border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {profilePic ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profilePic}
                          alt={`@${d.username}`}
                          className="h-6 w-6 rounded-full object-cover ring-1 ring-border"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted ring-1 ring-border flex items-center justify-center text-[11px] font-semibold text-muted-foreground">
                          {avatarInitial(d.username)}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground truncate">
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
        })}
      </div>
    </section>
  );
}

