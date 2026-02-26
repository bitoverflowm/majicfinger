import Link from "next/link";
import { cn } from "@/lib/utils";

interface CTASectionProps {
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
}

export function CTASection({
  title = "Need help?",
  description = "Explore our docs or reach out to our team.",
  primaryHref = "/",
  primaryLabel = "Get started",
  secondaryHref,
  secondaryLabel,
  className,
}: CTASectionProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-muted/60 p-8 text-center",
        className
      )}
    >
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-6">{description}</p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href={primaryHref}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
        >
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel && (
          <Link
            href={secondaryHref}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground"
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </section>
  );
}
