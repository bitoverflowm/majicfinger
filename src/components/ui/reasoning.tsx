"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ReasoningContextType = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const ReasoningContext = React.createContext<ReasoningContextType | undefined>(
  undefined,
);

function useReasoningContext() {
  const ctx = React.useContext(ReasoningContext);
  if (!ctx) {
    throw new Error("Reasoning components must be used within <Reasoning />");
  }
  return ctx;
}

export type ReasoningProps = {
  children: React.ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function Reasoning({ children, className, open, onOpenChange }: ReasoningProps) {
  const [internalOpen, setInternalOpen] = React.useState(true);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? !!open : internalOpen;

  const handleOpenChange = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <ReasoningContext.Provider value={{ isOpen, onOpenChange: handleOpenChange }}>
      <div className={className}>{children}</div>
    </ReasoningContext.Provider>
  );
}

export type ReasoningTriggerProps = {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLButtonElement>;

export function ReasoningTrigger({ children, className, ...props }: ReasoningTriggerProps) {
  const { isOpen, onOpenChange } = useReasoningContext();

  return (
    <button
      type="button"
      className={cn("flex cursor-pointer items-center gap-2", className)}
      onClick={() => onOpenChange(!isOpen)}
      {...props}
    >
      <span className="text-primary">{children}</span>
      <span className={cn("transform transition-transform", isOpen ? "rotate-180" : "")}>
        <ChevronDownIcon className="size-4" />
      </span>
    </button>
  );
}

export type ReasoningContentProps = {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function ReasoningContent({ children, className, ...props }: ReasoningContentProps) {
  const { isOpen } = useReasoningContext();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!contentRef.current || !innerRef.current) return;
    const el = contentRef.current;
    const inner = innerRef.current;

    const ro = new ResizeObserver(() => {
      if (isOpen) el.style.maxHeight = `${inner.scrollHeight}px`;
    });
    ro.observe(inner);
    if (isOpen) el.style.maxHeight = `${inner.scrollHeight}px`;
    return () => ro.disconnect();
  }, [isOpen]);

  return (
    <div
      ref={contentRef}
      className={cn("overflow-hidden transition-[max-height] duration-300 ease-out", className)}
      style={{ maxHeight: isOpen ? contentRef.current?.scrollHeight : "0px" }}
      {...props}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
}

export type ReasoningResponseProps = {
  text: string;
  className?: string;
};

export function ReasoningResponse({ text, className }: ReasoningResponseProps) {
  const { isOpen } = useReasoningContext();
  return (
    <div
      className={cn("text-muted-foreground text-sm transition-opacity duration-300 ease-out", className)}
      style={{ opacity: isOpen ? 1 : 0 }}
    >
      {text}
    </div>
  );
}

