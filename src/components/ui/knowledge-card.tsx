import { cn } from "@/lib/utils";

interface KnowledgeCardProps {
  children: React.ReactNode;
  className?: string;
}

export function KnowledgeCard({ children, className }: KnowledgeCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-6 text-card-foreground transition-colors hover:bg-accent/50",
        className
      )}
    >
      {children}
    </div>
  );
}
