/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { StateProvider } from "@/context/stateContext";
import { StateProviderV2, useMyStateV2 } from "@/context/stateContextV2";
import {
  clearLandingDemoActivateRequest,
  isLandingDemoActivateRequested,
  subscribeLandingDemoActivate,
} from "@/lib/landingDemoSession";
import { cn } from "@/lib/utils";

import DashBody from "@/app/dashboard/dashBody";
import LiveStreamManager from "@/app/dashboard/components/liveStreamManager";
import RestLiveFeedManager from "@/app/dashboard/components/restLiveFeedManager";
import { DemoWindowMockup } from "@/components/sections/demo-window-mockup";

type StagePhase = "inline" | "expanding" | "full" | "collapsing";
type StageRect = { top: number; left: number; width: number; height: number };

const STAGE_MS = 420;
const STAGE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const STAGE_TRANSITION = ["top", "left", "width", "height", "border-radius"]
  .map((prop) => `${prop} ${STAGE_MS}ms ${STAGE_EASE}`)
  .join(", ");
const ESC_HINT_MS = 2800;

const OPEN_OVERLAY_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
  '[role="listbox"][data-state="open"]',
  "[data-radix-popper-content-wrapper]",
].join(", ");

function LandingDemoActivateListener() {
  const activateLandingDemo = useMyStateV2()?.activateLandingDemo;
  useEffect(() => {
    const activate = () => {
      if (typeof activateLandingDemo === "function") activateLandingDemo();
    };
    if (isLandingDemoActivateRequested()) activate();
    return subscribeLandingDemoActivate(activate);
  }, [activateLandingDemo]);
  return null;
}

function toStageRect(el: HTMLElement): StageRect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function stageStyle(phase: StagePhase, rect: StageRect | null): CSSProperties | undefined {
  if (phase === "inline" || !rect) return undefined;
  const base: CSSProperties = { position: "fixed", zIndex: 100, margin: 0 };
  if (phase === "full") {
    return { ...base, top: 0, left: 0, width: "100%", height: "100%", borderRadius: 0, transition: STAGE_TRANSITION };
  }
  return {
    ...base,
    ...rect,
    transition: phase === "collapsing" ? STAGE_TRANSITION : undefined,
  };
}

/** Active landing demo fills the browser viewport (not the Fullscreen API); Escape returns it to the page. */
function LandingDemoStage({ children }: { children: ReactNode }) {
  const ctx = useMyStateV2();
  const active = !!ctx?.landingDemoActive;
  const deactivate = ctx?.deactivateLandingDemo;
  const activate = ctx?.activateLandingDemo;

  const slotRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<StagePhase>("inline");
  const [phase, setPhaseState] = useState<StagePhase>("inline");
  const [rect, setRect] = useState<StageRect | null>(null);
  const [slotHeight, setSlotHeight] = useState<number | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [resumePrompt, setResumePrompt] = useState(false);

  const setPhase = (next: StagePhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  };

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    if (active) {
      const r = toStageRect(slot);
      setSlotHeight(r.height);
      setRect(r);
      setPhase("expanding");
      let raf2 = 0;
      const raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => setPhase("full"));
      });
      return () => {
        window.cancelAnimationFrame(raf1);
        window.cancelAnimationFrame(raf2);
      };
    }

    if (phaseRef.current === "inline") return;
    setRect(toStageRect(slot));
    setPhase("collapsing");
    const timer = window.setTimeout(() => {
      setPhase("inline");
      setSlotHeight(null);
    }, STAGE_MS);
    return () => window.clearTimeout(timer);
  }, [active]);

  const staged = phase !== "inline";

  useEffect(() => {
    if (!staged) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, [staged]);

  useEffect(() => {
    if (phase !== "full") {
      setHintVisible(false);
      return;
    }
    setHintVisible(true);
    const timer = window.setTimeout(() => setHintVisible(false), ESC_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector(OPEN_OVERLAY_SELECTOR)) return;
      clearLandingDemoActivateRequest();
      setResumePrompt(true);
      if (typeof deactivate === "function") deactivate();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, deactivate]);

  useEffect(() => {
    if (active) setResumePrompt(false);
  }, [active]);

  const showResumePrompt = resumePrompt && !active && phase === "inline";
  const resumeDemo = () => {
    setResumePrompt(false);
    if (typeof activate === "function") activate();
  };

  return (
    <section
      id="demo"
      className={cn(
        "relative mx-auto mb-0 w-full max-w-[min(100%,84rem)] mt-14 px-6 pb-6 pt-0 sm:mt-12 sm:px-8 md:mt-8 lg:mt-6 lg:px-10",
        staged ? "z-[100]" : "z-30",
      )}
    >
      <div ref={slotRef} style={slotHeight != null ? { height: slotHeight } : undefined}>
        <DemoWindowMockup
          id="demo-mockup"
          data-demo-mockup
          style={stageStyle(phase, rect)}
          className={cn(phase === "full" && "border-transparent shadow-none ring-0")}
          contentClassName={cn(
            "overflow-hidden",
            staged ? "h-full min-h-0" : "h-[min(90vh,920px)] min-h-[720px]",
          )}
        >
          {children}
          <div
            aria-live="polite"
            className={cn(
              "pointer-events-none absolute left-1/2 top-3 z-[600] -translate-x-1/2 transition-all duration-300",
              hintVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
            )}
          >
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-900/85 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur">
              <span>Press</span>
              <kbd className="rounded border border-white/30 px-1.5 py-px font-sans text-[11px] leading-none">
                Esc
              </kbd>
              <span>to exit the demo</span>
            </div>
          </div>
          {resumePrompt ? (
            <button
              type="button"
              aria-label="Click anywhere in the window to activate your demo"
              aria-hidden={!showResumePrompt}
              tabIndex={showResumePrompt ? 0 : -1}
              onClick={resumeDemo}
              className={cn(
                "absolute inset-0 z-[650] flex cursor-pointer items-center justify-center bg-white/30 backdrop-blur-[1.5px] transition-opacity duration-300 dark:bg-black/30",
                showResumePrompt ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              <span className="rounded-full bg-zinc-900/85 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur">
                Click anywhere in the window to activate your demo
              </span>
            </button>
          ) : null}
        </DemoWindowMockup>
      </div>
    </section>
  );
}

export function DashboardDemoSection() {
  return (
    <StateProvider>
      <StateProviderV2
        initialSettings={{
          demo: true,
          landingDemo: true,
          viewing: "connectDataHome",
          rightPanelOpen: false,
          rightPanelTab: "integrations",
          integrationSidebar: null,
        }}
      >
        <LandingDemoStage>
          <LandingDemoActivateListener />
          <LiveStreamManager />
          <RestLiveFeedManager />
          <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
            <DashBody user={null} />
          </div>
        </LandingDemoStage>
      </StateProviderV2>
    </StateProvider>
  );
}
