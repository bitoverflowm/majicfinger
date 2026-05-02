import {
  DEFAULT_PAGE_SUBHEADING_THEME,
  DEFAULT_PAGE_TITLE_THEME,
  getPageTextBlockEditorClasses,
  getPageTextBlockEditorStyle,
  getPageTextBlockPublicClassName,
  getPageTextBlockPublicStyle,
} from "@/lib/pageTitleTheme";

/** Placeholder copy for new free text blocks (composer + until user edits). */
export const DASHBOARD_FREE_TEXT_PLACEHOLDER = "Add your text here";

export const DEFAULT_FREE_TEXT_HEADING_THEME = {
  ...DEFAULT_PAGE_TITLE_THEME,
  fontSize: "2xl",
};

export const DEFAULT_FREE_TEXT_PARAGRAPH_THEME = {
  ...DEFAULT_PAGE_SUBHEADING_THEME,
  fontSize: "base",
};

export function mergeFreeTextRowTheme(row) {
  const variant = row?.textVariant === "heading" ? "heading" : "paragraph";
  const defaults =
    variant === "heading" ? DEFAULT_FREE_TEXT_HEADING_THEME : DEFAULT_FREE_TEXT_PARAGRAPH_THEME;
  const pt = row?.textTheme && typeof row.textTheme === "object" ? row.textTheme : {};
  return { ...defaults, ...pt };
}

export function getFreeTextRowEditorClasses(row) {
  const merged = mergeFreeTextRowTheme(row);
  if (row?.textVariant === "heading") {
    return getPageTextBlockEditorClasses({ pageTitle: merged }, "pageTitle");
  }
  return getPageTextBlockEditorClasses({ pageSubheading: merged }, "pageSubheading");
}

export function getFreeTextRowEditorStyle(row) {
  const merged = mergeFreeTextRowTheme(row);
  if (row?.textVariant === "heading") {
    return getPageTextBlockEditorStyle({ pageTitle: merged }, "pageTitle");
  }
  return getPageTextBlockEditorStyle({ pageSubheading: merged }, "pageSubheading");
}

export function getFreeTextRowPublicClassName(row) {
  const merged = mergeFreeTextRowTheme(row);
  if (row?.textVariant === "heading") {
    return getPageTextBlockPublicClassName({ pageTitle: merged }, "pageTitle");
  }
  return getPageTextBlockPublicClassName({ pageSubheading: merged }, "pageSubheading");
}

export function getFreeTextRowPublicStyle(row) {
  const merged = mergeFreeTextRowTheme(row);
  if (row?.textVariant === "heading") {
    return getPageTextBlockPublicStyle({ pageTitle: merged }, "pageTitle");
  }
  return getPageTextBlockPublicStyle({ pageSubheading: merged }, "pageSubheading");
}

export function patchDashboardFreeTextRowTheme(setChartDashboardDraft, rowId, partial) {
  setChartDashboardDraft?.((prev) => {
    if (!prev) return prev;
    const layout = prev.layout && typeof prev.layout === "object" ? prev.layout : { version: 1, rows: [] };
    const rows = Array.isArray(layout.rows) ? layout.rows : [];
    const nextRows = rows.map((r) => {
      if (r.id !== rowId || r.type !== "text") return r;
      const prevBlock = r.textTheme && typeof r.textTheme === "object" ? r.textTheme : {};
      const base =
        r.textVariant === "heading" ? DEFAULT_FREE_TEXT_HEADING_THEME : DEFAULT_FREE_TEXT_PARAGRAPH_THEME;
      const nextBlock = { ...base, ...prevBlock, ...partial };
      return { ...r, textTheme: nextBlock };
    });
    return { ...prev, layout: { ...layout, rows: nextRows } };
  });
}

export function isPageFormatDockFreeTextHeadingTarget(t) {
  return !!(t && typeof t === "object" && t.type === "freeTextHeading" && t.rowId);
}

export function isPageFormatDockFreeTextParagraphTarget(t) {
  return !!(t && typeof t === "object" && t.type === "freeTextParagraph" && t.rowId);
}
