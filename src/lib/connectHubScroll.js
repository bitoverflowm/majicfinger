import { CONNECT_WORKSPACE_SCROLL_OFFSET_PX } from "@/lib/connectHubLayout";

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
  if (!scrollRootEl) {
    analyzeEl.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const elRect = analyzeEl.getBoundingClientRect();
  const scrollerRect = scrollRootEl.getBoundingClientRect();
  const padTop =
    Number.parseInt(getComputedStyle(scrollRootEl).scrollPaddingTop, 10) ||
    CONNECT_WORKSPACE_SCROLL_OFFSET_PX;
  const targetTop = elRect.top - scrollerRect.top + scrollRootEl.scrollTop - padTop;
  scrollRootEl.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
}

/** Scroll to Step 2 analyze section (#connect-home-analyze). */
export function scheduleConnectAnalyzeScroll(analyzeElRef, scrollRootElRef) {
  const run = (attempt = 0) => {
    const el = analyzeElRef?.current;
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
