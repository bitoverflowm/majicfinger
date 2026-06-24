"use client";

import { cn } from "@/lib/utils";
import {
  Activity,
  Archive,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  CloudSun,
  Database,
  Download,
  FlaskConical,
  GitBranch,
  LayoutDashboard,
  LayoutGrid,
  Lightbulb,
  LineChart,
  Radio,
  Rss,
  Scale,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

type ThemeKey =
  | "emerald"
  | "sky"
  | "violet"
  | "indigo"
  | "cyan"
  | "amber"
  | "orange"
  | "rose"
  | "fuchsia"
  | "teal"
  | "slate"
  | "zinc";

type BadgeTheme = {
  container: string;
  iconClassName: string;
};

const THEMES: Record<ThemeKey, BadgeTheme> = {
  emerald: {
    container:
      "bg-emerald-50/95 text-emerald-950 border-emerald-100/70 dark:bg-emerald-500/10 dark:text-emerald-100 dark:border-emerald-500/20",
    iconClassName: "text-emerald-600 dark:text-emerald-400",
  },
  sky: {
    container:
      "bg-sky-50/95 text-sky-950 border-sky-100/70 dark:bg-sky-500/10 dark:text-sky-100 dark:border-sky-500/20",
    iconClassName: "text-sky-600 dark:text-sky-400",
  },
  violet: {
    container:
      "bg-violet-50/95 text-violet-950 border-violet-100/70 dark:bg-violet-500/10 dark:text-violet-100 dark:border-violet-500/20",
    iconClassName: "text-violet-600 dark:text-violet-400",
  },
  indigo: {
    container:
      "bg-indigo-50/95 text-indigo-950 border-indigo-100/70 dark:bg-indigo-500/10 dark:text-indigo-100 dark:border-indigo-500/20",
    iconClassName: "text-indigo-600 dark:text-indigo-400",
  },
  cyan: {
    container:
      "bg-cyan-50/95 text-cyan-950 border-cyan-100/70 dark:bg-cyan-500/10 dark:text-cyan-100 dark:border-cyan-500/20",
    iconClassName: "text-cyan-600 dark:text-cyan-400",
  },
  amber: {
    container:
      "bg-amber-50/95 text-amber-950 border-amber-100/70 dark:bg-amber-500/10 dark:text-amber-100 dark:border-amber-500/20",
    iconClassName: "text-amber-600 dark:text-amber-400",
  },
  orange: {
    container:
      "bg-orange-50/95 text-orange-950 border-orange-100/70 dark:bg-orange-500/10 dark:text-orange-100 dark:border-orange-500/20",
    iconClassName: "text-orange-600 dark:text-orange-400",
  },
  rose: {
    container:
      "bg-rose-50/95 text-rose-950 border-rose-100/70 dark:bg-rose-500/10 dark:text-rose-100 dark:border-rose-500/20",
    iconClassName: "text-rose-600 dark:text-rose-400",
  },
  fuchsia: {
    container:
      "bg-fuchsia-50/95 text-fuchsia-950 border-fuchsia-100/70 dark:bg-fuchsia-500/10 dark:text-fuchsia-100 dark:border-fuchsia-500/20",
    iconClassName: "text-fuchsia-600 dark:text-fuchsia-400",
  },
  teal: {
    container:
      "bg-teal-50/95 text-teal-950 border-teal-100/70 dark:bg-teal-500/10 dark:text-teal-100 dark:border-teal-500/20",
    iconClassName: "text-teal-600 dark:text-teal-400",
  },
  slate: {
    container:
      "bg-slate-50/95 text-slate-950 border-slate-100/70 dark:bg-slate-500/10 dark:text-slate-100 dark:border-slate-500/20",
    iconClassName: "text-slate-600 dark:text-slate-400",
  },
  zinc: {
    container:
      "bg-zinc-100/95 text-zinc-950 border-zinc-200/70 dark:bg-zinc-500/10 dark:text-zinc-100 dark:border-zinc-500/20",
    iconClassName: "text-zinc-600 dark:text-zinc-400",
  },
};

type IconKind =
  | "kalshi"
  | "polymarket"
  | "activity"
  | "git-branch"
  | "cloud-sun"
  | "sparkles"
  | "bar-chart"
  | "lightbulb"
  | "book-open"
  | "database"
  | "line-chart"
  | "flask"
  | "dashboard"
  | "trending-up"
  | "radio"
  | "rss"
  | "layout-grid"
  | "arrow-left-right"
  | "scale"
  | "twitter-x"
  | "download"
  | "archive"
  | "dot";

type BadgeConfig = {
  theme: ThemeKey;
  label?: string;
  icon: IconKind;
};

const BADGE_CONFIG: Record<string, BadgeConfig> = {
  "Kalshi Historical": { theme: "emerald", icon: "kalshi" },
  "Polymarket Historical": { theme: "indigo", icon: "polymarket" },
  "Polymarket Live": { theme: "sky", icon: "radio" },
  Calibration: { theme: "sky", icon: "activity" },
  Lifecycle: { theme: "violet", icon: "git-branch" },
  Weather: { theme: "cyan", icon: "cloud-sun" },
  Research: { theme: "violet", label: "Deep Research", icon: "sparkles" },
  Volume: { theme: "orange", icon: "bar-chart" },
  Explainer: { theme: "amber", icon: "lightbulb" },
  Guide: { theme: "sky", icon: "book-open" },
  Data: { theme: "slate", icon: "database" },
  Charts: { theme: "indigo", icon: "line-chart" },
  Backtest: { theme: "orange", icon: "flask" },
  Dashboard: { theme: "teal", icon: "dashboard" },
  Movers: { theme: "rose", icon: "trending-up" },
  "Live Feeds": { theme: "sky", icon: "rss" },
  "Trader Dashboard": { theme: "teal", icon: "layout-grid" },
  "Cross-Market": { theme: "fuchsia", icon: "arrow-left-right" },
  Arbitrage: { theme: "amber", icon: "scale" },
  "Twitter/X": { theme: "zinc", icon: "twitter-x" },
  Export: { theme: "zinc", icon: "download" },
  "Historical Data": { theme: "slate", icon: "archive" },
};

const ICON_MAP: Record<Exclude<IconKind, "kalshi" | "polymarket" | "twitter-x" | "dot">, LucideIcon> = {
  activity: Activity,
  "git-branch": GitBranch,
  "cloud-sun": CloudSun,
  sparkles: Sparkles,
  "bar-chart": BarChart3,
  lightbulb: Lightbulb,
  "book-open": BookOpen,
  database: Database,
  "line-chart": LineChart,
  flask: FlaskConical,
  dashboard: LayoutDashboard,
  "trending-up": TrendingUp,
  radio: Radio,
  rss: Rss,
  "layout-grid": LayoutGrid,
  "arrow-left-right": ArrowLeftRight,
  scale: Scale,
  download: Download,
  archive: Archive,
};

function KalshiMark() {
  return (
    <span className="inline-flex h-[18px] shrink-0 items-center justify-center rounded-[4px] bg-emerald-500 px-1 text-[7px] font-bold leading-none tracking-tight text-white">
      Kalshi
    </span>
  );
}

function PolymarketMark() {
  return (
    <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold leading-none text-white">
      P
    </span>
  );
}

function BadgeIcon({ icon, className }: { icon: IconKind; className: string }) {
  if (icon === "kalshi") return <KalshiMark />;
  if (icon === "polymarket") return <PolymarketMark />;
  if (icon === "twitter-x") {
    return (
      <span
        className={cn(
          "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[10px] font-bold leading-none",
          className,
        )}
        aria-hidden
      >
        𝕏
      </span>
    );
  }
  if (icon === "dot") {
    return (
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400"
        aria-hidden
      />
    );
  }

  const LucideIconComponent = ICON_MAP[icon];
  return (
    <LucideIconComponent
      className={cn("h-3.5 w-3.5 shrink-0", className)}
      aria-hidden
    />
  );
}

function getBadgeConfig(label: string): BadgeConfig {
  return BADGE_CONFIG[label] ?? { theme: "slate", icon: "dot" };
}

type ResearchQuestionBadgeProps = {
  label: string;
  className?: string;
};

export function ResearchQuestionBadge({
  label,
  className,
}: ResearchQuestionBadgeProps) {
  const config = getBadgeConfig(label);
  const theme = THEMES[config.theme];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-[2px]",
        theme.container,
        className,
      )}
    >
      <BadgeIcon icon={config.icon} className={theme.iconClassName} />
      <span>{config.label ?? label}</span>
    </span>
  );
}
