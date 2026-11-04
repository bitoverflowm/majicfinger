"use client";

import { useEffect, useMemo, useRef } from "react";
import { FeatureTip, useFeatureTipDismissal } from "@/components/ui/feature-tip";
import { tabIdFromPage } from "@/lib/workspaceDashboardDocument";

/** Clears the tab strip that floats over the top of the canvas. */
const SCROLL_PAD = 76;
const SETTLE_MS = 520;
const MISSING_MS = 2500;
const WIDE_SHARE = 0.6;
const HEADER_STRIP = 56;
const ROOM_ABOVE = 210;
const HOLE_PAD = 6;

/**
 * Blocks a step points at. A target is a sheet id plus which part to show: the sheet, the charts
 * opened from it, or both. Charts are found by their source sheet, so steps never guess chart ids.
 * A charts target with no charts on the canvas falls back to its sheet.
 */
function stepBlockIds(step, blocks) {
  const ids = [];
  for (const target of step?.targets || []) {
    const charts = target.part === "sheet" ? [] : blocks.filter((block) => block.type === "chart" && block.sourceSheetId === target.sheet);
    const withSheet = target.part !== "charts" || !charts.length;
    if (withSheet && blocks.some((block) => block.id === target.sheet)) ids.push(target.sheet);
    ids.push(...charts.map((block) => block.id));
  }
  return ids;
}

function unionOf(rects) {
  if (!rects.length) return null;
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function blockRect(block) {
  const left = block.x || 0;
  const top = block.y || 0;
  return { left, top, right: left + (block.w || 0), bottom: top + (block.h || 0) };
}

/**
 * Walks the user through what a run placed: switches to each step's tab, scrolls its blocks into
 * view, dims the rest of the canvas, and points a tip at them. Closing it at any step, or leaving
 * the step's tab, ends the tour for good (once per page load in the landing demo).
 * Rendered inside the canvas content so the highlight scrolls with the blocks.
 */
export function RecipeTourLayer({ canvas, tour, scrollerRef }) {
  const { dismissed, dismiss } = useFeatureTipDismissal(tour.id);
  const index = tour.index || 0;
  const steps = tour.steps;
  const step = steps[index];
  const pageId = canvas.pageId;
  const blocks = canvas.blocks;
  const onPage = !!step && pageId === step.pageId;
  const ids = useMemo(() => (onPage ? stepBlockIds(step, blocks) : []), [onPage, step, blocks]);
  const idsKey = ids.join("|");
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const arrivedRef = useRef(-1);
  const requestedRef = useRef(-1);
  const { endTour, setTourStep, requestTab } = canvas;

  const finish = () => {
    dismiss();
    endTour();
  };

  useEffect(() => {
    if (dismissed === true) endTour();
  }, [dismissed, endTour]);

  useEffect(() => {
    if (dismissed !== false) return;
    if (!step) {
      dismiss();
      endTour();
      return;
    }
    if (pageId === step.pageId) {
      arrivedRef.current = index;
      return;
    }
    if (arrivedRef.current === index) {
      dismiss();
      endTour();
      return;
    }
    if (requestedRef.current === index) return;
    requestedRef.current = index;
    requestTab(tabIdFromPage(step.pageId));
  }, [dismiss, dismissed, endTour, index, pageId, requestTab, step]);

  const shown = tour.shown === index;
  useEffect(() => {
    if (dismissed !== false || !onPage || shown) return undefined;
    if (!idsKey) {
      const timer = window.setTimeout(() => setTourStep(index + 1), MISSING_MS);
      return () => window.clearTimeout(timer);
    }
    const wanted = new Set(idsKey.split("|"));
    const rect = unionOf(blocksRef.current.filter((block) => wanted.has(block.id)).map(blockRect));
    const scroller = scrollerRef.current;
    if (scroller && rect) scroller.scrollTo({ top: Math.max(0, rect.top - SCROLL_PAD), behavior: "smooth" });
    const timer = window.setTimeout(() => setTourStep(index, { shown: index }), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [dismissed, idsKey, index, onPage, scrollerRef, setTourStep, shown]);

  const visible = dismissed === false && onPage && shown && ids.length > 0;
  const holes = visible ? blocks.filter((block) => ids.includes(block.id)).map(blockRect) : [];
  const highlight = unionOf(holes);
  const scrollerWidth = scrollerRef.current?.clientWidth || 0;
  const spanning = !!highlight && highlight.width > scrollerWidth * WIDE_SHARE;
  const roomAbove = highlight ? highlight.top - (scrollerRef.current?.scrollTop || 0) - SCROLL_PAD : 0;
  // Wide targets take the tip above them when it fits, otherwise inside their top edge.
  const above = spanning && roomAbove > ROOM_ABOVE;
  const wide = spanning && !above;
  const side = above ? "top" : wide ? "bottom" : highlight && highlight.left + highlight.width / 2 < scrollerWidth / 2 ? "right" : "left";

  const anchorRef = useMemo(() => {
    const elements = () =>
      idsKey
        .split("|")
        .map((id) => scrollerRef.current?.querySelector(`[data-block-id="${CSS.escape(id)}"]`))
        .filter((element) => element instanceof HTMLElement);
    return {
      current: {
        get contextElement() {
          return elements()[0] || undefined;
        },
        getBoundingClientRect() {
          const rect = unionOf(elements().map((element) => element.getBoundingClientRect()));
          if (!rect) return new DOMRect();
          if (wide) return new DOMRect(rect.left, rect.top, rect.width, Math.min(HEADER_STRIP, rect.height));
          const top = Math.max(rect.top, 0);
          const bottom = Math.min(rect.bottom, window.innerHeight);
          return bottom > top ? new DOMRect(rect.left, top, rect.width, bottom - top) : new DOMRect(rect.left, rect.top, rect.width, rect.height);
        },
      },
    };
  }, [idsKey, scrollerRef, wide]);

  if (!step) return null;
  const last = index === steps.length - 1;
  return (
    <>
      {holes.length ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-40 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300">
          <svg className="absolute inset-0 size-full">
            <defs>
              <mask id={`recipe-tour-mask-${index}`}>
                <rect width="100%" height="100%" fill="white" />
                {holes.map((hole, at) => (
                  <rect
                    key={at}
                    x={hole.left - HOLE_PAD}
                    y={hole.top - HOLE_PAD}
                    width={hole.right - hole.left + HOLE_PAD * 2}
                    height={hole.bottom - hole.top + HOLE_PAD * 2}
                    rx={16}
                    fill="black"
                  />
                ))}
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(15,23,42,0.32)" mask={`url(#recipe-tour-mask-${index})`} />
          </svg>
          {holes.map((hole, at) => (
            <div
              key={at}
              className="absolute rounded-2xl ring-2 ring-[#0d99ff]"
              style={{
                left: hole.left - HOLE_PAD,
                top: hole.top - HOLE_PAD,
                width: hole.right - hole.left + HOLE_PAD * 2,
                height: hole.bottom - hole.top + HOLE_PAD * 2,
              }}
            />
          ))}
        </div>
      ) : null}
      <FeatureTip
        id={tour.id}
        open={visible}
        anchorRef={anchorRef}
        updatePositionStrategy="always"
        side={side}
        align={above ? "center" : wide ? "end" : "start"}
        sideOffset={wide ? -8 : 18}
        alignOffset={wide ? 16 : 0}
        className="w-[300px]"
        title={step.title}
        description={step.description}
        step={{ current: index + 1, total: steps.length }}
        secondaryAction={index > 0 ? { label: "Back", onClick: () => setTourStep(index - 1) } : undefined}
        action={{ label: last ? "Done" : "Next", onClick: last ? finish : () => setTourStep(index + 1) }}
        onDismiss={endTour}
      />
    </>
  );
}
