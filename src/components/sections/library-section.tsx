/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import Link from "next/link";

import { isFeatureReleaseContent } from "@/lib/content/featureReleaseMatchers";
import type { ContentItem } from "@/lib/content/types";
import type { LandingDashboardCard } from "@/lib/landing/publishedDashboards";
import { researchQuestions } from "@/lib/research-questions";

const PER_ROW = 4;

/** Topics that mark a guide as research (analysis of market behaviour rather than a how-to). */
const RESEARCH_TOPICS = new Set([
  "market analysis",
  "market accuracy",
  "market calibration",
  "probability calibration",
  "forecasting",
  "brier score",
  "analysis",
]);

/** Research questions pointing at a guide, keyed by slug, so their topic badge can label the card. */
const RESEARCH_BY_SLUG = new Map(
  researchQuestions
    .filter((q) => q.status === "published" && q.type === "Research" && q.href.startsWith("/guides/"))
    .map((q) => [q.href.replace("/guides/", ""), q]),
);

type Card = {
  key: string;
  href: string;
  image: string | null;
  date?: string | null;
  category: string;
  title: string;
  author: string;
  authorPic: string | null;
  meta?: string;
};

function formatDate(dateStr: string | undefined | null) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function labels(item: ContentItem): string[] {
  const topics = Array.isArray(item.frontmatter?.topics) ? item.frontmatter.topics : [];
  const tags = Array.isArray(item.frontmatter?.tags) ? item.frontmatter.tags : [];
  return [...topics, ...tags].map((t) => String(t).trim().toLowerCase());
}

function isResearch(item: ContentItem) {
  if (RESEARCH_BY_SLUG.has(item.slug)) return true;
  if (/^how to\b/i.test(item.frontmatter?.title || "")) return false;
  return labels(item).some((label) => RESEARCH_TOPICS.has(label));
}

function titleCase(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function articleCard(item: ContentItem, kind: "Research" | "Guide", profilePic: string | null): Card {
  const fm = item.frontmatter ?? {};
  const topic =
    kind === "Research"
      ? RESEARCH_BY_SLUG.get(item.slug)?.badges[1] ??
        titleCase(labels(item).find((l) => l.includes("weather") || l.includes("politic")) ?? "Research")
      : "Guide";
  const author = String(fm.author || "Lychee");
  return {
    key: `${item.contentType}-${item.slug}`,
    href: `/guides/${item.slug}`,
    image: fm.coverImage || fm.image || fm.ogImage || null,
    date: fm.publishedAt,
    category: kind === "Research" && topic !== "Research" ? `Research · ${topic}` : kind === "Research" ? "Research" : "Guide",
    title: fm.title || item.slug,
    author,
    authorPic: author === "misterrpink" ? profilePic : null,
    meta: fm.readingTime ? `${fm.readingTime} read` : undefined,
  };
}

function dashboardCard(d: LandingDashboardCard, profilePic: string | null): Card {
  const user = encodeURIComponent(d.username);
  const slug = encodeURIComponent(d.slug);
  return {
    key: `${d.username}-${d.slug}`,
    href: `/${user}/dashboards/${slug}`,
    image: d.hasOgImage ? `/api/public/dashboards/${user}/${slug}/og-image` : null,
    date: d.publishedAt,
    category: d.tags?.[0] ? `Dashboard · ${titleCase(d.tags[0])}` : "Dashboard",
    title: d.title,
    author: `@${d.username}`,
    authorPic: profilePic,
    meta: "Live",
  };
}

function byNewest<T extends { frontmatter?: { publishedAt?: string } }>(a: T, b: T) {
  return String(b.frontmatter?.publishedAt || "").localeCompare(String(a.frontmatter?.publishedAt || ""));
}

type LibrarySectionProps = {
  articles?: ContentItem[];
  dashboards?: LandingDashboardCard[];
  profilePic?: string | null;
};

/** Homepage library: research, dashboards and guides, each as its own row of cards. */
export function LibrarySection({ articles = [], dashboards = [], profilePic = null }: LibrarySectionProps) {
  const pool = articles.filter((item) => !isFeatureReleaseContent(item)).sort(byNewest);
  const research = pool.filter(isResearch);
  const guides = pool.filter((item) => !isResearch(item));

  const rows = [
    {
      id: "library-research",
      title: "Research Highlights",
      cards: research.slice(0, PER_ROW).map((item) => articleCard(item, "Research", profilePic)),
      href: "/guides",
      cta: "View all research",
    },
    {
      id: "library-dashboards",
      title: "Dashboards",
      cards: dashboards.slice(0, PER_ROW).map((d) => dashboardCard(d, profilePic)),
      href: "/dashboards-gallery",
      cta: "View all dashboards",
    },
    {
      title: "Guides",
      cards: guides.slice(0, PER_ROW).map((item) => articleCard(item, "Guide", profilePic)),
      href: "/guides",
      cta: "View all guides",
    },
  ].filter((row) => row.cards.length > 0);

  return (
    <section id="guides" className="relative w-full scroll-mt-28">
      <div className="mx-auto w-full max-w-[min(100%,84rem)] px-6 py-12 sm:px-8 md:py-16 lg:px-10">
        <div className="max-w-2xl">
          <h2 className="text-xl font-normal tracking-tight text-primary sm:text-2xl">
            Featured workflows, showcase and How-tos
          </h2>
          <p className="mt-1 text-muted-foreground">
            Step-by-step guides and published dashboards -- so you know what is possible with Lychee
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-12">
          {rows.map((row) => (
            <div key={row.title} id={"id" in row ? row.id : undefined} className="scroll-mt-28">
              <h3 className="mb-4 text-lg font-normal tracking-tight text-primary">{row.title}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {row.cards.map((card) => (
                  <LibraryCard key={card.key} card={card} />
                ))}
              </div>
              <Link
                href={row.href}
                className="mt-4 inline-block text-sm text-secondary transition-colors hover:text-secondary/80"
              >
                {row.cta} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LibraryCard({ card }: { card: Card }) {
  return (
    <Link
      href={card.href}
      prefetch={false}
      className="group flex min-w-0 flex-col rounded-lg bg-accent p-2 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[40/21] w-full overflow-hidden rounded-md bg-muted">
        {card.image ? (
          <Image
            src={card.image}
            alt={card.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-landing-smooth group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">Lychee</div>
        )}
      </div>
      <div className="flex flex-1 flex-col px-2 pb-2 pt-3">
        <p className="text-sm text-muted-foreground">
          {[formatDate(card.date), card.category].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-1 line-clamp-2 text-[0.9375rem] leading-snug text-primary">{card.title}</p>
        <div className="mt-auto flex items-center gap-2 pt-4 text-sm text-muted-foreground">
          {card.authorPic ? (
            <img src={card.authorPic} alt="" className="size-5 rounded-full object-cover" />
          ) : (
            <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-primary">
              {card.author.replace("@", "").charAt(0).toUpperCase()}
            </span>
          )}
          <span className="truncate">
            {card.author}
            {card.meta ? ` · ${card.meta}` : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
