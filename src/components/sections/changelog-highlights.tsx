import Link from "next/link";

import { CHANGELOG_ENTRY_EXTRAS } from "@/lib/content/changelogEntryExtras";
import { getFeatureReleaseContent } from "@/lib/content/featureReleases";

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

const LG_COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

export function ChangelogHighlights() {
  const releases = getFeatureReleaseContent().slice(0, 4);
  if (releases.length === 0) return null;

  return (
    <div className="relative z-10 mx-auto w-full max-w-[min(100%,84rem)] px-6 py-12 sm:px-8 md:py-16 lg:px-10">
      <h2 className="mb-4 text-lg font-normal tracking-tight text-primary">Changelog</h2>
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${LG_COLS[releases.length]}`}>
        {releases.map((item) => {
          const publishedAt = item.frontmatter?.publishedAt;
          const href = CHANGELOG_ENTRY_EXTRAS[item.slug]
            ? (CHANGELOG_ENTRY_EXTRAS[item.slug].links?.[0]?.href ?? "/changelog")
            : `/guides/${item.slug}`;
          return (
            <Link
              key={`${item.contentType}-${item.slug}`}
              href={href}
              prefetch={false}
              className="flex min-h-[6.5rem] flex-col rounded-lg bg-accent p-4 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <time dateTime={publishedAt} className="text-sm text-muted-foreground">
                {formatDate(publishedAt)}
              </time>
              <p className="mt-1 text-[0.9375rem] leading-snug text-primary">
                {item.frontmatter?.title || item.slug}
              </p>
            </Link>
          );
        })}
      </div>
      <Link
        href="/changelog"
        className="mt-4 inline-block text-sm text-secondary transition-colors hover:text-secondary/80"
      >
        See what&apos;s new in Lychee →
      </Link>
    </div>
  );
}
