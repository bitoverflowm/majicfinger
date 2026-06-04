"use client";

import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { YouTube } from "@/components/ui";
import type { HubVideoInstruction } from "@/types/hub";

type HubVideoInstructionsCarouselProps = {
  videos: HubVideoInstruction[];
};

export function HubVideoInstructionsCarousel({ videos }: HubVideoInstructionsCarouselProps) {
  if (!videos.length) return null;

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <Carousel opts={{ align: "start", loop: false }} className="w-full">
        <CarouselContent className="-ml-3 md:-ml-4">
          {videos.map((video) => (
            <CarouselItem
              key={video.videoId}
              className="basis-full pl-3 md:basis-[85%] md:pl-4 lg:basis-[72%]"
            >
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
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          className="left-0 top-[28%] size-9 border-border/80 bg-background/95 shadow-md md:-left-3"
          variant="outline"
        />
        <CarouselNext
          className="right-0 top-[28%] size-9 border-border/80 bg-background/95 shadow-md md:-right-3"
          variant="outline"
        />
      </Carousel>
    </div>
  );
}
