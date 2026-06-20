import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  isLycheeContentNavBucketActive,
  isLycheeContentNavLinkActive,
  isLycheeContentNavSectionActive,
  isLycheeContentNavTopicActive,
  type LycheeContentNavData,
  type LycheeContentNavLink,
} from "@/lib/content/lychee-content-nav";

type LycheeContentSidebarProps = {
  data: LycheeContentNavData;
  /** Current pathname for server-rendered active state (e.g. `/guides/my-slug`). */
  currentPath: string;
};

const summaryClassName =
  "cursor-pointer list-none leading-tight [&::-webkit-details-marker]:hidden [list-style:none]";

function NavItem({
  href,
  label,
  active,
  className,
}: {
  href: string;
  label: string;
  active: boolean;
  className?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "block leading-snug transition-colors hover:text-secondary",
          active ? "text-secondary" : "text-foreground",
          className,
        )}
      >
        {label}
      </Link>
    </li>
  );
}

function NavLinkList({
  items,
  currentPath,
  className,
}: {
  items: LycheeContentNavLink[];
  currentPath: string;
  className?: string;
}) {
  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item) => (
        <NavItem
          key={item.href}
          href={item.href}
          label={item.label}
          active={isLycheeContentNavLinkActive(item.href, currentPath)}
        />
      ))}
    </ul>
  );
}

/**
 * Server-rendered lychee_content sidebar.
 * All links are present in the initial HTML for crawlers and internal linking.
 */
export function LycheeContentSidebar({
  data,
  currentPath,
}: LycheeContentSidebarProps) {
  return (
    <nav
      aria-label="Lychee content"
      className="sticky top-0 grid h-full max-h-dvh w-full grid-rows-[auto_1fr_auto] overflow-y-auto pl-8 font-serif text-xs"
    >
      <div className="pb-6 pt-8">
        <Link
          href="/"
          className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-secondary"
        >
          Lychee
        </Link>
      </div>

      <div className="min-h-0 overflow-y-auto pb-8 pr-4">
        <section className="mb-5">
          <h2 className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-foreground">
            Platform
          </h2>
          <NavLinkList items={data.platform} currentPath={currentPath} />
        </section>

        {data.sections.map((section) => {
          const sectionActive = isLycheeContentNavSectionActive(
            section,
            currentPath,
          );

          return (
            <section key={section.id} className="mb-5">
              {section.hubHref ? (
                <Link
                  href={section.hubHref}
                  className={cn(
                    "block font-mono text-[10px] font-medium uppercase tracking-[0.14em] transition-colors hover:text-secondary",
                    sectionActive ? "mb-1.5" : "mb-0",
                    isLycheeContentNavLinkActive(section.hubHref, currentPath)
                      ? "text-secondary"
                      : "text-foreground",
                  )}
                >
                  {section.label}
                </Link>
              ) : (
                <h2 className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-foreground">
                  {section.label}
                </h2>
              )}

              {section.topics ? (
                <details open={sectionActive} className="group/section space-y-0">
                  <summary className={cn(summaryClassName, "sr-only")}>
                    {section.label} topics
                  </summary>
                  {section.topics.map((topic) => {
                    const topicActive = isLycheeContentNavTopicActive(
                      topic,
                      currentPath,
                    );

                    return (
                      <details
                        key={`${section.id}-${topic.id}`}
                        open={topicActive}
                        className="group/topic mb-0.5 pl-2 open:mb-2"
                      >
                        <summary
                          className={cn(
                            summaryClassName,
                            "py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] transition-colors hover:text-secondary group-open/topic:mb-1.5",
                            topicActive
                              ? "text-secondary"
                              : "text-muted-foreground",
                          )}
                        >
                          {topic.label}
                        </summary>
                        <div className="space-y-0 group-open/topic:space-y-1">
                          {topic.buckets.map((bucket) => {
                            const bucketActive = isLycheeContentNavBucketActive(
                              bucket,
                              currentPath,
                            );

                            return (
                              <details
                                key={`${section.id}-${topic.id}-${bucket.id}`}
                                open={bucketActive}
                                className="group/bucket mb-0 pl-2 open:mb-1.5"
                              >
                                <summary
                                  className={cn(
                                    summaryClassName,
                                    "py-0.5 text-[10px] font-medium transition-colors hover:text-secondary group-open/bucket:mb-1",
                                    bucketActive
                                      ? "text-secondary"
                                      : "text-muted-foreground/80",
                                  )}
                                >
                                  {bucket.label}
                                </summary>
                                <NavLinkList
                                  items={bucket.items}
                                  currentPath={currentPath}
                                  className="space-y-1 pb-1"
                                />
                              </details>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })}
                </details>
              ) : null}

              {section.items ? (
                <details open={sectionActive} className="group/section">
                  <summary className={cn(summaryClassName, "sr-only")}>
                    {section.label} items
                  </summary>
                  <NavLinkList
                    items={section.items}
                    currentPath={currentPath}
                    className="space-y-1 pl-2"
                  />
                </details>
              ) : null}
            </section>
          );
        })}
      </div>

      <div className="space-y-3 pb-8 pr-4">
        <p className="text-[11px] leading-snug text-muted-foreground">
          Explore prediction market data with no setup.
        </p>
        <Link
          href={data.cta.primary.href}
          className="inline-flex font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-secondary transition-colors hover:text-secondary/80"
        >
          {data.cta.primary.label}
        </Link>
        <Link
          href={data.cta.secondary.href}
          className="block font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
        >
          {data.cta.secondary.label}
        </Link>
      </div>
    </nav>
  );
}
