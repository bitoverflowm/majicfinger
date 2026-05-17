import { CONNECT_WORKSPACE_SCROLL_OFFSET_PX } from "@/lib/connectHubLayout";

/** Step 2 viewport anchor — sheet / chart / dashboard; never scroll to compose. */
export const CONNECT_HOME_ANALYZE_ANCHOR_ID = "connect-home-analyze-anchor";

export const CONNECT_HOME_COMPOSE_ID = "connect-home-compose";

export const CONNECT_HOME_INTEGRATION_WORKFLOW_ID = "connect-home-integration-workflow";

export const CONNECT_HOME_WORKSPACE_ID = "connect-home-workspace";

export const CONNECT_HOME_SCROLL_ID = "connect-home-scroll";

export function resolveConnectIntegrationScrollTarget() {
  if (typeof document === "undefined") return null;
  return (
    document.getElementById(CONNECT_HOME_INTEGRATION_WORKFLOW_ID) ||
    document.getElementById(CONNECT_HOME_COMPOSE_ID) ||
    document.getElementById(CONNECT_HOME_WORKSPACE_ID)
  );
}

function disableScrollSnap(scrollRootEl) {
  if (!scrollRootEl) return () => {};
  const prev = scrollRootEl.style.scrollSnapType;
  scrollRootEl.style.scrollSnapType = "none";
  return () => {
    scrollRootEl.style.scrollSnapType = prev;
  };
}

/**
 * Scroll target into view. Always uses scrollIntoView (works on all scroll ancestors),
 * then aligns #connect-home-scroll when provided.
 */
export function scrollConnectHomeTargetIntoView(
  scrollRootEl,
  targetEl,
  { behavior = "smooth" } = {},
) {
  if (!targetEl) return false;

  const restoreSnap = disableScrollSnap(scrollRootEl);

  targetEl.scrollIntoView({ behavior, block: "start" });

  if (scrollRootEl) {
    const padTop =
      Number.parseInt(getComputedStyle(scrollRootEl).scrollPaddingTop, 10) ||
      CONNECT_WORKSPACE_SCROLL_OFFSET_PX;
    const elRect = targetEl.getBoundingClientRect();
    const scrollerRect = scrollRootEl.getBoundingClientRect();
    const targetTop = elRect.top - scrollerRect.top + scrollRootEl.scrollTop - padTop;
    scrollRootEl.scrollTo({ top: Math.max(0, targetTop), behavior });
  }

  window.setTimeout(restoreSnap, 1000);
  return true;
}

function runWithRetries(fn, delaysMs = [0, 50, 120, 250, 500, 900, 1400, 2200]) {
  let attempt = 0;
  const tryRun = () => {
    if (fn()) return;
    attempt += 1;
    if (attempt < 80) requestAnimationFrame(tryRun);
  };
  tryRun();
  for (const delay of delaysMs) {
    window.setTimeout(tryRun, delay);
  }
}

/** After integration activates: scroll to workflow (Kalshi / Markets / Trades). */
export function scheduleConnectHomeIntegrationActivate(workspaceElRef, scrollRootElRef) {
  const tryScroll = () => {
    const scrollRoot =
      scrollRootElRef?.current ??
      document.getElementById(CONNECT_HOME_SCROLL_ID);
    const target =
      document.getElementById(CONNECT_HOME_INTEGRATION_WORKFLOW_ID) ||
      document.getElementById(CONNECT_HOME_COMPOSE_ID) ||
      workspaceElRef?.current ||
      document.getElementById(CONNECT_HOME_WORKSPACE_ID);
    if (!target) return false;
    return scrollConnectHomeTargetIntoView(scrollRoot, target, { behavior: "smooth" });
  };
  runWithRetries(tryScroll);
}

/** @deprecated */
export function scheduleConnectIntegrationWorkflowScroll(scrollRootElRef) {
  return scheduleConnectHomeIntegrationActivate(null, scrollRootElRef);
}

export function scheduleConnectComposeScroll(scrollRootElRef) {
  return scheduleConnectHomeIntegrationActivate(null, scrollRootElRef);
}

export function scrollConnectComposeIntoView(composeEl, scrollRootEl) {
  return scrollConnectHomeTargetIntoView(scrollRootEl, composeEl, { behavior: "smooth" });
}

export function resolveConnectAnalyzeScrollTarget() {
  if (typeof document === "undefined") return null;
  return (
    document.getElementById(CONNECT_HOME_ANALYZE_ANCHOR_ID) ||
    document.getElementById("connect-home-analyze-sheet") ||
    document.getElementById("connect-home-analyze") ||
    document.getElementById(CONNECT_HOME_WORKSPACE_ID)
  );
}

/** After a saved project loads — scroll hub → workspace grid (retries until DOM mounts). */
export function scheduleConnectProjectSheetScroll(workspaceElRef, scrollRootElRef) {
  const tryScroll = () => {
    const scrollRoot =
      scrollRootElRef?.current ??
      document.getElementById(CONNECT_HOME_SCROLL_ID);
    const sheetTarget =
      document.getElementById(CONNECT_HOME_ANALYZE_ANCHOR_ID) ||
      document.getElementById("connect-home-analyze-sheet") ||
      document.getElementById("connect-home-project-grid");
    const workspaceEl =
      workspaceElRef?.current ||
      document.getElementById(CONNECT_HOME_WORKSPACE_ID);
    const target = sheetTarget || workspaceEl;
    if (!target) return false;
    return scrollConnectHomeTargetIntoView(scrollRoot, target, { behavior: "smooth" });
  };
  runWithRetries(tryScroll, [0, 80, 200, 400, 700, 1100, 1800, 2600]);
}

export function scrollConnectWorkspaceIntoView(workspaceEl, scrollRootEl) {
  if (!workspaceEl) return false;
  return scrollConnectHomeTargetIntoView(scrollRootEl, workspaceEl, { behavior: "smooth" });
}

export function scheduleConnectWorkspaceScroll(workspaceElRef, scrollRootElRef) {
  const tryScroll = () => {
    const el = workspaceElRef?.current;
    if (!el) return false;
    const scrollRoot =
      scrollRootElRef?.current ??
      document.getElementById(CONNECT_HOME_SCROLL_ID);
    return scrollConnectWorkspaceIntoView(el, scrollRoot);
  };
  runWithRetries(tryScroll);
}

export function findConnectHomeScrollRoot(fromEl) {
  let node = fromEl?.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export function scrollConnectAnalyzeIntoView(analyzeEl, scrollRootEl) {
  if (!analyzeEl) return;
  const scrollRoot = scrollRootEl ?? findConnectHomeScrollRoot(analyzeEl);
  scrollConnectHomeTargetIntoView(scrollRoot, analyzeEl, { behavior: "smooth" });
}

export function scrollConnectAnalyzeAnchorIntoView(scrollRootEl) {
  const target = resolveConnectAnalyzeScrollTarget();
  if (!target) return;
  const scrollRoot = scrollRootEl ?? findConnectHomeScrollRoot(target);
  scrollConnectAnalyzeIntoView(target, scrollRoot);
}

export function scheduleConnectAnalyzeAnchorScroll(scrollRootElRef) {
  const tryScroll = () => {
    const target = resolveConnectAnalyzeScrollTarget();
    if (!target) return false;
    const scrollRoot =
      scrollRootElRef?.current ?? findConnectHomeScrollRoot(target);
    scrollConnectAnalyzeIntoView(target, scrollRoot);
    return true;
  };
  runWithRetries(tryScroll);
}

export function scheduleConnectAnalyzeScroll(analyzeElRef, scrollRootElRef) {
  const tryScroll = () => {
    const el =
      analyzeElRef?.current ?? resolveConnectAnalyzeScrollTarget();
    if (!el) return false;
    const scrollRoot = scrollRootElRef?.current ?? findConnectHomeScrollRoot(el);
    scrollConnectAnalyzeIntoView(el, scrollRoot);
    return true;
  };
  runWithRetries(tryScroll);
}
