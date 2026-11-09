/**
 * Everything on a dashboard that can go on a share card, tab by tab: terminal panels, sheets,
 * charts and text, plus the extra pieces some tabs offer (a trader's skill score) and which of
 * them can be animated.
 */

import { sheetAsset } from "@/components/dashboardComposer/dashboardShareModel";
import { isTerminalBlock, terminalLayoutPatch, terminalPanelSpec } from "@/components/terminals/terminalCanvas";
import { pageIdForTab } from "@/lib/workspaceDashboardDocument";

/** Panels that are the terminal's chrome rather than something worth sharing. */
const SKIPPED_PANELS = new Set(["intro", "search", "browse"]);

/** Panels whose story is a line over time, which a recording can draw. */
const MOTION_PANELS = { "market.price": "price", "market.priceNews": "price", "market.lastPrice": "price", "trader.pnl": "pnl" };

export const PIECE_KIND_LABEL = {
  panel: "Panel",
  chart: "Chart",
  sheet: "Sheet",
  price: "Price",
  book: "Order book",
  text: "Text",
  score: "Score card",
};

function tabSubjectLabel(tab) {
  const subject = tab?.terminalSubject;
  if (subject?.kind === "market") return subject.title || "Market";
  if (subject?.kind === "trader") return subject.title || `${String(subject.address || "").slice(0, 6)}…`;
  return "";
}

function blocksForTab(tab, blocksByPage) {
  const saved = blocksByPage?.[pageIdForTab(tab.id)];
  if (Array.isArray(saved) && saved.length) return saved;
  // A terminal tab nobody has opened yet still has its blueprint's panels.
  if (tab?.terminal) return terminalLayoutPatch(tab, [])?.blocks || [];
  return [];
}

function byPosition(a, b) {
  return (a.y || 0) - (b.y || 0) || (a.x || 0) - (b.x || 0);
}

/**
 * @returns {{ tab: object, label: string, pieces: object[] }[]} each piece:
 *   `{ id, tabId, kind, title, detail, block?, source?, motion? }`
 */
export function buildShareLibrary({ tabs, blocksByPage }) {
  const groups = [];
  for (const tab of Array.isArray(tabs) ? tabs : []) {
    if (!tab?.id) continue;
    const blocks = [...blocksForTab(tab, blocksByPage)].sort(byPosition);
    const pieces = [];
    const tabName = String(tab.name || "").trim() || "Tab";
    const subject = tab.terminalSubject;

    if (subject?.kind === "trader") {
      pieces.push({ id: `${tab.id}::score`, tabId: tab.id, kind: "score", title: "Skill score card", detail: "Score, PnL and record", motion: null });
    }

    for (const block of blocks) {
      if (!block?.id) continue;
      if (isTerminalBlock(block)) {
        if (SKIPPED_PANELS.has(block.panel)) continue;
        const spec = terminalPanelSpec(block);
        if (!spec) continue;
        if (spec.view && subject?.kind && spec.view !== subject.kind) continue;
        pieces.push({
          id: `${tab.id}::${block.id}`,
          tabId: tab.id,
          kind: "panel",
          title: block.title || spec.title,
          detail: tabSubjectLabel(tab) || tabName,
          block,
          motion: MOTION_PANELS[block.panel] || null,
        });
        continue;
      }
      if (block.type === "sheet") {
        const asset = sheetAsset(block, { id: tab.id, name: tabName });
        if (!asset) continue;
        pieces.push({
          id: `${tab.id}::${block.id}`,
          tabId: tab.id,
          kind: asset.kind === "price" ? "price" : asset.kind === "book" ? "book" : "sheet",
          title: asset.market || asset.title,
          detail: asset.kind === "sheet" ? `${asset.rows.toLocaleString()} rows` : asset.side || asset.title,
          block,
          asset,
          motion: asset.kind === "price" ? "sheet-price" : null,
        });
        continue;
      }
      if (block.type === "chart") {
        const source = blocks.find((item) => item.id === block.sourceSheetId) || null;
        if (!source) continue;
        pieces.push({
          id: `${tab.id}::${block.id}`,
          tabId: tab.id,
          kind: "chart",
          title: String(block.title || "").trim() || "Chart",
          detail: tabName,
          block,
          source,
          motion: null,
        });
        continue;
      }
      if (block.type === "text" && String(block.body || "").trim()) {
        pieces.push({
          id: `${tab.id}::${block.id}`,
          tabId: tab.id,
          kind: "text",
          title: String(block.body).trim().split("\n")[0].slice(0, 60),
          detail: "Text",
          block,
          motion: null,
        });
      }
    }
    if (pieces.length) groups.push({ tab, label: tabName, subject: tabSubjectLabel(tab), pieces });
  }
  return groups;
}

export function findPiece(groups, id) {
  for (const group of groups) {
    const piece = group.pieces.find((item) => item.id === id);
    if (piece) return piece;
  }
  return null;
}

/** A first card for the open tab: its headline panels, or its first pieces. */
export function starterPieces(groups, activeTabId) {
  const group = groups.find((item) => item.tab.id === activeTabId) || groups[0];
  if (!group) return [];
  const preferred = ["market.stats", "market.lastPrice", "trader.stats", "trader.pnl"];
  const picked = preferred
    .map((panel) => group.pieces.find((piece) => piece.block?.panel === panel))
    .filter(Boolean);
  const list = picked.length ? picked : group.pieces.slice(0, 2);
  return list.slice(0, 2).map((piece) => piece.id);
}
