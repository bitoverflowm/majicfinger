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
    <Link
      href={src}
      className={cn(
        "mb-4 flex w-full max-w-[280px] cursor-pointer break-inside-avoid flex-col items-center justify-between gap-4 rounded-xl p-4 shrink-0 text-center",
        "bg-card border border-border/60",
        "dark:bg-black dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
        className,
      )}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className="text-4xl text-primary/60 leading-none select-none">
        &quot;
      </span>
      <div className="select-none text-sm font-normal text-muted-foreground text-center -mt-2">
        {description}
      </div>
      <p className="text-xs font-medium text-muted-foreground">{role}</p>
      <div className="flex flex-col items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={name}
          className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
        />
        <p className="font-medium text-foreground text-sm">{name}</p>
      </div>
    </Link>
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
    <div className="relative mt-8 flex w-full flex-col items-center justify-center overflow-hidden py-6">
      <Marquee pauseOnHover reverse={false} className="[--duration:45s] [--gap:1rem]">
        {firstRow.map((card) => (
          <TestimonialCard key={card.id} {...card} />
        ))}
      </Marquee>
      <Marquee reverse pauseOnHover className="[--duration:55s] [--gap:1rem]">
        {secondRow.map((card) => (
          <TestimonialCard key={card.id} {...card} />
        ))}
      </Marquee>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background" />
    </div>
  );
}
