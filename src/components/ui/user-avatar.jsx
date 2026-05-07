"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Facehash } from "facehash";

function pickDeterministicName({ handle, name, email }) {
  const h = String(handle || "").trim();
  if (h) return h;
  const n = String(name || "").trim();
  if (n) return n;
  const e = String(email || "").trim();
  if (e) return e;
  return "user";
}

export function UserAvatar({
  src,
  handle,
  name,
  email,
  size = 36,
  className,
  imageClassName,
  fallbackClassName,
  ...props
}) {
  const seed = pickDeterministicName({ handle, name, email });
  const cleanSrc = String(src || "").trim() || undefined;

  return (
    <Avatar
      className={cn("overflow-hidden", className)}
      style={{ height: size, width: size }}
      {...props}
    >
      {cleanSrc ? <AvatarImage src={cleanSrc} className={imageClassName} /> : null}
      <AvatarFallback className={cn("bg-transparent p-0", fallbackClassName)}>
        <Facehash name={seed} size={size} />
      </AvatarFallback>
    </Avatar>
  );
}

