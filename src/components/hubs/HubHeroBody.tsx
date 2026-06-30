import { cn } from "@/lib/utils";
import type { HubHeroBodyPart } from "@/types/hub";

type HubHeroBodyProps = {
  parts: HubHeroBodyPart[];
  className?: string;
};

export function HubHeroBody({ parts, className }: HubHeroBodyProps) {
  return (
    <p className={cn("max-w-xl text-pretty text-base leading-relaxed text-muted-foreground", className)}>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={`text-${index}`}>{part.value}</span>;
        }

        return (
          <span key={`metric-${index}`} className="font-black tabular-nums text-foreground">
            {part.value}
          </span>
        );
      })}
    </p>
  );
}
