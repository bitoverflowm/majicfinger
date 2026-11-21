"use client";

import { DESK_LABELS, DESKS } from "@/lib/warRoom/constants";
import { cn } from "@/lib/utils";

type Desk = (typeof DESKS)[number];

export function DeskTabs({
  desk,
  onChange,
}: {
  desk: Desk;
  onChange: (desk: Desk) => void;
}) {
  return (
    <div role="tablist" aria-label="War Room desks" className="flex gap-1 rounded-full border border-white/10 bg-black/40 p-1">
      {DESKS.map((id) => {
        const selected = desk === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              selected ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10",
            )}
          >
            {DESK_LABELS[id]}
          </button>
        );
      })}
    </div>
  );
}
