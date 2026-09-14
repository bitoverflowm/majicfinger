"use client";

import dynamic from "next/dynamic";

const KalshiVsPolymarketDashboardMockup = dynamic(
  () =>
    import("./dashboard-mockup").then((m) => ({
      default: m.KalshiVsPolymarketDashboardMockup,
    })),
  {
    ssr: false,
    loading: () => <DashboardMockupSkeleton />,
  },
);

function DashboardMockupSkeleton() {
  return (
    <section
      id="demo"
      aria-hidden
      className="relative z-30 mx-auto mb-0 mt-14 w-full max-w-[min(100%,84rem)] scroll-mt-28 px-6 pb-6 pt-0 sm:mt-12 sm:px-8 md:mt-8 lg:mt-6 lg:px-10"
    >
      <div className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-[#E5E5E5] shadow-2xl dark:bg-[#404040]">
        <div className="relative flex h-[52px] shrink-0 items-center bg-white px-4 dark:bg-[#262626]">
          <div className="absolute left-4 flex items-center gap-2">
            <span className="size-3 rounded-full bg-[#E5E5E5] dark:bg-[#404040]" />
            <span className="size-3 rounded-full bg-[#E5E5E5] dark:bg-[#404040]" />
            <span className="size-3 rounded-full bg-[#E5E5E5] dark:bg-[#404040]" />
          </div>
          <div className="mx-auto h-7 w-full max-w-[min(100%,42rem)] rounded-md bg-[#F5F5F5] dark:bg-[#171717]" />
        </div>
        <div className="h-[min(90vh,920px)] min-h-[32rem] animate-pulse bg-background p-6">
          <div className="mb-5 h-8 w-2/3 rounded-md bg-muted" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-64 rounded-lg bg-muted/50" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function KalshiVsPolymarketDashboardMockupLazy() {
  return <KalshiVsPolymarketDashboardMockup />;
}
