"use client";

import { SectionHeader } from "@/components/section-header";
import { siteConfig } from "@/lib/config";

export function GrowthSection() {
  const { title, description, items } = siteConfig.growthSection;

  return (
    <section
      id="growth"
      className="flex flex-col items-center justify-center w-full relative px-5 md:px-10"
    >
      <div className="border-x mx-5 md:mx-10 relative">
        <div className="absolute top-0 -left-4 md:-left-14 h-full w-4 md:w-14 text-primary opacity-5 bg-[size:10px_10px] [background-image:repeating-linear-gradient(315deg,currentColor_0_1px,#0000_0_50%)]" />
        <div className="absolute top-0 -right-4 md:-right-14 h-full w-4 md:w-14 text-primary opacity-5 bg-[size:10px_10px] [background-image:repeating-linear-gradient(315deg,currentColor_0_1px,#0000_0_50%)]" />

        <SectionHeader>
          <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance">
            {title}
          </h2>
          <p className="text-muted-foreground text-center text-balance font-medium">
            {description}
          </p>
        </SectionHeader>

        <div className="grid grid-cols-1 items-stretch divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex min-h-[560px] w-full min-w-0 flex-col items-center justify-end gap-2 p-6"
            >
              <div className="flex min-h-[380px] w-full flex-1 flex-col items-center justify-center">
                {item.content}
              </div>
              <h3 className="w-full text-lg tracking-tighter font-semibold">
                {item.title}
              </h3>
              <p className="w-full text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

