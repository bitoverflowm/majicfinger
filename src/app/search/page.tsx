"use client";

import { useMemo, useState, useEffect } from "react";
import Fuse from "fuse.js";
import Link from "next/link";
import { Container, ContentWrapper, Section, H1, P, Muted, KnowledgeCard } from "@/components/ui";

type SearchIndexItem = {
  slug: string;
  contentType: string;
  title: string;
  description: string;
  excerpt?: string;
  integration: string[];
  topics: string[];
  tags: string[];
};

const CONTENT_TYPES = [
  "guides",
  "blog",
  "integrations",
  "concepts",
  "playbooks",
] as const;

function hrefForSearchItem(item: SearchIndexItem): string {
  // Blog MDX is rendered under /guides/[slug] (same route as guides); /blog/[slug] has no app route.
  if (item.contentType === "blog") {
    return `/guides/${item.slug}`;
  }
  return `/${item.contentType}/${item.slug}`;
}

export default function SearchPage() {
  const [searchIndex, setSearchIndex] = useState<SearchIndexItem[]>([]);
  const [query, setQuery] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const [integrationFilter, setIntegrationFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/search-index.json")
      .then((res) => res.json())
      .then((data: SearchIndexItem[]) => {
        setSearchIndex(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(searchIndex, {
        keys: ["title", "description", "excerpt", "integration", "topics", "tags"],
        threshold: 0.4,
      }),
    [searchIndex]
  );

  const integrations = useMemo(() => {
    const set = new Set<string>();
    searchIndex.forEach((item) => item.integration.forEach((i) => set.add(i)));
    return Array.from(set).sort();
  }, [searchIndex]);

  const topics = useMemo(() => {
    const set = new Set<string>();
    searchIndex.forEach((item) => item.topics.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [searchIndex]);

  const results = useMemo(() => {
    let filtered = searchIndex;

    if (contentTypeFilter !== "all") {
      filtered = filtered.filter((item) => item.contentType === contentTypeFilter);
    }
    if (integrationFilter !== "all") {
      filtered = filtered.filter((item) =>
        item.integration.includes(integrationFilter)
      );
    }
    if (topicFilter !== "all") {
      filtered = filtered.filter((item) => item.topics.includes(topicFilter));
    }

    if (!query.trim()) return filtered;

    const searched = fuse.search(query);
    const searchedSlugs = new Set(searched.map((r) => r.item.slug));
    return filtered.filter((item) => searchedSlugs.has(item.slug));
  }, [
    searchIndex,
    query,
    contentTypeFilter,
    integrationFilter,
    topicFilter,
    fuse,
  ]);

  return (
    <Container>
      <ContentWrapper>
        <Section>
          <H1>Search</H1>
          <P className="text-muted-foreground">
            Search across guides, blog posts, integrations, concepts, and playbooks.
          </P>
        </Section>

        <Section>
          <input
            type="search"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </Section>

        <Section>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm text-muted-foreground mr-2">
                Content type
              </label>
              <select
                value={contentTypeFilter}
                onChange={(e) => setContentTypeFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All</option>
                {CONTENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            {integrations.length > 0 && (
              <div>
                <label className="text-sm text-muted-foreground mr-2">
                  Integration
                </label>
                <select
                  value={integrationFilter}
                  onChange={(e) => setIntegrationFilter(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All</option>
                  {integrations.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {topics.length > 0 && (
              <div>
                <label className="text-sm text-muted-foreground mr-2">
                  Topic
                </label>
                <select
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All</option>
                  {topics.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </Section>

        <Section>
          <h2 className="text-xl font-semibold mb-4">
            Results ({results.length})
          </h2>
          {!loaded ? (
            <Muted>Loading search index...</Muted>
          ) : results.length === 0 ? (
            <Muted>No results found.</Muted>
          ) : (
            <div className="space-y-4">
              {results.map((item) => (
                <Link
                  key={`${item.contentType}-${item.slug}`}
                  href={hrefForSearchItem(item)}
                  className="block"
                >
                  <KnowledgeCard>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {item.description}
                    </p>
                    <Muted className="mt-2 block capitalize">
                      {item.contentType}
                    </Muted>
                  </KnowledgeCard>
                </Link>
              ))}
            </div>
          )}
        </Section>
      </ContentWrapper>
    </Container>
  );
}
