"use client";

import Image from "next/image";
import { Link2, Linkedin, Twitter } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { resolveArticleAuthor } from "@/lib/content/article-authors";
import { cn } from "@/lib/utils";

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
    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-6 sm:w-6";

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
    <div className="flex w-full max-w-full items-center gap-2 overflow-hidden sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
        <Image
          src={profile.avatarSrc}
          alt={profile.displayName}
          width={30}
          height={30}
          className="h-6 w-6 shrink-0 rounded-full object-cover sm:h-[30px] sm:w-[30px]"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[9px] font-medium leading-tight text-foreground sm:text-[10.5px]">
            {profile.displayName}
          </p>
          <p
            className={cn(
              "truncate text-[8px] leading-tight text-muted-foreground sm:text-[9px]",
            )}
          >
            {metaParts.join(" · ")}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-px sm:gap-0.5">
        <ShareIconButton label="Copy link" onClick={handleCopyLink}>
          <Link2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={1.75} />
        </ShareIconButton>
        <ShareIconButton label="Share on X" href={twitterShareUrl}>
          <Twitter className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={1.75} />
        </ShareIconButton>
        <ShareIconButton label="Share on LinkedIn" href={linkedInShareUrl}>
          <Linkedin className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={1.75} />
        </ShareIconButton>
      </div>
    </div>
  );
}
