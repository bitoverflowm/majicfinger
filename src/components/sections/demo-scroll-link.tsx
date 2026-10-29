"use client";

import Link from "next/link";
import { interceptOnCompactScreen } from "@/lib/desktopOnly";
import { requestLandingDemoActivateAfterScroll } from "@/lib/landingDemoSession";
import { resolveDemoMockupEl, resolveDemoSectionEl, scrollToDemoSection } from "@/lib/scrollToDemo";
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
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (activateLandingDemo && interceptOnCompactScreen(e)) return;
        if (!resolveDemoSectionEl() && !resolveDemoMockupEl()) return;
        if (activateLandingDemo) requestLandingDemoActivateAfterScroll();
        e.preventDefault();
        scrollToDemoSection();
      }}
    />
  );
}
