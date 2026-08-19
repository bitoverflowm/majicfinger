import Link from "next/link";
import { HubCtaButton } from "@/components/hubs/HubCtaButton";
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
        <DemoWindowMockup contentClassName="min-h-[18rem] sm:min-h-[20rem]">
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
            <p className="text-sm text-muted-foreground/80">
              {section.placeholder || "Search for a Polymarket market to load this view."}
            </p>
          </div>
        </DemoWindowMockup>
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-2xl flex-col items-start gap-3">
        {section.cta || section.secondaryCta ? (
          <div className="flex flex-wrap items-center gap-3">
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
