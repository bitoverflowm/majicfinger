"use client";

import Link from "next/link";
import { YouTube } from "@/components/ui";
import type { HubVideoInstruction } from "@/types/hub";

type HubVideoInstructionsCarouselProps = {
  videos: HubVideoInstruction[];
};

export function HubVideoInstructionsCarousel({ videos }: HubVideoInstructionsCarouselProps) {
  if (!videos.length) return null;

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
      {videos.map((video) => (
        <li key={video.videoId}>
          <div className="flex h-full flex-col gap-4 rounded-xl border border-border/70 bg-card/80 p-4 shadow-sm md:p-5">
            <YouTube videoId={video.videoId} title={video.title} />
            <div className="space-y-2">
              <h3 className="text-base font-semibold tracking-tight text-foreground md:text-lg">
                {video.title}
              </h3>
              {video.description ? (
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  {video.description}
                </p>
              ) : null}
              <Link
                href={video.guideHref}
                prefetch={false}
                className="inline-flex text-sm font-medium text-primary hover:underline underline-offset-2"
              >
                Read the full step-by-step guide →
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
