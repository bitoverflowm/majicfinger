import { CONNECT_WORKSPACE_SCROLL_OFFSET_PX } from "@/lib/connectHubLayout";

/** Step 2 viewport anchor — sheet / chart / dashboard; never scroll to compose. */
export const CONNECT_HOME_ANALYZE_ANCHOR_ID = "connect-home-analyze-anchor";

export const CONNECT_HOME_COMPOSE_ID = "connect-home-compose";

/** Scroll the Connect compose block (Refine query / integration workflow) into view. */
export function scrollConnectComposeIntoView(composeEl, scrollRootEl) {
  if (!composeEl) return;
  const scrollRoot = scrollRootEl ?? findConnectHomeScrollRoot(composeEl);
  if (!scrollRoot) {
    composeEl.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const elRect = composeEl.getBoundingClientRect();
  const scrollerRect = scrollRoot.getBoundingClientRect();
  const padTop =
    Number.parseInt(getComputedStyle(scrollRoot).scrollPaddingTop, 10) ||
    CONNECT_WORKSPACE_SCROLL_OFFSET_PX;
  const targetTop = elRect.top - scrollerRect.top + scrollRoot.scrollTop - padTop;
  scrollRoot.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
}

/** Retry until #connect-home-compose is mounted. */
export function scheduleConnectComposeScroll(scrollRootElRef) {
  const run = (attempt = 0) => {
    const el = document.getElementById(CONNECT_HOME_COMPOSE_ID);
    if (!el) {
      if (attempt < 24) requestAnimationFrame(() => run(attempt + 1));
      return;
    }
    const scrollRoot = scrollRootElRef?.current ?? findConnectHomeScrollRoot(el);
    scrollConnectComposeIntoView(el, scrollRoot);
  };
  requestAnimationFrame(() => run());
  window.setTimeout(() => run(), 80);
  window.setTimeout(() => run(), 200);
}

export function resolveConnectAnalyzeScrollTarget() {
  if (typeof document === "undefined") return null;
  return (
    document.getElementById(CONNECT_HOME_ANALYZE_ANCHOR_ID) ||
    document.getElementById("connect-home-analyze-sheet") ||
    document.getElementById("connect-home-analyze")
  );
}

/**
 * Scroll the Connect workspace into view. Uses scrollIntoView (window + ancestors)
 * and aligns an inner overflow pane when it is the scroll container.
 */
export function scrollConnectWorkspaceIntoView(workspaceEl, scrollRootEl) {
  if (!workspaceEl) return;

  workspaceEl.scrollIntoView({ behavior: "smooth", block: "start" });

  if (!scrollRootEl) return;
  const canInnerScroll = scrollRootEl.scrollHeight > scrollRootEl.clientHeight + 2;
  if (!canInnerScroll) return;

  const elRect = workspaceEl.getBoundingClientRect();
  const scrollerRect = scrollRootEl.getBoundingClientRect();
  const targetTop =
    elRect.top -
    scrollerRect.top +
    scrollRootEl.scrollTop -
    CONNECT_WORKSPACE_SCROLL_OFFSET_PX;
  scrollRootEl.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
}

/** Retry scroll until the workspace node is mounted (post-React commit). */
export function scheduleConnectWorkspaceScroll(workspaceElRef, scrollRootElRef) {
  const run = (attempt = 0) => {
    const el = workspaceElRef?.current;
    if (!el) {
      if (attempt < 24) requestAnimationFrame(() => run(attempt + 1));
      return;
    }
    scrollConnectWorkspaceIntoView(el, scrollRootElRef?.current ?? null);
  };
  requestAnimationFrame(() => run());
  window.setTimeout(() => run(), 80);
  window.setTimeout(() => run(), 200);
}

/** Nearest vertical scroll container (Connect home shell). */
export function findConnectHomeScrollRoot(fromEl) {
  let node = fromEl?.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight + 2
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/** Scroll Step 2 analyze so it fills the viewport below the sticky header. */
export function scrollConnectAnalyzeIntoView(analyzeEl, scrollRootEl) {
  if (!analyzeEl) return;
  const scrollRoot = scrollRootEl ?? findConnectHomeScrollRoot(analyzeEl);
  if (!scrollRoot) {
    analyzeEl.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const elRect = analyzeEl.getBoundingClientRect();
  const scrollerRect = scrollRoot.getBoundingClientRect();
  const padTop =
    Number.parseInt(getComputedStyle(scrollRoot).scrollPaddingTop, 10) ||
    CONNECT_WORKSPACE_SCROLL_OFFSET_PX;
  const targetTop = elRect.top - scrollerRect.top + scrollRoot.scrollTop - padTop;
  scrollRoot.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
}

/** Lock viewport on the Step 2 anchor (sheet / chart / dashboard workspace). */
export function scrollConnectAnalyzeAnchorIntoView(scrollRootEl) {
  const target = resolveConnectAnalyzeScrollTarget();
  if (!target) return;
  const scrollRoot = scrollRootEl ?? findConnectHomeScrollRoot(target);
  scrollConnectAnalyzeIntoView(target, scrollRoot);
}

/** Retry until #connect-home-analyze-anchor is mounted. */
export function scheduleConnectAnalyzeAnchorScroll(scrollRootElRef) {
  const run = (attempt = 0) => {
    const target = resolveConnectAnalyzeScrollTarget();
    if (!target) {
      if (attempt < 24) requestAnimationFrame(() => run(attempt + 1));
      return;
    }
    const scrollRoot =
      scrollRootElRef?.current ?? findConnectHomeScrollRoot(target);
    scrollConnectAnalyzeIntoView(target, scrollRoot);
  };
  requestAnimationFrame(() => run());
  window.setTimeout(() => run(), 80);
  window.setTimeout(() => run(), 200);
}

/** Scroll to Step 2 analyze section (#connect-home-analyze). */
export function scheduleConnectAnalyzeScroll(analyzeElRef, scrollRootElRef) {
  const run = (attempt = 0) => {
    const el =
      analyzeElRef?.current ?? resolveConnectAnalyzeScrollTarget();
    if (!el) {
      if (attempt < 24) requestAnimationFrame(() => run(attempt + 1));
      return;
    }
    const scrollRoot = scrollRootElRef?.current ?? findConnectHomeScrollRoot(el);
    scrollConnectAnalyzeIntoView(el, scrollRoot);
  };
  requestAnimationFrame(() => run());
  window.setTimeout(() => run(), 80);
  window.setTimeout(() => run(), 200);
}
