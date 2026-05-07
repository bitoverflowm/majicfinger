"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function fallbackLetter({ handle, name }) {
  const h = String(handle || "").trim();
  const n = String(name || "").trim();
  const src = h || n;
  const ch = src ? src[0] : "?";
  return String(ch).toUpperCase();
}

export function UserAvatar({ src, handle, name, className, imageClassName, fallbackClassName, ...props }) {
  const fb = fallbackLetter({ handle, name });
  const cleanSrc = String(src || "").trim() || undefined;

  return (
    <Avatar className={cn("h-9 w-9", className)} {...props}>
      {cleanSrc ? <AvatarImage src={cleanSrc} className={imageClassName} /> : null}
      <AvatarFallback className={cn("text-xs font-semibold text-slate-700 dark:text-slate-200", fallbackClassName)}>
        {fb}
      </AvatarFallback>
    </Avatar>
  );
}

