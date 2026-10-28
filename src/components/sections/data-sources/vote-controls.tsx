"use client";

import { ArrowUp, Check, Plus } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { trackIntegrationSuggestion, useIntegrationVotes } from "./integration-votes";

/** Pill that records a vote for an integration we haven't built yet. */
export function VoteButton({ id, name, className }: { id: string; name: string; className?: string }) {
  const { votes, toggle } = useIntegrationVotes();
  const voted = votes.includes(id);
  return (
    <button
      type="button"
      onClick={() => toggle(id, name)}
      aria-pressed={voted}
      aria-label={voted ? `Remove vote for ${name}` : `Vote for ${name}`}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-3 text-[11px] font-medium transition-colors",
        voted ? "bg-[#10b981]/10 text-[#0f9f6e]" : "bg-primary text-primary-foreground hover:opacity-90",
        className,
      )}
    >
      {voted ? <Check className="size-3" strokeWidth={3} /> : <ArrowUp className="size-3" />}
      {voted ? "Voted" : "Vote"}
    </button>
  );
}

/** Grid cell that turns into a one-line form for suggesting an integration. */
export function SuggestCell({ placeholder, label }: { placeholder: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const name = value.trim().slice(0, 40);
    if (!name) return;
    trackIntegrationSuggestion(name);
    setSent(name);
    setValue("");
    setOpen(false);
  };

  if (open) {
    return (
      <form
        onSubmit={submit}
        className="flex h-8 min-w-0 items-center gap-1 rounded-lg border border-[#2f6fed]/40 bg-background pl-2 pr-1"
      >
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => !value.trim() && setOpen(false)}
          maxLength={40}
          placeholder={placeholder}
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent text-[11px] text-primary outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90"
          aria-label="Send suggestion"
        >
          <ArrowUp className="size-3" />
        </button>
      </form>
    );
  }

  if (sent) {
    return (
      <div className="flex h-8 min-w-0 items-center gap-2 rounded-lg border border-border px-2 text-[11px]">
        <Check className="size-3 shrink-0 text-[#0f9f6e]" strokeWidth={3} />
        <span className="min-w-0 flex-1 truncate text-primary">Noted: {sent}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex h-8 min-w-0 items-center gap-2 rounded-lg border border-dashed border-border px-2 text-left text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
    >
      <Plus className="size-3 shrink-0" />
      <span className="truncate">Suggest another</span>
    </button>
  );
}

/** Two-column vote grid: one toggle per option, ending with a suggestion cell. */
export function VoteGrid({
  options,
  active,
  onPick,
  suggestPlaceholder,
  suggestLabel,
}: {
  options: readonly { id: string; name: string; short?: string; tile: ReactNode }[];
  active?: number;
  onPick?: (index: number) => void;
  suggestPlaceholder: string;
  suggestLabel: string;
}) {
  const { votes, toggle } = useIntegrationVotes();
  return (
    <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
      {options.map((option, i) => {
        const voted = votes.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              onPick?.(i);
              toggle(option.id, option.name);
            }}
            aria-pressed={voted}
            title={option.name}
            className={cn(
              "flex h-8 min-w-0 items-center gap-2 rounded-lg border px-2 text-left text-[11px] transition-colors hover:bg-muted",
              i === active ? "border-[#2f6fed]/40 bg-muted" : "border-border",
            )}
          >
            {option.tile}
            <span className="min-w-0 flex-1 truncate text-primary">{option.short ?? option.name}</span>
            {voted ? (
              <Check className="size-3 shrink-0 text-[#0f9f6e]" strokeWidth={3} />
            ) : (
              <Plus className="size-3 shrink-0 text-muted-foreground" />
            )}
          </button>
        );
      })}
      <SuggestCell placeholder={suggestPlaceholder} label={suggestLabel} />
    </div>
  );
}
