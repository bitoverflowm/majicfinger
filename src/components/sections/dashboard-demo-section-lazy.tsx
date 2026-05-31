"use client";

import dynamic from "next/dynamic";

/**
 * Demo bundles the full dashboard app (AG Grid, chart libs, integrations) — heavy.
 * Crawlers and first-paint visitors don’t need this JS up front; we render a
 * placeholder server-side and lazy-load the real demo only on the client.
 */
const DashboardDemoSection = dynamic(
  () =>
    import("./dashboard-demo-section").then((m) => ({
      default: m.DashboardDemoSection,
    })),
  {
    ssr: false,
    loading: () => <DashboardDemoSkeleton />,
  },
);

function DashboardDemoSkeleton() {
  return (
    <section
      id="demo"
      aria-hidden
      className="relative z-30 mx-auto mb-0 w-full max-w-[min(100%,84rem)] mt-4 px-6 pb-6 pt-0 sm:mt-6 sm:px-8 md:mt-8 lg:px-10"
    >
      <div className="relative isolate size-full overflow-hidden rounded-2xl border border-border bg-background shadow-xl ring-1 ring-border/60">
        <div className="flex h-[min(90vh,920px)] min-h-[720px] w-full animate-pulse flex-col gap-4 p-6">
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

export function DashboardDemoSectionLazy() {
  return <DashboardDemoSection />;
}
