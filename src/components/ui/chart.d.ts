import * as React from "react";
import * as RechartsPrimitive from "recharts";

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
    theme?: Record<string, string>;
  }
>;

export declare const ChartContainer: React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLDivElement> & {
    id?: string;
    config: ChartConfig;
    children: React.ReactNode;
  } & React.RefAttributes<HTMLDivElement>
>;

export declare const ChartTooltip: typeof RechartsPrimitive.Tooltip;

export declare const ChartTooltipContent: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof RechartsPrimitive.Tooltip> &
    React.HTMLAttributes<HTMLDivElement> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: "line" | "dot" | "dashed";
      nameKey?: string;
      labelKey?: string;
      labelClassName?: string;
      color?: string;
      pivotName?: string | null;
      pivotLabelFormatter?: ((value: unknown) => React.ReactNode) | null;
      rowDetailX?: boolean;
      rowDetailY?: boolean;
      rowDetailExtraKeys?: string[];
      rowDetailXKey?: string;
      rowDetailYKeys?: string[];
      rowDetailFormatX?: (value: unknown) => React.ReactNode;
      rowDetailFormatY?: (value: unknown, key: string) => React.ReactNode;
    } & React.RefAttributes<HTMLDivElement>
>;

export declare const ChartLegend: typeof RechartsPrimitive.Legend;

export declare const ChartLegendContent: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof RechartsPrimitive.Legend> &
    React.HTMLAttributes<HTMLDivElement> & {
      hideIcon?: boolean;
      nameKey?: string;
    } & React.RefAttributes<HTMLDivElement>
>;

export declare function ChartStyle({
  id,
  config,
}: {
  id: string;
  config: ChartConfig;
}): React.JSX.Element | null;
