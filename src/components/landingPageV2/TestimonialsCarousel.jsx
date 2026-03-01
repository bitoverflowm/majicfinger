"use client";

import Section from "./Section";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { cn } from "@/lib/utils";

const carouselTestimonials = [
  {
    quote: "It's like the chart editor i wish i had for the last 10 years. Love it...",
    name: "Bernard",
    role: "There's An AI For That",
    img: "https://media.theresanaiforthat.com/u/bearnard.png?width=52",
    src: "https://theresanaiforthat.com/ai/lychee?comment_id=10781",
  },
  {
    quote: "I really can't express in words how much I needed this. Changed my whole working game. My peers looked at this thing jaws dropped haha. Looking forward to the future of Lychee!",
    name: "Amal Khan",
    role: "Product Hunt",
    img: "https://ph-avatars.imgix.net/6832524/original.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=40&h=40&fit=crop&dpr=1",
    src: "https://www.producthunt.com/products/lychee-3/reviews?review=744208",
  },
  {
    quote: "Data scientists, marketers & managers would love this :) Instant hands-free graph generation! Congrats on the launch!",
    name: "Charles Teh",
    role: "Product Hunt",
    img: "https://ph-avatars.imgix.net/6514580/7e558077-c3ef-4d78-8f48-c3e02e01ffe5.webp?auto=compress&codec=mozjpeg&cs=strip&fm=webp&w=36&h=36&fit=max&frame=1&dpr=2",
    src: "https://www.producthunt.com/products/lychee-3?comment=3321659#lychee-3",
  },
];

const TestimonialCard = ({ quote, name, role, img, src }) => (
  <Link href={src} target="_blank" rel="noopener noreferrer" className="block">
    <div
      className={cn(
        "rounded-xl p-8 bg-white text-center flex flex-col items-center gap-4",
        "dark:bg-black dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]"
      )}
    >
      <span className="text-5xl text-primary/60 leading-none select-none">"</span>
      <p className="text-base text-neutral-700 dark:text-neutral-400 text-center max-w-xl">
        {quote}
      </p>
      <p className="text-sm font-medium text-muted-foreground">{role}</p>
      <div className="flex flex-col items-center gap-2">
        <Avatar className="h-12 w-12 ring-1 ring-border">
          <AvatarImage src={img} alt={name} />
          <AvatarFallback>{name?.slice(0, 2)?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <p className="font-medium text-neutral-700 dark:text-neutral-300">{name}</p>
      </div>
    </div>
  </Link>
);

export default function TestimonialsCarousel() {
  return (
    <Section
      title="Testimonial Highlight"
      subtitle="What our customers are saying"
    >
      <div className="relative max-w-3xl mx-auto px-12">
        <Carousel className="w-full" opts={{ loop: true }}>
          <CarouselContent>
            {carouselTestimonials.map((item, index) => (
              <CarouselItem key={index}>
                <div className="p-2">
                  <TestimonialCard {...item} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-0" />
          <CarouselNext className="right-0" />
        </Carousel>
      </div>
    </Section>
  );
}
