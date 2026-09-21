"use client";

import { ClientTweetCard } from "@/components/magicui/client-tweet-card";
import { cn } from "@/lib/utils";

/** Extract a numeric tweet ID from a raw id or x.com / twitter.com status URL. */
export function parseTweetId(input: string): string | null {
  const trimmed = String(input || "").trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, "");
    if (host !== "x.com" && host !== "twitter.com") return null;
    const match = url.pathname.match(/\/status\/(\d+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

type TweetCardProps = {
  id?: string;
  url?: string;
  className?: string;
};

/**
 * Magic UI tweet card for MDX. Follows site light/dark tokens.
 * Use `<TweetCard id="..." />` or `<TweetCard url="https://x.com/.../status/..." />`.
 */
export function TweetCard({ id, url, className }: TweetCardProps) {
  const tweetId = parseTweetId(id || "") || parseTweetId(url || "");
  if (!tweetId) return null;

  return (
    <div className={cn("my-8 flex w-full justify-center", className)}>
      <ClientTweetCard id={tweetId} />
    </div>
  );
}
