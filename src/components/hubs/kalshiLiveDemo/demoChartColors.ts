export const DEMO_CHART_COLOR_TOKENS = [
  { id: "chart-1", cssVar: "--chart-1", label: "Chart 1" },
  { id: "chart-2", cssVar: "--chart-2", label: "Chart 2" },
  { id: "chart-3", cssVar: "--chart-3", label: "Chart 3" },
  { id: "chart-4", cssVar: "--chart-4", label: "Chart 4" },
  { id: "chart-5", cssVar: "--chart-5", label: "Chart 5" },
] as const;

export type DemoChartColorTokenId =
  (typeof DEMO_CHART_COLOR_TOKENS)[number]["id"];

/** Default series colors: blue-ish then orange-ish in light theme. */
export const DEFAULT_SERIES_COLOR_TOKENS: DemoChartColorTokenId[] = [
  "chart-3",
  "chart-1",
];

export function demoChartCssVar(tokenId: DemoChartColorTokenId): string {
  return `var(--${tokenId})`;
}

/** Resolve a chart token to a concrete color for canvas / inline styles. */
export function resolveDemoChartColor(
  tokenId: DemoChartColorTokenId,
): string {
  if (typeof window === "undefined") return demoChartCssVar(tokenId);
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${tokenId}`)
    .trim();
  return value || demoChartCssVar(tokenId);
}

export function defaultSeriesColorToken(
  index: number,
): DemoChartColorTokenId {
  return DEFAULT_SERIES_COLOR_TOKENS[
    index % DEFAULT_SERIES_COLOR_TOKENS.length
  ]!;
}
