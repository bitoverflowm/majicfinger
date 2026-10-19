"use client";

import Link from "next/link";
import { requestLandingDemoActivate } from "@/lib/landingDemoSession";
import { scrollToDemoSection } from "@/lib/scrollToDemo";
import type { ComponentProps } from "react";

type DemoScrollLinkProps = ComponentProps<typeof Link> & {
  /** Homepage "Try For Free" — marks the landing demo active as it scrolls into view. */
  activateLandingDemo?: boolean;
};

export function DemoScrollLink({
  href = "#demo",
  onClick,
  activateLandingDemo = false,
  ...props
}: DemoScrollLinkProps) {
  return (
    <Link
      href={href}
      {...props}
      onClick={(e) => {
        if (activateLandingDemo) requestLandingDemoActivate();
        onClick?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        scrollToDemoSection();
      }}
    />
  );
}
