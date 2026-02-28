"use client";

import Section from "./Section";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Image from "next/image";
import { MdOutlineFormatQuote } from "react-icons/md";
import Link from "next/link";
import { Star } from "lucide-react";
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
        "rounded-xl p-4 border border-neutral-200 bg-white",
        "dark:bg-black dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]"
      )}
    >
      <div className="flex flex-row py-1 mb-2">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="size-4 text-yellow-500 fill-yellow-500" />
        ))}
      </div>
      <p className="text-sm text-neutral-700 dark:text-neutral-400">{quote}</p>
      <div className="flex items-center gap-3 mt-4">
        <Image
          width={40}
          height={40}
          src={img}
          alt={name}
          className="rounded-full ring-1 ring-border"
        />
        <div>
          <p className="font-medium text-neutral-500">{name}</p>
          <p className="text-xs text-neutral-400">{role}</p>
        </div>
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
      <Carousel>
        <div className="max-w-2xl mx-auto relative">
          <CarouselContent>
            {carouselTestimonials.map((item, index) => (
              <CarouselItem key={index}>
                <div className="p-2 pb-5">
                  <TestimonialCard {...item} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="pointer-events-none absolute inset-y-0 left-0 h-full w-2/12 bg-gradient-to-r from-background" />
          <div className="pointer-events-none absolute inset-y-0 right-0 h-full w-2/12 bg-gradient-to-l from-background" />
        </div>
        <div className="md:block hidden absolute bottom-0 left-1/2 -translate-x-1/2">
          <CarouselPrevious />
          <CarouselNext />
        </div>
      </Carousel>
    </Section>
  );
}
