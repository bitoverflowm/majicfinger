"use client";

import { useCallback, useMemo } from "react";

import { SafariBrowserFrame } from "@/components/hubs/kalshiLiveDemo/SafariBrowserFrame";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { normalizeChartEmbedSlug } from "@/lib/chartEmbedSlug";
import { useUser } from "@/lib/hooks";
import { scrollToHashSection } from "@/lib/scrollToHashSection";
import { cn } from "@/lib/utils";

import { CompareLiveDashboardSession } from "./CompareLiveDashboardSession";
import { useCompareLiveDashboard } from "./CompareLiveDashboardContext";

export function CompareLiveDashboardPopout() {
  const { open, closeDashboard, landing } = useCompareLiveDashboard();
  const user = useUser();
  const username =
    String((user as { user_name?: string } | null)?.user_name || "")
      .trim()
      .replace(/^@/, "") || "you";

  const onUpgrade = useCallback(() => {
    closeDashboard();
    window.setTimeout(() => scrollToHashSection("#compare-pricing"), 80);
  }, [closeDashboard]);

  const addressUrl = useMemo(() => {
    const slug =
      normalizeChartEmbedSlug(landing.pair?.kalshiTitle || landing.pair?.polyTitle || "") ||
      "kalshi-vs-polymarket";
    return `lycheedata.com/${username}/${slug}`;
  }, [landing.pair?.kalshiTitle, landing.pair?.polyTitle, username]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeDashboard();
      }}
    >
      <DialogContent
        className={cn(
          "flex h-[94vh] min-h-[94vh] max-h-[94vh] w-[min(100vw-0.75rem,92rem)] max-w-none flex-col gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none sm:rounded-xl",
          "[&>button]:right-2 [&>button]:top-2 [&>button]:z-20 [&>button]:rounded-full [&>button]:bg-background/90 [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:shadow-sm",
        )}
        style={{ height: "94vh" }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Live Kalshi vs Polymarket dashboard</DialogTitle>
          <DialogDescription>
            Generate a live comparison dashboard from the markets you selected.
          </DialogDescription>
        </DialogHeader>
        <SafariBrowserFrame
          url={addressUrl}
          className="h-full min-h-0 flex-1"
          bodyClassName="flex min-h-0 flex-1 flex-col overflow-y-auto"
        >
          {open ? (
            <CompareLiveDashboardSession
              initialPair={landing.pair}
              handleUrl={addressUrl}
              onUpgrade={onUpgrade}
              className="min-h-0 flex-1 rounded-none border-0"
            />
          ) : null}
        </SafariBrowserFrame>
      </DialogContent>
    </Dialog>
  );
}
