"use client";

import { useEffect, useState } from "react";
import { ListTree } from "lucide-react";
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
      }
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
      className="fixed left-4 top-24 z-40 hidden max-h-[min(70vh,32rem)] w-[min(16rem,calc(100vw-2rem))] flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-background/95 p-3 text-sm shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:flex"
    >
        <div className="mb-1 flex items-center gap-2 px-1 font-medium text-foreground">
          <ListTree className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          On this page
        </div>
        <ul className="space-y-0.5">
          {items.map(({ id, text, depth }) => {
            const padClass =
              depth >= 4
                ? "pl-6 text-xs"
                : depth === 3
                  ? "pl-5 text-xs"
                  : depth === 2
                    ? "pl-3"
                    : "pl-1";
            return (
            <li key={id}>
              <a
                href={`#${id}`}
                className={`block rounded-md py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${padClass} ${
                  activeId === id ? "bg-muted font-medium text-foreground" : ""
                }`}
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
