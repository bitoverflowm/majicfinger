"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { StateProvider } from "@/context/stateContext";
import { StateProviderV2 } from "@/context/stateContextV2";
import DashBody from "@/app/dashboard/dashBody";
import LiveStreamManager from "@/app/dashboard/components/liveStreamManager";
import RestLiveFeedManager from "@/app/dashboard/components/restLiveFeedManager";
import { TradeHistoryGateContext } from "@/components/terminals/holder/useFusedMarketTrades";
import { terminalTab } from "@/components/terminals/openTerminalTab";
import { subscribeLandingDemoExit } from "@/lib/landingDemoSession";
import { findTerminal } from "@/lib/workspaceTerminals";

const OPEN_OVERLAY_SELECTOR = [
  '[role="dialog"]:not([data-state="closed"])',
  '[role="alertdialog"]:not([data-state="closed"])',
  '[role="menu"][data-state="open"]',
  '[role="listbox"][data-state="open"]',
  "[data-radix-popper-content-wrapper]",
].join(", ");

/**
 * "Try it now": the real dashboard over the whole page, already on a Holder Terminal tab for `subject`.
 * Nothing is saved and no sign-up is needed. Escape, or leaving for pricing, closes it.
 */
export default function HolderTryDemo({ subject, onClose }) {
  const [tab] = useState(() => terminalTab(findTerminal("holder"), subject, []));
  const [hint, setHint] = useState(false);
  const rootRef = useRef(null);
  // Opens on a light start (the newest trades); the full trade history loads once the visitor clicks or types.
  const [gate, setGate] = useState({ open: false });
  const openGate = (event) => {
    if (gate.open || event.key === "Escape") return;
    setGate({ open: true });
  };

  useEffect(() => subscribeLandingDemoExit(onClose), [onClose]);

  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if ([...document.querySelectorAll(OPEN_OVERLAY_SELECTOR)].some((el) => el !== rootRef.current)) return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const show = window.setTimeout(() => setHint(true), 600);
    const hide = window.setTimeout(() => setHint(false), 3400);
    return () => {
      root.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Holder Terminal demo"
      className="fixed inset-0 z-[200] flex flex-col bg-[#f5f5f5] duration-300 animate-in fade-in-0 zoom-in-[0.98] dark:bg-[#1e1e1e]"
      onPointerDownCapture={openGate}
      onKeyDownCapture={openGate}
    >
      <TradeHistoryGateContext.Provider value={gate}>
        <StateProvider>
          <StateProviderV2
            initialSettings={{
              demo: true,
              landingDemo: true,
              landingDemoActive: true,
              viewing: "welcome",
              workspaceStartTabs: [tab],
              activeWorkspaceStartTabId: tab.id,
              rightPanelOpen: false,
              rightPanelTab: "integrations",
              integrationSidebar: null,
            }}
          >
            <LiveStreamManager />
            <RestLiveFeedManager />
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
              <DashBody user={null} />
            </div>
          </StateProviderV2>
        </StateProvider>
      </TradeHistoryGateContext.Provider>
      <button
        type="button"
        onClick={onClose}
        className="absolute left-1/2 top-3 z-[600] flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-background/95 px-3 text-[12.5px] font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted"
      >
        <X className="size-3.5" aria-hidden />
        Exit demo
      </button>
      <div
        aria-live="polite"
        className={`pointer-events-none absolute left-1/2 top-14 z-[600] -translate-x-1/2 transition-all duration-300 ${hint ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}
      >
        <div className="flex items-center gap-1.5 rounded-full bg-zinc-900/85 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur">
          <span>Press</span>
          <kbd className="rounded border border-white/30 px-1.5 py-px font-sans text-[11px] leading-none">Esc</kbd>
          <span>to exit the demo</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
