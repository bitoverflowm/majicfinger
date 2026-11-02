"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export type LessonProgressRecord = {
  /** Highest scroll depth reached, 0–100. */
  percent: number;
  completed: boolean;
  updatedAt: number;
};

const STORAGE_KEY = "lychee:university:progress";
const CHANGE_EVENT = "lychee:university-progress";
const COMPLETE_AT = 90;

function readProgress(): Record<string, LessonProgressRecord> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, LessonProgressRecord>;
  } catch {
    return {};
  }
}

function writeProgress(next: Record<string, LessonProgressRecord>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: progress stays in memory for this view */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function recordLessonScroll(slug: string, percent: number) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const all = readProgress();
  const prev = all[slug];
  const nextPercent = Math.max(prev?.percent ?? 0, clamped);
  const completed = Boolean(prev?.completed) || nextPercent >= COMPLETE_AT;
  if (prev && prev.percent === nextPercent && prev.completed === completed) return prev;
  const record: LessonProgressRecord = {
    percent: completed ? Math.max(nextPercent, COMPLETE_AT) : nextPercent,
    completed,
    updatedAt: Date.now(),
  };
  all[slug] = record;
  writeProgress(all);
  return record;
}

export function useUniversityProgress() {
  const [map, setMap] = useState<Record<string, LessonProgressRecord>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setMap(readProgress());
      setReady(true);
    };
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) sync();
    };
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return { map, ready };
}

export function LessonProgressBadge({
  slug,
  className,
  idleLabel = "Not started",
}: {
  slug: string;
  className?: string;
  idleLabel?: string;
}) {
  const { map, ready } = useUniversityProgress();
  if (!ready) return null;
  const record = map[slug];
  const label =
    record?.completed ? "Read" : record && record.percent > 0 ? `${record.percent}% read` : idleLabel;
  return (
    <span
      className={cn(
        "font-medium",
        record?.completed ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}

/** Thin bar for the current scroll position. The stored record keeps the furthest point. */
export function LessonScrollTracker({ slug }: { slug: string }) {
  const [live, setLive] = useState(0);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const percent = scrollable <= 8 ? 100 : (window.scrollY / scrollable) * 100;
      setLive(percent);
      recordLessonScroll(slug, percent);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [slug]);

  const value = Math.max(0, Math.min(100, Math.round(live)));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label="Lesson reading progress"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 bg-border/70"
    >
      <div className="h-full bg-secondary transition-[width] duration-150 ease-out" style={{ width: `${value}%` }} />
    </div>
  );
}

export function UniversityLessonKicker({
  slug,
  lesson,
  clusterLabel,
}: {
  slug: string;
  lesson: number;
  clusterLabel: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
      <p className="text-muted-foreground">
        <Link href="/university" className="font-medium text-foreground hover:text-secondary">
          University
        </Link>
        <span> · Lesson {lesson}</span>
        <span> · {clusterLabel}</span>
      </p>
      <LessonProgressBadge slug={slug} />
    </div>
  );
}

type SidebarLessonLink = {
  href: string;
  label: string;
  slug?: string;
};

/** Compact lesson status: a ring that fills with scroll, or a check once the lesson is read. */
function LessonProgressMark({ percent, completed }: { percent: number; completed: boolean }) {
  const size = 14;
  const stroke = 1.75;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  if (completed) {
    return (
      <span
        className="mt-0.5 inline-flex size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
        role="img"
        aria-label="Read"
      >
        <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden>
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M4.1 7.2 6.1 9.15 9.9 4.9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className="mt-0.5 inline-flex size-3.5 shrink-0" role="img" aria-label={`${clamped}% read`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-3.5 -rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
          className="text-secondary"
        />
      </svg>
    </span>
  );
}

export function UniversitySidebarLinks({
  items,
  currentPath,
}: {
  items: SidebarLessonLink[];
  currentPath: string;
}) {
  const { map, ready } = useUniversityProgress();

  return (
    <ul className="space-y-1 pb-1">
      {items.map((item) => {
        const active = currentPath === item.href;
        const record = item.slug ? map[item.slug] : undefined;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={item.label}
              className={cn(
                "flex items-start justify-between gap-2 leading-snug transition-colors hover:text-secondary",
                active ? "text-secondary" : "text-foreground",
              )}
            >
              <span className="line-clamp-2">{item.label}</span>
              {ready && record && (record.completed || record.percent > 0) ? (
                <LessonProgressMark percent={record.percent} completed={record.completed} />
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function UniversityMobileLessons({
  lessons,
  currentSlug,
}: {
  lessons: { slug: string; href: string; title: string; lesson: number; clusterLabel: string }[];
  currentSlug: string;
}) {
  const { map, ready } = useUniversityProgress();

  return (
    <details className="border-b border-black/10 px-5 py-3 lg:hidden">
      <summary className="cursor-pointer text-sm font-medium text-foreground">All lessons</summary>
      <ul className="mt-3 space-y-2">
        {lessons.map((lesson) => {
          const record = map[lesson.slug];
          return (
            <li key={lesson.slug}>
              <Link
                href={lesson.href}
                aria-current={lesson.slug === currentSlug ? "page" : undefined}
                className={cn(
                  "flex items-start justify-between gap-3 text-sm leading-snug",
                  lesson.slug === currentSlug ? "text-secondary" : "text-foreground",
                )}
              >
                <span>
                  Lesson {lesson.lesson}
                  <span className="text-muted-foreground"> · {lesson.clusterLabel}</span>
                  <span className="mt-0.5 block text-muted-foreground">{lesson.title}</span>
                </span>
                {ready && record && (record.completed || record.percent > 0) ? (
                  <LessonProgressMark percent={record.percent} completed={record.completed} />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
