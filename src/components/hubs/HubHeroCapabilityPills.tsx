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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/70 px-3.5 py-1.5 text-sm font-normal text-muted-foreground shadow-sm backdrop-blur-sm transition-colors duration-200 ease-out hover:text-foreground dark:border-border/50 dark:bg-background/55">
              {Icon ? <Icon className="size-3.5 shrink-0 opacity-55" aria-hidden /> : null}
              {pill}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
