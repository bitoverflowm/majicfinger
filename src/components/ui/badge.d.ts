import * as React from "react";

export declare function Badge(
  props: React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "secondary" | "destructive" | "outline";
  },
): React.JSX.Element;

export declare function badgeVariants(props?: {
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}): string;
