"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { FeatureTip, useFeatureTipDismissal } from "@/components/ui/feature-tip";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useIntegrationConnect } from "@/components/dashboardComposer/integrationConnectDialog";
import { exitLandingDemoToSection } from "@/lib/landingDemoSession";
import { terminalTabField } from "@/lib/workspaceTerminals";

export const DEMO_SAVE_TIP_ID = "demo-save-make-it-yours";

/** How long after a visitor starts scrolling a search result before the tip asks them to save it. */
const SCROLL_MS = 4000;

/** A terminal tab looking at a market or trader is on screen, i.e. a search has opened its result. */
function useSearchResultShown() {
  const ctx = useMyStateV2();
  const connect = useIntegrationConnect();
  if (!ctx?.landingDemoActive || connect?.inlineOpen) return false;
  const active = (ctx.workspaceStartTabs || []).find((tab) => tab.id === ctx.activeWorkspaceStartTabId);
  return !!terminalTabField(active).terminalSubject;
}

/**
 * The landing demo's way out: everything runs, but nothing stays. Once a visitor has scrolled a
 * search result for a few seconds, this points at Save and offers the upgrade. `forced` shows it
 * right away (they clicked Save); `onClose` is called whenever it closes.
 */
export function DemoSaveTip({ forced = false, onClose, children }) {
  const resultShown = useSearchResultShown();
  const { reset } = useFeatureTipDismissal(DEMO_SAVE_TIP_ID);
  const [due, setDue] = useState(false);

  useEffect(() => {
    if (!resultShown || due) return undefined;
    let timer = 0;
    const onScroll = (event) => {
      const host = document.getElementById("demo-mockup");
      if (host && !(event.target instanceof Node && host.contains(event.target))) return;
      if (!timer) timer = window.setTimeout(() => setDue(true), SCROLL_MS);
    };
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      window.clearTimeout(timer);
    };
  }, [resultShown, due]);

  useEffect(() => {
    if (forced) reset();
  }, [forced, reset]);

  return (
    <FeatureTip
      id={DEMO_SAVE_TIP_ID}
      open={forced || (due && resultShown)}
      onDismiss={onClose}
      side="bottom"
      align="end"
      alignOffset={-6}
      closeOnAction
      className="w-[300px]"
      title="Save this and make it your own"
      description={[
        "Right now this research disappears when you leave.",
        "Upgrade to save your dashboards, customize them, and share or publish what you find. Your work stays live, right where you left it.",
      ]}
      secondaryAction={{ label: "Not now", onClick: () => onClose?.() }}
      action={{
        label: "Upgrade to save",
        icon: ArrowRight,
        onClick: () => {
          onClose?.();
          exitLandingDemoToSection("pricing");
        },
      }}
    >
      {children}
    </FeatureTip>
  );
}
