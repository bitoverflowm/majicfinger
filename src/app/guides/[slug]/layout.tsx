import { FooterSection } from "@/components/sections/footer-section";
import { LycheeContentShell } from "@/components/content/LycheeContentShell";
import { getLycheeContentNavData } from "@/lib/content/lychee-content-nav";
import { articleSerif } from "@/lib/fonts/article-serif";

/**
 * lychee_content article routes at `/guides/[slug]` (guides + blog MDX).
 * Sidebar links are server-rendered in full on every article for crawlability.
 */
export default async function LycheeContentArticleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const navData = getLycheeContentNavData();

  return (
    <LycheeContentShell
      navData={navData}
      currentPath={`/guides/${slug}`}
      className={articleSerif.variable}
    >
      {children}
      <FooterSection />
    </LycheeContentShell>
  );
}
