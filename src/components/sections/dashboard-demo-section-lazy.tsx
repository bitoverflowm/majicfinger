"use client";

import dynamic from "next/dynamic";

import {
  DEMO_BROWSER_URL,
  DEMO_CONTENT_HEIGHT_CLASS,
  HOMEPAGE_DEMO_SECTION_CLASS,
} from "@/components/sections/dashboard-demo-layout";
import { DemoBackdrop } from "@/components/sections/demo-backdrop";
import { DemoLoadingCard } from "@/components/sections/demo-loading-card";
import { DemoWindowMockup } from "@/components/sections/demo-window-mockup";
import { cn } from "@/lib/utils";
import type { DashboardDemoSectionProps } from "./dashboard-demo-section";

/**
 * The demo runs the real dashboard, so it stays client-only behind a server-rendered placeholder.
 * The download starts when this module evaluates rather than when hydration first renders the
 * placeholder, which is seconds earlier on a cold load.
 */
if (typeof window !== "undefined") void import("./dashboard-demo-section");

const DashboardDemoSection = dynamic<DashboardDemoSectionProps>(
  () => import("./dashboard-demo-section").then((m) => ({ default: m.DashboardDemoSection })),
  { ssr: false, loading: () => <DashboardDemoSkeleton /> },
);

const FramedDashboardDemoSection = dynamic<DashboardDemoSectionProps>(
  () => import("./dashboard-demo-section").then((m) => ({ default: m.DashboardDemoSection })),
  { ssr: false, loading: () => <DashboardDemoSkeleton framed /> },
);

export function DashboardDemoSkeleton({
  sectionId = "demo",
  className = HOMEPAGE_DEMO_SECTION_CLASS,
  framed = false,
}: Pick<DashboardDemoSectionProps, "sectionId" | "className" | "framed">) {
  const mockup = (
    <DemoWindowMockup
      browserUrl={framed ? DEMO_BROWSER_URL : undefined}
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
