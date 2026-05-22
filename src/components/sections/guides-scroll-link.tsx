"use client";

import Link from "next/link";
import { scrollToGuidesSection } from "@/lib/scrollToGuides";
import type { ComponentProps } from "react";

type GuidesScrollLinkProps = ComponentProps<typeof Link>;

export function GuidesScrollLink({ href = "#guides", onClick, ...props }: GuidesScrollLinkProps) {
  return (
    <Link
      href={href}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        scrollToGuidesSection();
      }}
    />
  );
}
