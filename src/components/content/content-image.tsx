"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface ContentImageProps {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
  /** Optional: use for responsive sizing. Default 1200x800. */
  width?: number;
  height?: number;
}

/**
 * Use in MDX for images with optional captions and consistent styling.
 * Supports local paths (/images/...) and external URLs.
 *
 * @example
 * <ContentImage src="/images/guides/demo/screenshot.png" alt="Lychee dashboard" caption="Step 1: Create API connection" />
 */
export function ContentImage({
  src,
  alt,
  caption,
  className,
  width = 1200,
  height = 800,
}: ContentImageProps) {
  const isExternal = src.startsWith("http");

  return (
    <figure className={cn("my-8", className)}>
      <div className="relative w-full overflow-hidden rounded-xl border border-border bg-muted/30">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-auto object-contain"
          unoptimized={isExternal}
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
