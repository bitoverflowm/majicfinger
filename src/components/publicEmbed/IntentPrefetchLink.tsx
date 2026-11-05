"use client";

import { useRef, type ComponentProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";

/**
 * Link that skips viewport prefetching but warms the route's loading shell on hover/touch/focus,
 * so a click swaps to the skeleton instantly instead of waiting on the server.
 */
export function IntentPrefetchLink({
  href,
  onClick,
  onMouseEnter,
  onTouchStart,
  onFocus,
  ...rest
}: ComponentProps<typeof Link> & { href: string }) {
  const router = useRouter();
  const warmed = useRef(false);
  const warm = () => {
    if (warmed.current) return;
    warmed.current = true;
    router.prefetch(href, { kind: "auto" as PrefetchKind });
  };
  return (
    <Link
      {...rest}
      href={href}
      prefetch={false}
      onClick={(e) => {
        onClick?.(e);
        const plainClick = e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
        // The loading skeleton renders at the top; clicks from far down the page should land there.
        if (plainClick && !e.defaultPrevented) window.scrollTo({ top: 0 });
      }}
      onMouseEnter={(e) => {
        warm();
        onMouseEnter?.(e);
      }}
      onTouchStart={(e) => {
        warm();
        onTouchStart?.(e);
      }}
      onFocus={(e) => {
        warm();
        onFocus?.(e);
      }}
    />
  );
}
