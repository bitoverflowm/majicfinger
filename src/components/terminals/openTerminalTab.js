import { findTerminal, sanitizeTerminalSubject, terminalSubjectTabName, terminalTabName } from "@/lib/workspaceTerminals";
import { newStartTabId, saveWorkspaceStartTabs } from "@/lib/workspaceStartTabs";

/** The landing demo keeps its tabs for this visit only. */
function commitTabs(ctx, nextTabs, accountId, activeId) {
  ctx?.setWorkspaceStartTabs?.(nextTabs);
  if (ctx?.landingDemo) return;
  saveWorkspaceStartTabs(accountId || "local", {
    welcomeRemoved: !!ctx?.welcomeTabRemoved,
    tabs: nextTabs,
    activeId: activeId || ctx?.activeWorkspaceStartTabId || null,
  });
}

export function terminalTab(terminal, subject, takenNames) {
  const clean = sanitizeTerminalSubject(subject);
  return {
    id: newStartTabId(),
    name: clean ? terminalSubjectTabName(clean, terminal.title) : terminalTabName(terminal.title, takenNames),
    blank: true,
    terminal: terminal.id,
    ...(clean ? { terminalSubject: clean } : {}),
  };
}

/** Adds a tab for the terminal and switches to it. */
export function openTerminalTab({ terminalId, ctx, canvas, accountId, subject = null }) {
  const terminal = findTerminal(terminalId);
  if (!terminal) return null;
  const tabs = Array.isArray(ctx?.workspaceStartTabs) ? ctx.workspaceStartTabs : [];
  const tab = terminalTab(terminal, subject, tabs.map((item) => item.name));
  commitTabs(ctx, [...tabs, tab], accountId, tab.id);
  if (canvas?.requestTab) {
    canvas.requestTab(tab.id);
  } else {
    ctx?.setActiveWorkspaceStartTabId?.(tab.id);
    ctx?.setViewing?.("welcome");
  }
  return tab.id;
}

/** A new terminal project holding just this terminal's tab, for `createWorkspaceProject`. */
export function terminalProjectDraft(terminalId, subject = null) {
  const terminal = findTerminal(terminalId);
  if (!terminal) return null;
  const tab = terminalTab(terminal, subject, []);
  return {
    name: terminal.title,
    kind: "terminal",
    tabs: [tab],
    active_tab_id: tab.id,
    welcome_removed: true,
  };
}

/**
 * Points `tabId` at the first subject and opens one more terminal tab for each of the rest,
 * all in one update. The open tab stays on screen.
 */
export function placeTerminalSubjects({ ctx, tabId, subjects, accountId }) {
  const tabs = Array.isArray(ctx?.workspaceStartTabs) ? ctx.workspaceStartTabs : [];
  const host = tabs.find((tab) => tab.id === tabId);
  const terminal = findTerminal(host?.terminal);
  const clean = (subjects || []).map(sanitizeTerminalSubject).filter(Boolean);
  if (!host || !terminal || !clean.length) return [];
  const [first, ...rest] = clean;
  const added = rest.map((subject) => terminalTab(terminal, subject, []));
  const nextTabs = [
    ...tabs.map((tab) =>
      tab.id === tabId ? { ...tab, terminalSubject: first, name: terminalSubjectTabName(first, terminal.title) } : tab,
    ),
    ...added,
  ];
  commitTabs(ctx, nextTabs, accountId, tabId);
  return [tabId, ...added.map((tab) => tab.id)];
}
