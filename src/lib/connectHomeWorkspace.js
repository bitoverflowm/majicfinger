import { API_INTEGRATIONS } from "@/components/integrationsView/integrationsConfig";

/** Workspace slots below the Connect hub — extend for integrations, charts, etc. */
export const CONNECT_WORKSPACE = {
  UPLOAD: "upload",
  BLANK: "blank",
  /** Scroll to workspace + open right panel integrations picker (all integrations). */
  INTEGRATIONS_PICKER: "integrationsPicker",
};

export function isConnectIntegrationWorkspace(id) {
  return (
    typeof id === "string" &&
    id !== CONNECT_WORKSPACE.UPLOAD &&
    id !== CONNECT_WORKSPACE.BLANK &&
    id !== CONNECT_WORKSPACE.INTEGRATIONS_PICKER &&
    id.length > 0
  );
}

/** DuckDB warm-connect before compose (Kalshi / Polymarket historical). */
export const CONNECT_WARM_INTEGRATION_IDS = new Set([
  "kalshiHistorical",
  "polymarketHistorical",
]);

export function isConnectWarmIntegration(id) {
  return CONNECT_WARM_INTEGRATION_IDS.has(id);
}

/** Step 1 integration query builder (Markets / Trades / columns) — not the analyze grid. */
export function isConnectIntegrationComposeStep(connectWorkspace, connectHomeAnalyzeActive) {
  return (
    isConnectIntegrationWorkspace(connectWorkspace) && !connectHomeAnalyzeActive
  );
}

export function shouldDeferConnectWarmComposeScroll(connectWorkspace, connectWorkspaceScrollTick) {
  return (
    isConnectWarmIntegration(connectWorkspace) && (connectWorkspaceScrollTick ?? 0) === 0
  );
}

/** Hub pill is clickable when warm-connect exists or API integration is live. */
export function isConnectHubIntegrationAvailable(row) {
  if (!row) return false;
  if (row.warmConnect) return true;
  if (!row.live) return false;
  if (!row.clickHandler) return false;
  return API_INTEGRATIONS.includes(row.clickHandler);
}

export function connectWorkspaceLabel(id) {
  if (id === CONNECT_WORKSPACE.UPLOAD) return "Upload";
  if (id === CONNECT_WORKSPACE.BLANK) return "Blank sheet";
  if (id === CONNECT_WORKSPACE.INTEGRATIONS_PICKER) return "Integrations";
  if (isConnectIntegrationWorkspace(id)) return "Integration";
  return "Workspace";
}
