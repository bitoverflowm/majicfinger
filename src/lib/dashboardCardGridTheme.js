import {
  DEFAULT_PAGE_SUBHEADING_THEME,
  DEFAULT_PAGE_TITLE_THEME,
  getPageTextBlockEditorClasses,
  getPageTextBlockEditorStyle,
  getPageTextBlockPublicClassName,
  getPageTextBlockPublicStyle,
} from "@/lib/pageTitleTheme";

export const DEFAULT_CARD_GRID_SECTION_HEADING_THEME = {
  ...DEFAULT_PAGE_TITLE_THEME,
  fontSize: "2xl",
};

export const DEFAULT_CARD_GRID_SECTION_SUBHEADING_THEME = {
  ...DEFAULT_PAGE_SUBHEADING_THEME,
  fontSize: "sm",
};

export const DEFAULT_CARD_GRID_RANK_THEME = {
  ...DEFAULT_PAGE_SUBHEADING_THEME,
  fontSize: "xs",
  bold: true,
};

export const DEFAULT_CARD_GRID_HEADER_THEME = {
  ...DEFAULT_PAGE_TITLE_THEME,
  fontSize: "lg",
};

export const DEFAULT_CARD_GRID_SUBHEADER_THEME = {
  ...DEFAULT_PAGE_SUBHEADING_THEME,
  fontSize: "sm",
};

export const DEFAULT_CARD_GRID_TAGS_THEME = {
  ...DEFAULT_PAGE_SUBHEADING_THEME,
  fontSize: "xs",
  bold: false,
};

export const DEFAULT_CARD_GRID_VALUE_THEME = {
  ...DEFAULT_PAGE_TITLE_THEME,
  fontSize: "xl",
};

const FIELD_THEME_KEYS = {
  rank: "rankTheme",
  header: "headerTheme",
  subheader: "subheaderTheme",
  tags: "tagsTheme",
  value: "valueTheme",
};

const FIELD_THEME_DEFAULTS = {
  rank: DEFAULT_CARD_GRID_RANK_THEME,
  header: DEFAULT_CARD_GRID_HEADER_THEME,
  subheader: DEFAULT_CARD_GRID_SUBHEADER_THEME,
  tags: DEFAULT_CARD_GRID_TAGS_THEME,
  value: DEFAULT_CARD_GRID_VALUE_THEME,
};

export function mergeCardGridSectionHeadingTheme(row) {
  const pt =
    row?.sectionHeadingTheme && typeof row.sectionHeadingTheme === "object"
      ? row.sectionHeadingTheme
      : {};
  return { ...DEFAULT_CARD_GRID_SECTION_HEADING_THEME, ...pt };
}

export function mergeCardGridSectionSubheadingTheme(row) {
  const pt =
    row?.sectionSubheadingTheme && typeof row.sectionSubheadingTheme === "object"
      ? row.sectionSubheadingTheme
      : {};
  return { ...DEFAULT_CARD_GRID_SECTION_SUBHEADING_THEME, ...pt };
}

export function mergeCardGridFieldTheme(row, field) {
  const key = FIELD_THEME_KEYS[field];
  const defaults = FIELD_THEME_DEFAULTS[field] || DEFAULT_PAGE_SUBHEADING_THEME;
  const pt = key && row?.[key] && typeof row[key] === "object" ? row[key] : {};
  return { ...defaults, ...pt };
}

function themeAsPageTitle(theme) {
  return getPageTextBlockEditorClasses({ pageTitle: theme }, "pageTitle");
}

function themeAsPageTitleStyle(theme) {
  return getPageTextBlockEditorStyle({ pageTitle: theme }, "pageTitle");
}

function themeAsPageSubheading(theme) {
  return getPageTextBlockEditorClasses({ pageSubheading: theme }, "pageSubheading");
}

function themeAsPageSubheadingStyle(theme) {
  return getPageTextBlockEditorStyle({ pageSubheading: theme }, "pageSubheading");
}

export function getCardGridSectionHeadingEditorClasses(row) {
  return themeAsPageTitle(mergeCardGridSectionHeadingTheme(row));
}

export function getCardGridSectionHeadingEditorStyle(row) {
  return themeAsPageTitleStyle(mergeCardGridSectionHeadingTheme(row));
}

export function getCardGridSectionSubheadingEditorClasses(row) {
  return themeAsPageSubheading(mergeCardGridSectionSubheadingTheme(row));
}

export function getCardGridSectionSubheadingEditorStyle(row) {
  return themeAsPageSubheadingStyle(mergeCardGridSectionSubheadingTheme(row));
}

export function getCardGridFieldEditorClasses(row, field) {
  const theme = mergeCardGridFieldTheme(row, field);
  if (field === "header" || field === "value") {
    return themeAsPageTitle(theme);
  }
  return themeAsPageSubheading(theme);
}

export function getCardGridFieldEditorStyle(row, field) {
  const theme = mergeCardGridFieldTheme(row, field);
  if (field === "header" || field === "value") {
    return themeAsPageTitleStyle(theme);
  }
  return themeAsPageSubheadingStyle(theme);
}

export function getCardGridSectionHeadingPublicClassName(row) {
  return getPageTextBlockPublicClassName(
    { pageTitle: mergeCardGridSectionHeadingTheme(row) },
    "pageTitle",
  );
}

export function getCardGridSectionHeadingPublicStyle(row) {
  return getPageTextBlockPublicStyle(
    { pageTitle: mergeCardGridSectionHeadingTheme(row) },
    "pageTitle",
  );
}

export function getCardGridSectionSubheadingPublicClassName(row) {
  return getPageTextBlockPublicClassName(
    { pageSubheading: mergeCardGridSectionSubheadingTheme(row) },
    "pageSubheading",
  );
}

export function getCardGridSectionSubheadingPublicStyle(row) {
  return getPageTextBlockPublicStyle(
    { pageSubheading: mergeCardGridSectionSubheadingTheme(row) },
    "pageSubheading",
  );
}

export function getCardGridFieldPublicClassName(row, field) {
  const theme = mergeCardGridFieldTheme(row, field);
  if (field === "header" || field === "value") {
    return getPageTextBlockPublicClassName({ pageTitle: theme }, "pageTitle");
  }
  return getPageTextBlockPublicClassName({ pageSubheading: theme }, "pageSubheading");
}

export function getCardGridFieldPublicStyle(row, field) {
  const theme = mergeCardGridFieldTheme(row, field);
  if (field === "header" || field === "value") {
    return getPageTextBlockPublicStyle({ pageTitle: theme }, "pageTitle");
  }
  return getPageTextBlockPublicStyle({ pageSubheading: theme }, "pageSubheading");
}

export function patchCardGridRowTheme(setChartDashboardDraft, rowId, themeKey, defaults, partial) {
  setChartDashboardDraft?.((prev) => {
    if (!prev) return prev;
    const layout = prev.layout && typeof prev.layout === "object" ? prev.layout : { version: 1, rows: [] };
    const rows = Array.isArray(layout.rows) ? layout.rows : [];
    const nextRows = rows.map((r) => {
      if (r.id !== rowId || r.type !== "cardGrid") return r;
      const prevBlock = r[themeKey] && typeof r[themeKey] === "object" ? r[themeKey] : {};
      const nextBlock = { ...defaults, ...prevBlock, ...partial };
      return { ...r, [themeKey]: nextBlock };
    });
    return { ...prev, layout: { ...layout, rows: nextRows } };
  });
}

export function isPageFormatDockCardGridSectionHeadingTarget(t) {
  return !!(t && typeof t === "object" && t.type === "cardGridSectionHeading" && t.rowId);
}

export function isPageFormatDockCardGridSectionSubheadingTarget(t) {
  return !!(t && typeof t === "object" && t.type === "cardGridSectionSubheading" && t.rowId);
}

export function isPageFormatDockCardGridFieldTarget(t) {
  return !!(
    t &&
    typeof t === "object" &&
    t.type === "cardGridField" &&
    t.rowId &&
    t.field
  );
}
