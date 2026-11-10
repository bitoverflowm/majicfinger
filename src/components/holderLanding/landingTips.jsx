"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FeatureTip } from "@/components/ui/feature-tip";

const TIP_MS = 6500;
/** The last tip lingers before the tour starts over. */
const LAST_TIP_MS = 9000;
const FIND_EVERY_MS = 400;
/** Panels load data first; give up on a missing part after this and point at the panel itself. */
const FIND_FOR_MS = 4000;

const TEXT_HOSTS = "th, dl > div, figure, section, article";

function byText(root, label) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.childElementCount === 0 && node.textContent.trim() === label) {
      return node.closest(TEXT_HOSTS) || node.parentElement;
    }
  }
  return null;
}

function visible(el) {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/** The first match of a tip's target in `root`: a CSS selector, or `text:Label`. */
export function findTipTarget(root, target) {
  if (!root) return null;
  for (const item of Array.isArray(target) ? target : [target]) {
    if (!item) continue;
    let el = null;
    try {
      el = item.startsWith("text:") ? byText(root, item.slice(5)) : root.querySelector(item);
    } catch {
      el = null;
    }
    if (el && visible(el)) return el;
  }
  return null;
}

/** Scrolls `scroller` (not the page) just enough to show `el`. */
function revealInside(scroller, el, smooth) {
  if (!scroller || !el) return;
  const box = scroller.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  const margin = 56;
  const tall = rect.height > box.height - margin * 2;
  if (!tall && rect.top >= box.top + margin && rect.bottom <= box.bottom - margin) return;
  const delta = tall || rect.top < box.top + margin ? rect.top - box.top - margin : rect.bottom - box.bottom + margin;
  scroller.scrollTo({ top: scroller.scrollTop + delta, behavior: smooth ? "smooth" : "auto" });
}

/** A ring that follows `el` inside `overlay`, re-measured every frame while shown. */
function TipHighlight({ el, overlayRef }) {
  const ringRef = useRef(null);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const ring = ringRef.current;
      const overlay = overlayRef.current;
      if (ring && overlay && el?.isConnected) {
        const box = overlay.getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        const top = Math.max(rect.top, box.top) - box.top;
        const bottom = Math.min(rect.bottom, box.bottom) - box.top;
        const shown = bottom - top > 8;
        ring.style.opacity = shown ? "1" : "0";
        ring.style.transform = `translate(${rect.left - box.left - 4}px, ${top - 4}px)`;
        ring.style.width = `${rect.width + 8}px`;
        ring.style.height = `${Math.max(0, bottom - top) + 8}px`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [el, overlayRef]);
  return (
    <div
      ref={ringRef}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-10 rounded-[10px] opacity-0 ring-2 ring-[#0d99ff] ring-offset-0 transition-[transform,width,height,opacity] duration-500 ease-[cubic-bezier(.165,.84,.44,1)] motion-reduce:transition-none"
      style={{ boxShadow: "0 0 0 4px rgba(13,153,255,.18)" }}
    />
  );
}

/**
 * A step's feature tips over its live panel, one at a time. Each tip finds its part of the panel
 * in `scrollerRef`, scrolls it into view there, rings it and floats a tip beside it.
 * With `autoplay` the tips advance on their own; any click on a tip hands control to the visitor.
 */
export function StageTips({ stepKey, tips, scrollerRef, overlayRef, shown, autoplay, reducedMotion, onTakeOver, onNextStep, onHide }) {
  const [index, setIndex] = useState(0);
  const [anchor, setAnchor] = useState(null);
  useEffect(() => setIndex(0), [stepKey]);

  const tip = tips?.[index] || null;
  const total = tips?.length || 0;
  const last = index >= total - 1;

  useEffect(() => {
    setAnchor(null);
    if (!shown || !tip) return undefined;
    const started = Date.now();
    let timer = 0;
    const look = () => {
      const root = scrollerRef.current;
      const found = findTipTarget(root, tip.target) || (Date.now() - started > FIND_FOR_MS ? root?.firstElementChild || null : null);
      if (found) {
        revealInside(root, found, !reducedMotion);
        setAnchor(found);
        return;
      }
      timer = window.setTimeout(look, FIND_EVERY_MS);
    };
    // Let the panel's entrance settle before measuring it.
    timer = window.setTimeout(look, 450);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, scrollerRef, shown, tip, stepKey]);

  useEffect(() => {
    if (!autoplay || !shown || !anchor || total < 1) return undefined;
    const timer = window.setTimeout(() => setIndex((at) => (at + 1) % total), last ? LAST_TIP_MS : TIP_MS);
    return () => window.clearTimeout(timer);
  }, [anchor, autoplay, last, shown, total]);

  const anchorRef = useMemo(() => ({ current: anchor }), [anchor]);
  if (!shown || !tip || !anchor) return null;

  const next = () => {
    onTakeOver?.();
    if (last) onNextStep?.();
    else setIndex(index + 1);
  };
  return (
    <>
      <TipHighlight el={anchor} overlayRef={overlayRef} />
      <FeatureTip
        key={`${stepKey}:${index}`}
        open
        anchorRef={anchorRef}
        side={tip.side || "bottom"}
        align="center"
        updatePositionStrategy="always"
        title={tip.title}
        description={tip.body}
        step={total > 1 ? { current: index + 1, total } : undefined}
        secondaryAction={
          index > 0
            ? {
                label: "Back",
                onClick: () => {
                  onTakeOver?.();
                  setIndex(index - 1);
                },
              }
            : undefined
        }
        action={onNextStep || !last ? { label: last ? "Next step" : "Next", onClick: next } : undefined}
        onDismiss={() => {
          onTakeOver?.();
          onHide?.();
        }}
      />
    </>
  );
}
