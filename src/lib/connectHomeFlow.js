/**
 * Guided platform flow (Connect home + workspace).
 * Step 1 — connect data (import, integrations, blank; includes scroll-down workspace).
 * Step 2 — analyze once sheet has data.
 * Step 3 — publish / share (dashboard, chart export, embed).
 */

export const CONNECT_FLOW_STEP = {
  CONNECT: 1,
  ANALYZE: 2,
  PUBLISH: 3,
};

/** Step 2 — chart builder (analyze). */
export const CONNECT_HOME_ANALYZE_PANEL_TABS = ["charts"];

/** Step 3 — dashboard composer, export, embed. */
export const CONNECT_HOME_PUBLISH_PANEL_TABS = ["dashboard", "export"];

export function isConnectHomeAnalyzePanelTab(tab) {
  return CONNECT_HOME_ANALYZE_PANEL_TABS.includes(tab ?? "");
}

export function isConnectHomePublishPanelTab(tab) {
  return CONNECT_HOME_PUBLISH_PANEL_TABS.includes(tab ?? "");
}

/** Chart or publish side panel — both need the right drawer on Connect home. */
export function isConnectHomeDesignPanelTab(tab) {
  return isConnectHomeAnalyzePanelTab(tab) || isConnectHomePublishPanelTab(tab);
}

export const CONNECT_FLOW_STEPS = [
  {
    step: CONNECT_FLOW_STEP.CONNECT,
    title: "Connect data",
    description: "Import or integrate",
  },
  {
    step: CONNECT_FLOW_STEP.ANALYZE,
    title: "Analyze your data",
    description: "Explore and chart",
  },
  {
    step: CONNECT_FLOW_STEP.PUBLISH,
    title: "Publish your findings",
    description: "Dashboard & share",
  },
];

function sheetHasData(dataSheets) {
  const sheets = dataSheets && typeof dataSheets === "object" ? Object.values(dataSheets) : [];
  return sheets.some((s) => Array.isArray(s?.data) && s.data.length > 0);
}

/**
 * @param {{
 *   viewing?: string;
 *   dataConnected?: boolean;
 *   connectedData?: unknown[];
 *   dataSheets?: Record<string, { data?: unknown[] }>;
 *   rightPanelTab?: string;
 * }} state
 */
export function deriveConnectFlowStep(state) {
  const viewing = state?.viewing ?? "";
  const dataSheets = state?.dataSheets;
  const connectedData = state?.connectedData;
  const dataConnected = !!state?.dataConnected;
  const rightPanelTab = state?.rightPanelTab ?? "";
  const hasSheetData = sheetHasData(dataSheets);
  const hasRowData = Array.isArray(connectedData) && connectedData.length > 0;
  const hasData = hasSheetData || (dataConnected && hasRowData);

  if (viewing === "dashboardComposer" || viewing === "presentation") {
    return CONNECT_FLOW_STEP.PUBLISH;
  }

  if (hasData && isConnectHomePublishPanelTab(rightPanelTab)) {
    return CONNECT_FLOW_STEP.PUBLISH;
  }

  if (hasData) {
    return CONNECT_FLOW_STEP.ANALYZE;
  }

  return CONNECT_FLOW_STEP.CONNECT;
}
