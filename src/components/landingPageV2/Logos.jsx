"use client";

import Marquee from "@/components/magicui/marquee";
import Image from "next/image";

const companies = ["jpm", "goldman", "meta", "google", "apple", "mit"];

export default function Logos() {
  return (
    <section id="logos">
      <div className="container mx-auto px-4 md:px-8 py-12">
        <h3 className="text-center text-sm font-semibold text-muted-foreground">
          ACTIVELY BETA TESTED BY FRIENDS AT
        </h3>
        <div className="relative mt-6">
          <Marquee className="max-w-full [--duration:40s]">
            {companies.map((logo, idx) => (
              <Image
                key={idx}
                width={80}
                height={32}
                src={`/${logo}.svg`}
                className="h-6 w-16 sm:h-8 sm:w-20 brightness-0 opacity-70"
                alt={logo}
              />
            ))}
          </Marquee>
          <div className="pointer-events-none absolute inset-y-0 left-0 h-full w-1/3 bg-gradient-to-r from-background"></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/3 bg-gradient-to-l from-background"></div>
        </div>
      </div>
    </section>
  );
}
