"use client";

import Marquee from "@/components/magicui/marquee";
import type { SocialProofTestimonial } from "@/lib/testimonials-scroll-data";
import { cn } from "@/lib/utils";
import Link from "next/link";

function TestimonialCard({
  description,
  name,
  img,
  role,
  src,
  className,
}: SocialProofTestimonial & { className?: string }) {
  return (
    <figure
      className={cn(
        "relative w-64 shrink-0 cursor-pointer overflow-hidden rounded-xl border p-4",
        "border-border/50 bg-background/50 hover:bg-background/70",
        "transition-colors duration-200",
        className,
      )}
    >
      <Link href={src} rel="noopener noreferrer" target="_blank" className="block">
        <div className="flex flex-row items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt={name} className="h-8 w-8 rounded-full object-cover" />
          <div className="flex min-w-0 flex-col">
            <figcaption className="truncate text-xs font-medium text-foreground">{name}</figcaption>
            <p className="truncate text-xs font-medium text-muted-foreground">{role}</p>
          </div>
        </div>
        <blockquote className="mt-2 text-left text-xs leading-relaxed text-foreground/90">
          {description}
        </blockquote>
      </Link>
    </figure>
  );
}

export function SocialProofTestimonials({
  testimonials,
}: {
  testimonials: SocialProofTestimonial[];
}) {
  const half = Math.ceil(testimonials.length / 2);
  const firstRow = testimonials.slice(0, half);
  const secondRow = testimonials.slice(half);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-accent py-16 md:py-20">
      <Marquee pauseOnHover className="[--duration:20s] [--gap:1rem]">
        {firstRow.map((card) => (
          <TestimonialCard key={card.id} {...card} />
        ))}
      </Marquee>
      <Marquee reverse pauseOnHover className="[--duration:20s] [--gap:1rem]">
        {secondRow.map((card) => (
          <TestimonialCard key={card.id} {...card} />
        ))}
      </Marquee>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-accent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-accent" />
    </div>
  );
}
