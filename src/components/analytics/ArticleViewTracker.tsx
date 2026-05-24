"use client";

import { useTelegramContentTracker } from "@/hooks/useTelegramContentTracker";

/**
 * Client-only tracker for guide/blog article reads.
 */
export function ArticleViewTracker({
  title,
  slug,
  contentType = "guides",
}: {
  title: string;
  slug: string;
  contentType?: "guides" | "blog";
}) {
  useTelegramContentTracker({
    contentType: "article",
    name: title,
    path: `/guides/${slug}`,
    enabled: !!title,
  });
  return null;
}
