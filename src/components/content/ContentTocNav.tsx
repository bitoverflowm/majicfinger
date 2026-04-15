"use client";

import { useEffect, useState } from "react";
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
      className="fixed left-[calc(50%+400px)] top-20 z-40 hidden max-h-[70vh] w-56 overflow-y-auto rounded-xl bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/85 md:block"
    >
        <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Table of Contents
        </div>
        <ul className="space-y-0.5">
          {items.map(({ id, text, depth }) => {
            const padClass =
              depth >= 4
                ? "pl-6 text-[13px]"
                : depth === 3
                  ? "pl-5 text-[13px]"
                  : depth === 2
                    ? "pl-3 text-[13px]"
                    : "pl-1 text-[13px]";
            return (
            <li key={id}>
              <a
                href={`#${id}`}
                className={`block rounded-md py-1.5 leading-snug text-muted-foreground/90 transition-colors hover:text-foreground ${padClass} ${
                  activeId === id ? "font-medium text-foreground" : ""
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
