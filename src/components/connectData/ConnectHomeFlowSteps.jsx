"use client";

import { CONNECT_FLOW_STEPS } from "@/lib/connectHomeFlow";
import { cn } from "@/lib/utils";

/**
 * Vertical step rail for the Connect hub (wireframe / inspiration layout).
 * @param {{ currentStep: number; className?: string; sticky?: boolean }} props
 */
export function ConnectHomeFlowSteps({ currentStep, className, sticky = false }) {
  return (
    <nav
      aria-label="Platform steps"
      className={cn(
        "flex flex-col",
        sticky && "sticky top-[4.5rem] z-10 self-start",
        className,
      )}
    >
      <ol className="flex flex-col gap-6">
        {CONNECT_FLOW_STEPS.map((item) => {
          const isActive = currentStep === item.step;

          return (
            <li key={item.step}>
              <div
                className={cn(
                  "px-2.5 py-2 transition-colors",
                  isActive
                    ? "border-primary/20 bg-muted/35"
                    : "border-transparent opacity-40",
                )}
              >
                <p
                  className={cn(
                    "text-[11px] font-medium leading-snug",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                    Step {item.step}
                  </span>
                  <span className="mt-0.5 block">{item.title}</span>
                </p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{item.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
