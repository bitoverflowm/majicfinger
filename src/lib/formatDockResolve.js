import {
  DEFAULT_PAGE_SUBHEADING_THEME,
  DEFAULT_PAGE_TITLE_THEME,
  mergePageTextBlockTheme,
} from "@/lib/pageTitleTheme";
import {
  isPageFormatDockChartHeadingTarget,
  isPageFormatDockChartMicrotextTarget,
  isPageFormatDockChartSubheadingTarget,
  mergeChartCardHeadingTheme,
  mergeChartCardMicrotextTheme,
  mergeChartCardSubheadingTheme,
  patchChartDashboardCardTextTheme,
} from "@/lib/chartCardTextTheme";

/**
 * Resolved state for the page/chart text format toolbar.
 * @param {unknown} t pageFormatDockTarget
 * @param {object|null} draft chartDashboardDraft
 * @param {Function|null} setChartDashboardDraft
 */
export function resolveFormatDockTarget(t, draft, setChartDashboardDraft) {
  if (!t || !draft) return null;

  if (t === "pageTitle") {
    return {
      pt: mergePageTextBlockTheme(draft.theme, "pageTitle"),
      dockLabel: "Title",
      ariaLabel: "Title formatting",
      patchPartial: (partial) => {
        setChartDashboardDraft?.((prev) => {
          if (!prev) return prev;
          const theme = prev.theme && typeof prev.theme === "object" ? prev.theme : {};
          const prevBlock =
            theme.pageTitle && typeof theme.pageTitle === "object" ? theme.pageTitle : {};
          const nextBlock = { ...DEFAULT_PAGE_TITLE_THEME, ...prevBlock, ...partial };
          return { ...prev, theme: { ...theme, pageTitle: nextBlock } };
        });
      },
    };
  }

  if (t === "pageSubheading") {
    return {
      pt: mergePageTextBlockTheme(draft.theme, "pageSubheading"),
      dockLabel: "Subheading",
      ariaLabel: "Subheading formatting",
      patchPartial: (partial) => {
        setChartDashboardDraft?.((prev) => {
          if (!prev) return prev;
          const theme = prev.theme && typeof prev.theme === "object" ? prev.theme : {};
          const prevBlock =
            theme.pageSubheading && typeof theme.pageSubheading === "object"
              ? theme.pageSubheading
              : {};
          const nextBlock = { ...DEFAULT_PAGE_SUBHEADING_THEME, ...prevBlock, ...partial };
          return { ...prev, theme: { ...theme, pageSubheading: nextBlock } };
        });
      },
    };
  }

  if (isPageFormatDockChartHeadingTarget(t)) {
    const rows = draft.layout?.rows;
    const row = Array.isArray(rows) ? rows.find((r) => r.id === t.rowId) : null;
    const col = row?.columns?.find((c) => c.id === t.colId);
    if (!col) return null;
    return {
      pt: mergeChartCardHeadingTheme(col),
      dockLabel: "Chart title",
      ariaLabel: "Chart title formatting",
      patchPartial: (partial) =>
        patchChartDashboardCardTextTheme(setChartDashboardDraft, t.rowId, t.colId, "heading", partial),
    };
  }

  if (isPageFormatDockChartSubheadingTarget(t)) {
    const rows = draft.layout?.rows;
    const row = Array.isArray(rows) ? rows.find((r) => r.id === t.rowId) : null;
    const col = row?.columns?.find((c) => c.id === t.colId);
    if (!col) return null;
    return {
      pt: mergeChartCardSubheadingTheme(col),
      dockLabel: "Chart subheading",
      ariaLabel: "Chart subheading formatting",
      patchPartial: (partial) =>
        patchChartDashboardCardTextTheme(setChartDashboardDraft, t.rowId, t.colId, "subheading", partial),
    };
  }

  if (isPageFormatDockChartMicrotextTarget(t)) {
    const rows = draft.layout?.rows;
    const row = Array.isArray(rows) ? rows.find((r) => r.id === t.rowId) : null;
    const col = row?.columns?.find((c) => c.id === t.colId);
    if (!col) return null;
    return {
      pt: mergeChartCardMicrotextTheme(col),
      dockLabel: "Microtext",
      ariaLabel: "Microtext formatting",
      patchPartial: (partial) =>
        patchChartDashboardCardTextTheme(setChartDashboardDraft, t.rowId, t.colId, "microtext", partial),
    };
  }

  return null;
}
