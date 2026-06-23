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
 * Guide reading chrome: compact left nav (fixed width, never grows) + flexible article column.
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
        "min-h-screen overflow-x-clip bg-[#F5F5F5]/20 dark:bg-background",
        className,
      )}
    >
      <div className="flex w-full items-start">
        <aside
          aria-label="Lychee content library"
          className="sticky top-0 hidden h-dvh max-h-dvh w-[14rem] max-w-[14rem] shrink-0 overflow-hidden border-r border-black/10 max-lg:sr-only lg:block"
        >
          <LycheeContentSidebar data={navData} currentPath={currentPath} />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
