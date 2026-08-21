"use client";

import Link from "next/link";
import { HubCtaButton } from "@/components/hubs/HubCtaButton";
import { useHubPolymarketLiveDemo } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveDemoSelection";
import { HubPolymarketLiveCandlesticksDemo } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveCandlesticksDemo";
import { HubPolymarketLiveOrderbookDemo } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveOrderbookDemo";
import { HubPolymarketLivePricesDemo } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLivePricesDemo";
import { HubPolymarketLiveSearchDemo } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveSearchDemo";
import { HubPolymarketLiveSpreadDemo } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveSpreadDemo";
import { HubPolymarketLiveTradesDemo } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveTradesDemo";
import { DemoWindowMockup } from "@/components/sections/demo-window-mockup";
import { cn } from "@/lib/utils";
import type { HubDemoModuleSection, HubInlinePart } from "@/types/hub";

function HubInlineCopy({
  parts,
  className,
}: {
  parts: HubInlinePart[];
  className?: string;
}) {
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === "link") {
          return (
            <Link
              key={`${part.href}-${index}`}
              href={part.href}
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
              prefetch={false}
            >
              {part.label}
            </Link>
          );
        }
        return <span key={`text-${index}`}>{part.value}</span>;
      })}
    </span>
  );
}

function HubDemoModulePlaceholder({ section }: { section: HubDemoModuleSection }) {
  const selection = useHubPolymarketLiveDemo();
  const selected = selection?.markets ?? [];

  return (
    <div className="flex min-h-[18rem] flex-col justify-center gap-3 px-6 py-10 text-center sm:min-h-[20rem] sm:px-10">
      {section.inlineHeading ? (
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          {section.inlineHeading}
        </h3>
      ) : null}
      {section.inlineHelper ? (
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
          {section.inlineHelper}
        </p>
      ) : null}
      {selected.length ? (
        <p className="text-sm text-foreground">
          Loaded{" "}
          {selected.map((market) => String(market.title || market.id || "market")).join(" · ")}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground/80">
          {section.placeholder || "Search for a Polymarket market to load this view."}
        </p>
      )}
    </div>
  );
}

export function HubDemoModule({ section }: { section: HubDemoModuleSection }) {
  const paragraphs = section.contentParts?.length
    ? null
    : section.content.split("\n\n").filter(Boolean);

  return (
    <section
      id={section.anchorId}
      className={cn("w-full px-6 py-16 md:py-24", "scroll-mt-28")}
    >
      <div className="mx-auto w-full max-w-2xl space-y-5">
        {section.eyebrow ? (
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-secondary">
            {section.eyebrow}
          </p>
        ) : null}
        <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          {section.title}
        </h2>
        {section.contentParts?.length ? (
          <p className="text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            <HubInlineCopy parts={section.contentParts} />
          </p>
        ) : (
          paragraphs!.map((paragraph) => (
            <p
              key={paragraph.slice(0, 48)}
              className="text-pretty text-base leading-relaxed text-muted-foreground md:text-lg"
            >
              {paragraph}
            </p>
          ))
        )}
        {section.callout ? (
          <p className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-foreground/90 md:text-base">
            {section.callout}
          </p>
        ) : null}
        {section.definitions?.length ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            {section.definitions.map((item) => (
              <div
                key={item.term}
                className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3"
              >
                <dt className="text-sm font-semibold text-foreground">{item.term}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {item.definition}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {section.bullets?.length ? (
          <ul className="space-y-2">
            {section.bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex gap-3 text-base leading-relaxed text-foreground"
              >
                <span className="text-muted-foreground" aria-hidden>
                  •
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {section.examples?.length ? (
          <div className="space-y-3">
            {section.examplesTitle ? (
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {section.examplesTitle}
              </p>
            ) : null}
            <ul className="flex flex-wrap gap-2">
              {section.examples.map((example) => (
                <li
                  key={example}
                  className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-sm text-muted-foreground"
                >
                  {example}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mx-auto mt-10 w-full max-w-5xl px-0 sm:px-2">
        <DemoWindowMockup
          contentClassName={
            section.demoSlot === "polymarket-live-trades" ||
            section.demoSlot === "polymarket-live-candlesticks"
              ? "h-[min(46rem,calc(100dvh-10rem))] min-h-0"
              : section.demoSlot === "polymarket-live-spread" ||
                section.demoSlot === "polymarket-live-orderbook"
              ? "h-[min(40rem,calc(100dvh-12rem))] min-h-0"
              : section.demoSlot === "polymarket-live-search" ||
                  section.demoSlot === "polymarket-live-prices"
                ? "h-[min(36rem,calc(100dvh-14rem))] min-h-0"
                : "min-h-[18rem] sm:min-h-[20rem]"
          }
        >
          {section.demoSlot === "polymarket-live-search" ? (
            <HubPolymarketLiveSearchDemo
              heading={section.inlineHeading}
              helper={section.inlineHelper}
              placeholder={section.placeholder}
            />
          ) : section.demoSlot === "polymarket-live-prices" ? (
            <HubPolymarketLivePricesDemo
              heading={section.inlineHeading}
              helper={section.inlineHelper}
              placeholder={section.placeholder}
            />
          ) : section.demoSlot === "polymarket-live-spread" ? (
            <HubPolymarketLiveSpreadDemo
              heading={section.inlineHeading}
              helper={section.inlineHelper}
              placeholder={section.placeholder}
            />
          ) : section.demoSlot === "polymarket-live-orderbook" ? (
            <HubPolymarketLiveOrderbookDemo
              heading={section.inlineHeading}
              helper={section.inlineHelper}
              placeholder={section.placeholder}
            />
          ) : section.demoSlot === "polymarket-live-trades" ? (
            <HubPolymarketLiveTradesDemo
              heading={section.inlineHeading}
              helper={section.inlineHelper}
              placeholder={section.placeholder}
            />
          ) : section.demoSlot === "polymarket-live-candlesticks" ? (
            <HubPolymarketLiveCandlesticksDemo
              heading={section.inlineHeading}
              helper={section.inlineHelper}
              placeholder={section.placeholder}
            />
          ) : (
            <HubDemoModulePlaceholder section={section} />
          )}
        </DemoWindowMockup>
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-2xl flex-col items-center gap-3">
        {section.cta || section.secondaryCta ? (
          <div className="flex w-full flex-wrap items-center justify-center gap-3">
            {section.cta ? <HubCtaButton cta={section.cta} variant="primary" /> : null}
            {section.secondaryCta ? (
              <HubCtaButton cta={section.secondaryCta} variant="secondary" />
            ) : null}
          </div>
        ) : null}
        {section.internalLink ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {section.internalLink.prefix ? `${section.internalLink.prefix} ` : null}
            <Link
              href={section.internalLink.href}
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
              prefetch={false}
            >
              {section.internalLink.label}
            </Link>
            .
          </p>
        ) : null}
        {section.note ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{section.note}</p>
        ) : null}
      </div>
    </section>
  );
}
