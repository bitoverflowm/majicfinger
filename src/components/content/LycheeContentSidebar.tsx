import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  isLycheeContentNavLinkActive,
  type LycheeContentNavData,
  type LycheeContentNavLink,
} from "@/lib/content/lychee-content-nav";

type LycheeContentSidebarProps = {
  data: LycheeContentNavData;
  /** Current pathname for server-rendered active state (e.g. `/guides/my-slug`). */
  currentPath: string;
};

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
        <section className="mb-8">
          <h2 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-foreground">
            Platform
          </h2>
          <NavLinkList items={data.platform} currentPath={currentPath} />
        </section>

        {data.sections.map((section) => (
          <section key={section.id} className="mb-8">
            {section.hubHref ? (
              <Link
                href={section.hubHref}
                className={cn(
                  "mb-3 block font-mono text-[10px] font-medium uppercase tracking-[0.14em] transition-colors hover:text-secondary",
                  isLycheeContentNavLinkActive(section.hubHref, currentPath)
                    ? "text-secondary"
                    : "text-foreground",
                )}
              >
                {section.label}
              </Link>
            ) : (
              <h2 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-foreground">
                {section.label}
              </h2>
            )}

            {section.topics?.map((topic) => (
              <div key={`${section.id}-${topic.id}`} className="mb-4 pl-2">
                <h3 className="mb-2 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {topic.label}
                </h3>
                {topic.buckets.map((bucket) => (
                  <div
                    key={`${section.id}-${topic.id}-${bucket.id}`}
                    className="mb-3 pl-2"
                  >
                    <h4 className="mb-1.5 text-[10px] font-medium text-muted-foreground/80">
                      {bucket.label}
                    </h4>
                    <NavLinkList
                      items={bucket.items}
                      currentPath={currentPath}
                      className="space-y-1.5"
                    />
                  </div>
                ))}
              </div>
            ))}

            {section.items ? (
              <NavLinkList
                items={section.items}
                currentPath={currentPath}
                className="pl-2"
              />
            ) : null}
          </section>
        ))}
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
