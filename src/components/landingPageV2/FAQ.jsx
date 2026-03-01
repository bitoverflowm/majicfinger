"use client";

import Section from "./Section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { landingPageV2Config } from "@/lib/landingPageV2Config";

export default function FAQ() {
  return (
    <Section title="FAQ" subtitle="Frequently asked questions">
      <div className="mx-auto my-12 md:max-w-[800px]">
        <Accordion type="single" collapsible className="flex w-full flex-col items-center justify-center space-y-2">
          {landingPageV2Config.faqs.map((faq, idx) => (
            <AccordionItem
              key={idx}
              value={faq.question}
              className="w-full border rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-4">{faq.question}</AccordionTrigger>
              <AccordionContent className="px-4">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <h4 className="mb-12 text-center text-sm font-medium tracking-tight text-foreground/80">
        Still have questions?{" "}
        <a href="https://twitter.com/misterrpink1" target="_blank" rel="noopener noreferrer" className="underline">
          DM us at misterrpink1 on Twitter
        </a>
      </h4>
    </Section>
  );
}
