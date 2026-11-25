"use client";

import { Equal } from "lucide-react";
import { LinkedInLogoIcon, TwitterLogoIcon } from "@radix-ui/react-icons";

import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const SOCIALS = [
  {
    id: "x",
    label: "X (Twitter)",
    href: siteConfig.links.twitter,
    Icon: TwitterLogoIcon,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: siteConfig.links.linkedin,
    Icon: LinkedInLogoIcon,
  },
] as const;

/**
 * Desktop hamburger next to Login / Dashboard: theme (same as footer) + Socials pill.
 */
export function NavMoreMenu({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="More menu"
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-primary/70 transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          {/* Two-line mark matching the nav ref (not the three-line mobile drawer icon). */}
          <Equal className="size-5" strokeWidth={2} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(100vw-1.5rem,17.5rem)] rounded-xl border border-border/70 bg-background p-1.5 shadow-lg"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex items-center justify-end px-2 py-2">
          <ThemeSwitcher layoutId="nav-theme-switcher-pill" />
        </div>
        <div className="mx-1 h-px bg-border/70" role="separator" />
        <div className="flex items-center justify-between gap-3 px-2 py-2.5">
          <span className="text-[13px] font-medium text-foreground">Socials</span>
          <div className="inline-flex items-center gap-0.5 rounded-full bg-black/[0.05] p-1 dark:bg-white/[0.06]">
            {SOCIALS.map(({ id, label, href, Icon }) => (
              <a
                key={id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/[0.06] hover:text-foreground dark:hover:bg-white/[0.1]"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Compact theme + socials block for the mobile drawer (same controls as the desktop menu). */
export function NavMoreMenuInline({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2 rounded-xl border border-border/70 p-3", className)}>
      <div className="flex items-center justify-end">
        <ThemeSwitcher layoutId="nav-drawer-theme-switcher-pill" />
      </div>
      <div className="h-px bg-border/70" role="separator" />
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-foreground">Socials</span>
        <div className="inline-flex items-center gap-0.5 rounded-full bg-black/[0.05] p-1 dark:bg-white/[0.06]">
          {SOCIALS.map(({ id, label, href, Icon }) => (
            <a
              key={id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/[0.06] hover:text-foreground dark:hover:bg-white/[0.1]"
            >
              <Icon className="size-4" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
