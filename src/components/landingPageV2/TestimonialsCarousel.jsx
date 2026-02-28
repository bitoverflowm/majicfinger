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

const companies = [
  "Google",
  "Microsoft",
  "Amazon",
  "Netflix",
  "YouTube",
  "Instagram",
  "Uber",
  "Spotify",
];

const testimonials = [
  "There is a lot of exciting stuff going on in the stars above us that make astronomy so much fun. The truth is the universe is a constantly changing, moving thing.",
  "Easy Charts has transformed how we present data to our clients. The export options and customization make it a must-have tool for our team.",
  "We switched from our previous charting solution and never looked back. The simplicity and power of Easy Charts is unmatched.",
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
            {testimonials.map((quote, index) => (
              <CarouselItem key={index}>
                <div className="p-2 pb-5">
                  <div className="text-center">
                    <MdOutlineFormatQuote className="text-4xl text-muted-foreground my-4 mx-auto" />
                    <BlurFade delay={0.25} inView>
                      <h4 className="text-xl font-semibold max-w-lg mx-auto px-10">
                        {quote}
                      </h4>
                    </BlurFade>
                    <BlurFade delay={0.25 * 2} inView>
                      <div className="mt-8">
                        <Image
                          width={112}
                          height={40}
                          src={`https://cdn.magicui.design/companies/${companies[index % companies.length]}.svg`}
                          alt={`${companies[index % companies.length]} Logo`}
                          className="mx-auto w-auto h-[40px] grayscale opacity-30"
                        />
                      </div>
                    </BlurFade>
                    <BlurFade delay={0.25 * 3} inView>
                      <h4 className="text-xl font-semibold my-2">
                        Leslie Alexander
                      </h4>
                    </BlurFade>
                    <BlurFade delay={0.25 * 4} inView>
                      <div className="mb-3">
                        <span className="text-sm text-muted-foreground">
                          UI Designer
                        </span>
                      </div>
                    </BlurFade>
                  </div>
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
