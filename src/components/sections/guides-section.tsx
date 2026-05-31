"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentItem } from "@/lib/content/types";
import type { LandingDashboardCard } from "@/lib/landing/publishedDashboards";
import { LandingDashboardCardItem } from "@/components/sections/landing-dashboard-card";

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-us", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

type CombinedFilter = "dashboards" | "guides" | "new-features";

const COMBINED_FILTER_BUTTONS: { id: CombinedFilter; label: string }[] = [
  { id: "dashboards", label: "Dashboards" },
  { id: "guides", label: "Guides" },
  { id: "new-features", label: "New Features" },
];

function filterButtonClass(active: boolean) {
  return cn(
    "inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors",
    active ? "bg-muted text-foreground" : "bg-background hover:bg-muted",
  );
}

type GuidesSectionProps = {
  articles?: ContentItem[];
  dashboards?: LandingDashboardCard[];
  profilePic?: string | null;
  /** Combined home layout: dashboards flow into guides under one heading. */
  combinedWithDashboards?: boolean;
};

export default function GuidesSection({
  articles = [],
  dashboards = [],
  profilePic = null,
  combinedWithDashboards = false,
}: GuidesSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [combinedFilter, setCombinedFilter] = useState<CombinedFilter | null>(null);
  const showCombined = combinedWithDashboards;

  const filteredDashboards = useMemo(() => {
    if (!searchQuery.trim()) return dashboards;
    const q = searchQuery.toLowerCase();
    return dashboards.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.tags?.some((t) => t.toLowerCase().includes(q)),
    );
  }, [dashboards, searchQuery]);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter(
      (item) =>
        (item.frontmatter?.title || "").toLowerCase().includes(q) ||
        (item.frontmatter?.description || item.frontmatter?.summary || "")
          .toLowerCase()
          .includes(q) ||
        (item.excerpt || "").toLowerCase().includes(q),
    );
  }, [articles, searchQuery]);

  const featureReleases = useMemo(
    () =>
      filteredArticles.filter((item) => {
        const section = (item.frontmatter?.section || "").toLowerCase();
        const topics = Array.isArray(item.frontmatter?.topics)
          ? item.frontmatter.topics.map((t) => String(t).toLowerCase())
          : [];
        return (
          section === "feature-releases" ||
          topics.includes("feature-release") ||
          topics.includes("product-update")
        );
      }),
    [filteredArticles],
  );

  const standardArticles = useMemo(
    () =>
      filteredArticles.filter((item) => {
        const section = (item.frontmatter?.section || "").toLowerCase();
        return section !== "feature-releases";
      }),
    [filteredArticles],
  );

  const renderGuideGrid = (items: ContentItem[]) => (
    <>
      {items.length > 0 ? (
        items.map((item, idx) => {
          const image =
            item.frontmatter?.coverImage || item.frontmatter?.image || item.frontmatter?.ogImage;
          return (
            <Link
              key={`${item.contentType}-${item.slug}`}
              href={`/guides/${item.slug}`}
              className="block min-w-0 max-w-full"
              prefetch={false}
            >
              <div className="mb-4 min-w-0 max-w-full overflow-hidden rounded-xl border border-neutral-200 bg-background p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md dark:border-neutral-800">
                {image ? (
                  <div className="relative mb-4 aspect-[40/21] w-full max-w-full overflow-hidden rounded-lg border">
                    <Image
                      className="object-cover"
                      src={image}
                      alt={item.frontmatter?.title || "Guide image"}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      priority={idx <= 1}
                    />
                  </div>
                ) : (
                  <div className="bg-muted mb-4 flex h-[180px] items-center justify-center rounded text-muted-foreground">
                    No image
                  </div>
                )}
                <p className="mb-2">
                  <time
                    dateTime={item.frontmatter?.publishedAt}
                    className="text-sm text-muted-foreground"
                  >
                    {formatDate(item.frontmatter?.publishedAt)}
                  </time>
                </p>
                <h4 className="mb-2 text-xl font-semibold">{item.frontmatter?.title}</h4>
                <p className="mb-4 text-foreground">
                  {item.frontmatter?.description || item.frontmatter?.summary}
                </p>
              </div>
            </Link>
          );
        })
      ) : !showCombined ? (
        <div className="col-span-full py-12 text-center text-muted-foreground">
          <p>No guides yet. Check back soon!</p>
        </div>
      ) : null}
    </>
  );

  const showDashboards = !showCombined || combinedFilter === null || combinedFilter === "dashboards";
  const showGuides = !showCombined || combinedFilter === null || combinedFilter === "guides";
  const showNewFeatures =
    !showCombined || combinedFilter === null || combinedFilter === "new-features";
  const showFeatureReleasesSection = !showCombined || combinedFilter === null;

  const visibleDashboards = showDashboards ? filteredDashboards : [];
  const visibleGuides = showGuides ? standardArticles : [];
  const visibleFeatureReleases = showNewFeatures ? featureReleases : [];

  const hasFilteredItems =
    combinedFilter === "dashboards"
      ? visibleDashboards.length > 0
      : combinedFilter === "guides"
        ? visibleGuides.length > 0
        : combinedFilter === "new-features"
          ? visibleFeatureReleases.length > 0
          : visibleDashboards.length > 0 || visibleGuides.length > 0;

  return (
    <section id="guides" className="relative mx-auto w-full min-w-0 max-w-7xl px-4 py-16 sm:px-6">
      <div className="mx-auto space-y-4 pb-6 text-center">
        {showCombined ? (
          <>
            <h2 className="mx-auto max-w-2xl text-balance text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
              Featured workflows, showcase and How-tos
            </h2>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Step-by-step guides and published dashboards -- so you know what is possible with
              Lychee
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {COMBINED_FILTER_BUTTONS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    setCombinedFilter((current) => (current === id ? null : id))
                  }
                  className={filterButtonClass(combinedFilter === id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="font-mono text-sm font-medium uppercase tracking-wider text-primary">
              Guides
            </p>
            <h2 className="mx-auto mt-4 max-w-xs text-3xl font-semibold sm:max-w-none sm:text-4xl md:text-5xl">
              How it works, how-tos, and guides
            </h2>
          </>
        )}
      </div>

      <div className="mx-auto mb-8 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder={showCombined ? "Search guides and dashboards..." : "Search guides..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-base ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300",
              "pl-10",
            )}
          />
        </div>
      </div>

      <div>
        {!showCombined && <h3 className="mb-4 text-left text-xl font-semibold">Guides & Blogs</h3>}
        <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {visibleDashboards.map((d, idx) => (
            <LandingDashboardCardItem
              key={`${d.username}-${d.slug}`}
              dashboard={d}
              profilePic={profilePic}
              priority={idx <= 1}
            />
          ))}
          {renderGuideGrid(visibleGuides)}
          {showCombined && combinedFilter === "new-features"
            ? renderGuideGrid(visibleFeatureReleases)
            : null}
          {!hasFilteredItems && showCombined && combinedFilter !== null ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              <p>
                {combinedFilter === "new-features"
                  ? "No new features match your search."
                  : combinedFilter === "dashboards"
                    ? "No dashboards match your search."
                    : "No guides match your search."}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {showFeatureReleasesSection && featureReleases.length > 0 && (
        <div className="mt-12">
          <h3 className="mb-4 text-left text-xl font-semibold">Feature Releases</h3>
          <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {renderGuideGrid(featureReleases)}
          </div>
        </div>
      )}
    </section>
  );
}
