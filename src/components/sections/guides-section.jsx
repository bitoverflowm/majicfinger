"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-us", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

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
    <section id="guides" className="relative mx-auto w-full min-w-0 max-w-7xl px-4 py-16 sm:px-6">
      <div className="text-center space-y-4 pb-6 mx-auto">
        <h2 className="text-sm text-primary font-mono font-medium tracking-wider uppercase">Guides</h2>
        <h3 className="mx-auto mt-4 max-w-xs text-3xl font-semibold sm:max-w-none sm:text-4xl md:text-5xl">
          Latest Articles
        </h3>
      </div>
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
          filteredArticles.map((item, idx) => {
            const image = item.frontmatter?.coverImage || item.frontmatter?.image || item.frontmatter?.ogImage;
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
                  <div className="bg-muted h-[180px] mb-4 rounded flex items-center justify-center text-muted-foreground">
                    No image
                  </div>
                )}
                <p className="mb-2">
                  <time dateTime={item.frontmatter?.publishedAt} className="text-sm text-muted-foreground">
                    {formatDate(item.frontmatter?.publishedAt)}
                  </time>
                </p>
                <h3 className="text-xl font-semibold mb-2">{item.frontmatter?.title}</h3>
                <p className="text-foreground mb-4">{item.frontmatter?.description || item.frontmatter?.summary}</p>
              </div>
            </Link>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p>No guides yet. Check back soon!</p>
          </div>
        )}
      </div>
    </section>
  );
}
