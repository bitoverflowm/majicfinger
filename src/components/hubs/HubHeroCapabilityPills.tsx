import {
  Activity,
  BookOpen,
  FileDown,
  LineChart,
  MousePointerClick,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PILL_ICONS: Record<string, LucideIcon> = {
  "Trade history": Activity,
  "Orderbook history": BookOpen,
  "CSV/XLSX/JSON exports": FileDown,
  "No-code querying": MousePointerClick,
  "Backtesting-ready": LineChart,
};

type HubHeroCapabilityPillsProps = {
  pills: string[];
  className?: string;
};

export function HubHeroCapabilityPills({ pills, className }: HubHeroCapabilityPillsProps) {
  if (!pills.length) return null;

  return (
    <ul
      className={cn("flex flex-wrap items-center justify-center gap-2 sm:gap-2.5", className)}
      aria-label="Dataset capabilities"
    >
      {pills.map((pill) => {
        const Icon = PILL_ICONS[pill];

        return (
          <li key={pill}>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-normal shadow-sm backdrop-blur-sm transition-colors duration-200 ease-out",
                "border-white/60 bg-white/70 text-muted-foreground hover:text-foreground",
                "dark:border-white/20 dark:bg-black/25 dark:text-foreground/90 dark:shadow-none dark:hover:text-foreground",
              )}
            >
              {Icon ? (
                <Icon
                  className="size-3.5 shrink-0 text-muted-foreground/70 opacity-55 dark:text-foreground/80 dark:opacity-90"
                  aria-hidden
                />
              ) : null}
              {pill}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
