import * as React from "react";

export declare const marketVarsClassName: string;
export declare const UP: string;
export declare const DOWN: string;
export declare const EASE: string;
export declare const KEYFRAMES: string;
export declare const SPECTRUM_HEAT_DEFAULTS: {
  light: { up: string; down: string; flat: string };
  dark: { up: string; down: string; flat: string };
};

export declare function formatSignedPct(value: number): string;
export declare function usePrefersReducedMotion(): boolean;
export declare function useElementWidth(): [React.RefObject<HTMLDivElement | null>, number];
export declare function Keyframes(): React.JSX.Element;
export declare function squarify(
  items: Array<{ label: string; weight: number; [key: string]: unknown }>,
  width: number,
  height: number,
): Array<{ label: string; x: number; y: number; w: number; h: number; weight: number }>;
export declare function changeColor(
  change: number,
  cap?: number,
  colors?: { up: string; down: string; flat: string; mode?: string },
): string;
export declare function heatLegendSampleChanges(mode?: string, cap?: number): number[];

export declare function ChartSkeleton(props: {
  variant?: string;
  height?: number;
  className?: string;
}): React.JSX.Element;

export declare function ChartEmpty(props: {
  height?: number;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}): React.JSX.Element;

export declare function ChartError(props: {
  height?: number;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}): React.JSX.Element;

export declare function ChartState(props: {
  status?: string;
  height?: number;
  variant?: string;
  empty?: React.ReactNode;
  error?: React.ReactNode;
  onRetry?: () => void;
  children?: React.ReactNode;
}): React.JSX.Element;

export declare function Stat(props: {
  ready?: boolean;
  children?: React.ReactNode;
}): React.JSX.Element;
