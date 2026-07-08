"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { KALSHI_GUIDED_TARGETS } from "@/lib/guidedWorkflows/targets";
import { GUIDED_TARGET_ATTR } from "@/lib/guidedWorkflows/types";
import { cn } from "@/lib/utils";

import { GuidedWorkflowExitHint } from "./GuidedWorkflowExitHint";
import { GuidedWorkflowInfoDialog } from "./GuidedWorkflowInfoDialog";
import { GuidedWorkflowIntro } from "./GuidedWorkflowIntro";
import { GuidedWorkflowTooltip } from "./GuidedWorkflowTooltip";
import { useGuidedWorkflowOptional } from "./GuidedWorkflowProvider";
import { useGuidedTargetRect } from "./useGuidedTargetRect";
import { isInfoStep } from "@/lib/guidedWorkflows/types";

const OVERLAY_Z = 9998;
const CHROME_Z = 10000;
const HINT_Z = 10001;

function computeTooltipPosition(
  spotlight: { top: number; left: number; width: number; height: number },
  placement: string,
) {
  const gap = 12;
  const tooltipW = 352;
  const tooltipH = 160;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  let top = spotlight.top + spotlight.height + gap;
  let left = spotlight.left + spotlight.width / 2 - tooltipW / 2;

  if (placement === "top") {
    top = spotlight.top - tooltipH - gap;
  } else if (placement === "left") {
    top = spotlight.top + spotlight.height / 2 - tooltipH / 2;
    left = spotlight.left - tooltipW - gap;
  } else if (placement === "right") {
    top = spotlight.top + spotlight.height / 2 - tooltipH / 2;
    left = spotlight.left + spotlight.width + gap;
  }

  left = Math.max(12, Math.min(left, vw - tooltipW - 12));
  top = Math.max(12, Math.min(top, vh - tooltipH - 12));

  return { top, left };
}

function DimPanels({
  rect,
  blockInteraction = false,
}: {
  rect: { top: number; left: number; width: number; height: number };
  blockInteraction?: boolean;
}) {
  const panels = [
    { top: 0, left: 0, right: 0, height: rect.top },
    { top: rect.top + rect.height, left: 0, right: 0, bottom: 0 },
    { top: rect.top, left: 0, width: rect.left, height: rect.height },
    { top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height },
  ];

  return (
    <>
      {panels.map((style, i) => (
        <div
          key={i}
          className="absolute bg-black/55"
          style={{ ...style, pointerEvents: "auto" }}
          aria-hidden
        />
      ))}
      <div
        className="pointer-events-none absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          zIndex: OVERLAY_Z + 1,
        }}
      />
      {blockInteraction ? (
        <div
          className="absolute rounded-lg bg-transparent"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            pointerEvents: "auto",
            zIndex: OVERLAY_Z + 2,
          }}
          aria-hidden
        />
      ) : null}
    </>
  );
}

function GuidedWorkflowExitButton({ onExit, buttonRef }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onExit}
      className={cn(
        "pointer-events-auto fixed right-4 top-4 z-[10000] flex size-10 items-center justify-center rounded-full",
        "border border-border/80 bg-background/95 text-foreground shadow-lg",
        "transition-colors hover:bg-muted",
        "ring-2 ring-primary/40 ring-offset-2 ring-offset-transparent",
      )}
      {...{ [GUIDED_TARGET_ATTR]: KALSHI_GUIDED_TARGETS.guideExit }}
      aria-label="Exit guide"
    >
      <X className="size-5" strokeWidth={2} />
    </button>
  );
}

export function GuidedWorkflowOverlay() {
  const ctx = useGuidedWorkflowOptional();
  const [mounted, setMounted] = useState(false);
  const exitButtonRef = useRef<HTMLButtonElement | null>(null);
  const [exitButtonRect, setExitButtonRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => setMounted(true), []);

  const phase = ctx?.phase ?? "idle";
  const isGuideOpen = ctx?.isGuideOpen ?? false;
  const currentStep = ctx?.currentStep ?? null;
  const targetId = phase === "active" ? currentStep?.target ?? null : null;

  const { rect, ready } = useGuidedTargetRect(targetId, {
    active: phase === "active",
    waitForTarget: currentStep?.waitForTarget,
  });

  const exitHintTargetRect = useGuidedTargetRect(KALSHI_GUIDED_TARGETS.guideExit, {
    active: phase === "exit-hint",
    waitForTarget: true,
  });

  useEffect(() => {
    if (phase !== "exit-hint" && phase !== "active") {
      setExitButtonRect(null);
      return;
    }
    const measure = () => {
      const el = exitButtonRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setExitButtonRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [phase, exitHintTargetRect.rect]);

  const tooltipPos = useMemo(() => {
    if (!rect) return { top: 24, left: 24 };
    return computeTooltipPosition(rect, currentStep?.placement ?? "bottom");
  }, [rect, currentStep?.placement]);

  if (!mounted || !ctx || !isGuideOpen || !ctx.workflow) return null;

  const {
    workflow,
    stepIndex,
    totalSteps,
    cancelWorkflow,
    beginGuide,
    dismissExitHint,
    continueStep,
  } = ctx;

  const infoStep = currentStep && isInfoStep(currentStep);
  const showExitButton = phase === "exit-hint" || phase === "active";
  const spotlightRect =
    phase === "exit-hint" && exitHintTargetRect.rect ? exitHintTargetRect.rect : rect;
  const spotlightReady =
    phase === "exit-hint" ? exitHintTargetRect.ready : ready;

  return createPortal(
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: OVERLAY_Z }}>
      {phase === "intro" ? (
        <div className="pointer-events-auto absolute inset-0 bg-black/60" aria-hidden />
      ) : null}

      {phase === "exit-hint" || phase === "active" ? (
        <>
          {spotlightRect && spotlightReady ? (
            <DimPanels
              rect={spotlightRect}
              blockInteraction={phase === "active" && !!infoStep}
            />
          ) : (
            <div className="pointer-events-auto absolute inset-0 bg-black/55" aria-hidden />
          )}
        </>
      ) : null}

      {phase === "intro" ? (
        <div
          className="pointer-events-none fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: CHROME_Z }}
        >
          <GuidedWorkflowIntro
            title={workflow.title}
            onBegin={beginGuide}
            onCancel={cancelWorkflow}
          />
        </div>
      ) : null}

      {showExitButton ? (
        <GuidedWorkflowExitButton onExit={cancelWorkflow} buttonRef={exitButtonRef} />
      ) : null}

      {phase === "exit-hint" ? (
        <GuidedWorkflowExitHint
          exitButtonRect={exitButtonRect || exitHintTargetRect.rect}
          onDismiss={dismissExitHint}
        />
      ) : null}

      {phase === "active" && currentStep ? (
        <div
          className={cn("fixed", !ready && "opacity-80")}
          style={{
            zIndex: HINT_Z,
            top: tooltipPos.top,
            left: tooltipPos.left,
            pointerEvents: "auto",
          }}
        >
          {infoStep ? (
            <GuidedWorkflowInfoDialog
              step={currentStep}
              stepIndex={stepIndex}
              totalSteps={totalSteps}
              onContinue={continueStep}
            />
          ) : (
            <GuidedWorkflowTooltip
              step={currentStep}
              stepIndex={stepIndex}
              totalSteps={totalSteps}
              onExit={cancelWorkflow}
              showExitActions={false}
            />
          )}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
