import { FooterSection } from "@/components/sections/footer-section";
import { LycheeContentShell } from "@/components/content/LycheeContentShell";
import { getLycheeContentNavData } from "@/lib/content/lychee-content-nav";
import { articleSerif } from "@/lib/fonts/article-serif";
import { listUniversityLessons } from "@/lib/university/lessons";
import { UniversityMobileLessons } from "@/lib/university/progress";

export default async function UniversityLessonLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const navData = getLycheeContentNavData();
  const lessons = listUniversityLessons().map((lesson) => ({
    slug: lesson.slug,
    href: lesson.href,
    title: lesson.title,
    lesson: lesson.lesson,
    clusterLabel: lesson.clusterLabel,
  }));

  return (
    <LycheeContentShell
      navData={navData}
      currentPath={`/university/${slug}`}
      className={articleSerif.variable}
    >
      <div className="min-w-0">
        <UniversityMobileLessons lessons={lessons} currentSlug={slug} />
        {children}
        <FooterSection />
      </div>
    </LycheeContentShell>
  );
}
