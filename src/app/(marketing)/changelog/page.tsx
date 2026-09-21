import Link from "next/link";
import { CTASection } from "@/components/sections/cta-section";
import { FooterSection } from "@/components/sections/footer-section";
import { TweetCard } from "@/components/content/TweetCard";
import { CHANGELOG_ENTRY_EXTRAS } from "@/lib/content/changelogEntryExtras";
import { getFeatureReleaseContent } from "@/lib/content/featureReleases";
import { canonicalUrl } from "@/lib/site";
import type { ContentItem } from "@/lib/content/types";

const PAGE_TITLE = "Lychee Changelog: Product Updates & Feature Releases";
const PAGE_DESCRIPTION =
  "Chronological product updates and feature releases from Lychee — new charts, data workflows, hub tools, and platform improvements.";

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: canonicalUrl("/changelog"),
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: canonicalUrl("/changelog"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-us", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ChangelogRelease({ item }: { item: ContentItem }) {
  const publishedAt = item.frontmatter?.publishedAt;
  const description =
    item.frontmatter?.description || item.frontmatter?.summary || item.excerpt || "";
  const extras = CHANGELOG_ENTRY_EXTRAS[item.slug];
  const title = item.frontmatter?.title || item.slug;

  if (extras) {
    return (
      <li>
        <article className="flex flex-col gap-4 px-1 py-6 sm:flex-row sm:items-start sm:gap-6 sm:px-2">
          <time
            dateTime={publishedAt}
            className="shrink-0 pt-0.5 text-sm tabular-nums text-muted-foreground sm:w-36"
          >
            {formatDate(publishedAt) || "—"}
          </time>
          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-1.5">
              <h2 className="text-base font-medium text-foreground">{title}</h2>
              {description ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {extras.tweetId ? (
              <TweetCard id={extras.tweetId} className="my-0 justify-start" />
            ) : null}
            {extras.links?.length ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {extras.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    prefetch={false}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </article>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={`/guides/${item.slug}`}
        className="group flex flex-col gap-1 px-1 py-5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-baseline sm:gap-6 sm:px-2"
        prefetch={false}
      >
        <time
          dateTime={publishedAt}
          className="shrink-0 text-sm tabular-nums text-muted-foreground sm:w-36"
        >
          {formatDate(publishedAt) || "—"}
        </time>
        <span className="min-w-0 flex-1 space-y-1">
          <span className="block text-base font-medium text-foreground group-hover:text-primary">
            {title}
          </span>
          {description ? (
            <span className="block text-sm leading-relaxed text-muted-foreground line-clamp-2">
              {description}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

export default function ChangelogPage() {
  const releases = getFeatureReleaseContent();

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center divide-y divide-border bg-background font-sans antialiased theme-landing scroll-smooth">
      <section className="relative mx-auto w-full min-w-0 max-w-3xl px-4 py-16 sm:px-6">
        <div className="mx-auto space-y-3 pb-10 text-center sm:text-left">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Lychee Changelog
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Feature releases and product updates, newest first. Each entry links to the full
            guide or announcement.
          </p>
        </div>

        {releases.length > 0 ? (
          <ol className="space-y-0 divide-y divide-border border-y border-border">
            {releases.map((item) => (
              <ChangelogRelease key={`${item.contentType}-${item.slug}`} item={item} />
            ))}
          </ol>
        ) : (
          <p className="py-12 text-center text-muted-foreground">
            No feature releases yet. Check back soon!
          </p>
        )}

        <p className="mt-8 text-center text-sm text-muted-foreground sm:text-left">
          Looking for tutorials?{" "}
          <Link href="/guides" className="font-medium text-foreground underline-offset-4 hover:underline">
            Browse all guides
          </Link>
          .
        </p>
      </section>
      <CTASection />
      <FooterSection />
    </main>
  );
}
