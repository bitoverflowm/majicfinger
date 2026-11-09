import { cn } from "@/lib/utils";

export function LiveDot({ on, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
      <span className="relative flex size-2">
        {on ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" /> : null}
        <span className={cn("relative inline-flex size-2 rounded-full", on ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-600")} />
      </span>
      {label}
    </span>
  );
}
