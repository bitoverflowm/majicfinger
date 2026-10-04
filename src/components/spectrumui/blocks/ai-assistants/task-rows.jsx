"use client";

import { useState } from "react";
import { Check, ChevronDown, CircleDashed, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const BADGE = {
  queued: "bg-black/[0.05] text-neutral-500 dark:bg-white/[0.07] dark:text-neutral-400",
  running: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
};

function StatusIcon({ status }) {
  if (status === "completed") {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <Check className="size-2.5" strokeWidth={2.5} />
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
        <X className="size-2.5" strokeWidth={2.5} />
      </span>
    );
  }
  if (status === "running") return <Loader2 className="size-4 shrink-0 animate-spin text-sky-600 dark:text-sky-400" />;
  return <CircleDashed className="size-4 shrink-0 text-neutral-400" />;
}

/** Live agent task rows with a status badge and an expandable note. */
export function TaskRows({ tasks, variant = "Default", className }) {
  const [openId, setOpenId] = useState(null);
  const compact = variant === "Compact";

  return (
    <ul
      className={cn(
        "w-full max-w-[480px] divide-y divide-black/[0.05] overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-sm dark:divide-white/[0.06] dark:border-white/[0.08] dark:bg-[#0B0B0D]",
        className,
      )}
    >
      {(tasks || []).map((task) => {
        const open = task.id === openId;
        const expandable = !compact && Boolean(task.note);
        return (
          <li key={task.id}>
            <button
              type="button"
              disabled={!expandable}
              aria-expanded={expandable ? open : undefined}
              onClick={() => setOpenId(open ? null : task.id)}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 text-left",
                compact ? "py-2" : "py-2.5",
                expandable &&
                  "transition-colors duration-150 hover:bg-black/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-400 dark:hover:bg-white/[0.03]",
              )}
            >
              <StatusIcon status={task.status} />
              <span className={cn("block min-w-0 flex-1 truncate font-medium text-neutral-800 dark:text-neutral-200", compact ? "text-[12.5px]" : "text-[13px]")}>
                {task.title}
              </span>
              {task.detail ? <span className="shrink-0 truncate text-[11px] text-neutral-400">{task.detail}</span> : null}
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-wide", BADGE[task.status] || BADGE.queued)}>
                {task.status}
              </span>
              {expandable ? (
                <ChevronDown className={cn("size-3 shrink-0 text-neutral-400 transition-transform duration-200", open && "rotate-180")} />
              ) : null}
            </button>
            {expandable ? (
              <div
                className="grid transition-[grid-template-rows] duration-200 ease-out"
                style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p className="whitespace-pre-line px-3 pb-2.5 pl-9 text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-400">{task.note}</p>
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
