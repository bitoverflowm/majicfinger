"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
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

const DROPDOWN_HOVER_BRIDGE = "pt-0.5";
const VIEWPORT_MARGIN_PX = 12;

function NavBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-[18px] items-center rounded-full bg-gradient-to-r from-secondary to-violet-500 px-1.5 text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-white">
      {label}
    </span>
  );
}

type TrendingHeadline = {
  headline: { title: string; url: string; source: string; t: number };
  market: { title: string; href: string };
  terms: string[];
};

function agoLabel(t: number) {
  const minutes = Math.max(1, Math.round((Date.now() - t) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

/** Loads once, the first time `active` turns true. */
function useTrendingHeadline(active: boolean) {
  const [value, setValue] = useState<TrendingHeadline | null>(null);
  const requested = useRef(false);
  useEffect(() => {
    if (!active || requested.current) return;
    requested.current = true;
    fetch("/api/news/headline")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.headline) setValue(data as TrendingHeadline);
      })
      .catch(() => {});
  }, [active]);
  return value;
}

/** The newest headline about a trending market, leading to the News archive search for it. */
function TrendingHeadlineStrip({ value }: { value: TrendingHeadline | null }) {
  if (!value) return null;
  const params = new URLSearchParams();
  for (const term of value.terms) params.append("q", term);
  return (
    <Link
      href={`/news-archive?${params}`}
      className="group mt-4 flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2.5 transition-colors hover:border-amber-500/40 hover:bg-amber-500/10"
    >
      <span className="relative mt-1.5 flex size-2 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500/60 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
          In the news · {agoLabel(value.headline.t)}
          {value.headline.source ? ` · ${value.headline.source}` : ""}
        </span>
        <span className="mt-0.5 block truncate text-sm font-medium text-foreground">{value.headline.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          Trending market: {value.market.title}
        </span>
      </span>
      <span className="shrink-0 self-center text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
        News archive →
      </span>
    </Link>
  );
}

function HubFlyout({ hub }: { hub: ProductsNavHub }) {
  return (
    <div
      className={cn(
        "invisible absolute left-full top-0 z-50 pl-0.5 opacity-0 transition-opacity duration-150",
        "pointer-events-none group-hover/hub:visible group-hover/hub:opacity-100 group-hover/hub:pointer-events-auto group-focus-within/hub:visible group-focus-within/hub:opacity-100 group-focus-within/hub:pointer-events-auto",
      )}
    >
      <div className="w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg">
        <Link
          href={hub.href}
          className="mb-3 block text-sm font-medium text-foreground transition-colors hover:text-secondary"
        >
          {hub.label}
          <span className="ml-1 text-muted-foreground">→</span>
        </Link>

        {hub.topics.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{hub.description}</p>
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
    </div>
  );
}

function DesktopProductsPanel({
  data,
  open,
  panelRef,
  panelLeft,
  onNavigate,
}: {
  data: ProductsNavData;
  open: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
  panelLeft: number;
  onNavigate: () => void;
}) {
  const trending = useTrendingHeadline(open);
  return (
    <div
      ref={panelRef}
      style={{ left: panelLeft }}
      className={cn(
        "absolute top-full z-50 transition-opacity duration-150",
        DROPDOWN_HOVER_BRIDGE,
        open
          ? "visible opacity-100 pointer-events-auto"
          : "invisible opacity-0 pointer-events-none",
      )}
      onClickCapture={(event) => {
        const target = event.target;
        if (target instanceof Element && target.closest("a")) {
          onNavigate();
        }
      }}
    >
      <div className="w-[min(42rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-xl sm:p-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6">
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
              Tools
            </p>
            <ul className="space-y-0.5">
              {data.tools.map((tool) => (
                <li key={tool.id}>
                  <Link
                    href={tool.href}
                    className="block rounded-md px-3 py-2.5 transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="text-sm font-medium text-foreground">{tool.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {tool.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <p className="mb-3 mt-5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Products
            </p>
            <ul className="space-y-0.5">
              {data.products.map((product) => (
                <li key={product.id}>
                  <Link
                    href={product.href}
                    className="block rounded-md px-3 py-2.5 transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{product.label}</span>
                      {product.badge ? <NavBadge label={product.badge} /> : null}
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
        <TrendingHeadlineStrip value={trending} />
      </div>
    </div>
  );
}

function DesktopProductsDropdown({ data }: { data: ProductsNavData }) {
  const anchorRef = useRef<HTMLLIElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelLeft, setPanelLeft] = useState(0);
  const [open, setOpen] = useState(false);

  const clampPanelToViewport = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const anchorRect = anchor.getBoundingClientRect();
    const panelWidth = panel.offsetWidth;
    const margin = VIEWPORT_MARGIN_PX;

    let left = 0;
    if (anchorRect.left + panelWidth > window.innerWidth - margin) {
      left = window.innerWidth - margin - panelWidth - anchorRect.left;
    }
    if (anchorRect.left + left < margin) {
      left = margin - anchorRect.left;
    }

    setPanelLeft(left);
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
    const active = document.activeElement;
    if (active instanceof HTMLElement && anchorRef.current?.contains(active)) {
      active.blur();
    }
  }, []);

  useLayoutEffect(() => {
    clampPanelToViewport();

    const anchor = anchorRef.current;
    if (!anchor) return undefined;

    const resizeObserver = new ResizeObserver(() => {
      clampPanelToViewport();
    });
    resizeObserver.observe(anchor);
    if (panelRef.current) resizeObserver.observe(panelRef.current);

    window.addEventListener("resize", clampPanelToViewport);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", clampPanelToViewport);
    };
  }, [clampPanelToViewport]);

  return (
    <li
      ref={anchorRef}
      className="relative z-20 flex h-full items-center"
      onMouseEnter={() => {
        setOpen(true);
        clampPanelToViewport();
      }}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => {
        setOpen(true);
        clampPanelToViewport();
      }}
      onBlurCapture={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) return;
        setOpen(false);
      }}
    >
      <button
        type="button"
        className={cn(
          "flex h-full shrink-0 cursor-default items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-medium tracking-tight text-primary/60 transition-colors duration-200 hover:text-primary",
          open && "text-primary",
        )}
        aria-haspopup="true"
        aria-expanded={open}
        tabIndex={-1}
      >
        Products
        <ChevronRight
          className="ml-0.5 size-3 rotate-90 text-muted-foreground"
          aria-hidden
        />
      </button>
      <DesktopProductsPanel
        data={data}
        open={open}
        panelRef={panelRef}
        panelLeft={panelLeft}
        onNavigate={closeMenu}
      />
    </li>
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
        <p className="mb-2 text-xs font-semibold text-foreground">Tools</p>
        <ul className="space-y-1">
          {data.tools.map((tool) => (
            <li key={tool.id}>
              <Link
                href={tool.href}
                className="text-sm text-foreground/80 hover:text-secondary"
              >
                {tool.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-foreground">Products</p>
        <ul className="space-y-1">
          {data.products.map((product) => (
            <li key={product.id}>
              <Link
                href={product.href}
                className="inline-flex items-center gap-2 text-sm text-foreground/80 hover:text-secondary"
              >
                {product.label}
                {product.badge ? <NavBadge label={product.badge} /> : null}
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

  return <DesktopProductsDropdown data={data} />;
}
