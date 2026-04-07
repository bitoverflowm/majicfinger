/* eslint-disable @next/next/no-img-element */
"use client";

import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowRightIcon } from "@radix-ui/react-icons";

function Highlight({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-primary/20 p-1 py-0.5 font-bold text-primary dark:bg-primary/20 dark:text-primary",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function QuoteSection() {
  const { quoteSection } = siteConfig;
  const { quote, author, reviewUrl } = quoteSection;

  return (
    <section
      id="quote"
      className="flex flex-col items-center justify-center gap-8 w-full p-14 bg-accent z-20"
    >
      <blockquote className="max-w-3xl text-left px-4">
        <p className="text-xl md:text-2xl text-primary leading-relaxed tracking-tighter font-medium mb-6">
          {quote.lead}
          <Highlight>{quote.highlight}</Highlight>
          {quote.tail}
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href={reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group inline-flex w-fit rounded-md outline-none ring-offset-background",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <div
              className={cn(
                "flex gap-4",
                "transition-all duration-300 ease-landing-smooth translate-y-0 group-hover:-translate-y-1",
                "group-hover:opacity-95",
              )}
            >
              <div className="size-10 shrink-0 rounded-full bg-primary border border-border overflow-hidden">
                <img
                  src={author.image}
                  alt={author.name}
                  className="size-full object-cover"
                />
              </div>
              <div className="text-left min-w-0">
                <cite className="text-lg font-medium text-primary not-italic">
                  {author.name}
                </cite>
                <div className="relative">
                  <p className="text-sm text-primary">{author.role}</p>
                  <div className="pointer-events-none absolute left-0 top-full mt-1 flex flex-nowrap items-center gap-1 whitespace-nowrap text-sm font-medium text-primary opacity-0 translate-y-2 transition-all duration-300 ease-landing-smooth group-hover:opacity-100 group-hover:translate-y-0">
                    Learn more <ArrowRightIcon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </blockquote>
    </section>
  );
}
