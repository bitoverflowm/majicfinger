"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";

export const NEWS_NAV_ITEMS = [
  { id: "news", name: "News", href: "/news", description: "Live headlines next to the markets they can move." },
  { id: "research", name: "Research", href: "/#guides", description: "Guides, playbooks, and published research." },
  { id: "university", name: "University", href: "/university", description: "Concepts and methods behind the terminal." },
  { id: "guides", name: "Guides", href: "/guides", description: "Step-by-step workflows on Kalshi and Polymarket." },
  { id: "changelog", name: "What's New", href: "/changelog", description: "Product updates and recent launches." },
] as const;

export function NewsNavDropdown({
  variant = "desktop",
  onNavigate,
}: {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (variant === "mobile") {
    return (
      <div className="space-y-1 border-b border-border p-3">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          News
        </p>
        <ul className="space-y-1">
          {NEWS_NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className="block py-1 text-sm text-foreground/80 hover:text-secondary"
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      className="relative z-20 flex h-full items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) return;
        setOpen(false);
      }}
    >
      <Link
        href="/news"
        data-nav="news"
        className={cn(
          "flex h-full shrink-0 items-center justify-center whitespace-nowrap px-3 py-2 text-sm font-medium tracking-tight text-primary/70 transition-colors hover:text-primary",
          open && "text-primary",
        )}
        aria-haspopup="true"
        aria-expanded={open}
      >
        News
        <ChevronRight className="ml-0.5 size-3 rotate-90 text-muted-foreground" aria-hidden />
      </Link>
      <div
        className={cn(
          "absolute left-0 top-full z-50 pt-1 transition-opacity duration-150",
          open ? "visible opacity-100" : "hidden pointer-events-none opacity-0",
        )}
      >
        <div className="w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-xl">
          {NEWS_NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={close}
              className="block rounded-md px-3 py-2 transition-colors hover:bg-accent"
            >
              <span className="block text-sm font-medium text-foreground">{item.name}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                {item.description}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
