/* eslint-disable react/no-unescaped-entities */
"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { StateProvider } from "@/context/stateContext";
import { StateProviderV2, useMyStateV2 } from "@/context/stateContextV2";
import {
  clearLandingDemoActivateRequest,
  isLandingDemoActivateRequested,
  subscribeLandingDemoActivate,
  subscribeLandingDemoExit,
} from "@/lib/landingDemoSession";
import { cn } from "@/lib/utils";

import DashBody from "@/app/dashboard/dashBody";
import LiveStreamManager from "@/app/dashboard/components/liveStreamManager";
import RestLiveFeedManager from "@/app/dashboard/components/restLiveFeedManager";
import { DemoBackdrop } from "@/components/sections/demo-backdrop";
import { DemoWindowMockup } from "@/components/sections/demo-window-mockup";
import {
  DEMO_WINDOW_TITLE,
  DEMO_CONTENT_HEIGHT_CLASS,
  HOMEPAGE_DEMO_SECTION_CLASS,
} from "@/components/sections/dashboard-demo-layout";

/**
 * inline: card on the page. entering: fixed full-viewport, clipped back to the card's rect while the demo lays out.
 * full: clip opens to the whole viewport. exiting: fading out with content untouched.
 * returning: back in the card slot, invisible while the content swaps back, then fades in.
 */
type StagePhase = "inline" | "entering" | "full" | "exiting" | "returning";
type StageClip = { top: number; right: number; bottom: number; left: number };

const ENTER_MS = 650;
const ENTER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const EXIT_MS = 220;
const RETURN_MS = 240;
const CARD_RADIUS = 16;
const STAGE_SCALE = "scale(0.97)";
const FULL_CLIP = "inset(0px round 0px)";
const ESC_HINT_MS = 2800;

const OPEN_OVERLAY_SELECTOR = [
  '[role="dialog"]:not([data-state="closed"])',
  '[role="alertdialog"]:not([data-state="closed"])',
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

function isStaged(phase: StagePhase) {
  return phase === "entering" || phase === "full" || phase === "exiting";
}

function cardClip(el: HTMLElement): StageClip {
  const r = el.getBoundingClientRect();
  return {
    top: Math.max(0, r.top),
    right: Math.max(0, window.innerWidth - r.right),
    bottom: Math.max(0, window.innerHeight - r.bottom),
    left: Math.max(0, r.left),
  };
}

/** Layout never animates: the frame is laid out full-size up front and only clip-path, opacity and transform change. */
function stageStyle(phase: StagePhase, clip: StageClip | null): CSSProperties {
  if (phase === "returning") return { opacity: 0 };
  if (phase === "inline") return { opacity: 1, transition: `opacity ${RETURN_MS}ms ease-out` };
  const base: CSSProperties = {
    position: "fixed",
    zIndex: 100,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    margin: 0,
    borderRadius: 0,
    transform: "scale(1)",
  };
  if (phase === "entering") {
    const c = clip ?? { top: 0, right: 0, bottom: 0, left: 0 };
    return {
      ...base,
      clipPath: `inset(${c.top}px ${c.right}px ${c.bottom}px ${c.left}px round ${CARD_RADIUS}px)`,
    };
  }
  if (phase === "full") {
    return { ...base, clipPath: FULL_CLIP, transition: `clip-path ${ENTER_MS}ms ${ENTER_EASE}` };
  }
  return {
    ...base,
    clipPath: FULL_CLIP,
    opacity: 0,
    transform: STAGE_SCALE,
    transition: `opacity ${EXIT_MS}ms ease-in, transform ${EXIT_MS}ms ease-in`,
  };
}

/** Waits for the full-size layout to paint and the dashboard to settle before the clip starts opening. */
function useSettledFrame(run: boolean, callback: () => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  useEffect(() => {
    if (!run) return;
    let raf2 = 0;
    let idle = 0;
    let timer = 0;
    const done = () => callbackRef.current();
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(done, { timeout: 250 });
        else timer = window.setTimeout(done, 60);
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      if (idle && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      window.clearTimeout(timer);
    };
  }, [run]);
}

function useDoubleFrame(run: boolean, callback: () => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  useEffect(() => {
    if (!run) return;
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => callbackRef.current());
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [run]);
}

/** Active landing demo fills the browser viewport (not the Fullscreen API); Escape returns it to the page. */
function LandingDemoStage({
  children,
  sectionId,
  className,
  framed,
}: {
  children: ReactNode;
  sectionId: string;
  className: string;
  framed: boolean;
}) {
  const ctx = useMyStateV2();
  const active = !!ctx?.landingDemoActive;
  const deactivate = ctx?.deactivateLandingDemo;
  const activate = ctx?.activateLandingDemo;

  const slotRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<StagePhase>("inline");
  const [phase, setPhaseState] = useState<StagePhase>("inline");
  const [slotHeight, setSlotHeight] = useState<number | null>(null);
  const [clip, setClip] = useState<StageClip | null>(null);
  const [hintVisible, setHintVisible] = useState(false);

  const setPhase = useCallback((next: StagePhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  useEffect(() => {
    const current = phaseRef.current;
    if (active) {
      if (current === "entering" || current === "full") return;
      const slot = slotRef.current;
      if (slot && current !== "exiting") {
        setSlotHeight(slot.getBoundingClientRect().height);
        setClip(cardClip(slot));
      } else {
        setClip(null);
      }
      setPhase("entering");
      return;
    }
    if (isStaged(current)) {
      setSlotHeight(null);
      setPhase("returning");
    }
  }, [active, setPhase]);

  useSettledFrame(phase === "entering", () => setPhase("full"));
  useDoubleFrame(phase === "returning", () => setPhase("inline"));

  useEffect(() => {
    if (phase !== "exiting") return;
    const timer = window.setTimeout(() => {
      setSlotHeight(null);
      setPhase("returning");
      if (typeof deactivate === "function") deactivate();
    }, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [phase, deactivate, setPhase]);

  const beginExit = useCallback(() => {
    clearLandingDemoActivateRequest();
    const current = phaseRef.current;
    if (current === "entering" || current === "full") setPhase("exiting");
  }, [setPhase]);

  useEffect(() => subscribeLandingDemoExit(beginExit), [beginExit]);

  const staged = isStaged(phase);

  useEffect(() => {
    if (!staged) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, [staged]);

  // Hub and guide sections sit in low z-index layers; lift them to the stage's level so the
  // full-viewport demo isn't painted under the sticky site nav.
  useEffect(() => {
    if (!staged) return;
    const lifted: Array<[HTMLElement, string]> = [];
    let el = slotRef.current?.parentElement?.parentElement ?? null;
    while (el && el !== document.body) {
      if (getComputedStyle(el).zIndex !== "auto") {
        lifted.push([el, el.style.zIndex]);
        el.style.zIndex = "50";
      }
      el = el.parentElement;
    }
    return () => {
      for (const [node, value] of lifted) node.style.zIndex = value;
    };
  }, [staged]);

  useEffect(() => {
    if (phase !== "full") {
      setHintVisible(false);
      return;
    }
    const showTimer = window.setTimeout(() => setHintVisible(true), ENTER_MS);
    const hideTimer = window.setTimeout(() => setHintVisible(false), ENTER_MS + ESC_HINT_MS);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [phase]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector(OPEN_OVERLAY_SELECTOR)) return;
      event.preventDefault();
      beginExit();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, beginExit]);

  const activateOnClick = () => {
    if (active || phaseRef.current !== "inline") return;
    if (typeof activate === "function") activate();
  };

  const slot = (
    <div
      ref={slotRef}
      className="relative"
      style={slotHeight != null ? { height: slotHeight } : undefined}
      onClickCapture={framed ? undefined : activateOnClick}
    >
      <DemoWindowMockup
        id="demo-mockup"
        data-demo-mockup
        title={framed && !staged ? DEMO_WINDOW_TITLE : undefined}
        style={stageStyle(phase, clip)}
        className={cn(
          "[transform:translateZ(0)] will-change-[opacity,transform,clip-path]",
          staged && "border-transparent shadow-none ring-0",
        )}
        contentClassName={cn(
          "overflow-hidden",
          staged ? "h-full min-h-0" : DEMO_CONTENT_HEIGHT_CLASS,
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
      </DemoWindowMockup>
    </div>
  );

  return (
    <section id={sectionId} className={cn(className, staged ? "z-50" : "z-30")}>
      {framed ? (
        <DemoBackdrop className={cn(!staged && "cursor-pointer")} onClickCapture={activateOnClick}>
          {slot}
        </DemoBackdrop>
      ) : (
        slot
      )}
    </section>
  );
}

export type DashboardDemoSectionProps = {
  /** Picker id (e.g. `kalshiHistorical`, `polymarket`). Opens that source's build step instead of the picker. */
  integrationId?: string;
  sectionId?: string;
  className?: string;
  /** Sits the demo in a browser window on the painted homepage backdrop. */
  framed?: boolean;
};

/** The homepage demo. Guide and hub pages pass `integrationId` so the demo starts on their source. */
export function DashboardDemoSection({
  integrationId,
  sectionId = "demo",
  className = HOMEPAGE_DEMO_SECTION_CLASS,
  framed = false,
}: DashboardDemoSectionProps = {}) {
  return (
    <StateProvider>
      <StateProviderV2
        initialSettings={{
          demo: true,
          landingDemo: true,
          landingDemoIntegration: integrationId || null,
          viewing: "connectDataHome",
          rightPanelOpen: false,
          rightPanelTab: "integrations",
          integrationSidebar: null,
        }}
      >
        <LandingDemoStage sectionId={sectionId} className={className} framed={framed}>
          {/* Try For Free only targets the homepage demo. */}
          {integrationId ? null : <LandingDemoActivateListener />}
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
