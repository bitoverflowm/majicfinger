"use client";

import { useTelegramContentTracker } from "@/hooks/useTelegramContentTracker";

/**
 * Client-only tracker for guide/blog article reads.
 */
export function ArticleViewTracker({
  title,
  slug,
  path,
}: {
  title: string;
  slug: string;
  contentType?: string;
  path?: string;
}) {
  useTelegramContentTracker({
    contentType: "article",
    name: title,
    path: path ?? `/guides/${slug}`,
    enabled: !!title,
  });
  return null;
}
