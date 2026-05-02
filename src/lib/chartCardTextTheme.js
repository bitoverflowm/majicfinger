import {
  DEFAULT_PAGE_SUBHEADING_THEME,
  DEFAULT_PAGE_TITLE_THEME,
  getPageTextBlockEditorClasses,
  getPageTextBlockEditorStyle,
  getPageTextBlockPublicClassName,
  getPageTextBlockPublicStyle,
} from "@/lib/pageTitleTheme";

/** Slightly smaller than page H1 (`3xl`) so card titles don’t dominate the canvas. */
export const DEFAULT_CHART_CARD_HEADING_THEME = {
  ...DEFAULT_PAGE_TITLE_THEME,
  fontSize: "2xl",
};

/** One step smaller than page subheading (`base`) for card captions. */
export const DEFAULT_CHART_CARD_SUBHEADING_THEME = {
  ...DEFAULT_PAGE_SUBHEADING_THEME,
  fontSize: "sm",
};

/** Fine print under the chart; defaults near legacy ~11px microtext. */
export const DEFAULT_CHART_CARD_MICROTEXT_THEME = {
  ...DEFAULT_PAGE_SUBHEADING_THEME,
  fontSize: "xs",
  bold: false,
};

export function mergeChartCardHeadingTheme(col) {
  const pt =
    col?.chartHeadingTheme && typeof col.chartHeadingTheme === "object"
      ? col.chartHeadingTheme
      : {};
  return { ...DEFAULT_CHART_CARD_HEADING_THEME, ...pt };
}

export function mergeChartCardSubheadingTheme(col) {
  const pt =
    col?.chartSubheadingTheme && typeof col.chartSubheadingTheme === "object"
      ? col.chartSubheadingTheme
      : {};
  return { ...DEFAULT_CHART_CARD_SUBHEADING_THEME, ...pt };
}

export function mergeChartCardMicrotextTheme(col) {
  const pt =
    col?.chartMicrotextTheme && typeof col.chartMicrotextTheme === "object"
      ? col.chartMicrotextTheme
      : {};
  return { ...DEFAULT_CHART_CARD_MICROTEXT_THEME, ...pt };
}

export function getChartCardHeadingEditorClasses(col) {
  return getPageTextBlockEditorClasses({ pageTitle: mergeChartCardHeadingTheme(col) }, "pageTitle");
}

export function getChartCardHeadingEditorStyle(col) {
  return getPageTextBlockEditorStyle({ pageTitle: mergeChartCardHeadingTheme(col) }, "pageTitle");
}

export function getChartCardSubheadingEditorClasses(col) {
  return getPageTextBlockEditorClasses(
    { pageSubheading: mergeChartCardSubheadingTheme(col) },
    "pageSubheading",
  );
}

export function getChartCardSubheadingEditorStyle(col) {
  return getPageTextBlockEditorStyle(
    { pageSubheading: mergeChartCardSubheadingTheme(col) },
    "pageSubheading",
  );
}

export function getChartCardHeadingPublicClassName(col) {
  return getPageTextBlockPublicClassName({ pageTitle: mergeChartCardHeadingTheme(col) }, "pageTitle");
}

export function getChartCardHeadingPublicStyle(col) {
  return getPageTextBlockPublicStyle({ pageTitle: mergeChartCardHeadingTheme(col) }, "pageTitle");
}

export function getChartCardSubheadingPublicClassName(col) {
  return getPageTextBlockPublicClassName(
    { pageSubheading: mergeChartCardSubheadingTheme(col) },
    "pageSubheading",
  );
}

export function getChartCardSubheadingPublicStyle(col) {
  return getPageTextBlockPublicStyle(
    { pageSubheading: mergeChartCardSubheadingTheme(col) },
    "pageSubheading",
  );
}

export function getChartCardMicrotextEditorClasses(col) {
  return getPageTextBlockEditorClasses(
    { pageSubheading: mergeChartCardMicrotextTheme(col) },
    "pageSubheading",
  );
}

export function getChartCardMicrotextEditorStyle(col) {
  return getPageTextBlockEditorStyle(
    { pageSubheading: mergeChartCardMicrotextTheme(col) },
    "pageSubheading",
  );
}

export function getChartCardMicrotextPublicClassName(col) {
  return getPageTextBlockPublicClassName(
    { pageSubheading: mergeChartCardMicrotextTheme(col) },
    "pageSubheading",
  );
}

export function getChartCardMicrotextPublicStyle(col) {
  return getPageTextBlockPublicStyle(
    { pageSubheading: mergeChartCardMicrotextTheme(col) },
    "pageSubheading",
  );
}

/**
 * @param {"heading" | "subheading" | "microtext"} block
 */
export function patchChartDashboardCardTextTheme(setChartDashboardDraft, rowId, colId, block, partial) {
  const key =
    block === "subheading"
      ? "chartSubheadingTheme"
      : block === "microtext"
        ? "chartMicrotextTheme"
        : "chartHeadingTheme";
  const defaults =
    block === "subheading"
      ? DEFAULT_CHART_CARD_SUBHEADING_THEME
      : block === "microtext"
        ? DEFAULT_CHART_CARD_MICROTEXT_THEME
        : DEFAULT_CHART_CARD_HEADING_THEME;
  setChartDashboardDraft?.((prev) => {
    if (!prev) return prev;
    const layout = prev.layout && typeof prev.layout === "object" ? prev.layout : { version: 1, rows: [] };
    const rows = Array.isArray(layout.rows) ? layout.rows : [];
    const nextRows = rows.map((r) => {
      if (r.id !== rowId || r.type !== "cards" || !Array.isArray(r.columns)) return r;
      const columns = r.columns.map((c) => {
        if (c.id !== colId) return c;
        const prevBlock = c[key] && typeof c[key] === "object" ? c[key] : {};
        const nextBlock = { ...defaults, ...prevBlock, ...partial };
        return { ...c, [key]: nextBlock };
      });
      return { ...r, columns };
    });
    return { ...prev, layout: { ...layout, rows: nextRows } };
  });
}

export function isPageFormatDockChartHeadingTarget(t) {
  return !!(t && typeof t === "object" && t.type === "chartHeading" && t.rowId && t.colId);
}

export function isPageFormatDockChartSubheadingTarget(t) {
  return !!(t && typeof t === "object" && t.type === "chartSubheading" && t.rowId && t.colId);
}

export function isPageFormatDockChartMicrotextTarget(t) {
  return !!(t && typeof t === "object" && t.type === "chartMicrotext" && t.rowId && t.colId);
}
