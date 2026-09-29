"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Facehash } from "facehash";

/** Bright backgrounds so the black face stays readable and the avatar has some color. */
const AVATAR_COLORS = [
  "#ff5d73",
  "#ff7a45",
  "#ffb020",
  "#3dce7a",
  "#14c4b4",
  "#3aa0ff",
  "#6d5efc",
  "#e451c5",
  "#ff4f8b",
  "#22c1d6",
];

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
  email = undefined,
  size = 36,
  className,
  imageClassName = undefined,
  fallbackClassName = undefined,
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
        <Facehash
          name={seed}
          size={size}
          colors={AVATAR_COLORS}
          variant="solid"
          intensity3d="none"
          interactive={false}
        />
      </AvatarFallback>
    </Avatar>
  );
}

