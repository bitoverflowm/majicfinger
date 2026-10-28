"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

const NAV_OFFSET = 96;

type SectionScrollLinkProps = ComponentProps<typeof Link> & { sectionId: string };

/** Smooth-scrolls to a section on the current page, or follows `href` when the section isn't here. */
export function SectionScrollLink({ sectionId, onClick, ...props }: SectionScrollLinkProps) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        const section = document.getElementById(sectionId);
        if (!section) return;
        e.preventDefault();
        const top = window.scrollY + section.getBoundingClientRect().top - NAV_OFFSET;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        history.replaceState(null, "", `${window.location.pathname}#${sectionId}`);
      }}
    />
  );
}
