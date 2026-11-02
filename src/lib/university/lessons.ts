import { getAllContent } from "@/lib/content";
import type { UniversityLesson } from "@/lib/university/types";

export function clusterLabel(cluster: string): string {
  const clean = cluster.trim();
  if (!clean) return "General";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/** Lessons in course order: lesson 1, then later lessons. */
export function listUniversityLessons(): UniversityLesson[] {
  return getAllContent("university")
    .map((item): UniversityLesson => {
      const fm = item.frontmatter;
      const cluster = (fm.cluster || "general").trim().toLowerCase();
      const image = fm.coverImage || fm.image || undefined;
      return {
        slug: item.slug,
        href: `/university/${item.slug}`,
        title: fm.title,
        description: fm.description || fm.summary || "",
        publishedAt: fm.publishedAt || "",
        author: fm.author || "Lychee",
        readingTime: fm.readingTime?.trim() || undefined,
        lesson: typeof fm.lesson === "number" ? fm.lesson : Number.MAX_SAFE_INTEGER,
        cluster,
        clusterLabel: clusterLabel(cluster),
        image,
        featured: Boolean(fm.featured),
        videoUrl: fm.videoUrl?.trim() || undefined,
        videoDuration: fm.videoDuration?.trim() || undefined,
      };
    })
    .sort((a, b) => a.lesson - b.lesson || a.publishedAt.localeCompare(b.publishedAt) || a.title.localeCompare(b.title));
}
