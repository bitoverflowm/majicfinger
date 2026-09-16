import * as React from "react";

export type MarketHeatmapDatum = {
  label: string;
  name?: string;
  weight: number;
  change: number;
};

export declare function MarketHeatmap(props: {
  className?: string;
  data?: MarketHeatmapDatum[];
  height?: number;
  cap?: number;
  scaleMode?: "diverging" | "positive" | "negative";
  metricLabel?: string;
  title?: string;
  subtitle?: string;
  status?: string;
  onRetry?: () => void;
  upColor?: string;
  downColor?: string;
  onTileHover?: (payload: unknown) => void;
}): React.JSX.Element;
