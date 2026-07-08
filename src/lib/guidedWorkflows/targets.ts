import type { GuidedTargetId } from "./types";

/** Build a typed target id — keeps step authors aligned with the catalog. */
export function guidedTarget(id: GuidedTargetId): GuidedTargetId {
  return id;
}

export const KALSHI_GUIDED_TARGETS = {
  sourceMarkets: "kalshi.source.markets" as const,
  sourceTrades: "kalshi.source.trades" as const,
  workflow: (id: string) => `kalshi.workflow.${id}` as GuidedTargetId,
  column: (name: string) => `kalshi.column.${name}` as GuidedTargetId,
  composeOp: (opId: string) => `kalshi.compose.op.${opId}` as GuidedTargetId,
  whereAdd: "kalshi.compose.where.add" as const,
  whereColumn: "kalshi.compose.where.column" as const,
  whereOp: "kalshi.compose.where.op" as const,
  whereValue: "kalshi.compose.where.value" as const,
  sortAdd: "kalshi.compose.sort.add" as const,
  limitToggle: "kalshi.compose.limit.toggle" as const,
  limitValue: "kalshi.compose.limit.value" as const,
  sheetName: "kalshi.sheetName" as const,
  runQuery: "kalshi.runQuery" as const,
  cancel: "kalshi.cancel" as const,
  guideExit: "kalshi.guide.exit" as const,
  columnsPanel: "kalshi.columns.panel" as const,
  composePanel: "kalshi.compose.panel" as const,
};
