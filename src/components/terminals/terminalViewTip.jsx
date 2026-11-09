"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FeatureTip } from "@/components/ui/feature-tip";

/**
 * The "your previous view is here" tip, shared across tabs: Explore can send the user to a
 * different tab than the one they clicked it in. `{ hostId, tabId, kind, moved }`.
 */
let viewTip = null;
const viewTipListeners = new Set();

export function setViewTip(next) {
  viewTip = next;
  viewTipListeners.forEach((listener) => listener());
}

export function currentViewTip() {
  return viewTip;
}

function subscribeViewTip(listener) {
  viewTipListeners.add(listener);
  return () => viewTipListeners.delete(listener);
}

export function useViewTip() {
  return useSyncExternalStore(subscribeViewTip, () => viewTip, () => null);
}

/** Points at the tab showing the previous view. The tab bar renders a new tab a frame or two later. */
export function MovedViewTip({ tabId, kind, moved, onOpen, onClose, onSpent }) {
  const anchorRef = useRef(null);
  const [ready, setReady] = useState(false);
  const onSpentRef = useRef(onSpent);
  onSpentRef.current = onSpent;

  // Shown once: however the tip goes away after appearing (closed, another pick, leaving the tab), it's spent.
  useEffect(() => {
    if (!ready) return undefined;
    return () => onSpentRef.current?.();
  }, [ready]);

  useEffect(() => {
    let frame = 0;
    let tries = 0;
    const find = () => {
      const el = document.querySelector(`[data-start-tab-id="${tabId}"]`);
      if (el) {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
        anchorRef.current = el;
        setReady(true);
        return;
      }
      tries += 1;
      if (tries < 30) frame = window.requestAnimationFrame(find);
    };
    find();
    return () => window.cancelAnimationFrame(frame);
  }, [tabId]);

  return (
    <FeatureTip
      open={ready}
      anchorRef={anchorRef}
      side="bottom"
      align="start"
      title={moved ? "Moved to a new tab" : "Still open in its tab"}
      description={`Your previous ${kind === "trader" ? "trader" : "market"} view is here.`}
      onDismiss={onClose}
      secondaryAction={{ label: "Got it", onClick: onClose }}
      action={{ label: "Open it", onClick: onOpen }}
    />
  );
}
