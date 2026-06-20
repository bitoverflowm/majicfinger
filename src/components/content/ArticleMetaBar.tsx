"use client";

import Image from "next/image";
import { Link2, Linkedin, Twitter } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { resolveArticleAuthor } from "@/lib/content/article-authors";

type ArticleMetaBarProps = {
  author: string;
  publishedAt: string;
  readingTime?: string;
  title: string;
  shareUrl: string;
};

function formatArticleDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ShareIconButton({
  label,
  onClick,
  href,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
}) {
  const className =
    "inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={label} className={className}>
      {children}
    </button>
  );
}

export function ArticleMetaBar({
  author,
  publishedAt,
  readingTime,
  title,
  shareUrl,
}: ArticleMetaBarProps) {
  const profile = resolveArticleAuthor(author);
  const metaParts = [formatArticleDate(publishedAt)];
  if (readingTime?.trim()) metaParts.push(`${readingTime.trim()} read`);

  const twitterShareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied" });
    } catch {
      toast({
        title: "Could not copy link",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <Image
          src={profile.avatarSrc}
          alt={profile.displayName}
          width={30}
          height={30}
          className="h-[30px] w-[30px] shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-[10.5px] font-medium leading-tight text-foreground">
            {profile.displayName}
          </p>
          <p className="text-[9px] leading-tight text-muted-foreground">
            {metaParts.join(" · ")}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <ShareIconButton label="Copy link" onClick={handleCopyLink}>
          <Link2 className="h-3 w-3" strokeWidth={1.75} />
        </ShareIconButton>
        <ShareIconButton label="Share on X" href={twitterShareUrl}>
          <Twitter className="h-3 w-3" strokeWidth={1.75} />
        </ShareIconButton>
        <ShareIconButton label="Share on LinkedIn" href={linkedInShareUrl}>
          <Linkedin className="h-3 w-3" strokeWidth={1.75} />
        </ShareIconButton>
      </div>
    </div>
  );
}
