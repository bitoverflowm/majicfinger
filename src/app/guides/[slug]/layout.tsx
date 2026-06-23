import { FooterSection } from "@/components/sections/footer-section";
import { LycheeContentShell } from "@/components/content/LycheeContentShell";
import { getLycheeContentNavData } from "@/lib/content/lychee-content-nav";
import { articleSerif } from "@/lib/fonts/article-serif";

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
      <div className="min-w-0">
        {children}
        <FooterSection />
      </div>
    </LycheeContentShell>
  );
}
