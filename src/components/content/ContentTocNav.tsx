"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { TocItem } from "@/lib/content/extract-mdx-headings";

type ContentTocNavProps = {
  items: TocItem[];
};

export function ContentTocNav({ items }: ContentTocNavProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) return;

    const elements = items
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-64px 0px -55% 0px",
        threshold: [0, 1],
      },
    );

    for (const el of elements) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="On this page"
      className="sticky top-20 max-h-[calc(100dvh-5rem)] w-full overflow-y-auto py-2 font-serif text-[10px] leading-snug 2xl:text-xs"
    >
      <div className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-foreground">
        On this page
      </div>
      <ul className="space-y-1.5">
        {items.map(({ id, text, depth }) => {
          const padClass =
            depth >= 4
              ? "pl-5"
              : depth === 3
                ? "pl-3"
                : depth === 2
                  ? "pl-1.5"
                  : "pl-0";

          return (
            <li key={id}>
              <a
                href={`#${id}`}
                className={cn(
                  "block break-words leading-snug transition-colors hover:text-secondary",
                  padClass,
                  activeId === id ? "text-secondary" : "text-foreground",
                )}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(id)?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                  window.history.replaceState(null, "", `#${id}`);
                }}
              >
                {text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
