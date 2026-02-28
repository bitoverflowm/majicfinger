"use client";

import BlurFade from "./BlurFade";
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
                  <Link href={item.src} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="text-center">
                      <MdOutlineFormatQuote className="text-4xl text-muted-foreground my-4 mx-auto" />
                      <BlurFade delay={0.25} inView>
                        <h4 className="text-xl font-semibold max-w-lg mx-auto px-10">
                          {item.quote}
                        </h4>
                      </BlurFade>
                      <BlurFade delay={0.25 * 2} inView>
                        <div className="mt-8 flex justify-center">
                          <Image
                            width={40}
                            height={40}
                            src={item.img}
                            alt={item.name}
                            className="rounded-full ring-1 ring-border"
                          />
                        </div>
                      </BlurFade>
                      <BlurFade delay={0.25 * 3} inView>
                        <h4 className="text-xl font-semibold my-2">{item.name}</h4>
                      </BlurFade>
                      <BlurFade delay={0.25 * 4} inView>
                        <div className="mb-3">
                          <span className="text-sm text-muted-foreground">{item.role}</span>
                        </div>
                      </BlurFade>
                    </div>
                  </Link>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="pointer-events-none absolute inset-y-0 left-0 h-full w-2/12 bg-gradient-to-r from-background"></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 h-full w-2/12 bg-gradient-to-l from-background"></div>
        </div>
        <div className="md:block hidden absolute bottom-0 left-1/2 -translate-x-1/2">
          <CarouselPrevious />
          <CarouselNext />
        </div>
      </Carousel>
    </Section>
  );
}
