import { cn } from "@/lib/utils";
import { Newspaper, type LucideIcon } from "lucide-react";

export type Venue = {
  name: string;
  src?: string;
  mark?: string;
  icon?: string;
  tileClass?: string;
  badge?: string;
  description?: string;
  includes?: readonly { name: string; detail: string }[];
  links?: readonly { label: string; href: string }[];
};

const VENUE_ICONS: Record<string, LucideIcon> = {
  news: Newspaper,
};

export function VenueMark({ venue, className }: { venue: Venue; className?: string }) {
  const Icon = venue.icon ? VENUE_ICONS[venue.icon] : undefined;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden font-bold leading-none",
        venue.tileClass,
        className,
      )}
    >
      {venue.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={venue.src} alt="" className="size-full object-contain" />
      ) : Icon ? (
        <Icon className="size-[70%]" strokeWidth={2} aria-hidden />
      ) : (
        venue.mark
      )}
    </span>
  );
}
