"use client";

import Link from "next/link";
import { scrollToDemoSection } from "@/lib/scrollToDemo";
import type { ComponentProps } from "react";

type DemoScrollLinkProps = ComponentProps<typeof Link>;

export function DemoScrollLink({ href = "#demo", onClick, ...props }: DemoScrollLinkProps) {
  return (
    <Link
      href={href}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        scrollToDemoSection();
      }}
    />
  );
}
