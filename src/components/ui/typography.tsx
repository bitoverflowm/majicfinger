import { cn } from "@/lib/utils";

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
}

export function H1({ children, className }: TypographyProps) {
  return (
    <h1
      className={cn(
        "text-4xl md:text-5xl font-medium tracking-tighter text-balance",
        className
      )}
    >
      {children}
    </h1>
  );
}

export function H2({ children, className }: TypographyProps) {
  return (
    <h2
      className={cn(
        "text-2xl md:text-3xl font-semibold tracking-tight text-balance scroll-mt-8",
        className
      )}
    >
      {children}
    </h2>
  );
}

export function H3({ children, className }: TypographyProps) {
  return (
    <h3
      className={cn(
        "text-xl md:text-2xl font-semibold tracking-tight scroll-mt-8",
        className
      )}
    >
      {children}
    </h3>
  );
}

export function P({ children, className }: TypographyProps) {
  return (
    <p className={cn("text-base text-foreground leading-relaxed", className)}>
      {children}
    </p>
  );
}

export function Muted({ children, className }: TypographyProps) {
  return (
    <span className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </span>
  );
}
