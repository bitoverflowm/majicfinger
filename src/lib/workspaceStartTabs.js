/** Browser-local start tabs (Welcome and its copies). No backend field. */

export const WELCOME_START_TAB_ID = "welcome";

const STORAGE_PREFIX = "lycheeWorkspaceStartTabs:";

function storageKey(userId) {
  return `${STORAGE_PREFIX}${userId || "local"}`;
}

export function defaultWorkspaceStartTabs() {
  return {
    welcomeRemoved: false,
    tabs: [{ id: WELCOME_START_TAB_ID, name: "Welcome" }],
    activeId: WELCOME_START_TAB_ID,
  };
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
    clean.push({ id, name });
  }
  if (!welcomeRemoved && !seen.has(WELCOME_START_TAB_ID)) {
    clean.unshift({ id: WELCOME_START_TAB_ID, name: "Welcome" });
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
    const welcomeRemoved = !!parsed?.welcomeRemoved;
    const tabs = sanitizeTabs(parsed?.tabs, welcomeRemoved);
    const activeId = tabs.some((tab) => tab.id === parsed?.activeId) ? parsed.activeId : tabs[0]?.id || null;
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

export function newStartTabId() {
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function duplicateTabName(name, existingNames) {
  const taken = new Set(existingNames);
  const base = `${String(name || "Tab").trim() || "Tab"} copy`;
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}
