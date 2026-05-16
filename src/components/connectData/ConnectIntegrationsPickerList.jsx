"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { API_INTEGRATIONS } from "@/components/integrationsView/integrationsConfig";
import {
  buildIntegrationPickerRows,
  filterIntegrationPickerRows,
} from "@/lib/connectIntegrationPickerRows";
import { scheduleConnectComposeScroll } from "@/lib/connectHubScroll";
import { isConnectIntegrationWorkspace } from "@/lib/connectHomeWorkspace";
import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";

function IntegrationRowIcon({ row }) {
  if (row.logoPath) {
    return (
      <span className="relative flex h-5 w-5 shrink-0 overflow-hidden rounded-full ring-1 ring-border/50 bg-muted/30">
        <Image
          src={row.logoPath}
          alt=""
          fill
          className={cn(
            "object-cover",
            row.id === "kalshiHistorical" && "object-contain p-px",
          )}
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
        scheduleConnectComposeScroll();
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
          <ul className="flex flex-col gap-px" role="listbox" aria-label="Integrations">
            {filtered.map((row) => {
              const selected = integrationSidebar === row.id;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={!row.available}
                    title={row.description || row.name}
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
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
