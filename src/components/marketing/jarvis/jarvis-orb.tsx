import { cn } from "@/lib/utils";

/** Jarvis's animated core. `on` replays the power-up each time `bootKey` changes. */
export function JarvisOrb({
  on = true,
  bootKey,
  className,
}: {
  on?: boolean;
  bootKey?: string | number;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-square", className)} aria-hidden>
      {on ? (
        <div key={bootKey} className="absolute inset-0 [animation:jx-boot_.9s_cubic-bezier(.165,.84,.44,1)_both]">
          <div className="absolute inset-0 rounded-full bg-secondary/30 blur-2xl [animation:jx-breathe_3.2s_ease-in-out_infinite]" />
          <div className="absolute inset-[8%] rounded-full border border-dashed border-secondary/50 [animation:jx-spin_14s_linear_infinite]" />
          <div className="absolute inset-[18%] rounded-full border border-[#7c5cff]/40 [animation:jx-spin_22s_linear_infinite_reverse]">
            <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-[#7c5cff] shadow-[0_0_10px_#7c5cff]" />
          </div>
          <div className="absolute inset-[30%] rounded-full bg-gradient-to-br from-sky-300 via-secondary to-[#7c5cff] shadow-[0_0_40px_rgba(47,111,237,0.55)]" />
          <div className="absolute inset-[30%] rounded-full border-2 border-secondary/60 [animation:jx-ping_2.4s_ease-out_infinite]" />
          <div className="absolute inset-[38%] rounded-full bg-gradient-to-br from-white/70 to-transparent opacity-60" />
        </div>
      ) : (
        <div className="absolute inset-[30%] rounded-full bg-gradient-to-br from-neutral-300 to-neutral-400 opacity-70 dark:from-neutral-600 dark:to-neutral-700" />
      )}
    </div>
  );
}
