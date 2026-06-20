import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type {
  ProductsNavData,
  ProductsNavHub,
} from "@/lib/nav/products-nav";
import { cn } from "@/lib/utils";

type ProductsNavDropdownProps = {
  data: ProductsNavData;
  /** Compact layout for mobile drawer. */
  variant?: "desktop" | "mobile";
};

function HubFlyout({ hub }: { hub: ProductsNavHub }) {
  return (
    <div
      className={cn(
        "invisible absolute left-full top-0 z-50 ml-1 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-border bg-popover p-4 text-popover-foreground opacity-0 shadow-lg transition-opacity duration-150",
        "pointer-events-none group-hover/hub:visible group-hover/hub:opacity-100 group-hover/hub:pointer-events-auto group-focus-within/hub:visible group-focus-within/hub:opacity-100 group-focus-within/hub:pointer-events-auto",
      )}
    >
      <Link
        href={hub.href}
        className="mb-3 block text-sm font-medium text-foreground transition-colors hover:text-secondary"
      >
        {hub.label}
        <span className="ml-1 text-muted-foreground">→</span>
      </Link>

      {hub.topics.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {hub.description}
        </p>
      ) : (
        <div className="max-h-[min(60vh,28rem)] space-y-4 overflow-y-auto pr-1">
          {hub.topics.map((topic) => (
            <div key={topic.id}>
              <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {topic.label}
              </p>
              <div className="space-y-2">
                {topic.buckets.map((bucket) => (
                  <div key={bucket.id}>
                    <p className="mb-0.5 text-[11px] font-medium text-foreground/80">
                      {bucket.label}
                    </p>
                    <ul className="space-y-0.5">
                      {bucket.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="block rounded-sm py-0.5 text-sm text-foreground/90 transition-colors hover:text-secondary"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {hub.charts.length > 0 ? (
            <div>
              <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Charts
              </p>
              <ul className="space-y-0.5">
                {hub.charts.map((chart) => (
                  <li key={chart.href}>
                    <Link
                      href={chart.href}
                      className="block rounded-sm py-0.5 text-sm text-foreground/90 transition-colors hover:text-secondary"
                    >
                      {chart.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function DesktopProductsPanel({ data }: { data: ProductsNavData }) {
  return (
    <div
      className={cn(
        "invisible absolute left-1/2 top-full z-50 mt-2 w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-border bg-popover p-5 text-popover-foreground opacity-0 shadow-xl transition-opacity duration-150",
        "pointer-events-none group-hover/products:visible group-hover/products:opacity-100 group-hover/products:pointer-events-auto group-focus-within/products:visible group-focus-within/products:opacity-100 group-focus-within/products:pointer-events-auto",
      )}
    >
      <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Integrations
          </p>
          <ul className="max-h-[min(70vh,24rem)] space-y-0.5 overflow-y-auto pr-1">
            {data.integrations.map((hub) => (
              <li key={hub.id} className="group/hub relative">
                <Link
                  href={hub.href}
                  className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <span>{hub.label}</span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </Link>
                <HubFlyout hub={hub} />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Products
          </p>
          <ul className="space-y-0.5">
            {data.products.map((product) => (
              <li key={product.id}>
                <Link
                  href={product.href}
                  className="block rounded-md px-3 py-2.5 transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="text-sm font-medium text-foreground">
                    {product.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                    {product.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MobileProductsSection({ data }: { data: ProductsNavData }) {
  return (
    <div className="space-y-4 border-b border-border p-3 last:border-b-0">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Products
      </p>

      <div>
        <p className="mb-2 text-xs font-semibold text-foreground">Integrations</p>
        <ul className="space-y-3">
          {data.integrations.map((hub) => (
            <li key={hub.id}>
              <Link
                href={hub.href}
                className="text-sm font-medium text-foreground hover:text-secondary"
              >
                {hub.label}
              </Link>
              {hub.topics.length > 0 ? (
                <ul className="mt-1.5 space-y-2 border-l border-border pl-3">
                  {hub.topics.map((topic) => (
                    <li key={topic.id}>
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {topic.label}
                      </p>
                      {topic.buckets.map((bucket) => (
                        <ul key={bucket.id} className="mt-0.5 space-y-0.5">
                          {bucket.items.map((item) => (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                className="text-sm text-foreground/80 hover:text-secondary"
                              >
                                {item.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ))}
                    </li>
                  ))}
                  {hub.charts.map((chart) => (
                    <li key={chart.href}>
                      <Link
                        href={chart.href}
                        className="text-sm text-foreground/80 hover:text-secondary"
                      >
                        {chart.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs leading-snug text-muted-foreground">
                  {hub.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-foreground">Platform</p>
        <ul className="space-y-1">
          {data.products.map((product) => (
            <li key={product.id}>
              <Link
                href={product.href}
                className="text-sm text-foreground/80 hover:text-secondary"
              >
                {product.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ProductsNavDropdown({
  data,
  variant = "desktop",
}: ProductsNavDropdownProps) {
  if (variant === "mobile") {
    return (
      <li className="list-none">
        <MobileProductsSection data={data} />
      </li>
    );
  }

  return (
    <li className="group/products relative z-20 flex h-full items-center">
      <button
        type="button"
        className="flex h-full cursor-default items-center justify-center px-4 py-2 text-sm font-medium tracking-tight text-primary/60 transition-colors duration-200 hover:text-primary group-hover/products:text-primary"
        aria-haspopup="true"
        aria-expanded="false"
        tabIndex={-1}
      >
        Products
        <ChevronRight
          className="ml-0.5 size-3 rotate-90 text-muted-foreground"
          aria-hidden
        />
      </button>
      <DesktopProductsPanel data={data} />
    </li>
  );
}
