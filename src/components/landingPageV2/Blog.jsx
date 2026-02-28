import BlogCard from "./BlogCard";
import Section from "./Section";
import { getAllContent } from "@/lib/content";

export default function Blog() {
  let articles = [];
  try {
    articles = getAllContent("blog");
    articles.sort((a, b) =>
      (b.frontmatter.publishedAt || "").localeCompare(a.frontmatter.publishedAt || "")
    );
  } catch (e) {
    console.warn("Blog posts could not be loaded:", e);
  }

  return (
    <Section id="blog" title="Blog" subtitle="Latest Articles">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {articles.length > 0 ? (
          articles.map((item, idx) => (
            <BlogCard
              key={item.slug}
              data={{
                slug: item.slug,
                title: item.frontmatter.title,
                summary: item.frontmatter.description || item.frontmatter.summary,
                publishedAt: item.frontmatter.publishedAt,
                author: item.frontmatter.author,
                image: item.frontmatter.coverImage || item.frontmatter.image || item.frontmatter.ogImage,
              }}
              priority={idx <= 1}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p>No blog posts yet. Check back soon!</p>
          </div>
        )}
      </div>
    </Section>
  );
}
