import { cn } from "@/lib/utils";

interface TemplateActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function TemplateActions({ children, className }: TemplateActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        className
      )}
    >
      {children}
    </div>
  );
}
