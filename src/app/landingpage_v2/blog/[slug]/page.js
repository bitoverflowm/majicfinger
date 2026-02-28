import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getContentBySlug, getAllSlugs } from "@/lib/content";
import { MDXContent } from "@/lib/content/mdx";
import Header from "@/components/landingPageV2/Header";
import Footer from "@/components/landingPageV2/Footer";

export async function generateStaticParams() {
  try {
    const slugs = getAllSlugs("blog");
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = getContentBySlug("blog", slug);
  if (!data) return { title: "Post Not Found" };
  return {
    title: `${data.frontmatter.title} | Easy Charts Blog`,
    description: data.frontmatter.description || data.frontmatter.summary,
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const data = getContentBySlug("blog", slug);

  if (!data) {
    notFound();
  }

  const { frontmatter, content } = data;

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <article className="max-w-3xl mx-auto px-4 py-16">
        <Link
          href="/landingpage_v2#blog"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to blog
        </Link>
        <h1 className="text-4xl font-bold mb-4">{frontmatter.title}</h1>
        <p className="text-muted-foreground mb-8">
          {frontmatter.publishedAt &&
            new Date(frontmatter.publishedAt).toLocaleDateString("en-us")}{" "}
          • {frontmatter.author}
        </p>
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <MDXContent source={content} />
        </div>
      </article>
      <Footer />
    </main>
  );
}
