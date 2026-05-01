import { cn } from "@/lib/utils";

/** Persisted under `draft.theme.pageTitle` on chart dashboards. */

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

const FONT_SIZE_REM = {
  sm: "1.125rem",
  base: "1.375rem",
  lg: "1.625rem",
  xl: "1.875rem",
  "2xl": "2rem",
  "3xl": "2.25rem",
  "4xl": "2.75rem",
};

export function mergePageTitleTheme(theme) {
  const t = theme && typeof theme === "object" ? theme : {};
  const pt = t.pageTitle && typeof t.pageTitle === "object" ? t.pageTitle : {};
  return { ...DEFAULT_PAGE_TITLE_THEME, ...pt };
}

export function getPageTitleEditorClasses(theme) {
  const pt = mergePageTitleTheme(theme);
  return cn(
    pt.textAlign === "center" ? "text-center" : pt.textAlign === "right" ? "text-right" : "text-left",
    pt.bold ? "font-bold" : "font-normal",
    pt.italic ? "italic" : "not-italic",
    pt.underline ? "underline" : "",
    pt.strikethrough ? "line-through" : "",
    pt.fontFamily === "serif" ? "font-serif" : pt.fontFamily === "mono" ? "font-mono" : "font-sans",
  );
}

/** Main canvas title: full font size from theme. */
export function getPageTitleEditorStyle(theme) {
  const pt = mergePageTitleTheme(theme);
  const style = {
    fontSize: FONT_SIZE_REM[pt.fontSize] || FONT_SIZE_REM["3xl"],
  };
  if (pt.color && pt.color.trim()) style.color = pt.color;
  return style;
}

/** Sidebar page title field: same formatting, capped size for the panel. */
export function getPageTitleSidebarClasses(theme) {
  return getPageTitleEditorClasses(theme);
}

export function getPageTitleSidebarStyle(theme) {
  const pt = mergePageTitleTheme(theme);
  const style = { fontSize: "0.875rem" };
  if (pt.color && pt.color.trim()) style.color = pt.color;
  return style;
}

/** Public / embed view. */
export function getPageTitlePublicClassName(theme) {
  const pt = mergePageTitleTheme(theme);
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

export function getPageTitlePublicStyle(theme) {
  return getPageTitleEditorStyle(theme);
}
