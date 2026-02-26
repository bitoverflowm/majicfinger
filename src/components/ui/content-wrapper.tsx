import { cn } from "@/lib/utils";

interface ContentWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function ContentWrapper({ children, className }: ContentWrapperProps) {
  return (
    <div className={cn("flex flex-col gap-8 py-8", className)}>
      {children}
    </div>
  );
}
