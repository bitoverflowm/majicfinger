"use client";

import dynamic from "next/dynamic";

import {
  DEMO_WINDOW_TITLE,
  DEMO_CONTENT_HEIGHT_CLASS,
  HOMEPAGE_DEMO_SECTION_CLASS,
} from "@/components/sections/dashboard-demo-layout";
import { DemoBackdrop } from "@/components/sections/demo-backdrop";
import { DemoLoadingCard } from "@/components/sections/demo-loading-card";
import { DemoWindowMockup } from "@/components/sections/demo-window-mockup";
import { retryImport } from "@/lib/retryImport";
import { cn } from "@/lib/utils";
import type { DashboardDemoSectionProps } from "./dashboard-demo-section";

/**
 * The demo runs the real dashboard, so it stays client-only behind a server-rendered placeholder.
 * The download starts when this module evaluates rather than when hydration first renders the
 * placeholder, which is seconds earlier on a cold load.
 */
if (typeof window !== "undefined") import("./dashboard-demo-section").catch(() => {});

const DashboardDemoSection = dynamic<DashboardDemoSectionProps>(
  () =>
    retryImport(() => import("./dashboard-demo-section")).then((m) => ({ default: m.DashboardDemoSection })),
  { ssr: false, loading: () => <DashboardDemoSkeleton /> },
);

const FramedDashboardDemoSection = dynamic<DashboardDemoSectionProps>(
  () =>
    retryImport(() => import("./dashboard-demo-section")).then((m) => ({ default: m.DashboardDemoSection })),
  { ssr: false, loading: () => <DashboardDemoSkeleton framed /> },
);

export function DashboardDemoSkeleton({
  sectionId = "demo",
  className = HOMEPAGE_DEMO_SECTION_CLASS,
  framed = false,
}: Pick<DashboardDemoSectionProps, "sectionId" | "className" | "framed">) {
  const mockup = (
    <DemoWindowMockup
      title={framed ? DEMO_WINDOW_TITLE : undefined}
      contentClassName={cn("overflow-hidden", DEMO_CONTENT_HEIGHT_CLASS)}
    >
      <DemoLoadingCard />
    </DemoWindowMockup>
  );
  return (
    <section id={sectionId} className={cn(className, "z-30")}>
      {framed ? <DemoBackdrop>{mockup}</DemoBackdrop> : mockup}
    </section>
  );
}

export function DashboardDemoSectionLazy(props: DashboardDemoSectionProps) {
  return props.framed ? <FramedDashboardDemoSection {...props} /> : <DashboardDemoSection {...props} />;
}
