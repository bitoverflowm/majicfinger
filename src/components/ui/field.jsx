"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Layout primitive for labeled controls (e.g. progress + label row). */
function Field({ className, ...props }) {
  return <div role="group" className={cn("grid w-full gap-2", className)} {...props} />;
}

/** Use as the label row above Progress, etc. Pass htmlFor to associate with an input/progress id. */
function FieldLabel({ className, ...props }) {
  return <Label className={cn("flex w-full items-center gap-2", className)} {...props} />;
}

export { Field, FieldLabel };
