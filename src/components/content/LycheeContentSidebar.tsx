import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  isLycheeContentNavLinkActive,
  type LycheeContentNavData,
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
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "block leading-snug transition-colors hover:text-secondary",
          active ? "text-secondary" : "text-foreground",
        )}
      >
        {label}
      </Link>
    </li>
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
          <ul className="space-y-2.5">
            {data.platform.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                active={isLycheeContentNavLinkActive(item.href, currentPath)}
              />
            ))}
          </ul>
        </section>

        {data.sections.map((section) => (
          <section key={section.id} className="mb-8">
            <h2 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-foreground">
              {section.label}
            </h2>
            <ul className="space-y-2.5">
              {section.items.map((item) => (
                <NavItem
                  key={`${section.id}-${item.slug ?? item.href}`}
                  href={item.href}
                  label={item.label}
                  active={isLycheeContentNavLinkActive(item.href, currentPath)}
                />
              ))}
            </ul>
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
