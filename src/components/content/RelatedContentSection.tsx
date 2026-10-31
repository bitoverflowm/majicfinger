import Link from "next/link";
import type { RelatedItem } from "@/lib/content/related";

function formatRelatedDate(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type RelatedContentSectionProps = {
  items: RelatedItem[];
  title?: string;
};

/**
 * Server-rendered related reading list as compact cards (date · category, title, byline).
 * Full link markup in initial HTML for crawlers and internal linking.
 */
export function RelatedContentSection({
  items,
  title = "More reading",
}: RelatedContentSectionProps) {
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="related-content-heading"
      className="mt-10 w-full min-w-0 border-t border-border pt-8 font-sans sm:mt-14 sm:pt-10"
    >
      <h2
        id="related-content-heading"
        className="mb-4 font-article text-base font-bold leading-snug tracking-tight text-foreground sm:mb-5 sm:text-lg"
      >
        {title}
      </h2>
      <ul className="space-y-2.5">
        {items.map((item) => {
          const href =
            item.contentType === "guides" || item.contentType === "blog"
              ? `/guides/${item.slug}`
              : `/${item.contentType}/${item.slug}`;
          const dateLabel = item.publishedAt
            ? formatRelatedDate(item.publishedAt)
            : "";
          const readingLabel = item.readingTime
            ? /read/i.test(item.readingTime)
              ? item.readingTime
              : `${item.readingTime} read`
            : "";
          const byline = [item.author, readingLabel].filter(Boolean);

          return (
            <li key={`${item.contentType}-${item.slug}`}>
              <article>
                <Link
                  href={href}
                  className="group block rounded-lg border border-border bg-black/[0.015] px-4 py-3.5 transition-colors hover:bg-black/[0.04] dark:bg-white/[0.03] dark:hover:bg-white/[0.06] sm:px-5 sm:py-4"
                >
                  {dateLabel || item.category ? (
                    <p className="text-xs leading-snug text-muted-foreground sm:text-[13px]">
                      {dateLabel ? (
                        <time dateTime={item.publishedAt}>{dateLabel}</time>
                      ) : null}
                      {dateLabel && item.category ? " · " : null}
                      {item.category}
                    </p>
                  ) : null}
                  <h3 className="mt-1 text-sm font-medium leading-snug text-foreground sm:text-[15px]">
                    {item.title}
                  </h3>
                  {byline.length > 0 ? (
                    <p className="mt-2.5 text-xs leading-snug text-muted-foreground sm:text-[13px]">
                      {byline.join(" · ")}
                    </p>
                  ) : null}
                </Link>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
