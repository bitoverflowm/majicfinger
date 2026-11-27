import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";

export interface ToggleProps
  extends React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}

export declare const Toggle: React.ForwardRefExoticComponent<
  ToggleProps & React.RefAttributes<React.ElementRef<typeof TogglePrimitive.Root>>
>;

export declare function toggleVariants(props?: {
  variant?: ToggleProps["variant"];
  size?: ToggleProps["size"];
  className?: string;
}): string;
