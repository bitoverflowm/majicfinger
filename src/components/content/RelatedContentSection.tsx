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
 * Server-rendered related reading list (Making Software–style).
 * Full link markup in initial HTML for crawlers and internal linking.
 */
export function RelatedContentSection({
  items,
  title = "Related content",
}: RelatedContentSectionProps) {
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="related-content-heading"
      className="mt-10 w-full min-w-0 border-t border-border pt-8 font-sans sm:mt-14 sm:pt-10"
    >
      <h2
        id="related-content-heading"
        className="mb-6 font-article text-base font-bold leading-snug tracking-tight text-foreground sm:mb-8 sm:text-lg"
      >
        {title}
      </h2>
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const href =
            item.contentType === "guides" || item.contentType === "blog"
              ? `/guides/${item.slug}`
              : `/${item.contentType}/${item.slug}`;
          const dateLabel = item.publishedAt
            ? formatRelatedDate(item.publishedAt)
            : "";

          return (
            <li key={`${item.contentType}-${item.slug}`}>
              <article>
                <Link
                  href={href}
                  className="group block py-5 sm:py-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground group-hover:underline group-hover:underline-offset-4 sm:text-base">
                      {item.title}
                    </h3>
                    {dateLabel ? (
                      <time
                        dateTime={item.publishedAt}
                        className="shrink-0 pt-0.5 text-xs leading-none text-muted-foreground sm:text-sm"
                      >
                        {dateLabel}
                      </time>
                    ) : null}
                  </div>
                  {item.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
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
