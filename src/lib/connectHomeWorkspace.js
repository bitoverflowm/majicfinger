/** Workspace slots below the Connect hub — extend for integrations, charts, etc. */
export const CONNECT_WORKSPACE = {
  UPLOAD: "upload",
  BLANK: "blank",
};

export function isConnectIntegrationWorkspace(id) {
  return (
    typeof id === "string" &&
    id !== CONNECT_WORKSPACE.UPLOAD &&
    id !== CONNECT_WORKSPACE.BLANK &&
    id.length > 0
  );
}

export function connectWorkspaceLabel(id) {
  if (id === CONNECT_WORKSPACE.UPLOAD) return "Upload";
  if (id === CONNECT_WORKSPACE.BLANK) return "Blank sheet";
  if (isConnectIntegrationWorkspace(id)) return "Integration";
  return "Workspace";
}
