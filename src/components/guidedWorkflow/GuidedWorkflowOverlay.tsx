"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

import { GuidedWorkflowTooltip } from "./GuidedWorkflowTooltip";
import { useGuidedWorkflowOptional } from "./GuidedWorkflowProvider";
import { useGuidedTargetRect } from "./useGuidedTargetRect";

const OVERLAY_Z = 9998;
const TOOLTIP_Z = 10000;

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

function DimPanels({ rect }: { rect: { top: number; left: number; width: number; height: number } }) {
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
    </>
  );
}

export function GuidedWorkflowOverlay() {
  const ctx = useGuidedWorkflowOptional();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isActive = ctx?.isActive ?? false;
  const currentStep = ctx?.currentStep ?? null;
  const targetId = currentStep?.target ?? null;

  const { rect, ready } = useGuidedTargetRect(targetId, {
    active: isActive,
    waitForTarget: currentStep?.waitForTarget,
  });

  const tooltipPos = useMemo(() => {
    if (!rect) return { top: 24, left: 24 };
    return computeTooltipPosition(rect, currentStep?.placement ?? "bottom");
  }, [rect, currentStep?.placement]);

  if (!mounted || !ctx || !isActive || !currentStep) return null;

  const { stepIndex, totalSteps, cancelWorkflow } = ctx;

  return createPortal(
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: OVERLAY_Z }}>
      {rect && ready ? (
        <DimPanels rect={rect} />
      ) : (
        <div className="pointer-events-auto absolute inset-0 bg-black/55" aria-hidden />
      )}

      <div
        className={cn("fixed", !ready && "opacity-80")}
        style={{
          zIndex: TOOLTIP_Z,
          top: tooltipPos.top,
          left: tooltipPos.left,
          pointerEvents: "auto",
        }}
      >
        <GuidedWorkflowTooltip
          step={currentStep}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          onExit={cancelWorkflow}
        />
      </div>
    </div>,
    document.body,
  );
}
