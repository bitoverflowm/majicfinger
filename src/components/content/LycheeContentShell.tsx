import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LycheeContentNavData } from "@/lib/content/lychee-content-nav";
import { LycheeContentSidebar } from "./LycheeContentSidebar";

type LycheeContentShellProps = {
  navData: LycheeContentNavData;
  currentPath: string;
  children: ReactNode;
  className?: string;
};

/**
 * Reading chrome for lychee_content (MDX guides, blog, etc.).
 * 5-column grid on xl: left nav | centered article zone | breathing room for TOC.
 */
export function LycheeContentShell({
  navData,
  currentPath,
  children,
  className,
}: LycheeContentShellProps) {
  return (
    <div
      className={cn(
        "relative grid min-h-screen grid-cols-1 gap-x-10 bg-[#F5F5F5]/20 dark:bg-background md:mx-8 xl:mx-0",
        "lg:grid-cols-5",
        className,
      )}
    >
      <aside
        aria-label="Lychee content library"
        className="border-r border-black/10 max-lg:sr-only lg:col-span-1 lg:block"
      >
        <LycheeContentSidebar data={navData} currentPath={currentPath} />
      </aside>
      <div className="min-w-0 lg:col-span-3 lg:col-start-2 lg:w-full lg:justify-self-center">
        {children}
      </div>
      {/* Column 5 reserved — fixed TOC anchors to the right edge of the viewport */}
      <div aria-hidden className="hidden lg:col-span-1 lg:block" />
    </div>
  );
}
