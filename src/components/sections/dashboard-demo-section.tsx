/* eslint-disable react/no-unescaped-entities */
"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { StateProvider } from "@/context/stateContext";
import { StateProviderV2, useMyStateV2 } from "@/context/stateContextV2";
import {
  clearLandingDemoActivateRequest,
  hasQueuedLandingDemoRequest,
  isLandingDemoActivateRequested,
  landingDemoHandsOffToDashboard,
  leaveDemoForMemberDashboard,
  setLandingDemoMemberAccess,
  subscribeLandingDemoActivate,
  subscribeLandingDemoExit,
  takeLandingDemoReturnPosition,
} from "@/lib/landingDemoSession";
import { useUser } from "@/lib/hooks";
import { userHasDashboardAccess } from "@/lib/membershipAccess";
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
 * inline: card on the page. entering: fixed full-viewport, shrunk onto the card while the demo lays out.
 * full: grows from the card to the whole viewport. exiting: fading out with content untouched.
 * returning: back in the card slot, invisible while the content swaps back, then fades in.
 */
type StagePhase = "inline" | "entering" | "full" | "exiting" | "returning";
/** Transform that maps the full-viewport stage onto the card it grows out of. */
type StageOrigin = { x: number; y: number; scale: number };

const ENTER_MS = 380;
const ENTER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const EXIT_MS = 220;
const RETURN_MS = 240;
const CARD_RADIUS = 16;
const STAGE_SCALE = "scale(0.97)";
const ESC_HINT_MS = 2800;

const OPEN_OVERLAY_SELECTOR = [
  '[role="dialog"]:not([data-state="closed"])',
  '[role="alertdialog"]:not([data-state="closed"])',
  '[role="menu"][data-state="open"]',
  '[role="listbox"][data-state="open"]',
  "[data-radix-popper-content-wrapper]",
].join(", ");

/** Signed-in members with dashboard access open their own dashboard instead of the demo. */
function LandingDemoMemberHandoff() {
  const user = useUser();
  const hasAccess = userHasDashboardAccess(user);
  useEffect(() => {
    setLandingDemoMemberAccess(hasAccess);
    // A deep link (or a click before sign-in loaded) already asked for the demo.
    if (hasAccess && hasQueuedLandingDemoRequest()) leaveDemoForMemberDashboard();
    return () => setLandingDemoMemberAccess(false);
  }, [hasAccess]);
  return null;
}

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

function cardOrigin(el: HTMLElement): StageOrigin {
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    x: r.left + r.width / 2 - vw / 2,
    y: r.top + r.height / 2 - vh / 2,
    scale: Math.min(1, Math.max(0.5, r.width / vw)),
  };
}

/**
 * Layout never animates: the frame is laid out full-size up front and only opacity and transform
 * change, so the compositor keeps the motion smooth while the dashboard mounts underneath.
 */
function stageStyle(phase: StagePhase, origin: StageOrigin | null): CSSProperties {
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
    const o = origin ?? { x: 0, y: 0, scale: 1 };
    return {
      ...base,
      borderRadius: CARD_RADIUS,
      transform: `translate3d(${o.x}px, ${o.y}px, 0) scale(${o.scale})`,
    };
  }
  if (phase === "full") {
    return {
      ...base,
      transform: "translate3d(0, 0, 0) scale(1)",
      transition: `transform ${ENTER_MS}ms ${ENTER_EASE}`,
    };
  }
  return {
    ...base,
    opacity: 0,
    transform: STAGE_SCALE,
    transition: `opacity ${EXIT_MS}ms ease-in, transform ${EXIT_MS}ms ease-in`,
  };
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
  const [origin, setOrigin] = useState<StageOrigin | null>(null);
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
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        setOrigin(reduceMotion ? null : cardOrigin(slot));
      } else {
        setOrigin(null);
      }
      setPhase("entering");
      return;
    }
    if (isStaged(current)) {
      setSlotHeight(null);
      setPhase("returning");
    }
  }, [active, setPhase]);

  useDoubleFrame(phase === "entering", () => setPhase("full"));
  useDoubleFrame(phase === "returning", () => {
    setPhase("inline");
    const returnY = takeLandingDemoReturnPosition();
    if (returnY != null) window.scrollTo({ top: returnY, behavior: "instant" });
  });

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
  // full-viewport demo isn't painted under the sticky site nav or the promo strip.
  useEffect(() => {
    if (!staged) return;
    const lifted: Array<[HTMLElement, string]> = [];
    let el = slotRef.current?.parentElement?.parentElement ?? null;
    while (el && el !== document.body) {
      if (getComputedStyle(el).zIndex !== "auto") {
        lifted.push([el, el.style.zIndex]);
        el.style.zIndex = "100";
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
    if (typeof activate !== "function") return;
    // Members: let a click on a source or recipe hand off with that intent first.
    if (landingDemoHandsOffToDashboard()) window.setTimeout(() => activate(), 0);
    else activate();
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
        style={stageStyle(phase, origin)}
        className={cn(
          "[transform:translateZ(0)] will-change-[opacity,transform]",
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
          <LandingDemoMemberHandoff />
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
