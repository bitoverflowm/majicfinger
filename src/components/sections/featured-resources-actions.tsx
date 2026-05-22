"use client";

import { DemoScrollLink } from "@/components/sections/demo-scroll-link";
import { GuidesScrollLink } from "@/components/sections/guides-scroll-link";

export function FeaturedResourcesActions() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
      <GuidesScrollLink
        href="#guides"
        prefetch={false}
        className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        More
      </GuidesScrollLink>
      <DemoScrollLink
        href="#demo"
        prefetch={false}
        className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
      >
        Try demo
      </DemoScrollLink>
    </div>
  );
}
