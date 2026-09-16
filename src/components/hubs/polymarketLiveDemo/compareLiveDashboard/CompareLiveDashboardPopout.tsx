"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

import { AiPixelLoader } from "./AiGenerating";
import { useCompareLiveDashboard } from "./CompareLiveDashboardContext";
import { DashboardBoard } from "./DashboardBoard";
import { DashboardGate, DashboardSearch } from "./DashboardSearch";
import { INITIAL_LIVE_STATE, loadDashboardLive } from "./fetchDashboardLive";
import type { DashboardLiveState, DashboardPair } from "./types";

type Stage = "gate" | "search" | "boot" | "board";

export function CompareLiveDashboardPopout() {
  const { open, closeDashboard, landing } = useCompareLiveDashboard();
  const user = useUser();
  const username =
    String((user as { user_name?: string } | null)?.user_name || "")
      .trim()
      .replace(/^@/, "") || "you";

  const [stage, setStage] = useState<Stage>("search");
  const [pair, setPair] = useState<DashboardPair | null>(null);
  const [state, setState] = useState<DashboardLiveState>(INITIAL_LIVE_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPair(null);
    setState(INITIAL_LIVE_STATE);
    setStage(landing.pair ? "gate" : "search");
  }, [landing.pair]);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      return;
    }
    setState(INITIAL_LIVE_STATE);
    setPair(null);
    setStage(landing.pair ? "gate" : "search");
  }, [landing.pair, open]);

  const startBoard = useCallback((next: DashboardPair) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setPair(next);
    setState({
      ...INITIAL_LIVE_STATE,
      steps: INITIAL_LIVE_STATE.steps.map((step) => ({
        ...step,
        status: "queued",
        startedAt: null,
        endedAt: null,
        result: "",
      })),
    });
    setStage("boot");
    window.setTimeout(() => {
      if (ac.signal.aborted) return;
      setStage("board");
      void loadDashboardLive(next, ac.signal, setState);
    }, 1400);
  }, []);

  const onUpgrade = useCallback(() => {
    closeDashboard();
    window.setTimeout(() => scrollToHashSection("#compare-pricing"), 80);
  }, [closeDashboard]);

  const addressUrl = useMemo(() => {
    const slug =
      normalizeChartEmbedSlug(pair?.kalshiTitle || pair?.polyTitle || "") ||
      "kalshi-vs-polymarket";
    return `lycheedata.com/${username}/${slug}`;
  }, [pair?.kalshiTitle, pair?.polyTitle, username]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          closeDashboard();
          reset();
        }
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
          bodyClassName={cn(
            "flex min-h-0 flex-1 flex-col",
            stage === "gate" || stage === "boot" ? "overflow-hidden" : "overflow-y-auto",
          )}
        >
          {stage === "gate" && landing.pair ? (
            <DashboardGate
              pair={landing.pair}
              onKeep={() => startBoard(landing.pair!)}
              onNewSearch={() => setStage("search")}
            />
          ) : null}
          {stage === "search" ? <DashboardSearch onReady={startBoard} /> : null}
          {stage === "boot" ? (
            <AiPixelLoader className="h-full min-h-0 flex-1" label="Laying out the live workspace" />
          ) : null}
          {stage === "board" && pair ? (
            <DashboardBoard
              pair={pair}
              state={state}
              generating={state.steps.some((step) => step.status === "queued" || step.status === "running")}
              onUpgrade={onUpgrade}
            />
          ) : null}
        </SafariBrowserFrame>
      </DialogContent>
    </Dialog>
  );
}
