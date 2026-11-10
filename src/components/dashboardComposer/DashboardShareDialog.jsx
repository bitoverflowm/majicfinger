"use client";

import { useMemo, useRef, useState } from "react";
import { Globe, Share2 } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { useWorkspaceProject } from "@/components/projects/workspaceProjectContext";
import { PublishPanel } from "@/components/publish/PublishPanel";
import { SharePanel } from "@/components/share/SharePanel";
import { buildShareLibrary } from "@/components/share/shareLibrary";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useUser } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const SITE_URL = "https://lycheedata.com";

const TABS = [
  { id: "publish", label: "Publish", icon: Globe, blurb: "Put this dashboard on its own page under your handle." },
  { id: "share", label: "Share", icon: Share2, blurb: "Turn any panel, chart or sheet into an image, GIF or video." },
];

function panelFallback(what) {
  return function PanelFallback({ retry }) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-[14px] font-medium text-foreground">{what} hit an error on this dashboard.</p>
        <p className="max-w-sm text-[12.5px] text-muted-foreground">Your dashboard is fine. Try again, or close this and reopen it.</p>
        <button type="button" onClick={retry} className="h-8 rounded-md border border-border px-3 text-[12.5px] font-medium hover:bg-muted">
          Try again
        </button>
      </div>
    );
  };
}

export function DashboardShareDialog({ open, onOpenChange }) {
  const canvas = useWorkspaceCanvas();
  const ctx = useMyStateV2();
  const project = useWorkspaceProject();
  const user = useUser();
  const [tab, setTab] = useState("publish");
  const [visited, setVisited] = useState({ publish: true });
  const [publication, setPublication] = useState(null);
  const lastPieces = useRef(new Map());

  const tabs = ctx?.workspaceStartTabs;
  const blocksByPage = canvas?.blocksByPage;
  const groups = useMemo(() => {
    if (!open) return [];
    let built = [];
    try {
      built = buildShareLibrary({ tabs, blocksByPage, previous: lastPieces.current });
    } catch (error) {
      console.error("[DashboardShareDialog] couldn't list share pieces", error);
    }
    lastPieces.current = new Map(built.flatMap((group) => group.pieces.map((piece) => [piece.id, piece])));
    return built;
  }, [open, tabs, blocksByPage]);
  const handle = String(user?.user_name || "");
  const shareUrl = publication?.published && publication.path ? `${SITE_URL}${publication.path}` : SITE_URL;
  const dashboardName = canvas?.dashboardName || "Untitled";

  const choose = (id) => {
    setTab(id);
    setVisited((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[560]"
        className="z-[560] flex h-[92vh] w-[min(100%,84rem)] max-w-[84rem] flex-col gap-4 overflow-hidden sm:rounded-2xl"
      >
        <DialogHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-4 pr-8">
            <DialogTitle className="text-[17px]">{dashboardName}</DialogTitle>
            <div role="tablist" aria-label="Publish or share" className="inline-flex rounded-lg bg-muted p-0.5">
              {TABS.map((item) => {
                const Icon = item.icon;
                const on = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => choose(item.id)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors",
                      on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {item.label}
                  </button>
                );
              })}
            </div>
            {publication?.published ? (
              <a href={publication.path} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
                Live at lycheedata.com{publication.path}
              </a>
            ) : null}
          </div>
          <DialogDescription className="text-[12.5px]">{TABS.find((item) => item.id === tab)?.blurb}</DialogDescription>
        </DialogHeader>

        {visited.publish ? (
          <div role="tabpanel" className={cn("min-h-0 flex-1 flex-col", tab === "publish" ? "flex" : "hidden")}>
            <ErrorBoundary name="PublishPanel" fallback={panelFallback("Publishing")}>
              <PublishPanel
                projectId={project?.id}
                user={user}
                tabs={tabs}
                filledTabIds={groups.map((group) => group.tab.id)}
                dashboardName={dashboardName}
                onPublication={setPublication}
              />
            </ErrorBoundary>
          </div>
        ) : null}
        {visited.share ? (
          <div role="tabpanel" className={cn("min-h-0 flex-1 flex-col", tab === "share" ? "flex" : "hidden")}>
            <ErrorBoundary name="SharePanel" fallback={panelFallback("Sharing")}>
              <SharePanel groups={groups} activeTabId={ctx?.activeWorkspaceStartTabId} handle={handle} shareUrl={shareUrl} defaultHeadline={dashboardName} />
            </ErrorBoundary>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
