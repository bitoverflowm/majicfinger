/** postMessage type: embed page → parent article iframe resize. */
export const LYCHEE_CHART_EMBED_RESIZE = "lychee-chart-embed-resize" as const;

export type LycheeChartEmbedResizeMessage = {
  type: typeof LYCHEE_CHART_EMBED_RESIZE;
  height: number;
};
