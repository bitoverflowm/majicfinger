import { Check } from "lucide-react";
import { HubCtaButton } from "@/components/hubs/HubCtaButton";
import { cn } from "@/lib/utils";
import type { HubComparisonTableSection } from "@/types/hub";

function cellStartsWithYes(text: string) {
  return /^yes\b/i.test(text.trim());
}

function ComparisonCell({
  text,
  featured,
}: {
  text: string;
  featured?: boolean;
}) {
  const isYes = featured && cellStartsWithYes(text);

  return (
    <div
      className={cn(
        "text-xs leading-relaxed text-muted-foreground sm:text-[0.8125rem]",
        featured && "text-foreground/90",
        isYes && "font-medium text-emerald-700 dark:text-emerald-400/95",
      )}
    >
      {isYes ? (
        <span className="inline-flex items-start gap-1.5">
          <Check
            className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          />
          <span>{text.replace(/^yes\s*[—–-]?\s*/i, "")}</span>
        </span>
      ) : (
        text
      )}
    </div>
  );
}

export function HubComparisonTable({ section }: { section: HubComparisonTableSection }) {
  const featuredId = section.featuredColumnId;

  return (
    <section
      id={section.anchorId}
      className={cn("w-full px-4 py-16 sm:px-8 md:px-10 md:py-24", section.anchorId && "scroll-mt-28")}
    >
      <div className="mx-auto w-full max-w-[min(100%,72rem)] space-y-10 px-2 sm:px-0">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {section.title}
          </h2>
          {section.intro ? (
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg text-pretty">
              {section.intro}
            </p>
          ) : null}
        </div>

        <div className="relative -mx-2 sm:mx-0">
          <div className="overflow-x-auto rounded-xl border border-border bg-background/80 shadow-sm [scrollbar-width:thin]">
            <table className="w-full min-w-[960px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    scope="col"
                    className="sticky left-0 z-30 min-w-[9.5rem] border-r border-border bg-muted/95 px-4 py-4 text-left align-bottom backdrop-blur-sm sm:min-w-[11rem]"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Feature / workflow
                    </span>
                  </th>
                  {section.columns.map((column) => {
                    const featured = column.id === featuredId;
                    return (
                      <th
                        key={column.id}
                        scope="col"
                        className={cn(
                          "sticky top-0 z-20 min-w-[9.5rem] px-3 py-4 align-bottom sm:min-w-[10.5rem] sm:px-4",
                          featured
                            ? "border-x border-secondary/25 bg-secondary/10 backdrop-blur-sm"
                            : "bg-muted/95 backdrop-blur-sm",
                        )}
                      >
                        <div className="flex flex-col gap-2">
                          <span
                            className={cn(
                              "text-sm font-semibold leading-tight",
                              featured ? "text-foreground" : "text-foreground/90",
                            )}
                          >
                            {column.label}
                          </span>
                          {featured && column.badge ? (
                            <span className="inline-flex w-fit rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[0.625rem] font-medium leading-tight text-emerald-800 dark:text-emerald-300">
                              {column.badge}
                            </span>
                          ) : null}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row, rowIndex) => (
                  <tr
                    key={row.feature}
                    className={cn(
                      "border-b border-border/70 last:border-b-0",
                      rowIndex % 2 === 1 && "bg-muted/15",
                    )}
                  >
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-r border-border bg-background/95 px-4 py-4 align-top backdrop-blur-sm"
                    >
                      <span className="text-sm font-medium leading-snug text-foreground">
                        {row.feature}
                      </span>
                    </th>
                    {section.columns.map((column) => {
                      const featured = column.id === featuredId;
                      const text = row.cells[column.id] ?? "—";
                      return (
                        <td
                          key={column.id}
                          className={cn(
                            "px-3 py-4 align-top sm:px-4",
                            featured &&
                              "border-x border-secondary/20 bg-secondary/[0.07] dark:bg-secondary/10",
                          )}
                        >
                          <ComparisonCell text={text} featured={featured} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {section.punchline ? (
          <p className="mx-auto max-w-3xl text-center text-sm leading-relaxed text-muted-foreground text-pretty md:text-base">
            {section.punchline}
          </p>
        ) : null}

        {section.cta ? (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <HubCtaButton cta={section.cta} variant="primary" />
            {section.secondaryCta ? (
              <HubCtaButton cta={section.secondaryCta} variant="secondary" />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
