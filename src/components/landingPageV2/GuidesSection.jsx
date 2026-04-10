"use client";

import { useState, useMemo } from "react";
import BlogCard from "./BlogCard";
import Section from "./Section";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function GuidesSection({ articles = [] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter(
      (item) =>
        (item.frontmatter?.title || "").toLowerCase().includes(q) ||
        (item.frontmatter?.description || item.frontmatter?.summary || "").toLowerCase().includes(q) ||
        (item.excerpt || "").toLowerCase().includes(q)
    );
  }, [articles, searchQuery]);

  return (
    <Section id="guides" title="Guides" subtitle="Latest Articles">
      <div className="mb-8 max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search guides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {filteredArticles.length > 0 ? (
          filteredArticles.map((item, idx) => (
            <BlogCard
              key={`${item.contentType}-${item.slug}`}
              data={{
                slug: item.slug,
                title: item.frontmatter?.title,
                summary: item.frontmatter?.description || item.frontmatter?.summary,
                publishedAt: item.frontmatter?.publishedAt,
                author: item.frontmatter?.author,
                image: item.frontmatter?.coverImage || item.frontmatter?.image || item.frontmatter?.ogImage,
              }}
              priority={idx <= 1}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p>No guides yet. Check back soon!</p>
          </div>
        )}
      </div>
    </Section>
  );
}
