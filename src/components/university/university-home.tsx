"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";

import { NewsletterInline } from "@/components/newsletter/newsletter-signup";
import { LessonProgressBadge, useUniversityProgress } from "@/lib/university/progress";
import type { UniversityLesson } from "@/lib/university/types";
import { cn } from "@/lib/utils";

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const iso = dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function readingLabel(readingTime?: string) {
  if (!readingTime) return "";
  return /read/i.test(readingTime) ? readingTime : `${readingTime} read`;
}

function AuthorRow({
  lesson,
  light = false,
}: {
  lesson: UniversityLesson;
  light?: boolean;
}) {
  const showAvatar = lesson.author === "misterrpink";
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm", light ? "text-white/80" : "text-muted-foreground")}>
      {showAvatar ? (
        <Image src="/mrpink_pfp.jpg" alt="" width={20} height={20} className="size-5 rounded-full object-cover" />
      ) : null}
      <span>{lesson.author}</span>
      {lesson.readingTime ? <span>· {readingLabel(lesson.readingTime)}</span> : null}
      <span>·</span>
      <LessonProgressBadge slug={lesson.slug} idleLabel="Not started" />
    </p>
  );
}

function LessonFigure({ lesson, priority = false, className }: { lesson: UniversityLesson; priority?: boolean; className?: string }) {
  if (!lesson.image) {
    return <div className={cn("bg-muted", className)} />;
  }
  return (
    <Image
      src={lesson.image}
      alt=""
      fill
      priority={priority}
      sizes="(min-width: 1024px) 52vw, 100vw"
      className={cn("object-cover", className)}
    />
  );
}

function FeaturedCard({ lesson }: { lesson: UniversityLesson }) {
  return (
    <Link
      href={lesson.href}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background transition-colors hover:border-foreground/20 lg:row-span-2"
    >
      <div className="relative aspect-[16/10] bg-muted sm:aspect-[16/9]">
        <LessonFigure lesson={lesson} priority />
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="text-sm text-muted-foreground">
          <time dateTime={lesson.publishedAt}>{formatDate(lesson.publishedAt)}</time>
          <span> · {lesson.clusterLabel}</span>
          <span> · Lesson {lesson.lesson}</span>
        </p>
        <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-foreground group-hover:text-secondary sm:text-[1.75rem]">
          {lesson.title}
        </h2>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">{lesson.description}</p>
        <div className="mt-auto pt-5">
          <AuthorRow lesson={lesson} />
        </div>
      </div>
    </Link>
  );
}

function SideLessonCard({ lesson }: { lesson: UniversityLesson }) {
  return (
    <Link
      href={lesson.href}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background transition-colors hover:border-foreground/20"
    >
      <div className="relative aspect-[16/8] bg-muted">
        <LessonFigure lesson={lesson} />
        {lesson.image ? null : (
          <p className="absolute bottom-3 left-4 text-lg font-semibold tracking-tight text-foreground drop-shadow-sm">
            Lesson {lesson.lesson}
          </p>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-muted-foreground">
          <time dateTime={lesson.publishedAt}>{formatDate(lesson.publishedAt)}</time>
          <span> · {lesson.clusterLabel}</span>
          <span> · Lesson {lesson.lesson}</span>
        </p>
        <h2 className="mt-1 text-base font-semibold leading-snug tracking-tight text-foreground group-hover:text-secondary">
          {lesson.title}
        </h2>
        <div className="mt-auto pt-3">
          <AuthorRow lesson={lesson} />
        </div>
      </div>
    </Link>
  );
}

function ProgressCard({ lesson, percent, completed }: { lesson: UniversityLesson; percent: number; completed: boolean }) {
  const label = completed ? "Read" : percent > 0 ? `${percent}% read` : "Not started";
  return (
    <Link
      href={lesson.href}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background transition-colors hover:border-foreground/20"
    >
      <div className="flex aspect-[16/8] flex-col justify-end bg-muted p-5">
        <p className="font-mono text-4xl font-medium tracking-tight text-foreground">{completed ? "Read" : percent > 0 ? `${percent}%` : "0%"}</p>
        <p className="mt-1 text-sm text-muted-foreground">Lesson {lesson.lesson} on this device</p>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-muted-foreground">Your progress · {label}</p>
        <h2 className="mt-1 text-base font-semibold leading-snug tracking-tight text-foreground group-hover:text-secondary">
          {completed ? `Lesson ${lesson.lesson} is complete` : percent > 0 ? "Pick up where you left off" : `Start with lesson ${lesson.lesson}`}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Scroll progress is saved in this browser.</p>
      </div>
    </Link>
  );
}

function PracticeCard({ lesson }: { lesson: UniversityLesson }) {
  return (
    <Link
      href={`${lesson.href}#how-should-you-evaluate-a-forecast`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background transition-colors hover:border-foreground/20"
    >
      <div className="flex aspect-[16/8] flex-col justify-between bg-[#f4f1ea] p-5 text-zinc-950">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">Five checks</p>
        <p className="text-2xl font-semibold tracking-tight">Score a forecast</p>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-muted-foreground">Lesson {lesson.lesson} · Exercise</p>
        <h2 className="mt-1 text-base font-semibold leading-snug tracking-tight text-foreground group-hover:text-secondary">
          Event, deadline, probability, benchmark, result
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">The practical part of the first lesson.</p>
      </div>
    </Link>
  );
}

export function UniversityHome({ lessons }: { lessons: UniversityLesson[] }) {
  const { map, ready } = useUniversityProgress();
  const clusters = useMemo(() => {
    const seen = new Map<string, string>();
    for (const lesson of lessons) seen.set(lesson.cluster, lesson.clusterLabel);
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
  }, [lessons]);
  const [cluster, setCluster] = useState("all");
  const [query, setQuery] = useState("");

  const featured = lessons.find((lesson) => lesson.featured) ?? lessons[0];
  const others = lessons.filter((lesson) => lesson.slug !== featured?.slug);
  const featuredProgress = featured && ready ? map[featured.slug] : undefined;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lessons.filter((lesson) => {
      if (cluster !== "all" && lesson.cluster !== cluster) return false;
      if (!q) return true;
      return (
        lesson.title.toLowerCase().includes(q) ||
        lesson.description.toLowerCase().includes(q) ||
        lesson.clusterLabel.toLowerCase().includes(q) ||
        lesson.author.toLowerCase().includes(q) ||
        `lesson ${lesson.lesson}`.includes(q)
      );
    });
  }, [cluster, lessons, query]);

  const videos = lessons.filter((lesson) => lesson.videoUrl);
  const readCount = ready ? lessons.filter((lesson) => map[lesson.slug]?.completed).length : 0;

  return (
    <>
      <section className="mx-auto w-full px-6 pb-10 pt-8 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-primary">University</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Lessons on forecasting</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              A course on how to read predictions. Lesson 1 starts the predictions cluster.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
            {ready ? ` · ${readCount} read` : ""}
          </p>
        </div>

        {featured ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-[1.45fr_1fr] lg:grid-rows-2">
            <FeaturedCard lesson={featured} />
            {others[0] ? <SideLessonCard lesson={others[0]} /> : <ProgressCard lesson={featured} percent={featuredProgress?.percent ?? 0} completed={Boolean(featuredProgress?.completed)} />}
            {others[1] ? (
              <SideLessonCard lesson={others[1]} />
            ) : others[0] ? (
              <ProgressCard lesson={featured} percent={featuredProgress?.percent ?? 0} completed={Boolean(featuredProgress?.completed)} />
            ) : (
              <PracticeCard lesson={featured} />
            )}
          </div>
        ) : (
          <p className="mt-10 text-muted-foreground">Lessons will show up here as they are published.</p>
        )}
      </section>

      <NewsletterInline
        band
        plain
        layout="row"
        title="Subscribe for new lessons"
        description="Forecasting lessons, prediction-market walkthroughs, and the next course drop."
        note={null}
      />

      <section id="lessons" className="mx-auto w-full px-6 py-10 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <FilterButton active={cluster === "all"} onClick={() => setCluster("all")}>
              All
            </FilterButton>
            {clusters.map((item) => (
              <FilterButton key={item.id} active={cluster === item.id} onClick={() => setCluster(item.id)}>
                {item.label}
              </FilterButton>
            ))}
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <span className="sr-only">Search lessons</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30"
            />
          </label>
        </div>

        <ul className="mt-4 divide-y divide-border border-y border-border">
          {filtered.length === 0 ? (
            <li className="py-10 text-sm text-muted-foreground">No lessons match that search.</li>
          ) : (
            filtered.map((lesson) => (
              <li key={lesson.slug}>
                <Link href={lesson.href} className="group grid items-center gap-4 py-4 sm:grid-cols-[7.5rem_minmax(0,1fr)_9.5rem]">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-muted sm:aspect-[16/10]">
                    <LessonFigure lesson={lesson} className="transition-transform duration-500 group-hover:scale-[1.03]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      <time dateTime={lesson.publishedAt}>{formatDate(lesson.publishedAt)}</time>
                      <span> · {lesson.clusterLabel}</span>
                      <span> · Lesson {lesson.lesson}</span>
                    </p>
                    <h2 className="mt-1 text-base font-semibold leading-snug tracking-tight text-foreground group-hover:text-secondary">
                      {lesson.title}
                    </h2>
                  </div>
                  <div className="text-sm text-muted-foreground sm:text-right">
                    <p>{lesson.author}</p>
                    <p>{readingLabel(lesson.readingTime)}</p>
                    <LessonProgressBadge slug={lesson.slug} idleLabel="" className="text-xs" />
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mx-auto w-full px-6 py-10 sm:px-8 lg:px-10">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Videos</h2>
        {videos.length === 0 ? (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Lesson videos will be linked here when a real video is published. Lesson 1 is ready to read.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {videos.map((lesson) => (
              <li key={lesson.slug}>
                <a
                  href={lesson.videoUrl}
                  className="group block overflow-hidden rounded-xl border border-border bg-background"
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="relative aspect-video bg-muted">
                    {lesson.image ? <LessonFigure lesson={lesson} /> : null}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold leading-snug text-foreground group-hover:text-secondary">{lesson.title}</h3>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Lesson {lesson.lesson}
                      {lesson.videoDuration ? ` · ${lesson.videoDuration}` : ""}
                    </p>
                    <p className="mt-3 text-sm font-medium text-secondary">Watch video →</p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("transition-colors", active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
