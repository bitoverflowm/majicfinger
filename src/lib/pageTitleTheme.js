import { cn } from "@/lib/utils";

/** Persisted under `draft.theme.pageTitle` / `draft.theme.pageSubheading` on chart dashboards. */

/** @typedef {"pageTitle" | "pageSubheading"} PageTextBlockKey */

export const DEFAULT_PAGE_TITLE_THEME = {
  textAlign: "left",
  bold: true,
  italic: false,
  underline: false,
  strikethrough: false,
  color: "",
  fontSize: "3xl",
  fontFamily: "sans",
};

export const DEFAULT_PAGE_SUBHEADING_THEME = {
  textAlign: "left",
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  color: "",
  fontSize: "base",
  fontFamily: "sans",
};

/** Shown in the composer when `page_subheading` is empty. */
export const PAGE_SUBHEADING_PLACEHOLDER =
  "Your subheading description goes here. Click to edit.";

/** Smooth updates when the format dock changes color / size / line-height (composer + sidebar preview). */
const PAGE_TEXT_THEME_TRANSITION =
  "color 320ms cubic-bezier(0.4, 0, 0.2, 1), font-size 380ms cubic-bezier(0.4, 0, 0.2, 1), line-height 380ms cubic-bezier(0.4, 0, 0.2, 1)";

const FONT_SIZE_REM = {
  xs: "0.6875rem",
  sm: "1.125rem",
  base: "1.375rem",
  lg: "1.625rem",
  xl: "1.875rem",
  "2xl": "2rem",
  "3xl": "2.25rem",
  "4xl": "2.75rem",
};

function defaultBlockTheme(block) {
  return block === "pageSubheading" ? DEFAULT_PAGE_SUBHEADING_THEME : DEFAULT_PAGE_TITLE_THEME;
}

function blockStorageKey(block) {
  return block === "pageSubheading" ? "pageSubheading" : "pageTitle";
}

export function mergePageTextBlockTheme(theme, block) {
  const t = theme && typeof theme === "object" ? theme : {};
  const key = blockStorageKey(block);
  const pt = t[key] && typeof t[key] === "object" ? t[key] : {};
  return { ...defaultBlockTheme(block), ...pt };
}

export function getPageTextBlockEditorClasses(theme, block) {
  const pt = mergePageTextBlockTheme(theme, block);
  return cn(
    pt.textAlign === "center" ? "text-center" : pt.textAlign === "right" ? "text-right" : "text-left",
    pt.bold ? "font-bold" : "font-normal",
    pt.italic ? "italic" : "not-italic",
    pt.underline ? "underline" : "",
    pt.strikethrough ? "line-through" : "",
    pt.fontFamily === "serif" ? "font-serif" : pt.fontFamily === "mono" ? "font-mono" : "font-sans",
  );
}

export function getPageTextBlockEditorStyle(theme, block) {
  const pt = mergePageTextBlockTheme(theme, block);
  const fallback = block === "pageSubheading" ? "base" : "3xl";
  const style = {
    fontSize: FONT_SIZE_REM[pt.fontSize] || FONT_SIZE_REM[fallback],
    /** Unitless ratio scales with font-size. Composer `<textarea>` inherits `text-sm` line-height (~1.25rem) otherwise, which clashes with large theme sizes and collapses lines. */
    lineHeight: block === "pageSubheading" ? 1.45 : 1.2,
    transition: PAGE_TEXT_THEME_TRANSITION,
  };
  if (pt.color && pt.color.trim()) style.color = pt.color;
  return style;
}

export function getPageTextBlockSidebarClasses(theme, block) {
  return getPageTextBlockEditorClasses(theme, block);
}

export function getPageTextBlockSidebarStyle(theme, block) {
  const pt = mergePageTextBlockTheme(theme, block);
  const style = {
    fontSize: "0.875rem",
    lineHeight: block === "pageSubheading" ? 1.5 : 1.4,
    transition: PAGE_TEXT_THEME_TRANSITION,
  };
  if (pt.color && pt.color.trim()) style.color = pt.color;
  return style;
}

export function getPageTextBlockPublicClassName(theme, block) {
  const pt = mergePageTextBlockTheme(theme, block);
  return cn(
    "tracking-tight text-foreground",
    pt.textAlign === "center" ? "text-center" : pt.textAlign === "right" ? "text-right" : "text-left",
    pt.bold ? "font-bold" : "font-normal",
    pt.italic ? "italic" : "not-italic",
    pt.underline ? "underline" : "",
    pt.strikethrough ? "line-through" : "",
    pt.fontFamily === "serif" ? "font-serif" : pt.fontFamily === "mono" ? "font-mono" : "font-sans",
  );
}

export function getPageTextBlockPublicStyle(theme, block) {
  return getPageTextBlockEditorStyle(theme, block);
}

// --- Page title (H1): backward-compatible exports ---

export function mergePageTitleTheme(theme) {
  return mergePageTextBlockTheme(theme, "pageTitle");
}

export function getPageTitleEditorClasses(theme) {
  return getPageTextBlockEditorClasses(theme, "pageTitle");
}

export function getPageTitleEditorStyle(theme) {
  return getPageTextBlockEditorStyle(theme, "pageTitle");
}

export function getPageTitleSidebarClasses(theme) {
  return getPageTextBlockSidebarClasses(theme, "pageTitle");
}

export function getPageTitleSidebarStyle(theme) {
  return getPageTextBlockSidebarStyle(theme, "pageTitle");
}

export function getPageTitlePublicClassName(theme) {
  return getPageTextBlockPublicClassName(theme, "pageTitle");
}

export function getPageTitlePublicStyle(theme) {
  return getPageTextBlockPublicStyle(theme, "pageTitle");
}
