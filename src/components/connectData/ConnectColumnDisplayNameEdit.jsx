"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Edit UI-only display label for a selected compose column (does not change SQL `column` / `alias`).
 */
export function ConnectColumnDisplayNameEdit({
  columnKey,
  defaultLabel,
  displayName,
  onSave,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(displayName ?? "");

  useEffect(() => {
    if (!open) setDraft(displayName ?? "");
  }, [displayName, open]);

  const save = () => {
    const trimmed = draft.trim();
    onSave(trimmed && trimmed !== defaultLabel ? trimmed : null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={className ?? "h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"}
          aria-label={`Rename display label for ${defaultLabel}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className="h-2.5 w-2.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-52 p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
          Display name
        </p>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={defaultLabel}
          className="h-7 text-xs"
          maxLength={80}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
        />
        <p className="mt-1 text-[9px] leading-snug text-muted-foreground">
          Column key: <span className="font-mono">{columnKey}</span>
        </p>
        <div className="mt-2 flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" className="h-6 px-2 text-[10px]" onClick={save}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
