import Link from "next/link";

import { JARVIS_KEYFRAMES } from "@/components/marketing/jarvis/jarvis-keyframes";

type JarvisCta = { href: string; text: string; badge?: string; title?: string; description?: string };

/** Homepage pointer to /jarvis: a pill, a hand-drawn arrow, and what Jarvis does. */
export function JarvisHeroCallout({ cta }: { cta: JarvisCta }) {
  return (
    <div className="features-showcase flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-2">
      <style dangerouslySetInnerHTML={{ __html: JARVIS_KEYFRAMES }} />
      <Link
        href={cta.href}
        className="group flex h-11 shrink-0 items-center gap-2.5 rounded-full border border-border bg-background pl-1.5 pr-5 text-[15px] font-normal text-primary shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition-all ease-out hover:border-secondary/40 hover:shadow-[0_0_0_4px_color-mix(in_oklch,var(--secondary)_12%,transparent)] active:scale-95"
      >
        {cta.badge ? (
          <span className="rounded-full bg-gradient-to-r from-secondary to-[#7c5cff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            {cta.badge}
          </span>
        ) : null}
        <span className="relative flex size-2.5 shrink-0" aria-hidden>
          <span className="absolute inset-0 rounded-full bg-secondary/60 [animation:jx-ping_2.4s_ease-out_infinite]" />
          <span className="relative size-full rounded-full bg-gradient-to-br from-sky-300 via-secondary to-[#7c5cff]" />
        </span>
        {cta.text}
      </Link>

      {cta.title ? (
        <div className="flex items-center gap-1 sm:gap-2">
          <svg
            viewBox="0 0 64 32"
            className="hidden h-8 w-16 shrink-0 text-muted-foreground/70 sm:block"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path
              d="M3 22c6-12 16-15 22-8s4 12-2 10-4-12 8-15 22 2 29 6"
              pathLength={1}
              strokeDasharray="1"
              className="[animation:jx-draw_1s_.4s_ease-out_both]"
            />
            <path
              d="M53 9l9 6-10 3"
              pathLength={1}
              strokeDasharray="1"
              className="[animation:jx-draw_.3s_1.35s_ease-out_both]"
            />
          </svg>
          <p className="max-w-[22rem] text-sm leading-snug [animation:jx-pop_.5s_1.1s_both]">
            <span className="font-medium text-primary">{cta.title}</span>{" "}
            <span className="text-muted-foreground">{cta.description}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
