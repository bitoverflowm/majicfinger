"use client";

import { cn } from "@/lib/utils";

interface VideoEmbedProps {
  src: string;
  title?: string;
  className?: string;
}

export function VideoEmbed({ src, title = "Video", className }: VideoEmbedProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-border aspect-video",
        className
      )}
    >
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
