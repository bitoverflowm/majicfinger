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
 * lg+: fixed-width nav column + flexible article zone. TOC lives inside GuideLayout.
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
        "relative grid min-h-screen grid-cols-1 overflow-x-clip bg-[#F5F5F5]/20 px-4 dark:bg-background sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-x-5 lg:px-6 xl:grid-cols-[16rem_minmax(0,1fr)] xl:gap-x-6 xl:px-8 2xl:mx-auto 2xl:max-w-[90rem] 2xl:px-10",
        className,
      )}
    >
      <aside
        aria-label="Lychee content library"
        className="border-r border-black/10 max-lg:sr-only lg:block"
      >
        <LycheeContentSidebar data={navData} currentPath={currentPath} />
      </aside>
      <div className="min-w-0 w-full max-w-full overflow-x-clip">{children}</div>
    </div>
  );
}
