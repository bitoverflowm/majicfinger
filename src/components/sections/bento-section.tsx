import { SectionHeader } from "@/components/section-header";
import type { BentoItem } from "@/lib/bento-section";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

type BentoSectionProps = {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  items?: readonly BentoItem[];
  compact?: boolean;
};

export function BentoSection({
  id = "bento",
  eyebrow,
  title,
  description,
  items,
  compact = false,
}: BentoSectionProps = {}) {
  const defaults = siteConfig.bentoSection;
  const resolvedTitle = title ?? defaults.title;
  const resolvedDescription = description ?? defaults.description;
  const resolvedItems = items ?? defaults.items;

  return (
    <section
      id={id}
      className={cn(
        "flex w-full relative flex-col items-center justify-center px-5 md:px-10",
        id && "scroll-mt-28",
      )}
    >
      <div className="border-x mx-5 md:mx-10 relative">
        <div className="absolute top-0 -left-4 md:-left-14 h-full w-4 md:w-14 text-primary opacity-5 bg-[size:10px_10px] [background-image:repeating-linear-gradient(315deg,currentColor_0_1px,#0000_0_50%)]"></div>
        <div className="absolute top-0 -right-4 md:-right-14 h-full w-4 md:w-14 text-primary opacity-5 bg-[size:10px_10px] [background-image:repeating-linear-gradient(315deg,currentColor_0_1px,#0000_0_50%)]"></div>

        <SectionHeader>
          {eyebrow ? (
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-secondary">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance pb-1">
            {resolvedTitle}
          </h2>
          {resolvedDescription ? (
            <p className="text-muted-foreground text-center text-balance font-medium">
              {resolvedDescription}
            </p>
          ) : null}
        </SectionHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 overflow-hidden">
          {resolvedItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "relative flex max-h-[400px] cursor-pointer flex-col items-start justify-end p-0.5 group before:absolute before:-left-0.5 before:top-0 before:z-10 before:h-screen before:w-px before:bg-border before:content-[''] after:absolute after:-top-0.5 after:left-0 after:z-10 after:h-px after:w-screen after:bg-border after:content-['']",
                compact
                  ? "min-h-[380px] md:min-h-[340px]"
                  : "min-h-[600px] md:min-h-[500px]",
              )}
            >
              <div className="relative flex size-full items-center justify-center h-full overflow-hidden">
                {item.content}
              </div>
              <div className="flex-1 flex-col gap-2 p-6">
                <h3 className="text-lg tracking-tighter font-semibold">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

