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
import {
  isPageFormatDockFreeTextHeadingTarget,
  isPageFormatDockFreeTextParagraphTarget,
  mergeFreeTextRowTheme,
  patchDashboardFreeTextRowTheme,
} from "@/lib/dashboardFreeTextTheme";
import {
  DEFAULT_CARD_GRID_HEADER_THEME,
  DEFAULT_CARD_GRID_RANK_THEME,
  DEFAULT_CARD_GRID_SECTION_HEADING_THEME,
  DEFAULT_CARD_GRID_SECTION_SUBHEADING_THEME,
  DEFAULT_CARD_GRID_SUBHEADER_THEME,
  DEFAULT_CARD_GRID_TAGS_THEME,
  DEFAULT_CARD_GRID_VALUE_THEME,
  isPageFormatDockCardGridFieldTarget,
  isPageFormatDockCardGridSectionHeadingTarget,
  isPageFormatDockCardGridSectionSubheadingTarget,
  mergeCardGridFieldTheme,
  mergeCardGridSectionHeadingTheme,
  mergeCardGridSectionSubheadingTheme,
  patchCardGridRowTheme,
} from "@/lib/dashboardCardGridTheme";

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

  if (isPageFormatDockFreeTextHeadingTarget(t) || isPageFormatDockFreeTextParagraphTarget(t)) {
    const rows = draft.layout?.rows;
    const row = Array.isArray(rows) ? rows.find((r) => r.id === t.rowId && r.type === "text") : null;
    if (!row) return null;
    const isHeading = isPageFormatDockFreeTextHeadingTarget(t);
    return {
      pt: mergeFreeTextRowTheme(row),
      dockLabel: isHeading ? "Heading" : "Paragraph",
      ariaLabel: isHeading ? "Heading formatting" : "Paragraph formatting",
      patchPartial: (partial) => patchDashboardFreeTextRowTheme(setChartDashboardDraft, t.rowId, partial),
    };
  }

  if (isPageFormatDockCardGridSectionHeadingTarget(t)) {
    const rows = draft.layout?.rows;
    const row = Array.isArray(rows) ? rows.find((r) => r.id === t.rowId && r.type === "cardGrid") : null;
    if (!row) return null;
    return {
      pt: mergeCardGridSectionHeadingTheme(row),
      dockLabel: "Section title",
      ariaLabel: "Card section title formatting",
      patchPartial: (partial) =>
        patchCardGridRowTheme(
          setChartDashboardDraft,
          t.rowId,
          "sectionHeadingTheme",
          DEFAULT_CARD_GRID_SECTION_HEADING_THEME,
          partial,
        ),
    };
  }

  if (isPageFormatDockCardGridSectionSubheadingTarget(t)) {
    const rows = draft.layout?.rows;
    const row = Array.isArray(rows) ? rows.find((r) => r.id === t.rowId && r.type === "cardGrid") : null;
    if (!row) return null;
    return {
      pt: mergeCardGridSectionSubheadingTheme(row),
      dockLabel: "Section subtitle",
      ariaLabel: "Card section subtitle formatting",
      patchPartial: (partial) =>
        patchCardGridRowTheme(
          setChartDashboardDraft,
          t.rowId,
          "sectionSubheadingTheme",
          DEFAULT_CARD_GRID_SECTION_SUBHEADING_THEME,
          partial,
        ),
    };
  }

  if (isPageFormatDockCardGridFieldTarget(t)) {
    const rows = draft.layout?.rows;
    const row = Array.isArray(rows) ? rows.find((r) => r.id === t.rowId && r.type === "cardGrid") : null;
    if (!row) return null;
    const field = t.field;
    const themeDefaults = {
      rank: DEFAULT_CARD_GRID_RANK_THEME,
      header: DEFAULT_CARD_GRID_HEADER_THEME,
      subheader: DEFAULT_CARD_GRID_SUBHEADER_THEME,
      tags: DEFAULT_CARD_GRID_TAGS_THEME,
      value: DEFAULT_CARD_GRID_VALUE_THEME,
    };
    const themeKeys = {
      rank: "rankTheme",
      header: "headerTheme",
      subheader: "subheaderTheme",
      tags: "tagsTheme",
      value: "valueTheme",
    };
    const labels = {
      rank: "Rank",
      header: "Card header",
      subheader: "Card subheader",
      tags: "Tags",
      value: "Value",
    };
    const defaults = themeDefaults[field];
    const themeKey = themeKeys[field];
    if (!defaults || !themeKey) return null;
    return {
      pt: mergeCardGridFieldTheme(row, field),
      dockLabel: labels[field] || "Card field",
      ariaLabel: `${labels[field] || "Card field"} formatting`,
      patchPartial: (partial) =>
        patchCardGridRowTheme(setChartDashboardDraft, t.rowId, themeKey, defaults, partial),
    };
  }

  return null;
}
