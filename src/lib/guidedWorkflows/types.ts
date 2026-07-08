/** Stable IDs for every highlightable control in the Kalshi historical demo. */
export type KalshiSourceTarget = "kalshi.source.markets" | "kalshi.source.trades";

export type GuidedTargetId =
  | KalshiSourceTarget
  | `kalshi.workflow.${string}`
  | `kalshi.column.${string}`
  | `kalshi.compose.op.${string}`
  | "kalshi.compose.where.add"
  | "kalshi.compose.where.column"
  | "kalshi.compose.where.op"
  | "kalshi.compose.where.value"
  | "kalshi.compose.sort.add"
  | "kalshi.compose.limit.toggle"
  | "kalshi.compose.limit.value"
  | "kalshi.sheetName"
  | "kalshi.runQuery"
  | "kalshi.cancel"
  | "kalshi.guide.exit"
  | "kalshi.columns.panel"
  | "kalshi.compose.panel";

export type GuidedStepKind = "action" | "info";

export type GuidedPhase = "idle" | "intro" | "exit-hint" | "active";

export type GuidedWorkflowStatus = "idle" | "intro" | "exit-hint" | "active" | "completed" | "cancelled";

export type GuidedSnapshotMatch = {
  sampleId?: string;
  selectedColumns?: string[] | { includes?: string[]; length?: number };
  activeComposeOps?: string[] | { includes?: string };
  whereFilterCount?: number;
  sheetName?: string;
};

export type GuidedWorkflowSnapshot = {
  sampleId: string;
  selectedColumns: string[];
  activeComposeOps: string[];
  whereFilters: Array<{ column: string; op: string; value: string }>;
  orderBy: Array<{ alias: string; direction: string }>;
  havingFilters: unknown[];
  joins: unknown[];
  composeLimitOpen: boolean;
  composeLimitValue: string;
  sheetName: string;
};

export type GuidedStepCompleteWhen =
  | { type: "click" }
  | { type: "state"; match: GuidedSnapshotMatch }
  | { type: "input"; field: string; equals?: string }
  | { type: "continue" };

export type GuidedStep = {
  id: string;
  kind?: GuidedStepKind;
  target: GuidedTargetId;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right";
  completeWhen: GuidedStepCompleteWhen;
  assert?: GuidedSnapshotMatch;
  waitForTarget?: boolean;
  /** Info steps: block clicks inside the spotlight (default true when kind is info). */
  blockTargetInteraction?: boolean;
};

export function isInfoStep(step: GuidedStep): boolean {
  return step.kind === "info" || step.completeWhen.type === "continue";
}

export type GuidedWorkflowDefinition = {
  id: string;
  title: string;
  description: string;
  steps: GuidedStep[];
};

export const GUIDED_TARGET_ATTR = "data-guided-target";
