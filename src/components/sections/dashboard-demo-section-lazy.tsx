"use client";

import dynamic from "next/dynamic";

import {
  DEMO_CONTENT_HEIGHT_CLASS,
  HOMEPAGE_DEMO_SECTION_CLASS,
} from "@/components/sections/dashboard-demo-layout";
import { cn } from "@/lib/utils";
import type { DashboardDemoSectionProps } from "./dashboard-demo-section";

/**
 * Demo bundles the full dashboard app (AG Grid, chart libs, integrations) — heavy.
 * Crawlers and first-paint visitors don’t need this JS up front; we render a
 * placeholder server-side and lazy-load the real demo only on the client.
 */
const DashboardDemoSection = dynamic<DashboardDemoSectionProps>(
  () =>
    import("./dashboard-demo-section").then((m) => ({
      default: m.DashboardDemoSection,
    })),
  {
    ssr: false,
    loading: () => <DashboardDemoSkeleton />,
  },
);

export function DashboardDemoSkeleton({
  sectionId = "demo",
  className = HOMEPAGE_DEMO_SECTION_CLASS,
}: Pick<DashboardDemoSectionProps, "sectionId" | "className">) {
  return (
    <section id={sectionId} aria-hidden className={cn(className, "z-30")}>
      <div className="relative isolate size-full overflow-hidden rounded-2xl border border-border bg-background shadow-xl ring-1 ring-border/60">
        <div className={cn("flex w-full animate-pulse flex-col gap-4 p-6", DEMO_CONTENT_HEIGHT_CLASS)}>
          <div className="h-10 w-1/3 rounded-md bg-muted" />
          <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="rounded-lg bg-muted/70" />
            <div className="rounded-lg bg-muted/40" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function DashboardDemoSectionLazy(props: DashboardDemoSectionProps) {
  return <DashboardDemoSection {...props} />;
}
