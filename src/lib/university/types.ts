export type UniversityLesson = {
  slug: string;
  href: string;
  title: string;
  description: string;
  publishedAt: string;
  author: string;
  readingTime?: string;
  lesson: number;
  /** Lowercase topic cluster, e.g. "predictions". */
  cluster: string;
  clusterLabel: string;
  image?: string;
  featured: boolean;
  videoUrl?: string;
  videoDuration?: string;
};
