import { researchQuestions } from "@/lib/research-questions";
import Link from "next/link";
import { ResearchQuestionBadgeIcon } from "./research-question-badge";

const VENUES = new Set(["Kalshi", "Polymarket"]);

const highlights = researchQuestions
  .filter((item) => item.status === "published")
  .slice(0, 4)
  .map((item) => {
    const sources = VENUES.has(item.badges[0])
      ? item.badges.filter((badge) => VENUES.has(badge))
      : item.badges.slice(0, 1);
    const topic = item.badges.find((badge) => !sources.includes(badge) && badge !== item.type);
    return { ...item, sources, topic };
  });

export function ResearchHighlights() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-[min(100%,84rem)] px-6 py-12 sm:px-8 md:py-16 lg:px-10">
      <h2 className="mb-4 text-lg font-normal tracking-tight text-primary">Find signal in the noise</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((item) => (
          <Link
            key={item.question}
            href={item.href}
            className="flex min-h-[7.5rem] flex-col rounded-lg bg-accent p-4 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <p className="text-sm text-muted-foreground">
              {item.type}
              {item.topic ? ` · ${item.topic}` : null}
            </p>
            <p className="mt-1 text-[0.9375rem] leading-snug text-primary">{item.question}</p>
            <div className="mt-auto flex items-center gap-2 pt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                {item.sources.map((source) => (
                  <ResearchQuestionBadgeIcon key={source} label={source} />
                ))}
              </span>
              <span>{item.sources.join(" + ")}</span>
            </div>
          </Link>
        ))}
      </div>
      <Link
        href="/#guides"
        className="mt-4 inline-block text-sm text-secondary transition-colors hover:text-secondary/80"
      >
        View all research →
      </Link>
    </div>
  );
}
