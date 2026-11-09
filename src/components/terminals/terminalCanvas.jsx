"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { CLIP, widthForSpan, xForCol } from "@/components/dashboardComposer/clipLayout";
import { cn } from "@/lib/utils";
import { terminalViewOf } from "@/lib/workspaceTerminals";
import { PanelSizing } from "./terminalPanelFrame";
import { HOLDER_BLUEPRINT, HOLDER_BLUEPRINT_VERSION, HOLDER_PANELS, HolderHost, useHolderSessionView } from "./holder/holderPanels";
import { useHolderSession } from "./holder/holderSession";

/**
 * Terminals on the dashboard canvas. Each panel is a block `{ type: "terminal", terminal, panel }`
 * that saves only where it sits; what it shows comes from the tab's subject when the tab loads.
 */
const KITS = {
  holder: {
    version: HOLDER_BLUEPRINT_VERSION,
    blueprint: HOLDER_BLUEPRINT,
    panels: HOLDER_PANELS,
    Host: HolderHost,
    useView: useHolderSessionView,
    useSession: useHolderSession,
  },
};

const VIEW_NOUN = { browse: "explore view", market: "market", trader: "trader" };

export function isTerminalBlock(block) {
  return block?.type === "terminal";
}

export function terminalPanelSpec(block) {
  return isTerminalBlock(block) ? KITS[block.terminal]?.panels[block.panel] || null : null;
}

function panelId(terminal, panel) {
  const slug = String(panel).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return `terminal-${terminal}-${slug}-${Math.random().toString(36).slice(2, 8)}`;
}

function bottomOf(blocks) {
  return blocks.reduce((max, block) => Math.max(max, (block.y || 0) + (block.h || 0)), 0);
}

/** Blueprint entries placed left to right from `originY`, wrapping when a row's 24 columns fill. */
function placeEntries(terminal, kit, entries, originY) {
  const placed = [];
  let y = originY;
  let col = 0;
  let rowHeight = 0;
  for (const entry of entries) {
    const span = Math.min(CLIP.cols, Math.max(1, entry.span || CLIP.cols));
    if (col > 0 && col + span > CLIP.cols) {
      y += rowHeight + CLIP.gap;
      col = 0;
      rowHeight = 0;
    }
    placed.push({
      id: panelId(terminal, entry.panel),
      type: "terminal",
      terminal,
      panel: entry.panel,
      title: kit.panels[entry.panel]?.title || "",
      x: xForCol(col),
      y,
      w: widthForSpan(span),
      h: entry.h,
      ...(entry.fit ? { fit: true } : {}),
    });
    col += span;
    rowHeight = Math.max(rowHeight, entry.h);
    if (col >= CLIP.cols) {
      y += rowHeight + CLIP.gap;
      col = 0;
      rowHeight = 0;
    }
  }
  return placed;
}

/**
 * The blocks a terminal tab should have, or null when it already has them. A tab gets its view's
 * blueprint the first time it shows that view (or when it's empty); later blueprint versions only
 * add the panels introduced since, so whatever the user removed stays removed. Their own blocks stay.
 * Returns `{ blocks, layout }`, `layout` being the tab's next `terminalLayout`.
 */
export function terminalLayoutPatch(tab, blocks, { checkScreen = false } = {}) {
  const terminal = tab?.terminal;
  const kit = KITS[terminal];
  if (!kit) return null;
  const view = terminalViewOf(tab.terminalSubject);
  const entries = kit.blueprint[view] || [];
  const list = Array.isArray(blocks) ? blocks : [];
  const panels = list.filter(isTerminalBlock);
  const own = list.filter((block) => !isTerminalBlock(block));
  const layout = tab.terminalLayout || null;
  // An empty tab the user never touched lost its panels somewhere (a save that didn't land); lay it out again.
  if (!layout || layout.view !== view || (!list.length && !layout.edited)) {
    const placed = placeEntries(terminal, kit, entries, CLIP.originY);
    const top = own.reduce((min, block) => Math.min(min, block.y || 0), Infinity);
    const lift = own.length ? Math.max(0, bottomOf(placed) + CLIP.gap * 3 - top) : 0;
    return {
      blocks: [...placed, ...own.map((block) => (lift ? { ...block, y: (block.y || 0) + lift } : block))],
      layout: { view, version: kit.version, ...(layout?.edited ? { edited: true } : {}) },
    };
  }
  // Untouched, it follows the screen it opens on: the panels go back in blueprint order across this canvas's width.
  if (checkScreen && !layout.edited && !own.length && panels.length) {
    const order = new Map(entries.map((entry, index) => [entry.panel, index]));
    const sorted = [...panels].sort((a, b) => (order.get(a.panel) ?? entries.length) - (order.get(b.panel) ?? entries.length));
    const placed = placeEntries(
      terminal,
      kit,
      sorted.map((block) => ({ panel: block.panel, span: entries[order.get(block.panel)]?.span || CLIP.cols, h: block.h })),
      CLIP.originY,
    );
    const relaid = sorted.map((block, index) => ({ ...block, x: placed[index].x, y: placed[index].y, w: placed[index].w }));
    if (relaid.some((block, index) => ["x", "y", "w"].some((key) => Math.abs(block[key] - (sorted[index][key] || 0)) > 1))) {
      return { blocks: relaid, layout };
    }
  }
  if (layout.version >= kit.version) return null;
  const have = new Set(panels.map((block) => block.panel));
  const added = entries.filter((entry) => (entry.since || 1) > layout.version && !have.has(entry.panel));
  return {
    blocks: added.length ? [...list, ...placeEntries(terminal, kit, added, bottomOf(list) + CLIP.gap)] : list,
    layout: { ...layout, version: kit.version },
  };
}

/** The tab's data and actions around its panels. Blocks render inside it. */
export function TerminalCanvasSession({ tab, customized, onTop, selectTab, children }) {
  const Host = KITS[tab?.terminal]?.Host;
  if (!Host) return children;
  return (
    <Host tab={tab} customized={customized} onTop={onTop} selectTab={selectTab}>
      {children}
    </Host>
  );
}

function PanelNote({ children }) {
  return <p className="flex h-full min-h-24 items-center justify-center px-6 text-center text-[12px] text-muted-foreground">{children}</p>;
}

function PanelContent({ block, full }) {
  const kit = KITS[block.terminal];
  const spec = kit?.panels[block.panel];
  const view = kit ? kit.useView() : "";
  if (!spec) return <PanelNote>This panel isn&apos;t available anymore.</PanelNote>;
  if (!view) return <PanelNote>This panel shows on its terminal tab.</PanelNote>;
  if (spec.view && spec.view !== view) {
    return <PanelNote>{`${spec.title} shows when this tab is on a ${VIEW_NOUN[spec.view] || spec.view}.`}</PanelNote>;
  }
  const Panel = spec.Component;
  return (
    <PanelSizing fit={!full && !!block.fit}>
      <div data-terminal-panel={block.panel} className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Panel />
      </div>
    </PanelSizing>
  );
}

const FIT_DELAY_MS = 120;
/** The block's border, top and bottom. */
const FIT_CHROME_PX = 2;

/**
 * A terminal panel inside its canvas block. A `fit` panel reports its content's height through
 * `onFit` so the block grows and shrinks with it; otherwise the content fills the block and scrolls.
 */
export function TerminalPanelBody({ block, booting, onFit }) {
  const measureRef = useRef(null);
  const onFitRef = useRef(onFit);
  onFitRef.current = onFit;
  const heightRef = useRef(block.h);
  heightRef.current = block.h;
  const fit = !!block.fit && !booting;

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!fit || !el) return undefined;
    let timer = 0;
    const report = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const next = Math.ceil(el.offsetHeight + FIT_CHROME_PX);
        if (next > 40 && Math.abs(next - (heightRef.current || 0)) > 2) onFitRef.current?.(next);
      }, FIT_DELAY_MS);
    };
    const observer = new ResizeObserver(report);
    observer.observe(el);
    report();
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
    // A repack can change the block's height while the content stays put; measure again.
  }, [fit, block.h]);

  if (booting) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
      </div>
    );
  }
  if (fit) {
    return (
      <div className={cn("min-h-0 flex-1", terminalPanelOverflows(block) ? "overflow-visible" : "overflow-hidden")}>
        <div ref={measureRef} className="flex flex-col">
          <PanelContent block={block} />
        </div>
      </div>
    );
  }
  return (
    <div data-visual-scroll="" className={cn("flex min-h-0 flex-1 flex-col", terminalPanelOverflows(block) ? "overflow-visible" : "overflow-auto")}>
      <PanelContent block={block} />
    </div>
  );
}

/** The panel on its own, filling the full-screen view. */
export function TerminalPanelFull({ block }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <PanelContent block={block} full />
    </div>
  );
}

function scalar(value) {
  return value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

/**
 * A table panel's rows as a sheet `exportSheet` can write, or null for panels that are only an
 * image. Columns are every plain field the rows carry.
 */
export function useTerminalPanelTable(block) {
  const kit = KITS[block?.terminal];
  const session = (kit?.useSession || useHolderSession)();
  const spec = terminalPanelSpec(block);
  if (!spec?.rows || !session || (spec.view && spec.view !== session.view)) return null;
  let rows;
  try {
    rows = spec.rows(session) || [];
  } catch {
    return null;
  }
  if (!rows.length) return null;
  const keys = [];
  const seen = new Set();
  for (const row of rows.slice(0, 200)) {
    for (const [key, value] of Object.entries(row || {})) {
      if (seen.has(key) || !scalar(value)) continue;
      seen.add(key);
      keys.push(key);
    }
  }
  return {
    title: block.title || spec.title,
    columns: keys.map((key) => ({ id: key, title: key })),
    records: rows.map((row) => Object.fromEntries(keys.map((key) => [key, row?.[key] ?? ""]))),
  };
}

/** Lets the search panel's results drop over the panels below it. */
export function terminalPanelOverflows(block) {
  return !!terminalPanelSpec(block)?.overflow;
}

/** Wheel events the canvas should leave alone: something inside a terminal panel can scroll that way. */
export function scrollsInsideTerminalPanel(target, deltaX, deltaY) {
  if (!(target instanceof Element)) return false;
  const panel = target.closest("[data-terminal-panel]");
  if (!panel) return false;
  const vertical = Math.abs(deltaY) >= Math.abs(deltaX);
  for (let el = target; el && el !== panel.parentElement; el = el.parentElement) {
    if (!(el instanceof HTMLElement)) continue;
    const style = window.getComputedStyle(el);
    const overflow = vertical ? style.overflowY : style.overflowX;
    if (overflow !== "auto" && overflow !== "scroll") continue;
    if (vertical) {
      const max = el.scrollHeight - el.clientHeight;
      if (max > 1 && ((deltaY > 0 && el.scrollTop < max - 1) || (deltaY < 0 && el.scrollTop > 0))) return true;
    } else {
      const max = el.scrollWidth - el.clientWidth;
      if (max > 1 && ((deltaX > 0 && el.scrollLeft < max - 1) || (deltaX < 0 && el.scrollLeft > 0))) return true;
    }
  }
  return false;
}

/** Keeps a terminal tab's panels in step with its subject. Seeds and upgrades are written through the callbacks. */
export function useTerminalTabLayout({ tab, blocks, enabled, onBlocks, onLayout }) {
  const onBlocksRef = useRef(onBlocks);
  onBlocksRef.current = onBlocks;
  const onLayoutRef = useRef(onLayout);
  onLayoutRef.current = onLayout;
  // The screen check runs once per tab per visit, when its blocks first arrive.
  const screenCheckedRef = useRef(new Set());
  useEffect(() => {
    if (!enabled || !tab?.terminal) return;
    const checkScreen = !screenCheckedRef.current.has(tab.id);
    screenCheckedRef.current.add(tab.id);
    const patch = terminalLayoutPatch(tab, blocks, { checkScreen });
    if (!patch) return;
    if (patch.blocks !== blocks) onBlocksRef.current?.(patch.blocks);
    onLayoutRef.current?.(patch.layout);
  }, [blocks, enabled, tab]);
}

export function panelClassName(block) {
  return cn(terminalPanelOverflows(block) && "overflow-visible focus-within:z-30");
}
