"use client";

import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, BookOpen } from "lucide-react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";

export type FeaturedResourceCard = {
  href: string;
  kind: "guide" | "dashboard";
  title: string;
  description: string;
  image?: string | null;
};

const KIND_TAG_STYLES: Record<FeaturedResourceCard["kind"], string> = {
  dashboard:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  guide: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
};

type FeaturedResourcesCarouselProps = {
  items: FeaturedResourceCard[];
};

function KindBadge({ kind }: { kind: FeaturedResourceCard["kind"] }) {
  const isDashboard = kind === "dashboard";
  return (
    <Badge
      variant="secondary"
      className={`w-fit self-start gap-1 border ${KIND_TAG_STYLES[kind]}`}
    >
      {isDashboard ? (
        <LayoutDashboard className="h-3 w-3 shrink-0" aria-hidden />
      ) : (
        <BookOpen className="h-3 w-3 shrink-0" aria-hidden />
      )}
      {isDashboard ? "Dashboard" : "Guide"}
    </Badge>
  );
}

export function FeaturedResourcesCarousel({ items }: FeaturedResourcesCarouselProps) {
  if (!items.length) return null;

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <Carousel
        opts={{ align: "start", loop: false, dragFree: true }}
        className="w-full"
      >
        <CarouselContent className="-ml-3 md:-ml-4">
          {items.map((item) => (
            <CarouselItem
              key={item.href}
              className="basis-[88%] pl-3 sm:basis-[52%] md:pl-4 lg:basis-[38%] xl:basis-[32%]"
            >
              <Link
                href={item.href}
                prefetch={false}
                className="group flex h-full min-h-[220px] flex-col overflow-hidden rounded-xl border border-border/70 bg-card/80 shadow-sm transition-all duration-200 hover:border-primary/35 hover:bg-card hover:shadow-md"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-border/50 bg-muted/30">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      sizes="(max-width: 640px) 88vw, (max-width: 1024px) 52vw, 32vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      {item.kind === "dashboard" ? "Dashboard preview" : "Guide"}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <KindBadge kind={item.kind} />
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-foreground group-hover:text-primary">
                    {item.title}
                  </h3>
                  <p className="line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                  <span className="text-xs font-medium text-primary">Open →</span>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          className="left-0 top-[42%] size-9 border-border/80 bg-background/95 shadow-md md:-left-3"
          variant="outline"
        />
        <CarouselNext
          className="right-0 top-[42%] size-9 border-border/80 bg-background/95 shadow-md md:-right-3"
          variant="outline"
        />
      </Carousel>
    </div>
  );
}
