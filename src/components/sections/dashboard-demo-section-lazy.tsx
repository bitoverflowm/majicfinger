"use client";

import dynamic from "next/dynamic";

import {
  DEMO_WINDOW_TITLE,
  DEMO_CONTENT_HEIGHT_CLASS,
  HOMEPAGE_DEMO_SECTION_CLASS,
} from "@/components/sections/dashboard-demo-layout";
import { CompactDemoFrame } from "@/components/sections/compact-demo-preview";
import { DemoBackdrop } from "@/components/sections/demo-backdrop";
import { DemoLoadingCard } from "@/components/sections/demo-loading-card";
import { DemoWindowMockup } from "@/components/sections/demo-window-mockup";
import { isCompactScreen, useCompactScreen } from "@/lib/desktopOnly";
import { retryImport } from "@/lib/retryImport";
import { cn } from "@/lib/utils";
import type { DashboardDemoSectionProps } from "./dashboard-demo-section";

/**
 * The demo runs the real dashboard, so it stays client-only behind a server-rendered placeholder.
 * The download starts when this module evaluates rather than when hydration first renders the
 * placeholder, which is seconds earlier on a cold load. Small screens never download it.
 */
if (typeof window !== "undefined" && !isCompactScreen()) import("./dashboard-demo-section").catch(() => {});

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

function SkeletonMockup({ framed }: { framed: boolean }) {
  return (
    <DemoWindowMockup
      title={framed ? DEMO_WINDOW_TITLE : undefined}
      contentClassName={cn("overflow-hidden", DEMO_CONTENT_HEIGHT_CLASS)}
    >
      <DemoLoadingCard />
    </DemoWindowMockup>
  );
}

export function DashboardDemoSkeleton({
  sectionId = "demo",
  className = HOMEPAGE_DEMO_SECTION_CLASS,
  framed = false,
}: Pick<DashboardDemoSectionProps, "sectionId" | "className" | "framed">) {
  return (
    <section id={sectionId} className={cn(className, "z-30")}>
      {framed ? (
        <DemoBackdrop>
          <SkeletonMockup framed />
        </DemoBackdrop>
      ) : (
        <SkeletonMockup framed={false} />
      )}
    </section>
  );
}

/**
 * Homepage demo. Phones and small tablets get the cropped preview instead of the live app; until the
 * screen size is known (server render, hydration) both are laid out and CSS shows the right one.
 */
function HomepageDemo(props: DashboardDemoSectionProps) {
  const compact = useCompactScreen();
  if (compact === false) return <FramedDashboardDemoSection {...props} />;
  return (
    <section id="demo" className={cn(HOMEPAGE_DEMO_SECTION_CLASS, "z-30")}>
      <div className={compact ? undefined : "lg:hidden"}>
        <CompactDemoFrame />
      </div>
      {compact === null ? (
        <div className="max-lg:hidden">
          <DemoBackdrop>
            <SkeletonMockup framed />
          </DemoBackdrop>
        </div>
      ) : null}
    </section>
  );
}

export function DashboardDemoSectionLazy(props: DashboardDemoSectionProps) {
  return props.framed ? <HomepageDemo {...props} /> : <DashboardDemoSection {...props} />;
}
