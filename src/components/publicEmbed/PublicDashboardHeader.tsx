"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Database, Link2 } from "lucide-react";
import { RunForYourselfButton } from "@/components/runYourself/RunForYourselfButton";
import { publicEmbedOutboundLinkProps } from "@/components/publicEmbed/publicEmbedOutboundLink";
import { cn } from "@/lib/utils";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

function ShareLinkButton() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(window.location.href).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        });
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-background px-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
    >
      {copied ? <Check className="size-3.5 text-emerald-600" aria-hidden /> : <Link2 className="size-3.5" aria-hidden />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

function formatUpdated(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function PublicDashboardHeader({
  username,
  slug,
  title,
  subheading,
  ownerHandle,
  ownerPic,
  tags,
  liveBacked,
  cluster,
  updatedAt,
  displayName,
}: {
  username: string;
  slug: string;
  title: string;
  subheading?: string;
  ownerHandle: string;
  ownerPic?: string | null;
  tags: string[];
  liveBacked: boolean;
  cluster: { title: string; href: string } | null;
  updatedAt?: string | null;
  displayName: string;
}) {
  const [isEmbedded, setIsEmbedded] = useState(false);
  useEffect(() => setIsEmbedded(window.self !== window.top), []);
  const outbound = publicEmbedOutboundLinkProps(isEmbedded);
  const updated = formatUpdated(updatedAt);

  return (
    <header className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2.5">
          {cluster || liveBacked ? (
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              {cluster ? (
                <Link
                  href={cluster.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 py-0.5 font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                  {...outbound}
                >
                  <Database className="size-3 text-muted-foreground" aria-hidden />
                  {cluster.title}
                </Link>
              ) : null}
              {liveBacked ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-medium text-emerald-700 dark:text-emerald-400">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-70 motion-safe:animate-ping" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Live
                </span>
              ) : null}
            </div>
          ) : null}
          <h1 className="text-balance text-[26px] font-semibold leading-tight tracking-tight text-foreground sm:text-[32px]">
            {title}
          </h1>
          {subheading ? (
            <p className="max-w-3xl text-pretty text-[15px] leading-relaxed text-muted-foreground">{subheading}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-0.5 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              {ownerPic ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ownerPic} alt="" className="size-5 rounded-full object-cover ring-1 ring-border" />
              ) : (
                <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold ring-1 ring-border">
                  {(ownerHandle[0] || "?").toUpperCase()}
                </span>
              )}
              <span>
                <span className="font-medium text-foreground">@{ownerHandle}</span> on{" "}
                <Link href={SITE} className="font-medium text-foreground hover:underline" {...outbound}>
                  Lychee
                </Link>
              </span>
            </span>
            {updated ? <span>Updated {updated}</span> : null}
            {tags.length ? (
              <span className="flex flex-wrap items-center gap-1.5">
                {tags.slice(0, 6).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[10.5px] text-foreground/75"
                  >
                    {tag}
                  </span>
                ))}
              </span>
            ) : null}
          </div>
        </div>
        <div className={cn("flex shrink-0 flex-wrap items-center gap-2")}>
          <ShareLinkButton />
          <RunForYourselfButton
            ownerHandle={username}
            dashboardSlug={slug}
            kind="dashboard"
            variant="dashboard"
            displayName={displayName}
            className="h-8 rounded-md px-3 text-[13px] font-medium"
          />
        </div>
      </div>
    </header>
  );
}
