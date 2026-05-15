import { Carrot, Citrus, Ghost } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

/** Compact upload tips — same copy as legacy upload view. */
export function ConnectHomeUploadWarnings({ className }) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Things to note
      </p>
      <Alert className="border-border/50 bg-card/60 py-2">
        <div className="flex items-center gap-2">
          <Carrot className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-[10px] leading-snug">Garbage in, garbage out</p>
            <p className="text-[10px] leading-snug text-muted-foreground">
              The cleaner the data you provide, the better the results.
            </p>
          </div>
        </div>
      </Alert>
      <Alert className="mt-1 border-border/50 bg-card/60 py-2">
        <div className="flex items-center gap-2">
          <Citrus className="h-5 w-5 shrink-0 text-secondary" />
          <div>
            <p className="text-[10px] leading-snug">Multi-sheets</p>
            <p className="text-[10px] leading-snug text-muted-foreground">
              We handle multi-sheet workbooks — upload every sheet you need.
            </p>
          </div>
        </div>
      </Alert>
      <Alert className="mt-1 border-border/50 bg-card/60 py-2">
        <div className="flex items-center gap-2">
          <Ghost className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-[10px] leading-snug">Tips</p>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Keep column names clean (&quot;.&quot;, quotes, etc. will not work).
            </p>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Underscore &quot;_&quot; and hyphens &quot;-&quot; are acceptable.
            </p>
          </div>
        </div>
      </Alert>
    </div>
  );
}
