"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { API_INTEGRATIONS } from "@/components/integrationsView/integrationsConfig";
import {
  buildIntegrationPickerRows,
  filterIntegrationPickerRows,
} from "@/lib/connectIntegrationPickerRows";
import { isConnectIntegrationWorkspace } from "@/lib/connectHomeWorkspace";
import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";

/** Brand fills for sidebar integration avatars (matches Connect home hub pills). */
const INTEGRATION_LOGO_BG = {
  kalshiHistorical: "bg-[#28CC95] ring-[#28CC95]/50",
  chainlink: "bg-[#375BD2] ring-[#375BD2]/50",
};

function integrationLogoShellClass(id) {
  return INTEGRATION_LOGO_BG[id] ?? "bg-muted/30 ring-border/50";
}

function integrationTooltipContent(row) {
  const desc = String(row.description || "").trim();
  if (row.badge === "Coming soon") {
    return desc || "Coming soon";
  }
  if (row.badge === "Pro") {
    return desc ? `${desc} (Pro plan required)` : "Available on Pro plan";
  }
  return desc || row.name;
}

function IntegrationRowIcon({ row }) {
  if (row.logoPath) {
    const branded = row.id === "kalshiHistorical" || row.id === "chainlink";
    return (
      <span
        className={cn(
          "relative flex h-5 w-5 shrink-0 overflow-hidden rounded-full ring-1",
          integrationLogoShellClass(row.id),
        )}
      >
        <Image
          src={row.logoPath}
          alt=""
          fill
          className={cn(branded ? "object-contain p-px" : "object-cover")}
          sizes="20px"
        />
      </span>
    );
  }
  if (row.icon) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted/30 [&_.integration-logo-avatar]:!h-4 [&_.integration-logo-avatar]:!w-4 [&_.integration-logo-avatar]:!rounded [&_.integration-logo-avatar]:!bg-transparent [&_.integration-logo-avatar]:shadow-none [&_img]:!p-0">
        {row.icon}
      </span>
    );
  }
  const letter = (row.name || row.id || "?")[0].toUpperCase();
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted/30 text-[9px] font-medium text-muted-foreground">
      {letter}
    </span>
  );
}

export function ConnectIntegrationsPickerList({
  className,
  connectHomeMode = false,
  onAfterSelect,
}) {
  const ctx = useMyStateV2() ?? {};
  const isDemo = !!ctx.isDemo;
  const integrationSidebar = ctx.integrationSidebar;
  const setIntegrationSidebar = ctx.setIntegrationSidebar;
  const requestConnectWorkspace = ctx.requestConnectWorkspace;

  const [search, setSearch] = useState("");

  const rows = useMemo(() => buildIntegrationPickerRows({ isDemo }), [isDemo]);
  const filtered = useMemo(
    () => filterIntegrationPickerRows(rows, search),
    [rows, search],
  );

  const handleSelect = useCallback(
    (row) => {
      if (!row.available || !row.id) return;
      if (!API_INTEGRATIONS.includes(row.id)) return;

      if (connectHomeMode) {
        if (isConnectIntegrationWorkspace(row.id)) {
          requestConnectWorkspace?.(row.id);
        } else {
          setIntegrationSidebar?.(row.id);
        }
      } else {
        setIntegrationSidebar?.(row.id);
      }
      onAfterSelect?.(row.id);
    },
    [
      connectHomeMode,
      onAfterSelect,
      requestConnectWorkspace,
      setIntegrationSidebar,
    ],
  );

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-1.5", className)}>
      <div className="relative shrink-0">
        <Search
          className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search integrations"
          className="h-7 pl-7 text-[11px] placeholder:text-[11px]"
          aria-label="Search integrations"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {filtered.length === 0 ? (
          <p className="py-2 text-center text-[10px] text-muted-foreground">
            No integrations match your search.
          </p>
        ) : (
          <TooltipProvider delayDuration={200}>
            <ul className="flex flex-col gap-px" role="listbox" aria-label="Integrations">
              {filtered.map((row) => {
                const selected = integrationSidebar === row.id;
                const tip = integrationTooltipContent(row);
                return (
                  <li key={row.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex w-full min-w-0">
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            aria-label={tip}
                            disabled={!row.available}
                            onClick={() => handleSelect(row)}
                            className={cn(
                              "flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left transition-colors",
                              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40",
                              row.available
                                ? "hover:bg-muted/60 active:bg-muted/80"
                                : "cursor-not-allowed opacity-50",
                              selected && row.available && "bg-muted/70 ring-1 ring-border/40",
                            )}
                          >
                            <IntegrationRowIcon row={row} />
                            <span className="min-w-0 flex-1 truncate text-[11px] font-normal leading-tight text-foreground">
                              {row.name}
                            </span>
                            {row.badge ? (
                              <span className="shrink-0 rounded border border-border/60 bg-muted/80 px-1 py-px text-[8px] font-medium uppercase tracking-wide text-muted-foreground">
                                {row.badge}
                              </span>
                            ) : null}
                          </button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[14rem] text-pretty text-xs">
                        {tip}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
