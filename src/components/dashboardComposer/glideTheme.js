export function glideThemeFor(dark, fontFamily) {
  const shared = {
    accentColor: "#0d99ff",
    accentFg: "#ffffff",
    accentLight: "rgba(13, 153, 255, 0.16)",
    fontFamily,
    headerFontStyle: "600 12px",
    baseFontStyle: "13px",
    markerFontStyle: "12px",
    editorFontSize: "13px",
    headerIconSize: 16,
    lineHeight: 1.35,
    cellHorizontalPadding: 8,
    cellVerticalPadding: 3,
    drilldownBorder: "#0d99ff",
    linkColor: "#0d99ff",
  };
  if (dark) {
    return {
      ...shared,
      textDark: "#f4f4f5",
      textMedium: "#a1a1aa",
      textLight: "#71717a",
      textBubble: "#f4f4f5",
      textHeader: "#d4d4d8",
      textHeaderSelected: "#ffffff",
      bgIconHeader: "#a1a1aa",
      fgIconHeader: "#18181b",
      bgCell: "#222226",
      bgCellMedium: "#2a2a2e",
      bgHeader: "#2a2a2e",
      bgHeaderHasFocus: "#34343a",
      bgHeaderHovered: "#303036",
      bgBubble: "#3f3f46",
      bgBubbleSelected: "#1e3a5f",
      bgSearchResult: "#3f3a1e",
      borderColor: "rgba(255,255,255,0.08)",
      horizontalBorderColor: "rgba(255,255,255,0.06)",
    };
  }
  return {
    ...shared,
    textDark: "#171717",
    textMedium: "#525252",
    textLight: "#a3a3a3",
    textBubble: "#171717",
    textHeader: "#404040",
    textHeaderSelected: "#171717",
    bgIconHeader: "#737373",
    fgIconHeader: "#ffffff",
    bgCell: "#ffffff",
    bgCellMedium: "#f6f6f6",
    bgHeader: "#fafafa",
    bgHeaderHasFocus: "#f0f0f0",
    bgHeaderHovered: "#f3f3f3",
    bgBubble: "#f4f4f5",
    bgBubbleSelected: "#e7f3ff",
    bgSearchResult: "#fff4cc",
    borderColor: "rgba(0,0,0,0.08)",
    horizontalBorderColor: "rgba(0,0,0,0.06)",
  };
}

export function bodyFontFamily() {
  if (typeof document === "undefined") return "ui-sans-serif, system-ui, sans-serif";
  return getComputedStyle(document.body).fontFamily || "ui-sans-serif, system-ui, sans-serif";
}
