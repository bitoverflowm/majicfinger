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
