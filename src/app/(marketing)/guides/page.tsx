import GuidesSection from "@/components/sections/guides-section";
import { CTASection } from "@/components/sections/cta-section";
import { FooterSection } from "@/components/sections/footer-section";
import { getAllContent } from "@/lib/content";
import type { ContentItem } from "@/lib/content/types";

export const metadata = {
  title: "Guides | Lychee",
  description:
    "Tutorials and articles for prediction markets, Kalshi, Polymarket, and Lychee data workflows.",
};

export default function GuidesIndexPage() {
  let articles: ContentItem[] = [];
  try {
    const guides = getAllContent("guides") || [];
    const blog = getAllContent("blog") || [];
    articles = [...guides, ...blog];
    articles.sort((a, b) =>
      (b.frontmatter?.publishedAt || "").localeCompare(a.frontmatter?.publishedAt || ""),
    );
  } catch (e) {
    console.warn("Content could not be loaded:", e);
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center divide-y divide-border bg-background font-sans antialiased theme-landing scroll-smooth">
      <GuidesSection articles={articles} />
      <CTASection />
      <FooterSection />
    </main>
  );
}
