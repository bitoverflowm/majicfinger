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
