"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

import { SectionHeader } from "@/components/section-header";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

export function FAQSection() {
  const { faqSection } = siteConfig;

  return (
    <section
      id="faq"
      className="flex flex-col items-center justify-center gap-10 pb-10 w-full relative"
    >
      <SectionHeader>
        <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance">
          {faqSection.title}
        </h2>
        <p className="text-muted-foreground text-center text-balance font-medium">
          {faqSection.description}
        </p>
      </SectionHeader>

      <div className="max-w-3xl w-full mx-auto px-10">
        <AccordionPrimitive.Root
          type="single"
          collapsible
          className="w-full border-b-0 grid gap-2"
        >
          {faqSection.faQitems.map((faq) => (
            <AccordionPrimitive.Item
              key={faq.id}
              value={String(faq.id)}
              className="border-0 grid gap-2"
            >
              <AccordionPrimitive.Trigger
                className={cn(
                  "flex flex-1 w-full items-center justify-between gap-2 border bg-accent border-border rounded-lg px-4 py-3.5 cursor-pointer font-medium transition-all no-underline hover:no-underline data-[state=open]:ring data-[state=open]:ring-primary/20 [&[data-state=open]>svg]:rotate-180",
                )}
              >
                {faq.question}
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
              </AccordionPrimitive.Trigger>
              <AccordionPrimitive.Content
                forceMount
                className="overflow-hidden text-sm transition-all data-[state=closed]:hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up"
              >
                <div className="p-3 border text-primary rounded-lg bg-accent">
                  <p className="text-primary font-medium leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </AccordionPrimitive.Content>
            </AccordionPrimitive.Item>
          ))}
        </AccordionPrimitive.Root>
      </div>
    </section>
  );
}
