/** Browser-local copy of the workspace tab bar. The saved dashboard document is the source of truth. */

import { tabMarginsField } from "@/lib/workspaceTabMargins";
import { terminalTabField } from "@/lib/workspaceTerminals";
import { scopedLocalOwner } from "@/lib/workspaceProjectScope";

/** Id of every project's first tab. Saved blocks and page ids are keyed by it, so it never changes. */
export const WELCOME_START_TAB_ID = "welcome";

const STORAGE_PREFIX = "lycheeWorkspaceStartTabs:";

/** Kept per project; see `scopedLocalOwner`. */
function storageKey(userId) {
  return `${STORAGE_PREFIX}${scopedLocalOwner(userId) || "local"}`;
}

export function defaultStartTab(name = "Untitled 1") {
  return { id: WELCOME_START_TAB_ID, name, blank: true };
}

export function defaultWorkspaceStartTabs() {
  return {
    welcomeRemoved: false,
    tabs: [defaultStartTab()],
    activeId: WELCOME_START_TAB_ID,
  };
}

/**
 * The first tab used to be a hidden "Welcome" page with a letter on it.
 * It becomes an ordinary blank tab, or is dropped when other tabs exist and nothing was saved on it.
 */
export function retireWelcomeTab({ tabs, activeId, welcomeRemoved, keepWelcome = false }) {
  const list = Array.isArray(tabs) ? tabs : [];
  const index = list.findIndex((tab) => tab?.id === WELCOME_START_TAB_ID && !tab.blank && !terminalTabField(tab).terminal);
  if (index < 0) return { tabs: list, activeId, welcomeRemoved };
  const others = list.filter((_, i) => i !== index);
  if (others.length && !keepWelcome) {
    return {
      tabs: others,
      activeId: activeId === WELCOME_START_TAB_ID || !activeId ? others[0].id : activeId,
      welcomeRemoved: true,
    };
  }
  const next = list.slice();
  next[index] = defaultStartTab(newBlankTabName(others.map((tab) => tab.name)));
  return { tabs: next, activeId, welcomeRemoved };
}

function sanitizeTabs(tabs, welcomeRemoved) {
  const list = Array.isArray(tabs) ? tabs : [];
  const clean = [];
  const seen = new Set();
  for (const tab of list) {
    const id = String(tab?.id || "").trim();
    const name = String(tab?.name || "").trim();
    if (!id || !name || seen.has(id)) continue;
    if (welcomeRemoved && id === WELCOME_START_TAB_ID) continue;
    seen.add(id);
    clean.push({ id, name, blank: !!tab.blank, ...terminalTabField(tab), ...tabMarginsField(tab) });
  }
  return clean;
}

export function loadWorkspaceStartTabs(userId) {
  const fallback = defaultWorkspaceStartTabs();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const retired = retireWelcomeTab({
      tabs: sanitizeTabs(parsed?.tabs, !!parsed?.welcomeRemoved),
      activeId: parsed?.activeId,
      welcomeRemoved: !!parsed?.welcomeRemoved,
    });
    const { tabs, welcomeRemoved } = retired;
    const activeId = tabs.some((tab) => tab.id === retired.activeId) ? retired.activeId : tabs[0]?.id || null;
    return { welcomeRemoved, tabs, activeId };
  } catch {
    return fallback;
  }
}

export function saveWorkspaceStartTabs(userId, state) {
  if (typeof window === "undefined") return;
  try {
    const welcomeRemoved = !!state?.welcomeRemoved;
    const tabs = sanitizeTabs(state?.tabs, welcomeRemoved);
    const activeId = tabs.some((tab) => tab.id === state?.activeId) ? state.activeId : tabs[0]?.id || null;
    localStorage.setItem(
      storageKey(userId),
      JSON.stringify({ welcomeRemoved, tabs, activeId }),
    );
  } catch {
    // Private mode can block storage. The in-memory tabs still update this visit.
  }
}

/** Changes one tab's fields on screen and in the browser copy. `patch` is the changes, or `(tab) => changes | null`. */
export function updateWorkspaceTab({ ctx, tabId, accountId, patch }) {
  const tabs = Array.isArray(ctx?.workspaceStartTabs) ? ctx.workspaceStartTabs : [];
  const host = tabs.find((tab) => tab.id === tabId);
  if (!host) return false;
  const changes = typeof patch === "function" ? patch(host) : patch;
  if (!changes) return false;
  const next = tabs.map((tab) => (tab.id === tabId ? { ...tab, ...changes } : tab));
  ctx?.setWorkspaceStartTabs?.(next);
  if (!ctx?.landingDemo) {
    saveWorkspaceStartTabs(accountId || "local", {
      welcomeRemoved: !!ctx?.welcomeTabRemoved,
      tabs: next,
      activeId: ctx?.activeWorkspaceStartTabId || null,
    });
  }
  return true;
}

export function newStartTabId() {
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newBlankTabName(existingNames) {
  const taken = new Set(
    (existingNames || []).map((name) => String(name || "").trim().toLowerCase()),
  );
  let n = 1;
  while (taken.has(`untitled ${n}`)) n += 1;
  return `Untitled ${n}`;
}

export function duplicateTabName(name, existingNames) {
  const taken = new Set(existingNames);
  const base = `${String(name || "Tab").trim() || "Tab"} copy`;
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}
