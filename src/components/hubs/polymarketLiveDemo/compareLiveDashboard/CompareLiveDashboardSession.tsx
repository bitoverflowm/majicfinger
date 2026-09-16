"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { AiPixelLoader } from "./AiGenerating";
import { DashboardBoard } from "./DashboardBoard";
import { DashboardGate, DashboardSearch } from "./DashboardSearch";
import { INITIAL_LIVE_STATE, loadDashboardLive } from "./fetchDashboardLive";
import type {
  CompareWorkspaceActions,
  DashboardLiveState,
  DashboardPair,
} from "./types";

type Stage = "gate" | "search" | "boot" | "board";

export type { CompareWorkspaceActions };

export function CompareLiveDashboardSession({
  initialPair = null,
  handleUrl,
  onUpgrade,
  onPairChange,
  workspace,
  readOnly = false,
  className,
}: {
  initialPair?: DashboardPair | null;
  handleUrl: string;
  onUpgrade: () => void;
  onPairChange?: (pair: DashboardPair | null) => void;
  workspace?: CompareWorkspaceActions;
  readOnly?: boolean;
  className?: string;
}) {
  const [stage, setStage] = useState<Stage>(initialPair ? "boot" : "search");
  const [pair, setPair] = useState<DashboardPair | null>(initialPair);
  const [state, setState] = useState<DashboardLiveState>(INITIAL_LIVE_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const startedTicker = useRef<string>("");

  const startBoard = useCallback(
    (next: DashboardPair) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setPair(next);
      onPairChange?.(next);
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
      }, 900);
    },
    [onPairChange],
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!initialPair?.kalshiTicker) return;
    const key = `${initialPair.kalshiTicker}:${initialPair.polyTitle}`;
    if (startedTicker.current === key) return;
    startedTicker.current = key;
    startBoard(initialPair);
  }, [initialPair, startBoard]);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-background",
        className,
      )}
    >
      {stage === "gate" && initialPair ? (
        <DashboardGate
          pair={initialPair}
          onKeep={() => startBoard(initialPair)}
          onNewSearch={() => setStage("search")}
        />
      ) : null}
      {stage === "search" ? <DashboardSearch onReady={startBoard} /> : null}
      {stage === "boot" ? (
        <AiPixelLoader className="h-full min-h-[28rem] flex-1" label="Laying out the live workspace" />
      ) : null}
      {stage === "board" && pair ? (
        <DashboardBoard
          pair={pair}
          state={state}
          generating={state.steps.some((step) => step.status === "queued" || step.status === "running")}
          onUpgrade={onUpgrade}
          handleUrl={handleUrl}
          workspace={workspace}
          readOnly={readOnly}
        />
      ) : null}
    </div>
  );
}
