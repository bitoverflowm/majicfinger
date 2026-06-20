import type { ReactNode } from "react";
import type { LycheeContentNavData } from "@/lib/content/lychee-content-nav";
import { LycheeContentSidebar } from "./LycheeContentSidebar";

type LycheeContentShellProps = {
  navData: LycheeContentNavData;
  currentPath: string;
  children: ReactNode;
};

/**
 * Reading chrome for lychee_content (MDX guides, blog, etc.).
 * Left sidebar + main column; article layouts own the right TOC column.
 */
export function LycheeContentShell({
  navData,
  currentPath,
  children,
}: LycheeContentShellProps) {
  return (
    <div className="relative grid min-h-screen grid-cols-1 bg-[#F5F5F5]/20 md:mx-8 xl:mx-0 lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)]">
      <aside
        aria-label="Lychee content library"
        className="border-r border-black/10 max-lg:sr-only lg:block"
      >
        <LycheeContentSidebar data={navData} currentPath={currentPath} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
