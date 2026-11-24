"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Bell,
  BookOpen,
  ChevronDown,
  Globe2,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  LogOut,
  Moon,
  Newspaper,
  Sun,
  Users,
  Plug,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
import { JARVIS_PROMO } from "@/lib/jarvisPromo";
import { JARVIS_MONTHLY_TOKENS } from "@/lib/landingPageV2Config";
import {
  membershipState,
  normalizeMembershipTier,
  MEMBERSHIP_TIERS,
  userHasDashboardAccess,
} from "@/lib/membershipAccess";
import { fastLogout } from "@/lib/fastLogout";
import { launchShellProduct } from "@/lib/projectsShellLaunch";
import { cn } from "@/lib/utils";

const ALERTS_KEY = "lychee:projectsShell:alertsRead";

const PRODUCT_TABS = [
  { id: "war-room", label: "War Room", icon: Globe2, tint: "text-[#0d99ff]", chip: "bg-[#0d99ff]/15" },
  { id: "historical", label: "Historical", icon: BookOpen, tint: "text-[#a259ff]", chip: "bg-[#a259ff]/15" },
  { id: "present", label: "The Present", icon: LayoutDashboard, tint: "text-[#f24e1e]", chip: "bg-[#f24e1e]/15" },
  { id: "markets", label: "Markets", icon: LineChart, tint: "text-[#14ae5c]", chip: "bg-[#14ae5c]/15" },
  { id: "holders", label: "Holders", icon: Users, tint: "text-[#e6a919]", chip: "bg-[#e6a919]/15" },
  { id: "integrations", label: "Integrations", icon: Plug, tint: "text-[#0d99ff]", chip: "bg-[#0d99ff]/12" },
];

const SIDEBAR_LINKS = [
  { href: "/university", label: "University", icon: GraduationCap },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/guides", label: "Research", icon: BookOpen },
];

const TIER_LABELS = {
  basic: "Basic",
  lite: "Lite",
  pro: "Legacy Pro",
  researcher: "Pro",
  elite: "Elite",
  quant: "Max",
};

function planLabel(user) {
  if (user?.lifetimeMember) return "Lifetime";
  const tier = normalizeMembershipTier(user?.subscriptionTier);
  if (tier) return TIER_LABELS[tier] || tier;
  return "Free";
}

function canOfferUpgrade(user) {
  if (user?.lifetimeMember) return false;
  const tier = normalizeMembershipTier(user?.subscriptionTier);
  if (!tier) return true;
  if (tier === "quant") return false;
  return MEMBERSHIP_TIERS.indexOf(tier) < MEMBERSHIP_TIERS.indexOf("quant");
}

function jarvisTokenPlaceholder(user) {
  const tier = normalizeMembershipTier(user?.subscriptionTier);
  if (tier === "quant") return JARVIS_MONTHLY_TOKENS.quant;
  if (tier === "researcher" || tier === "elite" || tier === "pro") return JARVIS_MONTHLY_TOKENS.researcher;
  if (tier === "lite" || tier === "basic") return JARVIS_MONTHLY_TOKENS.lite;
  return JARVIS_MONTHLY_TOKENS.lite;
}

function readAlertsSeen() {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(ALERTS_KEY) === "1";
  } catch {
    return false;
  }
}

function markAlertsSeen() {
  try {
    localStorage.setItem(ALERTS_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function ProjectsAccountMenu({ user, profile }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";
  const displayName = user?.name || profile?.user_name || user?.email || "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex min-w-0 max-w-[11rem] items-center gap-1.5 rounded-md py-0.5 pl-0.5 pr-1 hover:bg-black/[0.05] data-[state=open]:bg-black/[0.06] dark:hover:bg-white/10 dark:data-[state=open]:bg-white/10"
          aria-label="Account menu"
        >
          <UserAvatar
            src={profile?.profile_pic}
            handle={profile?.user_name}
            name={user?.name}
            email={user?.email}
            size={24}
            className="size-6 shrink-0 border-0"
          />
          <span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium">{displayName}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-64">
        <div className="flex flex-col items-center gap-1 px-3 py-3">
          <UserAvatar
            src={profile?.profile_pic}
            handle={profile?.user_name}
            name={user?.name}
            email={user?.email}
            size={48}
            className="size-12 border-0"
          />
          <DropdownMenuLabel className="p-0 text-[13px] font-medium underline-offset-2">
            {displayName}
          </DropdownMenuLabel>
          {user?.email ? <p className="text-[12px] text-muted-foreground">{user.email}</p> : null}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-[13px]"
          onSelect={(event) => {
            event.preventDefault();
            setTheme(isDark ? "light" : "dark");
          }}
        >
          {isDark ? <Sun className="size-3.5" aria-hidden /> : <Moon className="size-3.5" aria-hidden />}
          Change theme
          <span className="ml-auto text-[11px] text-muted-foreground">{isDark ? "Dark" : "Light"}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-[13px]"
          onSelect={(event) => {
            event.preventDefault();
            void fastLogout({
              email: user?.email,
              userId: user?.userId || user?._id,
            });
          }}
        >
          <LogOut className="size-3.5" aria-hidden />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ProjectsAlertsBell({ user }) {
  const [seen, setSeen] = useState(true);
  useEffect(() => setSeen(readAlertsSeen()), []);
  const tokens = jarvisTokenPlaceholder(user);
  const body = `${JARVIS_PROMO.body} You're already accruing ${tokens} tokens/month for when Jarvis is available.`;

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          markAlertsSeen();
          setSeen(true);
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={seen ? "Alerts" : "Alerts, 1 unread"}
          className="relative inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/10"
        >
          <Bell className="size-4" aria-hidden />
          {!seen ? (
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-red-500" aria-hidden />
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="border-b border-border/70 px-3 py-2 text-[12px] font-medium text-muted-foreground">
          Alerts
        </div>
        <div className="px-3 py-3">
          <p className="text-[13px] font-medium text-foreground">{JARVIS_PROMO.title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{body}</p>
          <Link
            href={JARVIS_PROMO.href}
            className="mt-2 inline-flex text-[12px] font-medium text-[#0d99ff] hover:underline"
          >
            {JARVIS_PROMO.meetCta} →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

async function runProductLaunch({ id, userId, onMembershipRequired, setBusyId }) {
  if (!id) return;
  setBusyId(id);
  try {
    const result = await launchShellProduct({ id, userId });
    if (!result.ok) {
      if (result.status === 402) onMembershipRequired?.(result.message);
      else {
        const { toast } = await import("sonner");
        toast.error(result.message || "Could not open that product.");
      }
      return;
    }
    window.location.assign(result.href);
  } finally {
    setBusyId("");
  }
}

export function ProjectsProductTabs({ userId, onMembershipRequired }) {
  const [busyId, setBusyId] = useState("");

  return (
    <>
      <div role="toolbar" aria-label="Lychee products" className="hidden items-center gap-1.5 xl:flex">
        {PRODUCT_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={!!busyId}
              onClick={() => void runProductLaunch({ id: tab.id, userId, onMembershipRequired, setBusyId })}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-black/[0.06] bg-muted/60 px-2.5 text-[12px] font-medium text-foreground shadow-sm transition hover:bg-muted disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.06]"
            >
              <span className={cn("inline-flex size-5 items-center justify-center rounded-md", tab.chip, tab.tint)}>
                <Icon className="size-3" aria-hidden />
              </span>
              <span className="whitespace-nowrap">{busyId === tab.id ? "Opening…" : tab.label}</span>
            </button>
          );
        })}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-full border border-black/[0.06] bg-muted/60 px-2.5 text-[12px] font-medium xl:hidden dark:border-white/10 dark:bg-white/[0.06]"
            aria-label="Open products"
          >
            Products
            <ChevronDown className="size-3.5 opacity-70" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {PRODUCT_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <DropdownMenuItem
                key={tab.id}
                disabled={!!busyId}
                className="gap-2 text-[13px]"
                onSelect={(event) => {
                  event.preventDefault();
                  void runProductLaunch({ id: tab.id, userId, onMembershipRequired, setBusyId });
                }}
              >
                <span className={cn("inline-flex size-5 items-center justify-center rounded-md", tab.chip, tab.tint)}>
                  <Icon className="size-3" aria-hidden />
                </span>
                {busyId === tab.id ? "Opening…" : tab.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function ProjectsSidebarLinks() {
  return (
    <nav className="mt-3 flex flex-col gap-0.5 border-t border-border/60 pt-3" aria-label="Learn">
      {SIDEBAR_LINKS.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/5"
          >
            <Icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ProjectsPlanFooter({ user }) {
  const upgrade = canOfferUpgrade(user);
  const hasAccess = userHasDashboardAccess(user);
  const state = membershipState(user);
  const label = planLabel(user);
  const href = "/dashboard?view=billing";
  const needsUpgrade =
    upgrade && (!hasAccess || state.reason === "none" || state.reason === "ended" || state.reason === "payment_issue");

  if (upgrade) {
    return (
      <div className="space-y-2 border-t border-border/60 px-1 pt-3">
        <p className="px-1 text-[11px] leading-snug text-muted-foreground">
          {needsUpgrade ? `Your plan and usage · ${label}` : `See what's included · ${label}`}
        </p>
        <Link
          href={href}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-[#0d99ff] text-[13px] font-medium text-white hover:bg-[#0b87e0]"
        >
          ↑ Upgrade
        </Link>
      </div>
    );
  }

  return (
    <div className="border-t border-border/60 px-1 pt-3">
      <Link
        href={href}
        className="flex h-9 w-full items-center justify-between rounded-md px-2 text-[13px] text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/5"
      >
        <span>
          Current plan · <span className="font-medium text-foreground">{label}</span>
        </span>
        <ChevronDown className="size-3.5 -rotate-90 opacity-60" aria-hidden />
      </Link>
    </div>
  );
}
