"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionHeader } from "@/components/section-header";

const FAQ_ITEMS = [
  {
    id: 1,
    question: "What is Polymarket metadata?",
    answer:
      "Polymarket metadata refers to structured information including market IDs, event IDs, outcome tokens, and slugs used to identify prediction markets.",
  },
  {
    id: 2,
    question: "How do I find a Polymarket event ID?",
    answer:
      "Search the market question in the lookup tool to instantly retrieve the event ID and related market identifiers.",
  },
  {
    id: 3,
    question: "Do I need the Polymarket API?",
    answer: "No. This tool allows you to access Polymarket metadata without using APIs or GraphQL.",
  },
];

export function PolymarketMetadataFAQSection() {
  return (
    <section
      id="faq"
      className="relative flex w-full flex-col items-center justify-center gap-10 pb-10 pt-6"
    >
      <SectionHeader>
        <h2 className="text-center text-3xl font-medium tracking-tighter text-balance md:text-4xl">
          Frequently Asked Questions
        </h2>
        <p className="text-center font-medium text-balance text-muted-foreground">
          Quick answers about Polymarket metadata, event IDs, and using this lookup without APIs.
        </p>
      </SectionHeader>

      <div className="mx-auto w-full max-w-3xl px-10">
        <Accordion type="single" collapsible className="grid w-full gap-2 border-b-0">
          {FAQ_ITEMS.map((faq) => (
            <AccordionItem key={faq.id} value={String(faq.id)} className="grid gap-2 border-0">
              <AccordionTrigger className="cursor-pointer rounded-lg border border-border bg-accent px-4 py-3.5 no-underline hover:no-underline data-[state=open]:ring data-[state=open]:ring-primary/20">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="rounded-lg border bg-accent p-3 text-primary">
                <p className="font-medium leading-relaxed text-primary">{faq.answer}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
