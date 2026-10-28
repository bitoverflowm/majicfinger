import { cn } from "@/lib/utils";

/** Coloured initials standing in for a logo we don't ship. */
export function LetterTile({ mark, color, large }: { mark: string; color: string; large?: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center font-semibold leading-none text-white",
        large ? "size-11 rounded-xl text-sm" : "size-5 rounded-md text-[8.5px]",
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {mark}
    </span>
  );
}
