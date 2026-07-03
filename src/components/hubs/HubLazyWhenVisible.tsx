"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type HubLazyWhenVisibleProps = {
  children: ReactNode;
  fallback: ReactNode;
  /** IntersectionObserver rootMargin — load slightly before entering viewport. */
  rootMargin?: string;
  className?: string;
};

/** Mount children only when the placeholder scrolls near the viewport. */
export function HubLazyWhenVisible({
  children,
  fallback,
  rootMargin = "280px 0px",
  className,
}: HubLazyWhenVisibleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, visible]);

  return (
    <div ref={ref} className={className}>
      {visible ? children : fallback}
    </div>
  );
}
