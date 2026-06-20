/** postMessage type: embed page → parent article iframe resize. */
export const LYCHEE_CHART_EMBED_RESIZE = "lychee-chart-embed-resize" as const;

/** postMessage type: embed page → parent when chart data + canvas are ready. */
export const LYCHEE_CHART_EMBED_READY = "lychee-chart-embed-ready" as const;

export type LycheeChartEmbedResizeMessage = {
  type: typeof LYCHEE_CHART_EMBED_RESIZE;
  height: number;
};

export type LycheeChartEmbedReadyMessage = {
  type: typeof LYCHEE_CHART_EMBED_READY;
};
