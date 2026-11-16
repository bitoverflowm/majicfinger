import Link from "next/link";

import { formatNewsThreads } from "@/lib/lycheeNews/format";
import type { PulseItem } from "@/components/marketing/news-pulse-live";

type Draft = ReturnType<typeof formatNewsThreads>[number];

type Props = {
  items: PulseItem[];
  account?: string;
};

function DraftCard({ draft }: { draft: Draft }) {
  const tweets = draft.thread?.main
    ? [draft.thread.main, ...(draft.thread.replies || [])]
    : [];
  if (!tweets.length) return null;
  return (
    <article className="rounded-xl border border-border bg-muted/20 p-4 text-left">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Draft · {draft.source || "source TBD"}
        {draft.thread?.skipped ? " · skipped markets" : null}
      </p>
      <ol className="mt-3 flex flex-col gap-3">
        {tweets.map((text, i) => (
          <li key={i} className="rounded-lg border border-border/80 bg-background px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {i === 0 ? "Main" : `Reply ${i}`}
            </p>
            <pre className="mt-1 whitespace-pre-wrap font-sans text-[13px] leading-snug text-foreground">
              {text}
            </pre>
          </li>
        ))}
      </ol>
    </article>
  );
}

/** Server-rendered X payload preview from the same pulse items — never posts. */
export function NewsXDryRun({ items, account = "lychee_news" }: Props) {
  const drafts = formatNewsThreads(items || [], { limit: 4 }).filter((d) => d.thread?.main);
  if (!drafts.length) return null;

  return (
    <section className="mt-12 border-t border-border pt-10" aria-labelledby="x-dry-run-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
            X dry-run · @{account}
          </p>
          <h2 id="x-dry-run-heading" className="mt-1 text-xl font-normal tracking-tight text-foreground">
            What we would post (not live)
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Formatted threads from the pulse above. Live create-tweet for @lychee_news stays off until
            account warmup ends. When posting starts, only items after the enablement watermark go to X —
            this history is never dumped as a backlog.
          </p>
        </div>
        <Link
          href="/api/news/x-dry-run?demo=1"
          className="shrink-0 text-sm font-medium text-foreground underline-offset-4 hover:underline"
          prefetch={false}
        >
          JSON dry-run API
        </Link>
      </div>
      <div className="mt-6 flex flex-col gap-4">
        {drafts.map((draft) => (
          <DraftCard key={draft.id || draft.headline || JSON.stringify(draft.thread?.main)} draft={draft} />
        ))}
      </div>
    </section>
  );
}
