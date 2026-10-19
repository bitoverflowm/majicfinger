"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import { WorkspaceCanvas, WorkspaceCanvasProvider, useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { SpectrumLoadingState } from "@/components/ui/spectrum-loading-state";
import { userSwrFetcher } from "@/lib/hooks";
import { userHasDashboardAccess } from "@/lib/membershipAccess";
import { pageIdForTab } from "@/lib/workspaceDashboardDocument";
import { cn } from "@/lib/utils";

const PILL =
  "bg-white text-neutral-800 shadow-[0_0_0.5px_rgba(0,0,0,0.18),0_1px_3px_rgba(0,0,0,0.1),0_5px_12px_rgba(0,0,0,0.13)] dark:bg-[#2c2c2c] dark:text-neutral-100 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_5px_12px_rgba(0,0,0,0.45)]";

function PreviewTabs({ tabs, activeId, onSelect }) {
  if (!tabs.length) return null;
  return (
    <div role="tablist" aria-label="Dashboard" className="relative z-30 flex shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto bg-background p-6">
      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(tab.id)}
            className={cn(
              "inline-flex h-7 items-center rounded-md border border-border px-2.5 text-xs font-medium shadow-sm",
              selected ? "bg-card text-foreground" : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.name}
          </button>
        );
      })}
    </div>
  );
}

function PreviewSurface({ tabId, onSelectTab }) {
  const canvas = useWorkspaceCanvas();
  const router = useRouter();
  const tabs = canvas?.previewTabs || [];

  useEffect(() => {
    if (tabId || !canvas?.previewActiveId) return;
    onSelectTab(canvas.previewActiveId);
  }, [canvas?.previewActiveId, onSelectTab, tabId]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      router.push("/dashboard");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  if (!canvas?.ready) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <SpectrumLoadingState label="Loading preview" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <div className={cn("fixed left-2 top-2 z-40 flex h-10 max-w-[min(280px,calc(100vw-12rem))] items-center gap-2 rounded-[13px] pl-1.5 pr-3", PILL)}>
        <span className="flex size-[22px] shrink-0 overflow-hidden rounded-full">
          <Image src="/logo.png" width={22} height={22} alt="Lychee" className="size-full object-cover" />
        </span>
        <span className="min-w-0 truncate text-[13px] font-medium tracking-[-0.01em]">{canvas.dashboardName || "Untitled"}</span>
      </div>
      <div className={cn("fixed right-2 top-2 z-40 flex h-10 items-center rounded-[13px] px-1.5", PILL)}>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="inline-flex h-7 items-center rounded-md px-2.5 text-[13px] font-medium text-neutral-700 hover:bg-black/[0.05] dark:text-neutral-200 dark:hover:bg-white/10"
        >
          Exit
        </button>
      </div>
      <div className="h-14 shrink-0" aria-hidden />
      <div className="relative min-h-0 flex-1">
        <WorkspaceCanvas />
        <PreviewTabs tabs={tabs} activeId={tabId} onSelect={onSelectTab} />
      </div>
    </div>
  );
}

function PreviewBody() {
  const [tabId, setTabId] = useState("");
  return (
    <WorkspaceCanvasProvider readOnly pageId={pageIdForTab(tabId || "welcome")}>
      <PreviewSurface tabId={tabId} onSelectTab={setTabId} />
    </WorkspaceCanvasProvider>
  );
}

export default function DashboardPreviewPage() {
  const router = useRouter();
  const { data: user, isLoading } = useSWR("/api/user", userSwrFetcher);

  const hasAccess = userHasDashboardAccess(user);

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/login");
    else if (!hasAccess) router.replace("/dashboard");
  }, [hasAccess, isLoading, router, user]);

  if (isLoading || !user || !hasAccess) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <SpectrumLoadingState label="Loading" />
      </div>
    );
  }

  return (
    <main className="min-h-svh bg-background">
      <PreviewBody />
    </main>
  );
}
